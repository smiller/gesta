import { FOLIO_ARABIC_SRC, FOLIO_ROMAN_SRC } from "../model/grammar.ts";

export { FOLIO_ARABIC_SRC, FOLIO_ROMAN_SRC, FOLIO_NUM_SRC, FOLIO_TOKEN, FOLIO_ONE, FOLIO_ARABIC, folioToken } from "../model/grammar.ts";
/* the ALPHABET WITHOUT THE GRAMMAR: what passes this and fails the one-folio
   grammar is exactly a MIX of the two systems (pin: folio.test › FOLIO_CHARS_RE: the
   alphabet without the grammar) */
export const FOLIO_CHARS_RE = new RegExp("^(?:" + FOLIO_ARABIC_SRC + "|" + FOLIO_ROMAN_SRC + ")+$");
