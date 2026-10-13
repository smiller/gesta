/* A QUOTATION OF THE BOOKSHELF'S VERSE, found and made the reference a copy
   of that passage would make: the same label, the same highlight, the
   bookshelf's own lines. Lines match as letters and numbers alone, so the
   marks and spacing a copy picked up on its way in do not part them, nor
   a few lines changed (pin:
   bookshelfQuotes.test › quotedFrom: lines quoting a passage) (pin:
   bookshelfQuotes.test › quotedFrom: a line differing). A
   quotation whose other column is not the bookshelf's translation is named
   and left (pin: bookshelfQuotes.test › quotedFrom: lines the bookshelf
   does not hold) */
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

interface Shelved { key: string; doc: Node; units: Unit[]; left: string[]; right: string[] }
export interface ShelfIndex { journal: Journal; entries: Shelved[]; at: Map<string, { e: number; i: number }[]> }

const cell = (row: Node, k: number): string => row.type === schema.nodes.pair ? (row.child(k)?.textContent ?? "") : k ? "" : row.textContent;

export function shelfIndex(cache: Record<string, string>): ShelfIndex {
  const entries: Shelved[] = [], at = new Map<string, { e: number; i: number }[]>();
  for (const key of Object.keys(cache).filter((k) => k.startsWith("bookshelf/"))) {
    if (!/^:::\s*verse/m.test(cache[key])) continue;
    const doc = parseMarkdown(cache[key]);
    const units = lineUnits(doc, 0).filter((u) => u.line);
    const left = units.map((u) => norm(cell(u.node, 0))), right = units.map((u) => norm(cell(u.node, 1)));
    const e = entries.push({ key, doc, units, left, right }) - 1;
    left.forEach((l, i) => { if (l.length >= DISTINCT) at.set(l, [...(at.get(l) ?? []), { e, i }]); });
  }
  return { journal: journalOf(cache), entries, at };
}

export interface Quoted { left: string; right?: string }
export interface Referred { text: string; key: string; url: string; passage: string }
export function quotedFrom(index: ShelfIndex, lines: Quoted[]): Referred | { why: string } | null {
  const q = lines.map((l) => ({ left: norm(l.left), right: l.right === undefined ? undefined : norm(l.right) }));
  /* any distinct line may place the passage: the first may be the one changed */
  const anchors = q.flatMap((l, k) => l.left.length >= DISTINCT ? (index.at.get(l.left) ?? []).map((c) => ({ ...c, k })) : []);
  for (const { e, i, k } of anchors) {
    const s = index.entries[e], first = i - k, last = first + q.length - 1;
    if (first < 0 || last >= s.units.length) continue;
    const agree = (side: "left" | "right"): number => q.filter((l, j) => l[side] !== undefined && l[side] === s[side][first + j]).length;
    if (agree("left") < q.length - misses(q.length)) continue;
    const paired = q.filter((l) => l.right).length;
    if (paired && agree("right") < paired - misses(paired)) return { why: `the bookshelf's ${s.key.replace(/^bookshelf\//, "")} has another translation` };
    const a = s.units[first], b = s.units[last];
    const selection = TextSelection.between(s.doc.resolve(a.pos + 1), s.doc.resolve(b.pos + b.node.nodeSize - 1));
    const [date, ...tag] = s.key.split("/");
    const out = referencePayload(EditorState.create({ doc: s.doc, selection }), date, tag.join("/"), index.journal);
    return "refused" in out ? { why: `a copy is refused: ${out.refused}` } : { text: out.text, key: s.key, url: out.url, passage: out.passage };
  }
  return null;
}
