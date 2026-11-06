import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { KanjiRow, KanjiColumn, KanjiCell } from '../types/kanji';
import { KanjiCard } from './KanjiCard';
import { RadicalLogogram, POSITION_CATEGORY_NAMES } from './RadicalLogogram';

interface KanjiMatrixProps {
  rows: KanjiRow[];
  columns: KanjiColumn[];
  cells: Record<string, KanjiCell>;
  selectedKanji: KanjiCell | null;
  highlightedKanjiChar: string | null;
  focusedRowId: string | null;
  focusedColId: string | null;
  isAnyFilterActive?: boolean;
  onSelectKanji: (cell: KanjiCell) => void;
  onJumpToColumn: (colId: string) => void;
  onToggleRowFocus: (rowId: string) => void;
  onToggleColFocus: (colId: string) => void;
}

const COLUMN_WIDTH = 96; // px
const ROW_HEIGHT = 84; // px
const HEADER_HEIGHT = 54; // px
const LEFT_HEADER_WIDTH = 196; // px (expanded slightly to give ample room for logogram + details)

export const KanjiMatrix: React.FC<KanjiMatrixProps> = ({
  rows,
  columns,
  cells,
  selectedKanji,
  highlightedKanjiChar,
  focusedRowId,
  focusedColId,
  isAnyFilterActive = false,
  onSelectKanji,
  onJumpToColumn,
  onToggleRowFocus,
  onToggleColFocus,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtualizer for all vertical rows
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

  // Reset scroll to top whenever row or column focus changes
  React.useEffect(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = 0;
    }
  }, [focusedColId, focusedRowId]);

  if (columns.length === 0 || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-16 text-slate-400 dark:text-slate-600 select-none">
        <p className="text-lg font-medium">該当する漢字が見つかりませんでした</p>
        <p className="text-sm mt-1">フィルターの条件を変更するか、フォーカスを解除してください。</p>
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
              部首配置図 \ 部品
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
              const isColFocused = focusedColId === col.id;
              const isColFiltered =
                isAnyFilterActive ||
                (col.filtered_count !== undefined && col.filtered_count !== col.kanji_count);
              const colCountText =
                isColFiltered && col.filtered_count !== undefined
                  ? `${col.filtered_count}/${col.kanji_count}字`
                  : `${col.kanji_count}字`;

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
                  className={`p-1 border-r flex flex-col items-center justify-center transition-all cursor-pointer select-none group ${
                    isColFocused
                      ? 'bg-indigo-100 dark:bg-indigo-950/80 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500 ring-inset z-10'
                      : 'border-slate-300 dark:border-slate-700 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/50'
                  }`}
                  onClick={() => onToggleColFocus(col.id)}
                  title={`クリックして「${col.glyph}」列のみに絞り込み / 解除 (${colCountText})`}
                >
                  <div className="flex items-center space-x-1">
                    <span
                      className={`font-kanji text-xl font-bold leading-none transition-transform group-hover:scale-110 ${
                        isColFocused
                          ? 'text-indigo-900 dark:text-indigo-200 underline decoration-indigo-500 decoration-2'
                          : 'text-indigo-700 dark:text-indigo-400'
                      }`}
                    >
                      {col.glyph}
                    </span>
                    {isColFocused && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    <span className={isColFiltered ? 'font-semibold text-indigo-600 dark:text-indigo-400' : ''}>
                      {colCountText}
                    </span>
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
              const isRowFocused = focusedRowId === row.id;
              const isRowFiltered =
                isAnyFilterActive ||
                (row.filtered_count !== undefined && row.filtered_count !== row.kanji_count);
              const rowCountBadge =
                isRowFiltered && row.filtered_count !== undefined
                  ? `${row.filtered_count}/${row.kanji_count}`
                  : `${row.kanji_count}`;

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
                  className={`p-2 border-b flex items-center justify-between transition-all cursor-pointer select-none group ${
                    isRowFocused
                      ? 'bg-indigo-100 dark:bg-indigo-950/80 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500 ring-inset z-10'
                      : isRowZero
                      ? 'bg-amber-100/95 dark:bg-amber-950/85 border-amber-300 dark:border-amber-700/60 hover:bg-amber-200/80 dark:hover:bg-amber-900/80'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/50'
                  }`}
                  onClick={() => onToggleRowFocus(row.id)}
                  title={`クリックして「${row.label}」行のみに絞り込み / 解除 (${rowCountBadge}字)`}
                >
                  {/* Left: Radical logogram + Label/Category details */}
                  <div className="flex items-center space-x-2.5 overflow-hidden min-w-0">
                    <RadicalLogogram
                      position={row.position}
                      radical={row.radical}
                      size="md"
                      isFocused={isRowFocused}
                    />

                    <div className="flex flex-col overflow-hidden min-w-0 leading-tight">
                      <div className="flex items-center space-x-1">
                        <span
                          className={`font-kanji text-sm font-bold truncate ${
                            isRowFocused
                              ? 'text-indigo-950 dark:text-indigo-200 underline decoration-indigo-500 decoration-2'
                              : isRowZero
                              ? 'text-amber-900 dark:text-amber-200'
                              : 'text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                          }`}
                        >
                          {isRowZero ? '基本形' : row.radical}
                        </span>
                        {isRowFocused && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-medium truncate ${
                          isRowFocused
                            ? 'text-indigo-700 dark:text-indigo-300'
                            : isRowZero
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {row.name_ja || row.label}
                      </span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate">
                        {POSITION_CATEGORY_NAMES[row.position] || row.position}
                      </span>
                    </div>
                  </div>

                  {/* Right: Character count badge (x/y) */}
                  <span
                    className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded shrink-0 ml-1.5 ${
                      isRowFocused
                        ? 'bg-indigo-600 text-white font-bold'
                        : isRowZero
                        ? 'bg-amber-200/90 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold'
                        : isRowFiltered
                        ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800'
                        : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                    }`}
                  >
                    {rowCountBadge}
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
