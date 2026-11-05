import { GojuonRowId } from '../types/kanji';

export interface GojuonColorTheme {
  hue: number;
  label: string;
  badgeBg: string;
  badgeText: string;
  cardBgLight: string;
  cardBorderLight: string;
  cardBgDark: string;
  cardBorderDark: string;
  accentColor: string;
}

export const GOJUON_THEMES: Record<GojuonRowId, GojuonColorTheme> = {
  a: {
    hue: 25,
    label: 'あ行 (A)',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/70',
    badgeText: 'text-rose-700 dark:text-rose-300',
    cardBgLight: 'bg-rose-50/70 hover:bg-rose-100/90',
    cardBorderLight: 'border-rose-300/80',
    cardBgDark: 'dark:bg-rose-950/25 dark:hover:bg-rose-950/50',
    cardBorderDark: 'dark:border-rose-700/60',
    accentColor: '#f43f5e',
  },
  ka: {
    hue: 55,
    label: 'か行 (Ka)',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/70',
    badgeText: 'text-amber-800 dark:text-amber-300',
    cardBgLight: 'bg-amber-50/70 hover:bg-amber-100/90',
    cardBorderLight: 'border-amber-300/80',
    cardBgDark: 'dark:bg-amber-950/25 dark:hover:bg-amber-950/50',
    cardBorderDark: 'dark:border-amber-700/60',
    accentColor: '#f59e0b',
  },
  sa: {
    hue: 90,
    label: 'さ行 (Sa)',
    badgeBg: 'bg-yellow-100 dark:bg-yellow-950/70',
    badgeText: 'text-yellow-800 dark:text-yellow-300',
    cardBgLight: 'bg-yellow-50/70 hover:bg-yellow-100/90',
    cardBorderLight: 'border-yellow-300/80',
    cardBgDark: 'dark:bg-yellow-950/25 dark:hover:bg-yellow-950/50',
    cardBorderDark: 'dark:border-yellow-700/60',
    accentColor: '#eab308',
  },
  ta: {
    hue: 130,
    label: 'た行 (Ta)',
    badgeBg: 'bg-lime-100 dark:bg-lime-950/70',
    badgeText: 'text-lime-800 dark:text-lime-300',
    cardBgLight: 'bg-lime-50/70 hover:bg-lime-100/90',
    cardBorderLight: 'border-lime-300/80',
    cardBgDark: 'dark:bg-lime-950/25 dark:hover:bg-lime-950/50',
    cardBorderDark: 'dark:border-lime-700/60',
    accentColor: '#84cc16',
  },
  na: {
    hue: 160,
    label: 'な行 (Na)',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/70',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    cardBgLight: 'bg-emerald-50/70 hover:bg-emerald-100/90',
    cardBorderLight: 'border-emerald-300/80',
    cardBgDark: 'dark:bg-emerald-950/25 dark:hover:bg-emerald-950/50',
    cardBorderDark: 'dark:border-emerald-700/60',
    accentColor: '#10b981',
  },
  ha: {
    hue: 195,
    label: 'は行 (Ha)',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-950/70',
    badgeText: 'text-cyan-800 dark:text-cyan-300',
    cardBgLight: 'bg-cyan-50/70 hover:bg-cyan-100/90',
    cardBorderLight: 'border-cyan-300/80',
    cardBgDark: 'dark:bg-cyan-950/25 dark:hover:bg-cyan-950/50',
    cardBorderDark: 'dark:border-cyan-700/60',
    accentColor: '#06b6d4',
  },
  ma: {
    hue: 235,
    label: 'ま行 (Ma)',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/70',
    badgeText: 'text-blue-800 dark:text-blue-300',
    cardBgLight: 'bg-blue-50/70 hover:bg-blue-100/90',
    cardBorderLight: 'border-blue-300/80',
    cardBgDark: 'dark:bg-blue-950/25 dark:hover:bg-blue-950/50',
    cardBorderDark: 'dark:border-blue-700/60',
    accentColor: '#3b82f6',
  },
  ya: {
    hue: 275,
    label: 'や行 (Ya)',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-950/70',
    badgeText: 'text-indigo-800 dark:text-indigo-300',
    cardBgLight: 'bg-indigo-50/70 hover:bg-indigo-100/90',
    cardBorderLight: 'border-indigo-300/80',
    cardBgDark: 'dark:bg-indigo-950/25 dark:hover:bg-indigo-950/50',
    cardBorderDark: 'dark:border-indigo-700/60',
    accentColor: '#6366f1',
  },
  ra: {
    hue: 315,
    label: 'ら行 (Ra)',
    badgeBg: 'bg-fuchsia-100 dark:bg-fuchsia-950/70',
    badgeText: 'text-fuchsia-800 dark:text-fuchsia-300',
    cardBgLight: 'bg-fuchsia-50/70 hover:bg-fuchsia-100/90',
    cardBorderLight: 'border-fuchsia-300/80',
    cardBgDark: 'dark:bg-fuchsia-950/25 dark:hover:bg-fuchsia-950/50',
    cardBorderDark: 'dark:border-fuchsia-700/60',
    accentColor: '#d946ef',
  },
  wa: {
    hue: 350,
    label: 'わ行 (Wa)',
    badgeBg: 'bg-pink-100 dark:bg-pink-950/70',
    badgeText: 'text-pink-800 dark:text-pink-300',
    cardBgLight: 'bg-pink-50/70 hover:bg-pink-100/90',
    cardBorderLight: 'border-pink-300/80',
    cardBgDark: 'dark:bg-pink-950/25 dark:hover:bg-pink-950/50',
    cardBorderDark: 'dark:border-pink-700/60',
    accentColor: '#ec4899',
  },
  kun_only: {
    hue: 0,
    label: '訓のみ (Kun-only)',
    badgeBg: 'bg-slate-200 dark:bg-slate-800',
    badgeText: 'text-slate-700 dark:text-slate-300',
    cardBgLight: 'bg-slate-100/70 hover:bg-slate-200/80',
    cardBorderLight: 'border-slate-300/80',
    cardBgDark: 'dark:bg-slate-900/40 dark:hover:bg-slate-800/50',
    cardBorderDark: 'dark:border-slate-700/60',
    accentColor: '#64748b',
  },
};

export function getGojuonTheme(rowId: GojuonRowId): GojuonColorTheme {
  return GOJUON_THEMES[rowId] || GOJUON_THEMES.kun_only;
}
