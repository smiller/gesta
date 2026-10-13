/* A QUOTATION OF THE BOOKSHELF'S VERSE, found and made the reference a copy
   of that passage would make: the same label, the same highlight, the
   bookshelf's own lines. Lines match as letters and numbers alone, so the
   marks and spacing a copy picked up on its way in do not part them, nor
   a few lines changed (pin:
   bookshelfQuotes.test › quotedFrom: lines quoting a passage) (pin:
   bookshelfQuotes.test › quotedFrom: a line differing). The original
   places it; a translation beside it in other words is the bookshelf's
   passage all the same (pin: bookshelfQuotes.test › quotedFrom: lines the
   bookshelf does not hold) */
import type { Node } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { parseMarkdown } from "../src/model/parse.ts";
import { schema } from "../src/model/schema.ts";
import { lineUnits, type Unit } from "../src/editor/numbering.ts";
import { referencePayload } from "../src/editor/reference.ts";
import { journalOf } from "../src/store/headings.ts";
import type { Journal } from "../src/store/reference.ts";

/* a note's superscript mark is not a numeral of the line */
const norm = (s: string): string => s.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{Nd}]+/gu, "");
/* a line shorter than this is too common to place a passage by */
const DISTINCT = 12;
/* the lines of a quotation that may differ from the bookshelf's: one in
   five, and one in any passage of three or more (pin: bookshelfQuotes.test
   › quotedFrom: a passage of three lines or more) */
const misses = (n: number): number => n < 3 ? 0 : Math.max(1, Math.floor(n / 5));

interface Shelved { key: string; doc: Node; units: Unit[]; left: string[] }
export interface ShelfIndex { journal: Journal; entries: Shelved[]; at: Map<string, { e: number; i: number }[]> }

const cell = (row: Node, k: number): string => row.type === schema.nodes.pair ? (row.child(k)?.textContent ?? "") : k ? "" : row.textContent;

export function shelfIndex(cache: Record<string, string>): ShelfIndex {
  const entries: Shelved[] = [], at = new Map<string, { e: number; i: number }[]>();
  for (const key of Object.keys(cache).filter((k) => /^(bookshelf|page)\//.test(k))) {
    if (!/^:::\s*verse/m.test(cache[key])) continue;
    const doc = parseMarkdown(cache[key]);
    /* a speaker's row is a row a quotation copies too */
    const units = lineUnits(doc, 0);
    const left = units.map((u) => norm(cell(u.node, 0)));
    const e = entries.push({ key, doc, units, left }) - 1;
    left.forEach((l, i) => { if (l.length >= DISTINCT) at.set(l, [...(at.get(l) ?? []), { e, i }]); });
  }
  return { journal: journalOf(cache), entries, at };
}

export interface Quoted { left: string; right?: string }
export interface Referred { text: string; key: string; url: string; passage: string }
/* the reference a copy of an entry's lines makes */
function minted(index: ShelfIndex, s: Shelved, first: number, last: number): Referred | { why: string } {
  const a = s.units[first], b = s.units[last];
  const selection = TextSelection.between(s.doc.resolve(a.pos + 1), s.doc.resolve(b.pos + b.node.nodeSize - 1));
  const [date, ...tag] = s.key.split("/");
  const out = referencePayload(EditorState.create({ doc: s.doc, selection }), date, tag.join("/"), index.journal);
  return "refused" in out ? { why: `a copy is refused: ${out.refused}` } : { text: out.text, key: s.key, url: out.url, passage: out.passage };
}
/* a passage named by its entry and its first and last line numbers */
export function referenceAt(index: ShelfIndex, key: string, from: number, to: number): Referred | { why: string } {
  const s = index.entries.find((e) => e.key === key);
  const first = s ? s.units.findIndex((u) => u.line === from) : -1, last = s ? s.units.findIndex((u) => u.line === to) : -1;
  return s && first >= 0 && last >= first ? minted(index, s, first, last) : { why: `${key} has no lines ${from}-${to}` };
}
/* `except`: the entry the lines stand in, never a quotation of itself */
export function quotedFrom(index: ShelfIndex, lines: Quoted[], except?: string): Referred | { why: string } | null {
  const q = lines.map((l) => ({ left: norm(l.left), right: l.right === undefined ? undefined : norm(l.right) }));
  /* any distinct line may place the passage: the first may be the one changed */
  const anchors = q.flatMap((l, k) => l.left.length >= DISTINCT ? (index.at.get(l.left) ?? []).map((c) => ({ ...c, k })) : []);
  for (const { e, i, k } of anchors) {
    const s = index.entries[e], first = i - k, last = first + q.length - 1;
    if (s.key === except || first < 0 || last >= s.units.length) continue;
    if (q.filter((l, j) => l.left === s.left[first + j]).length < q.length - misses(q.length)) continue;
    return minted(index, s, first, last);
  }
  return null;
}
