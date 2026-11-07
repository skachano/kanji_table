/**
 * Utility functions for Japanese kanji readings (音読み / 訓読み) and 送り仮名 (okurigana)
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

/**
 * Extracts okurigana pattern from a single kunyomi string.
 * Returns null if no okurigana is marked by a dot.
 * e.g. "つ.く" -> "く", "-づ.く" -> "く", "つく.る" -> "る", "うつく.しい" -> "しい", "つく" -> null
 */
export function extractOkurigana(kunyomi: string): string | null {
  if (!kunyomi) return null;
  const dotIndex = kunyomi.indexOf('.');
  if (dotIndex === -1) return null;
  const okuri = kunyomi.slice(dotIndex + 1).replace(/^-+|-+$/g, '').trim();
  return okuri || null;
}

/**
 * Checks whether any of the cell's kunyomi entries match the target okurigana pattern.
 */
export function kanjiMatchesOkurigana(
  allKunyomi: string[] = [],
  targetOkurigana: string
): boolean {
  if (!targetOkurigana) return true;
  const targetNorm = targetOkurigana.replace(/\./g, '').replace(/^-+|-+$/g, '').trim();
  if (!targetNorm) return true;

  return allKunyomi.some((kun) => {
    const okuri = extractOkurigana(kun);
    return okuri === targetNorm;
  });
}
