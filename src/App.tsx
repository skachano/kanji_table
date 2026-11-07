import React, { useState, useMemo, useCallback } from 'react';
import matrixDataRaw from './data/kanji_matrix.json';
import { KanjiMatrixData, KanjiCell, FilterState } from './types/kanji';
import { FilterToolbar } from './components/FilterToolbar';
import { KanjiMatrix } from './components/KanjiMatrix';
import { KanjiDetailDrawer } from './components/KanjiDetailDrawer';
import { RadicalLogogram } from './components/RadicalLogogram';
import { OkuriganaModal } from './components/OkuriganaModal';
import { Moon, Sun, RotateCcw, X, Focus, ArrowLeftRight } from 'lucide-react';
import {
  getCounterpartsForColumn,
  getCounterpartsForRow,
  POSITION_SHORT_NAMES,
} from './utils/counterparts';
import {
  cleanReading,
  kanjiMatchesReading,
  kanjiMatchesOkurigana,
  normalizeReading,
  toHiragana,
} from './utils/reading';

const matrixData = matrixDataRaw as unknown as KanjiMatrixData;

const INITIAL_FILTER: FilterState = {
  searchQuery: '',
  gradeFilter: 'joyo', // Default to 常用漢字
  jlptFilter: 'all',
  gojuonFilter: 'all',
  hideEmptyRows: true,
  hideEmptyCols: true,
  positionFilter: 'all',
  componentFilter: null,
  readingFilter: null,
  okuriganaFilter: null,
};

