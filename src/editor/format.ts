/* inside a code block only the toggle back out is offered: the block
   commands corrupt code */
import { type Command, type EditorState, TextSelection } from "prosemirror-state";
import type { Node } from "prosemirror-model";
import { toggleMark, setBlockType, wrapIn, lift } from "prosemirror-commands";
import { schema } from "../model/schema.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { flattenDoc } from "../model/flatten.ts";
import { curlChar } from "./typing.ts";
import { keymap } from "prosemirror-keymap";

const N = schema.nodes, M = schema.marks;
export const bold = toggleMark(M.strong);
export const italic = toggleMark(M.em);
export const underline = toggleMark(M.underline);
export const strike = toggleMark(M.strike);
export function inBlock(state: EditorState, type: Node["type"]): boolean {
  const $from = state.selection.$from;
  for (let d = $from.depth; d >= 0; d--) if ($from.node(d).type === type) return true;
  return false;
}
export const inCode = (state: EditorState): boolean => state.selection.$from.parent.type === N.code_block;
const isHeading = (state: EditorState): boolean => state.selection.$from.parent.type === N.heading && state.selection.$from.parent.attrs.level === 1;
export const heading: Command = (state, dispatch) =>
  (isHeading(state) ? setBlockType(N.paragraph) : setBlockType(N.heading, { level: 1 }))(state, dispatch);
export const quote: Command = (state, dispatch) => (inBlock(state, N.blockquote) ? lift : wrapIn(N.blockquote))(state, dispatch);
/* a code block holds text alone: a picture or a page marker in the range
   was dropped by the change (pin: format.test › code refuses a paragraph holding a picture or a page marker anywhere in it) */
export function codeBlockRefusal(state: EditorState): string | null {
  if (inCode(state)) return null;
  const { from, to } = state.selection;
  let atom = false;
  /* every textblock the change reaches, whole: it converts them whole */
  state.doc.nodesBetween(from, to, (n) => {
    if (!n.isTextblock) return !atom;
    n.forEach((c) => { if (c.isInline && c.isLeaf && !c.isText && c.type !== N.hard_break) atom = true; });
    return false;
  });
  return atom ? "can't make a code block from that" : null;
}
export const codeBlock: Command = (state, dispatch) =>
  codeBlockRefusal(state) ? false : (inCode(state) ? setBlockType(N.paragraph) : setBlockType(N.code_block))(state, dispatch);
export function formatState(state: EditorState): Record<string, boolean> {
  const { from, $from, to, empty } = state.selection;
  const has = (m: typeof M.strong): boolean => empty ? !!m.isInSet(state.storedMarks || $from.marks()) : state.doc.rangeHasMark(from, to, m);
  return { bold: has(M.strong), italic: has(M.em), underline: has(M.underline), strike: has(M.strike), heading: isHeading(state), quote: inBlock(state, N.blockquote), code: inCode(state) };
}
const EM_DASH_RE = /([^-])--(?!-)/g;
const DASH_CLOSE_RE = /([—–])([“‘]+)(?=[\s,;:!?)]|\.(?!\.)|$)/g;
const ELISION_RE = /‘(?=(?:t(?:is|was|were|will|would)|gainst|neath|twixt|em|mid|midst|round|cause)\b)/gi;
export function curlQuotes(text: string, prev: string): string {
  text = text.replace(EM_DASH_RE, "$1—");
  let out = "", p = prev || "";
  for (let i = 0; i < text.length; i++) {
    let c = text.charAt(i);
    if (c === '"' || c === "'") c = curlChar(c, p);
    out += c;
    p = c;
  }
  out = out.replace(DASH_CLOSE_RE, (_, dash: string, quotes: string) => dash + quotes.replace(/“/g, "”").replace(/‘/g, "’"));
  return out.replace(ELISION_RE, "’");
}
export const curlSelection: Command = (state, dispatch) => {
  const { from, to, empty } = state.selection;
  if (empty) return false;
  const edits: { from: number; to: number; text: string }[] = [];
  let prevBlock = -1, prev = "";
  state.doc.nodesBetween(from, to, (n, pos, parent) => {
    if (n.type === N.code_block) return false;
    if (!n.isText) return true;
    if (M.code.isInSet(n.marks) || parent?.type === N.code_block) { prev = ""; return true; }
    const $pos = state.doc.resolve(pos), block = $pos.before($pos.depth);
    if (block !== prevBlock) { prev = ""; prevBlock = block; }
    const s = Math.max(from, pos) - pos, e = Math.min(to, pos + n.nodeSize) - pos;
    if (s > 0) prev = n.text!.charAt(s - 1);
    const seg = n.text!.slice(s, e);
    const curled = curlQuotes(seg, prev);
    if (curled !== seg) edits.push({ from: pos + s, to: pos + e, text: curled });
    prev = curled.slice(-1) || prev;
    return true;
  });
  if (!edits.length) return false;
  if (dispatch) {
    const tr = state.tr;
    for (const ed of edits.reverse()) tr.insertText(ed.text, ed.from, ed.to);
    tr.setSelection(TextSelection.create(tr.doc, from, tr.mapping.map(to)));
    dispatch(tr);
  }
  return true;
};
export function wordsOf(text: string): number {
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
}
export function wordCount(doc: Node, from: number, to: number): number {
  return wordsOf(flattenDoc(from === to ? doc : doc.cut(from, to)).text);
}
/* a run inside ONE textblock is a paragraph of it — a word cut from a verse
   line is not a one-line fence; but a WHOLE heading stays a heading: cut as
   a paragraph, a tagged heading lost its "#"; across blocks, the covered
   structure cut (pin: format.test › cutMd and replaceWithLink)
   (pin: format.test › cutMd: a whole heading selected alone) */
export function cutMd(doc: Node, from: number, to: number): string {
  const $from = doc.resolve(from), $to = doc.resolve(to);
  if ($from.sameParent($to) && $from.parent.isTextblock && $from.parent.type !== N.code_block) {
    const block = $from.parent, content = block.slice($from.parentOffset, $to.parentOffset).content;
    const whole = $from.parentOffset === 0 && $to.parentOffset === block.content.size;
    const piece = whole && block.type === N.heading ? block.copy(content) : N.paragraph.create(null, content);
    return serializeMarkdown(N.doc.create(null, [piece])).trim();
  }
  return serializeMarkdown(doc.cut(from, to)).trim();
}
export function replaceWithLink(state: EditorState, from: number, to: number, href: string, label: string): EditorState["tr"] {
  const tr = state.tr;
  const link = schema.text(label, [M.link.create({ href })]);
  tr.deleteRange(from, to);
  const at = tr.mapping.map(from);
  const $at = tr.doc.resolve(at);
  if ($at.parent.isTextblock) {
    tr.insert(at, link);
    if ($at.parent.type !== N.paragraph && $at.parent.type !== N.line && $at.parent.type !== N.cell && $at.parent.textContent === "") {
      tr.setBlockType($at.before(), $at.before() + 1, N.paragraph);
    }
  } else {
    tr.insert(at, N.paragraph.create(null, link));
  }
  return tr;
}
export const formatKeymap = keymap({ "Mod-b": bold, "Mod-i": italic, "Mod-u": underline, "Mod-'": curlSelection });

