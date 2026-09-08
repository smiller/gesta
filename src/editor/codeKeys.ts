/* Enter in a code block: a newline, as the base keymap types it — except
   on an EMPTY LAST LINE, where the second Enter is the way out, to a
   paragraph below the block (the README's rule for a quote, a code
   block, a card, a verse block and a note; the others fall to the base
   keymap's lift or the row keys, the code block alone needed an arm —
   found by hand 2026-09-07). The empty line is taken with it. */
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
