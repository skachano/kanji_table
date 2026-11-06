import React from 'react';
import { KanjiCell } from '../types/kanji';
import { getGojuonTheme } from '../utils/gojuonColors';

interface KanjiCardProps {
  cell: KanjiCell;
  isSelected?: boolean;
  isHighlighted?: boolean;
  focusedColId?: string | null;
  onSelect: (cell: KanjiCell) => void;
  onFilterByColumn?: (colId: string) => void;
}

export const KanjiCard: React.FC<KanjiCardProps> = ({
  cell,
  isSelected,
  isHighlighted,
  focusedColId,
  onSelect,
  onFilterByColumn,
}) => {
  const theme = getGojuonTheme(cell.gojuon_row);

  return (
    <div
      onClick={() => onSelect(cell)}
      className={`
        relative group flex flex-col items-center justify-between
        w-full h-full p-1.5 rounded-lg border cursor-pointer select-none
        transition-all duration-150
        ${theme.cardBgLight} ${theme.cardBorderLight}
        ${theme.cardBgDark} ${theme.cardBorderDark}
        ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 z-20 shadow-md scale-[1.03]' : ''}
        ${isHighlighted ? 'ring-2 ring-amber-400 ring-offset-1 z-10' : ''}
      `}
      title={`${cell.kanji} (${cell.primary_onyomi || '訓のみ'})${cell.radical ? ` [部首: ${cell.radical}]` : ''} - ${cell.meanings.slice(0, 2).join(', ')}`}
    >
      {/* Top row: On'yomi reading & Voicing indicator */}
      <div className="w-full flex items-center justify-between text-[11px] leading-none px-0.5">
        <span className={`font-mono font-medium truncate ${theme.badgeText}`}>
          {cell.primary_onyomi || '—'}
        </span>
        {cell.is_voiced && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 ml-1"
            title="Voiced initial sound (濁音/半濁音)"
          />
        )}
      </div>

      {/* Center: Kanji character */}
      <div className="my-auto py-0.5 text-center">
        <span className="font-kanji text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 group-hover:scale-110 transition-transform inline-block">
          {cell.kanji}
        </span>
      </div>

      {/* Bottom row: badges */}
      <div className="w-full flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 leading-none">
        {/* Stroke count or Grade */}
        <span className="text-[9px] opacity-75 font-mono">
          {cell.strokes}画
        </span>

        {/* Has own column filter badge */}
        {cell.has_own_column && !cell.is_base_component && onFilterByColumn ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFilterByColumn(cell.kanji);
            }}
            className={`px-1 py-0.5 rounded font-semibold text-[9px] tracking-tight transition-colors ${
              focusedColId === cell.kanji
                ? 'bg-indigo-600 text-white shadow-2xs ring-1 ring-indigo-400'
                : 'bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/60 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-300'
            }`}
            title={
              focusedColId === cell.kanji
                ? `「${cell.kanji}」列の絞り込みを解除`
                : `「${cell.kanji}」列のみで絞り込む`
            }
          >
            {focusedColId === cell.kanji ? '列絞込中' : '列絞込'}
          </button>
        ) : cell.is_base_component ? (
          <span className="px-1 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[8px] font-semibold">
            基本
          </span>
        ) : null}
      </div>
    </div>
  );
};
