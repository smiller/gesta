/* The ::: family has no as-you-type arm. Backspace straight after any rule
   undoes it (pin: typing.test › Backspace straight after a rule undoes it) */
import { InputRule, inputRules, undoInputRule } from "prosemirror-inputrules";
import { type Command, type EditorState, type Transaction, Selection, Plugin } from "prosemirror-state";
import { findWrapping, canJoin } from "prosemirror-transform";
import type { MarkType, NodeType, Node, Attrs, ResolvedPos } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { schema } from "../model/schema.ts";
import { trimUrl, URL_START } from "../model/parse.ts";

const N = schema.nodes, M = schema.marks;
type Handler = (state: EditorState, match: RegExpMatchArray, start: number, end: number) => Transaction | null;

const BLOCK_HOSTS = new Set([N.doc, N.blockquote, N.card, N.note, N.margin_note]);
function inParagraph(state: EditorState): boolean {
  const $f = state.selection.$from;
  return $f.parent.type === N.paragraph && BLOCK_HOSTS.has($f.node(-1).type);
}
/* inside a code span nothing curls, links or marks */
function inCode(state: EditorState): boolean {
  return !!M.code.isInSet(state.storedMarks || state.selection.$from.marks());
}
function guarded(re: RegExp, guard: (s: EditorState) => boolean, handler: Handler): InputRule {
  return new InputRule(re, (state, match, start, end) => (guard(state) ? handler(state, match, start, end) : null));
}
const prose = (s: EditorState): boolean => !inCode(s);

/* ---------- block markers ---------- */
/* A MARKER OPENS THE CARET'S LINE, not only its paragraph: a quote's lines
   are one paragraph with breaks, and a `-` or a `#` on a fresh line inside
   a quote starts a list or a heading within it.
   The text before the caret shows a break as ￼, so the rule is anchored at
   the start or at one, and a match behind a break first peels that line
   into its own paragraph — the line alone, the lines below it left a
   paragraph of their own (pin: typing.test › a marker on a middle line
   takes that line alone). The handler then works on the peeled paragraph.
   A `>` behind a break inside a quote stays text: it would nest the quote
   (pin: typing.test › a marker on a middle line takes that line alone). */
type LineHandler = (tr: Transaction, match: RegExpMatchArray, start: number, end: number) => Transaction | null;
const breakAfter = (c: Node, offset: number, $at: ResolvedPos): boolean => c.type === N.hard_break && offset >= $at.parentOffset;
function nextBreak($at: ResolvedPos): number {
  let next = -1;
  $at.parent.forEach((c, offset) => { if (next < 0 && breakAfter(c, offset, $at)) next = $at.start() + offset; });
  return next;
}
function peelLine(tr: Transaction, $at: ResolvedPos, start: number): void {
  const next = nextBreak($at);
  if (next >= 0) tr.delete(next, next + 1).split(next);
  tr.delete(start, start + 1).split(start);
}
function blockRule(re: RegExp, handler: LineHandler, inQuoteAfterBreak = true): InputRule {
  return new InputRule(new RegExp("(?:^|￼)" + re.source.slice(1)), (state, m, start, end) => {
    if (!inParagraph(state)) return null;
    const tr = state.tr;
    if (!m[0].startsWith("￼")) return handler(tr, m, start, end);
    const $at = state.selection.$from;
    if (!inQuoteAfterBreak && $at.node(-1).type === N.blockquote) return null;
    peelLine(tr, $at, start);
    return handler(tr, m, start + 2, end + 1);
  });
}
type Joins = (before: Node) => boolean;
function joinsBefore(tr: Transaction, at: number, type: NodeType, joins?: Joins): boolean {
  const before = at > 0 ? tr.doc.resolve(at).nodeBefore : null;
  if (before?.type !== type) return false;
  return canJoin(tr.doc, at) && (!joins || joins(before));
}
function wrapIn(tr: Transaction, pos: number, type: NodeType, opts: { attrs?: Attrs; joins?: Joins } = {}): Transaction | null {
  const range = tr.doc.resolve(pos).blockRange();
  if (!range) return null;
  const wrapping = findWrapping(range, type, opts.attrs ?? null);
  if (!wrapping) return null;
  tr.wrap(range, wrapping);
  if (joinsBefore(tr, range.start, type, opts.joins)) tr.join(range.start);
  return tr;
}
const heading = blockRule(/^(#{1,6})\s$/, (tr, m, start, end) =>
  tr.delete(start, end).setBlockType(start, start, N.heading, { level: m[1].length }));
const quote = blockRule(/^>\s$/, (tr, _m, start, end) => wrapIn(tr.delete(start, end), start, N.blockquote), false);
const nestedQuote = blockRule(/^>>\s$/, (tr, _m, start, end) => {
  tr.delete(start, end);
  const range = tr.doc.resolve(start).blockRange()!;
  return tr.wrap(range, [{ type: N.blockquote }, { type: N.blockquote }]);
}, false);
const bullets = blockRule(/^([-*])\s$/, (tr, _m, start, end) => wrapIn(tr.delete(start, end), start, N.bullet_list, { joins: () => true }));
/* a numbered marker opens the list AT its number, so a countdown typed
   here reads as typed; it joins the list above only where it continues it */
const numbers = blockRule(/^(\d+)[.)]\s$/, (tr, m, start, end) =>
  wrapIn(tr.delete(start, end), start, N.ordered_list, {
    attrs: { start: +m[1] },
    joins: (before) => before.childCount + (before.attrs.start as number) === +m[1],
  }));

