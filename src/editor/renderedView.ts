import type { EditorView } from "prosemirror-view";
import type { Node } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import { createEditor, type EditorOptions } from "./editor.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { flattenDoc } from "../model/flatten.ts";
import { schema } from "../model/schema.ts";
import { wordCount } from "./format.ts";
import { openFoldAt } from "./folds.ts";
import type { Surface } from "./surface.ts";

export interface RenderedView extends Surface { readonly view: EditorView }

export function renderedView(mount: HTMLElement, doc: Node, opts: EditorOptions): RenderedView {
  const view = createEditor(mount, doc, opts);
  return {
    source: false,
    view,
    md: () => serializeMarkdown(view.state.doc),
    flat: () => flattenDoc(view.state.doc),
    caret: () => view.state.selection.from,
    caretSeen: () => {
      try { const box = view.coordsAtPos(view.state.selection.from); return box.bottom >= 0 && box.top <= document.documentElement.clientHeight; } catch { return true; }
    },
    /* the first line whose top is at or below `under`, stepping down: a
       point in the gap between stanzas resolved to the end of the stanza
       above, one stanza early
       (pin: the switch carries the text › a long canto switched at its middle) */
    topAt: (under) => {
      const box = view.dom.getBoundingClientRect();
      for (let dy = 0; dy < 240; dy += 4) {
        const hit = view.posAtCoords({ left: box.left + box.width / 2, top: Math.max(under, box.top + 1) + dy });
        if (!hit) continue;
        try { if (view.coordsAtPos(hit.pos).top >= under - 1) return hit.pos; } catch { /* no box: the next point */ }
      }
      return null;
    },
    lineStart: (pos) => {
      const $pos = view.state.doc.resolve(Math.min(pos, view.state.doc.content.size));
      if (!$pos.parent.isTextblock) return $pos.pos;
      /* one line where either box holds the other's middle, not by an
         equal top: inline code sits a few px off its line and stopped the
         walk before it, and a taller run must not reach into the line above
         (pin: places › back to lines opening on inline code) */
      try {
        const line = view.coordsAtPos($pos.pos), mid = (line.top + line.bottom) / 2;
        let p = $pos.pos;
        while (p > $pos.start()) {
          const c = view.coordsAtPos(p - 1), cMid = (c.top + c.bottom) / 2;
          if (!(cMid > line.top && cMid < line.bottom) && !(mid > c.top && mid < c.bottom)) break;
          p--;
        }
        return p;
      } catch { return $pos.start(); }
    },
    placeAt: (under) => {
      const box = view.dom.getBoundingClientRect();
      const hit = view.posAtCoords({ left: box.left + 24, top: Math.max(under, box.top + 1) });
      return hit ? hit.pos : null;
    },
    reveal: (pos) => { openFoldAt(pos)(view.state, view.dispatch); },
    end: () => view.state.doc.content.size,
    scrollToPos: (pos, under) => { window.scrollTo(0, window.scrollY + view.coordsAtPos(pos).top - under); },
    focus: () => { view.focus(); },
    placeCaret: (pos, scroll) => {
      const tr = view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(Math.min(pos ?? 0, view.state.doc.content.size))));
      if (scroll) tr.scrollIntoView();
      view.dispatch(tr);
      view.focus();
    },
    insertText: (text) => {
      view.dispatch(view.state.tr.insertText(text).scrollIntoView());
      view.focus();
    },
    insertPicture: (name) => {
      const tr = view.state.tr.replaceSelectionWith(schema.nodes.image.create({ src: name, alt: "" }));
      /* a picture at the entry's end gets a line below it, the caret there:
         there is no other way to write on after it
         (pin: picture › a picture pasted at the entry's end) */
      const $end = tr.doc.resolve(tr.selection.to);
      if ($end.pos >= tr.doc.content.size - 1) {
        tr.insert(tr.doc.content.size, schema.nodes.paragraph.create());
        tr.setSelection(TextSelection.create(tr.doc, tr.doc.content.size - 1));
      }
      view.dispatch(tr.scrollIntoView());
      view.focus();
    },
    words: () => { const { from, to } = view.state.selection; return wordCount(view.state.doc, from, to); },
    destroy: () => { view.destroy(); },
  };
}
