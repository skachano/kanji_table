import React, { useState, useMemo, useEffect } from 'react';
import { KanjiMatrixData } from '../types/kanji';
import { extractOkurigana } from '../utils/reading';
import { X, Search, Check, RotateCcw } from 'lucide-react';

export interface OkuriganaPatternInfo {
  pattern: string;
  kanjiCount: number;
  sampleKanji: string[];
}

interface OkuriganaModalProps {
  isOpen: boolean;
  selectedPattern: string | null;
  matrixData: KanjiMatrixData;
  onApply: (pattern: string | null) => void;
  onClose: () => void;
}

const KANA_ROW_TABS = [
  { id: 'all', label: 'すべて' },
  { id: 'a', label: 'あ行' },
  { id: 'ka', label: 'か行' },
  { id: 'sa', label: 'さ行' },
  { id: 'ta', label: 'た行' },
  { id: 'na', label: 'な行' },
  { id: 'ha', label: 'は行' },
  { id: 'ma', label: 'ま行' },
  { id: 'ya', label: 'や行' },
  { id: 'ra', label: 'ら行' },
  { id: 'wa', label: 'わ行' },
] as const;

type KanaRowId = (typeof KANA_ROW_TABS)[number]['id'];

const KANA_ROW_MAP: Record<string, KanaRowId> = {
  あ: 'a',
  い: 'a',
  う: 'a',
  え: 'a',
  お: 'a',
  か: 'ka',
  き: 'ka',
  く: 'ka',
  け: 'ka',
  こ: 'ka',
  が: 'ka',
  ぎ: 'ka',
  ぐ: 'ka',
  げ: 'ka',
  ご: 'ka',
  さ: 'sa',
  し: 'sa',
  す: 'sa',
  せ: 'sa',
  そ: 'sa',
  ざ: 'sa',
  じ: 'sa',
  ず: 'sa',
  ぜ: 'sa',
  ぞ: 'sa',
  た: 'ta',
  ち: 'ta',
  つ: 'ta',
  て: 'ta',
  と: 'ta',
  だ: 'ta',
  ぢ: 'ta',
  づ: 'ta',
  で: 'ta',
  ど: 'ta',
  っ: 'ta',
  な: 'na',
  に: 'na',
  ぬ: 'na',
  ね: 'na',
  の: 'na',
  は: 'ha',
  ひ: 'ha',
  ふ: 'ha',
  へ: 'ha',
  ほ: 'ha',
  ば: 'ha',
  び: 'ha',
  ぶ: 'ha',
  べ: 'ha',
  ぼ: 'ha',
  ぱ: 'ha',
  ぴ: 'ha',
  ぷ: 'ha',
  ぺ: 'ha',
  ぽ: 'ha',
  ま: 'ma',
  み: 'ma',
  む: 'ma',
  め: 'ma',
  も: 'ma',
  や: 'ya',
  ゆ: 'ya',
  よ: 'ya',
  ら: 'ra',
  り: 'ra',
  る: 'ra',
  れ: 'ra',
  ろ: 'ra',
  わ: 'wa',
  を: 'wa',
  ん: 'wa',
};

