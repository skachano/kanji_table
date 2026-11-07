import React from 'react';
import { KanjiCell, KanjiMatrixData } from '../types/kanji';
import { getGojuonTheme } from '../utils/gojuonColors';
import { cleanReading, matchesReading } from '../utils/reading';
import { RadicalLogogram, POSITION_CATEGORY_NAMES } from './RadicalLogogram';
import { DecompositionTreeView } from './DecompositionTreeView';
import { X, GitFork, BookOpen, Layers, ListTree, Filter, ArrowRight } from 'lucide-react';

interface KanjiDetailDrawerProps {
  cell: KanjiCell | null;
  matrixData: KanjiMatrixData;
  activeComponentFilter?: string | null;
  activeReadingFilter?: string | null;
  focusedColId?: string | null;
  onFilterByComponent?: (component: string) => void;
  onFilterByReading?: (reading: string) => void;
  onFilterByColumn: (colId: string) => void;
  onClose: () => void;
  onSelectKanjiChar: (char: string) => void;
}

export const KanjiDetailDrawer: React.FC<KanjiDetailDrawerProps> = ({
  cell,
  matrixData,
  activeComponentFilter,
  activeReadingFilter,
  focusedColId,
  onFilterByComponent,
  onFilterByReading,
  onFilterByColumn,
  onClose,
  onSelectKanjiChar,
}) => {
  // Listen for Escape key to close the drawer
  React.useEffect(() => {
    if (!cell) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cell, onClose]);

  if (!cell) return null;

  const theme = getGojuonTheme(cell.gojuon_row);
  const rowInfo = matrixData.rows.find((r) => r.id === cell.row_id);
  const decompTree = matrixData.kanji_index[cell.kanji]?.decomposition_tree;

  // Find all kanji that use this character as their base component
  const derivedKanji = Object.values(matrixData.cells)
    .filter((c) => c.col_id === cell.kanji && !c.is_base_component)
    .map((c) => c.kanji);

  return (
    <>
      {/* Mobile Backdrop Overlay (< md) */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className="
          fixed inset-y-0 right-0 z-50 w-full sm:max-w-md
          md:relative md:inset-auto md:z-auto md:w-80 lg:w-96 xl:w-[440px] md:max-w-none md:shrink-0 md:h-full
          bg-white dark:bg-slate-900 shadow-2xl md:shadow-xs
          border-l md:border border-slate-200 dark:border-slate-800 md:rounded-xl
          flex flex-col overflow-hidden transition-all
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
              漢字詳細 (Kanji Details)
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${theme.badgeBg} ${theme.badgeText}`}>
              {theme.label.split(' ')[0]}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="詳細を閉じる (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Large Character & Badges */}
        <div className="flex items-start space-x-5">
          <div
            className={`
              w-24 h-24 rounded-2xl flex items-center justify-center border-2 shadow-sm
              ${theme.cardBgLight} ${theme.cardBorderLight} ${theme.cardBgDark} ${theme.cardBorderDark}
            `}
          >
            <span className="font-kanji text-6xl font-bold text-slate-900 dark:text-slate-50">
              {cell.kanji}
            </span>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-mono font-medium">
                {cell.strokes} 画
              </span>
              {(cell.radical || (rowInfo?.radical && rowInfo.radical !== '∅')) && (
                <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-xs font-semibold">
                  部首: {cell.radical || rowInfo?.radical}
                  {cell.radical_name && (
                    <span className="font-normal opacity-80 ml-1">({cell.radical_name})</span>
                  )}
                </span>
              )}
              {cell.grade > 0 && (
                <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-semibold">
                  {cell.grade <= 6 ? `小${cell.grade}` : cell.grade === 8 ? '中' : '人名用'}
                </span>
              )}
              {cell.jlpt && (
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                  N{cell.jlpt}
                </span>
              )}
              {cell.frequency && (
                <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-mono">
                  頻度 #{cell.frequency}
                </span>
              )}
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
              {cell.meanings.join(', ')}
            </p>

            {/* Old Form (Kyūjitai) / New Form / Variant Links */}
            {(cell.old_form || cell.new_form || (cell.variants && cell.variants.length > 0)) && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                {cell.old_form && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80">
                    <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                      旧字体:
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectKanjiChar(cell.old_form!)}
                      className="font-kanji font-bold text-base text-indigo-900 dark:text-indigo-100 hover:text-indigo-600 dark:hover:text-indigo-300 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                      title={`旧字体「${cell.old_form}」の詳細を表示`}
                    >
                      <span>{cell.old_form}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                    </button>
                  </div>
                )}

                {cell.new_form && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80">
                    <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                      新字体:
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectKanjiChar(cell.new_form!)}
                      className="font-kanji font-bold text-base text-indigo-900 dark:text-indigo-100 hover:text-indigo-600 dark:hover:text-indigo-300 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                      title={`新字体「${cell.new_form}」の詳細を表示`}
                    >
                      <span>{cell.new_form}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                    </button>
                  </div>
                )}

                {cell.variants && cell.variants.length > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      異体字:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {cell.variants.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => onSelectKanjiChar(v)}
                          className="font-kanji font-bold text-sm hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                          title={`異体字「${v}」の詳細を表示`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Readings */}
        <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
          <div className="flex items-start space-x-3">
            <span className="w-12 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mt-1">
              音読み
            </span>
            <div className="flex flex-wrap gap-1.5">
              {cell.all_onyomi.length > 0 ? (
                cell.all_onyomi.map((on) => {
                  const isPrimary = on === cell.primary_onyomi;
                  const isMatch = Boolean(activeReadingFilter && matchesReading(on, activeReadingFilter));
                  const displayReading = cleanReading(on);
                  return (
                    <div
                      key={on}
                      className={`group inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded text-xs font-mono transition-all border ${
                        isMatch
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-100 border-amber-400 dark:border-amber-600 font-bold ring-2 ring-amber-400/50 shadow-xs'
                          : isPrimary
                          ? `${theme.badgeBg} ${theme.badgeText} font-bold ring-1 ring-inset border-transparent hover:border-amber-300 dark:hover:border-amber-700`
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-amber-300 dark:hover:border-amber-700'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onFilterByReading?.(on)}
                        className="cursor-pointer hover:underline flex items-center gap-1"
                        title={
                          isMatch
                            ? `「${displayReading}」フィルターを解除`
                            : `「${displayReading}」で表を絞り込む`
                        }
                      >
                        <span>{on}</span>
                        {isPrimary && !isMatch && <span className="text-[10px] text-amber-600 dark:text-amber-400">★</span>}
                      </button>

                      {onFilterByReading && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFilterByReading(on);
                          }}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                            isMatch
                              ? 'bg-amber-600 text-white font-bold hover:bg-amber-700 shadow-2xs'
                              : 'text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 border border-slate-200 dark:border-slate-600 hover:border-amber-300'
                          }`}
                          title={
                            isMatch
                              ? `「${displayReading}」フィルターを解除`
                              : `「${displayReading}」で表を絞り込む`
                          }
                        >
                          <Filter className="w-2.5 h-2.5" />
                          <span>{isMatch ? '絞込中' : '絞込'}</span>
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <span className="text-xs text-slate-400 italic">なし (訓読みのみ)</span>
              )}
            </div>
          </div>

          <div className="flex items-start space-x-3 pt-2 border-t border-slate-200 dark:border-slate-700/60">
            <span className="w-12 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mt-1">
              訓読み
            </span>
            <div className="flex flex-wrap gap-1.5">
              {cell.all_kunyomi.length > 0 ? (
                cell.all_kunyomi.map((kun) => {
                  const isMatch = Boolean(activeReadingFilter && matchesReading(kun, activeReadingFilter));
                  const displayReading = cleanReading(kun);
                  return (
                    <div
                      key={kun}
                      className={`group inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded text-xs font-mono transition-all border ${
                        isMatch
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-100 border-amber-400 dark:border-amber-600 font-bold ring-2 ring-amber-400/50 shadow-xs'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-amber-300 dark:hover:border-amber-700'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onFilterByReading?.(kun)}
                        className="cursor-pointer hover:underline flex items-center gap-1"
                        title={
                          isMatch
                            ? `「${displayReading}」フィルターを解除`
                            : `「${displayReading}」で表を絞り込む`
                        }
                      >
                        <span>{kun}</span>
                      </button>

                      {onFilterByReading && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFilterByReading(kun);
                          }}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                            isMatch
                              ? 'bg-amber-600 text-white font-bold hover:bg-amber-700 shadow-2xs'
                              : 'text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 border border-slate-200 dark:border-slate-600 hover:border-amber-300'
                          }`}
                          title={
                            isMatch
                              ? `「${displayReading}」フィルターを解除`
                              : `「${displayReading}」で表を絞り込む`
                          }
                        >
                          <Filter className="w-2.5 h-2.5" />
                          <span>{isMatch ? '絞込中' : '絞込'}</span>
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <span className="text-xs text-slate-400 italic">なし</span>
              )}
            </div>
          </div>
        </div>

        {/* Structural Breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-500" />
            構造分解 (Structure in Table)
          </h4>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Radical / Row */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center space-x-3">
              <RadicalLogogram
                position={rowInfo?.position || 'none'}
                radical={rowInfo?.radical || '∅'}
                size="lg"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-slate-400 font-medium">
                  部首・配置 (行)
                </span>
                <span className="font-kanji text-base font-bold text-slate-800 dark:text-slate-200 truncate">
                  {rowInfo?.name_ja || rowInfo?.label || cell.row_id}
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                  {POSITION_CATEGORY_NAMES[rowInfo?.position || 'none']}
                </span>
                {cell.radical && (cell.row_id === 'none:∅' || cell.radical !== rowInfo?.radical) && (
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold truncate mt-0.5">
                    伝統部首: {cell.radical} {cell.radical_name ? `(${cell.radical_name})` : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Base Component / Column */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium block mb-1">
                部品・音符 (列)
              </span>
              <div className="flex items-center justify-between">
                <span className="font-kanji text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  {cell.col_id}
                </span>
                <button
                  onClick={() => onFilterByColumn(cell.col_id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors flex items-center gap-1 ${
                    focusedColId === cell.col_id
                      ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-400'
                      : 'bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                  }`}
                  title={
                    focusedColId === cell.col_id
                      ? `「${cell.col_id}」列の絞り込みを解除`
                      : `「${cell.col_id}」列のみで表を絞り込む`
                  }
                >
                  <Filter className="w-2.5 h-2.5" />
                  <span>{focusedColId === cell.col_id ? '列絞込中' : '列で絞込'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* If composite kanji has its own column header */}
          {cell.has_own_column && !cell.is_base_component && (
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs text-indigo-900 dark:text-indigo-200 font-medium">
                <GitFork className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>「{cell.kanji}」は他の漢字の部品としても列を持っています</span>
              </div>
              <button
                onClick={() => onFilterByColumn(cell.kanji)}
                className={`px-2.5 py-1 rounded text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors ${
                  focusedColId === cell.kanji
                    ? 'bg-indigo-700 text-white ring-2 ring-indigo-400'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                }`}
              >
                <Filter className="w-3 h-3" />
                <span>
                  {focusedColId === cell.kanji
                    ? `「${cell.kanji}」列絞込解除`
                    : `「${cell.kanji}」列で絞込`}
                </span>
              </button>
            </div>
          )}

          {/* If base component in Row 0 is also decomposed elsewhere */}
          {cell.is_base_component && cell.decomposed_as && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
              <div className="text-xs text-amber-900 dark:text-amber-200 font-medium">
                <span>この基本漢字は「{cell.decomposed_as.col_id}」列で分解表示されます</span>
              </div>
              <button
                onClick={() => onFilterByColumn(cell.decomposed_as!.col_id)}
                className={`px-2.5 py-1 rounded text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors ${
                  focusedColId === cell.decomposed_as!.col_id
                    ? 'bg-amber-700 text-white ring-2 ring-amber-400'
                    : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                }`}
              >
                <Filter className="w-3 h-3" />
                <span>
                  {focusedColId === cell.decomposed_as!.col_id
                    ? `親列(「${cell.decomposed_as!.col_id}」)絞込解除`
                    : `親列(「${cell.decomposed_as!.col_id}」)で絞込`}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Hierarchical Decomposition Tree */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ListTree className="w-4 h-4 text-indigo-500" />
              構成部品ツリー (Decomposition Tree)
            </div>
            {decompTree?.strokes && (
              <span className="text-[10px] text-slate-400 font-mono">
                計{decompTree.strokes}画
              </span>
            )}
          </h4>
          <DecompositionTreeView
            tree={decompTree}
            char={cell.kanji}
            selectedRowId={cell.row_id}
            selectedColId={cell.col_id}
            matrixData={matrixData}
            activeComponentFilter={activeComponentFilter}
            focusedColId={focusedColId}
            onFilterByComponent={onFilterByComponent}
            onFilterByColumn={onFilterByColumn}
            onSelectKanjiChar={onSelectKanjiChar}
          />
        </div>

        {/* Derived Kanji using this component */}
        {derivedKanji.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              「{cell.kanji}」を部品に持つ漢字 ({derivedKanji.length}字)
            </h4>
            <div className="flex flex-wrap gap-2">
              {derivedKanji.map((childChar) => (
                <button
                  key={childChar}
                  onClick={() => onSelectKanjiChar(childChar)}
                  className="w-9 h-9 rounded-lg font-kanji text-lg font-bold bg-slate-100 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-indigo-900/60 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-all flex items-center justify-center"
                >
                  {childChar}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  </>
);
};
