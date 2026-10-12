/* Every item the selection touches moves together, the run stopping at the
   first that cannot move. An item never sits more than one level deeper
   than the one above it, so Tab on a list's first item does nothing;
   Shift-Tab at the outermost level does nothing — leaving a list
   altogether is the source view's job — and each says so (pin:
   listKeys.test › Tab on the first item, or one already nested under its
   neighbour, refuses and says why) (pin: listKeys.test › Shift-Tab at the
   outermost level does nothing and says so). The TWO TRUTHS of the Tab
   refusal: the item is the first of ITS list either way, but when that list
   is nested the writer can see the parent above it, and what stops the
   press is the level it would skip. */
import { type Command, type EditorState, type Transaction, TextSelection } from "prosemirror-state";
import { keymap } from "prosemirror-keymap";
import { chainCommands, splitBlock } from "prosemirror-commands";
import { splitListItem, sinkListItem, liftListItem } from "prosemirror-schema-list";
import type { Plugin } from "prosemirror-state";
import { schema } from "../model/schema.ts";
import { itemNumbers } from "../model/serialize.ts";

const item = schema.nodes.list_item;
function inListItem(state: EditorState): boolean {
  const $from = state.selection.$from;
  return $from.depth >= 2 && $from.node(-1).type === item;
}
function nested(state: EditorState): boolean {
  const $from = state.selection.$from;
  return $from.depth >= 4 && $from.node(-3).type === item;
}
/* THE NEW ITEM GOES ON WITH THE STEP THE TWO ITEMS ABOVE IT RUN: the split
   copied the item's own number, so a countdown read 5, 4, 4. A step of one
   writes no number, the list's own count giving it (pin: listKeys.test ›
   Enter in a countdown counts on down) */
const numbered = (tr: Transaction): Transaction => {
  const $at = tr.selection.$from, d = $at.depth - 1;
  if (d < 1 || $at.node(d).type !== item || $at.node(d - 1).type !== schema.nodes.ordered_list) return tr;
  const list = $at.node(d - 1), i = $at.index(d - 1);
  if (i < 1) return tr;
  const shown = itemNumbers(list), prev = shown[i - 1], step = i >= 2 ? prev - shown[i - 2] : 1;
  return tr.setNodeAttribute($at.before(d), "value", step === 1 ? null : prev + step);
};
const splitNumbered: Command = (state, dispatch) =>
  splitListItem(item)(state, dispatch && ((tr) => dispatch(numbered(tr))));
/* in a paragraph after the item's first, Enter is a paragraph's: the split
   stays in the item (pin: listKeys.test › Enter in an item's second
   paragraph), and on an empty last one steps out to a new item (pin:
   listKeys.test › Enter on an empty last paragraph of an item) */
const inLaterParagraph = (state: EditorState): boolean => state.selection.$from.index(-1) > 0;
const stepOut: Command = (state, dispatch) => {
  const $f = state.selection.$from;
  if ($f.parent.content.size || $f.indexAfter(-1) !== $f.node(-1).childCount || !state.selection.empty) return false;
  if (dispatch) {
    const tr = state.tr.delete($f.before(), $f.after());
    const at = tr.mapping.map($f.after(-1));
    tr.insert(at, item.createAndFill()!);
    tr.setSelection(TextSelection.create(tr.doc, at + 2));
    dispatch(numbered(tr).scrollIntoView());
  }
  return true;
};
export const enterInList: Command = (state, dispatch, view) =>
  inListItem(state) && (inLaterParagraph(state) ? chainCommands(stepOut, splitBlock)(state, dispatch, view) : chainCommands(splitNumbered, liftListItem(item))(state, dispatch, view));
export const tabInList: Command = (state, dispatch, view) => inListItem(state) && sinkListItem(item)(state, dispatch, view);
export const shiftTabInList: Command = (state, dispatch, view) =>
  inListItem(state) && nested(state) && liftListItem(item)(state, dispatch, view);
export function listRefusal(state: EditorState, shift: boolean): string {
  if (shift) return "at the outer level: switch to markdown (⌃⌘M) to remove";
  return nested(state) ? "can't indent an item more than one deeper than its parent" : "can't indent the first item in a list";
}
/* a Tab in a list is CONSUMED whether or not it moved: the press must not
   leave the editor for the browser's focus walk */
export function listKeymap(onRefuse?: (why: string) => void): Plugin {
  const refusing = (cmd: Command, shift: boolean): Command => (state, dispatch, view) => {
    if (!inListItem(state)) return false;
    if (cmd(state, dispatch, view)) return true;
    onRefuse?.(listRefusal(state, shift));
    return true;
  };
  return keymap({ Enter: enterInList, Tab: refusing(tabInList, false), "Shift-Tab": refusing(shiftTabInList, true) });
}
