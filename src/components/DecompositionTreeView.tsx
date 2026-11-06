import React, { useState } from 'react';
import { DecompositionNode, KanjiMatrixData } from '../types/kanji';
import { ChevronRight, ChevronDown, ArrowUpRight, Sparkles } from 'lucide-react';

export const POSITION_LABEL_MAP: Record<string, string> = {
  left: '偏 (へん)',
  right: '旁 (つくり)',
  top: '冠 (かんむり)',
  bottom: '脚 (あし)',
  nyo: '繞 (にょう)',
  tare: '垂 (たれ)',
  kamae: '構 (かまえ)',
  nyoc: '繞の中身',
  kamaec: '構の中身',
  tarec: '垂の中身',
  middle: '中 (なか)',
  none: '基本形',
};

interface DecompositionTreeNodeProps {
  node: DecompositionNode;
  depth?: number;
  selectedRowRadical?: string;
  selectedRowPosition?: string;
  selectedColId?: string;
  availableColumns: Set<string>;
  matrixData: KanjiMatrixData;
  onJumpToColumn: (colId: string) => void;
  onSelectKanjiChar: (char: string) => void;
}

const DecompositionTreeNode: React.FC<DecompositionTreeNodeProps> = ({
  node,
  depth = 0,
  selectedRowRadical,
  selectedRowPosition,
  selectedColId,
  availableColumns,
  matrixData,
  onJumpToColumn,
  onSelectKanjiChar,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const glyph = node.element || node.original;
  const hasChildren = Boolean(node.children && node.children.length > 0);

  // Check if this node matches current row radical
  const isRowRadicalMatch = Boolean(
    glyph &&
      selectedRowRadical &&
      selectedRowRadical !== '∅' &&
      (node.element === selectedRowRadical || node.original === selectedRowRadical) &&
      (!node.position || node.position === selectedRowPosition)
  );

  // Check if this node matches current column component
  const isColComponentMatch = Boolean(
    glyph && selectedColId && (node.element === selectedColId || node.original === selectedColId)
  );

  // Check if this node exists as an active column in the matrix
  const hasColumn = glyph ? availableColumns.has(glyph) : false;

  // Check if this glyph is a known kanji in matrix index
  const isKnownKanji = glyph ? Boolean(matrixData.kanji_index[glyph]) : false;

  const positionLabel = node.position ? POSITION_LABEL_MAP[node.position] || node.position : null;

  return (
    <div className="relative">
      {/* Node Row */}
      <div
        className={`
          group relative flex items-center gap-2 p-1.5 rounded-lg text-xs transition-colors
          ${
            isRowRadicalMatch
              ? 'bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 shadow-xs'
              : isColComponentMatch
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 shadow-xs'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent'
          }
        `}
      >
        {/* Toggle chevron if has children */}
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title={isExpanded ? '折りたたむ' : '展開する'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <span className="w-3.5 h-3.5 inline-block text-slate-300 dark:text-slate-600 text-center font-mono">
            •
          </span>
        )}

        {/* Character Glyph */}
        {glyph ? (
          <button
            onClick={() => {
              if (isKnownKanji && glyph) {
                onSelectKanjiChar(glyph);
              }
            }}
            disabled={!isKnownKanji}
            className={`
              font-kanji text-base font-bold px-1.5 py-0.5 rounded
              ${
                isKnownKanji
                  ? 'hover:bg-indigo-100 dark:hover:bg-indigo-900/60 cursor-pointer text-slate-900 dark:text-slate-100'
                  : 'text-slate-700 dark:text-slate-300 cursor-default'
              }
            `}
            title={isKnownKanji ? `「${glyph}」の詳細を表示` : undefined}
          >
            {glyph}
          </button>
        ) : (
          <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">
            {positionLabel ? `[${positionLabel}]` : '(部分)'}
          </span>
        )}

        {/* Variant / Original notice */}
        {node.variant && node.original && node.original !== node.element && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            ({node.original}の変形)
          </span>
        )}

        {/* Position Badge */}
        {positionLabel && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
            {positionLabel}
          </span>
        )}

        {/* Stroke count badge */}
        {typeof node.strokes === 'number' && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-mono">
            {node.strokes}画
          </span>
        )}

        {/* Phonetic badge */}
        {node.phon && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            音符: {node.phon}
          </span>
        )}

        {/* Radical badge */}
        {node.radical && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
            {node.radical === 'tradit' ? '伝統部首' : node.radical === 'nelson' ? 'Nelson' : '部首'}
          </span>
        )}

        {/* Match badges */}
        {isRowRadicalMatch && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-100 dark:bg-purple-900/70 text-purple-800 dark:text-purple-200 font-semibold border border-purple-300 dark:border-purple-700">
            <Sparkles className="w-2.5 h-2.5" />
            選択行部首
          </span>
        )}

        {isColComponentMatch && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-200 font-semibold border border-emerald-300 dark:border-emerald-700">
            <Sparkles className="w-2.5 h-2.5" />
            選択列部品
          </span>
        )}

        {/* Column Navigation button if this component has its own column in table */}
        {hasColumn && glyph && glyph !== selectedColId && (
          <button
            onClick={() => onJumpToColumn(glyph)}
            className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200 dark:border-indigo-800/60 transition-colors"
            title={`「${glyph}」列へジャンプ`}
          >
            <span>{glyph}列あり</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Children Subtree */}
      {hasChildren && isExpanded && (
        <div className="ml-4 pl-3 border-l-2 border-slate-200 dark:border-slate-800 space-y-1 my-1">
          {node.children!.map((child, idx) => (
            <DecompositionTreeNode
              key={`${child.element || child.original || idx}-${idx}`}
              node={child}
              depth={depth + 1}
              selectedRowRadical={selectedRowRadical}
              selectedRowPosition={selectedRowPosition}
              selectedColId={selectedColId}
              availableColumns={availableColumns}
              matrixData={matrixData}
              onJumpToColumn={onJumpToColumn}
              onSelectKanjiChar={onSelectKanjiChar}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface DecompositionTreeViewProps {
  tree?: DecompositionNode;
  char: string;
  selectedRowId?: string;
  selectedColId?: string;
  matrixData: KanjiMatrixData;
  onJumpToColumn: (colId: string) => void;
  onSelectKanjiChar: (char: string) => void;
}

export const DecompositionTreeView: React.FC<DecompositionTreeViewProps> = ({
  tree,
  char,
  selectedRowId,
  selectedColId,
  matrixData,
  onJumpToColumn,
  onSelectKanjiChar,
}) => {
  // Memoize column existence for O(1) lookup
  const availableColumns = React.useMemo(() => {
    return new Set(matrixData.columns.map((c) => c.id));
  }, [matrixData.columns]);

  // Extract selected row's position and radical
  const [selectedRowPosition, selectedRowRadical] = React.useMemo(() => {
    if (!selectedRowId) return [undefined, undefined];
    const parts = selectedRowId.split(':');
    return [parts[0], parts[1]];
  }, [selectedRowId]);

  if (!tree) {
    return (
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-400 italic">
        「{char}」の分解データがありません
      </div>
    );
  }

  return (
    <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
      {/* Legend & Hint */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-200/80 dark:border-slate-700/60">
        <span className="font-medium">「{char}」の階層構造ツリー</span>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="inline-flex items-center gap-0.5 text-purple-600 dark:text-purple-400 font-medium">
            ● 行部首
          </span>
          <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium">
            ● 列部品
          </span>
        </div>
      </div>

      {/* Interactive Tree */}
      <div className="space-y-1 overflow-x-auto py-1">
        <DecompositionTreeNode
          node={tree}
          selectedRowRadical={selectedRowRadical}
          selectedRowPosition={selectedRowPosition}
          selectedColId={selectedColId}
          availableColumns={availableColumns}
          matrixData={matrixData}
          onJumpToColumn={onJumpToColumn}
          onSelectKanjiChar={onSelectKanjiChar}
        />
      </div>
    </div>
  );
};
