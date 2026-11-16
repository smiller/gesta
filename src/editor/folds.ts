/* Drawn as decorations: the text is never touched. Only the triangle in the
   margin toggles, so a heading's words stay editable. A section is FOLLOWED
   BY POSITION while the page is edited and REMEMBERED BY ITS HEADING'S TEXT
   between visits, twins numbered: keyed by live text alone, typing in an
   open heading closed it and twin headings toggled together (pin:
   folds.test › typing in an open heading keeps its section open) (pin:
   folds.test › twin headings are two sections, toggled apart and remembered
   apart) */
import { Plugin, PluginKey, TextSelection, type Command, type EditorState, type Transaction } from "prosemirror-state";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";
import type { Node } from "prosemirror-model";
import { schema } from "../model/schema.ts";
import { linkRuns } from "../store/links.ts";
import type { FoldKind } from "../store/contents.ts";
import { counted } from "../ui/counted.ts";

export interface FoldSection {
  heading: number;
  from: number;
  to: number;
  /* a twin's number after a U+0001: a visible "Notes (2)" collided with a
     heading of that text (pin: folds.test › a twin's key never collides with
     a heading that reads like one) */
  key: string;
  /* a contents section's links; a section of writing counts its words only
     when drawn closed */
  count: string | null;
}
interface Head { pos: number; end: number; level: number; text: string }
function headsOf(doc: Node): Head[] {
  const heads: Head[] = [];
  doc.forEach((block, pos) => {
    if (block.type === schema.nodes.heading) heads.push({ pos, end: pos + block.nodeSize, level: block.attrs.level as number, text: block.textContent.trim() });
  });
  return heads;
}
function sectionEnd(heads: Head[], i: number, size: number): number {
  for (let j = i + 1; j < heads.length; j++) if (heads[j].level <= 2) return heads[j].pos;
  return size;
}
const wordsIn = (doc: Node, s: FoldSection): string => counted(doc.textBetween(s.from, s.to, " ", " ").split(/\s+/).filter(Boolean).length, " word", " words");
export function foldSections(doc: Node, kind: FoldKind): FoldSection[] {
  const heads = headsOf(doc);
  const runs = kind === "contents" ? linkRuns(doc) : [];
  const seen: Record<string, number> = Object.create(null);
  const out: FoldSection[] = [];
  heads.forEach((h, i) => {
    if (h.level !== 2) return;
    const to = sectionEnd(heads, i, doc.content.size);
    const count = kind === "contents" ? counted(runs.filter((r) => r.from >= h.end && r.to <= to).length, " entry", " entries") : null;
    const nth = (seen[h.text] = (seen[h.text] || 0) + 1);
    out.push({ heading: h.pos, from: h.end, to, key: nth > 1 ? h.text + "\u0001" + nth : h.text, count });
  });
  return out;
}
/* the boundary right after the heading is not the body: a heading selected
   whole (Escape's parent selection) ends there, and read as inside it
   reopened a section as it closed (pin: folds.test › a heading selected
   whole (Escape) is not inside its section) */
export function sectionAt(sections: FoldSection[], pos: number): FoldSection | null {
  return sections.find((s) => pos > s.from && pos < s.to) || null;
}
/* drawn BY POSITION: a key is only what a visit remembers */
export function foldDecorations(doc: Node, sections: FoldSection[], openHeadings: Set<number>, kind: FoldKind): DecorationSet {
  const decos: Decoration[] = [];
  for (const s of sections) {
    const isOpen = openHeadings.has(s.heading);
    const count = kind === "contents" ? s.count : isOpen ? null : wordsIn(doc, s);
    decos.push(Decoration.node(s.heading, s.from, { class: "fold", ...(count ? { "data-count": count } : {}), "aria-expanded": String(isOpen) }));
    if (isOpen) continue;
    doc.nodesBetween(s.from, s.to, (block, pos) => {
      if (pos >= s.from && pos + block.nodeSize <= s.to) decos.push(Decoration.node(pos, pos + block.nodeSize, { class: "folded" }));
      return false;
    });
  }
  return DecorationSet.create(doc, decos);
}

