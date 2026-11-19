/**
 * Normalize Arabic text for lexical search. The original text is never mutated;
 * this representation is only stored in `knowledge_chunk.content_normalized`.
 */
export function normalizeArabic(input: string): string {
  return input
    .replace(/\u0640/g, '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenizeForSearch(input: string): string[] {
  return normalizeArabic(input)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 0)
}
