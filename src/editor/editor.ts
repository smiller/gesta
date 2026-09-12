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
import { DOMSerializer, type Node } from "prosemirror-model";
import { inlineBlockStyles } from "./inlineStyles.ts";
import { lineNumbers } from "./lineNumbers.ts";
import { rowNodeViews } from "./rows.ts";
import { linkClick } from "./links.ts";
import { listKeymap } from "./listKeys.ts";
import { formatKeymap } from "./format.ts";
import { codeKeymap } from "./codeKeys.ts";
import { quoteKeymap } from "./quoteKeys.ts";
import { pasteSlice, pasteBlocks, placeBlocks, copyMd, closeRowSlice } from "./paste.ts";
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
      quoteKeymap(onRefuse),
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
  const base = DOMSerializer.fromSchema(schema);
  const view: EditorView = new EditorView(mount, {
    /* ⌘C's HTML flavour with the look swept inline (richCopy.ts): parked
       under the surface for the length of the sweep, since a detached
       node's computed style is empty. Without it a card copied by
       selection arrives in Mail as uncoloured lines, as the hover copy
       did until 2026-09-08. */
    clipboardSerializer: {
      serializeFragment: (frag, options) => {
        const out = base.serializeFragment(frag, options);
        const stage = document.createElement("div");
        stage.setAttribute("aria-hidden", "true");
        stage.style.cssText = "position:absolute;left:-9999px;top:0;width:" + view.dom.clientWidth + "px";
        try {
          stage.appendChild(out);
          view.dom.appendChild(stage);
          inlineBlockStyles(stage, stage);
          while (stage.firstChild) out.appendChild(stage.firstChild);
        } finally { stage.remove(); }
        return out;
      },
      serializeNode: (node, options) => base.serializeNode(node, options),
    } as DOMSerializer,
    state: editorState(doc, opts.interval, opts.onRefuse),
    nodeViews: { ...rowNodeViews, ...(opts.nodeViews || {}) },
    attributes: { class: "page", spellcheck: "false" },
    /* the typed pipe, before the character lands: in a line it makes the
       pair; anywhere else it is the character */
    handleTextInput: (view, _from, _to, text) => text === "|" && pipeInLine(view.state, view.dispatch),
    handleDOMEvents: { mousedown: linkClick((frag) => opts.onRoute?.(frag), "mousedown"), click: linkClick((frag) => opts.onRoute?.(frag), "click") },
    /* plain text pasted renders the markdown it spells; the copied text is
       the selection's markdown (paste.ts) */
    handlePaste: (view, event) => {
      const file = pastedImageFile(event.clipboardData);
      if (file) { opts.onPasteFile?.(file); return true; }
      /* plain text spelling blocks is SET DOWN, not fitted (paste.ts);
         text carrying the editor's own HTML keeps the editor's paste */
      const data = event.clipboardData;
      if (!data || data.types.includes("text/html")) return false;
      const blocks = pasteBlocks(data.getData("text/plain"), view.state.selection.$from);
      if (!blocks) return false;
      view.dispatch(placeBlocks(view.state, blocks).scrollIntoView());
      return true;
    },
    clipboardTextParser: (text, $context) => pasteSlice(text, $context),
    clipboardTextSerializer: (slice) => copyMd(closeRowSlice(slice)),
    transformCopied: (slice) => closeRowSlice(slice),
    dispatchTransaction(this: EditorView, tr: Transaction) {
      /* A SCROLL NEEDS THE FOCUS FIRST: ProseMirror writes a selection to
         the DOM only while the editor has focus, and skips its
         scroll-to-selection when the DOM selection is not in the editor
         (READ in prosemirror-view 1.42.3, selectionToDOM and
         scrollToSelection) — so a `scrollIntoView()` dispatched at an
         unfocused view, a freshly mounted one above all, never scrolled:
         a reference link into Paradise Lost 1.254 landed at the top of
         the book (found by hand 2026-09-12). Taken here, once, rather
         than at each site — the review of the same day found the rule
         applied by hand at five and the next site missing it. Gated on
         the scroll: an unconditional focus would take it from a panel's
         input on a background dispatch, a refresh after a rename. */
      if (tr.scrolledIntoView && !this.hasFocus()) this.focus();
      this.updateState(this.state.apply(tr));
      if (tr.docChanged) opts.onChange?.(this);
      if (tr.selectionSet || tr.docChanged) opts.onSelect?.(this);
    },
  });
  return view;
}
