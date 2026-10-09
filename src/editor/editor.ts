import { EditorState, Plugin, PluginKey, type Transaction, type Command } from "prosemirror-state";
import { EditorView, type NodeViewConstructor } from "prosemirror-view";
import { history, undo, redo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { baseKeymap, chainCommands, exitCode } from "prosemirror-commands";
import { schema } from "../model/schema.ts";
import { rowKeymap, pipeInLine } from "./rowKeys.ts";
import { fittedMeasure } from "./fit.ts";
import { marginNotes } from "./margins.ts";
import { folios } from "./folios.ts";
import { typing, typingKeymap, autolinkEnter } from "./typing.ts";
import { DOMSerializer, type Node } from "prosemirror-model";
import { inlineBlockStyles } from "./inlineStyles.ts";
import { lineNumbers } from "./lineNumbers.ts";
import { rowNodeViews } from "./rows.ts";
import { linkClick } from "./links.ts";
import { listKeymap } from "./listKeys.ts";
import { formatKeymap } from "./format.ts";
import { codeKeymap } from "./codeKeys.ts";
import { quoteKeymap } from "./quoteKeys.ts";
import { gridKeymap } from "./gridKeys.ts";
import { pasteSlice, pasteBlocks, placeBlocks, copyMd, copiedSlice, onlyLineBreaks } from "./paste.ts";
import { landing } from "./landing.ts";
import { codeHighlight } from "./codeHighlight.ts";
import { pastedImageFile } from "./images.ts";
import { folds, type FoldOptions } from "./folds.ts";

export interface EditorOptions {
  interval: number;
  onChange?: (view: EditorView) => void;
  onSelect?: (view: EditorView) => void;
  nodeViews?: Record<string, NodeViewConstructor>;
  /* a plain click on an internal link: the fragment to route to */
  onRoute?: (frag: string) => void;
  /* a swallowed press that changed nothing SAYS why */
  onRefuse?: (why: string) => void;
  onPasteFile?: (file: File) => void;
  folds?: FoldOptions;
}

const hardBreak: Command = (state, dispatch) => {
  dispatch?.(state.tr.replaceSelectionWith(schema.nodes.hard_break.create()).scrollIntoView());
  return true;
};

/* locked, no change lands from anywhere — a key, the toolbar, an insert
   from outside: the editable prop alone stops only the keys
   (pin: editor.test › a locked entry takes no change from anywhere) */
export const lockKey = new PluginKey<boolean>("lock");
const lock = new Plugin<boolean>({
  key: lockKey,
  state: { init: () => false, apply: (tr, on) => (tr.getMeta(lockKey) as boolean | undefined) ?? on },
  filterTransaction: (tr, state) => !tr.docChanged || !lockKey.getState(state),
});
/* the change that LANDED is told, not the one asked: a locked entry's
   refused edit still asked for a save of the text an import then wrote
   over (pin: editor.test › a change refused by the lock is told as nothing that landed) */
export function landed(before: EditorState, after: EditorState): { changed: boolean; selected: boolean } {
  const changed = after.doc !== before.doc;
  return { changed, selected: changed || after.selection !== before.selection };
}
export function editorState(doc: Node, interval: number, onRefuse?: (why: string) => void, foldOpts?: FoldOptions): EditorState {
  return EditorState.create({
    doc,
    plugins: [
      lock,
      history(),
      keymap({ "Mod-z": undo, "Mod-Shift-z": redo, "Mod-y": redo }),
      rowKeymap,
      autolinkEnter,
      typingKeymap,
      listKeymap(onRefuse),
      quoteKeymap(onRefuse),
      gridKeymap(onRefuse),
      codeKeymap,
      formatKeymap,
      keymap({ "Shift-Enter": chainCommands(exitCode, hardBreak) }),
      keymap(baseKeymap),
      typing(),
      lineNumbers(interval),
      fittedMeasure(),
      marginNotes(),
      folios(),
      landing(),
      codeHighlight(),
      folds(foldOpts),
    ],
  });
}

export function createEditor(mount: HTMLElement, doc: Node, opts: EditorOptions): EditorView {
  const base = DOMSerializer.fromSchema(schema);
  const view: EditorView = new EditorView(mount, {
    /* ⌘C's HTML flavour with the look swept inline, parked under the surface
       for the length of the sweep, since a detached node's computed style is
       empty. Without it a card copied by selection arrived in Mail as
       uncoloured lines (pin: card copy › a card ⌘C'd) */
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
    state: editorState(doc, opts.interval, opts.onRefuse, opts.folds),
    nodeViews: { ...rowNodeViews, ...(opts.nodeViews || {}) },
    attributes: { class: "page", spellcheck: "false" },
    handleTextInput: (view, _from, _to, text) => text === "|" && pipeInLine(view.state, view.dispatch),
    handleDOMEvents: { mousedown: linkClick((frag) => opts.onRoute?.(frag), "mousedown"), click: linkClick((frag) => opts.onRoute?.(frag), "click") },
    handlePaste: (view, event) => {
      const file = pastedImageFile(event.clipboardData);
      if (file) { opts.onPasteFile?.(file); return true; }
      const data = event.clipboardData;
      if (!data) return false;
      /* line breaks alone are nothing to paste, from any app: they replaced a
         selection with empty paragraphs (pin: paste.test › a paste of line breaks alone) */
      if (onlyLineBreaks(data.getData("text/plain"), view.state.selection.$from, data.getData("text/html"))) return true;
      /* text carrying HTML keeps the editor's paste */
      if (data.types.includes("text/html")) return false;
      const blocks = pasteBlocks(data.getData("text/plain"), view.state.selection.$from);
      if (!blocks) return false;
      view.dispatch(placeBlocks(view.state, blocks).scrollIntoView());
      return true;
    },
    clipboardTextParser: (text, $context) => pasteSlice(text, $context),
    clipboardTextSerializer: (slice) => copyMd(copiedSlice(slice)),
    transformCopied: (slice) => copiedSlice(slice),
    dispatchTransaction(this: EditorView, tr: Transaction) {
      /* A SCROLL NEEDS THE FOCUS FIRST: ProseMirror writes a selection to the
         DOM only while the editor has focus, and skips its
         scroll-to-selection when the DOM selection is not in the editor
         (READ in prosemirror-view 1.42.3, selectionToDOM and
         scrollToSelection) — so a `scrollIntoView()` at an unfocused view,
         a freshly mounted one above all, never scrolled: a reference link
         into Paradise Lost 1.254 landed at the top of the book (pin:
         reference paste › a link deep into a long entry followed). Taken
         here, once, rather than at each site: the rule applied by hand at
         five sites missed the sixth. Gated on the scroll: an unconditional
         focus would take it from a panel's input on a background dispatch. */
      if (tr.scrolledIntoView && !this.hasFocus()) this.focus();
      const before = this.state;
      this.updateState(this.state.apply(tr));
      const told = landed(before, this.state);
      if (told.changed) opts.onChange?.(this);
      if (told.selected) opts.onSelect?.(this);
    },
  });
  return view;
}
