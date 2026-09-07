/* markdown -> ProseMirror document. markdown-it is the INLINE engine and the
   token pipeline; the block grammar is this file's own, ported whole from
   ../writer/src/js/md.mjs as the core "block" rule (decided 2026-09-07,
   phase 0: markdown-it's block loop discards a blank line before any rule
   sees it, and a quote body here is a line run in which a blank line is
   content — so neither its rules nor markdown-it-container fit). Every token
   the walker meets must be one it knows, or it throws: a form the schema does
   not know is refused, never dropped. */
import MarkdownIt, { type MarkdownIt as MarkdownItInstance, type StateCore, type StateInline, type Token, type Env } from "markdown-it";
import { Fragment, Mark, Node, type NodeType } from "prosemirror-model";
import { schema } from "./schema.ts";
import {
  LINE_BREAK_RE, LIST_LINE, FENCE_LINE, FENCE_TICKS, FENCE_CLOSE, QUOTE_LINE, HEADING_LINE,
  CARD_OPEN, CARD_CLOSE, VERSE_OPEN, PROSE_OPEN, REFERENCE_OPEN, NOTE_OPEN, FOLIO_NUM_SRC, ROW_LINE_AT,
  fenceStart, fenceBody, verseSplit, unescapeCell, isTableStart, tableRowCells,
  blockLineAt, unescapeProse,
} from "./grammar.ts";

type TokenCtor = new (type: string, tag: string, nesting: -1 | 0 | 1) => Token;

/* where the block arms write their tokens */
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
  /* a block whose body is one inline run */
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

/* the lines of one body, dispatched. `quote` selects the quote body's
   grammar: blank lines are content (a run of text lines absorbs them) and
   nothing is skipped; at every other level a blank line only separates. */
