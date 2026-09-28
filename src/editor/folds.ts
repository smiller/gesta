/* A WORK'S CONTENTS FOLD under its `##` headings (2026-09-28, the
   contents-folds plan, its look settled over a mockup with the reader):
   the page closes to its headings, a closed one showing its count. Drawn
   as decorations — the text is never touched, the source view shows it
   whole. The section is the heading and everything under it down to the
   next heading of level 1 or 2; content before the first `##` never
   folds. Which entries fold is the session's to say (store/contents.ts,
   foldsContents); only the triangle in the margin toggles, so a heading's
   words stay editable; a selection landing in a closed section opens it. */
import { Plugin, PluginKey, type Command, type EditorState } from "prosemirror-state";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";
import type { Node } from "prosemirror-model";
import { schema } from "../model/schema.ts";
import { linkRuns } from "../store/links.ts";

export interface FoldSection {
  /* the heading's position, and its body's range after it */
  heading: number;
  from: number;
  to: number;
  /* the heading's text: what the open set remembers */
  key: string;
  /* `N entries`, the links under the heading */
  count: string;
}
export function foldSections(doc: Node): FoldSection[] {
  const heads: { pos: number; end: number; level: number; key: string }[] = [];
  doc.forEach((block, pos) => {
    if (block.type === schema.nodes.heading) heads.push({ pos, end: pos + block.nodeSize, level: block.attrs.level as number, key: block.textContent.trim() });
  });
  const runs = linkRuns(doc);
  const out: FoldSection[] = [];
  heads.forEach((h, i) => {
    if (h.level !== 2) return;
    let to = doc.content.size;
    for (let j = i + 1; j < heads.length; j++) if (heads[j].level <= 2) { to = heads[j].pos; break; }
    const n = runs.filter((r) => r.from >= h.end && r.to <= to).length;
    out.push({ heading: h.pos, from: h.end, to, key: h.key, count: n + (n === 1 ? " entry" : " entries") });
  });
  return out;
}
/* the section whose BODY holds pos, or null */
export function sectionAt(doc: Node, pos: number): FoldSection | null {
  return foldSections(doc).find((s) => pos >= s.from && pos < s.to) || null;
}
export function foldDecorations(doc: Node, open: Set<string>): DecorationSet {
  const decos: Decoration[] = [];
  for (const s of foldSections(doc)) {
    const isOpen = open.has(s.key);
    decos.push(Decoration.node(s.heading, s.from, { class: "fold", "data-count": s.count, "aria-expanded": String(isOpen) }));
    if (isOpen) continue;
    doc.nodesBetween(s.from, s.to, (block, pos) => {
      if (pos >= s.from && pos + block.nodeSize <= s.to) decos.push(Decoration.node(pos, pos + block.nodeSize, { class: "folded" }));
      return false;
    });
  }
  return DecorationSet.create(doc, decos);
}

export interface FoldState { on: boolean; open: Set<string>; decorations: DecorationSet }
export const foldsKey = new PluginKey<FoldState>("folds");
type FoldMeta = { toggle: string } | { set: { on: boolean; open: string[] } };
const draw = (doc: Node, on: boolean, open: Set<string>): FoldState =>
  ({ on, open, decorations: on ? foldDecorations(doc, open) : DecorationSet.empty });
export function toggleFold(key: string): Command {
  return (state, dispatch) => { dispatch?.(state.tr.setMeta(foldsKey, { toggle: key } satisfies FoldMeta)); return true; };
}
export function setFolds(on: boolean, open: string[]): Command {
  return (state, dispatch) => { dispatch?.(state.tr.setMeta(foldsKey, { set: { on, open } } satisfies FoldMeta)); return true; };
}
export interface FoldOptions {
  on: boolean;
  open: string[];
  /* told the open set whenever it changes, to keep it for the next visit */
  onChange?: (open: string[]) => void;
}
export function folds(opts: FoldOptions = { on: false, open: [] }): Plugin<FoldState> {
  return new Plugin<FoldState>({
    key: foldsKey,
    state: {
      init: (_config, state) => draw(state.doc, opts.on, new Set(opts.open)),
      apply(tr, prev, _old, next: EditorState) {
        const meta = tr.getMeta(foldsKey) as FoldMeta | undefined;
        let { on, open } = prev;
        if (meta && "set" in meta) { on = meta.set.on; open = new Set(meta.set.open); }
        else if (meta && "toggle" in meta) { open = new Set(open); if (open.has(meta.toggle)) open.delete(meta.toggle); else open.add(meta.toggle); }
        /* a selection landing in a closed section opens it: a search
           result's highlight, a link's payload, a caret moved there */
        if (on && tr.selectionSet) {
          const s = sectionAt(next.doc, next.selection.head);
          if (s && !open.has(s.key)) { open = new Set(open); open.add(s.key); }
        }
        if (on === prev.on && open === prev.open && !tr.docChanged) return prev;
        return draw(next.doc, on, open);
      },
    },
    props: {
      decorations: (state) => foldsKey.getState(state)!.decorations,
      handleDOMEvents: {
        /* the triangle is the heading's ::before in the margin: a press
           LEFT of the heading's box toggles; a press on its words edits */
        mousedown: (view: EditorView, e: MouseEvent) => {
          const h = (e.target as Element | null)?.closest?.("h2.fold") as HTMLElement | null;
          if (!h || e.clientX >= h.getBoundingClientRect().left) return false;
          const pos = view.posAtDOM(h, 0) - 1;
          const s = foldSections(view.state.doc).find((x) => x.heading === pos);
          if (!s) return false;
          e.preventDefault();
          toggleFold(s.key)(view.state, view.dispatch);
          return true;
        },
      },
    },
    view: () => ({
      update(view, prevState) {
        const a = foldsKey.getState(prevState)!, b = foldsKey.getState(view.state)!;
        if (a.open !== b.open && b.on) opts.onChange?.([...b.open]);
      },
    }),
  });
}
