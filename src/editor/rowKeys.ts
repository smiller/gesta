/* The gestures under a verse or prose fence. THE ROW IS THE UNIT a poem or a
   parallel edition is written in, so that is what every key here makes,
   joins or leaves — never a cell, never the block. Ported in intent from
   ../writer/src/js/11b-the-fence-family.js (fenceBlockEnter, newRowIn) and
   tests.html's "Enter on a verse page"; what the model adds is the pair
   made and unmade in place: a typed pipe splits a line at the caret, and
   Backspace at the translation's start joins the two cells back.
   THESE RUN BEFORE THE BASE KEYMAP, and inside a row they always claim the
   key: prosemirror-commands' liftEmptyBlock would split the fence at an
   empty row, and joinBackward would join the block's first line into the
   heading above it (both have inline content, so the join is legal). */
import { type Command, TextSelection, NodeSelection, Selection, type Transaction } from "prosemirror-state";
import { Fragment, type Node, type ResolvedPos } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { schema } from "../model/schema.ts";

const N = schema.nodes;

interface Row {
  row: Node;
  rowDepth: number;
  block: Node;
  blockDepth: number;
  /* which cell of a pair the position is in; -1 in a line */
  cell: -1 | 0 | 1;
}

/* the row a position is in, or null: a paragraph in a note inside the
   fence is the note's, not the row's */
function rowOf($pos: ResolvedPos): Row | null {
  for (let d = $pos.depth; d > 0; d--) {
    const n = $pos.node(d);
    if (n.type === N.line || n.type === N.pair) {
      const block = $pos.node(d - 1);
      if (block.type !== N.verse && block.type !== N.prose) return null;
      return { row: n, rowDepth: d, block, blockDepth: d - 1, cell: n.type === N.pair ? ($pos.index(d) as 0 | 1) : -1 };
    }
    if (n.type !== N.cell) return null;
  }
  return null;
}

function blank(row: Node): boolean {
  return row.type === N.pair ? row.child(0).content.size === 0 && row.child(1).content.size === 0 : row.content.size === 0;
}

function pair(attrs: Node["attrs"] | null, a: Fragment, b: Fragment): Node {
  return N.pair.create(attrs, [N.cell.create(null, a), N.cell.create(null, b)]);
}

function caretAt(tr: Transaction, pos: number): Transaction {
  return tr.setSelection(TextSelection.create(tr.doc, pos)).scrollIntoView();
}

/* the pair as one line again, the caret at the seam */
function unpair(tr: Transaction, $c: ResolvedPos, r: Row): Transaction {
  const a = r.row.child(0), b = r.row.child(1);
  const start = $c.before(r.rowDepth);
  tr.replaceWith(start, $c.after(r.rowDepth), N.line.create(r.row.attrs, a.content.append(b.content)));
  return caretAt(tr, start + 1 + a.content.size);
}

export const enterInRow: Command = (state, dispatch) => {
  const sel = state.selection;
  /* a stanza gap selected: a line after it */
  if (sel instanceof NodeSelection && sel.node.type === N.gap) {
    if (dispatch) dispatch(caretAt(state.tr.insert(sel.to, N.line.create()), sel.to + 1));
    return true;
  }
  const r0 = rowOf(sel.$from);
  if (!r0 || (!sel.empty && !sel.$from.sameParent(sel.$to))) return false;
  const tr = state.tr;
  if (!sel.empty) tr.deleteSelection();
  const $c = tr.selection.$from;
  const r = rowOf($c)!;
  const start = $c.before(r.rowDepth), end = $c.after(r.rowDepth);
  if (blank(r.row)) {
    const block = $c.node(r.blockDepth), idx = $c.index(r.blockDepth);
    if (idx === block.childCount - 1) {
      /* THE WAY OUT: an empty last row is taken away and the caret steps
         into a paragraph below the block, so a block ending an entry is
         never a trap */
      const after = tr.mapping.map($c.after(r.blockDepth));
      tr.delete(start, end);
      const at = after - (end - start);
      tr.insert(at, N.paragraph.create());
      if (dispatch) dispatch(caretAt(tr, at + 1));
      return true;
    }
    /* mid-block an empty row twice over is a stanza break, then a fresh
       row of the same shape — as two Enters in prose make a blank line */
    const fresh = r.row.type === N.pair ? pair(null, Fragment.empty, Fragment.empty) : N.line.create();
    tr.replaceWith(start, end, [N.gap.create(), fresh]);
    if (dispatch) dispatch(caretAt(tr, start + 2 + (r.cell < 0 ? 0 : 1)));
    return true;
  }
  if (r.cell < 0) {
    /* a line splits where the caret is; made at its end, the new line is a
       plain one, so a ⟨line⟩ row hands its declaration only to its own tail */
    const atEnd = $c.parentOffset === r.row.content.size;
    tr.split($c.pos, 1, atEnd ? [{ type: N.line }] : undefined);
    if (dispatch) dispatch(caretAt(tr, $c.pos + 2));
    return true;
  }
  /* a pair splits the caret's CELL: the text after the caret goes to a new
     row beneath, the other cell stays whole with the row above. At a cell's
     end nothing moves and the new row is empty, the caret in its original. */
  const k = $c.parentOffset, a = r.row.child(0).content, b = r.row.child(1).content;
  const own = r.cell === 0 ? a : b;
  const moved = own.size > k;
  const row1 = r.cell === 0 ? pair(r.row.attrs, a.cut(0, k), b) : pair(r.row.attrs, a, b.cut(0, k));
  const row2 = r.cell === 0 ? pair(moved ? r.row.attrs : null, a.cut(k), Fragment.empty)
                            : pair(moved ? r.row.attrs : null, Fragment.empty, b.cut(k));
  tr.replaceWith(start, end, [row1, row2]);
  const row2Start = start + row1.nodeSize;
  const caret = moved && r.cell === 1 ? row2Start + 2 + row2.child(0).nodeSize : row2Start + 2;
  if (dispatch) dispatch(caretAt(tr, caret));
  return true;
};

