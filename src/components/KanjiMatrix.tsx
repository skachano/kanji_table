import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { KanjiRow, KanjiColumn, KanjiCell } from '../types/kanji';
import { KanjiCard } from './KanjiCard';

interface KanjiMatrixProps {
  rows: KanjiRow[];
  columns: KanjiColumn[];
  cells: Record<string, KanjiCell>;
  selectedKanji: KanjiCell | null;
  highlightedKanjiChar: string | null;
  onSelectKanji: (cell: KanjiCell) => void;
  onJumpToColumn: (colId: string) => void;
}

const COLUMN_WIDTH = 96; // px
const ROW_HEIGHT = 84; // px
const HEADER_HEIGHT = 54; // px
const LEFT_HEADER_WIDTH = 180; // px

export const KanjiMatrix: React.FC<KanjiMatrixProps> = ({
  rows,
  columns,
  cells,
  selectedKanji,
  highlightedKanjiChar,
  onSelectKanji,
  onJumpToColumn,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtualizer for all vertical rows (Row 0追加部首なし scrolls naturally with all rows)
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 4,
  });

  // Virtualizer for horizontal columns
  const colVirtualizer = useVirtualizer({
    horizontal: true,
    count: columns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => COLUMN_WIDTH,
    overscan: 4,
  });

  // Smooth scroll to column when requested
  const scrollToColumn = (colId: string) => {
    const colIndex = columns.findIndex((c) => c.id === colId);
    if (colIndex !== -1) {
      colVirtualizer.scrollToIndex(colIndex, { align: 'center', behavior: 'smooth' });
    }
  };

  // Jump to column if highlightedKanjiChar changes
  React.useEffect(() => {
    if (highlightedKanjiChar) {
      scrollToColumn(highlightedKanjiChar);
    }
  }, [highlightedKanjiChar]);

  if (columns.length === 0 || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-16 text-slate-400 dark:text-slate-600 select-none">
        <p className="text-lg font-medium">該当する漢字が見つかりませんでした</p>
        <p className="text-sm mt-1">フィルターの条件を変更してください。</p>
      </div>
    );
  }

  const virtualRows = rowVirtualizer.getVirtualItems();
  const virtualCols = colVirtualizer.getVirtualItems();

  const totalGridWidth = colVirtualizer.getTotalSize();
  const totalGridHeight = rowVirtualizer.getTotalSize();

  return (
    <div
      ref={parentRef}
      className="relative w-full h-full overflow-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-inner select-none"
    >
      {/* Container sizing the scroll area */}
      <div
        style={{
          width: `${LEFT_HEADER_WIDTH + totalGridWidth}px`,
          height: `${HEADER_HEIGHT + totalGridHeight}px`,
          position: 'relative',
        }}
      >
        {/* ========================================================= */}
        {/* 1. TOP-LEFT FIXED CORNER (Sticky left & top, zIndex: 40) */}
        {/* ========================================================= */}
        <div
          className="sticky top-0 left-0 z-40 bg-slate-200/95 dark:bg-slate-800/95 backdrop-blur-md border-r border-b border-slate-300 dark:border-slate-700"
          style={{
            width: `${LEFT_HEADER_WIDTH}px`,
            height: `${HEADER_HEIGHT}px`,
          }}
        >
          <div className="p-2.5 h-full flex flex-col justify-center">
            <span className="font-bold text-xs tracking-tight text-slate-800 dark:text-slate-200">
              部首・配置 \ 部品
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              {columns.length}列 × {rows.length}行
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. TOP STICKY COLUMN HEADERS (Sticky top, zIndex: 30)     */}
        {/* ========================================================= */}
        <div
          className="sticky top-0 z-30 pointer-events-none"
          style={{
            height: `${HEADER_HEIGHT}px`,
            marginTop: `-${HEADER_HEIGHT}px`,
            marginLeft: `${LEFT_HEADER_WIDTH}px`,
            width: `${totalGridWidth}px`,
          }}
        >
          <div className="relative w-full h-full bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-300 dark:border-slate-700 pointer-events-auto">
            {virtualCols.map((virtualCol) => {
              const col = columns[virtualCol.index];
              return (
                <div
                  key={col.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: `${virtualCol.start}px`,
                    width: `${virtualCol.size}px`,
                    height: `${HEADER_HEIGHT}px`,
                  }}
                  className="p-1 border-r border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center hover:bg-slate-200/80 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                  onClick={() => scrollToColumn(col.id)}
                  title={`部品: ${col.glyph} (${col.kanji_count}字)`}
                >
                  <span className="font-kanji text-xl font-bold leading-none text-indigo-700 dark:text-indigo-400">
                    {col.glyph}
                  </span>
                  <div className="flex items-center space-x-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    <span>{col.kanji_count}字</span>
                    {col.primary_onyomi && (
                      <span className="opacity-75">({col.primary_onyomi})</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. LEFT STICKY ROW HEADERS (Sticky left, zIndex: 20)      */}
        {/* ========================================================= */}
        <div
          className="sticky left-0 z-20 pointer-events-none"
          style={{
            width: `${LEFT_HEADER_WIDTH}px`,
            height: `${totalGridHeight}px`,
          }}
        >
          <div className="relative w-full h-full bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-sm border-r border-slate-300 dark:border-slate-700 pointer-events-auto">
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];
              const isRowZero = row.position === 'none';

              return (
                <div
                  key={row.id}
                  style={{
                    position: 'absolute',
                    top: `${virtualRow.start}px`,
                    left: 0,
                    width: `${LEFT_HEADER_WIDTH}px`,
                    height: `${virtualRow.size}px`,
                  }}
                  className={`p-2 border-b flex items-center justify-between transition-colors ${
                    isRowZero
                      ? 'bg-amber-100/95 dark:bg-amber-950/85 border-amber-300 dark:border-amber-700/60'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex flex-col overflow-hidden">
                    <span
                      className={`font-kanji text-sm font-bold truncate ${
                        isRowZero
                          ? 'text-amber-900 dark:text-amber-200'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {row.label}
                    </span>
                    <span
                      className={`text-[10px] truncate ${
                        isRowZero
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {row.name_ja}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded shrink-0 ml-1 ${
                      isRowZero
                        ? 'bg-amber-200/90 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {row.kanji_count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. VIRTUALIZED DATA GRID CELLS (zIndex: 10)               */}
        {/* ========================================================= */}
        <div
          style={{
            position: 'absolute',
            top: `${HEADER_HEIGHT}px`,
            left: `${LEFT_HEADER_WIDTH}px`,
            width: `${totalGridWidth}px`,
            height: `${totalGridHeight}px`,
          }}
        >
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            const isRowZero = row.position === 'none';

            return virtualCols.map((virtualCol) => {
              const col = columns[virtualCol.index];
              const cellKey = `${row.id}::${col.id}`;
              const cell = cells[cellKey];

              // If there is no cell at this coordinate
              if (!cell) {
                return (
                  <div
                    key={cellKey}
                    style={{
                      position: 'absolute',
                      top: `${virtualRow.start}px`,
                      left: `${virtualCol.start}px`,
                      width: `${virtualCol.size}px`,
                      height: `${virtualRow.size}px`,
                    }}
                    className={`border-r border-b flex items-center justify-center pointer-events-none select-none text-[10px] ${
                      isRowZero
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-800/30 text-amber-400/50'
                        : 'border-slate-100 dark:border-slate-800/40 text-slate-200 dark:text-slate-800/60'
                    }`}
                  >
                    ·
                  </div>
                );
              }

              // Render active KanjiCard
              return (
                <div
                  key={cellKey}
                  style={{
                    position: 'absolute',
                    top: `${virtualRow.start}px`,
                    left: `${virtualCol.start}px`,
                    width: `${virtualCol.size}px`,
                    height: `${virtualRow.size}px`,
                    padding: '4px',
                  }}
                  className={`border-r border-b ${
                    isRowZero
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <KanjiCard
                    cell={cell}
                    isSelected={selectedKanji?.kanji === cell.kanji}
                    isHighlighted={highlightedKanjiChar === cell.kanji}
                    onSelect={onSelectKanji}
                    onJumpToColumn={onJumpToColumn}
                  />
                </div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
};
