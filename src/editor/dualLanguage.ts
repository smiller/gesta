import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
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
function dualBlocks(view: EditorView): { node: Node; dom: HTMLElement }[] {
  const out: { node: Node; dom: HTMLElement }[] = [];
  view.state.doc.descendants((n, pos) => {
    if (n.isTextblock) return false;
    if (n.type !== N.verse) return true;
    const dom = n.attrs.dual ? view.nodeDOM(pos) : null;
    if (dom instanceof HTMLElement) out.push({ node: n, dom });
    return false;
  });
  return out;
}

/* a wait is space added, never a margin replaced: a row takes it as padding,
   which no margin collapses into, and a note as margin on top of its own,
   read with the waits off — written as the margin, it replaced the note's
   1.2em and the English still overlapped it. A margin-note drawn in the
   margin stands outside the rows and is no row here. The foot is padding on
   the last row: a margin there collapsed through the block into the next
   fence's (pin: dual-language › dual-language in Ovid) */
const rowsOf = (b: HTMLElement): HTMLElement[] => [...b.children].filter((c): c is HTMLElement => c instanceof HTMLElement && !c.classList.contains("margin-note"));
const isNote = (el: HTMLElement): boolean => el.classList.contains("note");
function clear(el: HTMLElement): void {
  if (isNote(el)) el.style.marginTop = "";
  else { el.style.paddingTop = ""; el.style.paddingBottom = ""; }
}

/* ONE WRITE, THEN EVERY READ, THEN THE WRITES: every wait comes off, the
   rows are read against that, and the answers go on, inside one call, so
   no frame is painted between; a reader's place is held across it, the
   rows above it moving while the waits are off. A block whose node and
   width are those of its last pass keeps its waits */
const placed = new WeakMap<HTMLElement, { node: Node; width: number }>();
function place(view: EditorView): void {
  const blocks = dualBlocks(view).filter(({ node, dom }) => {
    const was = placed.get(dom);
    return !was || was.node !== node || was.width !== dom.clientWidth;
  });
  if (!blocks.length) return;
  const scroller = document.scrollingElement || document.documentElement;
  const held = scroller.scrollTop;
  for (const { dom } of blocks) for (const r of rowsOf(dom)) clear(r);
  const answers = blocks.map(({ dom }) => {
    const els = rowsOf(dom);
    if (!els.length) return null;
    const base = els[0].getBoundingClientRect().top;
    const own = els.map((el) => (isNote(el) ? parseFloat(getComputedStyle(el).marginTop) || 0 : 0));
    const rows: DualRow[] = els.map((el) => {
      const english = el.classList.contains("vpair") ? (el.children[1] as HTMLElement | undefined)?.scrollHeight ?? null : null;
      return { top: el.getBoundingClientRect().top - base, english, clears: isNote(el) };
    });
    return { els, own, ...dualWaits(rows, els[els.length - 1].getBoundingClientRect().bottom - base) };
  });
  answers.forEach((a, k) => {
    if (a) {
      a.margins.forEach((m, i) => {
        if (!m) return;
        if (isNote(a.els[i])) a.els[i].style.marginTop = a.own[i] + m + "px";
        else a.els[i].style.paddingTop = m + "px";
      });
      const last = a.els[a.els.length - 1];
      if (a.foot && !isNote(last)) last.style.paddingBottom = a.foot + "px";
    }
    placed.set(blocks[k].dom, { node: blocks[k].node, width: blocks[k].dom.clientWidth });
  });
  scroller.scrollTop = held;
}

/* the columns a block's notes stand under, kept per block node: a block no
   edit touched is the same node, and its notes are not read again */
const columns = new WeakMap<Node, Map<number, "latin" | "english">>();
const notesKey = new PluginKey<DecorationSet>("dualNotes");
function noteDecorations(doc: Node): DecorationSet {
  const decos: Decoration[] = [];
  doc.descendants((n, pos) => {
    if (n.isTextblock) return false;
    if (n.type !== N.verse) return true;
    if (!n.attrs.dual) return false;
    let cols = columns.get(n);
    if (!cols) { cols = noteColumns(n); columns.set(n, cols); }
    let at = pos + 1;
    n.forEach((row, _, i) => {
      if (cols.get(i) === "english") decos.push(Decoration.node(at, at + row.nodeSize, { class: "dl-english" }));
      at += row.nodeSize;
    });
    return false;
  });
  return DecorationSet.create(doc, decos);
}

/* ArrowDown on an English sentence's last line goes to the sentence below it,
   and ArrowUp on its first line to the end of the one above: the next cell
   in the document is the next row's Latin, which stands above the caret
   beside a long sentence (pin: dual-language › ArrowDown from a sentence's
   last line) */
function englishCaret(view: EditorView, dir: "up" | "down"): boolean {
  const { $head, empty } = view.state.selection;
  if (!empty || $head.depth < 3) return false;
  const pair = $head.node($head.depth - 1), block = $head.node($head.depth - 2);
  if (pair.type !== N.pair || block.type !== N.verse || !block.attrs.dual || $head.index($head.depth - 1) !== 1) return false;
  if (!view.endOfTextblock(dir)) return false;
  const at = $head.index($head.depth - 2);
  const start = $head.before($head.depth - 2) + 1;
  const offsets: number[] = [];
  let o = start;
  block.forEach((row) => { offsets.push(o); o += row.nodeSize; });
  for (let i = dir === "down" ? at + 1 : at - 1; i >= 0 && i < block.childCount; i += dir === "down" ? 1 : -1) {
    const row = block.child(i);
    if (row.type !== N.pair) continue;
    const cellStart = offsets[i] + 1 + row.child(0).nodeSize + 1;
    const pos = dir === "down" ? cellStart : cellStart + row.child(1).content.size;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, pos)).scrollIntoView());
    return true;
  }
  return false;
}

export function dualLanguage(): Plugin[] {
  return [
    new Plugin({ key: new PluginKey("dualWaits"), view: measurePass(place) }),
    new Plugin<DecorationSet>({
      key: notesKey,
      state: { init: (_, s) => noteDecorations(s.doc), apply: (tr, was) => (tr.docChanged ? noteDecorations(tr.doc) : was) },
      props: {
        decorations: (s) => notesKey.getState(s),
        handleKeyDown: (view, e) => {
          if (e.shiftKey || e.altKey || e.metaKey || e.ctrlKey) return false;
          return e.key === "ArrowDown" ? englishCaret(view, "down") : e.key === "ArrowUp" ? englishCaret(view, "up") : false;
        },
      },
    }),
  ];
}
