/* Tab and Shift-Tab in a quote: the paragraph the caret is in goes one
   level deeper, or lifts back out — a heading, a table or a card inside
   a quote moving as the one thing it is, a list inside a quote taking the
   list arm first (the innermost thing the caret is in wins, by keymap
   order). Ported 2026-09-08 from the quote arm of 13e-enter-and-tab-
   dispatch.js. A selection reaching outside the outermost quote has no
   single container to act on and says so; Shift-Tab on an outermost
   quote does nothing and says so — leaving a quote altogether is the
   source view's job; a quote with nothing in it has no depth to change.
   A held Tab must not go on nesting: a quote has no ceiling, so the
   press acts once per press where Shift-Tab may repeat, having a floor. */
import { type Command, type EditorState, TextSelection } from "prosemirror-state";
import { keymap } from "prosemirror-keymap";
import { lift } from "prosemirror-commands";
import type { Plugin } from "prosemirror-state";
import { Fragment, type Node } from "prosemirror-model";
import { schema } from "../model/schema.ts";

const Q = schema.nodes.blockquote, P = schema.nodes.paragraph, BR = schema.nodes.hard_break;
/* THE UNIT IS THE RUN: a quote's body is ONE paragraph of lines with
   breaks, a blank line being two breaks (the grammar's line run, phase
   0), so what Tab moves is the run of lines between the blank lines
   around the selection — several runs when the selection crosses a
   blank line — cut out of the paragraph and wrapped in a quote of its
   own, the lines before and after staying as paragraphs. The serializer
   writes a quote's paragraphs and its blank-line runs alike, so the
   round trip holds. */
function runsOf(para: Node): { from: number; to: number }[] {
  const runs: { from: number; to: number }[] = [];
  let start = 0, offset = 0, prevBreak = false;
  para.forEach((child) => {
    const isBreak = child.type === BR;
    if (isBreak && prevBreak) { runs.push({ from: start, to: offset - 1 }); start = offset + 1; }
    prevBreak = isBreak;
    offset += child.nodeSize;
  });
  runs.push({ from: start, to: offset });
  return runs;
}
/* the depth of the innermost quote around the selection's start, 0 for none */
function quoteDepth(state: EditorState): number {
  const $from = state.selection.$from;
  for (let d = $from.depth; d >= 1; d--) if ($from.node(d).type === Q) return d;
  return 0;
}
/* the selection stays inside ONE outermost quote */
function outermost(state: EditorState): number {
  const $from = state.selection.$from;
  for (let d = 1; d <= $from.depth; d++) if ($from.node(d).type === Q) return d;
  return 0;
}
function spills(state: EditorState): boolean {
  const { $from, $to } = state.selection;
  const d = outermost(state);
  if (!d) return true;
  return $to.pos > $from.end(d) || $to.depth < d || $to.node(d).type !== Q || $to.before(d) !== $from.before(d);
}
export const tabInQuote: Command = (state, dispatch) => {
  if (!quoteDepth(state) || spills(state)) return false;
  const { $from, $to } = state.selection;
  if ($from.parent.type !== P || !$from.sameParent($to)) return false;
  const para = $from.parent, base = $from.start();
  const runs = runsOf(para);
  const first = runs.find((r) => $from.parentOffset <= r.to)!, last = runs.slice().reverse().find((r) => $to.parentOffset >= r.from) || first;
  const run = para.content.cut(first.from, last.to);
  if (!run.size || !run.textBetween(0, run.size).trim()) return false;
  if (dispatch) {
    const before = para.content.cut(0, Math.max(0, first.from - 2)), after = para.content.cut(Math.min(para.content.size, last.to + 2));
    const nodes: Node[] = [];
    if (before.size) nodes.push(P.create(null, before));
    nodes.push(Q.create(null, P.create(null, run)));
    if (after.size) nodes.push(P.create(null, after));
    const tr = state.tr.replaceWith($from.before(), $from.after(), Fragment.from(nodes));
    const at = base - 1 + (before.size ? before.size + 2 : 0) + 2 + ($from.parentOffset - first.from);
    tr.setSelection(TextSelection.create(tr.doc, Math.min(at, tr.doc.content.size)));
    dispatch(tr.scrollIntoView());
  }
  return true;
};
/* the inverse: the inner quote's lines spliced back into the outer's flat
   run, a blank line either side, joined with the paragraphs beside it —
   two paragraphs left adjacent would be written with no blank quote line
   and read back as one run. An inner quote holding anything but
   paragraphs takes the library's lift instead. */
export const shiftTabInQuote: Command = (state, dispatch) => {
  if (!quoteDepth(state) || spills(state)) return false;
  const d = quoteDepth(state);
  if (d === outermost(state)) return false;
  const $from = state.selection.$from;
  const inner = $from.node(d), outerIndex = $from.index(d - 1), outer = $from.node(d - 1);
  let flat = true;
  inner.forEach((c) => { if (c.type !== P) flat = false; });
  if (!flat) return lift(state, dispatch);
  if (dispatch) {
    const blank = (): Node[] => [BR.create(), BR.create()];
    const parts: Fragment[] = [];
    const prev = outerIndex > 0 ? outer.child(outerIndex - 1) : null, next = outerIndex + 1 < outer.childCount ? outer.child(outerIndex + 1) : null;
    let from = $from.before(d), to = $from.after(d);
    if (prev && prev.type === P) { parts.push(prev.content); from -= prev.nodeSize; }
    inner.forEach((c) => parts.push(c.content));
    if (next && next.type === P) { parts.push(next.content); to += next.nodeSize; }
    const joined: Node[] = [];
    parts.forEach((f, i) => { if (i) joined.push(...blank()); f.forEach((n) => joined.push(n)); });
    const caretOffset = (prev && prev.type === P ? prev.content.size + 2 : 0) + ($from.pos - $from.start());
    const tr = state.tr.replaceWith(from, to, P.create(null, Fragment.from(joined)));
    tr.setSelection(TextSelection.create(tr.doc, Math.min(from + 1 + caretOffset, tr.doc.content.size)));
    dispatch(tr.scrollIntoView());
  }
  return true;
};
export const QUOTE_FLOOR = "at the outer level: switch to markdown (⌃⌘M) to remove";
export function quoteRefusal(state: EditorState, shift: boolean): string {
  if (spills(state)) return "Tab indents one list, quote, or code block at a time";
  const $from = state.selection.$from, d = quoteDepth(state);
  if (d && $from.node(d).textContent === "" && $from.node(d).childCount <= 1) return "⌃⌘M toggles markdown";
  return shift ? QUOTE_FLOOR : "⌃⌘M toggles markdown";
}
export function quoteKeymap(onRefuse?: (why: string) => void): Plugin {
  const refusing = (cmd: Command, shift: boolean): Command => (state, dispatch, view) => {
    if (!quoteDepth(state)) return false;
    if (cmd(state, dispatch, view)) return true;
    onRefuse?.(quoteRefusal(state, shift));
    return true;
  };
  return keymap({ Tab: refusing(tabInQuote, false), "Shift-Tab": refusing(shiftTabInQuote, true) });
}
