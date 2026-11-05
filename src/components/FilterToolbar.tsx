import React from 'react';
import { FilterState, GojuonRowId, GojuonRowInfo } from '../types/kanji';
import { GOJUON_THEMES } from '../utils/gojuonColors';
import { Search, X, Sparkles } from 'lucide-react';

interface FilterToolbarProps {
  filter: FilterState;
  onFilterChange: (updater: (prev: FilterState) => FilterState) => void;
  gojuonRows: GojuonRowInfo[];
  totalKanjiCount: number;
  filteredKanjiCount: number;
  activeColumnsCount: number;
  activeRowsCount: number;
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  filter,
  onFilterChange,
  gojuonRows,
  totalKanjiCount,
  filteredKanjiCount,
  activeColumnsCount,
  activeRowsCount,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onFilterChange((prev) => ({ ...prev, searchQuery: val }));
  };

  const handleClearSearch = () => {
    onFilterChange((prev) => ({ ...prev, searchQuery: '' }));
  };

  const handleGojuonToggle = (rowId: GojuonRowId) => {
    onFilterChange((prev) => ({
      ...prev,
      gojuonFilter: prev.gojuonFilter === rowId ? 'all' : rowId,
    }));
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 space-y-3.5 shadow-sm">
      {/* Top row: Search and primary dropdowns */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filter.searchQuery}
            onChange={handleSearchChange}
            placeholder="漢字・読み・意味を検索 (例: 連, ren, 車, lotus)..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          {filter.searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdowns & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Grade filter */}
          <select
            value={filter.gradeFilter}
            onChange={(e) =>
              onFilterChange((prev) => ({
                ...prev,
                gradeFilter: e.target.value as FilterState['gradeFilter'],
              }))
            }
            className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">すべての漢字 (常用 + 人名)</option>
            <option value="joyo">常用漢字のみ (2,136字)</option>
            <option value="elementary">小学校 (教育漢字 1〜6年)</option>
            <option value="secondary">中学校 (7〜8年)</option>
            <option value="jinmeiyo">人名用漢字のみ</option>
          </select>

          {/* JLPT filter */}
          <select
            value={filter.jlptFilter}
            onChange={(e) =>
              onFilterChange((prev) => ({
                ...prev,
                jlptFilter: e.target.value as FilterState['jlptFilter'],
              }))
            }
            className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">JLPT: 全レベル</option>
            <option value="N5">JLPT N5 (入門)</option>
            <option value="N4">JLPT N4 (初級)</option>
            <option value="N3">JLPT N3 (中級)</option>
            <option value="N2">JLPT N2 (中上級)</option>
            <option value="N1">JLPT N1 (上級)</option>
          </select>

          {/* Min kanji per column selector */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">列密度:</span>
            {[1, 2, 3, 5].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() =>
                  onFilterChange((prev) => ({ ...prev, minKanjiPerColumn: count }))
                }
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  filter.minKanjiPerColumn === count
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {count}字+
              </button>
            ))}
          </div>

          {/* Hide empty rows/cols toggles */}
          <label className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filter.hideEmptyRows}
              onChange={(e) =>
                onFilterChange((prev) => ({ ...prev, hideEmptyRows: e.target.checked }))
              }
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>空行を隠す</span>
          </label>
        </div>
      </div>

      {/* Bottom row: Gojūon Color Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            音読み50音行:
          </span>
          <div className="flex flex-wrap gap-1">
            {gojuonRows.map((row) => {
              const theme = GOJUON_THEMES[row.id];
              const isSelected = filter.gojuonFilter === row.id;

              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => handleGojuonToggle(row.id)}
                  className={`
                    px-2 py-0.5 rounded-full text-[11px] font-medium transition-all
                    flex items-center space-x-1 border
                    ${theme.badgeBg} ${theme.badgeText}
                    ${
                      isSelected
                        ? 'ring-2 ring-indigo-600 ring-offset-1 font-bold shadow-sm'
                        : 'border-transparent opacity-80 hover:opacity-100'
                    }
                  `}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: theme.accentColor }}
                  />
                  <span>{row.label.split(' ')[0]}</span>
                </button>
              );
            })}

            {filter.gojuonFilter !== 'all' && (
              <button
                type="button"
                onClick={() => onFilterChange((prev) => ({ ...prev, gojuonFilter: 'all' }))}
                className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
              >
                解除
              </button>
            )}
          </div>
        </div>

        {/* Counter Stats */}
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          表示: <span className="font-bold text-slate-800 dark:text-slate-200">{filteredKanjiCount}</span> / {totalKanjiCount}字
          <span className="ml-2 text-slate-400 dark:text-slate-600">
            ({activeColumnsCount}列 · {activeRowsCount}行)
          </span>
        </div>
      </div>
    </div>
  );
};
