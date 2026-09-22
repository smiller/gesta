/* The gestures at a grid's edges (2026-09-22). A grid is isolating, so the
   base keymap lifts and joins nothing ACROSS its edge; what it would still
   do inside — join two cards under Backspace at a card's start or Delete at
   its end — is refused here with a whisper, because a grid's shape is the
   source view's. The one way out: Enter on the empty last line of the LAST
   card places a paragraph after the grid, there being no gap cursor; on any
   other card's empty last line the command declines and the base keymap
   adds a line, since the lift it would try finds no target past the grid. */
import { type Command, type EditorState, type Plugin, TextSelection } from "prosemirror-state";
import { keymap } from "prosemirror-keymap";
import type { ResolvedPos } from "prosemirror-model";
import { schema } from "../model/schema.ts";

const G = schema.nodes.grid, C = schema.nodes.card, P = schema.nodes.paragraph;
export const GRID_JOIN = "a grid's cards are joined in the source view (⌃⌘M)";

/* the depth of the card holding the caret's textblock directly, when that
   card is a grid's; 0 otherwise */
function cardInGrid($pos: ResolvedPos): number {
  const d = $pos.depth;
  return d >= 2 && $pos.node(d - 1).type === C && $pos.node(d - 2).type === G ? d - 1 : 0;
}

export function atCardEdge(state: EditorState, backward: boolean): boolean {
  const { $from, empty } = state.selection;
  const cd = empty ? cardInGrid($from) : 0;
  if (!cd) return false;
  const index = $from.index(cd);
  return backward ? $from.parentOffset === 0 && index === 0
    : $from.parentOffset === $from.parent.content.size && index === $from.node(cd).childCount - 1;
}

export const enterOutOfGrid: Command = (state, dispatch) => {
  const { $from, empty } = state.selection;
  if (!empty || $from.parent.type !== P || $from.parent.content.size) return false;
  const cd = cardInGrid($from);
  if (!cd) return false;
  const card = $from.node(cd), grid = $from.node(cd - 1);
  if ($from.index(cd) !== card.childCount - 1 || $from.index(cd - 1) !== grid.childCount - 1) return false;
  if (dispatch) {
    const tr = state.tr;
    if (card.childCount > 1) tr.delete($from.before(), $from.after());
    const at = tr.mapping.map($from.after(cd - 1));
    tr.insert(at, P.create());
    tr.setSelection(TextSelection.create(tr.doc, at + 1));
    dispatch(tr.scrollIntoView());
  }
  return true;
};

export function gridKeymap(onRefuse?: (why: string) => void): Plugin {
  const refusing = (backward: boolean): Command => (state) => {
    if (!atCardEdge(state, backward)) return false;
    onRefuse?.(GRID_JOIN);
    return true;
  };
  return keymap({ Enter: enterOutOfGrid, Backspace: refusing(true), Delete: refusing(false) });
}