function emitBlocks(sink: Sink, lines: string[], quote: boolean): void {
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!quote && !line.trim()) { i++; continue; }
    if (FENCE_LINE.test(line)) i = emitFence(sink, lines, i);
    else if (CARD_OPEN.test(line)) i = emitCard(sink, lines, i);
    else if (VERSE_OPEN.test(line)) i = emitRows(sink, lines, i, "verse");
    else if (PROSE_OPEN.test(line)) i = emitRows(sink, lines, i, "prose");
    else if (REFERENCE_OPEN.test(line)) i = emitReference(sink, lines, i);
    else if (NOTE_OPEN.test(line)) i = emitNote(sink, lines, i);
    else if (HEADING_LINE.test(line)) { emitHeading(sink, line); i++; }
    else if (QUOTE_LINE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && QUOTE_LINE.test(lines[i])) inner.push(lines[i++].replace(QUOTE_LINE, ""));
      sink.push("blockquote_open", "blockquote", 1);
      emitBlocks(sink, inner, true);
      sink.push("blockquote_close", "blockquote", -1);
    }
    else if (LIST_LINE.test(line)) i = emitList(sink, lines, i);
    else if (isTableStart(lines, i)) i = emitTable(sink, lines, i);
    else if (quote) {
      const txt: string[] = [];
      while (i < lines.length && !blockLineAt(lines, i)) txt.push(lines[i++]);
      emitParagraph(sink, txt.map(unescapeProse));
    }
    else {
      /* the current line first: it may itself be block-start-like (a pipe
         row with no divider under it) yet land here, and the loop must advance */
      const p = [lines[i++]];
      while (i < lines.length && lines[i].trim() && !blockLineAt(lines, i)) p.push(lines[i++]);
      emitParagraph(sink, p.map(unescapeProse));
    }
  }
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
  /* backticks stay out of the lang; the serializer's escalation counts on it */
  const lang = lines[from].slice(open[1].length).trim().split(/\s+/)[0].toLowerCase().replace(/`/g, "");
  from++;
  const code: string[] = [];
  while (from < lines.length) {
    const close = lines[from].match(FENCE_CLOSE);
    if (close && close[1].length >= open[1].length) break;
    code.push(lines[from++]);
  }
  const t = sink.push("fence", "code", 0);
  t.info = lang;
  t.content = code.join("\n");
  return from + 1;   /* past the closer, or past EOF when unclosed */
}

/* a body that is itself blocks — card and note. The body is markdown, so it
   recurses at the top-level grammar (blank lines separate), as the current
   parser's mdToHtml re-entry does. */
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

function emitNote(sink: Sink, lines: string[], from: number): number {
  const box = fenceBody(lines, from + 1);
  emitBody(sink, "note", null, box.body);
  return box.next;
}

/* the reference body is PLAIN TEXT: one directive read by code */
function emitReference(sink: Sink, lines: string[], from: number): number {
  from++;
  const body: string[] = [];
  while (from < lines.length && !CARD_CLOSE.test(lines[from])) body.push(lines[from++]);
  const t = sink.push("reference", "div", 0);
  t.content = body.join("\n");
  return from + 1;
}

/* the verse and prose arms — one row walk, two containers. A blank line is a
   gap, a line with an unescaped pipe is a pair, a line without one is a
   full-width line, and a ::: note is a row that does not close the fence. In
   prose an all-empty pair is a gap too. */
function emitRows(sink: Sink, lines: string[], from: number, cls: "verse" | "prose"): number {
  const start = fenceStart(lines[from]);
  from++;
  const open = sink.push(cls + "_open", "div", 1);
  open.meta = { start };
  const emptyPairGaps = cls === "prose";
  while (from < lines.length && !CARD_CLOSE.test(lines[from])) {
    const line = lines[from];
    if (NOTE_OPEN.test(line)) { from = emitNote(sink, lines, from); continue; }
    const raw = line.trim();
    /* the row's declared kind comes off its head before the pipe is looked
       for; a declared row is a row even with nothing after the token */
    const declared = ROW_LINE_AT.test(raw);
    const body = declared ? raw.replace(ROW_LINE_AT, "") : raw;
    const meta = declared ? { kind: "line" } : undefined;
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

/* consume the continuation blocks hanging under item: lines indented to AT
   LEAST the item's content column. Straight under the marker they continue
   the item's own line as soft breaks; after a blank line they are a block. */
function takeItemBlocks(item: Item, lines: string[], from: number, col: number): number {
  const indentOf = (l: string): number => l.match(/^\s*/)![0].length;
  const continues = (j: number): boolean =>
    j < lines.length && !!lines[j].trim() && !blockLineAt(lines, j) && indentOf(lines[j]) >= col;
  const take = (j: number): string[] => {
    const run: string[] = [];
    while (continues(j)) { run.push(lines[j].replace(/^\s+/, "")); j++; }
    return run;
  };
  if (continues(from)) {
    item.cont = take(from);
    from += item.cont.length;
  }
  for (;;) {
    let j = from;
    while (j < lines.length && !lines[j].trim()) j++;
    if (j === from || !continues(j)) return from;
    const block = take(j);
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
  buildList(sink, items);
  return from;
}

/* a run of items to a nested list: a deeper indent opens a child list inside
   the item just emitted, a shallower one closes levels, each level's kind
   fixed by its first item's marker. Relative indent, so 2- or 3-space steps
   both nest. */
function buildList(sink: Sink, items: Item[]): void {
  let pos = 0;
  function level(): void {
    const L = items[pos].indent, ordered = items[pos].ordered;
    const open = sink.push(ordered ? "ordered_list_open" : "bullet_list_open", ordered ? "ol" : "ul", 1);
    if (ordered && items[pos].num !== 1) open.meta = { start: items[pos].num };
    let want = ordered ? items[pos].num : 0;
    while (pos < items.length && items[pos].indent >= L) {
      const it = items[pos];
      /* a same-indent line of the other marker kind closes this list; the
         outer loop opens a fresh sibling of that kind */
      if (it.ordered !== ordered) break;
      const li = sink.push("list_item_open", "li", 1);
      if (ordered && it.num !== want) li.meta = { value: it.num };
      if (ordered) want = it.num + 1;
      emitParagraph(sink, [it.text, ...it.cont]);
      it.blocks.forEach((b) => emitParagraph(sink, b));
      pos++;
      /* a deeper line nests inside the item just emitted */
      while (pos < items.length && items[pos].indent > L) level();
      sink.push("list_item_close", "li", -1);
    }
    sink.push(ordered ? "ordered_list_close" : "bullet_list_close", ordered ? "ol" : "ul", -1);
  }
  while (pos < items.length) level();
}

function emitTable(sink: Sink, lines: string[], from: number): number {
  const head = tableRowCells(lines[from]);
  from += 2;   /* the header row and its "| --- |" divider */
  const rows: string[][] = [head];
  while (from < lines.length && /^\s*\|.*\|\s*$/.test(lines[from])) {
    const cells = tableRowCells(lines[from++]);
    /* body rows pad or trim to the header's column count */
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

/* every newline inside a paragraph is a break, and the text around it is
   kept verbatim — no trailing-space trim, no leading-space skip on the next
   line (markdown-it's rule does both). MEASURED 2026-09-07 over the mirror:
   5,371 lines open with whitespace, most of them one-space chat transcripts. */
function newline(state: StateInline, silent: boolean): boolean {
  if (state.src.charCodeAt(state.pos) !== 0x0a) return false;
  if (!silent) state.push("softbreak", "br", 0);
  state.pos++;
  return true;
}

/* a code span is ONE backtick each side, on one line, its spaces kept —
   the current grammar's rule, narrower than CommonMark's */
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

/* the one inline HTML form the grammar reads: <u>…</u>. Every other angle
   bracket is text — the 1998–99 chat transcripts carry ~8,000 <name> tags. */
function underline(state: StateInline, silent: boolean): boolean {
  const src = state.src, pos = state.pos;
  if (src.charCodeAt(pos) !== 0x3c) return false;
  const st = state as StateInline & { uOpen?: number };
  if (src.startsWith("<u>", pos)) {
    if (src.indexOf("</u>", pos + 3) < 0 || src.indexOf("</u>", pos + 3) >= state.posMax) return false;
    if (!silent) { state.push("u_open", "u", 1); st.uOpen = (st.uOpen ?? 0) + 1; }
    state.pos += 3;
    return true;
  }
  if (src.startsWith("</u>", pos) && (st.uOpen ?? 0) > 0) {
    if (!silent) { state.push("u_close", "u", -1); st.uOpen! -= 1; }
    state.pos += 4;
    return true;
  }
  return false;
}

/* markdown-it's own text rule stops only at ASCII syntax characters, so a
   bare URL or a folio would be swallowed into text before any rule could
   claim it. This one stops there too — at a ⟨, and at an h or w that opens a
   URL — so the rules below get their turn. */
const TERMINATORS = new Set([0x0a, 0x21, 0x23, 0x24, 0x25, 0x26, 0x2a, 0x2b, 0x2d, 0x3a, 0x3c, 0x3d, 0x3e, 0x40, 0x5b, 0x5c, 0x5d, 0x5e, 0x5f, 0x60, 0x7b, 0x7d, 0x7e, 0x27e8]);
/* "]" ends the run too: markdown-it scans a link label with the same inline
   rules in silent mode, and a URL that ate the "](" would leave the label
   unclosed — MEASURED 2026-09-07, four files whose link text is itself an
   address. A bracket inside an address is IPv6-only. */
const URL_START = /^(?:https?:\/\/|www\.)[^\s<>⟨\]]+/i;
function urlAt(src: string, pos: number, max: number): RegExpExecArray | null {
  const c = src.charCodeAt(pos);
  if (c !== 0x68 && c !== 0x48 && c !== 0x77 && c !== 0x57) return null;
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

/* a bare URL becomes a link — claimed HERE, before emphasis runs, so an
   underscore or a star inside an address is never a marker (MEASURED
   2026-09-07: five files' URLs lost "_" runs to emphasis when the link was
   made after the inline pass). ⟨ ends the run, a folio carrying no space;
   trailing punctuation is the reader's, except a ")" closing a "(" the
   address itself opened. The text inside a link is never re-linked. */
const URL_BOUNDARY = /[\s([{“‘"'>⟩*_~]/;
const URL_TRAIL_CHAR = /[.,;:!?…'")\]}»”’]/;
function trimUrl(run: string): string {
  let end = run.length;
  while (end > 0) {
    const c = run.charAt(end - 1);
    if (!URL_TRAIL_CHAR.test(c)) break;
    if (c === ")") {
      const body = run.slice(0, end - 1);
      if ((body.match(/\(/g) || []).length > (body.match(/\)/g) || []).length) break;
    }
    end--;
  }
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

/* a folio token in the text — after the code-span rule, so a token in
   backticks stays literal, and never in an href, which the link rule reads
   as a destination rather than as inline text */
const FOLIO_AT = new RegExp(`^⟨(${FOLIO_NUM_SRC})⟩`);
function folio(state: StateInline, silent: boolean): boolean {
  if (state.src.charCodeAt(state.pos) !== 0x27e8) return false;
  const m = FOLIO_AT.exec(state.src.slice(state.pos, state.posMax));
  if (!m) return false;
  if (!silent) {
    const t = state.push("folio", "", 0);
    t.meta = { label: m[1] };
  }
  state.pos += m[0].length;
  return true;
}

export const md: MarkdownItInstance = new MarkdownIt({ html: false, linkify: false, typographer: false });
/* a link's address is stored as written: no percent-encoding, no scheme
   policing — this app renders one reader's own text */
md.normalizeLink = (url: string) => url;
md.normalizeLinkText = (url: string) => url;
md.validateLink = () => true;
md.core.ruler.at("block", (state: StateCore) => {
  emitBlocks(new Sink(state.Token, state.tokens), state.src.split("\n"), false);
});
md.inline.ruler.at("text", text);
md.inline.ruler.before("text", "autolink_bare", autolink);
md.inline.ruler.before("text", "folio", folio);
md.inline.ruler.at("newline", newline);
md.inline.ruler.at("backticks", backticks);
md.inline.ruler.after("backticks", "underline", underline);
md.inline.ruler.disable(["linkify", "escape", "autolink", "html_inline", "entity"]);

/* ---------- tokens -> document ---------- */

function buildDoc(tokens: Token[]): Node {
  const stack: { type: NodeType; attrs: Record<string, unknown> | null; content: Node[] }[] = [
    { type: schema.nodes.doc, attrs: null, content: [] },
  ];
  let marks: readonly Mark[] = Mark.none;
  const top = () => stack[stack.length - 1];
  const add = (node: Node) => top().content.push(node);
  const text = (s: string, ms: readonly Mark[] = marks) => { if (s) add(schema.text(s, ms)); };
  const open = (type: NodeType, attrs: Record<string, unknown> | null = null) => stack.push({ type, attrs, content: [] });
  const close = () => {
    const { type, attrs, content } = stack.pop()!;
    const node = type.createAndFill(attrs, Fragment.fromArray(content));
    if (!node) throw new Error(`cannot build a ${type.name} from its content`);
    add(node);
  };
  const mark = (name: string, attrs: Record<string, unknown> | null = null) => { marks = schema.marks[name].create(attrs).addToSet(marks); };
  const unmark = (name: string) => { marks = schema.marks[name].removeFromSet(marks); };

  const walk = (toks: Token[]): void => {
    for (const t of toks) {
      switch (t.type) {
        case "inline": walk(t.children!); break;
        case "text": text(t.content); break;
        case "softbreak": case "hardbreak": add(schema.nodes.hard_break.create(null, null, marks)); break;
        case "code_inline": text(t.content, schema.marks.code.create().addToSet(marks)); break;
        case "em_open": mark("em"); break;
        case "em_close": unmark("em"); break;
        case "strong_open": mark("strong"); break;
        case "strong_close": unmark("strong"); break;
        case "s_open": mark("strike"); break;
        case "s_close": unmark("strike"); break;
        case "u_open": mark("underline"); break;
        case "u_close": unmark("underline"); break;
        case "link_open": {
          let href = String(t.attrGet("href") ?? "");
          /* the www upgrade every minting path in the current app applies */
          if (/^www\./i.test(href)) href = "https://" + href;
          mark("link", { href });
          break;
        }
        case "link_close": unmark("link"); break;
        case "image": add(schema.nodes.image.create({ src: String(t.attrGet("src") ?? ""), alt: t.content }, null, marks)); break;
        case "folio": add(schema.nodes.folio.create({ label: t.meta!.label }, null, marks)); break;
        case "paragraph_open": open(schema.nodes.paragraph); break;
        case "heading_open": open(schema.nodes.heading, { level: +t.tag.slice(1) }); break;
        case "blockquote_open": open(schema.nodes.blockquote); break;
        case "bullet_list_open": open(schema.nodes.bullet_list); break;
        case "ordered_list_open": open(schema.nodes.ordered_list, { start: (t.meta?.start as number) ?? 1 }); break;
        case "list_item_open": open(schema.nodes.list_item, { value: (t.meta?.value as number) ?? null }); break;
        case "table_open": open(schema.nodes.table); break;
        case "table_row_open": open(schema.nodes.table_row); break;
        case "table_cell_open": open(schema.nodes.table_cell, { header: !!t.meta?.header }); break;
        case "card_open": open(schema.nodes.card, { colour: t.meta!.colour }); break;
        case "note_open": open(schema.nodes.note); break;
        case "verse_open": open(schema.nodes.verse, { start: t.meta!.start }); break;
        case "prose_open": open(schema.nodes.prose, { start: t.meta!.start }); break;
        case "line_open": open(schema.nodes.line, { kind: (t.meta?.kind as string) ?? null }); break;
        case "pair_open": open(schema.nodes.pair, { kind: (t.meta?.kind as string) ?? null }); break;
        case "cell_open": open(schema.nodes.cell); break;
        case "gap": add(schema.nodes.gap.create()); break;
        case "fence": add(schema.nodes.code_block.create({ lang: t.info }, t.content ? schema.text(t.content) : null)); break;
        case "reference": add(schema.nodes.reference.create(null, t.content ? schema.text(t.content) : null)); break;
        case "paragraph_close": case "heading_close": case "blockquote_close":
        case "bullet_list_close": case "ordered_list_close": case "list_item_close":
        case "table_close": case "table_row_close": case "table_cell_close":
        case "card_close": case "note_close": case "verse_close": case "prose_close":
        case "line_close": case "pair_close": case "cell_close":
          close(); break;
        default:
          throw new Error(`markdown token the schema does not know: ${t.type}`);
      }
    }
  };
  walk(tokens);
  if (stack.length !== 1) throw new Error("unbalanced markdown tokens");
  const doc = schema.nodes.doc.createAndFill(null, Fragment.fromArray(stack[0].content));
  if (!doc) throw new Error("cannot build the document");
  return doc;
}

export function tokenize(src: string): Token[] {
  const env: Env = {};
  return md.parse(src.replace(/\u200B/g, "").replace(LINE_BREAK_RE, "\n"), env);
}

export function parseMarkdown(src: string): Node {
  return buildDoc(tokenize(src));
}

/* the reader's text, block by block — what a search reads and what the
   round-trip check compares */
export function visibleText(doc: Node): string {
  return doc.textBetween(0, doc.content.size, "\n", "\n");
}
