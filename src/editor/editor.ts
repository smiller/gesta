import { EditorState, NodeSelection, Plugin, PluginKey, TextSelection, type Transaction, type Command } from "prosemirror-state";
import { EditorView, type NodeViewConstructor } from "prosemirror-view";
import { history, undo, redo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { baseKeymap, chainCommands, exitCode } from "prosemirror-commands";
import { schema } from "../model/schema.ts";
import { rowKeymap, pipeInLine, openBlankRow } from "./rowKeys.ts";
import { fittedMeasure } from "./fit.ts";
import { marginNotes } from "./margins.ts";
import { folios } from "./folios.ts";
import { typing, typingKeymap, autolinkEnter } from "./typing.ts";
import { DOMSerializer, Fragment, type Node } from "prosemirror-model";
import { inlineBlockStyles } from "./inlineStyles.ts";
import { lineNumbers } from "./lineNumbers.ts";
import { rowNodeViews } from "./rows.ts";
import { linkClick } from "./links.ts";
import { listKeymap } from "./listKeys.ts";
import { formatKeymap } from "./format.ts";
import { codeKeymap } from "./codeKeys.ts";
import { jump, escapeJump } from "./highlight.ts";
import { quoteKeymap } from "./quoteKeys.ts";
import { gridKeymap } from "./gridKeys.ts";
import { pasteSlice, pasteBlocks, placeBlocks, copyMd, copiedSlice, onlyLineBreaks, pastedRefusal, bareLinks, bareBlocks, clipboardParser } from "./paste.ts";
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
  /* a pasted fence the model refused, named with its reason */
  onPasteRefused?: (text: string) => void;
  folds?: FoldOptions;
  /* the window's top a caret scrolled into view must stand below */
  clearOf?: () => number;
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
/* Tab outside a list, a quote, a row or a code block stays in the entry and
   says what it does not do here (pin: editor.test › Tab in prose keeps the key) */
const proseTab = (onRefuse?: (why: string) => void): Command => (state) => {
  onRefuse?.(state.selection.empty ? "⌃⌘M toggles markdown" : "Tab indents one list, quote, or code block at a time");
  return true;
};
/* a table cannot hold the caret below it: an entry ending in one is given
   an empty line, which saves as nothing
   (pin: editor.test › an entry ending in a table has an empty line below it) */
const endsInTable = (doc: Node): boolean => doc.lastChild?.type === schema.nodes.table;
const withLineBelow = (doc: Node): Node => endsInTable(doc) ? doc.copy(doc.content.append(Fragment.from(schema.nodes.paragraph.create()))) : doc;
const lineBelow = new Plugin({
  appendTransaction: (trs, _was, state) => trs.some((tr) => tr.docChanged) && endsInTable(state.doc)
    ? state.tr.insert(state.doc.content.size, schema.nodes.paragraph.create()).setMeta("addToHistory", false) : null,
});
/* A REFERENCE BLOCK IS EDITED IN THE MARKDOWN VIEW ONLY: in the rendered
   view a click puts the caret at its start and says so, and no key or
   paste changes it from within (pin: editor.test › a reference block takes
   no typing in the rendered view); no change reaches into it from outside
   either, a join, a cut or a drop, while a change taking the block whole
   lands (pin: editor.test › no change from outside a reference block
   reaches into it) */
const REFERENCE_HERE = "Reference style is edited in the markdown view (⌃⌘M)";
function inReference(state: EditorState): boolean {
  const sel = state.selection;
  if (sel instanceof NodeSelection) return sel.node.type === schema.nodes.reference;
  return sel.$from.parent.type === schema.nodes.reference || sel.$to.parent.type === schema.nodes.reference;
}
function reachesIntoReference(tr: Transaction): boolean {
  return tr.steps.some((step, i) => {
    const doc = tr.docs[i], ranges: [number, number][] = [];
    step.getMap().forEach((from, to) => { ranges.push([from, to]); });
    const marked = step as unknown as { from?: number; to?: number };
    if (!ranges.length && typeof marked.from === "number" && typeof marked.to === "number") ranges.push([marked.from, marked.to]);
    return ranges.some(([from, to]) => {
      let hit = false;
      doc.nodesBetween(from, Math.min(Math.max(to, from + 1), doc.content.size), (node, pos) => {
        if (hit || node.type !== schema.nodes.reference) return !hit;
        const end = pos + node.nodeSize;
        hit = from < end && to > pos && !(from <= pos && to >= end);
        return false;
      });
      return hit;
    });
  });
}
const inertReference = (say?: (why: string) => void): Plugin => new Plugin({
  filterTransaction: (tr) => !tr.docChanged || !reachesIntoReference(tr),
  props: {
    handleClickOn: (view, _pos, node, nodePos) => {
      if (node.type !== schema.nodes.reference) return false;
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, nodePos + 1)));
      say?.(REFERENCE_HERE);
      return true;
    },
    handleTextInput: (view) => inReference(view.state),
    handleKeyDown: (view, e) => (e.key === "Enter" || e.key === "Backspace" || e.key === "Delete") && inReference(view.state),
    handlePaste: (view) => inReference(view.state),
  },
});
/* text typed on a blank row is text typed in an empty line in its place:
   the line opened, then the text handed to every handler a line's typing
   meets (pin: editor.test › text typed on a blank row) */
