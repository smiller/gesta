/* the ONE spelling of what counts as a line break */
export const LINE_BREAK_RE = /\r\n?|[\u2028\u2029]/g;
export const LIST_LINE = /^(\s*)([-*]|\d+[.)])\s+(.*)$/;
/* a continuation block's indent is AT LEAST this, never exactly it: a block
   hangs under its item by reaching the item's content column (pin:
   parse.test › a hanging block joins its item, one convention at every
   marker width) */
export const ITEM_BLOCK_INDENT = "    ";
export const FENCE_LINE = /^```/;
export const FENCE_TICKS = /^(`{3,})/;
export const FENCE_CLOSE = /^(`{3,})\s*$/;
export const QUOTE_LINE = /^>\s?/;
export const HEADING_LINE = /^(#{1,6})\s+(.*)$/;
export const CARD_OPEN = /^\s*:::\s*(card-[\w-]+)\s*$/;
export const CARD_CLOSE = /^\s*:::\s*$/;
export const VERSE_OPEN = /^\s*:::\s*verse(?:\s+0*[1-9]\d*(?:\s+0*[1-9]\d*)?)?(?:\s+numbered)?\s*$/;
export const STANZA_OPEN = /^\s*:::\s*stanza\s+0*([1-9]\d*)\s*$/;
export const DUAL_OPEN = /^\s*:::\s*dual-language(?:\s+0*[1-9]\d*)?\s*$/;
export const PROSE_OPEN = /^\s*:::\s*prose(?:\s+0*[1-9]\d*)?(?:\s+numbered)?\s*$/;
/* a block whose every number is drawn, wherever it stands (pin: roundtrip.test
   › a prose block whose numbers are drawn) (pin: roundtrip.test › a verse
   block whose numbers are always drawn) */
export const fenceNumbered = (line: string): boolean => (PROSE_OPEN.test(line) || VERSE_OPEN.test(line)) && /\snumbered\s*$/.test(line);
export const REFERENCE_OPEN = /^\s*:::\s*reference\s*$/;
export const NOTE_OPEN = /^\s*:::\s*note\s*$/;
export const MARGIN_NOTE_OPEN = /^\s*:::\s*margin-note\s*$/;
export const GRID_OPEN = /^\s*:::\s*grid(?:\s+0*[1-9]\d*)?\s*$/;
export const TABLE_ROW = /^\s*\|.*\|\s*$/;
export const TABLE_DIVIDER = /^\s*\|[\s:|-]*-[\s:|-]*\|\s*$/;

/* ---------- page labels ---------- */
/* THE TWO ALPHABETS, spelled once and spliced into everything below: written
   out at each reader, a widened numeral system would reach some and not
   others. EITHER CASE for roman: a book printing XXIV is as ordinary as one
   printing xxiv (pin: pageLabels.test › PAGE_ONE: arabic or roman, either case) */
export const PAGE_ARABIC_SRC = "[0-9]";
export const PAGE_ROMAN_SRC = "[ivxlcdmIVXLCDM]";
/* non-capturing, so a splice that is not itself parenthesized cannot
   silently mean ^arabic OR roman$ */
export const PAGE_NUM_SRC = `(?:${PAGE_ARABIC_SRC}+|${PAGE_ROMAN_SRC}+)`;
/* ⟨8⟩ — U+27E8/9, MEASURED over the corpus and not chosen: `<8>` and `<<8>>`
   were in use as shorthand, `« »` as quotation marks, and ⟨ ⟩ appeared
   nowhere. .replace ONLY: /g under .test() carries lastIndex (pin:
   pageLabels.test › pageToken and PAGE_TOKEN agree on the brackets) */
export const PAGE_TOKEN = new RegExp(`⟨(${PAGE_NUM_SRC})⟩`, "g");
export const PAGE_ONE = new RegExp(`^${PAGE_NUM_SRC}$`);
export const PAGE_ARABIC = new RegExp(`^${PAGE_ARABIC_SRC}+$`);
export function pageToken(label: string): string {
  return `⟨${label}⟩`;
}

/* ---------- a row's declared kind ---------- */
/* THE ROW THAT SAYS WHAT IT IS: "italic, but a line" — Pippa's songs and
   Fra Lippo Lippi's `*Flower o' the broom,*` are italic rows that editions
   number. MEASURED over the mirror: italics cannot be narrowed to bracketed
   rows (Shakespeare's 5,627 directions are bare italics, `*Exit*`). PER
   ROW, not per block: Pippa Passes interleaves songs with directions
   through 198 italic rows, so a block flag would split the block at every
   song. IN THE TEXT, not a side table, so a backup carries it. MEASURED: no
   `⟨word⟩` of any kind exists in the corpus, and `line` is not a page label
   (n, e are not roman). The token names what the row IS, so a second value
   follows the same grammar (pin: parse.test › a ⟨line⟩ token at a row's
   head is the row's declared kind, not its text) */
export const ROW_LINE_TOKEN = "⟨line⟩";
/* the row that is the rest of the verse line above it: a line split
   between speakers, Samson's "Relate by whom." / "By Samson." / "That
   still lessens", is one line (pin: numbering.test › a ⟨…⟩ row is the rest
   of the verse line above it) */
export const ROW_CONT_TOKEN = "⟨…⟩";
/* a line the edition leaves out but numbers: the row holds nothing and
   takes its number, so the lines after it keep the edition's (pin:
   parse.test › a ⟨skipped line number⟩ row) */
export const ROW_SKIP_TOKEN = "⟨skipped line number⟩";
export const ROW_KIND_AT = /^⟨(line|…)⟩\s*/;
/* a line an edition letters, 157a, whole, between 157 and 158, or prints moved
   under its old number in brackets, [378]: the row says its label, and the count
   goes on past it (pin: parse.test › a ⟨line 157a⟩ token) */
export const ROW_LABEL_AT = /^⟨line (\d+[a-z]|\[\d+\])⟩\s*/;
export const rowLabelToken = (label: string): string => "⟨line " + label + "⟩";
export const rowKindToken = (kind: string | null): string => (kind === "line" ? ROW_LINE_TOKEN : kind === "cont" ? ROW_CONT_TOKEN : "");
/* a row's own text that would read back as a token is written after a
   backslash, and read back as text (pin: parse.test › a row's text that
   would read as a row token) */
export const ROW_TOKEN_ESCAPE = "\\";
export const readsAsRowToken = (text: string): boolean => ROW_KIND_AT.test(text) || ROW_LABEL_AT.test(text) || text.trim() === ROW_SKIP_TOKEN;

/* ---------- the ::: family ---------- */
/* "::: verse 2" numbers its first line 2, 1 when the opener carries none;
   "::: verse 179 244" its right column from 244, null when it carries one
   number or none. The opener regexes are the whole grammar: this reads the
   tokens they admit and validates nothing itself */
export function fenceNumbers(line: string): { start: number; facing: number | null } {
  const m = line.match(/^\s*:::\s*[\w-]+\s+(\d+)(?:\s+(\d+))?/);
  return { start: m ? parseInt(m[1], 10) : 1, facing: m && m[2] ? parseInt(m[2], 10) : null };
}
/* never read through fenceNumbers, which would take it for the first line's
   number: a stanza's lines count from 1 (pin: parse.test › a stanza fence
   is a verse block carrying its number, and its first line is 1) */
export function stanzaNumber(line: string): number | null {
  const m = line.match(STANZA_OPEN);
  return m ? parseInt(m[1], 10) : null;
}
const testsAny = (openers: RegExp[]) => (line: string): boolean => openers.some((re) => re.test(line));
export const opensFence = testsAny([CARD_OPEN, VERSE_OPEN, STANZA_OPEN, DUAL_OPEN, REFERENCE_OPEN, NOTE_OPEN, MARGIN_NOTE_OPEN, PROSE_OPEN, GRID_OPEN]);
/* the openers whose body is NOT blocks */
export const flatFence = testsAny([VERSE_OPEN, STANZA_OPEN, DUAL_OPEN, REFERENCE_OPEN, PROSE_OPEN]);
export const opensNoteRow = testsAny([NOTE_OPEN, MARGIN_NOTE_OPEN]);
/* the openers whose body is ROWS — narrower than flatFence by the reference
   block, whose one directive admits no nested note */
export const rowFence = testsAny([VERSE_OPEN, STANZA_OPEN, DUAL_OPEN, PROSE_OPEN]);
const closesCode = (line: string, run: string): boolean => (line.match(FENCE_CLOSE)?.[1].length ?? -1) >= run.length;
export function codeCloses(lines: string[], at: number, run: string): boolean {
  for (let i = at; i < lines.length; i++) if (closesCode(lines[i], run)) return true;
  return false;
}
function codeRun(lines: string[], from: number): string | null {
  const open = FENCE_TICKS.exec(lines[from]);
  return open && codeCloses(lines, from + 1, open[1]) ? open[1] : null;
}
function takeCode(lines: string[], from: number, run: string, body: string[]): number {
  body.push(lines[from++]);
  while (!closesCode(lines[from], run)) body.push(lines[from++]);
  body.push(lines[from]);
  return from + 1;
}
function takeNote(lines: string[], from: number, body: string[]): number {
  const note = fenceBody(lines, from + 1);
  body.push(...lines.slice(from + 1, note.next));
  return note.next;
}
function takeRows(lines: string[], from: number, nests: boolean, body: string[]): number {
  while (from < lines.length && !CARD_CLOSE.test(lines[from])) {
    body.push(lines[from]);
    from = nests && opensNoteRow(lines[from]) ? takeNote(lines, from, body) : from + 1;
  }
  return from;
}
function takeFlat(lines: string[], from: number, body: string[]): number {
  body.push(lines[from]);
  const end = takeRows(lines, from + 1, rowFence(lines[from]), body);
  if (end >= lines.length) return end;
  body.push(lines[end]);
  return end + 1;
}
const depthStep = (line: string): number => (opensFence(line) ? 1 : CARD_CLOSE.test(line) ? -1 : 0);
/* depth counts for the recursing forms; a code fence's body is shielded
   only when that fence closes; a row fence's rows are taken raw, a ::: note
   row's extent handed back to this scan. An unclosed opener swallows the
   rest of the text (pin: parse.test › fenceBody counts depth for the
   recursing forms and shields raw bodies) */
export function fenceBody(lines: string[], from: number): { body: string[]; next: number } {
  const body: string[] = [];
  let depth = 1;
  while (from < lines.length) {
    const line = lines[from];
    const run = codeRun(lines, from);
    if (run) { from = takeCode(lines, from, run, body); continue; }
    if (flatFence(line)) { from = takeFlat(lines, from, body); continue; }
    depth += depthStep(line);
    if (!depth) return { body, next: from + 1 };
    body.push(line);
    from++;
  }
  return { body, next: from };
}

/* ---------- rows ---------- */
export function verseSplit(line: string): number {
  for (let k = 0; k < line.length; k++) {
    if (line.charAt(k) === "\\") { k++; continue; }
    if (line.charAt(k) === "|") return k;
  }
  return -1;
}
/* the backslash escapes itself too, or a cell ending in one would escape
   the separator (pin: roundtrip.test › round trips: every form survives) */
export function escapeCell(md: string): string {
  return md.replace(/([\\|])/g, "\\$1");
}
export function unescapeCell(s: string): string {
  return s.replace(/\\([\\|])/g, "$1");
}

/* ---------- tables ---------- */
export function isTableStart(lines: string[], i: number): boolean {
  return TABLE_ROW.test(lines[i]) && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1]);
}
export function tableRowCells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

/* ---------- prose that would read back as syntax ---------- */
/* the ONE spelling of "does lines[i] open a block" */
export function blockLineAt(lines: string[], i: number): boolean {
  return FENCE_LINE.test(lines[i]) || opensFence(lines[i]) ||
    HEADING_LINE.test(lines[i]) || QUOTE_LINE.test(lines[i]) ||
    LIST_LINE.test(lines[i]) || isTableStart(lines, i);
}
export function readsAsBlock(l: string): boolean {
  return blockLineAt([l], 0) || CARD_CLOSE.test(l);
}
/* the column-0 backslash escapes itself, so the first pass is the fixed
   point (pin: parse.test › the escaping helpers: the mark escapes itself) */
export function escapeProse(l: string): string {
  return readsAsBlock(l) || unescapeProse(l) !== l ? "\\" + l : l;
}
export function unescapeProse(l: string): string {
  if (l.charAt(0) !== "\\") return l;
  const bare = l.slice(1);
  return /^\s/.test(bare) || readsAsBlock(bare) || unescapeProse(bare) !== bare ? bare : l;
}
export function openItemCol(md: string): number {
  const lines = md.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].trim()) continue;
    const m = lines[i].match(LIST_LINE);
    if (m) return lines[i].length - m[3].length;
    if (!/^\s/.test(lines[i])) return -1;
  }
  return -1;
}
/* a block indented to the open item's column would hang under that item,
   so it takes the mark; one at column 0 is left alone */
export function escapeIndent(md: string, before: string): string {
  const lines = md.split("\n");
  let k = 0;
  while (k < lines.length && !lines[k].trim()) k++;
  if (k === lines.length) return md;
  const indent = lines[k].match(/^\s*/)![0].length;
  if (!indent) return md;
  const col = openItemCol(before);
  if (col < 0 || indent < col) return md;
  lines[k] = "\\" + lines[k];
  return lines.join("\n");
}
export function quotePrefix(l: string): string {
  return l.charAt(0) === ">" ? ">" + l : "> " + l;
}
