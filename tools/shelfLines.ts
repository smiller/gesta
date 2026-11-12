/* LINES OF THE BOOKSHELF'S VERSE QUOTED IN AN ENTRY, found and made the
   reference ⌃⌘R makes for them. A run is consecutive lines, quoted or bare,
   each the next line of one passage, letters and numerals alone; code is
   left, and so is a quotation already under a link to the bookshelf (pin:
   shelfLines.test › quotedRuns). A run after a short source line ending in a
   colon that gives the lines makes that source line the link, its words kept;
   any other run gives way to the whole reference (pin: shelfLines.test ›
   referRuns) */
import { norm, quotedProse, type ShelfIndex, type Referred } from "./bookshelfQuotes.ts";

const FENCE = /^\s*(?:>\s*)*(```|~~~)/;
const QUOTE = /^\s*>/;
/* a line as the verse it may hold: its quotation's marks, its indent, a
   pair's other column and a closing line break off */
const bare = (l: string): string => l.replace(/^\s*(?:>\s*)*/, "").replace(/(?<!\\)\s\|\s.*$/, "").replace(/(?:<br\s*\/?>|\\)\s*$/i, "").trim();
/* a run this short in letters is too common to be a quotation */
const ENOUGH = 30;
/* a half-line opening or ending a run, at least this long in letters */
const HALF = 6;
/* a source line introducing a run, no longer than this */
const SOURCE_LINE = 40;

/* two lines close in their letters: their letter pairs shared, by Dice's
   measure, at least this much — Heav'n against Heaven, a dropped letter */
const ALIKE = 0.8;
/* a line of one's own wording standing for a line left out: this much */
const REWORDED = 0.6;
function alike(a: string, b: string, enough = ALIKE): boolean {
  if (!a || !b) return false;
  const pairs = (t: string): string[] => [...t].slice(1).map((c, i) => t[i] + c);
  const pa = pairs(a), pb = pairs(b), left = [...pb];
  let shared = 0;
  for (const p of pa) { const at = left.indexOf(p); if (at >= 0) { shared++; left.splice(at, 1); } }
  return 2 * shared / (pa.length + pb.length) >= enough;
}

/* a line joining two places of a passage with an ellipsis is not one line of it */
const SPLICE = /\p{L}[^\p{L}]*(?:…|\.\.\.)[^\p{L}]*\p{L}/u;
/* such a line's two places, the words before the ellipsis and after */
const places = (l: string): [string, string] => { const p = bare(l).split(/(?:…|\.\.\.)/); return [norm(p[0]), norm(p[p.length - 1])]; };

function distance(a: string, b: string): number {
  let row = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}
/* a half-line: the start (or end) of a line, two letters' change allowed
   once it is eight long — fixt against fixed, mee against me; how many of
   the line's letters it is, the closest, or 0 */
function halfAt(n: string, line: string, start: boolean): number {
  if (start ? line.startsWith(n) : line.endsWith(n)) return n.length;
  if (n.length < 8) return 0;
  const b = { best: 0, least: 3 };
  for (let k = n.length - 2; k <= Math.min(n.length + 2, line.length); k++) {
    const d = distance(n, start ? line.slice(0, k) : line.slice(-k));
    if (closer(b, d, k, n.length)) { b.best = k; b.least = d; }
  }
  return b.best;
}
/* fewer letters changed, or as few and nearer the half-line's own length */
const closer = (b: { best: number; least: number }, d: number, k: number, length: number): boolean =>
  d < b.least || (d === b.least && Math.abs(k - length) < Math.abs(b.best - length));
const halfOf = (n: string, line: string, start: boolean): boolean => halfAt(n, line, start) > 0;
/* a line this many letters short of its own or fewer is spelled otherwise,
   not halved: Heav'n, chang'd, thir (pin: shelfLines.test › quotedRuns: a
   first or last line spelled otherwise) */
const SPELT = 2;

export interface Run {
  start: number; end: number; key: string;
  /* the passage's first and last rows, a speaker's name among them, by place */
  first: number; last: number;
  /* its first and last numbered lines */
  from: number; to: number;
  /* a joined first or last line's other place, as written, kept beside the reference */
  before?: string; after?: string;
  /* how many of its line's letters a half-line opening the run quotes, from
     the line's end, and one closing it, from the line's start */
  head?: number; tail?: number;
  /* how many runs it was joined from */
  parts?: number;
  /* the speaker's row heading a passage taken from inside the speech */
  speaker?: number;
  /* a prose book's passage, referred to by its chapter alone */
  prose?: boolean;
}

/* a card is one's own composition, kept whole: a line of the book inside
   one is never made a reference (pin: shelfLines.test › quotedRuns: a line
   inside a card) */
function inCard(open: string[], l: string): boolean {
  const div = l.replace(/^\s*(?:>\s?)*/, "").match(/^:::\s*(\S*)/);
  if (div?.[1]) open.push(div[1]);
  const carded = open.some((name) => name.startsWith("card"));
  if (div && !div[1]) open.pop();
  return carded;
}
/* a quotation under a link to the bookshelf is a reference already */
function underLink(lines: string[], i: number, skip: boolean[]): void {
  let j = i + 1;
  while (j < lines.length && !lines[j].trim()) j++;
  while (j < lines.length && QUOTE.test(lines[j])) skip[j++] = true;
}
function skipped(lines: string[]): boolean[] {
  const skip = new Array(lines.length).fill(false);
  let fence = false;
  const open: string[] = [];
  lines.forEach((l, i) => {
    if (FENCE.test(l)) fence = !fence;
    skip[i] = FENCE.test(l) || fence || inCard(open, l);
  });
  /* the link as an address alone or as the page's full address before it */
  lines.forEach((l, i) => { if (/\]\([^)\s#]*#(?:bookshelf|page)\//.test(l)) underLink(lines, i, skip); });
  return skip;
}
type Shelved = ShelfIndex["entries"][number];
interface Quoting { lines: string[]; skip: boolean[]; index: ShelfIndex }
const entryOf = (c: Quoting, key: string): Shelved => c.index.entries.find((e) => e.key === key)!;
const open = (c: Quoting, j: number): boolean => j >= 0 && j < c.lines.length && !c.skip[j];
const said = (c: Quoting, j: number): boolean => open(c, j) && !!norm(bare(c.lines[j]));
const spliced = (c: Quoting, j: number): boolean => open(c, j) && SPLICE.test(bare(c.lines[j]));
const carriedLine = (c: Quoting, j: number): boolean => open(c, j) && !SPLICE.test(bare(c.lines[j])) && !!norm(bare(c.lines[j]));
/* a line's letters, or a joined line's place on the side given: 0 before its ellipsis, 1 after */
const piece = (c: Quoting, j: number, side: 0 | 1): string => (spliced(c, j) ? places(c.lines[j])[side] : norm(bare(c.lines[j])));
const reversed = (t: string): string => [...t].reverse().join("");
const numberedOf = (s: Shelved, first: number, last: number) => s.units.slice(first, last + 1).filter((x) => x.line > 0);
/* a speaker's name opening a line, one to three capitalised words before a
   colon or a wide space: never a line of verse with a colon in it */
const NAMED = /^(?:[A-Z][A-Za-z'’.-]*(?: [A-Z][A-Za-z'’.-]*){0,2}:\s+|[A-Z][A-Z .'’-]*[A-Z](?:\s{2,}|\t))/;
const CAPITALS = /^[A-Z][A-Z .'’-]*[.:]?$/;

/* ---- a run found from its line ---- */
interface Placing { c: Quoting; s: Shelved; i: number; u: number; floor: number }
/* a run keeps to one verse block, the most one reference quotes */
const block = (P: Placing, p: number): boolean => p >= 0 && p < P.s.left.length && P.s.units[p].blockPos === P.s.units[P.u].blockPos;
const fits = (P: Placing, j: number, p: number): boolean =>
  j < P.c.lines.length && !P.c.skip[j] && block(P, p) && !!P.s.left[p] && norm(bare(P.c.lines[j])) === P.s.left[p];
const near = (P: Placing, j: number, p: number): boolean =>
  j < P.c.lines.length && !P.c.skip[j] && block(P, p) && alike(norm(bare(P.c.lines[j])), P.s.left[p] ?? "");
const goesOn = (P: Placing, k: number, p: number): boolean =>
  fits(P, k, p) || (k > P.i && carriedLine(P.c, k) && (fits(P, k + 1, p + 1) || near(P, k, p)));
/* a blank line carried where the passage goes on after it */
const blankCarried = (P: Placing, k: number, p: number): boolean => k > P.i && open(P.c, k) && !said(P.c, k) && fits(P, k + 1, p);
const halfEnds = (P: Placing, k: number, p: number): boolean => {
  const n = k > P.i && said(P.c, k) ? piece(P.c, k, 0) : "";
  return n.length >= HALF && block(P, p) && halfOf(n, P.s.left[p], true);
};
interface Span { start: number; end: number; first: number; last: number; letters: number }
/* a line spelled otherwise is carried when the next goes on with the
   passage, or when it is close to the passage's own (pin:
   shelfLines.test › quotedRuns: a run carries through) (pin:
   shelfLines.test › quotedRuns: a run's last line); a blank line is
   carried when the passage goes on after it (pin: shelfLines.test ›
   quotedRuns: a line's closing); a half-line ends a run (pin:
   shelfLines.test › quotedRuns: a run's last line that) */
function forward(P: Placing, w: Span): void {
  let k = P.i, p = P.u;
  for (;;) {
    if (goesOn(P, k, p)) { counted(P, w, k++, p++); continue; }
    if (!blankCarried(P, k, p)) break;
    k++;
  }
  if (halfEnds(P, k, p)) { w.end = k; w.last = p; }
}
/* a line placed by its likeness counts as well as one exact (pin: shelfLines.test › quotedRuns: the lines placed by their likeness) */
function counted(P: Placing, w: Span, k: number, p: number): void {
  if (fits(P, k, p) || near(P, k, p)) w.letters += P.s.left[p].length;
  w.end = k;
  w.last = p;
}
const backable = (P: Placing, j: number): boolean => (j > P.floor && carriedLine(P.c, j)) || (j >= P.floor && spliced(P.c, j));
/* the lines before may be the passage's own spelled otherwise, and
   the first of them the end of the passage's line before, a
   half-line (pin: shelfLines.test › quotedRuns: a run's first line)
   (pin: shelfLines.test › quotedRuns: opening lines); a line joining
   two places with an ellipsis may close one run and open the next
   (pin: shelfLines.test › quotedRuns, referRuns: a line joining) */
function backward(P: Placing, w: Span): void {
  while (block(P, w.first - 1) && backable(P, w.start - 1)) {
    const o = piece(P.c, w.start - 1, 1), l = P.s.left[w.first - 1];
    if (alike(o, l) && !spliced(P.c, w.start - 1)) { w.letters += l.length; w.start--; w.first--; continue; }
    if (o.length >= HALF && halfOf(o, l, false)) { w.start--; w.first--; }
    return;
  }
}
const cut = (q: string, line: string, start: boolean): number | undefined => { const k = halfAt(q, line, start); return k && k < line.length - SPELT ? k : undefined; };
function runFrom(P: Placing): Run | null {
  const w: Span = { start: P.i, end: P.i, first: P.u, last: P.u, letters: 0 };
  forward(P, w);
  backward(P, w);
  /* a first or last line short of its line's letters, however it was
     carried, is a half-line, quoted from where it starts or to where it
     ends (pin: shelfLines.test › quotedRuns: a run opening or closing) */
  const head = cut(piece(P.c, w.start, 1), P.s.left[w.first], false), tail = cut(piece(P.c, w.end, 0), P.s.left[w.last], true);
  /* a speaker's row is numbered 0: a run opening on one is numbered
     from the speech's first line (pin: shelfLines.test › quotedRuns: a
     quotation opening on a speaker's name) */
  const numbered = numberedOf(P.s, w.first, w.last);
  if (w.letters < ENOUGH || !numbered.length) return null;
  return { start: w.start, end: w.end, key: P.s.key, first: w.first, last: w.last, from: numbered[0].line, to: numbered[numbered.length - 1].line, ...(head && { head }), ...(tail && { tail }) };
}
const longer = (r: Run | null, best: Run | null): r is Run => !!r && (!best || r.end - r.start > best.end - best.start);
function bestRun(c: Quoting, i: number, n: string, floor: number): Run | null {
  let best: Run | null = null;
  for (const { e, i: u } of c.index.at.get(n) ?? []) {
    const r = runFrom({ c, s: c.index.entries[e], i, u, floor });
    if (longer(r, best)) best = r;
  }
  return best;
}

/* ---- a run followed letter by letter ---- */
interface Following { c: Quoting; r: Run; s: Shelved; block: number; quoted: boolean; floor: number }
const inRange = (f: Following, k: number): boolean => k > f.floor && k < f.c.lines.length && !f.c.skip[k];
const ours = (f: Following, k: number): boolean => inRange(f, k) && !!norm(bare(f.c.lines[k])) && QUOTE.test(f.c.lines[k]) === f.quoted;
/* blank lines between speeches, and a stage direction of one's own, passed over where a line of the quotation follows */
const ownDirection = (f: Following, l: string): boolean => /^\[[^\]]*\]$/.test(bare(l)) && QUOTE.test(l) === f.quoted;
const gapLine = (f: Following, k: number): boolean => {
  const l = f.c.lines[k];
  return inRange(f, k) && (!norm(bare(l)) || ownDirection(f, l)) && (!f.quoted || !l.trim() || QUOTE.test(l));
};
const theirs = (f: Following, x: number): boolean => x >= 0 && x < f.s.units.length && f.s.units[x].blockPos === f.block;
interface Stream { stream: string; row: number[]; into: number[]; wordEnd: boolean[] }
const words = (t: string): string[] => t.split(/[\s—–]+/).map(norm).filter(Boolean);
/* where the row's words end, counted from the side the walk comes from */
function wordEnds(f: Following, x: number, d: 1 | -1): Set<number> {
  const ws = words(f.s.units[x].node.textContent), ends = new Set<number>();
  (d > 0 ? ws : [...ws].reverse()).reduce((n, w) => { ends.add(n + w.length); return n + w.length; }, 0);
  return ends;
}
/* the passage's letters as they come, each with its row and the letters
   of that row up to it */
function streamOf(f: Following, d: 1 | -1, x0: number): Stream {
  const st: Stream = { stream: "", row: [], into: [], wordEnd: [] };
  for (let x = x0; theirs(f, x); x += d) {
    const t = d > 0 ? f.s.left[x] : reversed(f.s.left[x]);
    const ends = wordEnds(f, x, d);
    [...t].forEach((ch, q) => { st.stream += ch; st.row.push(x); st.into.push(q + 1); st.wordEnd.push(ends.has(q + 1)); });
  }
  return st;
}
interface Walking { f: Following; d: 1 | -1; k0: number; st: Stream; p: number }
const tolerance = (c: string, first: boolean): number => {
  if (first) return Math.max(2, Math.floor(c.length / 5));
  return c.length >= 8 ? Math.max(2, Math.floor(c.length / 12)) : 0;
};
function nearest(stream: string, p: number, c: string, tol: number): number {
  let best = -1, least = tol + 1;
  for (let m = Math.max(1, c.length - tol); m <= c.length + tol && p + m <= stream.length; m++) {
    const dd = distance(c, stream.slice(p, p + m));
    if (dd < least) { least = dd; best = m; }
  }
  return best;
}
/* the quotation's lines met against the passage's letters one by one,
   letters alone, so a word split or joined otherwise (do ’t, do’t) does
   not part them, a few letters spelled otherwise allowed */
function take(w: Walking, k: number, c: string, exact = false): number {
  if (!c) return -1;
  const t = w.d < 0 ? reversed(c) : c;
  if (w.st.stream.startsWith(t, w.p)) return t.length;
  return exact ? -1 : nearest(w.st.stream, w.p, t, tolerance(t, k === w.k0));
}
/* a name alone on its line, where the passage has a speaker's row, is that row, however named */
const speakerRow = (w: Walking, t: string): boolean =>
  CAPITALS.test(t) && w.p < w.st.stream.length && w.f.s.units[w.st.row[w.p]].kind === "speaker" && w.st.into[w.p] === 1;
/* the letters line k takes from the passage, or -1 */
function advance(w: Walking, k: number): number {
  const t = bare(w.f.c.lines[k]), name = t.match(NAMED)?.[0] ?? "";
  /* a speaker's name before a line's words: met where the passage has the speaker's row, else passed over */
  if (speakerRow(w, t)) return w.f.s.left[w.st.row[w.p]].length;
  let m = name ? take(w, k, norm(t), true) : -1;
  if (m < 0) m = take(w, k, norm(t.slice(name.length)));
  /* a line ends where a word of the passage ends: evit is no line of evitata */
  return m < 0 || !w.st.wordEnd[w.p + m - 1] ? -1 : m;
}
/* line k, or the line of the quotation past the gap at k; null where the gap leads nowhere */
function pastGap(f: Following, k: number, d: 1 | -1): number | null {
  if (!gapLine(f, k)) return k;
  let g = k;
  while (gapLine(f, g)) g += d;
  return ours(f, g) ? g : null;
}
const outside = (r: Run, k: number): boolean => k > r.end || k < r.start;
function walk(f: Following, d: 1 | -1, k0: number, x0: number): { k: number; x: number; n: number } | null {
  const w: Walking = { f, d, k0, st: streamOf(f, d, x0), p: 0 };
  let last: { k: number; p: number } | null = null;
  for (let k = k0; k === k0 || outside(f.r, k); k += d) {
    const at = pastGap(f, k, d);
    if (at === null || !ours(f, at)) break;
    k = at;
    const m = advance(w, k);
    if (m < 0) break;
    w.p += m;
    last = { k, p: w.p };
  }
  return last ? { k: last.k, x: w.st.row[last.p - 1], n: w.st.into[last.p - 1] } : null;
}
type Reached = { k: number; x: number; n: number };
const furtherOn = (r: Run, e: Reached): boolean => e.k > r.end || e.x > r.last || (r.tail !== undefined && e.n > r.tail && e.x === r.last);
const furtherBack = (r: Run, b: Reached): boolean => b.k < r.start || b.x < r.first || (r.head !== undefined && b.n > r.head && b.x === r.first);
function followOn(f: Following, out: Run): void {
  const { r, s } = f;
  const e = walk(f, 1, r.end, r.last);
  if (!e || !furtherOn(r, e)) return;
  out.end = e.k; out.last = e.x;
  if (e.n < s.left[e.x].length - SPELT) out.tail = e.n; else delete out.tail;
}
function followBack(f: Following, out: Run): void {
  const { r, s } = f;
  const b = walk(f, -1, r.start, r.first);
  if (!b || !furtherBack(r, b)) return;
  out.start = b.k; out.first = b.x;
  if (b.n < s.left[b.x].length - SPELT) out.head = b.n; else delete out.head;
}
/* A RUN FOLLOWED LETTER BY LETTER past either end, where the quotation is
   broken into lines otherwise than the passage: on through whole lines of
   the quotation whose letters are the passage's, a few spelled otherwise
   (pin: shelfLines.test › quotedRuns: a quotation broken into lines
   otherwise) (pin: shelfLines.test › quotedRuns: a run's last line split) */
function follow(c: Quoting, r: Run, floor: number): Run {
  const s = entryOf(c, r.key);
  const f: Following = { c, r, s, block: s.units[r.first].blockPos, quoted: QUOTE.test(c.lines[r.start]), floor };
  const out = { ...r };
  const single = r.start === r.end;
  if (!(single && r.head)) followOn(f, out);
  if (!(single && r.tail)) followBack(f, out);
  const numbered = numberedOf(s, out.first, out.last);
  return { ...out, from: numbered[0].line, to: numbered[numbered.length - 1].line };
}

/* ---- runs of one passage joined ---- */
interface Joining { c: Quoting; a: Run; b: Run; s: Shelved; said: Set<number>; quoted: boolean }
/* one reference quotes one verse block, or stanzas one after another (pin:
   shelfLines.test › quotedRuns: stanzas quoted one after another) */
function oneBlock(s: Shelved, a: Run, b: Run): boolean {
  const stanza = (x: number): boolean => s.doc.nodeAt(s.units[x].blockPos)?.attrs.stanza != null;
  return s.units[a.last].blockPos === s.units[b.first].blockPos || (b.first === a.last + 1 && stanza(a.last) && stanza(b.first));
}
const ordered = (c: Quoting, a: Run, b: Run): boolean =>
  a.key === b.key && b.start > a.end && b.first >= a.last && b.last > a.last && QUOTE.test(c.lines[a.start]) === QUOTE.test(c.lines[b.start]);
/* outside the quotation, in a quoted run */
const unquoted = (j: Joining, l: string): boolean => j.quoted && !!l.trim() && !QUOTE.test(l);
const rowHolds = (n: string, row: string): boolean => (n.length >= HALF && row.includes(n)) || alike(n, row);
/* a direction may be set a line early or late: any row of the two runs or between */
function rowsSaid(j: Joining, n: string): boolean {
  let found = false;
  for (let x = j.a.first; x <= j.b.last; x++) if (rowHolds(n, j.s.left[x])) { j.said.add(x); found = true; }
  return found;
}
/* the rows a line holds one after another from row x, end to end, a direction between them passed over */
function heldFrom(j: Joining, n: string, x: number): number[] {
  let at = 0;
  const held: number[] = [];
  for (let y = x; y <= j.b.last && at < n.length; y++) {
    if (j.s.left[y] && n.startsWith(j.s.left[y], at)) { at += j.s.left[y].length; held.push(y); }
    else if (j.s.units[y].line > 0) break;
  }
  return at === n.length ? held : [];
}
function rowsRunTogether(j: Joining, n: string): boolean {
  for (let x = j.a.first; x <= j.b.last; x++) {
    const held = heldFrom(j, n, x);
    if (held.length > 1) { held.forEach((h) => j.said.add(h)); return true; }
  }
  return false;
}
function between(j: Joining, l: string): boolean {
  if (unquoted(j, l)) return false;
  const t = bare(l);
  if (!norm(t)) return !/…|\.\.\./.test(t);
  if (CAPITALS.test(t)) return true;
  const n = norm(t.replace(/^[A-Z][\w .'’-]*?(?:\t|:\s)/i, ""));
  return rowsSaid(j, n) || rowsRunTogether(j, n);
}
/* one's own wording of the lines left out, line for line (pin:
   shelfLines.test › quotedRuns: lines of one's own wording) */
function reworded(j: Joining, gap: string[], omitted: number[]): boolean {
  const own = gap.filter((l) => norm(bare(l)) && !CAPITALS.test(bare(l)));
  return own.length === omitted.length && own.length > 0 && own.every((l, k) => alike(norm(bare(l)), j.s.left[omitted[k]], REWORDED))
    && gap.every((l) => !unquoted(j, l));
}
function joins(c: Quoting, a: Run, b: Run): boolean {
  if (!ordered(c, a, b)) return false;
  const s = entryOf(c, a.key);
  if (!oneBlock(s, a, b)) return false;
  const j: Joining = { c, a, b, s, said: new Set<number>(), quoted: QUOTE.test(c.lines[a.start]) };
  const gap = c.lines.slice(a.end + 1, b.start);
  const omitted: number[] = [];
  for (let x = a.last + 1; x < b.first; x++) if (s.units[x].line > 0) omitted.push(x);
  return reworded(j, gap, omitted) || (gap.every((l) => between(j, l)) && omitted.every((x) => j.said.has(x)));
}
/* runs of one passage in one quotation are one run, when nothing of the
   passage is left out between them and nothing else stands there but
   blank lines, speakers' names and the passage's own rows, or when the
   lines between are one's own wording of the lines left out; other words
   of one's own, an ellipsis, the quotation's end, a line left out or a
   second verse block keep them apart (pin: shelfLines.test › quotedRuns:
   runs of one scene) (pin: shelfLines.test › quotedRuns: runs with words) */
function joinRuns(c: Quoting, runs: Run[]): void {
  for (let at = runs.length - 1; at > 0; at--) {
    const a = runs[at - 1], b = runs[at];
    if (!joins(c, a, b)) continue;
    runs.splice(at - 1, 2, { ...a, end: b.end, last: b.last, to: b.to, tail: b.tail, parts: (a.parts ?? 1) + (b.parts ?? 1) });
    if (b.tail === undefined) delete runs[at - 1].tail;
  }
}

/* ---- a speaker's name opening the quotation ---- */
/* the speaker's row the run's block has before it, or -1 */
function speakerAbove(s: Shelved, r: Run): number {
  const inBlock = (x: number): boolean => x >= 0 && s.units[x].blockPos === s.units[r.first].blockPos;
  let x = r.first - 1;
  while (inBlock(x) && s.units[x].kind !== "speaker") x--;
  return inBlock(x) ? x : -1;
}
/* the first line above the run, blank lines and bare quotation marks passed over */
function lineAbove(c: Quoting, r: Run, floor: number): number {
  let up = r.start - 1;
  while (up > floor && !c.lines[up].trim().replace(/^[>\s]*$/, "")) up--;
  return up;
}
/* a line above is a name in capitals, or the speaker's own name in any case: never a line of one's own */
function nameGiven(own: string | undefined, above: string, row: string): string {
  if (own) return own.replace(/:\s*$/, "");
  return above.length <= 40 && (CAPITALS.test(above) || norm(above) === row) ? above : "";
}
const namesRow = (row: string, n: string): boolean => row === n || row.includes(n) || alike(n, row);
interface Named { n: string; own: string | undefined; up: number }
function nameOf(c: Quoting, floor: number, r: Run, row: string): Named {
  const up = lineAbove(c, r, floor);
  const own = bare(c.lines[r.start]).match(NAMED)?.[0], above = up > floor ? bare(c.lines[up]) : "";
  return { n: norm(nameGiven(own, above, row)), own, up };
}
/* a name on its own line inside the quotation is the speaker's, however the passage names them: FESTE for Clown */
const ownLineName = (c: Quoting, r: Run, nm: Named): boolean => !nm.own && !!nm.n && QUOTE.test(c.lines[nm.up]) === QUOTE.test(c.lines[r.start]);
const speaks = (c: Quoting, r: Run, nm: Named, row: string): boolean => !!nm.n && (ownLineName(c, r, nm) || namesRow(row, nm.n));
function speakerOf(c: Quoting, runs: Run[], r: Run, at: number): void {
  const s = entryOf(c, r.key);
  const x = s.units[r.first].kind === "speaker" ? -1 : speakerAbove(s, r);
  if (x < 0) return;
  const nm = nameOf(c, at ? runs[at - 1].end : -1, r, s.left[x]);
  const opensSpeech = x === r.first - 1 && !r.head;
  /* a quotation opening a speech takes its speaker's row, named or not */
  if (!nm.n && opensSpeech) { r.first = x; return; }
  if (speaks(c, r, nm, s.left[x])) named(r, x, nm, opensSpeech);
}
function named(r: Run, x: number, nm: Named, opensSpeech: boolean): void {
  if (!nm.own) r.start = nm.up;
  if (opensSpeech) r.first = x;
  else r.speaker = x;
}

/* ---- an attribution, and a joined line's other place ---- */
const attribution = (t: string, works: string[]): boolean =>
  t.length <= 60 && works.some((w) => norm(t).includes(w)) && /^\\?[-–—―]|\d|\b[IVXL]+\s*[.,]\s*[ivxlIVXL]+\b/.test(t);
const passedOver = (c: Quoting, k: number): boolean => !norm(bare(c.lines[k])) && (QUOTE.test(c.lines[k]) || !c.lines[k].trim());
function attributed(c: Quoting, runs: Run[], r: Run, at: number): void {
  const next = at + 1 < runs.length ? runs[at + 1].start : c.lines.length, works = r.key.split("/").slice(2).filter((w) => /\p{L}/u.test(w)).map(norm);
  let k = r.end + 1;
  while (k < next && passedOver(c, k)) k++;
  if (k >= next || !works.length) return;
  if (QUOTE.test(c.lines[k]) === QUOTE.test(c.lines[r.start]) && attribution(bare(c.lines[k]), works)) r.end = k;
}
const quoteOf = (l: string): string => l.match(/^\s*(?:>\s*)*/)![0];
function placeAfter(l: string): string {
  const q = quoteOf(l), rest = l.slice(q.length);
  return q + rest.slice(rest.search(/…|\.\.\./));
}
function placeBefore(l: string): string {
  const q = quoteOf(l), rest = l.slice(q.length), m = [...rest.matchAll(/…|\.\.\./g)].pop()!;
  return q + rest.slice(0, m.index + m[0].length).trimEnd();
}
/* a joined line shared by two runs gives way to both; its other place,
   where no run takes it, is kept as written (pin: shelfLines.test ›
   quotedRuns, referRuns: a joined line's place) */
function withPlaces(c: Quoting, runs: Run[], r: Run, at: number): Run {
  const joined = (j: number): boolean => SPLICE.test(bare(c.lines[j]));
  const out = { ...r };
  if (joined(r.end) && runs[at + 1]?.start !== r.end) out.after = placeAfter(c.lines[r.end]);
  if (joined(r.start) && runs[at - 1]?.end !== r.start) out.before = placeBefore(c.lines[r.start]);
  return out;
}

export function quotedRuns(md: string, index: ShelfIndex): Run[] {
  const lines = md.split("\n"), runs: Run[] = [];
  const c: Quoting = { lines, skip: skipped(lines), index };
  for (let i = 0; i < lines.length; i++) {
    const floor = runs.length ? runs[runs.length - 1].end : -1;
    const n = c.skip[i] ? "" : norm(bare(lines[i]));
    const best = n.length < 12 ? null : bestRun(c, i, n, floor);
    if (best) { runs.push(follow(c, best, floor)); i = runs[runs.length - 1].end; }
  }
  joinRuns(c, runs);
  /* a speaker's name opening the quotation, on its own line or before a
     colon, names whoever speaks where the run starts: the speaker's row
     goes into the reference, heading it where the run starts inside the
     speech; a quotation opening a speech takes its speaker's row unnamed
     (pin: shelfLines.test › quotedRuns, referenceOf: a speaker's name) */
  runs.forEach((r, at) => speakerOf(c, runs, r, at));
  /* an attribution closing the quotation, short, naming the work, from a dash
     or with a number, is the link's own source line and goes with it (pin:
     shelfLines.test › quotedRuns: an attribution closing) */
  runs.forEach((r, at) => attributed(c, runs, r, at));
  return runs.map((r, at) => withPlaces(c, runs, r, at));
}

/* A RUN CARRIED OVER ITS QUOTATION: the quoted lines beside it, up to a
   blank line, each its block's next line back or on, a few lines left out
   allowed, spelled otherwise or cut short by an elision; a line that is no
   line of the block stops it. A quotation part referred and part left
   bare beside its reference was read as two (pin: shelfLines.test ›
   carried) */
const CARRY = 12;
interface Carrying { lines: string[]; s: Shelved; block: number }
/* the very next line in another edition's words, or the line with one's own note after it */
const placedAs = (n: string, row: string, seen: number): boolean =>
  alike(n, row, seen ? ALIKE : REWORDED) || (n.length >= HALF * 2 && row.includes(n)) || (row.length >= HALF * 2 && n.startsWith(row));
const inBlockAt = (cr: Carrying, x: number): boolean => x >= 0 && x < cr.s.units.length && cr.s.units[x].blockPos === cr.block;
function carriedTo(cr: Carrying, k: number, from: number, d: 1 | -1): number {
  const n = norm(bare(cr.lines[k]).replace(/…|\.\.\./g, ""));
  if (n.length < HALF) return -1;
  for (let x = from, seen = 0; inBlockAt(cr, x) && seen < CARRY; x += d, seen++) {
    if (cr.s.units[x].line > 0 && placedAs(n, cr.s.left[x], seen)) return x;
  }
  return -1;
}
/* the run's ends carried over the quoted lines beside it, back (d -1) or on (d 1) */
function carriedEnds(cr: Carrying, r: Run, taken: (k: number) => boolean): Run {
  const quotedAt = (k: number): boolean => k >= 0 && k < cr.lines.length && QUOTE.test(cr.lines[k]) && !!norm(bare(cr.lines[k])) && !taken(k);
  const to = (k: number, from: number, d: 1 | -1): number => (quotedAt(k) ? carriedTo(cr, k, from, d) : -1);
  let { start, end, first, last } = r;
  for (let y = to(start - 1, first - 1, -1); y >= 0; y = to(start - 1, first - 1, -1)) { start--; first = y; }
  for (let y = to(end + 1, last + 1, 1); y >= 0; y = to(end + 1, last + 1, 1)) { end++; last = y; }
  return { ...r, start, end, first, last };
}
export function carried(md: string, index: ShelfIndex, runs: Run[]): Run[] {
  const lines = md.split("\n");
  return runs.map((r) => {
    if (!QUOTE.test(lines[r.start])) return r;
    const s = index.entries.find((e) => e.key === r.key)!;
    const c = carriedEnds({ lines, s, block: s.units[r.first].blockPos }, r, (k) => runs.some((x) => x !== r && k >= x.start && k <= x.end));
    if (c.start === r.start && c.end === r.end) return r;
    const out: Run = { ...c, from: s.units[c.first].line, to: s.units[c.last].line };
    if (c.start !== r.start) delete out.head;
    if (c.end !== r.end) delete out.tail;
    return out;
  });
}
/* a line in English: a translation beside a line in another tongue */
const ENGLISH = new Set("the and of to is are was were you your who which when that not will if it his her my me we our they their be shall from with for by this these all as".split(" "));
const english = (l: string): boolean => bare(l).toLowerCase().split(/[^\p{L}’']+/u).some((w) => ENGLISH.has(w));
const depth = (l: string): number => (l.match(/^\s*((?:>\s?)*)/)![1].match(/>/g) ?? []).length;
interface Within { lines: string[]; s: Shelved; r: Run; d: number; taken: (k: number) => boolean; start: number; end: number; first: number; last: number; trans: number; pieced: boolean }
const insideQ = (w: Within, k: number): boolean => k >= 0 && k < w.lines.length && w.d > 0 && depth(w.lines[k]) === w.d && !!bare(w.lines[k]) && !w.taken(k);
const pieceAt = (w: Within, k: number): string => norm(bare(w.lines[k]).replace(/…|\.\.\./g, ""));
/* the end of the book's line before, or its opening with the rest left out; the start of the line after */
const openingCut = (w: Within, k: number, p: string): boolean => /…|\.\.\.\s*$/.test(w.lines[k]) && alike(p, w.s.left[w.first - 1].slice(0, p.length), REWORDED);
const lineBefore = (w: Within, k: number): boolean => {
  const p = pieceAt(w, k);
  return w.first > 0 && p.length >= 4 && (w.s.left[w.first - 1].endsWith(p) || openingCut(w, k, p));
};
const lineAfter = (w: Within, k: number): boolean => w.last + 1 < w.s.units.length && pieceAt(w, k).length >= HALF && w.s.left[w.last + 1].startsWith(pieceAt(w, k));
/* a source line heading the quotation is the reference's to replace; one inside a card joined to more of it a blank line above is the card's */
const cardJoined = (w: Within, k: number): boolean => k > 0 && depth(w.lines[k - 1]) === w.d && !bare(w.lines[k - 1]);
const headingAt = (w: Within, k: number): boolean => !insideQ(w, k - 1) && /:\s*$/.test(bare(w.lines[k])) && bare(w.lines[k]).length <= SOURCE_LINE && !cardJoined(w, k);
/* the quotation's lines before the run taken, translations and a piece of the book's line before; false where another writer's stands there */
function takenBefore(w: Within): boolean {
  for (let k = w.start - 1; insideQ(w, k); k--) {
    if (english(w.lines[k])) { w.trans++; w.start = k; }
    else if (k === w.start - 1 && lineBefore(w, k)) { w.start = k; w.first--; w.pieced = true; }
    else return headingAt(w, k);
  }
  return true;
}
function takenAfter(w: Within): boolean {
  for (let k = w.end + 1; insideQ(w, k); k++) {
    if (english(w.lines[k])) { w.trans++; w.end = k; }
    else if (k === w.end + 1 && lineAfter(w, k)) { w.end = k; w.last++; w.pieced = true; }
    else return false;
  }
  return true;
}
const blankBefore = (w: Within, k: number): boolean => k < w.lines.length && !bare(w.lines[k]) && insideQ(w, k + 1);
/* the paragraph a blank line after k: its lines, or none */
function paragraphAfter(w: Within, k: number): number[] {
  if (!blankBefore(w, k)) return [];
  let e = k + 1;
  while (insideQ(w, e + 1)) e++;
  return Array.from({ length: e - k }, (_, i) => k + 1 + i);
}
/* a paragraph of translation, as long as the lines quoted or shorter, after a piece taken alone */
const translatesPieced = (w: Within, para: number[]): boolean =>
  w.pieced && !w.trans && para.every((i) => english(w.lines[i])) && para.length <= w.end - w.start + 1;
const takesParagraph = (w: Within, next: boolean, para: number[]): boolean => (next && (w.trans > 0 || w.pieced)) || translatesPieced(w, para);
/* the paragraph after, where the quotation took a piece of a line or a translation: a translation of the paragraph's lines, or the book's next line and its translation */
function paragraphsAfter(w: Within): void {
  for (let para = paragraphAfter(w, w.end + 1); para.length; para = paragraphAfter(w, w.end + 1)) {
    const next = lineAfter(w, para[0]) && para.slice(1).every((i) => english(w.lines[i]));
    if (!takesParagraph(w, next, para)) return;
    if (next) w.last++; else w.trans++;
    w.end = para[para.length - 1];
  }
}
function widened(w: Within): Run {
  const { r, s, start, end, first, last } = w;
  if (start === r.start && end === r.end) return r;
  return { ...r, start, end, first, last, from: s.units[first].line, to: s.units[last].line, ...(first !== r.first && { head: undefined }), ...(last !== r.last && { tail: undefined }) };
}
/* A RUN OF A BOOK IN ANOTHER TONGUE INSIDE A LONGER QUOTATION: the
   quotation's other lines, in its paragraph or the one after, taken with it
   where each is a translation, or the end of the book's line before or the
   start of the one after; where one is another writer's, the run is left and
   the quotation stands whole (pin: shelfLines.test › withinQuotation) */
export function withinQuotation(md: string, index: ShelfIndex, runs: Run[]): { runs: Run[]; left: Run[] } {
  const lines = md.split("\n"), out: Run[] = [], left: Run[] = [];
  for (const r of runs) {
    const d = depth(lines[r.start]);
    if (!d || lines.slice(r.start, r.end + 1).some(english)) { out.push(r); continue; }
    const s = index.entries.find((e) => e.key === r.key)!;
    const taken = (k: number): boolean => runs.some((x) => x !== r && k >= x.start && k <= x.end);
    const w: Within = { lines, s, r, d, taken, start: r.start, end: r.end, first: r.first, last: r.last, trans: 0, pieced: false };
    if (!takenBefore(w) || !takenAfter(w)) { left.push(r); continue; }
    paragraphsAfter(w);
    out.push(widened(w));
  }
  return { runs: out, left };
}
const inked = (passage: string): string => norm(passage.split("\n").filter((l) => !/^:::/.test(bare(l))).join(" "));
/* A BOOK'S PASSAGE QUOTED AS TEXT, in a prose book or a translation beside
   verse: each quoted paragraph placed, and joined to the next a blank line
   on while the two are one passage with nothing of the book left out
   between them (pin: shelfLines.test › quotedPassages: quoted paragraphs
   join one by one); lines a verse run took are its */
export function quotedPassages(md: string, index: ShelfIndex, prefixes: string[], taken: Run[]): { run: Run; ref: Referred }[] {
  const lines = md.split("\n"), skip = skipped(lines), found: { run: Run; ref: Referred }[] = [];
  const free = (i: number): boolean => QUOTE.test(lines[i]) && !skip[i] && !/^:::/.test(bare(lines[i])) && !taken.some((r) => i >= r.start && i <= r.end);
  const place = (from: number, to: number): Referred | null => {
    for (const prefix of prefixes) { const ref = quotedProse(index, prefix + "/", lines.slice(from, to + 1)); if (ref) return ref; }
    return null;
  };
  const paragraphs: { from: number; to: number; ref: Referred | null }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!free(i)) continue;
    let j = i;
    while (j + 1 < lines.length && free(j + 1)) j++;
    paragraphs.push({ from: i, to: j, ref: place(i, j) });
    i = j;
  }
  let open: { run: Run; ref: Referred; letters: number } | null = null;
  for (let k = 0; k < paragraphs.length; k++) {
    const p = paragraphs[k];
    if (!p.ref) { open = null; continue; }
    if (open && p.from === open.run.end + 2 && !lines[open.run.end + 1].trim() && p.ref.key === open.ref.key) {
      const joined = place(open.run.start, p.to);
      const letters = open.letters + inked(p.ref.passage).length;
      if (joined && joined.key === open.ref.key && inked(joined.passage).length === letters) {
        Object.assign(open, { ref: joined, letters });
        open.run.end = p.to;
        found[found.length - 1].ref = joined;
        continue;
      }
    }
    open = { run: { start: p.from, end: p.to, key: p.ref.key, first: 0, last: 0, from: 0, to: 0, prose: true }, ref: p.ref, letters: inked(p.ref.passage).length };
    found.push({ run: open.run, ref: open.ref });
  }
  /* too short to be a quotation, in prose as in verse (pin: shelfLines.test › quotedPassages: a quotation as short as a verse run too common to count) */
  return found.filter(({ run }) => norm(lines.slice(run.start, run.end + 1).map(bare).join("")).length >= ENOUGH);
}
/* a quotation and its translation one after another, a blank line apart,
   are one reference, its passage the one that holds the other's: a
   translation of part of the lines quoted, or the lines of part of it;
   and two such, one after another in the passage, one across them (pin:
   shelfLines.test › sameQuoted) */
const versesOfOneBlock = (s: Shelved, a: Run, b: Run): boolean =>
  !a.prose && !b.prose && b.first > a.last && s.units[a.last].blockPos === s.units[b.first].blockPos;
const omits = (s: Shelved, a: Run, b: Run): boolean => s.units.slice(a.last + 1, b.first).some((u) => u.line > 0);
const runsOn = (s: Shelved | undefined, a: Run, b: Run): boolean => !!s && versesOfOneBlock(s, a, b) && !omits(s, a, b);
/* two verse runs of one block, no numbered line left out between them, read as one */
function onward(index: ShelfIndex | undefined, a: Run, b: Run): Run | null {
  const s = index?.entries.find((e) => e.key === a.key);
  if (!runsOn(s, a, b)) return null;
  return { start: a.start, end: b.end, key: a.key, first: a.first, last: b.last, from: a.from, to: b.to, ...(a.head !== undefined && { head: a.head }), ...(b.tail !== undefined && { tail: b.tail }), parts: (a.parts ?? 1) + (b.parts ?? 1) };
}
type Same = { run: Run; as: Run };
/* the next run after a blank line or none, of the same work */
const follows = (lines: string[], prev: Same | undefined, r: Run): prev is Same =>
  !!prev && prev.run.key === r.key && r.start > prev.run.end && lines.slice(prev.run.end + 1, r.start).every((l) => !l.trim());
/* the reference the two runs make together, or null */
function together(prev: Same, r: Run, passage: (r: Run) => string, index?: ShelfIndex): Run | null {
  const held = inked(passage(prev.as)), mine = inked(passage(r));
  if (held.includes(mine)) return prev.as;
  if (mine.includes(held)) return r;
  return onward(index, prev.as, r);
}
export function sameQuoted(md: string, runs: Run[], passage: (r: Run) => string, index?: ShelfIndex): Same[] {
  const lines = md.split("\n"), out: Same[] = [];
  for (const r of runs) {
    const prev = out[out.length - 1];
    const as = follows(lines, prev, r) ? together(prev, r, passage, index) : null;
    if (as) out[out.length - 1] = { run: { ...prev.run, end: r.end }, as };
    else out.push({ run: r, as: r });
  }
  return out;
}

/* a source line's place: a book's, a canto's, a line's numbers, roman or
   arabic, a metre's or a prose's (1m2, I.pr.5), a list of ranges */
const UNIT = String.raw`(?:\d+|[IVXLC]+|[ivxlc]+)`;
const PLACE = new RegExp(String.raw`(?<![\p{L}\p{Nd}])${UNIT}(?:(?:\s*[.,]?\s*(?:prose|pr\.?|meter|metre|m\.?)\s*|\s*[.,]\s*)${UNIT})*(?:\s*[-–]\s*\d+)?(?:\s*,\s*\d+(?:\.\d+)*(?:\s*[-–]\s*\d+)?)*(?:ff)?(?![\p{L}\p{Nd}])`, "gu");
const LOCATOR = /^(?:book|bk\.?|volume|vol\.?|chapter|ch\.?|canto|line|lines|ll?\.|stanza|st\.?)$/i;
const folded = (s: string): string => norm(s.toLowerCase().replace(/æ/g, "ae").replace(/œ/g, "oe"));
/* an edition's page, no place of the work */
const PAGE = /,?\s*\bpp?\.\s*\d+(?:\s*[-–]\s*\d+)?/g;
/* A SOURCE LINE'S OWN WORDS: the line with the source line proper — its author,
   its work by name, abbreviation or initials, its numbers — made the
   reference's link and the rest kept around it (FQ I.vii.40 (Arthur to
   Una): the link, then (Arthur to Una):); the link alone where nothing with
   a letter is left, and a line naming the work with no numbers its source line
   only so; null where it is no source line. A source line past a short line's
   length is one only where its place goes with the work's name or a book's
   or chapter's word, or is a range ending the line (pin: shelfLines.test ›
   typedAs) */
export function typedAs(typed: string, head: string, key: string): string | null {
  const own = ownWords(typed, head, key, typed.length > SOURCE_LINE);
  /* a page beside the work's name alone: the link alone (Jane Austen, *Pride and Prejudice*, p. 250:) */
  return own === null && /\bpp?\.\s*\d/.test(typed) && ownWords(typed.replace(PAGE, ""), head, key, false) === head ? head : own;
}
interface Naming { typed: string; words: string[]; initials: string[]; inner: string[] }
function namingOf(typed: string, head: string, key: string): Naming {
  const label = head.match(/^\[([^\]]*)\]/)?.[1] ?? "";
  const names = [...key.split("/").slice(1), ...label.split(/,\s+/).slice(0, -1)].map((n) => n.replace(/\*/g, ""));
  const words = names.flatMap((n) => [n, ...n.split(/\s+/).filter((w) => w.length > 3)]).map(folded);
  const initials = names.map((n) => n.split(/\s+/).filter((w) => /^\p{Lu}/u.test(w) && w !== "The").map((w) => w[0]).join("").toLowerCase());
  return { typed, words, initials, inner: names.flatMap((n) => n.split(/\s+/)).map(folded) };
}
const prefixOfName = (N: Naming, w: string): boolean => w.length >= 3 && N.words.some((n) => n.startsWith(w));
const isNamed = (N: Naming, t: string): boolean => {
  const w = folded(t);
  return w.length > 1 && (N.words.includes(w) || N.initials.includes(w) || prefixOfName(N, w));
};
const WORD_END = /(\*[^*]+\*|[\p{L}\p{Nd}’'.-]+)([\s,]*)$/u;
const WHOLE_PLACE = new RegExp(`^${PLACE.source}$`, "u");
interface Spanned { start: number; end: number; named: boolean; located: boolean; first: boolean; locator: boolean; numbered: boolean }
/* a short word inside the name, de in Cyrano de Bergerac, goes with it only between two of its words (pin:
   shelfLines.test › typedAs: a short word inside the work's name) */
function nameAt(N: Naming, before: string, t: RegExpMatchArray): boolean {
  const word = t[1];
  if (isNamed(N, word)) return true;
  const prior = before.slice(0, before.length - t[0].length).match(WORD_END);
  return N.inner.includes(folded(word)) && !!prior && isNamed(N, prior[1]);
}
const goesWith = (sp: Spanned, word: string, name: boolean): boolean =>
  (sp.first && sp.numbered && /^\*/.test(word)) || name || LOCATOR.test(word) || (WHOLE_PLACE.test(word) && sp.locator);
/* the span taken one step back: brackets round it, or the word before it; false where nothing more goes with it */
function stepBack(N: Naming, sp: Spanned): boolean {
  const before = N.typed.slice(0, sp.start);
  const paren = before.match(/\(\s*$/), close = N.typed.slice(sp.end).match(/^\s*\)/);
  if (paren && close) { sp.start -= paren[0].length; sp.end += close[0].length; return true; }
  const t = before.match(WORD_END);
  const name = t ? nameAt(N, before, t) : false;
  if (!t || !goesWith(sp, t[1], name)) return false;
  sp.start -= t[0].length; sp.first = false; sp.locator = LOCATOR.test(t[1]); sp.named ||= name; sp.located ||= sp.locator;
  return true;
}
function span(N: Naming, from: number, to: number, numbered: boolean): Spanned {
  const sp: Spanned = { start: from, end: to, named: false, located: false, first: true, locator: false, numbered };
  while (stepBack(N, sp));
  return sp;
}
/* a place that is a range ending the line */
const rangeEnding = (typed: string, p: Spanned): boolean => !/[^\s,:]/.test(typed.slice(p.end)) && /[-–.]/.test(typed.slice(p.start, p.end));
const placesLong = (typed: string, p: Spanned | undefined): boolean => !!p && (p.named || p.located || rangeEnding(typed, p));
/* a lone number with words of one's own is a note's, not a place (6: The Italian reads:) */
const loneNumber = (typed: string, p: Spanned | undefined, start: number, end: number): boolean =>
  !p || (!p.named && /^\d+$/.test(typed.slice(start, end).replace(/[()\s]/g, "")));
function ownWords(typed: string, head: string, key: string, long: boolean): string | null {
  const N = namingOf(typed, head, key);
  /* the place a name of the work or its author goes with, before the last place (Boethius 3pr3, q.v. *Paradiso* 1.127-35) */
  const spans = [...typed.matchAll(PLACE)].filter((p) => /\d|[.,]/.test(p[0])).map((p) => span(N, p.index, p.index + p[0].length, true));
  const place = spans.filter((p) => p.named).pop() ?? spans.pop();
  if (long && !placesLong(typed, place)) return null;
  const trimmed = typed.replace(/[\s,:]*$/, "").length;
  const { start, end } = place ?? span(N, trimmed, trimmed, false);
  const rest = typed.slice(0, start) + typed.slice(end);
  if (!/\p{L}/u.test(rest)) return place || start < end ? head : null;
  if (loneNumber(typed, place, start, end)) return null;
  return typed.slice(0, start) + head.replace(/:$/, "") + typed.slice(end);
}

interface Referring { lines: string[]; runs: Run[]; at: number; r: Run; outer: string; link: string; work: string }
/* a run quoted inside a quotation keeps the outer one (pin:
   shelfLines.test › referRuns: a run quoted inside) */
const outerOf = (l: string): string => ">".repeat(Math.max(0, (l.match(/^\s*((?:>\s*)*)/)![1].match(/>/g) ?? []).length - 1));
function within(f: Referring, l: string): string {
  if (!f.outer) return l;
  if (!l) return f.outer;
  return l.startsWith(">") ? f.outer + l : f.outer + " " + l;
}
const blankIn = (f: Referring, l: string): boolean => (f.outer ? !/[^\s>]/.test(l) : !l.trim());
/* a link to the bookshelf alone is a reference whose passage is not quoted */
const linked = (l: string): boolean => /^\[[^\]]*\]\([^)\s]*#(?:bookshelf|page)\/[^)]*\):\s*$/.test(bare(l));
/* a source line linked to a copy on this machine's disk is a source line all the same */
const unfiled = (l: string): string => bare(l).replace(/\[([^\]]*)\]\(file:[^)]*\)/g, "$1");
const endsSource = (c: string): boolean => /:\s*$/.test(c) && !/\]\(/.test(c);
function shortSource(f: Referring, l: string): boolean {
  const c = unfiled(l);
  return (endsSource(c) && (c.length <= SOURCE_LINE || (!QUOTE.test(l) && typedAs(c, f.link, f.r.key) !== null))) || linked(l);
}
/* a run that is a fence's whole body takes the fence with it, quoted (pin:
   shelfLines.test › referRuns: a link above a verse fence) */
const fencedWhole = (lines: string[], start: number, end: number): boolean =>
  start > 0 && /^\s*(?:>\s*)*:::\s*(?:verse|stanza)\b/.test(lines[start - 1]) && /^\s*(?:>\s*)*:::\s*$/.test(lines[end + 1] ?? "");
/* a short source line a blank line above the run is its source line as well
   as one just above (pin: shelfLines.test › referRuns: a short source line ending in a colon a blank line above) */
function aboveOf(f: Referring, start: number): number {
  const clear = f.at === 0 || f.runs[f.at - 1].end < start - 2;
  return start > 1 && blankIn(f, f.lines[start - 1]) && shortSource(f, f.lines[start - 2]) && clear ? start - 2 : start - 1;
}
/* a place that is only a book's or scene's number, the link's own: (II,i), [1.1] */
const numberedOnly = (l: string): boolean => /^[\s>….]*[([]?\s*(?:[IVXLC]+|\d+)\s*[,.]\s*(?:[ivxlc]+|\d+)\s*[)\]]?\s*$/i.test(l);
/* a kept place that names the work, or only numbers it, is its source line, which the reference gives (pin:
   shelfLines.test › quotedRuns, referRuns: a joined line's place) */
const kept = (f: Referring, l?: string): l is string => l !== undefined && !(f.work && norm(l).includes(f.work)) && !numberedOnly(l);
/* a source line gives way to the reference in the standard form, words
   of one's own kept round its link (pin: shelfLines.test › typedAs); a
   line with neither numbers nor the work's name is no source line (pin:
   shelfLines.test › referRuns: a source line with numbers) */
/* a long line inside a quotation may be another writer's, its place his own (pin: shelfLines.test › referRuns: a long source line inside a quotation) */
const sourceLine = (f: Referring, typed: string, prev: string): boolean =>
  !!typed && endsSource(typed) && !kept(f, f.r.before) && !(typed.length > SOURCE_LINE && QUOTE.test(prev));
function ownLine(f: Referring, prev: string): string | null {
  if (linked(prev)) return f.link;
  const typed = unfiled(prev);
  return sourceLine(f, typed, prev) ? typedAs(typed, f.link, f.r.key) : null;
}
/* the run's first and last lines, a line shared with the next run left to it and a fence taken whole */
function runLines(f: Referring): [number, number] {
  const { lines, r } = f;
  const start = r.start, end = f.runs[f.at + 1]?.start === r.end ? r.end - 1 : r.end;
  return fencedWhole(lines, start, end) ? [start - 1, end + 1] : [start, end];
}
/* the lines after the reference: a kept place, else a blank line where the text goes on */
function afterLines(f: Referring, end: number): string[] {
  if (kept(f, f.r.after)) return [within(f, ""), f.r.after];
  const next = end + 1 < f.lines.length ? f.lines[end + 1] : "";
  return blankIn(f, next) ? [] : [within(f, "")];
}
/* the reference in place of the run, a kept place before it, a blank line between where none stands */
function inPlace(f: Referring, start: number, text: string): string[] {
  const before = kept(f, f.r.before) ? [f.r.before] : [];
  const gap = !before.length && blankIn(f, start > 0 ? f.lines[start - 1] : "") ? [] : [""];
  return [...before, ...[...gap, ...text.split("\n")].map((l) => within(f, l))];
}
function referRun(f: Referring, text: string): void {
  const [start, end] = runLines(f);
  const above = aboveOf(f, start);
  const own = ownLine(f, above >= 0 ? f.lines[above] : "");
  const after = afterLines(f, end);
  if (own === null) { f.lines.splice(start, end - start + 1, ...inPlace(f, start, text), ...after); return; }
  const [, ...passage] = text.split("\n");
  f.lines.splice(above, end - above + 1, ...[own, ...passage].map((l) => within(f, l)), ...after);
}
export function referRuns(md: string, runs: Run[], mint: (run: Run) => Pick<Referred, "text" | "url" | "passage">): string {
  const lines = md.split("\n");
  for (const [at, r] of [...runs.entries()].reverse()) {
    const m = mint(r);
    const link = m.text.split("\n")[0];
    const work = norm(m.text.match(/^\[[^\]]*?, (.+), [^,\]]+\]/)?.[1] ?? "");
    referRun({ lines, runs, at, r, outer: outerOf(lines[r.start]), link, work }, m.text);
  }
  return lines.join("\n");
}

/* THE WORDS QUOTED AGAINST THE PASSAGE'S, for a reader to see where they
   part: the longest run of words they share, letters and numerals alone,
   and the rest taken out (-) or put in (+). Only words spelled otherwise,
   each change two letters at most, is spelling (pin:
   shelfLines.test › wordDiff) */
export type WordOp = ["=" | "-" | "+", string];
/* a word's letters as written: an accent or ð for þ is a change a reader sees,
   though the passage was found without them (pin: shelfLines.test › wordDiff: an accent) */
const written = (s: string): string => s.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{Nd}]+/gu, "");
interface Diffing { a: string[]; b: string[]; ka: string[]; kb: string[]; lcs: number[][] }
function diffing(yours: string, theirs: string): Diffing {
  const a = yours.split(/[\s—–]+/).filter((w) => written(w)), b = theirs.split(/[\s—–]+/).filter((w) => written(w));
  const ka = a.map(written), kb = b.map(written);
  const lcs = ka.map(() => new Array<number>(kb.length + 1).fill(0));
  lcs.push(new Array<number>(kb.length + 1).fill(0));
  for (let i = ka.length - 1; i >= 0; i--) for (let j = kb.length - 1; j >= 0; j--) lcs[i][j] = ka[i] === kb[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  return { a, b, ka, kb, lcs };
}
function nextOp(D: Diffing, i: number, j: number): WordOp[0] {
  const hasA = i < D.a.length, hasB = j < D.b.length;
  if (hasA && hasB && D.ka[i] === D.kb[j]) return "=";
  if (!hasB || (hasA && D.lcs[i][j + 1] < D.lcs[i + 1][j])) return "-";
  /* a change's words taken out before those put in */
  return hasA && D.lcs[i + 1][j] === D.lcs[i][j + 1] ? "-" : "+";
}
function opsOf(D: Diffing): WordOp[] {
  const ops: WordOp[] = [];
  let i = 0, j = 0;
  while (i < D.a.length || j < D.b.length) {
    const op = nextOp(D, i, j);
    if (op === "=") { ops.push(["=", D.b[j]]); i++; j++; }
    else if (op === "-") ops.push(["-", D.a[i++]]);
    else ops.push(["+", D.b[j++]]);
  }
  return ops;
}
const changeEnd = (ops: WordOp[], k: number): number => { let e = k; while (e < ops.length && ops[e][0] !== "=") e++; return e; };
const lettersOfOps = (ops: WordOp[], o: "-" | "+"): string => ops.filter(([x]) => x === o).map(([, w]) => written(w)).join("");
/* a change whose letters run the same either side is spacing alone: to ’t, to’t */
function spacingAlone(ops: WordOp[]): void {
  for (let k = 0; k < ops.length; k++) {
    if (ops[k][0] === "=") continue;
    const e = changeEnd(ops, k), change = ops.slice(k, e);
    const put = change.filter(([o]) => o === "+");
    if (lettersOfOps(change, "-") !== lettersOfOps(change, "+")) { k = e - 1; continue; }
    ops.splice(k, e - k, ...put.map(([, w]): WordOp => ["=", w]));
    k += put.length - 1;
  }
}
const respelt = (out: string, put: string): boolean => !!out && !!put && distance(out, put) <= 2;
/* each change, its words run together, a letter or two from the passage's */
function spelling(ops: WordOp[]): boolean {
  for (let k = 0; k < ops.length; k++) {
    if (ops[k][0] === "=") continue;
    const e = changeEnd(ops, k), change = ops.slice(k, e);
    if (!respelt(lettersOfOps(change, "-"), lettersOfOps(change, "+"))) return false;
    k = e - 1;
  }
  return true;
}
export function wordDiff(yours: string, theirs: string): { kind: "same" | "spelling" | "wording"; ops: WordOp[] } {
  const ops = opsOf(diffing(yours, theirs));
  spacingAlone(ops);
  if (ops.every(([o]) => o === "=")) return { kind: "same", ops };
  return { kind: spelling(ops) ? "spelling" : "wording", ops };
}