/* ---------- inline marks, on the closing marker ---------- */
/* \ufffc is a line break's stand-in in the text before the caret: a mark
   typed at the start of a broken line closes as at a paragraph's start
   (pin: typing.test › emphasis typed at the start of a line after a line break) */
const BOUND = "(^|[\\s\\u200B\\ufffc([{\"'“”‘’—–-])";
function markRule(source: string, mark: MarkType): InputRule {
  return guarded(new RegExp(BOUND + source), prose, (state, m, start, end) => {
    const bodyFrom = start + m[1].length + m[2].length, bodyTo = bodyFrom + m[3].length;
    if (bodyTo === bodyFrom) return null;
    /* THE BODY KEEPS ITS MARKS: the markers come out and the mark goes on
       over what is there, so an italic inside a bold, or a link autolinked
       inside either, survives */
    const tr = state.tr;
    tr.delete(bodyTo, end);
    tr.addMark(bodyFrom, bodyTo, mark.create());
    tr.delete(start + m[1].length, bodyFrom);
    return tr.removeStoredMark(mark);
  });
}
const strong = markRule("(\\*\\*|__)(?!\\s)([^]*?\\S)\\2$", M.strong);
const em = markRule("([*_])(?![\\s*_])([^*_]*?[^\\s*_])\\2$", M.em);
const strike = markRule("(~~)(?!\\s)([^]*?\\S)\\2$", M.strike);
const code = markRule("(`)([^`]+?)\\2$", M.code);

/* ---------- dashes and quotes ---------- */
const dash = guarded(/(\s)--(\s)$/, prose, (state, m, start, end) => state.tr.insertText(m[1] + "—" + m[2], start, end));
/* a quote opens after the start, whitespace, an opening
   bracket, a dash or another opening quote, and closes otherwise — so an
   in-word apostrophe is a right single quote. A leaf node before it (the
   ￼ a page label or a picture reads as) opens (pin: typing.test › quotes curl as
   typed, and a second quote steps the curl) */
