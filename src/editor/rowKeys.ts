/* THE ROW IS THE UNIT a poem or a parallel edition is written in, so that is
   what every key here makes, joins or leaves — never a cell, never the
   block. THESE RUN BEFORE THE BASE KEYMAP, and inside a row they always
   claim the key: prosemirror-commands' liftEmptyBlock would split the fence
   at an empty row, and joinBackward would join the block's first line into
   the heading above it (both have inline content, so the join is legal)
   (pin: rowKeys.test › Backspace at a row's start: a gap above comes out, a
   line above joins, another shape only takes the caret) */
import { type Command, type EditorState, TextSelection, NodeSelection, Selection, type Transaction } from "prosemirror-state";
import { chainCommands } from "prosemirror-commands";
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

export function blankRowSelected(state: EditorState): boolean {
  return state.selection instanceof NodeSelection && state.selection.node.type === N.gap;
}
/* a new row takes its block's shape: a pair where the block holds one,
   never a full-width row among pairs (pin: rowKeys.test › a blank row
   selected in a paired block) (pin: rowKeys.test › Enter on an empty line
   in a block of pairs) */
function freshRow(block: Node): Node {
  let paired = false;
  block.forEach((row) => { if (row.type === N.pair) paired = true; });
  return paired ? pair(null, Fragment.empty, Fragment.empty) : N.line.create();
}
const textStart = (row: Node): number => row.type === N.pair ? 2 : 1;
const isRow = (n: Node | null): boolean => !!n && (n.type === N.line || n.type === N.pair);

/* a caret in text, never a node selected whole: at a stanza gap the
   nearest selection is the gap itself (pin: rowKeys.test › caretNear) */
export function caretNear(doc: Node, pos: number, dir: 1 | -1 = 1): Selection {
  const $pos = doc.resolve(Math.min(pos, doc.content.size));
  return Selection.findFrom($pos, dir, true) ?? Selection.findFrom($pos, -dir, true) ?? Selection.atStart(doc);
}
/* a blank row selected whole opened for typing: a new row in its place, the caret in it */
export const openBlankRow: Command = (state, dispatch) => {
  if (!blankRowSelected(state)) return false;
  const sel = state.selection, row = freshRow(sel.$from.parent);
  if (dispatch) dispatch(caretAt(state.tr.replaceWith(sel.from, sel.to, row), sel.from + textStart(row)));
  return true;
};
/* a blank row selected whole taken out: the caret to the row on the side
   the key points, past other blank rows, or the other side where there is
   none (pin: rowKeys.test › a blank row selected with no line) (pin:
   rowKeys.test › two blank rows together) */
function dropBlankRow(state: EditorState, dir: 1 | -1): Transaction {
  const sel = state.selection, block = sel.$from.parent, idx = sel.$from.index();
  const reach = (d: 1 | -1): boolean => {
    for (let k = idx + d; ; k += d) { const n = block.maybeChild(k); if (!n || n.type !== N.gap) return isRow(n); }
  };
  const back = -dir as 1 | -1, toward = reach(dir) ? dir : reach(back) ? back : dir;
  const tr = state.tr.delete(sel.from, sel.to);
  return tr.setSelection(caretNear(tr.doc, sel.from, toward)).scrollIntoView();
}

/* two lines with skipped line numbers between them join as two lines
   together do, the skips kept after the joined line: a skip draws nothing,
   so the key reaches the line it can see, and nothing unseen is taken out
   (pin: rowKeys.test › a skipped line number between two lines) */
function joinAcrossSkips(tr: Transaction, block: Node, blockStart: number, idx: number, dir: 1 | -1): Transaction | null {
  let k = idx + dir;
  while (block.maybeChild(k)?.type === N.skip) k += dir;
  const other = block.maybeChild(k);
  if (!other || other.type !== N.line) return null;
  const [upper, lower] = dir < 0 ? [k, idx] : [idx, k];
  let at = blockStart;
  for (let j = 0; j < upper; j++) at += block.child(j).nodeSize;
  const upperEnd = at + block.child(upper).nodeSize - 1;
  let lowerStart = at;
  for (let j = upper; j < lower; j++) lowerStart += block.child(j).nodeSize;
  const lowerRow = block.child(lower);
  tr.delete(lowerStart, lowerStart + lowerRow.nodeSize);
  tr.insert(upperEnd, lowerRow.content);
  return caretAt(tr, upperEnd);
}

