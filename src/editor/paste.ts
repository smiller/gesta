/* only PLAIN text is asked of this parser: the editor's own HTML carries its
   structure */
import { Fragment, Slice, type ResolvedPos, type Node } from "prosemirror-model";
import { type EditorState, type Transaction, TextSelection } from "prosemirror-state";
import { schema } from "../model/schema.ts";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";

const N = schema.nodes;
const LINE_BREAK_RE = /\r\n?|[\u2028\u2029]/g;
const ONE_HEADING_LINE = /^#{1,6} \S/;
const ONE_QUOTE_LINE = /^>+ \S/;
const INTERNAL_LINK_RE = /^\[[^\]]+\]\(#[^)\s]+\)$/;
const FLAT_HOSTS = new Set([N.list_item, N.table_cell, N.line, N.cell]);
function inAny($ctx: ResolvedPos, types: Set<unknown>): boolean {
  for (let d = $ctx.depth; d >= 0; d--) if (types.has($ctx.node(d).type)) return true;
  return false;
}
function flat(lines: string[]): Slice {
  const nodes: Node[] = [];
  lines.forEach((l, i) => { if (i) nodes.push(N.hard_break.create()); if (l) nodes.push(schema.text(l)); });
  return new Slice(Fragment.from(nodes), 0, 0);
}
export function onlyLineBreaks(raw: string, $context: ResolvedPos): boolean {
  if ($context.parent.type.spec.code) return false;
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
  if (!(lines.length > 1 || ONE_HEADING_LINE.test(body) || ONE_QUOTE_LINE.test(body))) return null;
  if (INTERNAL_LINK_RE.test(body.trim())) return null;
  try {
    const doc = parseMarkdown(body);
    if (!doc.textContent.trim() && lines.length === 1) return null;
    const blocks: Node[] = [];
    doc.forEach((b) => blocks.push(b));
    return blocks;
  } catch { return null; }
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
export function pasteSlice(raw: string, $context: ResolvedPos): Slice {
  const txt = raw.replace(LINE_BREAK_RE, "\n");
  const body = txt.replace(/\n$/, "");
  if ($context.parent.type.spec.code) return new Slice(Fragment.from(schema.text(txt)), 0, 0);
  const lines = body.split("\n");
  const blockShaped = lines.length > 1 || ONE_HEADING_LINE.test(body);
  if (INTERNAL_LINK_RE.test(body.trim())) {
    try { return new Slice(parseMarkdown(body.trim()).firstChild!.content, 0, 0); } catch { /* literal below */ }
  }
  if (blockShaped || ONE_QUOTE_LINE.test(body)) {
    if (inAny($context, FLAT_HOSTS)) return flat(lines);
    try {
      const doc = parseMarkdown(body);
      if (doc.textContent.trim() || lines.length > 1) return new Slice(doc.content, 0, 0);
    } catch { /* a form the schema refuses stays as typed */ }
  }
  return lines.length > 1 ? flat(lines) : new Slice(Fragment.from(body ? schema.text(body) : Fragment.empty), 0, 0);
}
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
export function copiedSlice(slice: Slice): Slice {
  return closeRowSlice(new Slice(dropFolios(slice.content), slice.openStart, slice.openEnd));
}
export function copyMd(slice: Slice): string {
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
const ROW_BLOCKS = new Set([N.verse, N.prose, N.bullet_list, N.ordered_list, N.table, N.pair, N.line, N.gap, N.list_item, N.table_row, N.grid]);
const rowish = (n: Node): boolean => ROW_BLOCKS.has(n.type) && !(n.type === N.grid && n.childCount < 2);
export function closeRowSlice(slice: Slice): Slice {
  const first = slice.content.firstChild, last = slice.content.lastChild;
  if (!first || !last) return slice;
  if ((slice.openStart && rowish(first)) || (slice.openEnd && rowish(last))) {
    return new Slice(slice.content, rowish(first) ? 0 : slice.openStart, rowish(last) ? 0 : slice.openEnd);
  }
  return slice;
}
