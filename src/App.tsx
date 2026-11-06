import React, { useState, useMemo, useCallback } from 'react';
import matrixDataRaw from './data/kanji_matrix.json';
import { KanjiMatrixData, KanjiCell, FilterState } from './types/kanji';
import { FilterToolbar } from './components/FilterToolbar';
import { KanjiMatrix } from './components/KanjiMatrix';
import { KanjiDetailDrawer } from './components/KanjiDetailDrawer';
import { RadicalLogogram } from './components/RadicalLogogram';
import { Moon, Sun, RotateCcw, X, Focus } from 'lucide-react';

const matrixData = matrixDataRaw as unknown as KanjiMatrixData;

const INITIAL_FILTER: FilterState = {
  searchQuery: '',
  gradeFilter: 'joyo', // Default to 常用漢字
  jlptFilter: 'all',
  gojuonFilter: 'all',
  minKanjiPerColumn: 2, // Default to columns with >=2 kanji for rich phonetic series
  hideEmptyRows: true,
  hideEmptyCols: true,
  positionFilter: 'all',
};

export const App: React.FC = () => {
  const [filter, setFilter] = useState<FilterState>(INITIAL_FILTER);
  const [selectedKanji, setSelectedKanji] = useState<KanjiCell | null>(null);
  const [highlightedKanjiChar, setHighlightedKanjiChar] = useState<string | null>(null);
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [focusedColId, setFocusedColId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Toggle dark mode class on document
  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  // Toggle row focus
  const handleToggleRowFocus = useCallback((rowId: string) => {
    setFocusedRowId((prev) => (prev === rowId ? null : rowId));
    setFocusedColId(null);
  }, []);

  // Toggle column focus
  const handleToggleColFocus = useCallback((colId: string) => {
    setFocusedColId((prev) => (prev === colId ? null : colId));
    setFocusedRowId(null);
  }, []);

  // Reset all filters and focus
  const handleResetFilters = useCallback(() => {
    setFilter(INITIAL_FILTER);
    setFocusedRowId(null);
    setFocusedColId(null);
  }, []);

  // Filter matching cells and compute active columns/rows
  const { filteredCells, activeColumns, activeRows, matchingKanjiCount } = useMemo(() => {
    const q = filter.searchQuery.trim().toLowerCase();
    const cellsMatching: Record<string, KanjiCell> = {};
    const colsWithKanji = new Set<string>();
    const rowsWithKanji = new Set<string>();
    const matchingChars = new Set<string>();

    for (const [key, cell] of Object.entries(matrixData.cells)) {
      // 1. Grade filter
      if (filter.gradeFilter === 'joyo' && !cell.is_joyo) continue;
      if (filter.gradeFilter === 'elementary' && !(cell.grade >= 1 && cell.grade <= 6)) continue;
      if (filter.gradeFilter === 'secondary' && cell.grade !== 8) continue;
      if (filter.gradeFilter === 'jinmeiyo' && !(cell.grade === 9 || cell.grade === 10)) continue;

      // 2. JLPT filter
      if (filter.jlptFilter !== 'all') {
        const targetLevel = parseInt(filter.jlptFilter.replace('N', ''), 10);
        if (cell.jlpt !== targetLevel) continue;
      }

      // 3. Gojūon row filter
      if (filter.gojuonFilter !== 'all' && cell.gojuon_row !== filter.gojuonFilter) {
        continue;
      }

      // 4. Search query
      if (q) {
        const matchesKanji = cell.kanji.includes(q);
        const matchesOn = cell.all_onyomi.some((on) => on.toLowerCase().includes(q));
        const matchesKun = cell.all_kunyomi.some((kun) => kun.toLowerCase().includes(q));
        const matchesMeaning = cell.meanings.some((m) => m.toLowerCase().includes(q));
        const matchesCol = cell.col_id.toLowerCase().includes(q);
        if (!matchesKanji && !matchesOn && !matchesKun && !matchesMeaning && !matchesCol) {
          continue;
        }
      }

      cellsMatching[key] = cell;
      colsWithKanji.add(cell.col_id);
      rowsWithKanji.add(cell.row_id);
      matchingChars.add(cell.kanji);
    }

    // Filter columns by density & emptiness
    let visibleCols = matrixData.columns.filter((col) => {
      // When a specific row or column is focused, don't prune by minKanjiPerColumn
      if (!focusedRowId && !focusedColId && col.kanji_count < filter.minKanjiPerColumn) return false;
      if (filter.hideEmptyCols && !colsWithKanji.has(col.id)) return false;
      return true;
    });

    // If query matches column glyph directly, always include that column
    if (q) {
      const directCols = matrixData.columns.filter((c) => c.glyph.includes(q));
      for (const dc of directCols) {
        if (!visibleCols.some((c) => c.id === dc.id)) {
          visibleCols.push(dc);
        }
      }
    }

    // Filter rows
    let visibleRows = matrixData.rows.filter((row) => {
      // Row 0 (none:∅) is kept if any column has a base component and not filtering by a focused row
      if (row.position === 'none' && !focusedRowId) return true;
      if (filter.hideEmptyRows && !rowsWithKanji.has(row.id)) return false;
      return true;
    });

    // =========================================================
    // FOCUS FILTERING: Row or Column Isolation
    // =========================================================
    if (focusedRowId) {
      // Only keep the focused row
      visibleRows = matrixData.rows.filter((r) => r.id === focusedRowId);
      // Only keep columns that actually contain a kanji on this row
      visibleCols = matrixData.columns.filter(
        (col) => !!cellsMatching[`${focusedRowId}::${col.id}`]
      );
    } else if (focusedColId) {
      // Only keep the focused column
      visibleCols = matrixData.columns.filter((c) => c.id === focusedColId);
      // Only keep rows that actually contain a kanji on this column
      visibleRows = matrixData.rows.filter(
        (row) => !!cellsMatching[`${row.id}::${focusedColId}`]
      );
    }

    // Attach filtered character counts (x in x/y)
    const filteredColCounts = new Map<string, number>();
    const filteredRowCounts = new Map<string, number>();
    for (const cell of Object.values(cellsMatching)) {
      filteredColCounts.set(cell.col_id, (filteredColCounts.get(cell.col_id) || 0) + 1);
      filteredRowCounts.set(cell.row_id, (filteredRowCounts.get(cell.row_id) || 0) + 1);
    }

    visibleCols = visibleCols.map((col) => ({
      ...col,
      filtered_count: filteredColCounts.get(col.id) || 0,
    }));

    visibleRows = visibleRows.map((row) => ({
      ...row,
      filtered_count: filteredRowCounts.get(row.id) || 0,
    }));

    return {
      filteredCells: cellsMatching,
      activeColumns: visibleCols,
      activeRows: visibleRows,
      matchingKanjiCount: matchingChars.size,
    };
  }, [filter, focusedRowId, focusedColId]);

  const isAnyFilterActive = useMemo(() => {
    return (
      filter.searchQuery.trim() !== '' ||
      filter.gradeFilter !== 'all' ||
      filter.jlptFilter !== 'all' ||
      filter.gojuonFilter !== 'all' ||
      focusedRowId !== null ||
      focusedColId !== null
    );
  }, [filter, focusedRowId, focusedColId]);

  // Jump to column and highlight
  const handleJumpToColumn = useCallback((colId: string) => {
    setHighlightedKanjiChar(colId);
    setTimeout(() => {
      setHighlightedKanjiChar(null);
    }, 2500);
  }, []);

  // Select a kanji by character
  const handleSelectKanjiChar = useCallback((char: string) => {
    const entry = Object.values(matrixData.cells).find((c) => c.kanji === char);
    if (entry) {
      setSelectedKanji(entry);
    }
  }, []);

  // Get focused row/col info for banner
  const focusedRowInfo = useMemo(() => {
    if (!focusedRowId) return null;
    return matrixData.rows.find((r) => r.id === focusedRowId) || null;
  }, [focusedRowId]);

  const focusedColInfo = useMemo(() => {
    if (!focusedColId) return null;
    return matrixData.columns.find((c) => c.id === focusedColId) || null;
  }, [focusedColId]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Top Navigation Bar */}
      <header className="h-14 shrink-0 px-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-kanji font-bold text-lg shadow-sm">
            構
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight flex items-center gap-2">
              漢字2D構造表
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 hidden sm:inline">
                Kanji 2D Structural Matrix
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none">
              行＝部首・配置（偏・旁・冠・脚） × 列＝残りの部品（音符）
            </p>
          </div>
        </div>

        {/* Right action buttons */}
        <div className="flex items-center space-x-2">
          {/* Reset filter button */}
          <button
            onClick={handleResetFilters}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="フィルター・フォーカスを初期化"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDarkMode ? 'ライトモードへ切り替え' : 'ダークモードへ切り替え'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Filter and Legend Toolbar */}
      <FilterToolbar
        filter={filter}
        onFilterChange={setFilter}
        gojuonRows={matrixData.gojuon_rows}
        totalKanjiCount={matrixData.metadata.total_kanji}
        filteredKanjiCount={matchingKanjiCount}
        activeColumnsCount={activeColumns.length}
        activeRowsCount={activeRows.length}
      />

      {/* Active Focus Pill / Notification Banner */}
      {(focusedRowInfo || focusedColInfo) && (
        <div className="shrink-0 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/60 border-b border-indigo-200 dark:border-indigo-800/80 flex flex-wrap items-center justify-between gap-2 z-20">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-indigo-900 dark:text-indigo-200">
            {focusedRowInfo ? (
              <RadicalLogogram
                position={focusedRowInfo.position}
                radical={focusedRowInfo.radical}
                size="sm"
                isFocused
              />
            ) : (
              <Focus className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            )}
            {focusedRowInfo && (
              <span>
                行フォーカス中: <strong>{focusedRowInfo.name_ja || focusedRowInfo.label}</strong> — 現在 <strong>{activeColumns.length}</strong> / {focusedRowInfo.kanji_count} 列を表示
              </span>
            )}
            {focusedColInfo && (
              <span>
                列フォーカス中: 部品「<strong>{focusedColInfo.glyph}</strong>」
                {focusedColInfo.primary_onyomi ? ` (${focusedColInfo.primary_onyomi})` : ''} — 現在 <strong>{activeRows.length}</strong> / {focusedColInfo.kanji_count} 字を表示
              </span>
            )}

            {/* Quick show all button if filters are hiding some characters in this column/row */}
            {focusedColInfo && activeRows.length < focusedColInfo.kanji_count && (
              <button
                onClick={() => {
                  setFilter((prev) => ({
                    ...prev,
                    gradeFilter: 'all',
                    jlptFilter: 'all',
                    gojuonFilter: 'all',
                    searchQuery: '',
                  }));
                }}
                className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-200 font-semibold text-[11px] transition-colors cursor-pointer"
                title="学年やJLPTフィルターを解除して、この列のすべての漢字を表示"
              >
                ※他 {focusedColInfo.kanji_count - activeRows.length} 字が非表示中 [全{focusedColInfo.kanji_count}字を表示]
              </button>
            )}

            {focusedRowInfo && activeColumns.length < focusedRowInfo.kanji_count && (
              <button
                onClick={() => {
                  setFilter((prev) => ({
                    ...prev,
                    gradeFilter: 'all',
                    jlptFilter: 'all',
                    gojuonFilter: 'all',
                    searchQuery: '',
                  }));
                }}
                className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-200 font-semibold text-[11px] transition-colors cursor-pointer"
              >
                ※他 {focusedRowInfo.kanji_count - activeColumns.length} 字が非表示中 [全{focusedRowInfo.kanji_count}字を表示]
              </button>
            )}
          </div>
          <button
            onClick={() => {
              setFocusedRowId(null);
              setFocusedColId(null);
            }}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm"
          >
            <span>フォーカス解除</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2D Virtualized Matrix Container */}
      <main className="flex-1 overflow-hidden p-3 min-h-0">
        <KanjiMatrix
          rows={activeRows}
          columns={activeColumns}
          cells={filteredCells}
          selectedKanji={selectedKanji}
          highlightedKanjiChar={highlightedKanjiChar}
          focusedRowId={focusedRowId}
          focusedColId={focusedColId}
          isAnyFilterActive={isAnyFilterActive}
          onSelectKanji={setSelectedKanji}
          onJumpToColumn={handleJumpToColumn}
          onToggleRowFocus={handleToggleRowFocus}
          onToggleColFocus={handleToggleColFocus}
        />
      </main>

      {/* Kanji Detail Slide-Over Drawer */}
      <KanjiDetailDrawer
        cell={selectedKanji}
        matrixData={matrixData}
        onClose={() => setSelectedKanji(null)}
        onSelectKanjiChar={handleSelectKanjiChar}
        onJumpToColumn={handleJumpToColumn}
      />
    </div>
  );
};
export default App;
