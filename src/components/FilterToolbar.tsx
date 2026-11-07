import React, { useState } from 'react';
import { FilterState, GojuonRowId, GojuonRowInfo, PositionType } from '../types/kanji';
import { GOJUON_THEMES } from '../utils/gojuonColors';
import { Search, X, Sparkles, LayoutGrid, Filter, ChevronDown, ChevronUp } from 'lucide-react';

const RADICAL_POSITIONS: { id: PositionType | 'all'; label: string; desc: string }[] = [
  { id: 'all', label: 'すべて', desc: '全配置' },
  { id: 'left', label: '偏 (へん)', desc: '左側' },
  { id: 'right', label: '旁 (つくり)', desc: '右側' },
  { id: 'top', label: '冠 (かんむり)', desc: '上部' },
  { id: 'bottom', label: '脚 (あし)', desc: '下部' },
  { id: 'nyo', label: '繞 (にょう)', desc: '左下' },
  { id: 'tare', label: '垂 (たれ)', desc: '左上' },
  { id: 'kamae', label: '構 (かまえ)', desc: '囲み' },
  { id: 'none', label: '基本形 (∅)', desc: '追加部首なし' },
];

interface FilterToolbarProps {
  filter: FilterState;
  onFilterChange: (updater: (prev: FilterState) => FilterState) => void;
  gojuonRows: GojuonRowInfo[];
  totalKanjiCount: number;
  filteredKanjiCount: number;
  activeColumnsCount: number;
  activeRowsCount: number;
  onOpenOkuriganaModal?: () => void;
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  filter,
  onFilterChange,
  gojuonRows,
  totalKanjiCount,
  filteredKanjiCount,
  activeColumnsCount,
  activeRowsCount,
  onOpenOkuriganaModal,
}) => {
  const [isRadicalExpanded, setIsRadicalExpanded] = useState(false);
  const [isGojuonExpanded, setIsGojuonExpanded] = useState(false);

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

  const activePositionLabel =
    filter.positionFilter !== 'all'
      ? RADICAL_POSITIONS.find((p) => p.id === filter.positionFilter)?.label.split(' ')[0]
      : null;

  const activeGojuonRow =
    filter.gojuonFilter !== 'all'
      ? gojuonRows.find((r) => r.id === filter.gojuonFilter)
      : null;

  const activeGojuonTheme =
    filter.gojuonFilter !== 'all' ? GOJUON_THEMES[filter.gojuonFilter] : null;

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2.5 sm:p-4 space-y-2 sm:space-y-3 shadow-sm">
      {/* Top row: Search and primary dropdowns */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Search input and Okurigana button */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px] sm:min-w-[280px] max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filter.searchQuery}
              onChange={handleSearchChange}
              placeholder="漢字・読み・意味を検索 (例: 連, ren, 車, lotus)..."
              className="w-full pl-9 pr-8 py-1.5 sm:py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
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

          {/* Okurigana filter button */}
          {filter.okuriganaFilter ? (
            <div className="inline-flex items-center rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/70 shadow-xs ring-2 ring-rose-400/40 shrink-0">
              <button
                type="button"
                onClick={onOpenOkuriganaModal}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 sm:py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:text-rose-800 dark:hover:text-rose-200 cursor-pointer"
                title="送り仮名フィルターを変更"
              >
                <Filter className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>送り仮名: 〜{filter.okuriganaFilter}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFilterChange((prev) => ({ ...prev, okuriganaFilter: null }));
                }}
                className="p-1 mr-1 rounded hover:bg-rose-200 dark:hover:bg-rose-900/80 text-rose-600 dark:text-rose-400 cursor-pointer"
                title="送り仮名フィルターを解除"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenOkuriganaModal}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-lg border bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-all shrink-0 cursor-pointer"
              title="送り仮名フィルターを開く"
            >
              <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>送り仮名</span>
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

      {/* Expandable filter toggles & Stats bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Radical Position toggle */}
          <button
            type="button"
            onClick={() => setIsRadicalExpanded((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
              isRadicalExpanded || filter.positionFilter !== 'all'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-semibold'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
            aria-expanded={isRadicalExpanded}
            title="部首配置フィルターを展開/折りたたみ"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>部首配置</span>
            {activePositionLabel && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-indigo-600 text-white shrink-0">
                {activePositionLabel}
              </span>
            )}
            {isRadicalExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 ml-0.5 opacity-70 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70 shrink-0" />
            )}
          </button>

          {/* Gojuon toggle */}
          <button
            type="button"
            onClick={() => setIsGojuonExpanded((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
              isGojuonExpanded || filter.gojuonFilter !== 'all'
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 font-semibold'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
            aria-expanded={isGojuonExpanded}
            title="音読み50音行フィルターを展開/折りたたみ"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>音読み50音行</span>
            {activeGojuonRow && (
              <span
                className="px-1.5 py-0.2 text-[10px] font-bold rounded text-white shrink-0"
                style={{ backgroundColor: activeGojuonTheme?.accentColor || '#f59e0b' }}
              >
                {activeGojuonRow.label.split(' ')[0]}
              </span>
            )}
            {isGojuonExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 ml-0.5 opacity-70 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70 shrink-0" />
            )}
          </button>
        </div>

        {/* Counter Stats */}
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          表示: <span className="font-bold text-slate-800 dark:text-slate-200">{filteredKanjiCount}</span> / {totalKanjiCount}字
          <span className="ml-1.5 text-slate-400 dark:text-slate-600">
            ({activeColumnsCount}列 · {activeRowsCount}行)
          </span>
        </div>
      </div>

      {/* Expandable Radical Position Pill Bar */}
      {isRadicalExpanded && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
            <LayoutGrid className="w-3 h-3 text-indigo-500" />
            部首配置 (行):
          </span>
          <div className="flex flex-wrap gap-1">
            {RADICAL_POSITIONS.map((pos) => {
              const isSelected = filter.positionFilter === pos.id;
              return (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() =>
                    onFilterChange((prev) => ({
                      ...prev,
                      positionFilter: prev.positionFilter === pos.id && pos.id !== 'all' ? 'all' : pos.id,
                    }))
                  }
                  className={`
                    px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all border cursor-pointer
                    ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs ring-2 ring-indigo-400/40'
                        : 'bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }
                  `}
                  title={`${pos.label} (${pos.desc})`}
                >
                  {pos.label}
                </button>
              );
            })}

            {filter.positionFilter !== 'all' && (
              <button
                type="button"
                onClick={() => onFilterChange((prev) => ({ ...prev, positionFilter: 'all' }))}
                className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
              >
                解除
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expandable Gojūon Color Legend Bar */}
      {isGojuonExpanded && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3 text-amber-500" />
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
                    px-2 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer
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
                className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
              >
                解除
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