/* a typed pipe in a line: the text after the caret becomes its translation.
   In a cell a pipe is a pipe (the serializer escapes it), and in prose it
   is not this command's. */
export const pipeInLine: Command = (state, dispatch) => {
  const sel = state.selection;
  const r = rowOf(sel.$from);
  if (!r || r.cell >= 0 || (!sel.empty && !sel.$from.sameParent(sel.$to))) return false;
  const tr = state.tr;
  if (!sel.empty) tr.deleteSelection();
  const $c = tr.selection.$from, line = $c.parent, k = $c.parentOffset;
  const start = $c.before($c.depth);
  tr.replaceWith(start, $c.after($c.depth), pair(line.attrs, line.content.cut(0, k), line.content.cut(k)));
  if (dispatch) dispatch(caretAt(tr, start + k + 4));
  return true;
};

export const backspaceInRow: Command = (state, dispatch) => {
  const sel = state.selection;
  if (!sel.empty || !(sel instanceof TextSelection)) return false;
  const $c = sel.$from, r = rowOf($c);
  if (!r || $c.parentOffset > 0) return false;
  const tr = state.tr;
  if (r.cell === 1) {
    if (dispatch) dispatch(unpair(tr, $c, r));
    return true;
  }
  const idx = $c.index(r.blockDepth), start = $c.before(r.rowDepth);
  const prev = idx > 0 ? r.block.child(idx - 1) : null;
  /* the block's first row: nothing above it is a row, and the heading above
     the fence is not to be joined into */
  if (!prev) return true;
  if (prev.type === N.gap) { if (dispatch) dispatch(tr.delete(start - 1, start).scrollIntoView()); return true; }
  if (prev.type === N.line && r.cell < 0) { if (dispatch) dispatch(tr.join(start).scrollIntoView()); return true; }
  /* a different shape above: the caret goes to its end, nothing joins */
  if (dispatch) dispatch(tr.setSelection(Selection.near(tr.doc.resolve(start), -1)).scrollIntoView());
  return true;
};

export const deleteInRow: Command = (state, dispatch) => {
  const sel = state.selection;
  if (!sel.empty || !(sel instanceof TextSelection)) return false;
  const $c = sel.$from, r = rowOf($c);
  if (!r || $c.parentOffset < $c.parent.content.size) return false;
  const tr = state.tr;
  if (r.cell === 0) {
    if (dispatch) dispatch(unpair(tr, $c, r));
    return true;
  }
  const idx = $c.index(r.blockDepth), end = $c.after(r.rowDepth);
  const next = r.block.maybeChild(idx + 1);
  if (!next) return true;
  if (next.type === N.gap) { if (dispatch) dispatch(tr.delete(end, end + 1).scrollIntoView()); return true; }
  if (next.type === N.line && r.cell < 0) { if (dispatch) dispatch(tr.join(end).scrollIntoView()); return true; }
  if (dispatch) dispatch(tr.setSelection(Selection.near(tr.doc.resolve(end), 1)).scrollIntoView());
  return true;
};

/* Tab crosses the pipe: original to translation, Shift-Tab back. In a line
   both are consumed, so the key never leaves the editor from inside a fence. */
export const tabInRow: Command = (state, dispatch) => {
  const $c = state.selection.$from, r = rowOf($c);
  if (!r) return false;
  if (r.cell === 0 && dispatch) dispatch(caretAt(state.tr, $c.after($c.depth) + 1));
  return true;
};
export const shiftTabInRow: Command = (state, dispatch) => {
  const $c = state.selection.$from, r = rowOf($c);
  if (!r) return false;
  if (r.cell === 1 && dispatch) dispatch(caretAt(state.tr, $c.before($c.depth) - 1));
  return true;
};

export const rowKeymap = keymap({
  Enter: enterInRow,
  "Shift-Enter": enterInRow,
  Backspace: backspaceInRow,
  Delete: deleteInRow,
  Tab: tabInRow,
  "Shift-Tab": shiftTabInRow,
});