export const App: React.FC = () => {
  const [filter, setFilter] = useState<FilterState>(INITIAL_FILTER);
  const [selectedKanji, setSelectedKanji] = useState<KanjiCell | null>(null);
  const [highlightedKanjiChar, setHighlightedKanjiChar] = useState<string | null>(null);
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [focusedColId, setFocusedColId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isOkuriganaModalOpen, setIsOkuriganaModalOpen] = useState<boolean>(false);

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

  // Update filter with auto-clear of row focus if position filter changes
  const handleFilterChange = useCallback((updater: (prev: FilterState) => FilterState) => {
    setFilter((prev) => {
      const next = updater(prev);
      if (next.positionFilter !== prev.positionFilter) {
        setFocusedRowId(null);
      }
      return next;
    });
  }, []);

  // Toggle component filter from decomposition tree
  const handleToggleComponentFilter = useCallback((component: string) => {
    setFilter((prev) => ({
      ...prev,
      componentFilter: prev.componentFilter === component ? null : component,
    }));
    // Clear any focus so the user sees all matching kanji across the matrix
    setFocusedRowId(null);
    setFocusedColId(null);
  }, []);

  // Toggle reading filter from kanji info drawer
  const handleToggleReadingFilter = useCallback((reading: string) => {
    const cleaned = cleanReading(reading);
    setFilter((prev) => ({
      ...prev,
      readingFilter: prev.readingFilter === cleaned ? null : cleaned,
    }));
    // Clear any focus so the user sees all matching kanji across the matrix
    setFocusedRowId(null);
    setFocusedColId(null);
  }, []);

  // Apply okurigana filter from modal window
  const handleApplyOkuriganaFilter = useCallback((pattern: string | null) => {
    setFilter((prev) => ({
      ...prev,
      okuriganaFilter: pattern,
    }));
    // Clear any focus so the user sees all matching kanji across the matrix
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

      // 4. Radical Position filter (偏, 旁, 冠, 脚, 繞, 垂, 構, 基本形)
      if (filter.positionFilter !== 'all') {
        const cellPos = cell.row_id.split(':')[0];
        if (cellPos !== filter.positionFilter) {
          continue;
        }
      }

      // 5. Component filter (filter by components/parts in decomposition tree)
      if (filter.componentFilter) {
        const kinfo = matrixData.kanji_index[cell.kanji];
        if (!kinfo?.components?.includes(filter.componentFilter)) {
          continue;
        }
      }

      // 6. Reading filter (filter by reading from kanji info)
      if (filter.readingFilter) {
        if (!kanjiMatchesReading(cell.all_onyomi, cell.all_kunyomi, filter.readingFilter)) {
          continue;
        }
      }

      // 7. Okurigana filter (filter by okurigana pattern)
      if (filter.okuriganaFilter) {
        if (!kanjiMatchesOkurigana(cell.all_kunyomi, filter.okuriganaFilter)) {
          continue;
        }
      }

      // 8. Search query
      if (q) {
        const hiraQ = toHiragana(q);
        const matchesKanji = cell.kanji.includes(q);
        const matchesOn = cell.all_onyomi.some(
          (on) => on.toLowerCase().includes(q) || normalizeReading(on).includes(hiraQ)
        );
        const matchesKun = cell.all_kunyomi.some(
          (kun) => kun.toLowerCase().includes(q) || normalizeReading(kun).includes(hiraQ)
        );
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

    // Filter columns by emptiness
    let visibleCols = matrixData.columns.filter((col) => {
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
      // Position filter (偏, 旁, 冠, 脚, 繞, 垂, 構, 基本形)
      if (filter.positionFilter !== 'all' && row.position !== filter.positionFilter) {
        return false;
      }
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
      filter.positionFilter !== 'all' ||
      filter.componentFilter !== null ||
      filter.readingFilter !== null ||
      filter.okuriganaFilter !== null ||
      focusedRowId !== null ||
      focusedColId !== null
    );
  }, [filter, focusedRowId, focusedColId]);

  // Filter by column (toggle if same column)
  const handleFilterByColumn = useCallback((colId: string) => {
    setFocusedColId((prev) => (prev === colId ? null : colId));
    setFocusedRowId(null);
    setHighlightedKanjiChar(colId);
    setTimeout(() => {
      setHighlightedKanjiChar(null);
    }, 2000);
  }, []);

  // Select a kanji by character
  const handleSelectKanjiChar = useCallback(
    (char: string) => {
      // 1. Direct cell search
      let entry = Object.values(matrixData.cells).find((c) => c.kanji === char);
      if (!entry) {
        // 2. Check if placements are mapped
        const placements = matrixData.kanji_index[char]?.placements;
        if (placements && placements.length > 0) {
          const key = `${placements[0].row_id}::${placements[0].col_id}`;
          entry = matrixData.cells[key];
        }
      }
      // 3. Fallback: synthesize entry from kanji_index if known
      if (!entry && matrixData.kanji_index[char]) {
        const kinfo = matrixData.kanji_index[char];
        entry = {
          kanji: char,
          row_id: 'none:∅',
          col_id: char,
          primary_onyomi: '',
          gojuon_row: 'kun_only',
          is_voiced: false,
          grade: 0,
          is_joyo: false,
          jlpt: null,
          frequency: null,
          strokes: kinfo.decomposition_tree?.strokes || 0,
          radical: kinfo.radical,
          radical_name: kinfo.radical_name,
          old_form: kinfo.old_form,
          new_form: kinfo.new_form,
          meanings: [],
          all_onyomi: [],
          all_kunyomi: [],
          has_own_column: false,
          is_base_component: true,
        };
      }
      if (entry) {
        setSelectedKanji(entry);
      }
    },
    [matrixData]
  );

  // Get focused row/col info for banner
  const focusedRowInfo = useMemo(() => {
    if (!focusedRowId) return null;
    return matrixData.rows.find((r) => r.id === focusedRowId) || null;
  }, [focusedRowId]);

  const focusedColInfo = useMemo(() => {
    if (!focusedColId) return null;
    return matrixData.columns.find((c) => c.id === focusedColId) || null;
  }, [focusedColId]);

  // Compute counterpart rows/columns for the focused row or filtered column
  const counterparts = useMemo(() => {
    if (focusedColInfo) {
      return getCounterpartsForColumn(focusedColInfo, matrixData.rows, matrixData.columns);
    }
    if (focusedRowInfo) {
      return getCounterpartsForRow(focusedRowInfo, matrixData.rows, matrixData.columns);
    }
    return { rows: [], columns: [] };
  }, [focusedColInfo, focusedRowInfo]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Top Navigation Bar */}
      <header className="h-12 sm:h-14 shrink-0 px-3 sm:px-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-kanji font-bold text-base sm:text-lg shadow-sm shrink-0">
            構
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-tight flex items-center gap-1.5 sm:gap-2">
              漢字2D構造表
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 hidden sm:inline">
                Kanji 2D Structural Matrix
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none hidden sm:block">
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
        onFilterChange={handleFilterChange}
        gojuonRows={matrixData.gojuon_rows}
        totalKanjiCount={matrixData.metadata.total_kanji}
        filteredKanjiCount={matchingKanjiCount}
        activeColumnsCount={activeColumns.length}
        activeRowsCount={activeRows.length}
        onOpenOkuriganaModal={() => setIsOkuriganaModalOpen(true)}
      />

      {/* Active Focus Pill / Notification Banner */}
      {(focusedRowInfo || focusedColInfo) && (
        <div className="shrink-0 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/60 border-b border-indigo-200 dark:border-indigo-800/80 flex flex-col gap-2 z-20">
          <div className="flex flex-wrap items-center justify-between gap-2">
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
                  列フィルター中: 部品「<strong>{focusedColInfo.glyph}</strong>」
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
                      componentFilter: null,
                      readingFilter: null,
                      okuriganaFilter: null,
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
                      componentFilter: null,
                      readingFilter: null,
                      okuriganaFilter: null,
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
              className="flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <span>{focusedColInfo ? '列絞込解除' : 'フォーカス解除'}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Counterpart Switch Links (includes the filtered column/row itself as highlighted so positions never change) */}
          {counterparts.columns.length + counterparts.rows.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-indigo-200/60 dark:border-indigo-800/60 text-xs">
              <div className="flex items-center space-x-1 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] mr-0.5 shrink-0 select-none">
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>切替:</span>
              </div>

              {/* Counterpart Columns */}
              {counterparts.columns.map((col) => {
                const isActive = focusedColId === col.id;
                return (
                  <button
                    key={col.id}
                    onClick={() => handleFilterByColumn(col.id)}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs transition-all shadow-2xs group cursor-pointer ${
                      isActive
                        ? 'bg-sky-600 dark:bg-sky-600 text-white border border-sky-500 font-bold shadow-xs ring-2 ring-sky-400/40'
                        : 'bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700/80 hover:bg-sky-50 dark:hover:bg-sky-900/40 hover:border-sky-400 dark:hover:border-sky-500 text-slate-800 dark:text-slate-200'
                    }`}
                    title={
                      isActive
                        ? `列「${col.glyph}」選択中（クリックで解除）`
                        : `列「${col.glyph}」(${col.primary_onyomi || '部品'}) フィルターに切り替え`
                    }
                  >
                    <span
                      className={`px-1 py-0.2 rounded text-[10px] font-bold ${
                        isActive
                          ? 'bg-sky-700/90 text-white'
                          : 'bg-sky-100 dark:bg-sky-900/80 text-sky-800 dark:text-sky-300'
                      }`}
                    >
                      列
                    </span>
                    <span
                      className={`font-kanji font-bold text-sm ${
                        isActive
                          ? 'text-white'
                          : 'text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400'
                      }`}
                    >
                      {col.glyph}
                    </span>
                    {col.primary_onyomi && (
                      <span
                        className={`text-[11px] ${
                          isActive ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        ({col.primary_onyomi})
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-mono font-semibold ${
                        isActive ? 'text-sky-100' : 'text-sky-700 dark:text-sky-400'
                      }`}
                    >
                      {col.kanji_count}字
                    </span>
                  </button>
                );
              })}

              {/* Counterpart Rows */}
              {counterparts.rows.map((row) => {
                const isActive = focusedRowId === row.id;
                return (
                  <button
                    key={row.id}
                    onClick={() => handleToggleRowFocus(row.id)}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs transition-all shadow-2xs group cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 dark:bg-indigo-600 text-white border border-indigo-500 font-bold shadow-xs ring-2 ring-indigo-400/40'
                        : 'bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700/80 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-800 dark:text-slate-200'
                    }`}
                    title={
                      isActive
                        ? `行「${row.name_ja || row.label}」選択中（クリックで解除）`
                        : `行「${row.name_ja || row.label}」フォーカスに切り替え`
                    }
                  >
                    <span
                      className={`px-1 py-0.2 rounded text-[10px] font-bold ${
                        isActive
                          ? 'bg-indigo-700/90 text-white'
                          : 'bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300'
                      }`}
                    >
                      {POSITION_SHORT_NAMES[row.position] || row.position}
                    </span>
                    <span
                      className={`font-kanji font-bold text-sm ${
                        isActive
                          ? 'text-white'
                          : 'text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                      }`}
                    >
                      {row.radical}
                    </span>
                    <span
                      className={`text-[11px] truncate max-w-[130px] ${
                        isActive ? 'text-indigo-100' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {row.name_ja || row.label}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-semibold ${
                        isActive ? 'text-indigo-100' : 'text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {row.kanji_count}字
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Active Component Filter Banner */}
      {filter.componentFilter && (
        <div className="shrink-0 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between gap-2 z-20">
          <div className="flex items-center space-x-2 text-xs text-emerald-900 dark:text-emerald-200">
            <span className="font-semibold">
              構成部品フィルター: 「{filter.componentFilter}」を含む漢字
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold text-[11px]">
              {matchingKanjiCount}字
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 text-[11px]">
              ({activeColumns.length}列 · {activeRows.length}行)
            </span>
          </div>
          <button
            onClick={() => handleToggleComponentFilter(filter.componentFilter!)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-medium text-xs shadow-2xs transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>フィルター解除</span>
          </button>
        </div>
      )}

      {/* Active Reading Filter Banner */}
      {filter.readingFilter && (
        <div className="shrink-0 px-4 py-2 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800/80 flex items-center justify-between gap-2 z-20">
          <div className="flex items-center space-x-2 text-xs text-amber-900 dark:text-amber-200">
            <span className="font-semibold">
              読みフィルター: 「{filter.readingFilter}」と読む漢字
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold text-[11px]">
              {matchingKanjiCount}字
            </span>
            <span className="text-amber-700 dark:text-amber-400 text-[11px]">
              ({activeColumns.length}列 · {activeRows.length}行)
            </span>
          </div>
          <button
            onClick={() => handleToggleReadingFilter(filter.readingFilter!)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 font-medium text-xs shadow-2xs transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>フィルター解除</span>
          </button>
        </div>
      )}

      {/* Active Okurigana Filter Banner */}
      {filter.okuriganaFilter && (
        <div className="shrink-0 px-4 py-2 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-800/80 flex items-center justify-between gap-2 z-20">
          <div className="flex items-center space-x-2 text-xs text-rose-900 dark:text-rose-200">
            <span className="font-semibold">
              送り仮名フィルター: 「〜{filter.okuriganaFilter}」を持つ漢字
            </span>
            <span className="px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold text-[11px]">
              {matchingKanjiCount}字
            </span>
            <span className="text-rose-700 dark:text-rose-400 text-[11px]">
              ({activeColumns.length}列 · {activeRows.length}行)
            </span>
          </div>
          <button
            onClick={() => handleApplyOkuriganaFilter(null)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 font-medium text-xs shadow-2xs transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>フィルター解除</span>
          </button>
        </div>
      )}

      {/* 2D Virtualized Matrix Container */}
      <main className="flex-1 overflow-hidden p-1 sm:p-3 min-h-0">
        <KanjiMatrix
          rows={activeRows}
          columns={activeColumns}
          cells={filteredCells}
          selectedKanji={selectedKanji}
          highlightedKanjiChar={highlightedKanjiChar}
          focusedRowId={focusedRowId}
          focusedColId={focusedColId}
          isAnyFilterActive={isAnyFilterActive}
          okuriganaFilter={filter.okuriganaFilter}
          onSelectKanji={setSelectedKanji}
          onFilterByColumn={handleFilterByColumn}
          onToggleRowFocus={handleToggleRowFocus}
          onToggleColFocus={handleToggleColFocus}
        />
      </main>

      {/* Kanji Detail Slide-Over Drawer */}
      <KanjiDetailDrawer
        cell={selectedKanji}
        matrixData={matrixData}
        activeComponentFilter={filter.componentFilter}
        activeReadingFilter={filter.readingFilter}
        focusedColId={focusedColId}
        onFilterByComponent={handleToggleComponentFilter}
        onFilterByReading={handleToggleReadingFilter}
        onClose={() => setSelectedKanji(null)}
        onSelectKanjiChar={handleSelectKanjiChar}
        onFilterByColumn={handleFilterByColumn}
      />

      {/* Okurigana Pattern Selection Modal Window */}
      <OkuriganaModal
        isOpen={isOkuriganaModalOpen}
        selectedPattern={filter.okuriganaFilter}
        matrixData={matrixData}
        onApply={handleApplyOkuriganaFilter}
        onClose={() => setIsOkuriganaModalOpen(false)}
      />
    </div>
  );
};
export default App;