export function textOnBlankRow(view: EditorView, text: string): boolean {
  if (!openBlankRow(view.state, view.dispatch)) return false;
  const at = view.state.selection.from;
  if (text === "|" && pipeInLine(view.state, view.dispatch)) return true;
  const typed = (): Transaction => view.state.tr.insertText(text, at);
  for (const p of view.state.plugins) if (p.props.handleTextInput?.call(p, view, at, at, text, typed)) return true;
  view.dispatch(typed().scrollIntoView());
  return true;
}
export function editorState(doc: Node, interval: number, onRefuse?: (why: string) => void, foldOpts?: FoldOptions): EditorState {
  /* A HELD KEY ACTS ONCE: an auto-repeated Tab is swallowed, and a refusal
     is said once per press, not over its own whisper on every repeat
     (pin: editor.test › a held key acts once) */
  let repeating = false;
  const say = onRefuse && ((why: string): void => { if (!repeating) onRefuse(why); });
  const held = new Plugin({ props: { handleKeyDown: (_view, e) => { repeating = e.repeat; return e.repeat && e.key === "Tab" && !e.shiftKey; } } });
  return EditorState.create({
    doc: withLineBelow(doc),
    plugins: [
      held,
      lock,
      inertReference(say),
      history(),
      keymap({ "Mod-z": undo, "Mod-Shift-z": redo, "Mod-y": redo, Escape: escapeJump }),
      rowKeymap,
      autolinkEnter,
      typingKeymap,
      codeKeymap(say),
      listKeymap(say),
      quoteKeymap(say),
      gridKeymap(say),
      formatKeymap,
      keymap({ "Shift-Enter": chainCommands(exitCode, hardBreak) }),
      keymap(baseKeymap),
      keymap({ Tab: proseTab(say) }),
      jump,
      lineBelow,
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
  /* A CARET SCROLLED INTO VIEW STOPS 24px CLEAR of what covers the window's
     top: by the default 5px it stopped under it, hidden (pin: where the keys
     go › Enter with the caret above the window). Objects the view reads at
     each scroll, set before it, since setProps copies the props it is given */
  const threshold = { top: 0, bottom: 0, left: 0, right: 0 }, margin = { top: 5, bottom: 5, left: 5, right: 5 };
  const view: EditorView = new EditorView(mount, {
    scrollThreshold: threshold,
    scrollMargin: margin,
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
    /* the hint is drawn on screen alone, so no copy carries it (pin:
       notices and surfaces as the old app has them › a link's tooltip)
       (pin: schema.test › a link's DOM) */
    markViews: { link: (mark) => { const a = document.createElement("a"); a.setAttribute("href", mark.attrs.href as string); a.title = "⌘-click to open"; return { dom: a }; } },
    attributes: { class: "page", spellcheck: "false" },
    handleTextInput: (view, _from, _to, text) => textOnBlankRow(view, text) || (text === "|" && pipeInLine(view.state, view.dispatch)),
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
      const parsed = pasteBlocks(data.getData("text/plain"), view.state.selection.$from);
      if (!parsed) return false;
      const blocks = bareBlocks(parsed, location.href);
      view.dispatch(placeBlocks(view.state, blocks).scrollIntoView());
      const refused = pastedRefusal(blocks);
      if (refused) opts.onPasteRefused?.(refused);
      return true;
    },
    clipboardTextParser: (text, $context) => pasteSlice(text, $context),
    clipboardParser,
    clipboardTextSerializer: (slice) => copyMd(slice),
    transformCopied: (slice, view) => copiedSlice(slice, view.state.doc, view.state.selection.from, view.state.selection.to),
    transformPasted: (slice) => bareLinks(slice, location.href),
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
      if (tr.scrolledIntoView && opts.clearOf) { threshold.top = opts.clearOf(); margin.top = threshold.top + 24; }
      const before = this.state;
      this.updateState(this.state.apply(tr));
      const told = landed(before, this.state);
      if (told.changed) opts.onChange?.(this);
      if (told.selected) opts.onSelect?.(this);
    },
  });
  return view;
}