/* the sections recomputed only when the text changes: per keystroke and per
   caret move they walked every link. The open sections as HEADING
   POSITIONS, mapped through each edit */
export interface FoldState { kind: FoldKind | null; open: Set<number>; sections: FoldSection[]; decorations: DecorationSet }
export const foldsKey = new PluginKey<FoldState>("folds");
type FoldMeta = { toggle: number } | { set: { kind: FoldKind | null; flipped: string[] } };
const keysOf = (sections: FoldSection[], open: Set<number>): string[] => sections.filter((s) => open.has(s.heading)).map((s) => s.key);
/* the sections held otherwise than the kind starts them, either way round:
   sections start open, so a day's writing is never hidden on arrival, and
   contents start closed, so a long contents fits on a screen */
const flipped = (kind: FoldKind | null, sections: FoldSection[], held: Set<number>): Set<number> =>
  kind === "sections" ? new Set(sections.filter((s) => !held.has(s.heading)).map((s) => s.heading)) : held;
export function flippedKeys(state: EditorState): string[] {
  const st = foldsKey.getState(state);
  return st ? keysOf(st.sections, flipped(st.kind, st.sections, st.open)) : [];
}
function draw(doc: Node, kind: FoldKind | null, open: Set<number>, sections: FoldSection[]): FoldState {
  return { kind, open, sections, decorations: kind ? foldDecorations(doc, sections, open, kind) : DecorationSet.empty };
}
const positionsOf = (sections: FoldSection[], keys: string[]): Set<number> =>
  new Set(sections.filter((s) => keys.includes(s.key)).map((s) => s.heading));
const startOpen = (kind: FoldKind | null, sections: FoldSection[], keys: string[]): Set<number> => flipped(kind, sections, positionsOf(sections, keys));

/* CLOSING a section a selection reaches into, from either end, collapses it
   onto the heading's end, where it can be seen: a caret, then a range
   anchored there, stayed in the hidden blocks, and the next keys edited
   what no one could see (pin: folds.test › closing a section collapses a
   selection that reaches into it from anywhere) */
const reaches = (from: number, to: number, s: FoldSection): boolean => from < s.to && to > s.from;
function toggleAt(state: EditorState, s: FoldSection, dispatch?: (tr: Transaction) => void): boolean {
  const st = foldsKey.getState(state);
  if (!st) return false;
  const tr = state.tr.setMeta(foldsKey, { toggle: s.heading } satisfies FoldMeta);
  const closing = st.open.has(s.heading);
  const { from, to } = state.selection;
  if (closing && reaches(from, to, s)) tr.setSelection(TextSelection.create(state.doc, s.from - 1));
  dispatch?.(tr);
  return true;
}
export function toggleFold(key: string): Command {
  return (state, dispatch) => {
    const s = foldsKey.getState(state)?.sections.find((x) => x.key === key);
    return s ? toggleAt(state, s, dispatch) : false;
  };
}
/* a landing stayed hidden inside a closed section (pin: folds.test ›
   openFoldAt opens the section a position is in) */