export const enterInRow: Command = (state, dispatch) => {
  const sel = state.selection;
  if (blankRowSelected(state)) {
    const row = freshRow(sel.$from.parent);
    if (dispatch) dispatch(caretAt(state.tr.insert(sel.to, row), sel.to + textStart(row)));
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
    /* skipped line numbers after it are no rows of its (pin: rowKeys.test ›
       an empty last line before a trailing skipped line number) */
    let lastRow = true;
    for (let k = idx + 1; k < block.childCount; k++) if (block.child(k).type !== N.skip) lastRow = false;
    if (lastRow) {
      /* THE WAY OUT: an empty last row is taken away and the caret steps
         into a paragraph below the block, so a block ending an entry is
         never a trap (pin: rowKeys.test › Enter at the end of the last line
         makes an empty line) */
      const after = tr.mapping.map($c.after(r.blockDepth));
      tr.delete(start, end);
      const at = after - (end - start);
      tr.insert(at, N.paragraph.create());
      if (dispatch) dispatch(caretAt(tr, at + 1));
      return true;
    }
    const fresh = freshRow(block);
    tr.replaceWith(start, end, [N.gap.create(), fresh]);
    if (dispatch) dispatch(caretAt(tr, start + 1 + textStart(fresh)));
    return true;
  }
  if (r.cell < 0) {
    const atEnd = $c.parentOffset === r.row.content.size, rest = r.row.attrs.kind === "cont" || !!r.row.attrs.label;
    /* text carried off the rest of a split line begins a line of its own;
       a row opened above it is a plain one (pin: rowKeys.test › a ⟨…⟩ row
       split keeps the rest of the line) (pin: rowKeys.test › a lettered line
       split) */
    if (rest && $c.parentOffset === 0) {
      tr.split($c.pos, 1, [{ type: N.line, attrs: r.row.attrs }]);
      tr.setNodeMarkup(start, undefined, { ...r.row.attrs, kind: null, label: null });
    } else tr.split($c.pos, 1, atEnd || rest ? [{ type: N.line }] : undefined);
    if (dispatch) dispatch(caretAt(tr, $c.pos + 2));
    return true;
  }
  const k = $c.parentOffset, a = r.row.child(0).content, b = r.row.child(1).content;
  /* a lettered line stays on its words, a row opened above them a plain one
     (pin: rowKeys.test › a lettered line split) */
  if (r.row.attrs.label && r.cell === 0 && k === 0) {
    const above = pair(null, Fragment.empty, Fragment.empty);
    tr.replaceWith(start, end, [above, r.row]);
    if (dispatch) dispatch(caretAt(tr, start + above.nodeSize + 2));
    return true;
  }
  const own = r.cell === 0 ? a : b;
  const moved = own.size > k;
  const row1 = r.cell === 0 ? pair(r.row.attrs, a.cut(0, k), b) : pair(r.row.attrs, a, b.cut(0, k));
  const carried = moved && !r.row.attrs.label ? r.row.attrs : null;
  const row2 = r.cell === 0 ? pair(carried, a.cut(k), Fragment.empty)
                            : pair(carried, Fragment.empty, b.cut(k));
  tr.replaceWith(start, end, [row1, row2]);
  const row2Start = start + row1.nodeSize;
  const caret = moved && r.cell === 1 ? row2Start + 2 + row2.child(0).nodeSize : row2Start + 2;
  if (dispatch) dispatch(caretAt(tr, caret));
  return true;
};

/* THE EXIT FROM A NOTE THAT IS A ROW. Inside a nested note Enter is the
   note's — the base keymap splits its paragraph — and the way out is the
   family's second Enter on the empty last paragraph. The exit lands in the
   unit its new parent is written in: under a row fence that is a ROW,
   paired where the block holds a pair and full-width where it does not,
   never a bare paragraph (which the markdown arm would read as a
   full-width row, and which a pipe-less block would take as two empty
   cells and go wide). A note left with nothing in it goes with the exit.
   Elsewhere a note's exit is the base keymap's lift, which lands a
   paragraph after the note (pin: rowKeys.test › Enter inside a nested note
   is the note's) */
