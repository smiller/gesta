/* A WORK'S CONTENTS FOLD under its `##` headings (2026-09-28, the
   contents-folds plan, its look settled over a mockup with the reader):
   the page closes to its headings, a closed one showing its count. Drawn
   as decorations — the text is never touched, the source view shows it
   whole. The section is the heading and everything under it down to the
   next heading of level 1 or 2; content before the first `##` never
   folds. Only the triangle in the margin toggles, so a heading's words
   stay editable. A section is FOLLOWED BY POSITION while the page is
   edited and REMEMBERED BY ITS HEADING'S TEXT between visits, twins
   numbered: keyed by live text alone, typing in an open heading closed it
   and twin headings toggled together (the review at high, 2026-09-28). */
import { Plugin, PluginKey, TextSelection, type Command, type EditorState, type Transaction } from "prosemirror-state";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";
import type { Node } from "prosemirror-model";
import { schema } from "../model/schema.ts";
import { linkRuns } from "../store/links.ts";

export interface FoldSection {
  /* the heading's position, and its body's range after it */
  heading: number;
  from: number;
  to: number;
  /* what a visit remembers: the heading's text, a twin's with its
     number — "Notes", then "Notes (2)" */
  key: string;
  /* `N entries`, the links under the heading */
  count: string;
}
export function foldSections(doc: Node): FoldSection[] {
  const heads: { pos: number; end: number; level: number; text: string }[] = [];
  doc.forEach((block, pos) => {
    if (block.type === schema.nodes.heading) heads.push({ pos, end: pos + block.nodeSize, level: block.attrs.level as number, text: block.textContent.trim() });
  });
  const runs = linkRuns(doc);
  const seen: Record<string, number> = Object.create(null);
  const out: FoldSection[] = [];
  heads.forEach((h, i) => {
    if (h.level !== 2) return;
    let to = doc.content.size;
    for (let j = i + 1; j < heads.length; j++) if (heads[j].level <= 2) { to = heads[j].pos; break; }
    const n = runs.filter((r) => r.from >= h.end && r.to <= to).length;
    const nth = (seen[h.text] = (seen[h.text] || 0) + 1);
    out.push({ heading: h.pos, from: h.end, to, key: nth > 1 ? h.text + " (" + nth + ")" : h.text, count: n + (n === 1 ? " entry" : " entries") });
  });
  return out;
}
/* the section whose BODY holds pos, or null */
export function sectionAt(sections: FoldSection[], pos: number): FoldSection | null {
  return sections.find((s) => pos >= s.from && pos < s.to) || null;
}
export function foldDecorations(doc: Node, openKeys: Set<string>, sections: FoldSection[] = foldSections(doc)): DecorationSet {
  const decos: Decoration[] = [];
  for (const s of sections) {
    const isOpen = openKeys.has(s.key);
    decos.push(Decoration.node(s.heading, s.from, { class: "fold", "data-count": s.count, "aria-expanded": String(isOpen) }));
    if (isOpen) continue;
    doc.nodesBetween(s.from, s.to, (block, pos) => {
      if (pos >= s.from && pos + block.nodeSize <= s.to) decos.push(Decoration.node(pos, pos + block.nodeSize, { class: "folded" }));
      return false;
    });
  }
  return DecorationSet.create(doc, decos);
}

/* the plugin's state: the sections, recomputed only when the text changes
   (the review: per keystroke and per caret move they walked every link),
   and the open sections as HEADING POSITIONS, mapped through each edit */
export interface FoldState { on: boolean; open: Set<number>; sections: FoldSection[]; decorations: DecorationSet }
export const foldsKey = new PluginKey<FoldState>("folds");
type FoldMeta = { toggle: number } | { set: { on: boolean; open: string[] } };
const keysOf = (sections: FoldSection[], open: Set<number>): string[] => sections.filter((s) => open.has(s.heading)).map((s) => s.key);
/* the open sections' keys, what a visit keeps */
export function openKeys(state: EditorState): string[] {
  const st = foldsKey.getState(state);
  return st ? keysOf(st.sections, st.open) : [];
}
function draw(doc: Node, on: boolean, open: Set<number>, sections: FoldSection[]): FoldState {
  return { on, open, sections, decorations: on ? foldDecorations(doc, new Set(keysOf(sections, open)), sections) : DecorationSet.empty };
}
const positionsOf = (sections: FoldSection[], keys: string[]): Set<number> =>
  new Set(sections.filter((s) => keys.includes(s.key)).map((s) => s.heading));

