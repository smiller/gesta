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
export interface ShelfIndex { journal: Journal; entries: Shelved[]; at: Map<string, { e: number; i: number }[]>; texts: Record<string, string>; docs: Map<string, Node> }

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
  const texts = cache;
  return { journal: journalOf(cache), entries, at, texts, docs: new Map() };
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

/* the letters of a long line's opening or close that place it */
const REACH = 60;
/* a speaker's name opening a line of a script */
const SPEAKER = /^\s*(?:>\s?)*[A-Z][A-Z0-9 .'’-]*(?:\s*\[[^\]]*\])?:\s*/;
/* A PROSE QUOTATION OF AN ENTRY under `prefix`, placed by its first and
   last lines, letters and numerals alone and a speaker's name aside: the
   reference a copy from its first words — a long line placed by its
   opening and close alone (pin: bookshelfQuotes.test › quotedProse: a
   quotation differing) — or the first speech's start when
   it opens on a speaker's name, to the last line's end,
   its closing marks with it, makes (pin: bookshelfQuotes.test ›
   quotedProse: a prose quotation) */
/* `keys`: the entries to try, in order; every entry under `prefix` when not
   given. `ends`: the quote is a passage's first words and last, any length
   between (pin: bookshelfQuotes.test › quotedProse: a passage named by its
   first and last words) */
export function quotedProse(index: ShelfIndex, prefix: string, quote: string[], keys?: string[], ends = false): Referred | null {
  const lines = quote.map((l) => l.replace(/^\s*(?:>\s?)*/, "")).filter((l) => norm(l));
  if (!lines.length) return null;
  /* a first line's opening and a last line's close: a word changed inside a long line does not part them */
  const first = norm(lines[0].replace(SPEAKER, "")).slice(0, REACH), last = norm(lines[lines.length - 1].replace(SPEAKER, "")).slice(-REACH);
  if (first.length < DISTINCT || last.length < DISTINCT) return null;
  for (const key of keys ?? Object.keys(index.texts).filter((k) => k.startsWith(prefix)).sort()) {
    if (!norm(index.texts[key]).includes(first)) continue;
    let doc = index.docs.get(key);
    if (!doc) { doc = parseMarkdown(index.texts[key]); index.docs.set(key, doc); }
    /* the entry's letters, each with its place in the document */
    let stream = "";
    const at: number[] = [];
    doc.descendants((n, pos) => {
      if (!n.isText) return true;
      [...n.text!].reduce((off, ch) => { const c = norm(ch); for (const x of c) { stream += x; at.push(pos + off); } return off + ch.length; }, 0);
      return false;
    });
    const i = stream.indexOf(first), j = i < 0 ? -1 : stream.indexOf(last, i);
    if (j < 0 || !ends && j - i > 4 * quote.join("").length) continue;
    /* a quotation opening on a speaker's name opens on the speech; else on its own words */
    const from = SPEAKER.test(lines[0]) ? doc.resolve(at[i]).start() : at[i];
    /* the last line's closing marks are its own: a question ending at its letters lost its mark */
    let to = at[j + last.length - 1] + 1;
    const close = doc.resolve(to).end();
    while (to < close && /^[^\s\p{L}\p{Nd}]$/u.test(doc.textBetween(to, to + 1))) to++;
    const out = referencePayload(EditorState.create({ doc, selection: TextSelection.create(doc, from, to) }), key.split("/")[0], key.split("/").slice(1).join("/"), index.journal);
    if ("refused" in out) continue;
    return { text: out.text, key, url: out.url, passage: out.passage };
  }
  return null;
}
