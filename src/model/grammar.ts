/* The markdown grammar's line-level facts: the regexes every block arm and
   the serializer share, and the pure string transforms around them. Ported
   2026-09-07 from ../writer/src/js/md.mjs, serialize.mjs and folio.mjs, whose
   comments hold the measurements behind each rule; what is kept here is the
   rule itself, and a comment only where this port decided something. */

/* the ONE spelling of "what counts as a line break" — CRLF, a lone \r, and
   the U+2028/U+2029 separators; parseMarkdown normalizes its input with it */
export const LINE_BREAK_RE = /\r\n?|[\u2028\u2029]/g;
/* one markdown list line: leading indent, a bullet or number marker, its text */
export const LIST_LINE = /^(\s*)([-*]|\d+[.)])\s+(.*)$/;
/* the MINIMUM indent the serializer writes a continuation block at. The parse
   arm does NOT read it: takeItemBlocks attaches on the item's own content
   column, which is what makes the "at least" rule work. */
export const ITEM_BLOCK_INDENT = "    ";
/* a line opening (or closing) a ``` code fence, at column 0 */
export const FENCE_LINE = /^```/;
/* the opener's backtick run, captured — the length the close rule compares */
export const FENCE_TICKS = /^(`{3,})/;
/* a line of nothing but backticks — what closes a fence */
export const FENCE_CLOSE = /^(`{3,})\s*$/;
/* a line belonging to a > quote */
export const QUOTE_LINE = /^>\s?/;
/* a heading line. LEVELS UNCAPPED (decision 5 of the successor plan,
   2026-09-07): "#" is level 1, and an entry's title is its first level-one
   heading. The current app maps # to h2 and reads ## as the deepest. */
export const HEADING_LINE = /^(#{1,6})\s+(.*)$/;
/* the ::: family. EVERY FENCE LINE TOLERATES LEADING WHITESPACE, opener and
   closer alike, and the six move together. The card opener REQUIRES the
   hyphenated colour word; the other words are exact. */
export const CARD_OPEN = /^\s*:::\s*(card-[\w-]+)\s*$/;
export const CARD_CLOSE = /^\s*:::\s*$/;
export const VERSE_OPEN = /^\s*:::\s*verse(?:\s+0*[1-9]\d*)?\s*$/;
export const PROSE_OPEN = /^\s*:::\s*prose(?:\s+0*[1-9]\d*)?\s*$/;
export const REFERENCE_OPEN = /^\s*:::\s*reference\s*$/;
export const NOTE_OPEN = /^\s*:::\s*note\s*$/;
/* a table starts at a "| … |" row with a "| --- |" divider directly beneath */
export const TABLE_ROW = /^\s*\|.*\|\s*$/;
export const TABLE_DIVIDER = /^\s*\|[\s:|-]*-[\s:|-]*\|\s*$/;

/* ---------- folios ---------- */
export const FOLIO_ARABIC_SRC = "[0-9]";
/* either case: a book printing XXIV is as ordinary as one printing xxiv */
export const FOLIO_ROMAN_SRC = "[ivxlcdmIVXLCDM]";
export const FOLIO_NUM_SRC = `(?:${FOLIO_ARABIC_SRC}+|${FOLIO_ROMAN_SRC}+)`;
/* the canonical form, ⟨8⟩ — U+27E8/9, measured over the corpus to appear
   nowhere else. .replace ONLY — /g under .test() carries lastIndex */
export const FOLIO_TOKEN = new RegExp(`⟨(${FOLIO_NUM_SRC})⟩`, "g");
export const FOLIO_ONE = new RegExp(`^${FOLIO_NUM_SRC}$`);
export const FOLIO_ARABIC = new RegExp(`^${FOLIO_ARABIC_SRC}+$`);
export function folioToken(label: string): string {
  return `⟨${label}⟩`;
}

/* ---------- a row's declared kind ---------- */
/* THE ROW THAT SAYS WHAT IT IS. The numbering convention infers a row's kind
   from its marks — wholly italic is a stage direction, wholly bold a speaker
   label, and neither takes a number — and MEASURED 2026-09-07 over the mirror
   the convention cannot be narrowed to bracketed rows (Shakespeare's 5,627
   directions are bare italics, `*Exit*`). What it lacked was "italic, but a
   line": Pippa's songs and Fra Lippo Lippi's `*Flower o' the broom,*` fell
   out of the count where editions number them.
   DECIDED 2026-09-07 (phase 1): the exception rides on the ROW, as a token at
   its head in the folio's own brackets. PER ROW, not per block: Pippa Passes
   interleaves songs with directions through 198 italic rows, so a block flag
   would split the block at every song and hand-number every restart. IN THE
   TEXT, not in a side table: a backup carries it, and the running app shows
   it harmlessly as text until the cutover. MEASURED: no `⟨word⟩` of any kind
   exists in the corpus, and `line` is not a folio label (n, e are not roman).
   The token names what the row IS, so a second value can follow the same
   grammar if one is ever wanted; only this one is read. */
export const ROW_LINE_TOKEN = "⟨line⟩";
export const ROW_LINE_AT = /^⟨line⟩\s*/;

/* ---------- the ::: family ---------- */
/* the number a row fence starts at — "::: verse 2" numbers its first line 2;
   1 when the opener carries none. The opener regexes are the whole grammar,
   so this reads the one token they admit and parses nothing itself. */
export function fenceStart(line: string): number {
  const m = line.match(/\s(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : 1;
}
/* does this line open a ::: block — the opener list as one guard */
export function opensFence(line: string): boolean {
  return CARD_OPEN.test(line) || VERSE_OPEN.test(line) ||
    REFERENCE_OPEN.test(line) || NOTE_OPEN.test(line) || PROSE_OPEN.test(line);
}
/* the openers whose body is NOT blocks */
export function flatFence(line: string): boolean {
  return VERSE_OPEN.test(line) || REFERENCE_OPEN.test(line) || PROSE_OPEN.test(line);
}
/* the openers whose body is ROWS — narrower than flatFence by the reference
   block, whose one directive admits no nested note */
export function rowFence(line: string): boolean {
  return VERSE_OPEN.test(line) || PROSE_OPEN.test(line);
}
/* does the code fence opened with `run` backticks ever close from `at`? */
export function codeCloses(lines: string[], at: number, run: string): boolean {
  for (let i = at; i < lines.length; i++) {
    const m = lines[i].match(FENCE_CLOSE);
    if (m && m[1].length >= run.length) return true;
  }
  return false;
}
/* the body lines of the ::: fence opened above lines[from], and the index of
   the line past its close. It counts depth for the recursing forms (card,
   note), shields a code fence's body — only one that actually closes — and
   takes a row fence's rows raw, handing a ::: note row's extent back to this
   same scan. An unclosed opener swallows the rest of the text. */
export function fenceBody(lines: string[], from: number): { body: string[]; next: number } {
  const body: string[] = [];
  let depth = 1;
  let code: string | null = null;
  while (from < lines.length) {
    const line = lines[from];
    let open: RegExpExecArray | null;
    if (code) {
      const close = line.match(FENCE_CLOSE);
      if (close && close[1].length >= code.length) code = null;
    } else if ((open = FENCE_TICKS.exec(line)) && codeCloses(lines, from + 1, open[1])) {
      code = open[1];
    } else if (flatFence(line)) {
      body.push(line);
      from++;
      const nests = rowFence(line);
      while (from < lines.length && !CARD_CLOSE.test(lines[from])) {
        body.push(lines[from]);
        if (!nests || !NOTE_OPEN.test(lines[from])) { from++; continue; }
        const note = fenceBody(lines, from + 1);
        body.push(...lines.slice(from + 1, note.next));
        from = note.next;
      }
      if (from >= lines.length) return { body, next: from };
      body.push(lines[from]);
      from++;
      continue;
    } else if (opensFence(line)) {
      depth++;
    } else if (CARD_CLOSE.test(line)) {
      if (!--depth) return { body, next: from + 1 };
    }
    body.push(line);
    from++;
  }
  return { body, next: from };
}

/* ---------- rows ---------- */
/* the index of the separator: the first pipe not itself escaped, or -1. A
   walk, so a consumed pipe is never mistaken for the start of the line. */
export function verseSplit(line: string): number {
  for (let k = 0; k < line.length; k++) {
    if (line.charAt(k) === "\\") { k++; continue; }
    if (line.charAt(k) === "|") return k;
  }
  return -1;
}
/* the row separator is a bare "|", so a typed one is escaped; the backslash
   escapes itself too, or a cell ending in one would escape the separator */
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
/* does lines[i] OPEN A BLOCK — the OR of the dispatch arms, so the paragraph
   run, the list continuation and the serializer's indent rule all gate on the
   one predicate */
export function blockLineAt(lines: string[], i: number): boolean {
  return FENCE_LINE.test(lines[i]) || opensFence(lines[i]) ||
    HEADING_LINE.test(lines[i]) || QUOTE_LINE.test(lines[i]) ||
    LIST_LINE.test(lines[i]) || isTableStart(lines, i);
}
/* would the parse read this line as structure — the question above over the
   line alone, plus the bare ::: that closes a fence */
export function readsAsBlock(l: string): boolean {
  return blockLineAt([l], 0) || CARD_CLOSE.test(l);
}
/* a backslash at column 0 marks a prose line that would otherwise read as a
   block; the mark escapes itself, so the first pass is the fixed point */
export function escapeProse(l: string): string {
  return readsAsBlock(l) || unescapeProse(l) !== l ? "\\" + l : l;
}
export function unescapeProse(l: string): string {
  if (l.charAt(0) !== "\\") return l;
  const bare = l.slice(1);
  return /^\s/.test(bare) || readsAsBlock(bare) || unescapeProse(bare) !== bare ? bare : l;
}
/* the content column of the item still open at the end of the markdown
   written so far, or -1 when no list is — read backwards off what was written */
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
/* the indent arm: a block whose first line with anything on it is indented
   to at least the open item's column would hang under that item, so it takes
   the mark; a block opening at column 0 is left alone */
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
/* one quote level: an already-quoted line just gains another ">" */
export function quotePrefix(l: string): string {
  return l.charAt(0) === ">" ? ">" + l : "> " + l;
}
