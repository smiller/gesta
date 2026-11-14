/* markdown-it is the INLINE engine and the token pipeline; the block grammar
   is this file's own, as the core "block" rule: markdown-it's block loop
   discards a blank line before any rule sees it, and a quote body is a line
   run in which a blank line is content, so neither its rules nor
   markdown-it-container fit (pin: parse.test › a quote takes blocks at its
   own level, to any depth, and a blank quote line is content). A token the
   walker does not know throws: a form is refused, never dropped. */
import MarkdownIt, { type MarkdownIt as MarkdownItInstance, type StateCore, type StateInline, type Token, type Env } from "markdown-it";
import { Fragment, Mark, Node, type NodeType } from "prosemirror-model";
import { schema } from "./schema.ts";
import { fenceLineReason } from "./fenceRefusals.ts";
import {
  LINE_BREAK_RE, LIST_LINE, FENCE_LINE, FENCE_TICKS, FENCE_CLOSE, QUOTE_LINE, HEADING_LINE,
  CARD_OPEN, CARD_CLOSE, VERSE_OPEN, STANZA_OPEN, DUAL_OPEN, stanzaNumber, PROSE_OPEN, fenceNumbered, REFERENCE_OPEN, NOTE_OPEN, MARGIN_NOTE_OPEN, GRID_OPEN, PAGE_NUM_SRC, ROW_KIND_AT, ROW_LABEL_AT, ROW_SKIP_TOKEN, ROW_TOKEN_ESCAPE,
  fenceNumbers, fenceBody, verseSplit, unescapeCell, isTableStart, tableRowCells,
  blockLineAt, unescapeProse,
} from "./grammar.ts";

type TokenCtor = new (type: string, tag: string, nesting: -1 | 0 | 1) => Token;

class Sink {
  Token: TokenCtor;
  tokens: Token[];
  constructor(Token: TokenCtor, tokens: Token[]) {
    this.Token = Token;
    this.tokens = tokens;
  }
  push(type: string, tag: string, nesting: -1 | 0 | 1): Token {
    const t = new this.Token(type, tag, nesting);
    this.tokens.push(t);
    return t;
  }
  inline(name: string, tag: string, content: string, meta?: Record<string, unknown>): void {
    const open = this.push(name + "_open", tag, 1);
    if (meta) open.meta = meta;
    const t = this.push("inline", "", 0);
    t.content = content;
    t.children = [];
    this.push(name + "_close", tag, -1);
  }
}

/* ---------- the block arms ---------- */

/* `quote` selects the quote body's grammar: blank lines are content (a run
   of text lines absorbs them); at every other level a blank line only
   separates */
function emitBlocks(sink: Sink, lines: string[], quote: boolean): void {
  let i = 0;
  while (i < lines.length) {
    if (!quote && !lines[i].trim()) { i++; continue; }
    const arm = BLOCK_ARMS.find(([opens]) => opens(lines, i));
    if (arm) i = arm[1](sink, lines, i);
    else i = quote ? emitQuoteText(sink, lines, i) : emitText(sink, lines, i);
  }
}
type Arm = [opens: (lines: string[], i: number) => boolean, emit: (sink: Sink, lines: string[], i: number) => number];
const lineIs = (...res: RegExp[]) => (lines: string[], i: number): boolean => res.some((re) => re.test(lines[i]));
const BLOCK_ARMS: Arm[] = [
  [lineIs(FENCE_LINE), emitFence],
  [lineIs(CARD_OPEN), emitCard],
  [lineIs(VERSE_OPEN, STANZA_OPEN, DUAL_OPEN), (sink, lines, i) => emitRows(sink, lines, i, "verse")],
  [lineIs(PROSE_OPEN), (sink, lines, i) => emitRows(sink, lines, i, "prose")],
  [lineIs(REFERENCE_OPEN), emitReference],
  [lineIs(NOTE_OPEN), (sink, lines, i) => emitNote(sink, lines, i, "note")],
  [lineIs(MARGIN_NOTE_OPEN), (sink, lines, i) => emitNote(sink, lines, i, "margin_note")],
  [lineIs(GRID_OPEN), emitGrid],
  [lineIs(HEADING_LINE), (sink, lines, i) => { emitHeading(sink, lines[i]); return i + 1; }],
  [lineIs(QUOTE_LINE), emitQuote],
  [lineIs(LIST_LINE), emitList],
  [isTableStart, emitTable],
];
function emitQuote(sink: Sink, lines: string[], i: number): number {
  const inner: string[] = [];
  while (i < lines.length && QUOTE_LINE.test(lines[i])) inner.push(lines[i++].replace(QUOTE_LINE, ""));
  sink.push("blockquote_open", "blockquote", 1);
  emitBlocks(sink, inner, true);
  sink.push("blockquote_close", "blockquote", -1);
  return i;
}
function emitQuoteText(sink: Sink, lines: string[], i: number): number {
  const txt: string[] = [];
  while (i < lines.length && !blockLineAt(lines, i)) txt.push(lines[i++]);
  emitParagraph(sink, txt.map(unescapeProse));
  return i;
}
const paragraphGoesOn = (lines: string[], i: number): boolean => i < lines.length && !!lines[i].trim() && !blockLineAt(lines, i);
/* the current line first: it may be block-start-like (a pipe row with
   no divider under it) yet land here, and the loop must advance (pin:
   parse.test › a pipe row with no divider under it is a paragraph) */
