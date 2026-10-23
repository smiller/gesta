import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";
import type { Node } from "prosemirror-model";
import { schema } from "../model/schema.ts";
import { measurePass } from "./measurePass.ts";

const N = schema.nodes;

/* a row as measured with no waits on it, from the block's first row:
   `english` the height of a sentence starting there, `clears` a note */
export interface DualRow { top: number; english: number | null; clears: boolean }

/* where the English runs long the Latin waits: a row with English, or a
   note, starts no higher than the sentence above ends, and the block's
   foot leaves room for the last one. An overlap under a pixel is the
   layout's rounding: waited, it came and went between runs as a 1px gap
   (MEASURED); a pixel or more rounds up (pin: dualLanguage.test › an
   overlap under a pixel) */
export function dualWaits(rows: DualRow[], end: number): { margins: number[]; foot: number } {
  let shift = 0, english = -Infinity;
  const margins = rows.map((r) => {
    if (r.english == null && !r.clears) return 0;
    const top = r.top + shift;
    const wait = english - top >= 1 ? Math.ceil(english - top) : 0;
    shift += wait;
    if (r.english != null) english = top + wait + r.english;
    return wait;
  });
  const over = english - (end + shift);
  return { margins, foot: over >= 1 ? Math.ceil(over) : 0 };
}

const SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const superscript = (n: string): string => [...n].map((d) => SUPERSCRIPT[+d]).join("");
const SUP_RUN = new RegExp(`[${SUPERSCRIPT}]+`, "g");

/* each note row's column, by the block's index: under the English where
   its number's mark stands in an English cell, under the Latin otherwise */
export function noteColumns(block: Node): Map<number, "latin" | "english"> {
  const english = new Set<string>();
  block.forEach((row) => {
    if (row.type === N.pair) for (const m of row.child(1).textContent.match(SUP_RUN) ?? []) english.add(m);
  });
  const out = new Map<number, "latin" | "english">();
  block.forEach((row, _, i) => {
    if (row.type !== N.note) return;
    const n = row.textContent.match(/^\s*\[(\d+)\]/);
    out.set(i, n && english.has(superscript(n[1])) ? "english" : "latin");
  });
  return out;
}

/* ---------- the DOM side ---------- */
function dualBlocks(view: EditorView): HTMLElement[] {
  const out: HTMLElement[] = [];
  view.state.doc.descendants((n, pos) => {
    if (n.isTextblock) return false;
    if (n.type !== N.verse) return true;
    const dom = n.attrs.dual ? view.nodeDOM(pos) : null;
    if (dom instanceof HTMLElement) out.push(dom);
    return false;
  });
  return out;
}

/* ONE WRITE, THEN EVERY READ, THEN THE WRITES: every wait comes off, the
   rows are read against that, and the answers go on, inside one call, so
   no frame is painted between; a reader's place is held across it, the
   rows above it moving while the waits are off */
function place(view: EditorView): void {
  const blocks = dualBlocks(view);
  if (!blocks.length) return;
  const scroller = document.scrollingElement || document.documentElement;
  const held = scroller.scrollTop;
  const rowsOf = (b: HTMLElement): HTMLElement[] => [...b.children].filter((c): c is HTMLElement => c instanceof HTMLElement);
  for (const b of blocks) for (const r of rowsOf(b)) { r.style.marginTop = ""; r.style.marginBottom = ""; }
  const answers = blocks.map((b) => {
    const els = rowsOf(b);
    if (!els.length) return null;
    const base = els[0].getBoundingClientRect().top;
    const rows: DualRow[] = els.map((el) => {
      const english = el.classList.contains("vpair") ? (el.children[1] as HTMLElement | undefined)?.scrollHeight ?? null : null;
      return { top: el.getBoundingClientRect().top - base, english, clears: el.matches(".note, .margin-note") };
    });
    return { els, ...dualWaits(rows, els[els.length - 1].getBoundingClientRect().bottom - base) };
  });
  for (const a of answers) {
    if (!a) continue;
    a.margins.forEach((m, i) => { if (m) a.els[i].style.marginTop = m + "px"; });
    if (a.foot) a.els[a.els.length - 1].style.marginBottom = a.foot + "px";
  }
  scroller.scrollTop = held;
}

const notesKey = new PluginKey<DecorationSet>("dualNotes");
function noteDecorations(doc: Node): DecorationSet {
  const decos: Decoration[] = [];
  doc.descendants((n, pos) => {
    if (n.isTextblock) return false;
    if (n.type !== N.verse) return true;
    if (!n.attrs.dual) return false;
    const cols = noteColumns(n);
    let at = pos + 1;
    n.forEach((row, _, i) => {
      if (cols.get(i) === "english") decos.push(Decoration.node(at, at + row.nodeSize, { class: "dl-english" }));
      at += row.nodeSize;
    });
    return false;
  });
  return DecorationSet.create(doc, decos);
}

export function dualLanguage(): Plugin[] {
  return [
    new Plugin({ key: new PluginKey("dualWaits"), view: measurePass(place) }),
    new Plugin<DecorationSet>({
      key: notesKey,
      state: { init: (_, s) => noteDecorations(s.doc), apply: (tr, was) => (tr.docChanged ? noteDecorations(tr.doc) : was) },
      props: { decorations: (s) => notesKey.getState(s) },
    }),
  ];
}
