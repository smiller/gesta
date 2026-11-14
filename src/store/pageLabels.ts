import { PAGE_ARABIC_SRC, PAGE_ROMAN_SRC } from "../model/grammar.ts";

export { PAGE_ARABIC_SRC, PAGE_ROMAN_SRC, PAGE_NUM_SRC, PAGE_TOKEN, PAGE_ONE, PAGE_ARABIC, pageToken } from "../model/grammar.ts";
export const PAGE_CHARS_RE = new RegExp("^(?:" + PAGE_ARABIC_SRC + "|" + PAGE_ROMAN_SRC + ")+$");