export const exitNoteRow: Command = (state, dispatch) => {
  const sel = state.selection;
  if (!sel.empty) return false;
  const $c = sel.$from;
  if ($c.depth < 2 || $c.parent.type !== N.paragraph || $c.parent.content.size) return false;
  const note = $c.node(-1), block = $c.node(-2);
  if ((note.type !== N.note && note.type !== N.margin_note) || (block.type !== N.verse && block.type !== N.prose)) return false;
  if ($c.index(-1) !== note.childCount - 1) return false;
  const tr = state.tr;
  const after = $c.after(-1);
  if (note.childCount === 1) tr.delete($c.before(-1), after);
  else tr.delete($c.before(), $c.after());
  const at = tr.mapping.map(after, -1);
  const row = freshRow(block);
  tr.insert(at, row);
  if (dispatch) dispatch(caretAt(tr, at + textStart(row)));
  return true;
};

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
  if (blankRowSelected(state)) {
    if (dispatch) dispatch(dropBlankRow(state, -1));
    return true;
  }
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
  if (prev.type === N.skip && r.cell < 0) {
    const joined = joinAcrossSkips(tr, r.block, $c.start(r.blockDepth), idx, -1);
    if (joined) { if (dispatch) dispatch(joined.scrollIntoView()); return true; }
  }
  /* a different shape above: the caret goes to its end, nothing joins */
  if (dispatch) dispatch(tr.setSelection(Selection.near(tr.doc.resolve(start), -1)).scrollIntoView());
  return true;
};

export const deleteInRow: Command = (state, dispatch) => {
  const sel = state.selection;
  if (blankRowSelected(state)) {
    if (dispatch) dispatch(dropBlankRow(state, 1));
    return true;
  }
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
  if (next.type === N.skip && r.cell < 0) {
    const joined = joinAcrossSkips(tr, r.block, $c.start(r.blockDepth), idx, 1);
    if (joined) { if (dispatch) dispatch(joined.scrollIntoView()); return true; }
  }
  if (dispatch) dispatch(tr.setSelection(Selection.near(tr.doc.resolve(end), 1)).scrollIntoView());
  return true;
};

/* in a line both are consumed, so the key never leaves the editor from
   inside a fence (pin: rowKeys.test › Tab moves from the original to its
   translation and Shift-Tab back) */
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

/* every row the selection touches is declared a line, or — when every one
   of them already is — returned to the convention (pin: rowKeys.test › ⌃⌘I
   declares the selection's rows lines). Over the selection rather than
   the caret's row alone because a song is several lines, and marking it
   is one gesture. Rows in the selection that are gaps or notes are passed
   over; outside a fence the command is not this editor's. */
export const toggleDeclaredLine: Command = (state, dispatch) => {
  const { from, to } = state.selection;
  const rows: { pos: number; node: Node }[] = [];
  state.doc.nodesBetween(from, to, (node, pos, parent) => {
    if ((node.type === N.line || node.type === N.pair) && parent && (parent.type === N.verse || parent.type === N.prose)) {
      rows.push({ pos, node });
      return false;
    }
    return true;
  });
  if (!rows.length) return false;
  /* the rest of a split line is a line already, and keeps its kind (pin:
     rowKeys.test › ⌃⌘I declares the selection's rows lines) */
  const own = rows.filter((r) => r.node.attrs.kind !== "cont");
  const kind = own.every((r) => r.node.attrs.kind === "line") ? null : "line";
  if (dispatch) {
    const tr = state.tr;
    for (const r of own) tr.setNodeMarkup(r.pos, undefined, { ...r.node.attrs, kind });
    dispatch(tr);
  }
  return true;
};

/* ⌃⌘I, "italic, but a line"; not ⌃⌘N, which is "new" */
export const rowKeymap = keymap({
  "Ctrl-Mod-i": toggleDeclaredLine,
  Enter: chainCommands(enterInRow, exitNoteRow),
  "Shift-Enter": enterInRow,
  Backspace: backspaceInRow,
  Delete: deleteInRow,
  Tab: tabInRow,
  "Shift-Tab": shiftTabInRow,
});
