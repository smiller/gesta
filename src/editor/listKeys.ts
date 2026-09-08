/* The gestures in a list, ahead of the base keymap: Enter makes the next
   item, parallel to this one, or steps an empty last item out into a
   paragraph; Tab nests the item under the one above and Shift-Tab lifts
   it back out, every item the selection touches moving together and the
   run stopping at the first that cannot move. The README's rules
   (2026-09-07): an item never sits more than one level deeper than the
   one above it, so Tab on a list's first item does nothing; Shift-Tab at
   the outermost level does nothing — leaving a list altogether is the
   source view's job — and each says so in the corner. The commands are
   prosemirror-schema-list's over the schema's list_item; what is this
   module's is the gate, the floor, and the two truths of the Tab
   refusal: the item is the first of ITS list either way, but when that
   list is nested the writer can see the parent above it, and what stops
   the press is the level it would skip. */
import { type Command, type EditorState } from "prosemirror-state";
import { keymap } from "prosemirror-keymap";
import { chainCommands } from "prosemirror-commands";
import { splitListItem, sinkListItem, liftListItem } from "prosemirror-schema-list";
import type { Plugin } from "prosemirror-state";
import { schema } from "../model/schema.ts";

const item = schema.nodes.list_item;
function inListItem(state: EditorState): boolean {
  const $from = state.selection.$from;
  return $from.depth >= 2 && $from.node(-1).type === item;
}
/* is the item's list itself inside an item */
function nested(state: EditorState): boolean {
  const $from = state.selection.$from;
  return $from.depth >= 4 && $from.node(-3).type === item;
}
export const enterInList: Command = (state, dispatch, view) =>
  inListItem(state) && chainCommands(splitListItem(item), liftListItem(item))(state, dispatch, view);
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
