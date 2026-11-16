import { type Command, type Plugin, type Transaction, TextSelection } from "prosemirror-state";
import { keymap } from "prosemirror-keymap";
import type { ResolvedPos } from "prosemirror-model";
import { schema } from "../model/schema.ts";

const CELL = schema.nodes.table_cell, P = schema.nodes.paragraph;

/* the end of the cell in the column below, the row below being shorter
   taking its last cell */
function cellBelow($head: ResolvedPos, d: number): number {
  const table = $head.node(d - 2), below = table.child($head.index(d - 2) + 1);
  const column = Math.min($head.index(d - 1), below.childCount - 1);
  let pos = $head.after(d - 1) + 1;
  for (let i = 0; i < column; i++) pos += below.child(i).nodeSize;
  return pos + 1 + below.child(column).content.size;
}
function outOfTable(tr: Transaction, $head: ResolvedPos, d: number): Transaction | null {
  const after = $head.after(d - 2), next = tr.doc.resolve(after).nodeAfter;
  if (next?.isTextblock) return tr.setSelection(TextSelection.create(tr.doc, after + 1));
  const parent = $head.node(d - 3), index = $head.index(d - 3) + 1;
  if (!parent.canReplaceWith(index, index, P)) return null;
  tr.insert(after, P.create());
  return tr.setSelection(TextSelection.create(tr.doc, after + 1));
}
/* Enter goes a cell down, as in a spreadsheet, and from the last row out
   of the table; split, the cell became a new cell in its row (pin:
   tableKeys.test › Enter in a cell goes to the end of the cell below); a
   selection is deleted first, as Enter does anywhere (pin: tableKeys.test ›
   Enter over a selection in a cell) */
export const enterDown: Command = (state, dispatch) => {
  if (state.selection.$head.parent.type !== CELL) return false;
  const start = state.selection.empty ? state.tr : state.tr.deleteSelection();
  const { $head } = start.selection, d = $head.depth;
  if ($head.parent.type !== CELL) return false;
  const lastRow = $head.index(d - 2) === $head.node(d - 2).childCount - 1;
  const tr = lastRow ? outOfTable(start, $head, d) : start.setSelection(TextSelection.create(start.doc, cellBelow($head, d)));
  if (!tr) return false;
  dispatch?.(tr.scrollIntoView());
  return true;
};

export const tableKeymap: Plugin = keymap({ Enter: enterDown });
