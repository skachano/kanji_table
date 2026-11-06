import { KanjiRow, KanjiColumn } from '../types/kanji';

export interface CounterpartsResult {
  columns: KanjiColumn[];
  rows: KanjiRow[];
}

export const POSITION_SHORT_NAMES: Record<string, string> = {
  left: '偏',
  right: '旁',
  top: '冠',
  bottom: '脚',
  nyo: '繞',
  tare: '垂',
  kamae: '構',
  none: '基',
};

const POSITION_ORDER: Record<string, number> = {
  left: 1,
  right: 2,
  top: 3,
  bottom: 4,
  nyo: 5,
  tare: 6,
  kamae: 7,
  none: 8,
};

/**
 * Radical and component alias clusters.
 * Groups together Kangxi radicals, positional variants, and historical/CJK variant forms.
 */
export const RADICAL_ALIAS_CLUSTERS: string[][] = [
  // 口 and 囗 (くにがまえ - kamae)
  ['口', '囗'],
  // 心, 忄 (りっしんべん), ⺗ (したごころ)
  ['心', '忄', '⺗'],
  // 手, 扌 (てへん)
  ['手', '扌'],
  // 水, 氵 (さんずい), 氺 (したみず)
  ['水', '氵', '氺'],
  // 火, 灬 (れっか)
  ['火', '灬'],
  // 人, 亻 (にんべん), 𠆢 (ひとやね), 儿 (ひとあし), 入
  ['人', '亻', '𠆢', '儿', '入'],
  // 刀, 刂 (りっとう)
  ['刀', '刂'],
  // 犬, 犭 (けものへん), ⺨
  ['犬', '犭', '⺨'],
  // 糸, 糹 (いとへん旧字体)
  ['糸', '糹'],
  // 食, 飠, ⻞, ⻟ (しょくへん)
  ['食', '飠', '⻞', '⻟'],
  // 示, 礻 (しめすへん)
  ['示', '礻'],
  // 衣, 衤 (ころもへん)
  ['衣', '衤'],
  // 牛, 牜 (うしへん)
  ['牛', '牜'],
  // 玉, 王 (おうへん)
  ['玉', '王'],
  // 老, 耂 (おいかんむり), ⺶
  ['老', '耂', '⺶'],
  // 羊, ⺷ (ひつじ)
  ['羊', '⺷'],
  // 竹, ⺮ (たけかんむり)
  ['竹', '⺮'],
  // 雨, ⻗ (あめかんむり)
  ['雨', '⻗'],
  // 辵, 辶, ⻌, ⻍, ⻎ (しんにょう)
  ['辵', '辶', '⻌', '⻍', '⻎'],
  // 邑 (おおざと), 阜 (こざとへん), 阝, ⻖, ⻏
  ['邑', '阜', '阝', '⻖', '⻏'],
  // 月, 肉, ⺼ (にくづき)
  ['月', '肉', '⺼'],
  // 小, ⺌ (しょうかんむり), ⺍
  ['小', '⺌', '⺍'],
  // 川, 巛
  ['川', '巛'],
  // 艸, 艹, 草 (くさかんむり)
  ['艸', '艹', '草'],
  // 足, ⻊ (あしへん)
  ['足', '⻊'],
  // 言, 訁 (ごんべん)
  ['言', '訁'],
  // 金, 釒 (かねへん)
  ['金', '釒'],
  // 网, 罒, 罓 (あみがしら)
  ['网', '罒', '罓'],
  // 戶, 戸 (とだれ)
  ['戶', '戸'],
  // 攴, 攵 (のぶん)
  ['攴', '攵'],
  // 爪, 爫, ⺤ (つめかんむり)
  ['爪', '爫', '⺤'],
  // 彐, 彑, ⺕ (けいがしら)
  ['彐', '彑', '⺕'],
  // 襾, 西, 覀
  ['襾', '西', '覀'],
  // 虍, 虎 (とらかんむり)
  ['虍', '虎'],
  // 麦, 麥
  ['麦', '麥'],
  // 黒, 黑
  ['黒', '黑'],
  // 斉, 齊
  ['斉', '齊'],
  // 歯, 齒
  ['歯', '齒'],
  // 竜, 龍
  ['竜', '龍'],
  // 亀, 龜
  ['亀', '龜'],
  // 靑, 青
  ['靑', '青'],
];

const ALIAS_MAP = new Map<string, Set<string>>();

for (const cluster of RADICAL_ALIAS_CLUSTERS) {
  const clusterSet = new Set(cluster);
  for (const glyph of cluster) {
    if (!ALIAS_MAP.has(glyph)) {
      ALIAS_MAP.set(glyph, new Set(clusterSet));
    } else {
      const existing = ALIAS_MAP.get(glyph)!;
      for (const item of clusterSet) {
        existing.add(item);
      }
    }
  }
}

/**
 * Get all alias glyphs for a given radical or component glyph.
 */
export function getAliases(glyph: string): Set<string> {
  const aliases = ALIAS_MAP.get(glyph);
  if (aliases) {
    return aliases;
  }
  return new Set([glyph]);
}

/**
 * Given a radical or component glyph, find all counterpart columns and rows in the alias family.
 * Includes all matching columns and rows in stable, deterministic order.
 */
export function getCounterparts(
  glyph: string,
  allRows: KanjiRow[],
  allColumns: KanjiColumn[]
): CounterpartsResult {
  if (!glyph || glyph === 'none' || glyph === '∅') {
    return { columns: [], rows: [] };
  }

  const aliases = getAliases(glyph);

  // All columns in the cluster (sorted deterministically)
  const counterpartCols = allColumns
    .filter((c) => aliases.has(c.glyph))
    .sort((a, b) => {
      if (b.kanji_count !== a.kanji_count) return b.kanji_count - a.kanji_count;
      return a.id.localeCompare(b.id);
    });

  // All rows in the cluster (sorted deterministically by position, then count, then id)
  const counterpartRows = allRows
    .filter(
      (r) =>
        r.position !== 'none' &&
        r.radical !== 'none' &&
        r.radical !== '∅' &&
        aliases.has(r.radical)
    )
    .sort((a, b) => {
      const posA = POSITION_ORDER[a.position] || 99;
      const posB = POSITION_ORDER[b.position] || 99;
      if (posA !== posB) return posA - posB;
      if (b.kanji_count !== a.kanji_count) return b.kanji_count - a.kanji_count;
      return a.id.localeCompare(b.id);
    });

  return {
    rows: counterpartRows,
    columns: counterpartCols,
  };
}

/**
 * Given a selected column, find all counterpart columns and rows in its family
 * (including the column itself so the switch buttons stay fixed in place).
 */
export function getCounterpartsForColumn(
  column: KanjiColumn,
  allRows: KanjiRow[],
  allColumns: KanjiColumn[]
): CounterpartsResult {
  return getCounterparts(column.glyph, allRows, allColumns);
}

/**
 * Given a selected row, find all counterpart columns and rows in its family
 * (including the row itself so the switch buttons stay fixed in place).
 */
export function getCounterpartsForRow(
  row: KanjiRow,
  allRows: KanjiRow[],
  allColumns: KanjiColumn[]
): CounterpartsResult {
  return getCounterparts(row.radical, allRows, allColumns);
}
