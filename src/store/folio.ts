/* What a folio token IS — the numeral alphabets and the ⟨…⟩ form — apart
   from where it paints or counts. Ported 2026-09-07 from
   ../writer/src/js/folio.mjs. Not ported: the legacy `<a name="#pN">`
   import form — MEASURED 2026-09-07, zero files in the mirror carry it. */

/* THE TWO ALPHABETS, spelled once and spliced into everything below: written
   out at each reader, a widened numeral system would reach some and not
   others. EITHER CASE for roman (settled 2026-08-07): a book printing XXIV
   is as ordinary as one printing xxiv. */
export const FOLIO_ARABIC_SRC = "[0-9]";
export const FOLIO_ROMAN_SRC = "[ivxlcdmIVXLCDM]";
/* non-capturing, so a splice that is not itself parenthesized cannot
   silently mean ^arabic OR roman$ */
export const FOLIO_NUM_SRC = "(?:" + FOLIO_ARABIC_SRC + "+|" + FOLIO_ROMAN_SRC + "+)";
/* the ALPHABET WITHOUT THE GRAMMAR: what passes this and fails FOLIO_ONE is
   exactly a MIX of the two systems, which a go-to box answers in its own
   words */
export const FOLIO_CHARS_RE = new RegExp("^(?:" + FOLIO_ARABIC_SRC + "|" + FOLIO_ROMAN_SRC + ")+$");
/* the canonical markdown form, ⟨8⟩ — U+27E8/9, MEASURED over the 2026-08-07
   corpus and not chosen: `<8>` and `<<8>>` were in use as shorthand, `« »`
   as quotation marks, and ⟨ ⟩ appeared nowhere. .replace ONLY — /g under
   .test() carries lastIndex. */
export const FOLIO_TOKEN = new RegExp("⟨(" + FOLIO_NUM_SRC + ")⟩", "g");
export const FOLIO_ONE = new RegExp("^" + FOLIO_NUM_SRC + "$");
/* the arabic half alone — only it elides, and a range is elided or it is not */
export const FOLIO_ARABIC = new RegExp("^" + FOLIO_ARABIC_SRC + "+$");
export function folioToken(tok: string): string { return "⟨" + tok + "⟩"; }
