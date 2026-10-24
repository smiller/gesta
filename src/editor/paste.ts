import { Fragment, Slice, DOMParser, type ResolvedPos, type Node, type ParseOptions } from "prosemirror-model";
import { type EditorState, type Transaction, TextSelection, Selection } from "prosemirror-state";
import { schema } from "../model/schema.ts";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { renumbered } from "./numbering.ts";
import { bareUrl } from "./typing.ts";
import { namesEntry, internalHash, makeHref } from "../store/nav.ts";
import { fenceRefusals, refusalsText } from "../model/fenceRefusals.ts";

const N = schema.nodes;
const LINE_BREAK_RE = /\r\n?|[\u2028\u2029]/g;
const ONE_HEADING_LINE = /^#{1,6} \S/;
const ONE_QUOTE_LINE = /^>+ \S/;
const INTERNAL_LINK_RE = /^\[[^\]]+\]\(#([^)\s]+)\)$/;
const FLAT_HOSTS = new Set([N.list_item, N.table_cell, N.line, N.cell]);
function inAny($ctx: ResolvedPos, types: Set<unknown>): boolean {
  for (let d = $ctx.depth; d >= 0; d--) if (types.has($ctx.node(d).type)) return true;
  return false;
}
/* A ONE-LINE QUOTE IS A QUOTE only outside one: pasted inside a quote it is
   that line's text, never a quote nested in it; and a picture is something
   drawn, so a quote holding one alone is not empty (pin: paste.test › a
   one-line quote pasted inside a quote is its text) */
const QUOTES = new Set([N.blockquote]);
const oneQuoteLine = (body: string, $context: ResolvedPos): boolean => ONE_QUOTE_LINE.test(body) && !inAny($context, QUOTES);
function draws(doc: Node): boolean {
  let yes = !!doc.textContent.trim();
  doc.descendants((n) => { if (n.type === N.image) yes = true; return !yes; });
  return yes;
}
function flat(lines: string[]): Slice {
  const nodes: Node[] = [];
  lines.forEach((l, i) => { if (i) nodes.push(N.hard_break.create()); if (l) nodes.push(schema.text(l)); });
  return new Slice(Fragment.from(nodes), 0, 0);
}
export function onlyLineBreaks(raw: string, $context: ResolvedPos, html = ""): boolean {
  if ($context.parent.type.spec.code || html.includes("data-pm-slice")) return false;
  const txt = raw.replace(LINE_BREAK_RE, "\n");
  return txt.includes("\n") && !txt.trim();
}
export function pasteBlocks(raw: string, $context: ResolvedPos): Node[] | null {
  const body = raw.replace(LINE_BREAK_RE, "\n").replace(/\n$/, "");
  /* every code-shaped textblock is literal — the reference block too: a
     split there cut the one directive into two (pin: paste.test › inside a
     reference block every character is literal) */
  if ($context.parent.type.spec.code || inAny($context, FLAT_HOSTS)) return null;
  const lines = body.split("\n");
  if (!(lines.length > 1 || ONE_HEADING_LINE.test(body) || oneQuoteLine(body, $context))) return null;
  if (INTERNAL_LINK_RE.test(body.trim())) return null;
  try {
    const doc = parseMarkdown(body);
    if (!draws(doc) && lines.length === 1) return null;
    const blocks: Node[] = [];
    doc.forEach((b) => blocks.push(b));
    return blocks;
  } catch { return null; }
}
/* a pasted fence the model refuses is named with its reason (pin:
   paste.test › a pasted fence the model refuses is named)
   (pin: editing as the old app does › a refused fence pasted) */
export function pastedRefusal(blocks: Node[]): string | null {
  const refused = fenceRefusals(N.doc.create(null, blocks));
  return refused.length ? refusalsText(refused) : null;
}
/* SET DOWN, never fitted: a replace opens a block slice up to fit the
   paragraph it lands in and peels the first cell's text into it (MEASURED:
   a pasted verse fence lost its first original line to the paragraph
   above) (pin: paste.test › a verse fence pasted as text is set down
   whole) */
export function placeBlocks(state: EditorState, blocks: Node[]): Transaction {
  const tr = state.tr.deleteSelection();
  const $at = tr.selection.$from;
  const frag = Fragment.from(blocks);
  let pos: number;
  if ($at.parent.isTextblock && $at.parent.content.size === 0 && $at.depth >= 1) {
    pos = $at.before();
    tr.replaceWith(pos, $at.after(), frag);
  } else if ($at.parent.isTextblock) {
    if ($at.parentOffset === 0) { pos = $at.before(); tr.insert(pos, frag); }
    else if ($at.parentOffset === $at.parent.content.size) { pos = $at.after(); tr.insert(pos, frag); }
    else { tr.split($at.pos); pos = tr.mapping.map($at.pos, 1) - 1; pos = tr.doc.resolve(tr.mapping.map($at.pos)).before(); tr.insert(pos, frag); }
  } else { pos = $at.pos; tr.insert(pos, frag); }
  tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(pos + frag.size, tr.doc.content.size)), -1));
  return tr;
}
const REFERENCE_HEAD_RE = /^(\[[^\]]+\]\(#([^)\s]+)\)):\n\n([^]*)$/;
const linkable = ($at: ResolvedPos): boolean => $at.parent.type.allowsMarkType(schema.marks.link);
function inlineSlice(md: string): Slice | null {
  try { return new Slice(parseMarkdown(md).firstChild!.content, 0, 0); } catch { return null; }
}
/* a copy made in this page pastes as itself: a cut reference and its
   quotation pasted mid-line arrived as the citation alone, the quotation
   lost (pin: paste.test › text after a reference's first line) */
function pastedAddress(raw: string, html: string): { link: string; target: string; reference: boolean } | null {
  if (html.includes("data-pm-slice")) return null;
  const txt = raw.replace(LINE_BREAK_RE, "\n").trim();
  const ref = REFERENCE_HEAD_RE.exec(txt);
  const found = ref && ref[3].split("\n").every((l) => l.startsWith(">")) ? { link: ref[1], target: ref[2], reference: true }
    : INTERNAL_LINK_RE.test(txt) ? { link: txt, target: INTERNAL_LINK_RE.exec(txt)![1], reference: false } : null;
  return found && namesEntry(found.target) ? found : null;
}
export function linkSelection(state: EditorState, raw: string, html = ""): Transaction | null {
  const sel = state.selection;
  if (sel.empty || !(sel instanceof TextSelection) || !sel.$from.sameParent(sel.$to) || !linkable(sel.$from)) return null;
  const pasted = pastedAddress(raw, html);
  if (!pasted) return null;
  let from = sel.from, to = sel.to;
  while (from < to && /\s/.test(state.doc.textBetween(from, from + 1))) from++;
  while (to > from && /\s/.test(state.doc.textBetween(to - 1, to))) to--;
  if (from === to) return null;
  const tr = state.tr.addMark(from, to, schema.marks.link.create({ href: "#" + pasted.target }));
  return tr.setSelection(TextSelection.create(tr.doc, sel.to));
}
export function citeInLine(state: EditorState, raw: string, html = ""): Transaction | null {
  const sel = state.selection;
  if (!sel.empty || !linkable(sel.$from) || !sel.$from.parent.textContent.trim()) return null;
  const pasted = pastedAddress(raw, html);
  const slice = pasted?.reference ? inlineSlice(pasted.link) : null;
  return slice && state.tr.replaceSelection(slice);
}
/* only PLAIN text is asked of this parser: HTML carries its own structure */
export function pasteSlice(raw: string, $context: ResolvedPos): Slice {
  const txt = raw.replace(LINE_BREAK_RE, "\n");
  const body = txt.replace(/\n$/, "");
  if ($context.parent.type.spec.code) return new Slice(Fragment.from(schema.text(txt)), 0, 0);
  const lines = body.split("\n");
  const blockShaped = lines.length > 1 || ONE_HEADING_LINE.test(body);
  /* a link to an address naming no entry stays as typed: a dead link looked
     like a live one (pin: paste.test › a pasted link to an address that
     names no entry stays as typed) */
  /* a bare URL alone is a link at once, not on the space typed after it
     (pin: paste.test › a bare URL pasted alone is a link at once) */
  const url = lines.length === 1 ? bareUrl(body.trim()) : null;
  if (url) return new Slice(Fragment.from(schema.text(body.trim(), [schema.marks.link.create({ href: url })])), 0, 0);
  const internal = INTERNAL_LINK_RE.exec(body.trim());
  if (internal && !namesEntry(internal[1])) return new Slice(Fragment.from(schema.text(body)), 0, 0);
  if (internal) {
    const slice = inlineSlice(body.trim());
    if (slice) return slice;
  }
  if (blockShaped || oneQuoteLine(body, $context)) {
    if (inAny($context, FLAT_HOSTS)) return flat(lines);
    try {
      const doc = parseMarkdown(body);
      if (draws(doc) || lines.length > 1) return new Slice(doc.content, 0, 0);
    } catch { /* a form the schema refuses stays as typed */ }
  }
  return lines.length > 1 ? flat(lines) : new Slice(Fragment.from(body ? schema.text(body) : Fragment.empty), 0, 0);
}
/* A PASTED LINK TO THIS PAGE KEEPS ITS BARE ADDRESS: pasted HTML carries the
   page's full file address, which breaks when the page moves; a link whose
   words are its address stays whole (pin: paste.test › a pasted link to this
   page) (pin: paste.test › a link to this page in pasted markdown) */
function bareFragment(frag: Fragment, docHref: string): Fragment {
  let changed = false;
  const out: Node[] = [];
  frag.forEach((n) => {
    const marks = n.marks.map((m) => {
      const href = m.attrs.href as string;
      if (m.type !== schema.marks.link || (n.isText && n.text === href) || !internalHash(href, docHref)) return m;
      const bare = makeHref(href, docHref);
      return bare === href ? m : schema.marks.link.create({ ...m.attrs, href: bare });
    });
    const content = n.isText ? n.content : bareFragment(n.content, docHref);
    const same = content === n.content && marks.every((m, i) => m === n.marks[i]);
    if (!same) changed = true;
    out.push(same ? n : n.isText ? n.mark(marks) : n.copy(content).mark(marks));
  });
  return changed ? Fragment.fromArray(out) : frag;
}
export function bareLinks(slice: Slice, docHref: string): Slice {
  const content = bareFragment(slice.content, docHref);
  return content === slice.content ? slice : new Slice(content, slice.openStart, slice.openEnd);
}
export function bareBlocks(blocks: Node[], docHref: string): Node[] {
  const out: Node[] = [];
  bareFragment(Fragment.from(blocks), docHref).forEach((b) => out.push(b));
  return out;
}
/* HTML THIS PAGE WROTE KEEPS ITS SPACES: other HTML has its runs of spaces
   folded on a paste, which took the gap between a line's half-lines and
   two spaces after a full stop; a marked copy inside HTML of its own is not
   marked throughout, and that HTML's layout whitespace would come in with it
   (pin: a reference pasted › prose with two spaces pasted) (pin: paste.test ›
   pasted HTML keeps its spaces only when every block in it is one this page
   marked) */
export const COPY_MARK = "data-gesta-copy";
interface PastedNode { nodeType: number; nodeName: string; textContent: string | null; hasAttribute?(name: string): boolean }
export function keepsSpaces(dom: globalThis.Node): boolean {
  let marked = false;
  for (const n of Array.from(dom.childNodes) as unknown as PastedNode[]) {
    if (n.nodeType === 3) { if (/\S/.test(n.textContent ?? "")) return false; continue; }
    if (n.nodeType !== 1) continue;
    if (n.hasAttribute?.(COPY_MARK)) { marked = true; continue; }
    if (!/^(META|STYLE)$/.test(n.nodeName)) return false;
  }
  return marked;
}
class SpaceKeepingParser extends DOMParser {
  parseSlice(dom: globalThis.Node, options: ParseOptions = {}): Slice {
    if (options.preserveWhitespace || !keepsSpaces(dom)) return super.parseSlice(dom, options);
    /* the layout's whitespace between blocks is not text */
    for (const n of Array.from(dom.childNodes)) if (n.nodeType === 3) dom.removeChild(n);
    return super.parseSlice(dom, { ...options, preserveWhitespace: true });
  }
}
export const clipboardParser = new SpaceKeepingParser(schema, DOMParser.fromSchema(schema).rules);
/* NO PAGE MARKER LEAVES IN A COPY: pasted into a journal entry it made a
   page number with no book behind it. Where one stood between two spaces,
   one space goes with it (pin: paste.test › a copy carries no page marker out) */
export function dropFolios(frag: Fragment): Fragment {
  const out: Node[] = [];
  let dropped = false;
  frag.forEach((n) => {
    if (n.type === N.folio) { dropped = true; return; }
    let kept: Node | null = n.isLeaf ? n : n.copy(dropFolios(n.content));
    const prev = out[out.length - 1];
    if (dropped && kept.isText && prev?.isText && prev.text!.endsWith(" ") && kept.text!.startsWith(" ")) kept = kept.text!.length > 1 ? kept.cut(1) : null;
    if (kept) out.push(kept);
    dropped = false;
  });
  return Fragment.fromArray(out);
}
/* `doc`, `from` and `to`: where the selection was cut, so a verse or prose
   block it opens inside is numbered from its first copied line. A cut
   opening at the end of a line starts at the next: the empty row it opened
   with read back as a gap, numbering every line under it one too low (pin:
   paste.test › a copy whose selection opens at the end of a line); so does
   one opening at a list item's end, which copied an empty item (pin:
   paste.test › list items copied from the middle keep their own numbers) */
export function copiedSlice(slice: Slice, doc?: Node, from?: number, to?: number): Slice {
  if (!doc || from === undefined) return closeRowSlice(new Slice(dropFolios(slice.content), slice.openStart, slice.openEnd));
  const $from = doc.resolve(from);
  /* a pair's row ends with its last cell (pin: paste.test › a copy opening at the end of a pair's right cell) */
  const lastCell = $from.parent.type === N.cell && $from.index(-1) === $from.node(-1).childCount - 1;
  const rowEnd = $from.parent.type === N.line || lastCell || ($from.parent.type === N.paragraph && $from.depth > 1 && $from.node(-1).type === N.list_item);
  if (to !== undefined && rowEnd && $from.parentOffset === $from.parent.content.size) {
    const next = Selection.findFrom(doc.resolve($from.after()), 1, true);
    if (next && next.from < to) { from = next.from; slice = doc.slice(from, to, true); }
  }
  const cut = keepRightCell(doc, from, renumbered(doc, from, doc.copy(slice.content)));
  return closeRowSlice(new Slice(dropFolios(cut.content), slice.openStart, slice.openEnd));
}
/* a cut opening inside a pair's right cell keeps the left one, empty:
   without it the right column's text read back as the left's (pin:
   paste.test › lines copied from a block numbered on both sides) */
function keepRightCell(doc: Node, at: number, cut: Node): Node {
  const $at = doc.resolve(at);
  const mend = (node: Node, d: number): Node => {
    if (d > $at.depth || !node.firstChild) return node;
    if (node.type === N.pair && $at.node(d).type === N.pair && $at.index(d) === 1 && node.childCount === 1) {
      return node.copy(Fragment.from([N.cell.create(), node.firstChild]));
    }
    return node.copy(Fragment.from([mend(node.firstChild, d + 1), ...node.content.content.slice(1)]));
  };
  return mend(cut, 0);
}
/* a selection open inside one code block copies its characters, as the
   browser would (pin: paste.test › a selection inside one code block copies
   its characters) */
function openCode(slice: Slice): Node | null {
  let inner = slice.content;
  for (let d = 1; inner.childCount === 1 && d <= Math.min(slice.openStart, slice.openEnd); d++) {
    if (inner.firstChild!.type === N.code_block) return inner.firstChild!;
    inner = inner.firstChild!.content;
  }
  return null;
}
export function copyMd(slice: Slice): string {
  const code = openCode(slice);
  if (code) return code.textContent;
  let content = slice.content;
  if (content.childCount && content.firstChild!.isInline) content = Fragment.from(N.paragraph.create(null, content));
  const blocks: Node[] = [];
  content.forEach((n) => blocks.push(n));
  if (!blocks.length) return "";
  try { return serializeMarkdown(N.doc.create(null, blocks)); } catch { return slice.content.textBetween(0, slice.content.size, "\n"); }
}
/* A DRAG FROM INSIDE ONE ROW, CELL OR ITEM INTO THE NEXT COPIES AS THE
   BLOCK THOSE PARTS CAME FROM: a slice open inside a verse or prose row, a
   list or a table is CLOSED, so the paste lands the block whole (MEASURED:
   the first line of a copied canto pasted as a paragraph before the
   fence). A slice open inside ordinary prose keeps its openness, which is
   what lets a copied phrase land inline (pin: paste.test › a slice open
   inside a verse row is closed) */
/* the blocks, AND their rows: a selection inside one block slices to its
   rows with the block left out (MEASURED: a drag across two pairs slices to
   pairs, open two deep). A drag across two cards slices to the GRID itself,
   open three deep (MEASURED: a selection's content() keeps its parents)
   (pin: paste.test › a drag across two cards of a grid is closed at the
   grid). The card is not a row (pin: paste.test › a plain card is not a
   row) */
const ROW_BLOCKS = new Set([N.verse, N.prose, N.bullet_list, N.ordered_list, N.table, N.pair, N.line, N.gap, N.skip, N.list_item, N.table_row, N.grid]);
const rowish = (n: Node): boolean => ROW_BLOCKS.has(n.type) && !(n.type === N.grid && n.childCount < 2);
export function closeRowSlice(slice: Slice): Slice {
  const first = slice.content.firstChild, last = slice.content.lastChild;
  if (!first || !last) return slice;
  if ((slice.openStart && rowish(first)) || (slice.openEnd && rowish(last))) {
    return new Slice(slice.content, rowish(first) ? 0 : slice.openStart, rowish(last) ? 0 : slice.openEnd);
  }
  return slice;
}
