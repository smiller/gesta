import { Fragment, Slice, type ResolvedPos, type Node } from "prosemirror-model";
import { Selection } from "prosemirror-state";
import type { EditorProps } from "prosemirror-view";
import { schema } from "../model/schema.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { renumbered } from "./numbering.ts";

const N = schema.nodes;
export const COPY_MARK = "data-gesta-copy";
/* NO PAGE MARKER LEAVES IN A COPY: pasted into a journal entry it made a
   page number with no book behind it. Where one stood between two spaces,
   one space goes with it (pin: copy.test › a copy carries no page marker out) */
const spacesMeet = (prev: Node | undefined, kept: Node): boolean =>
  !!prev?.isText && prev.text!.endsWith(" ") && kept.isText && kept.text!.startsWith(" ");
function afterPage(kept: Node, prev: Node | undefined): Node | null {
  if (!spacesMeet(prev, kept)) return kept;
  return kept.text!.length > 1 ? kept.cut(1) : null;
}
export function dropPageLabels(frag: Fragment): Fragment {
  const out: Node[] = [];
  let dropped = false;
  frag.forEach((n) => {
    if (n.type === N.page_label) { dropped = true; return; }
    const copy = n.isLeaf ? n : n.copy(dropPageLabels(n.content));
    const kept = dropped ? afterPage(copy, out[out.length - 1]) : copy;
    if (kept) out.push(kept);
    dropped = false;
  });
  return Fragment.fromArray(out);
}
/* `doc`, `from` and `to`: where the selection was cut, so a verse or prose
   block it opens inside is numbered from its first copied line. A cut
   opening at the end of a line starts at the next: the empty row it opened
   with read back as a gap, numbering every line under it one too low (pin:
   copy.test › a copy whose selection opens at the end of a line); so does
   one opening at a list item's end, which copied an empty item (pin:
   copy.test › list items copied from the middle keep their own numbers) */
/* a pair's row ends with its last cell (pin: copy.test › a copy opening at the end of a pair's right cell) */
const inLastCell = ($from: ResolvedPos): boolean => $from.parent.type === N.cell && $from.index(-1) === $from.node(-1).childCount - 1;
const inListParagraph = ($from: ResolvedPos): boolean => $from.parent.type === N.paragraph && $from.depth > 1 && $from.node(-1).type === N.list_item;
const atRowEnd = ($from: ResolvedPos): boolean =>
  ($from.parent.type === N.line || inLastCell($from) || inListParagraph($from)) && $from.parentOffset === $from.parent.content.size;
function pastRowEnd(doc: Node, from: number, to: number | undefined, slice: Slice): { from: number; slice: Slice } {
  const $from = doc.resolve(from);
  if (to === undefined || !atRowEnd($from)) return { from, slice };
  const next = Selection.findFrom(doc.resolve($from.after()), 1, true);
  return next && next.from < to ? { from: next.from, slice: doc.slice(next.from, to, true) } : { from, slice };
}
export function copiedSlice(slice: Slice, doc?: Node, from?: number, to?: number): Slice {
  if (!doc || from === undefined) return closeRowSlice(new Slice(dropPageLabels(slice.content), slice.openStart, slice.openEnd));
  const at = pastRowEnd(doc, from, to, slice);
  const cut = keepRightCell(doc, at.from, renumbered(doc, at.from, doc.copy(at.slice.content)));
  return closeRowSlice(new Slice(dropPageLabels(cut.content), at.slice.openStart, at.slice.openEnd));
}
/* a cut opening inside a pair's right cell keeps the left one, empty:
   without it the right column's text read back as the left's (pin:
   copy.test › lines copied from a block numbered on both sides) */
const rightCellAlone = (node: Node, $at: ResolvedPos, d: number): boolean =>
  node.type === N.pair && $at.node(d).type === N.pair && $at.index(d) === 1 && node.childCount === 1;
function keepRightCell(doc: Node, at: number, cut: Node): Node {
  const $at = doc.resolve(at);
  const mend = (node: Node, d: number): Node => {
    if (d > $at.depth || !node.firstChild) return node;
    if (rightCellAlone(node, $at, d)) {
      return node.copy(Fragment.from([N.cell.create(), node.firstChild]));
    }
    return node.copy(Fragment.from([mend(node.firstChild, d + 1), ...node.content.content.slice(1)]));
  };
  return mend(cut, 0);
}
/* a selection open inside one code block copies its characters, as the
   browser would (pin: copy.test › a selection inside one code block copies
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
   list or a table is CLOSED, so the block travels whole (MEASURED:
   the first line of a copied canto pasted as a paragraph before the
   fence). A slice open inside ordinary prose keeps its openness, which is
   what lets a copied phrase land inline (pin: copy.test › a slice open
   inside a verse row is closed) */
/* the blocks, AND their rows: a selection inside one block slices to its
   rows with the block left out (MEASURED: a drag across two pairs slices to
   pairs, open two deep). A drag across two cards slices to the GRID itself,
   open three deep (MEASURED: a selection's content() keeps its parents)
   (pin: copy.test › a drag across two cards of a grid is closed at the
   grid). The card is not a row (pin: copy.test › a plain card is not a
   row) */
const ROW_BLOCKS = new Set([N.verse, N.prose, N.bullet_list, N.ordered_list, N.table, N.pair, N.line, N.gap, N.skip, N.list_item, N.table_row, N.grid]);
const rowish = (n: Node): boolean => ROW_BLOCKS.has(n.type) && !(n.type === N.grid && n.childCount < 2);
const closedAt = (open: number, edge: Node): number => (open && rowish(edge) ? 0 : open);
export function closeRowSlice(slice: Slice): Slice {
  const first = slice.content.firstChild, last = slice.content.lastChild;
  if (!first || !last) return slice;
  const start = closedAt(slice.openStart, first), end = closedAt(slice.openEnd, last);
  return start === slice.openStart && end === slice.openEnd ? slice : new Slice(slice.content, start, end);
}
/* the editor's copy, as ProseMirror props: the markdown a copy says, and the
   slice it carries, cut from where the selection stands */
export function copyProps(): Pick<EditorProps, "clipboardTextSerializer" | "transformCopied"> {
  return {
    clipboardTextSerializer: (slice) => copyMd(slice),
    transformCopied: (slice, view) => copiedSlice(slice, view.state.doc, view.state.selection.from, view.state.selection.to),
  };
}
