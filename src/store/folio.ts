import { FOLIO_ARABIC_SRC, FOLIO_ROMAN_SRC } from "../model/grammar.ts";

export { FOLIO_ARABIC_SRC, FOLIO_ROMAN_SRC, FOLIO_NUM_SRC, FOLIO_TOKEN, FOLIO_ONE, FOLIO_ARABIC, folioToken } from "../model/grammar.ts";
export const FOLIO_CHARS_RE = new RegExp("^(?:" + FOLIO_ARABIC_SRC + "|" + FOLIO_ROMAN_SRC + ")+$");
