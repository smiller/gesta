/* The editor: a ProseMirror view over the document model, with the row node
   views, the line-number decoration, the row gestures (rowKeys.ts) ahead of
   the base keymap, and markdown as you type (typing.ts). */
import { EditorState, type Transaction, type Command } from "prosemirror-state";
import { EditorView, type NodeViewConstructor } from "prosemirror-view";
import { history, undo, redo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { baseKeymap, chainCommands, exitCode } from "prosemirror-commands";
import { schema } from "../model/schema.ts";
import { rowKeymap, pipeInLine } from "./rowKeys.ts";
import { fittedMeasure } from "./fit.ts";
import { folios } from "./folios.ts";
import { typing, typingKeymap } from "./typing.ts";
import type { Node } from "prosemirror-model";
import { lineNumbers } from "./lineNumbers.ts";
import { rowNodeViews } from "./rows.ts";

export interface EditorOptions {
  interval: number;
  onChange?: (view: EditorView) => void;
  /* node views beyond the rows' — the image view the session supplies */
  nodeViews?: Record<string, NodeViewConstructor>;
}

const hardBreak: Command = (state, dispatch) => {
  dispatch?.(state.tr.replaceSelectionWith(schema.nodes.hard_break.create()).scrollIntoView());
  return true;
};

export function editorState(doc: Node, interval: number): EditorState {
  return EditorState.create({
    doc,
    plugins: [
      history(),
      keymap({ "Mod-z": undo, "Mod-Shift-z": redo, "Mod-y": redo }),
      rowKeymap,
      typingKeymap,
      keymap({ "Shift-Enter": chainCommands(exitCode, hardBreak) }),
      keymap(baseKeymap),
      typing(),
      lineNumbers(interval),
      fittedMeasure(),
      folios(),
    ],
  });
}

export function createEditor(mount: HTMLElement, doc: Node, opts: EditorOptions): EditorView {
  return new EditorView(mount, {
    state: editorState(doc, opts.interval),
    nodeViews: { ...rowNodeViews, ...(opts.nodeViews || {}) },
    attributes: { class: "page", spellcheck: "false" },
    /* the typed pipe, before the character lands: in a line it makes the
       pair; anywhere else it is the character */
    handleTextInput: (view, _from, _to, text) => text === "|" && pipeInLine(view.state, view.dispatch),
    dispatchTransaction(this: EditorView, tr: Transaction) {
      this.updateState(this.state.apply(tr));
      if (tr.docChanged) opts.onChange?.(this);
    },
  });
}