function emitText(sink: Sink, lines: string[], i: number): number {
  const p = [lines[i++]];
  while (paragraphGoesOn(lines, i)) p.push(lines[i++]);
  emitParagraph(sink, p.map(unescapeProse));
  return i;
}

function emitParagraph(sink: Sink, lines: string[]): void {
  sink.inline("paragraph", "p", lines.join("\n"));
}

function emitHeading(sink: Sink, line: string): void {
  const m = line.match(HEADING_LINE)!;
  sink.inline("heading", "h" + m[1].length, m[2]);
}

function emitFence(sink: Sink, lines: string[], from: number): number {
  const open = FENCE_TICKS.exec(lines[from])!;
  /* the words after the language are kept as written: "```not code" saved
     as "```not" (pin: roundtrip.test › round trips) */
  const [, first, rest] = lines[from].slice(open[1].length).trim().match(/^(\S*)(.*)$/)!;
  const lang = first.toLowerCase().replace(/`/g, "");
  from++;
  const code: string[] = [];
  while (from < lines.length) {
    const close = lines[from].match(FENCE_CLOSE);
    if (close && close[1].length >= open[1].length) break;
    code.push(lines[from++]);
  }
  const t = sink.push("fence", "code", 0);
  t.info = lang;
  t.meta = { rest: rest.replace(/`/g, "") };
  t.content = code.join("\n");
  return from + 1;
}

function emitBody(sink: Sink, name: string, meta: Record<string, unknown> | null, body: string[]): void {
  const open = sink.push(name + "_open", "div", 1);
  if (meta) open.meta = meta;
  emitBlocks(sink, body, false);
  sink.push(name + "_close", "div", -1);
}

function emitCard(sink: Sink, lines: string[], from: number): number {
  const colour = lines[from].match(CARD_OPEN)![1];
  const box = fenceBody(lines, from + 1);
  emitBody(sink, "card", { colour }, box.body);
  return box.next;
}

/* judged BEFORE any token is pushed, so the reason is this one and not the
   generic "cannot build". It throws: left as paragraphs, the opener would
   be escaped on the next save (pin: parse.test › a grid holding anything but
   cards is refused at the parse, the offending line quoted) */
function notACard(l: string): Error {
  const why = fenceLineReason(l);
  return new Error(`a grid holds only cards; "${l.trim().slice(0, 60)}" is not a card` + (why ? " — " + why : ""));
}
function countCards(body: string[]): number {
  let cards = 0;
  for (let i = 0; i < body.length;) {
    if (!body[i].trim()) { i++; continue; }
    if (!CARD_OPEN.test(body[i])) throw notACard(body[i]);
    cards++;
    i = fenceBody(body, i + 1).next;
  }
  return cards;
}
function emitGrid(sink: Sink, lines: string[], from: number): number {
  const typed = lines[from].match(/\s(\d+)\s*$/);
  const box = fenceBody(lines, from + 1);
  if (!countCards(box.body)) throw new Error("a grid holds at least one card");
  emitBody(sink, "grid", { n: typed ? parseInt(typed[1], 10) : null }, box.body);
  return box.next;
}

