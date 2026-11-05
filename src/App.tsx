import React, { useState, useMemo, useCallback } from 'react';
import matrixDataRaw from './data/kanji_matrix.json';
import { KanjiMatrixData, KanjiCell, FilterState } from './types/kanji';
import { FilterToolbar } from './components/FilterToolbar';
import { KanjiMatrix } from './components/KanjiMatrix';
import { KanjiDetailDrawer } from './components/KanjiDetailDrawer';
import { Moon, Sun, RotateCcw } from 'lucide-react';

const matrixData = matrixDataRaw as unknown as KanjiMatrixData;

const INITIAL_FILTER: FilterState = {
  searchQuery: '',
  gradeFilter: 'joyo', // Default to 常用漢字 as requested in prompt!
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

  // Filter matching cells
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
      if (col.kanji_count < filter.minKanjiPerColumn) return false;
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
      // Row 0 (none:∅) is always kept if any column has a base component
      if (row.position === 'none') return true;
      if (filter.hideEmptyRows && !rowsWithKanji.has(row.id)) return false;
      return true;
    });

    return {
      filteredCells: cellsMatching,
      activeColumns: visibleCols,
      activeRows: visibleRows,
      matchingKanjiCount: matchingChars.size,
    };
  }, [filter]);

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
            onClick={() => setFilter(INITIAL_FILTER)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="フィルターを初期化"
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

      {/* 2D Virtualized Matrix Container */}
      <main className="flex-1 overflow-hidden p-3 min-h-0">
        <KanjiMatrix
          rows={activeRows}
          columns={activeColumns}
          cells={filteredCells}
          selectedKanji={selectedKanji}
          highlightedKanjiChar={highlightedKanjiChar}
          onSelectKanji={setSelectedKanji}
          onJumpToColumn={handleJumpToColumn}
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
