/* A heading, a table or a card inside a quote moves as the one thing it is
   (pin: quoteKeys.test › a heading or a table in a quote nests alone);
   a list inside a quote takes the list arm first, the innermost thing the
   caret is in winning by keymap order. A selection reaching outside the
   outermost quote has no single container and says so (pin: quoteKeys.test
   › a selection reaching outside the quote has no single container);
   Shift-Tab on an outermost quote does nothing and says so — leaving a
   quote altogether is the source view's job (pin: quoteKeys.test ›
   Shift-Tab at the outermost level refuses and says so). A held Tab must
   not go on nesting: a quote has no ceiling, so the press acts once per
   press where Shift-Tab may repeat, having a floor. */
import { type Command, type EditorState, type Transaction, TextSelection } from "prosemirror-state";
import { keymap } from "prosemirror-keymap";
import { lift } from "prosemirror-commands";
import type { Plugin } from "prosemirror-state";
import { Fragment, NodeRange, type Node, type ResolvedPos } from "prosemirror-model";
import { liftTarget } from "prosemirror-transform";
import { schema } from "../model/schema.ts";

const Q = schema.nodes.blockquote, P = schema.nodes.paragraph, BR = schema.nodes.hard_break;
/* THE UNIT IS THE RUN: a quote's body is ONE paragraph of lines with
   breaks, a blank line being two breaks, so what Tab moves is the run of
   lines between the blank lines around the selection — several runs when
   the selection crosses a blank line — cut out of the paragraph and wrapped
   in a quote of its own (pin: quoteKeys.test › Tab pushes the run one level
   deeper) (pin: quoteKeys.test › a selection across two runs of one quote
   moves both) */
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
function quoteDepth(state: EditorState): number {
  const $from = state.selection.$from;
  for (let d = $from.depth; d >= 1; d--) if ($from.node(d).type === Q) return d;
  return 0;
}
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
/* the block the selection sits in, when it is the quote's own child and not
   a paragraph of lines: the unit Tab moves whole */
function wholeBlock(state: EditorState): NodeRange | null {
  const d = quoteDepth(state), { $from, $to } = state.selection;
  if ($from.depth <= d || $from.node(d + 1).type === P) return null;
  if ($to.depth <= d || $to.before(d + 1) !== $from.before(d + 1)) return null;
  return new NodeRange(state.doc.resolve($from.before(d + 1)), state.doc.resolve($from.after(d + 1)), d);
}
interface RunCut { run: Fragment; before: Fragment; after: Fragment; start: number }
function cutRun(para: Node, $from: ResolvedPos, $to: ResolvedPos): RunCut | null {
  const runs = runsOf(para);
  const first = runs.find((r) => $from.parentOffset <= r.to)!, last = runs.slice().reverse().find((r) => $to.parentOffset >= r.from) || first;
  const run = para.content.cut(first.from, last.to);
  if (!run.size || !run.textBetween(0, run.size).trim()) return null;
  return { run, start: first.from, before: para.content.cut(0, Math.max(0, first.from - 2)), after: para.content.cut(Math.min(para.content.size, last.to + 2)) };
}
function nestRun(state: EditorState, c: RunCut): Transaction {
  const $from = state.selection.$from, base = $from.start();
  const nodes: Node[] = [];
  if (c.before.size) nodes.push(P.create(null, c.before));
  nodes.push(Q.create(null, P.create(null, c.run)));
  if (c.after.size) nodes.push(P.create(null, c.after));
  const tr = state.tr.replaceWith($from.before(), $from.after(), Fragment.from(nodes));
  const at = base - 1 + (c.before.size ? c.before.size + 2 : 0) + 2 + ($from.parentOffset - c.start);
  tr.setSelection(TextSelection.create(tr.doc, Math.min(at, tr.doc.content.size)));
  return tr.scrollIntoView();
}
function runInLine(state: EditorState): RunCut | null {
  const { $from, $to } = state.selection;
  if ($from.parent.type !== P || !$from.sameParent($to)) return null;
  return cutRun($from.parent, $from, $to);
}
function wrapBlock(state: EditorState, block: NodeRange, dispatch?: (tr: Transaction) => void): boolean {
  dispatch?.(state.tr.wrap(block, [{ type: Q }]).scrollIntoView());
  return true;
}
export const tabInQuote: Command = (state, dispatch) => {
  if (!quoteDepth(state) || spills(state)) return false;
  const block = wholeBlock(state);
  if (block) return wrapBlock(state, block, dispatch);
  const cut = runInLine(state);
  if (!cut) return false;
  dispatch?.(nestRun(state, cut));
  return true;
};
function allParagraphs(inner: Node): boolean {
  let flat = true;
  inner.forEach((c) => { if (c.type !== P) flat = false; });
  return flat;
}
function liftBlock(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const block = wholeBlock(state), target = block && liftTarget(block);
  if (!block || target == null) return lift(state, dispatch);
  dispatch?.(state.tr.lift(block, target).scrollIntoView());
  return true;
}
interface Lifted { before: Fragment; after: Fragment; parts: Fragment[]; start: number }
/* ONE RUN OF A ONE-PARAGRAPH INNER QUOTE LIFTS ALONE, the runs before and
   after it staying nested, as Tab nests one run (pin: quoteKeys.test ›
   Shift-Tab on one run of a nested quote lifts that run alone); a blank
   line between runs lifts nothing (pin: quoteKeys.test › Shift-Tab on the
   blank line between two runs) */