export function curlChar(q: string, prev: string): string {
  const open = !prev || /[\s([{—–“‘\-￼]/.test(prev);
  return q === "\"" ? (open ? "“" : "”") : (open ? "‘" : "’");
}
/* a second quote right behind the curl it just made steps it: a closing
   curl escapes to a straight quote, an opening single flips to a right
   single — the leading apostrophe of ’tis */
const escapeDouble = guarded(/”"$/, prose, (state, _m, start, end) => state.tr.insertText("\"", start, end));
const escapeSingle = guarded(/’'$/, prose, (state, _m, start, end) => state.tr.insertText("'", start, end));
const elision = guarded(/‘'$/, prose, (state, _m, start, end) => state.tr.insertText("’", start, end));
const curl = guarded(/([^]?)(["'])$/, prose, (state, m, _start, end) => state.tr.insertText(curlChar(m[2], m[1]), end, end));

/* ---------- links ---------- */
const URL_HEAD = /^(https?:\/\/|www\.)\S/i;
function href(url: string): string { return /^www\./i.test(url) ? "https://" + url : url; }
/* a text that is one URL and nothing more: the address it links to */
export function bareUrl(text: string): string | null {
  if (!URL_HEAD.test(text)) return null;
  const run = URL_START.exec(text);
  return run && trimUrl(run[0]) === text ? href(text) : null;
}
const linkable = (state: EditorState): boolean => {
  const $f = state.selection.$from;
  return state.selection.empty && $f.parent.isTextblock && !$f.parent.type.spec.code && !inCode(state) && !M.link.isInSet($f.marks());
};
function urlWordBefore($f: ResolvedPos): string | null {
  const m = /(\S+)$/.exec($f.parent.textBetween(0, $f.parentOffset, undefined, "￼"));
  return m && URL_HEAD.test(m[1]) ? m[1] : null;
}
export function autolinkTr(state: EditorState): Transaction | null {
  if (!linkable(state)) return null;
  const $f = state.selection.$from, word = urlWordBefore($f);
  const run = word ? URL_START.exec(word) : null;
  if (!word || !run) return null;
  const url = trimUrl(run[0]), start = $f.pos - word.length;
  return state.tr.addMark(start, start + url.length, M.link.create({ href: href(url) }));
}
const autolink = new InputRule(/\S\s$/, (state, _m, _start, end) => {
  const tr = autolinkTr(state);
  return tr && tr.insertText(" ", end, end);
});
const mdLink = guarded(/\[([^\]\n]+)\]\(([^)\s]+)\)$/, prose, (state, m, start, end) => {
  if (M.link.isInSet(state.selection.$from.marks())) return null;
  const labelFrom = start + 1, labelTo = labelFrom + m[1].length;
  const tr = state.tr;
  tr.delete(labelTo, end);
  tr.addMark(labelFrom, labelTo, M.link.create({ href: href(m[2]) }));
  tr.delete(start, labelFrom);
  /* what is typed next is plain: the caret now touches the label's own
     marks, and an italic label would otherwise run on into the prose */
  return tr.setStoredMarks([]);
});

export const typingRules = [
  heading, quote, nestedQuote, bullets, numbers,
  strong, em, strike, code,
  dash, escapeDouble, escapeSingle, elision, curl,
  mdLink, autolink,
];
export function typing() { return inputRules({ rules: typingRules }); }

/* ---------- the Enter arms ---------- */
const atParagraphEnd = (state: EditorState): boolean => {
  const { $from, empty } = state.selection;
  return empty && $from.parent.type === N.paragraph && $from.parentOffset === $from.parent.content.size;
};
function lastLineStart(para: Node): number {
  let lineStart = 0;
  para.forEach((child, offset) => { if (child.type === N.hard_break) lineStart = offset + 1; });
  return lineStart;
}
function placeCodeBlock(tr: Transaction, $from: ResolvedPos, lineStart: number, block: Node): number {
  const pStart = $from.before(), pEnd = $from.after();
  if (lineStart === 0) { tr.replaceWith(pStart, pEnd, block); return pStart; }
  tr.delete(pStart + lineStart, pEnd - 1);
  const at = tr.mapping.map(pEnd);
  tr.insert(at, block);
  return at;
}
export const fenceEnter: Command = (state, dispatch) => {
  if (!atParagraphEnd(state)) return false;
  const $from = state.selection.$from, lineStart = lastLineStart($from.parent);
  const m = $from.parent.textBetween(lineStart, $from.parent.content.size).trim().match(/^```[ \t]*(\S*)$/);
  if (!m) return false;
  const tr = state.tr;
  const at = placeCodeBlock(tr, $from, lineStart, N.code_block.create({ lang: m[1].replace(/`/g, "").toLowerCase() }));
  dispatch?.(tr.setSelection(Selection.near(tr.doc.resolve(at + 1))).scrollIntoView());
  return true;
};
/* a URL finished with Enter links first, then Enter does what it does
   THERE: the handler links and returns false, so the key goes on down the
   chain. A command calling the base Enter itself split a bare URL's list
   item inside the item instead of making the next one (pin: editor.test ›
   Enter after a bare URL links it, then does what Enter does there) */
const plainEnter = (e: KeyboardEvent): boolean => e.key === "Enter" && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey;
export const autolinkEnter = new Plugin({
  props: {
    handleKeyDown(view, event) {
      if (!plainEnter(event)) return false;
      const tr = autolinkTr(view.state);
      if (tr) view.dispatch(tr);
      return false;
    },
  },
});

export const typingBindings: Record<string, Command> = {
  Backspace: undoInputRule,
  Enter: fenceEnter,
};
export const typingKeymap = keymap(typingBindings);
