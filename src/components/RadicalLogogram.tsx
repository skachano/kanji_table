import React from 'react';
import { PositionType } from '../types/kanji';

interface RadicalLogogramProps {
  position: PositionType;
  radical: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isFocused?: boolean;
}

export const POSITION_CATEGORY_NAMES: Record<PositionType, string> = {
  left: '偏 (へん)',
  right: '旁 (つくり)',
  top: '冠 (かんむり)',
  bottom: '脚 (あし)',
  nyo: '繞 (にょう)',
  tare: '垂 (たれ)',
  kamae: '構 (かまえ)',
  none: '基本形',
};

export const RadicalLogogram: React.FC<RadicalLogogramProps> = ({
  position,
  radical,
  size = 'md',
  className = '',
  isFocused = false,
}) => {
  // Dimension definitions based on size prop
  const sizeStyles = {
    sm: {
      container: 'w-7 h-7',
      text: 'text-[11px]',
      textLarge: 'text-xs',
      padding: 'p-0.5',
      gap: 'gap-0.5',
    },
    md: {
      container: 'w-9 h-9',
      text: 'text-xs',
      textLarge: 'text-sm',
      padding: 'p-1',
      gap: 'gap-1',
    },
    lg: {
      container: 'w-12 h-12',
      text: 'text-base',
      textLarge: 'text-lg',
      padding: 'p-1.5',
      gap: 'gap-1.5',
    },
  }[size];

  const placeholderClass =
    'rounded-sm border border-dashed border-slate-300 dark:border-slate-600 bg-slate-100/70 dark:bg-slate-700/50';

  const radicalTextClass = `font-kanji font-bold select-none leading-none ${
    isFocused
      ? 'text-indigo-800 dark:text-indigo-200'
      : 'text-indigo-600 dark:text-indigo-400'
  }`;

  // Render the structural placement diagram
  const renderContent = () => {
    switch (position) {
      case 'left':
        return (
          <div className={`w-full h-full flex items-center ${sizeStyles.gap}`}>
            {/* Radical on the left */}
            <div className={`w-[45%] h-full flex items-center justify-center shrink-0 ${radicalTextClass} ${sizeStyles.text}`}>
              {radical}
            </div>
            {/* Placeholder box on the right */}
            <div className={`flex-1 h-full ${placeholderClass}`} />
          </div>
        );

      case 'right':
        return (
          <div className={`w-full h-full flex items-center ${sizeStyles.gap}`}>
            {/* Placeholder box on the left */}
            <div className={`flex-1 h-full ${placeholderClass}`} />
            {/* Radical on the right */}
            <div className={`w-[45%] h-full flex items-center justify-center shrink-0 ${radicalTextClass} ${sizeStyles.text}`}>
              {radical}
            </div>
          </div>
        );

      case 'top':
        return (
          <div className={`w-full h-full flex flex-col items-center ${sizeStyles.gap}`}>
            {/* Radical on the top */}
            <div className={`w-full h-[40%] flex items-center justify-center shrink-0 ${radicalTextClass} ${sizeStyles.text}`}>
              {radical}
            </div>
            {/* Placeholder box on the bottom */}
            <div className={`w-full flex-1 ${placeholderClass}`} />
          </div>
        );

      case 'bottom':
        return (
          <div className={`w-full h-full flex flex-col items-center ${sizeStyles.gap}`}>
            {/* Placeholder box on the top */}
            <div className={`w-full flex-1 ${placeholderClass}`} />
            {/* Radical on the bottom */}
            <div className={`w-full h-[40%] flex items-center justify-center shrink-0 ${radicalTextClass} ${sizeStyles.text}`}>
              {radical}
            </div>
          </div>
        );

      case 'nyo':
        // Enclosure around bottom-left (e.g. 辶, 廴)
        return (
          <div className="relative w-full h-full">
            {/* Placeholder box in the upper-right */}
            <div className={`absolute top-0.5 right-0.5 w-[56%] h-[56%] ${placeholderClass}`} />
            {/* Radical sweeping around the bottom-left */}
            <div className={`absolute bottom-0 left-0.5 ${radicalTextClass} ${sizeStyles.textLarge}`}>
              {radical}
            </div>
          </div>
        );

      case 'tare':
        // Enclosure across top-left (e.g. 广, 疒, 尸)
        return (
          <div className="relative w-full h-full">
            {/* Radical at top-left */}
            <div className={`absolute top-0 left-0.5 ${radicalTextClass} ${sizeStyles.textLarge}`}>
              {radical}
            </div>
            {/* Placeholder box in the lower-right */}
            <div className={`absolute bottom-0.5 right-0.5 w-[58%] h-[58%] ${placeholderClass}`} />
          </div>
        );

      case 'kamae':
        // Enclosing frame (e.g. 門, 囗, 勹)
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Radical glyph framing the box */}
            <span className={`absolute ${radicalTextClass} ${sizeStyles.textLarge} opacity-85`}>
              {radical}
            </span>
            {/* Centered inner placeholder box */}
            <div className={`w-[46%] h-[46%] ${placeholderClass} z-10 opacity-75`} />
          </div>
        );

      case 'none':
      default:
        // No additional radical (Row 0 / Base component itself)
        return (
          <div className="w-full h-full flex items-center justify-center bg-amber-50/70 dark:bg-amber-950/40 rounded">
            <span className="font-mono font-bold text-amber-700 dark:text-amber-300 text-xs">
              ∅
            </span>
          </div>
        );
    }
  };

  return (
    <div
      className={`
        relative shrink-0 rounded-lg border overflow-hidden transition-all
        ${sizeStyles.container} ${sizeStyles.padding}
        ${
          position === 'none'
            ? 'border-amber-300 dark:border-amber-700/70 bg-amber-50/50 dark:bg-amber-950/30'
            : isFocused
            ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/60 ring-2 ring-indigo-500/40'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 shadow-2xs'
        }
        ${className}
      `}
      title={`${POSITION_CATEGORY_NAMES[position] || position}: ${radical}`}
    >
      {renderContent()}
    </div>
  );
};
