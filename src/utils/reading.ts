/**
 * Utility functions for Japanese kanji readings (音読み / 訓読み)
 */

/**
 * Strips dictionary annotations from reading strings:
 * - okurigana delimiter dot (e.g. "つ.く" -> "つく", "つく.る" -> "つくる")
 * - leading and trailing affix hyphens (e.g. "-づ.く" -> "づく", "つ.け-" -> "つけ", "-ガワ" -> "ガワ")
 */
export function cleanReading(reading: string): string {
  if (!reading) return '';
  return reading
    .replace(/\./g, '')
    .replace(/^-+|-+$/g, '')
    .trim();
}

/**
 * Converts Katakana characters (U+30A1..U+30F6) to Hiragana (U+3041..U+3096).
 */
export function toHiragana(str: string): string {
  if (!str) return '';
  return str.replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

/**
 * Normalizes reading for comparison:
 * 1. Cleans dots and hyphens
 * 2. Converts to Hiragana
 * 3. Lowercases any Latin characters
 */
export function normalizeReading(reading: string): string {
  return toHiragana(cleanReading(reading)).toLowerCase();
}

/**
 * Checks whether a single reading matches a target reading.
 */
export function matchesReading(cellReading: string, targetReading: string): boolean {
  if (!cellReading || !targetReading) return false;
  return normalizeReading(cellReading) === normalizeReading(targetReading);
}

/**
 * Checks whether a set of readings (onyomi or kunyomi) contains a reading matching target reading.
 */
export function kanjiMatchesReading(
  allOnyomi: string[] = [],
  allKunyomi: string[] = [],
  targetReading: string
): boolean {
  if (!targetReading) return true;
  const targetNorm = normalizeReading(targetReading);
  if (!targetNorm) return true;

  return (
    allOnyomi.some((on) => normalizeReading(on) === targetNorm) ||
    allKunyomi.some((kun) => normalizeReading(kun) === targetNorm)
  );
}