function emitNote(sink: Sink, lines: string[], from: number, name: "note" | "margin_note"): number {
  const box = fenceBody(lines, from + 1);
  emitBody(sink, name, null, box.body);
  return box.next;
}

function emitReference(sink: Sink, lines: string[], from: number): number {
  from++;
  const body: string[] = [];
  while (from < lines.length && !CARD_CLOSE.test(lines[from])) body.push(lines[from++]);
  const t = sink.push("reference", "div", 0);
  t.content = body.join("\n");
  return from + 1;
}

function emitRows(sink: Sink, lines: string[], from: number, cls: "verse" | "prose"): number {
  const stanza = stanzaNumber(lines[from]);
  const { start, facing } = stanza === null ? fenceNumbers(lines[from]) : { start: 1, facing: null };
  from++;
  const open = sink.push(cls + "_open", "div", 1);
  open.meta = { start, stanza, dual: DUAL_OPEN.test(lines[from - 1]), facing, numbered: fenceNumbered(lines[from - 1]) };
  const emptyPairGaps = cls === "prose";
  while (from < lines.length && !CARD_CLOSE.test(lines[from])) {
    const line = lines[from];
    if (NOTE_OPEN.test(line)) { from = emitNote(sink, lines, from, "note"); continue; }
    if (MARGIN_NOTE_OPEN.test(line)) { from = emitNote(sink, lines, from, "margin_note"); continue; }
    const trimmed = line.trim();
    if (trimmed === ROW_SKIP_TOKEN && cls === "verse") { sink.push("skip", "div", 0); from++; continue; }
    const escaped = trimmed.startsWith(ROW_TOKEN_ESCAPE + "⟨");
    const raw = escaped ? trimmed.slice(ROW_TOKEN_ESCAPE.length) : trimmed;
    const labelled = escaped ? null : ROW_LABEL_AT.exec(raw);
    const head = labelled ?? (escaped ? null : ROW_KIND_AT.exec(raw));
    const declared = !!head;
    const body = head ? raw.slice(head[0].length) : raw;
    const meta = labelled ? { kind: "line", label: labelled[1] } : head ? { kind: head[1] === "line" ? "line" : "cont" } : undefined;
    if (!body && !declared) sink.push("gap", "div", 0);
    else {
      const at = verseSplit(body);
      if (at < 0) sink.inline("line", "div", unescapeCell(body), meta);
      else {
        const a = body.slice(0, at).trim(), b = body.slice(at + 1).trim();
        if (emptyPairGaps && !a && !b && !declared) sink.push("gap", "div", 0);
        else {
          const open = sink.push("pair_open", "div", 1);
          if (meta) open.meta = meta;
          sink.inline("cell", "div", unescapeCell(a));
          sink.inline("cell", "div", unescapeCell(b));
          sink.push("pair_close", "div", -1);
        }
      }
    }
    from++;
  }
  sink.push(cls + "_close", "div", -1);
  return from + 1;
}

interface Item { indent: number; ordered: boolean; num: number; text: string; cont: string[]; blocks: string[][] }

const indentOf = (l: string): number => l.match(/^\s*/)![0].length;
const continuesAt = (lines: string[], j: number, col: number): boolean =>
  j < lines.length && !!lines[j].trim() && !blockLineAt(lines, j) && indentOf(lines[j]) >= col;
function takeRun(lines: string[], j: number, col: number): string[] {
  const run: string[] = [];
  for (; continuesAt(lines, j, col); j++) run.push(lines[j].replace(/^\s+/, ""));
  return run;
}
function skipBlank(lines: string[], j: number): number {
  while (j < lines.length && !lines[j].trim()) j++;
  return j;
}
function takeItemBlocks(item: Item, lines: string[], from: number, col: number): number {
  item.cont = takeRun(lines, from, col);
  from += item.cont.length;
  for (;;) {
    const j = skipBlank(lines, from);
    if (j === from || !continuesAt(lines, j, col)) return from;
    const block = takeRun(lines, j, col);
    item.blocks.push(block);
    from = j + block.length;
  }
}

