export type PositionType =
  | 'none'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'nyo'
  | 'tare'
  | 'kamae';

export type GojuonRowId =
  | 'a'
  | 'ka'
  | 'sa'
  | 'ta'
  | 'na'
  | 'ha'
  | 'ma'
  | 'ya'
  | 'ra'
  | 'wa'
  | 'kun_only';

export interface GojuonRowInfo {
  id: GojuonRowId;
  label: string;
  hue: number;
  kana: string[];
}

export interface KanjiCell {
  kanji: string;
  row_id: string;
  col_id: string;
  primary_onyomi: string;
  gojuon_row: GojuonRowId;
  is_voiced: boolean;
  grade: number;
  is_joyo: boolean;
  jlpt: number | null;
  frequency: number | null;
  strokes: number;
  meanings: string[];
  all_onyomi: string[];
  all_kunyomi: string[];
  has_own_column: boolean;
  is_base_component: boolean;
  decomposed_as?: {
    row_id: string;
    col_id: string;
  };
  variants?: string[];
}

export interface KanjiRow {
  id: string;
  position: PositionType;
  radical: string;
  label: string;
  name_ja: string;
  kanji_count: number;
}

export interface KanjiColumn {
  id: string;
  glyph: string;
  kanji_count: number;
  is_joyo: boolean;
  primary_onyomi: string;
  gojuon_row: GojuonRowId | '';
  meanings: string[];
  stroke_count: number | null;
}

export interface KanjiMatrixMetadata {
  generated_at: string;
  total_kanji: number;
  joyo_coverage: string;
  total_cells: number;
  total_rows: number;
  total_columns: number;
  multi_kanji_columns: number;
  collision_count: number;
}

export interface KanjiMatrixData {
  metadata: KanjiMatrixMetadata;
  gojuon_rows: GojuonRowInfo[];
  rows: KanjiRow[];
  columns: KanjiColumn[];
  cells: Record<string, KanjiCell>;
  kanji_index: Record<string, { char: string; placements: { row_id: string; col_id: string }[] }>;
}

export interface FilterState {
  searchQuery: string;
  gradeFilter: 'all' | 'joyo' | 'elementary' | 'secondary' | 'jinmeiyo';
  jlptFilter: 'all' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  gojuonFilter: GojuonRowId | 'all';
  minKanjiPerColumn: number;
  hideEmptyRows: boolean;
  hideEmptyCols: boolean;
  positionFilter: PositionType | 'all';
}
