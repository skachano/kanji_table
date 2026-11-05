import React, { useRef, useMemo } from 'react';
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

export const KanjiMatrix: React.FC<KanjiMatrixProps> = ({
  rows,
  columns,
  cells,
  selectedKanji,
  highlightedKanjiChar,
  onSelectKanji,
  onJumpToColumn,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Record<string, HTMLTableHeaderCellElement | null>>({});

  // Separate Row 0 (none:∅) from other radical rows
  const { rowZero, radicalRows } = useMemo(() => {
    const zero = rows.find((r) => r.position === 'none');
    const others = rows.filter((r) => r.position !== 'none');
    return { rowZero: zero, radicalRows: others };
  }, [rows]);

  // Handler to smoothly scroll to a specific column
  const scrollToColumn = (colId: string) => {
    const el = columnRefs.current[colId];
    if (el && containerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  // Expose jump to column
  React.useEffect(() => {
    if (highlightedKanjiChar && columnRefs.current[highlightedKanjiChar]) {
      scrollToColumn(highlightedKanjiChar);
    }
  }, [highlightedKanjiChar]);

  if (columns.length === 0 || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-400 dark:text-slate-600">
        <p className="text-lg font-medium">該当する漢字が見つかりませんでした</p>
        <p className="text-sm mt-1">フィルターの条件を変更してください。</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-inner"
    >
      <table className="border-collapse table-fixed min-w-max text-xs">
        {/* Table Header: Column base components */}
        <thead className="sticky top-0 z-30 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm">
          <tr>
            {/* Top-left corner cell */}
            <th className="sticky left-0 top-0 z-40 w-44 min-w-[176px] p-2.5 bg-slate-200 dark:bg-slate-800/90 border-r border-b border-slate-300 dark:border-slate-700 text-left font-medium text-slate-700 dark:text-slate-300">
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight">部首 \ 部品</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {columns.length} 列 × {rows.length} 行
                </span>
              </div>
            </th>

            {/* Column headers */}
            {columns.map((col) => (
              <th
                key={col.id}
                ref={(el) => { columnRefs.current[col.id] = el; }}
                className="w-24 min-w-[96px] max-w-[96px] p-2 border-r border-b border-slate-300 dark:border-slate-700 text-center hover:bg-slate-200/80 dark:hover:bg-slate-800/80 transition-colors"
              >
                <div className="flex flex-col items-center justify-center space-y-0.5">
                  <span className="font-kanji text-xl font-bold text-indigo-700 dark:text-indigo-400">
                    {col.glyph}
                  </span>
                  <div className="flex items-center space-x-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    <span>{col.kanji_count}字</span>
                    {col.primary_onyomi && (
                      <span className="opacity-75">({col.primary_onyomi})</span>
                    )}
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Row 0: Base Component Row (none:∅) */}
          {rowZero && (
            <tr className="sticky top-[57px] z-20 bg-amber-50/90 dark:bg-amber-950/40 backdrop-blur-sm border-b-2 border-amber-300 dark:border-amber-700/60 shadow-sm">
              {/* Row 0 Header */}
              <th className="sticky left-0 z-25 p-2 bg-amber-100/95 dark:bg-amber-950/90 border-r border-b-2 border-amber-300 dark:border-amber-700/60 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 dark:text-amber-200">
                      ∅ (追加部首なし)
                    </span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400">
                      部品そのもの・基本形
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-semibold">
                    {rowZero.kanji_count}字
                  </span>
                </div>
              </th>

              {/* Row 0 Cells */}
              {columns.map((col) => {
                const cellKey = `${rowZero.id}::${col.id}`;
                const cell = cells[cellKey];

                return (
                  <td
                    key={cellKey}
                    className="w-24 min-w-[96px] max-w-[96px] h-20 p-1 border-r border-b-2 border-amber-200 dark:border-amber-800/40 text-center align-middle"
                  >
                    {cell ? (
                      <KanjiCard
                        cell={cell}
                        isSelected={selectedKanji?.kanji === cell.kanji}
                        isHighlighted={highlightedKanjiChar === cell.kanji}
                        onSelect={onSelectKanji}
                        onJumpToColumn={onJumpToColumn}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700 text-xs select-none">
                        ·
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          )}

          {/* Radical Rows */}
          {radicalRows.map((row) => (
            <tr
              key={row.id}
              className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-200 dark:border-slate-800"
            >
              {/* Row Header: Sticky Left */}
              <th className="sticky left-0 z-10 p-2 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-sm border-r border-slate-300 dark:border-slate-700 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline space-x-1.5">
                    <span className="font-kanji text-base font-bold text-slate-800 dark:text-slate-200">
                      {row.label}
                    </span>
                    {row.name_ja && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[90px]">
                        {row.name_ja}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500">
                    {row.kanji_count}
                  </span>
                </div>
              </th>

              {/* Data Cells */}
              {columns.map((col) => {
                const cellKey = `${row.id}::${col.id}`;
                const cell = cells[cellKey];

                return (
                  <td
                    key={cellKey}
                    className="w-24 min-w-[96px] max-w-[96px] h-20 p-1 border-r border-slate-200 dark:border-slate-800 text-center align-middle"
                  >
                    {cell ? (
                      <KanjiCard
                        cell={cell}
                        isSelected={selectedKanji?.kanji === cell.kanji}
                        isHighlighted={highlightedKanjiChar === cell.kanji}
                        onSelect={onSelectKanji}
                        onJumpToColumn={onJumpToColumn}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200 dark:text-slate-800 select-none">
                        ·
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
