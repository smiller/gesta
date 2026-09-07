/* Markdown as you type: the transforms the current app runs off its input
   listener (../writer/src/js/08-markdown-as-you-type.js, whose comments
   hold the cases), as ProseMirror input rules over the document. Inline
   marks close on their closing marker; block markers open a block on the
   space after them at a line's start; `--` between spaces is an em-dash;
   straight quotes curl, and a second quote steps the curl; a bare URL
   links on the space or the Enter after it; `[title](url)` links on its
   `)`; a ``` line and Enter opens a code block. The ::: family has no
   as-you-type arm here, as it has none in the current app. Backspace
   straight after any rule undoes it (prosemirror-inputrules' own
   undoInputRule) — the successor's spelling of "type the quote again". */
import { InputRule, inputRules, undoInputRule } from "prosemirror-inputrules";
import { type Command, type EditorState, type Transaction, Selection } from "prosemirror-state";
import { findWrapping, canJoin } from "prosemirror-transform";
import type { MarkType, NodeType, Node, Attrs } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { baseKeymap, chainCommands } from "prosemirror-commands";
import { schema } from "../model/schema.ts";
import { trimUrl, URL_START } from "../model/parse.ts";

const N = schema.nodes, M = schema.marks;
type Handler = (state: EditorState, match: RegExpMatchArray, start: number, end: number) => Transaction | null;

/* the parents a block marker may open a block in: the document, a quote, a
   card, a note — not an item's paragraph and never a row, as the current
   app refuses a caret nested deeper than a top-level block */
const BLOCK_HOSTS = new Set([N.doc, N.blockquote, N.card, N.note]);
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
   are one paragraph with breaks, and the README's rule is that a `-` or a
   `#` on a fresh line inside a quote starts a list or a heading within it.
   The text before the caret shows a break as ￼, so the rule is anchored at
   the start or at one, and a match behind a break first peels that line
   into its own paragraph. The handler then works on the peeled paragraph. */
type LineHandler = (tr: Transaction, match: RegExpMatchArray, start: number, end: number) => Transaction | null;
function blockRule(re: RegExp, handler: LineHandler): InputRule {
  return new InputRule(new RegExp("(?:^|￼)" + re.source.slice(1)), (state, m, start, end) => {
    if (!inParagraph(state)) return null;
    const tr = state.tr;
    if (m[0].startsWith("￼")) {
      tr.delete(start, start + 1).split(start);
      start += 2;
      end += 1;
    }
    return handler(tr, m, start, end);
  });
}
/* the paragraph at `pos` wrapped in `type`, joined to a block of that type
   directly above when `joins` says the two are one */
function wrapIn(tr: Transaction, pos: number, type: NodeType, attrs: Attrs | null, joins?: (before: Node) => boolean): Transaction | null {
  const range = tr.doc.resolve(pos).blockRange();
  if (!range) return null;
  const wrapping = findWrapping(range, type, attrs);
  if (!wrapping) return null;
  tr.wrap(range, wrapping);
  /* the block above sits before the wrapper's own start */
  const before = range.start > 0 ? tr.doc.resolve(range.start).nodeBefore : null;
  if (before && before.type === type && canJoin(tr.doc, range.start) && (!joins || joins(before))) tr.join(range.start);
  return tr;
}
const heading = blockRule(/^(#{1,6})\s$/, (tr, m, start, end) =>
  tr.delete(start, end).setBlockType(start, start, N.heading, { level: m[1].length }));
const quote = blockRule(/^>\s$/, (tr, _m, start, end) => wrapIn(tr.delete(start, end), start, N.blockquote, null));
const nestedQuote = blockRule(/^>>\s$/, (tr, _m, start, end) => {
  tr.delete(start, end);
  const range = tr.doc.resolve(start).blockRange()!;
  return tr.wrap(range, [{ type: N.blockquote }, { type: N.blockquote }]);
});
const bullets = blockRule(/^([-*])\s$/, (tr, _m, start, end) => wrapIn(tr.delete(start, end), start, N.bullet_list, null, () => true));
/* a numbered marker opens the list AT its number, so a countdown typed
   here reads as typed; it joins the list above only where it continues it */
const numbers = blockRule(/^(\d+)[.)]\s$/, (tr, m, start, end) =>
  wrapIn(tr.delete(start, end), start, N.ordered_list, { start: +m[1] },
    (before) => before.childCount + (before.attrs.start as number) === +m[1]));