function emitList(sink: Sink, lines: string[], from: number): number {
  const items: Item[] = [];
  let lm: RegExpMatchArray | null;
  while (from < lines.length && (lm = lines[from].match(LIST_LINE))) {
    /* the marker parses to NaN exactly when it is a bullet */
    const num = parseInt(lm[2], 10);
    const item: Item = { indent: lm[1].length, ordered: !isNaN(num), num, text: lm[3], cont: [], blocks: [] };
    items.push(item);
    from = takeItemBlocks(item, lines, from + 1, lines[from].length - lm[3].length);
  }
  new ListWriter(sink, items).all();
  return from;
}

class ListWriter {
  sink: Sink;
  items: Item[];
  pos = 0;
  constructor(sink: Sink, items: Item[]) {
    this.sink = sink;
    this.items = items;
  }
  all(): void {
    while (this.pos < this.items.length) this.level();
  }
  private inLevel(indent: number, ordered: boolean): boolean {
    const it = this.items[this.pos];
    return !!it && it.indent >= indent && it.ordered === ordered;
  }
  private deeper(indent: number): boolean {
    const it = this.items[this.pos];
    return !!it && it.indent > indent;
  }
  private level(): void {
    const first = this.items[this.pos], ordered = first.ordered;
    const name = ordered ? "ordered_list" : "bullet_list", tag = ordered ? "ol" : "ul";
    const open = this.sink.push(name + "_open", tag, 1);
    if (ordered && first.num !== 1) open.meta = { start: first.num };
    let want = first.num;
    while (this.inLevel(first.indent, ordered)) want = this.item(first.indent, ordered, want);
    this.sink.push(name + "_close", tag, -1);
  }
  private item(indent: number, ordered: boolean, want: number): number {
    const it = this.items[this.pos];
    const li = this.sink.push("list_item_open", "li", 1);
    if (ordered && it.num !== want) li.meta = { value: it.num };
    emitParagraph(this.sink, [it.text, ...it.cont]);
    it.blocks.forEach((b) => emitParagraph(this.sink, b));
    this.pos++;
    while (this.deeper(indent)) this.level();
    this.sink.push("list_item_close", "li", -1);
    return it.num + 1;
  }
}

function emitTable(sink: Sink, lines: string[], from: number): number {
  const head = tableRowCells(lines[from]);
  from += 2;   /* the header row and its "| --- |" divider */
  const rows: string[][] = [head];
  while (from < lines.length && /^\s*\|.*\|\s*$/.test(lines[from])) {
    const cells = tableRowCells(lines[from++]);
    rows.push(head.map((_, k) => cells[k] || ""));
  }
  sink.push("table_open", "table", 1);
  rows.forEach((cells, r) => {
    sink.push("table_row_open", "tr", 1);
    cells.forEach((c) => sink.inline("table_cell", r ? "td" : "th", c, { header: r === 0 }));
    sink.push("table_row_close", "tr", -1);
  });
  sink.push("table_close", "table", -1);
  return from;
}

/* ---------- the markdown-it instance: inline rules and the pipeline ---------- */

/* every newline inside a paragraph is a break, the text around it kept
   verbatim — markdown-it's rule trims both sides. MEASURED over the mirror:
   5,371 lines open with whitespace, most of them one-space chat transcripts
   (pin: parse.test › a paragraph keeps its breaks, its leading whitespace) */
function newline(state: StateInline, silent: boolean): boolean {
  if (state.src.charCodeAt(state.pos) !== 0x0a) return false;
  if (!silent) state.push("softbreak", "br", 0);
  state.pos++;
  return true;
}

/* ONE backtick each side, on one line, its spaces kept — narrower than
   CommonMark's (pin: parse.test › inline: code spans keep markers literal) */
function backticks(state: StateInline, silent: boolean): boolean {
  if (state.src.charCodeAt(state.pos) !== 0x60) return false;
  const m = /^`([^`\n]+)`/.exec(state.src.slice(state.pos, state.posMax));
  if (!m) return false;
  if (!silent) {
    const t = state.push("code_inline", "code", 0);
    t.markup = "`";
    t.content = m[1];
  }
  state.pos += m[0].length;
  return true;
}

/* the one inline HTML form the grammar reads. Every other angle bracket is
   text: the 1998–99 chat transcripts carry ~8,000 <name> tags (pin:
   parse.test › the underline tag is read only as a matched pair) */
