/* The editor: a ProseMirror view over the document model, with the row node
   views, the line-number decoration, the row gestures (rowKeys.ts) and the
   list gestures (listKeys.ts) ahead of the base keymap, and markdown as
   you type (typing.ts). */
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
import { linkClick } from "./links.ts";
import { listKeymap } from "./listKeys.ts";
import { formatKeymap } from "./format.ts";
import { codeKeymap } from "./codeKeys.ts";
import { pasteSlice, copyMd } from "./paste.ts";
import { landing } from "./landing.ts";
import { codeHighlight } from "./codeHighlight.ts";
import { pastedImageFile } from "./images.ts";

export interface EditorOptions {
  interval: number;
  onChange?: (view: EditorView) => void;
  /* the selection moved, by a gesture or a command: what places the bar */
  onSelect?: (view: EditorView) => void;
  /* node views beyond the rows' — the image view the session supplies */
  nodeViews?: Record<string, NodeViewConstructor>;
  /* a plain click on an internal link: the fragment to route to */
  onRoute?: (frag: string) => void;
  /* a swallowed press that changed nothing SAYS why */
  onRefuse?: (why: string) => void;
  /* a picture on the clipboard: the session files it and places it */
  onPasteFile?: (file: File) => void;
}

const hardBreak: Command = (state, dispatch) => {
  dispatch?.(state.tr.replaceSelectionWith(schema.nodes.hard_break.create()).scrollIntoView());
  return true;
};

export function editorState(doc: Node, interval: number, onRefuse?: (why: string) => void): EditorState {
  return EditorState.create({
    doc,
    plugins: [
      history(),
      keymap({ "Mod-z": undo, "Mod-Shift-z": redo, "Mod-y": redo }),
      rowKeymap,
      typingKeymap,
      listKeymap(onRefuse),
      codeKeymap,
      formatKeymap,
      keymap({ "Shift-Enter": chainCommands(exitCode, hardBreak) }),
      keymap(baseKeymap),
      typing(),
      lineNumbers(interval),
      fittedMeasure(),
      folios(),
      landing(),
      codeHighlight(),
    ],
  });
}

export function createEditor(mount: HTMLElement, doc: Node, opts: EditorOptions): EditorView {
  return new EditorView(mount, {
    state: editorState(doc, opts.interval, opts.onRefuse),
    nodeViews: { ...rowNodeViews, ...(opts.nodeViews || {}) },
    attributes: { class: "page", spellcheck: "false" },
    /* the typed pipe, before the character lands: in a line it makes the
       pair; anywhere else it is the character */
    handleTextInput: (view, _from, _to, text) => text === "|" && pipeInLine(view.state, view.dispatch),
    handleDOMEvents: { click: linkClick((frag) => opts.onRoute?.(frag)) },
    /* plain text pasted renders the markdown it spells; the copied text is
       the selection's markdown (paste.ts) */
    handlePaste: (_view, event) => { const file = pastedImageFile(event.clipboardData); if (!file) return false; opts.onPasteFile?.(file); return true; },
    clipboardTextParser: (text, $context) => pasteSlice(text, $context),
    clipboardTextSerializer: (slice) => copyMd(slice),
    dispatchTransaction(this: EditorView, tr: Transaction) {
      this.updateState(this.state.apply(tr));
      if (tr.docChanged) opts.onChange?.(this);
      if (tr.selectionSet || tr.docChanged) opts.onSelect?.(this);
    },
  });
}