/* ---------- inline marks, on the closing marker ---------- */
/* a boundary before the opening marker: the line's start, whitespace, an
   opening bracket, a quote, a dash */
const BOUND = "(^|[\\s\\u200B([{\"'“”‘’—–-])";
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
/* the smart-quote form of a straight quote given the character before it
   (md.mjs, curlChar): a quote opens after the start, whitespace, an opening
   bracket, a dash or another opening quote, and closes otherwise — so an
   in-word apostrophe is a right single quote. A leaf node before it (the
   ￼ a folio or a picture reads as) opens. */
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
/* the bare URL the caret has just finished, linked; null when there is none */
export function autolinkTr(state: EditorState): Transaction | null {
  const $f = state.selection.$from;
  if (!state.selection.empty || !$f.parent.isTextblock || $f.parent.type.spec.code || inCode(state)) return null;
  if (M.link.isInSet($f.marks())) return null;
  const before = $f.parent.textBetween(0, $f.parentOffset, undefined, "￼");
  const m = /(\S+)$/.exec(before);
  if (!m || !URL_HEAD.test(m[1])) return null;
  const run = URL_START.exec(m[1]);
  if (!run) return null;
  const url = trimUrl(run[0]);
  const start = $f.pos - m[1].length;
  return state.tr.addMark(start, start + url.length, M.link.create({ href: href(url) }));
}
const autolink = new InputRule(/\S\s$/, (state, _m, _start, end) => {
  const tr = autolinkTr(state);
  return tr && tr.insertText(" ", end, end);
});
/* [title](url) becomes a link the moment its ) lands; the label keeps its marks */
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
/* a ``` line (with an optional language) and Enter opens a code block on
   the caret's own line: earlier lines of the paragraph stay a paragraph */
export const fenceEnter: Command = (state, dispatch) => {
  const { $from, empty } = state.selection;
  if (!empty || $from.parent.type !== N.paragraph || $from.parentOffset !== $from.parent.content.size) return false;
  let lineStart = 0;
  $from.parent.forEach((child, offset) => { if (child.type === N.hard_break) lineStart = offset + 1; });
  const m = $from.parent.textBetween(lineStart, $from.parent.content.size).trim().match(/^```[ \t]*(\S*)$/);
  if (!m) return false;
  const block = N.code_block.create({ lang: m[1].replace(/`/g, "").toLowerCase() });
  const pStart = $from.before(), pEnd = $from.after();
  const tr = state.tr;
  let at = pStart;
  if (lineStart === 0) tr.replaceWith(pStart, pEnd, block);
  else {
    tr.delete(pStart + lineStart, pEnd - 1);
    at = tr.mapping.map(pEnd);
    tr.insert(at, block);
  }
  dispatch?.(tr.setSelection(Selection.near(tr.doc.resolve(at + 1))).scrollIntoView());
  return true;
};
/* a URL finished with Enter links first, then Enter does what it does */
const linkThenEnter: Command = (state, dispatch, view) => {
  const tr = autolinkTr(state);
  if (!tr || !dispatch || !view) return false;
  dispatch(tr);
  baseKeymap.Enter(view.state, view.dispatch, view);
  return true;
};

export const typingBindings: Record<string, Command> = {
  Backspace: undoInputRule,
  Enter: chainCommands(fenceEnter, linkThenEnter),
};
export const typingKeymap = keymap(typingBindings);