/* a toggle; CLOSING a section the caret is inside moves the caret onto the
   heading's end, where it can be seen (the review: it stayed in the hidden
   blocks and the next keys edited what no one could see) */
function toggleAt(state: EditorState, s: FoldSection, dispatch?: (tr: Transaction) => void): boolean {
  const st = foldsKey.getState(state);
  if (!st) return false;
  const tr = state.tr.setMeta(foldsKey, { toggle: s.heading } satisfies FoldMeta);
  const closing = st.open.has(s.heading);
  const head = state.selection.head;
  if (closing && head >= s.from && head < s.to) tr.setSelection(TextSelection.create(state.doc, s.from - 1));
  dispatch?.(tr);
  return true;
}
export function toggleFold(key: string): Command {
  return (state, dispatch) => {
    const s = foldsKey.getState(state)?.sections.find((x) => x.key === key);
    return s ? toggleAt(state, s, dispatch) : false;
  };
}
/* open the section a position is in: ⌃⌘G's landing, which sets no
   selection of its own */
export function openFoldAt(pos: number): Command {
  return (state, dispatch) => {
    const st = foldsKey.getState(state);
    const s = st && st.on ? sectionAt(st.sections, pos) : null;
    if (!s) return false;
    if (!st!.open.has(s.heading)) dispatch?.(state.tr.setMeta(foldsKey, { toggle: s.heading } satisfies FoldMeta));
    return true;
  };
}
export function setFolds(on: boolean, open: string[]): Command {
  return (state, dispatch) => { dispatch?.(state.tr.setMeta(foldsKey, { set: { on, open } } satisfies FoldMeta)); return true; };
}
export interface FoldOptions {
  on: boolean;
  open: string[];
  /* told the open sections' keys whenever they change */
  onChange?: (open: string[]) => void;
}
export function folds(opts: FoldOptions = { on: false, open: [] }): Plugin<FoldState> {
  return new Plugin<FoldState>({
    key: foldsKey,
    state: {
      init: (_config, state) => {
        const sections = foldSections(state.doc);
        return draw(state.doc, opts.on, positionsOf(sections, opts.open), sections);
      },
      apply(tr, prev, _old, next: EditorState) {
        const meta = tr.getMeta(foldsKey) as FoldMeta | undefined;
        let { on, open, sections } = prev;
        if (tr.docChanged) {
          sections = foldSections(next.doc);
          const heads = new Set(sections.map((s) => s.heading));
          const before = new Set(prev.sections.map((s) => tr.mapping.map(s.heading, 1)));
          open = new Set([...prev.open].map((p) => tr.mapping.map(p, 1)).filter((p) => heads.has(p)));
          /* a section MADE by an edit opens: a `##` typed inside an open
             section would otherwise hide everything below the caret */
          for (const s of sections) if (!before.has(s.heading)) open.add(s.heading);
        }
        if (meta && "set" in meta) { on = meta.set.on; open = positionsOf(sections, meta.set.open); }
        else if (meta && "toggle" in meta) { open = new Set(open); if (open.has(meta.toggle)) open.delete(meta.toggle); else open.add(meta.toggle); }
        /* a caret or selection inside a closed section opens it: a search
           result's highlight, a link's payload, a caret moved there, an
           edit that carried it in, or folding switched on over it */
        if (on && (tr.selectionSet || tr.docChanged || meta)) {
          const s = sectionAt(sections, next.selection.head);
          if (s && !open.has(s.heading) && !(meta && "toggle" in meta && meta.toggle === s.heading)) { open = new Set(open); open.add(s.heading); }
        }
        if (on === prev.on && open === prev.open && sections === prev.sections) return prev;
        return draw(next.doc, on, open, sections);
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
          const s = foldsKey.getState(view.state)?.sections.find((x) => x.heading === pos);
          if (!s) return false;
          e.preventDefault();
          toggleAt(view.state, s, view.dispatch);
          return true;
        },
      },
    },
    view: () => ({
      update(view, prevState) {
        const a = openKeys(prevState), b = openKeys(view.state);
        if (foldsKey.getState(view.state)!.on && a.join("\u0000") !== b.join("\u0000")) opts.onChange?.(b);
      },
    }),
  });
}
