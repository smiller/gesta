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
/* LEVELS UNCAPPED: "#" is level one (pin: parse.test › headings take every
   level) */
export const HEADING_LINE = /^(#{1,6})\s+(.*)$/;
/* the ::: family. EVERY FENCE LINE TOLERATES LEADING WHITESPACE, opener and
   closer alike, and they move together. The card opener REQUIRES the
   hyphenated colour word; the other words are exact (pin: parse.test › a
   ::: line may be indented, opener and closer alike) */
export const CARD_OPEN = /^\s*:::\s*(card-[\w-]+)\s*$/;
export const CARD_CLOSE = /^\s*:::\s*$/;
export const VERSE_OPEN = /^\s*:::\s*verse(?:\s+0*[1-9]\d*)?\s*$/;
/* the stanza number is REQUIRED — a bare `::: stanza` names nothing (pin:
   parse.test › the stanza opener requires its number) */
export const STANZA_OPEN = /^\s*:::\s*stanza\s+0*([1-9]\d*)\s*$/;
export const PROSE_OPEN = /^\s*:::\s*prose(?:\s+0*[1-9]\d*)?\s*$/;
export const REFERENCE_OPEN = /^\s*:::\s*reference\s*$/;
export const NOTE_OPEN = /^\s*:::\s*note\s*$/;
export const GRID_OPEN = /^\s*:::\s*grid(?:\s+0*[1-9]\d*)?\s*$/;
export const TABLE_ROW = /^\s*\|.*\|\s*$/;
export const TABLE_DIVIDER = /^\s*\|[\s:|-]*-[\s:|-]*\|\s*$/;

/* ---------- folios ---------- */
export const FOLIO_ARABIC_SRC = "[0-9]";
/* either case: a book printing XXIV is as ordinary as one printing xxiv
   (pin: folio.test › FOLIO_ONE: arabic or roman, either case) */
export const FOLIO_ROMAN_SRC = "[ivxlcdmIVXLCDM]";
export const FOLIO_NUM_SRC = `(?:${FOLIO_ARABIC_SRC}+|${FOLIO_ROMAN_SRC}+)`;
/* ⟨8⟩ — U+27E8/9, MEASURED over the corpus to appear nowhere else. .replace
   ONLY: /g under .test() carries lastIndex */
export const FOLIO_TOKEN = new RegExp(`⟨(${FOLIO_NUM_SRC})⟩`, "g");
export const FOLIO_ONE = new RegExp(`^${FOLIO_NUM_SRC}$`);
export const FOLIO_ARABIC = new RegExp(`^${FOLIO_ARABIC_SRC}+$`);
export function folioToken(label: string): string {
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
   `⟨word⟩` of any kind exists in the corpus, and `line` is not a folio label
   (n, e are not roman). The token names what the row IS, so a second value
   can follow the same grammar; only this one is read (pin: parse.test › a
   ⟨line⟩ token at a row's head is the row's declared kind, not its text) */
export const ROW_LINE_TOKEN = "⟨line⟩";
export const ROW_LINE_AT = /^⟨line⟩\s*/;

/* ---------- the ::: family ---------- */
/* "::: verse 2" numbers its first line 2; 1 when the opener carries none.
   The opener regexes are the whole grammar: this reads the one token they
   admit and validates nothing itself */
export function fenceStart(line: string): number {
  const m = line.match(/\s(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : 1;
}
/* never read through fenceStart, which would take it for the first line's
   number: a stanza's lines count from 1 (pin: parse.test › a stanza fence
   is a verse block carrying its number, and its first line is 1) */
export function stanzaNumber(line: string): number | null {
  const m = line.match(STANZA_OPEN);
  return m ? parseInt(m[1], 10) : null;
}
export function opensFence(line: string): boolean {
  return CARD_OPEN.test(line) || VERSE_OPEN.test(line) || STANZA_OPEN.test(line) ||
    REFERENCE_OPEN.test(line) || NOTE_OPEN.test(line) || PROSE_OPEN.test(line) || GRID_OPEN.test(line);
}
/* the openers whose body is NOT blocks */
export function flatFence(line: string): boolean {
  return VERSE_OPEN.test(line) || STANZA_OPEN.test(line) || REFERENCE_OPEN.test(line) || PROSE_OPEN.test(line);
}
/* the openers whose body is ROWS — narrower than flatFence by the reference
   block, whose one directive admits no nested note */
export function rowFence(line: string): boolean {
  return VERSE_OPEN.test(line) || STANZA_OPEN.test(line) || PROSE_OPEN.test(line);
}
export function codeCloses(lines: string[], at: number, run: string): boolean {
  for (let i = at; i < lines.length; i++) {
    const m = lines[i].match(FENCE_CLOSE);
    if (m && m[1].length >= run.length) return true;
  }
  return false;
}
/* depth counts for the recursing forms; a code fence's body is shielded
   only when that fence closes; a row fence's rows are taken raw, a ::: note
   row's extent handed back to this scan. An unclosed opener swallows the
   rest of the text (pin: parse.test › fenceBody counts depth for the
   recursing forms and shields raw bodies) */
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
/* the first pipe not itself escaped, or -1 (pin: parse.test › the split is
   at the FIRST pipe, and an escaped one stays in its cell) */
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
/* the content column of the item still open at the end of the markdown
   written so far, or -1 (pin: parse.test › the escaping helpers: the mark
   escapes itself, and the indent is read backwards) */
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
