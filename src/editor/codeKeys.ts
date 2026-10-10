import type { Command, EditorState, Plugin } from "prosemirror-state";
import { TextSelection } from "prosemirror-state";
import { keymap } from "prosemirror-keymap";
import { schema } from "../model/schema.ts";
import { sourceTab } from "./sourceKeys.ts";

export const exitCodeBlock: Command = (state, dispatch) => {
  const { $from, empty } = state.selection;
  if (!empty || $from.parent.type !== schema.nodes.code_block) return false;
  const text = $from.parent.textContent;
  if ($from.parentOffset !== text.length || !text.endsWith("\n")) return false;
  if (dispatch) {
    const after = $from.after();
    const tr = state.tr.delete($from.pos - 1, $from.pos);
    const at = tr.mapping.map(after);
    tr.insert(at, schema.nodes.paragraph.create());
    tr.setSelection(TextSelection.create(tr.doc, at + 1)).scrollIntoView();
    dispatch(tr);
  }
  return true;
};
/* the block both ends of the selection stand in, or null */
function codeBlockAt(state: EditorState): { start: number; text: string } | null {
  const { $from, $to } = state.selection;
  if ($from.parent.type !== schema.nodes.code_block || !$from.sameParent($to)) return null;
  return { start: $from.start(), text: $from.parent.textContent };
}
/* Tab over the block's text alone: a selection spilling out of the block is
   not the block's, and Shift-Tab with nothing to take is left to the browser */
export const codeTab = (shift: boolean, onRefuse?: (why: string) => void): Command => (state, dispatch) => {
  const block = codeBlockAt(state);
  if (!block) return false;
  const { from, to } = state.selection;
  const out = sourceTab(block.text, from - block.start, to - block.start, shift);
  if (!out) return false;
  if ("refuse" in out) { onRefuse?.(out.refuse); return true; }
  if (dispatch) {
    const tr = state.tr.insertText(out.value, block.start, block.start + block.text.length);
    dispatch(tr.setSelection(TextSelection.create(tr.doc, block.start + out.start, block.start + out.end)).scrollIntoView());
  }
  return true;
};
/* ⌘A takes the block first, so Tab has a whole block to indent; a press
   over the whole block already, or in an empty one, is the page's */
export const selectCodeBlock: Command = (state, dispatch) => {
  const block = codeBlockAt(state);
  if (!block || !block.text) return false;
  const end = block.start + block.text.length;
  if (state.selection.from === block.start && state.selection.to === end) return false;
  dispatch?.(state.tr.setSelection(TextSelection.create(state.doc, block.start, end)));
  return true;
};
export function codeKeymap(onRefuse?: (why: string) => void): Plugin {
  return keymap({ Enter: exitCodeBlock, Tab: codeTab(false, onRefuse), "Shift-Tab": codeTab(true, onRefuse), "Mod-a": selectCodeBlock });
}
