import type { Node } from "prosemirror-model";
import { schema, isNote } from "../model/schema.ts";

const N = schema.nodes;
export interface Page { pos: number; label: string; at: number | null }

/* stops at the first page: read on every editor state */
export function hasPages(doc: Node): boolean {
  let found = false;
  doc.descendants((n) => {
    if (found || isNote(n)) return false;
    if (n.type === N.page_label) found = true;
    return !found;
  });
  return found;
}

/* WHERE EACH PAGE BEGINS: the first character after its label — past a
   space, a block's end and a note, which is not the text — null where
   nothing follows (pin: pages.test › each page begins at the first character) */
export function pages(doc: Node): Page[] {
  const out: Page[] = [];
  let waiting: Page[] = [];
  doc.descendants((n, pos) => {
    if (isNote(n)) return false;
    if (n.type === N.page_label) { const page = { pos, label: String(n.attrs.label), at: null }; out.push(page); waiting.push(page); return false; }
    if (n.isText && waiting.length) {
      const i = n.text!.search(/\S/);
      if (i >= 0) { for (const page of waiting) page.at = pos + i; waiting = []; }
    }
    return true;
  });
  return out;
}