export const OkuriganaModal: React.FC<OkuriganaModalProps> = ({
  isOpen,
  selectedPattern,
  matrixData,
  onApply,
  onClose,
}) => {
  const [tempSelected, setTempSelected] = useState<string | null>(selectedPattern);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRow, setSelectedRow] = useState<KanaRowId>('all');

  // Synchronize local temporary selection when modal opens or selectedPattern changes
  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedPattern);
      setSearchQuery('');
    }
  }, [isOpen, selectedPattern]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Extract all unique okurigana patterns sorted in Gojūon (五十音) order
  const allPatterns = useMemo(() => {
    const patternMap = new Map<string, { count: number; samples: string[] }>();

    for (const cell of Object.values(matrixData.cells)) {
      const seenInCell = new Set<string>();
      for (const kun of cell.all_kunyomi) {
        const okuri = extractOkurigana(kun);
        if (okuri && !seenInCell.has(okuri)) {
          seenInCell.add(okuri);
          let entry = patternMap.get(okuri);
          if (!entry) {
            entry = { count: 0, samples: [] };
            patternMap.set(okuri, entry);
          }
          entry.count += 1;
          if (entry.samples.length < 5 && !entry.samples.includes(cell.kanji)) {
            entry.samples.push(cell.kanji);
          }
        }
      }
    }

    const collator = new Intl.Collator('ja');
    return Array.from(patternMap.entries())
      .map(([pattern, data]) => ({
        pattern,
        kanjiCount: data.count,
        sampleKanji: data.samples,
      }))
      .sort((a, b) => collator.compare(a.pattern, b.pattern));
  }, [matrixData]);

  // Filter patterns by search query and Gojūon row tab
  const filteredPatterns = useMemo(() => {
    const q = searchQuery.trim();
    return allPatterns.filter((p) => {
      // 1. Search text filter
      if (q && !p.pattern.includes(q)) {
        return false;
      }
      // 2. Gojūon row filter
      if (selectedRow !== 'all') {
        const firstChar = p.pattern[0];
        if (KANA_ROW_MAP[firstChar] !== selectedRow) {
          return false;
        }
      }
      return true;
    });
  }, [allPatterns, searchQuery, selectedRow]);

  if (!isOpen) return null;

  const currentSelectionInfo = allPatterns.find((p) => p.pattern === tempSelected);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog Window */}
      <div className="relative z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>送り仮名フィルター</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                (五十音順)
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              訓読みの送り仮名パターン（例: 〜く、〜る、〜しい）を選択して表を絞り込みます
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Gojuon Row Navigation */}
        <div className="px-5 pt-3.5 pb-2.5 space-y-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="送り仮名を検索 (例: る, く, しい, かす)..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 50-on Row Tabs */}
          <div className="flex flex-wrap items-center gap-1">
            {KANA_ROW_TABS.map((tab) => {
              const isActive = selectedRow === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedRow(tab.id)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Patterns Grid Area */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[220px]">
          {filteredPatterns.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {filteredPatterns.map((p) => {
                const isSelected = tempSelected === p.pattern;
                return (
                  <button
                    key={p.pattern}
                    type="button"
                    onClick={() => setTempSelected(isSelected ? null : p.pattern)}
                    className={`
                      flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer
                      ${
                        isSelected
                          ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-400 dark:border-rose-600 ring-2 ring-rose-400/50 shadow-xs'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                      }
                    `}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span
                        className={`font-mono text-sm font-bold ${
                          isSelected
                            ? 'text-rose-700 dark:text-rose-300'
                            : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        〜{p.pattern}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-semibold ${
                          isSelected
                            ? 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {p.kanjiCount}字
                      </span>
                    </div>
                    {p.sampleKanji.length > 0 && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-kanji truncate w-full mt-1">
                        例: {p.sampleKanji.join(' ')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
              <p className="text-sm">該当する送り仮名パターンが見つかりません</p>
              <p className="text-xs mt-1">検索キーワードまたは行フィルターを変更してください</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">選択中:</span>
            {tempSelected ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-bold border border-rose-300 dark:border-rose-700">
                <span>〜{tempSelected}</span>
                {currentSelectionInfo && (
                  <span className="text-[11px] font-normal opacity-80">
                    ({currentSelectionInfo.kanjiCount}字)
                  </span>
                )}
              </span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 italic">未選択 (フィルターなし)</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {tempSelected && (
              <button
                type="button"
                onClick={() => setTempSelected(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>選択解除</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              キャンセル
            </button>

            <button
              type="button"
              onClick={() => {
                onApply(tempSelected);
                onClose();
              }}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>適用 (Apply)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
