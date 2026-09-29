/* on an EMPTY LAST LINE the second Enter is the way out, to a paragraph
   below the block, the empty line taken with it (pin: codeKeys.test › Enter
   on an empty last line steps out of the code block into a paragraph) */
import type { Command } from "prosemirror-state";
import { TextSelection } from "prosemirror-state";
import { keymap } from "prosemirror-keymap";
import { schema } from "../model/schema.ts";

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
export const codeKeymap = keymap({ Enter: exitCodeBlock });