type UnderlineState = StateInline & { uOpen?: number };
function underlineOpen(state: UnderlineState, silent: boolean): boolean {
  const close = state.src.indexOf("</u>", state.pos + 3);
  if (close < 0 || close >= state.posMax) return false;
  if (!silent) { state.push("u_open", "u", 1); state.uOpen = (state.uOpen ?? 0) + 1; }
  state.pos += 3;
  return true;
}
function underlineClose(state: UnderlineState, silent: boolean): boolean {
  if (!state.uOpen) return false;
  if (!silent) { state.push("u_close", "u", -1); state.uOpen -= 1; }
  state.pos += 4;
  return true;
}
function underline(state: StateInline, silent: boolean): boolean {
  if (state.src.startsWith("<u>", state.pos)) return underlineOpen(state, silent);
  if (state.src.startsWith("</u>", state.pos)) return underlineClose(state, silent);
  return false;
}

/* markdown-it's own text rule stops only at ASCII syntax characters, so a
   bare URL or a page label would be swallowed into text; this one stops at a ⟨
   and at an h or w that opens a URL too */
const TERMINATORS = new Set([0x0a, 0x21, 0x23, 0x24, 0x25, 0x26, 0x2a, 0x2b, 0x2d, 0x3a, 0x3c, 0x3d, 0x3e, 0x40, 0x5b, 0x5c, 0x5d, 0x5e, 0x5f, 0x60, 0x7b, 0x7d, 0x7e, 0x27e8]);
/* "]" ends the run: markdown-it scans a link label with these rules in
   silent mode, and a URL that ate the "](" left the label unclosed —
   MEASURED, four files whose link text is itself an address. A bracket
   inside an address is IPv6-only (pin: roundtrip.test › round trips: every
   form survives) */
export const URL_START = /^(?:https?:\/\/|www\.)[^\s<>⟨\]]+/i;
const URL_FIRST = new Set([0x68, 0x48, 0x77, 0x57]);
function urlAt(src: string, pos: number, max: number): RegExpExecArray | null {
  if (!URL_FIRST.has(src.charCodeAt(pos))) return null;
  return URL_START.exec(src.slice(pos, max));
}
function text(state: StateInline, silent: boolean): boolean {
  const src = state.src, max = state.posMax;
  let pos = state.pos;
  while (pos < max) {
    if (TERMINATORS.has(src.charCodeAt(pos))) break;
    if (pos > state.pos && urlAt(src, pos, max)) break;
    pos++;
  }
  if (pos === state.pos) return false;
  if (!silent) state.pending += src.slice(state.pos, pos);
  state.pos = pos;
  return true;
}

/* claimed HERE, before emphasis runs, so an underscore or a star inside an
   address is never a marker: MEASURED, five files' URLs lost "_" runs when
   the link was made after the inline pass. ⟨ ends the run, a page label carrying
   no space; trailing punctuation is the text's, except a ")" closing a "("
   the address opened (pin: parse.test › a bare URL is one link even when it
   holds emphasis markers or a paren) (pin: parse.test › a bare URL links,
   trailing punctuation stays outside, and a page label ends the run) */