function liftedParts(state: EditorState, inner: Node): Lifted | null {
  const { $from, $to } = state.selection;
  if (inner.childCount !== 1 || !$from.sameParent($to)) {
    const parts: Fragment[] = [];
    inner.forEach((c) => parts.push(c.content));
    return { before: Fragment.empty, after: Fragment.empty, parts, start: 0 };
  }
  const cut = cutRun(inner.firstChild!, $from, $to);
  return cut && { before: cut.before, after: cut.after, parts: [cut.run], start: cut.start };
}
const blankLine = (): Node[] => [BR.create(), BR.create()];
function joinedLines(parts: Fragment[]): Node[] {
  const joined: Node[] = [];
  parts.forEach((f, i) => { if (i) joined.push(...blankLine()); f.forEach((n) => joined.push(n)); });
  return joined;
}
function splicedNodes(l: Lifted, joined: Node[]): Node[] {
  const nodes: Node[] = [];
  if (l.before.size) nodes.push(Q.create(null, P.create(null, l.before)));
  nodes.push(P.create(null, Fragment.from(joined)));
  if (l.after.size) nodes.push(Q.create(null, P.create(null, l.after)));
  return nodes;
}
function neighbours(outer: Node, i: number): { prev: Node | null; next: Node | null } {
  return { prev: i > 0 ? outer.child(i - 1) : null, next: i + 1 < outer.childCount ? outer.child(i + 1) : null };
}
const joinable = (n: Node | null, edge: Fragment): Node | null => (!edge.size && n?.type === P ? n : null);
function gathered(state: EditorState, d: number, l: Lifted): { from: number; to: number; parts: Fragment[]; lead: number } {
  const $from = state.selection.$from;
  const { prev, next } = neighbours($from.node(d - 1), $from.index(d - 1));
  const before = joinable(prev, l.before), after = joinable(next, l.after);
  const parts = [...(before ? [before.content] : []), ...l.parts, ...(after ? [after.content] : [])];
  return { from: $from.before(d) - (before?.nodeSize ?? 0), to: $from.after(d) + (after?.nodeSize ?? 0), parts, lead: before ? before.content.size + 2 : 0 };
}
function spliceBack(state: EditorState, d: number, l: Lifted): Transaction {
  const $from = state.selection.$from, g = gathered(state, d, l);
  const nodes = splicedNodes(l, joinedLines(g.parts));
  const tr = state.tr.replaceWith(g.from, g.to, Fragment.from(nodes));
  const at = g.from + (l.before.size ? nodes[0].nodeSize : 0) + 1 + g.lead + ($from.pos - $from.start() - l.start);
  tr.setSelection(TextSelection.create(tr.doc, Math.min(at, tr.doc.content.size)));
  return tr.scrollIntoView();
}
/* the inverse: the inner quote's lines spliced back into the outer's flat
   run, a blank line either side, joined with the paragraphs beside it:
   two paragraphs left adjacent read back as one run. An inner quote
   holding anything but paragraphs lifts the block the caret is in, whole,
   and failing that takes the library's lift. */
export const shiftTabInQuote: Command = (state, dispatch) => {
  if (!quoteDepth(state) || spills(state)) return false;
  const d = quoteDepth(state);
  if (d === outermost(state)) return false;
  const inner = state.selection.$from.node(d);
  if (!allParagraphs(inner)) return liftBlock(state, dispatch);
  const lifted = liftedParts(state, inner);
  if (!lifted) return false;
  dispatch?.(spliceBack(state, d, lifted));
  return true;
};
const inQuoteLine = (state: EditorState): boolean => {
  const $from = state.selection.$from;
  return !!quoteDepth(state) && $from.parent.type === P && $from.node(-1).type === Q;
};
const atQuoteEnd = (state: EditorState): boolean => {
  const { $from, empty } = state.selection;
  return empty && $from.parentOffset === $from.parent.content.size && $from.index(-1) === $from.node(-1).childCount - 1;
};
function leaveQuote(state: EditorState): Transaction {
  const $from = state.selection.$from;
  const tr = state.tr.delete($from.pos - 1, $from.pos);
  const after = tr.mapping.map($from.after(-1));
  tr.insert(after, P.create());
  return tr.setSelection(TextSelection.create(tr.doc, after + 1)).scrollIntoView();
}
/* ENTER IN A QUOTE BREAKS THE LINE, the quote's lines being one
   paragraph's; Enter on its empty last line takes the break back and
   leaves the quote for a paragraph below it (pin: quoteKeys.test › Enter in
   a quote breaks the line) */
export const enterInQuote: Command = (state, dispatch) => {
  if (!inQuoteLine(state)) return false;
  const para = state.selection.$from.parent;
  if (atQuoteEnd(state) && para.lastChild?.type === BR) {
    dispatch?.(leaveQuote(state));
    return true;
  }
  if (!para.content.size) return false;
  dispatch?.(state.tr.replaceSelectionWith(BR.create()).scrollIntoView());
  return true;
};
export const QUOTE_FLOOR = "at the outer level: switch to markdown (⌃⌘M) to remove";
const emptyQuote = (n: Node): boolean => n.textContent === "" && n.childCount <= 1;
export function quoteRefusal(state: EditorState, shift: boolean): string {
  if (spills(state)) return "Tab indents one list, quote, or code block at a time";
  const $from = state.selection.$from, d = quoteDepth(state);
  if (d && emptyQuote($from.node(d))) return "⌃⌘M toggles markdown";
  return shift && d === outermost(state) ? QUOTE_FLOOR : "⌃⌘M toggles markdown";
}
export function quoteKeymap(onRefuse?: (why: string) => void): Plugin {
  const refusing = (cmd: Command, shift: boolean): Command => (state, dispatch, view) => {
    if (!quoteDepth(state)) return false;
    if (cmd(state, dispatch, view)) return true;
    onRefuse?.(quoteRefusal(state, shift));
    return true;
  };
  return keymap({ Enter: enterInQuote, Tab: refusing(tabInQuote, false), "Shift-Tab": refusing(shiftTabInQuote, true) });
}
