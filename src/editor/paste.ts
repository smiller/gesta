/* What pasted text becomes, and what copied text says. Ported 2026-09-07
   from 13c-paste-and-source-copy.js, re-asked of the document model:
   several pasted lines render as the markdown they spell — a copied card,
   heading, list or table arrives as that block; a single line stays as
   typed unless it is an unambiguous quote or heading line, or a pasted
   entry link; inside a list item, a table cell or a verse row the lines
   arrive as line breaks; inside a code block every character is literal.
   The in-app copy needs no flavour of its own: the editor's HTML carries
   its structure, and this parser is asked only of PLAIN text — a foreign
   page's HTML parses through the schema's own rules. The copied text is
   the selection's markdown, so a list or a heading pasted into another
   entry arrives as itself. The source view is a textarea and pastes
   literally by nature. */
import { Fragment, Slice, type ResolvedPos, type Node } from "prosemirror-model";
import { type EditorState, type Transaction, TextSelection } from "prosemirror-state";
import { schema } from "../model/schema.ts";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";

const N = schema.nodes;
const LINE_BREAK_RE = /\r\n?|[\u2028\u2029]/g;
/* heading levels are uncapped here (decision 5) */
const ONE_HEADING_LINE = /^#{1,6} \S/;
const ONE_QUOTE_LINE = /^>+ \S/;
const INTERNAL_LINK_RE = /^\[[^\]]+\]\(#[^)\s]+\)$/;
const FLAT_HOSTS = new Set([N.list_item, N.table_cell, N.line, N.cell]);
function inAny($ctx: ResolvedPos, types: Set<unknown>): boolean {
  for (let d = $ctx.depth; d >= 0; d--) if (types.has($ctx.node(d).type)) return true;
  return false;
}
/* the lines as text and breaks, one paragraph's worth of inline content */
function flat(lines: string[]): Slice {
  const nodes: Node[] = [];
  lines.forEach((l, i) => { if (i) nodes.push(N.hard_break.create()); if (l) nodes.push(schema.text(l)); });
  return new Slice(Fragment.from(nodes), 0, 0);
}
/* the blocks a block-shaped text paste spells, or null where the text
   is not block-shaped or the host takes it flat */
export function pasteBlocks(raw: string, $context: ResolvedPos): Node[] | null {
  const body = raw.replace(LINE_BREAK_RE, "\n").replace(/\n$/, "");
  /* every code-shaped textblock is literal — the reference block too: a
     split there cut the one directive the citation reads into two
     (FOUND by the 2026-09-08 review) */
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
/* the blocks SET DOWN, never fitted: the editor's replace opens a block
   slice up to fit the paragraph it lands in and peels the first cell's
   text into it (measured 2026-09-08: a pasted verse fence lost its
   first original line to the paragraph above). An empty paragraph is
   replaced; a caret mid-paragraph splits it and the blocks go between;
   the caret lands after them. */
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
/* the copied selection as markdown: inline content is a paragraph's */
export function copyMd(slice: Slice): string {
  let content = slice.content;
  if (content.childCount && content.firstChild!.isInline) content = Fragment.from(N.paragraph.create(null, content));
  const blocks: Node[] = [];
  content.forEach((n) => blocks.push(n));
  if (!blocks.length) return "";
  try { return serializeMarkdown(N.doc.create(null, blocks)); } catch { return slice.content.textBetween(0, slice.content.size, "\n"); }
}
/* A DRAG FROM INSIDE ONE ROW, CELL OR ITEM INTO THE NEXT COPIES AS THE
   BLOCK THOSE PARTS CAME FROM — the README's rule, the current app's
   rebuildParts: a slice open inside a verse or prose row, a list or a
   table is CLOSED, so the paste lands the block whole rather than
   merging the first cell's text into the paragraph it lands in
   (measured 2026-09-08: the first line of a copied canto pasted as a
   paragraph before the fence). A slice open inside ordinary prose keeps
   its openness, which is what lets a copied phrase land inline. */
/* the blocks, AND their rows: a selection inside one block slices to
   its rows with the block itself left out (measured: a drag across two
   pairs slices to pairs, open two deep), and rows pasted as rows are
   wrapped back into their block by the schema */
const ROW_BLOCKS = new Set([N.verse, N.prose, N.bullet_list, N.ordered_list, N.table, N.pair, N.line, N.gap, N.list_item, N.table_row]);
export function closeRowSlice(slice: Slice): Slice {
  const first = slice.content.firstChild, last = slice.content.lastChild;
  if (!first || !last) return slice;
  if ((slice.openStart && ROW_BLOCKS.has(first.type)) || (slice.openEnd && ROW_BLOCKS.has(last.type))) {
    return new Slice(slice.content, ROW_BLOCKS.has(first.type) ? 0 : slice.openStart, ROW_BLOCKS.has(last.type) ? 0 : slice.openEnd);
  }
  return slice;
}
