/* The editor: a ProseMirror view over the document model, with the row node
   views and the line-number decoration. Keymaps and input rules for the
   fence family come later in phase 1; what is here is the base keymap and
   history, enough to type into the fixture and watch the numbers follow. */
import { EditorState, type Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { history, undo, redo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import type { Node } from "prosemirror-model";
import { lineNumbers } from "./lineNumbers.ts";
import { rowNodeViews } from "./rows.ts";

export interface EditorOptions {
  interval: number;
  onChange?: (view: EditorView) => void;
}

export function editorState(doc: Node, interval: number): EditorState {
  return EditorState.create({
    doc,
    plugins: [
      history(),
      keymap({ "Mod-z": undo, "Mod-Shift-z": redo, "Mod-y": redo }),
      keymap(baseKeymap),
      lineNumbers(interval),
    ],
  });
}

export function createEditor(mount: HTMLElement, doc: Node, opts: EditorOptions): EditorView {
  return new EditorView(mount, {
    state: editorState(doc, opts.interval),
    nodeViews: rowNodeViews,
    attributes: { class: "page", spellcheck: "false" },
    dispatchTransaction(this: EditorView, tr: Transaction) {
      this.updateState(this.state.apply(tr));
      if (tr.docChanged) opts.onChange?.(this);
    },
  });
}