export function openFoldAt(pos: number): Command {
  return (state, dispatch) => {
    const st = foldsKey.getState(state);
    const s = st && st.kind ? sectionAt(st.sections, pos) : null;
    if (!s) return false;
    if (!st!.open.has(s.heading)) dispatch?.(state.tr.setMeta(foldsKey, { toggle: s.heading } satisfies FoldMeta));
    return true;
  };
}
export function setFolds(kind: FoldKind | null, flipped: string[]): Command {
  return (state, dispatch) => { dispatch?.(state.tr.setMeta(foldsKey, { set: { kind, flipped } } satisfies FoldMeta)); return true; };
}
type Folding = { kind: FoldKind | null; open: Set<number>; sections: FoldSection[] };
function remapped(tr: Transaction, prev: FoldState, doc: Node, kind: FoldKind): { open: Set<number>; sections: FoldSection[] } {
  const sections = foldSections(doc, kind);
  const heads = new Set(sections.map((s) => s.heading));
  /* a heading SURVIVES an edit while its mapped start stays before
     its mapped end; a deleted one collapses, and mapped by its start
     alone it landed on the next heading and opened it (pin:
     folds.test › deleting an open section does not open the one after
     it) */
  const moved = new Map<number, number>();
  for (const s of prev.sections) {
    const a = tr.mapping.map(s.heading, 1), b = tr.mapping.map(s.from, -1);
    if (b > a && heads.has(a)) moved.set(s.heading, a);
  }
  const before = new Set(moved.values());
  const open = new Set([...prev.open].filter((p) => moved.has(p)).map((p) => moved.get(p)!));
  /* a section MADE by an edit opens: a `##` typed inside an open
     section would otherwise hide everything below the caret */
  for (const s of sections) if (!before.has(s.heading)) open.add(s.heading);
  return { open, sections };
}
function toggled(open: Set<number>, at: number): Set<number> {
  const out = new Set(open);
  if (out.has(at)) out.delete(at);
  else out.add(at);
  return out;
}
function afterMeta(meta: FoldMeta | undefined, s: Folding, doc: Node): Folding {
  if (!meta) return s;
  if ("toggle" in meta) return { ...s, open: toggled(s.open, meta.toggle) };
  const { kind, flipped } = meta.set;
  const sections = kind ? foldSections(doc, kind) : [];
  return { kind, sections, open: startOpen(kind, sections, flipped) };
}
const touches = (tr: Transaction, meta: FoldMeta | undefined): boolean => tr.selectionSet || tr.docChanged || !!meta;
function openedAt(open: Set<number>, sections: FoldSection[], head: number): Set<number> {
  const s = sectionAt(sections, head);
  if (!s || open.has(s.heading)) return open;
  return new Set(open).add(s.heading);
}
const unchanged = (prev: FoldState, s: Folding): boolean => s.kind === prev.kind && s.open === prev.open && s.sections === prev.sections;
export interface FoldOptions {
  kind: FoldKind | null;
  flipped: string[];
  onChange?: (flipped: string[], kind: FoldKind) => void;
}
export function folds(opts: FoldOptions = { kind: null, flipped: [] }): Plugin<FoldState> {
  return new Plugin<FoldState>({
    key: foldsKey,
    state: {
      /* OFF, nothing is computed: the plugin sits on every entry, and the
         sections walked every link per keystroke on pages that never fold
         (pin: folds.test › with folding off an edit computes no sections) */
      init: (_config, state) => {
        const sections = opts.kind ? foldSections(state.doc, opts.kind) : [];
        return draw(state.doc, opts.kind, startOpen(opts.kind, sections, opts.flipped), sections);
      },
      apply(tr, prev, _old, next: EditorState) {
        const meta = tr.getMeta(foldsKey) as FoldMeta | undefined;
        let s: Folding = { kind: prev.kind, open: prev.open, sections: prev.sections };
        if (tr.docChanged && s.kind) s = { kind: s.kind, ...remapped(tr, prev, next.doc, s.kind) };
        s = afterMeta(meta, s, next.doc);
        if (s.kind && touches(tr, meta)) s = { ...s, open: openedAt(s.open, s.sections, next.selection.head) };
        if (unchanged(prev, s)) return prev;
        return draw(next.doc, s.kind, s.open, s.sections);
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
        /* apply returns the same state object when nothing changed: no keys
           are built on a keystroke that folds nothing */
        if (foldsKey.getState(prevState) === foldsKey.getState(view.state)) return;
        const a = flippedKeys(prevState), b = flippedKeys(view.state), kind = foldsKey.getState(view.state)!.kind;
        if (kind && a.join("\u0000") !== b.join("\u0000")) opts.onChange?.(b, kind);
      },
    }),
  });
}