const URL_BOUNDARY = /[\s([{“‘"'>⟩*_~]/;
const URL_TRAIL_CHAR = /[.,;:!?…'")\]}»”’]/;
const countOf = (s: string, re: RegExp): number => (s.match(re) || []).length;
function trailsUrl(run: string, end: number): boolean {
  const c = run.charAt(end - 1);
  if (!URL_TRAIL_CHAR.test(c)) return false;
  if (c !== ")") return true;
  const body = run.slice(0, end - 1);
  return countOf(body, /\(/g) <= countOf(body, /\)/g);
}
export function trimUrl(run: string): string {
  let end = run.length;
  while (end > 0 && trailsUrl(run, end)) end--;
  return run.slice(0, end);
}
function autolink(state: StateInline, silent: boolean): boolean {
  if (state.linkLevel > 0) return false;
  const m = urlAt(state.src, state.pos, state.posMax);
  if (!m) return false;
  const prev = state.pending ? state.pending.slice(-1) : state.pos > 0 ? state.src.charAt(state.pos - 1) : "";
  if (prev && !URL_BOUNDARY.test(prev)) return false;
  const url = trimUrl(m[0]);
  if (!silent) {
    const open = state.push("link_open", "a", 1);
    open.attrs = [["href", url]];
    open.markup = "autolink";
    const t = state.push("text", "", 0);
    t.content = url;
    state.push("link_close", "a", -1);
  }
  state.pos += url.length;
  return true;
}

const PAGE_AT = new RegExp(`^⟨(${PAGE_NUM_SRC})⟩`);
function pageLabelRule(state: StateInline, silent: boolean): boolean {
  if (state.src.charCodeAt(state.pos) !== 0x27e8) return false;
  const m = PAGE_AT.exec(state.src.slice(state.pos, state.posMax));
  if (!m) return false;
  if (!silent) {
    const t = state.push("page_label", "", 0);
    t.meta = { label: m[1] };
  }
  state.pos += m[0].length;
  return true;
}

export const md: MarkdownItInstance = new MarkdownIt({ html: false, linkify: false, typographer: false });
/* an address is stored as written: no percent-encoding, no scheme policing
   (pin: roundtrip.test › round trips: every form survives) */
md.normalizeLink = (url: string) => url;
md.normalizeLinkText = (url: string) => url;
md.validateLink = () => true;
md.core.ruler.at("block", (state: StateCore) => {
  emitBlocks(new Sink(state.Token, state.tokens), state.src.split("\n"), false);
});
md.inline.ruler.at("text", text);
md.inline.ruler.before("text", "autolink_bare", autolink);
md.inline.ruler.before("text", "page_label", pageLabelRule);
md.inline.ruler.at("newline", newline);
md.inline.ruler.at("backticks", backticks);
md.inline.ruler.after("backticks", "underline", underline);
md.inline.ruler.disable(["linkify", "escape", "autolink", "html_inline", "entity"]);

/* ---------- tokens -> document ---------- */

type Attrs = Record<string, unknown> | null;
const rowKind = (t: Token): Attrs => ({ kind: (t.meta?.kind as string) ?? null, label: (t.meta?.label as string) ?? null });
const NODE_OPENS = new Map<string, [NodeType, (t: Token) => Attrs]>([
  ["paragraph_open", [schema.nodes.paragraph, () => null]],
  ["heading_open", [schema.nodes.heading, (t) => ({ level: +t.tag.slice(1) })]],
  ["blockquote_open", [schema.nodes.blockquote, () => null]],
  ["bullet_list_open", [schema.nodes.bullet_list, () => null]],
  ["ordered_list_open", [schema.nodes.ordered_list, (t) => ({ start: (t.meta?.start as number) ?? 1 })]],
  ["list_item_open", [schema.nodes.list_item, (t) => ({ value: (t.meta?.value as number) ?? null })]],
  ["table_open", [schema.nodes.table, () => null]],
  ["table_row_open", [schema.nodes.table_row, () => null]],
  ["table_cell_open", [schema.nodes.table_cell, (t) => ({ header: !!t.meta?.header })]],
  ["card_open", [schema.nodes.card, (t) => ({ colour: t.meta!.colour })]],
  ["note_open", [schema.nodes.note, () => null]],
  ["margin_note_open", [schema.nodes.margin_note, () => null]],
  ["grid_open", [schema.nodes.grid, (t) => ({ n: t.meta!.n })]],
  ["verse_open", [schema.nodes.verse, (t) => ({ start: t.meta!.start, stanza: t.meta!.stanza ?? null, dual: !!t.meta!.dual, facing: t.meta!.facing ?? null, numbered: !!t.meta!.numbered })]],
  ["prose_open", [schema.nodes.prose, (t) => ({ start: t.meta!.start, numbered: !!t.meta!.numbered })]],
  ["line_open", [schema.nodes.line, rowKind]],
  ["pair_open", [schema.nodes.pair, rowKind]],
  ["cell_open", [schema.nodes.cell, () => null]],
]);
const NODE_CLOSES = new Set([
  "paragraph_close", "heading_close", "blockquote_close", "bullet_list_close", "ordered_list_close", "list_item_close",
  "table_close", "table_row_close", "table_cell_close", "card_close", "note_close", "margin_note_close", "grid_close",
  "verse_close", "prose_close", "line_close", "pair_close", "cell_close",
]);
const MARK_OPENS = new Map([["em_open", "em"], ["strong_open", "strong"], ["s_open", "strike"], ["u_open", "underline"]]);
const MARK_CLOSES = new Map([["em_close", "em"], ["strong_close", "strong"], ["s_close", "strike"], ["u_close", "underline"], ["link_close", "link"]]);
const textOf = (t: Token): Node | null => (t.content ? schema.text(t.content) : null);
function linkHref(t: Token): string {
  const href = String(t.attrGet("href") ?? "");
  return /^www\./i.test(href) ? "https://" + href : href;
}
const hardBreak = (b: DocBuilder): void => b.add(schema.nodes.hard_break.create(null, null, b.marks));
const LEAVES = new Map<string, (b: DocBuilder, t: Token) => void>([
  ["inline", (b, t) => b.walk(t.children!)],
  ["text", (b, t) => b.text(t.content)],
  ["softbreak", hardBreak],
  ["hardbreak", hardBreak],
  ["code_inline", (b, t) => b.text(t.content, schema.marks.code.create().addToSet(b.marks))],
  ["link_open", (b, t) => b.mark("link", { href: linkHref(t) })],
  ["image", (b, t) => b.add(schema.nodes.image.create({ src: String(t.attrGet("src") ?? ""), alt: t.content }, null, b.marks))],
  ["page_label", (b, t) => b.add(schema.nodes.page_label.create({ label: t.meta!.label }, null, b.marks))],
  ["gap", (b) => b.add(schema.nodes.gap.create())],
  ["skip", (b) => b.add(schema.nodes.skip.create())],
  ["fence", (b, t) => b.add(schema.nodes.code_block.create({ lang: t.info, rest: (t.meta?.rest as string) ?? "" }, textOf(t)))],
  ["reference", (b, t) => b.add(schema.nodes.reference.create(null, textOf(t)))],
]);

class DocBuilder {
  stack: { type: NodeType; attrs: Attrs; content: Node[] }[] = [{ type: schema.nodes.doc, attrs: null, content: [] }];
  marks: readonly Mark[] = Mark.none;
  add(node: Node): void {
    this.stack[this.stack.length - 1].content.push(node);
  }
  text(s: string, ms: readonly Mark[] = this.marks): void {
    if (s) this.add(schema.text(s, ms));
  }
  mark(name: string, attrs: Attrs = null): void {
    this.marks = schema.marks[name].create(attrs).addToSet(this.marks);
  }
  private open(type: NodeType, attrs: Attrs): void {
    this.stack.push({ type, attrs, content: [] });
  }
  private close(): void {
    const { type, attrs, content } = this.stack.pop()!;
    const node = type.createAndFill(attrs, Fragment.fromArray(content));
    if (!node) throw new Error(`cannot build a ${type.name} from its content`);
    this.add(node);
  }
  private token(t: Token): void {
    const opens = NODE_OPENS.get(t.type), leaf = LEAVES.get(t.type);
    const marked = MARK_OPENS.get(t.type), unmarked = MARK_CLOSES.get(t.type);
    if (opens) this.open(opens[0], opens[1](t));
    else if (NODE_CLOSES.has(t.type)) this.close();
    else if (marked) this.mark(marked);
    else if (unmarked) this.marks = schema.marks[unmarked].removeFromSet(this.marks);
    else if (leaf) leaf(this, t);
    else throw new Error(`markdown token the schema does not know: ${t.type}`);
  }
  walk(toks: Token[]): void {
    for (const t of toks) this.token(t);
  }
  doc(): Node {
    if (this.stack.length !== 1) throw new Error("unbalanced markdown tokens");
    const doc = schema.nodes.doc.createAndFill(null, Fragment.fromArray(this.stack[0].content));
    if (!doc) throw new Error("cannot build the document");
    return doc;
  }
}
function buildDoc(tokens: Token[]): Node {
  const builder = new DocBuilder();
  builder.walk(tokens);
  return builder.doc();
}

export function tokenize(src: string): Token[] {
  const env: Env = {};
  return md.parse(src.replace(/\u200B/g, "").replace(LINE_BREAK_RE, "\n"), env);
}

export function parseMarkdown(src: string): Node {
  return buildDoc(tokenize(src));
}

export function visibleText(doc: Node): string {
  return doc.textBetween(0, doc.content.size, "\n", "\n");
}
