/* inside a code block only the toggle back out is offered: the block
   commands corrupt code */
import { type Command, type EditorState, type Transaction, TextSelection } from "prosemirror-state";
import type { Node, NodeRange, ResolvedPos } from "prosemirror-model";
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
const isAtom = (c: Node): boolean => c.isInline && c.isLeaf && !c.isText && c.type !== N.hard_break;
export function codeBlockRefusal(state: EditorState): string | null {
  if (inCode(state)) return null;
  const from = state.selection.from, to = codeEnd(state).pos;
  let atom = false;
  /* every textblock the change reaches, whole: it converts them whole */
  state.doc.nodesBetween(from, to, (n) => {
    if (!n.isTextblock) return !atom;
    n.forEach((c) => { if (isAtom(c)) atom = true; });
    return false;
  });
  return atom ? "can’t make a code block from that" : null;
}
/* SEVERAL PARAGRAPHS BECOME ONE CODE BLOCK, a line each, and a selection
   ending at the very start of the next paragraph leaves that paragraph be
   (pin: format.test › code over several paragraphs makes one block); where
   nothing would change, the press is refused (pin: format.test › code
   refuses where it changes nothing) */
const endsAtNextStart = ($from: ResolvedPos, $to: ResolvedPos): boolean =>
  $to.parentOffset === 0 && !$to.sameParent($from) && $to.index($to.depth - 1) > 0 && $to.node($to.depth - 1).child($to.index($to.depth - 1) - 1).isTextblock;
function codeEnd(state: EditorState): ResolvedPos {
  const $from = state.selection.$from, $to = state.selection.$to;
  return endsAtNextStart($from, $to) ? state.doc.resolve($to.before() - 1) : $to;
}
function childrenIn(range: NodeRange): Node[] {
  const blocks: Node[] = [];
  for (let i = range.startIndex; i < range.endIndex; i++) blocks.push(range.parent.child(i));
  return blocks;
}
const paragraphsOnly = (blocks: Node[]): boolean => blocks.length >= 2 && blocks.every((b) => b.type === N.paragraph);
function asCodeBlocks(state: EditorState, from: number, to: number, dispatch?: (tr: Transaction) => void): boolean {
  const tr = state.tr.setBlockType(from, to, N.code_block);
  if (!tr.docChanged) return false;
  dispatch?.(tr.scrollIntoView());
  return true;
}
function joinedCode(state: EditorState, range: NodeRange, blocks: Node[]): Transaction {
  const text = blocks.map((b) => b.textBetween(0, b.content.size, undefined, "\n")).join("\n");
  const tr = state.tr.replaceWith(range.start, range.end, N.code_block.create(null, text ? state.schema.text(text) : null));
  /* the block's text left selected, as the paragraphs were */
  return tr.setSelection(TextSelection.create(tr.doc, range.start + 1, range.start + 1 + text.length)).scrollIntoView();
}
const toCode: Command = (state, dispatch) => {
  const $from = state.selection.$from, $to = codeEnd(state);
  const range = $from.blockRange($to);
  if (!range) return false;
  const blocks = childrenIn(range);
  if (!paragraphsOnly(blocks)) return asCodeBlocks(state, $from.pos, $to.pos, dispatch);
  dispatch?.(joinedCode(state, range, blocks));
  return true;
};
export const codeBlock: Command = (state, dispatch) =>
  codeBlockRefusal(state) ? false : inCode(state) ? setBlockType(N.paragraph)(state, dispatch) : toCode(state, dispatch);
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
interface CurlWalk { from: number; to: number; prev: string; prevBlock: number; edits: { from: number; to: number; text: string }[] }
function curlText(w: CurlWalk, doc: Node, n: Node, pos: number): void {
  const $pos = doc.resolve(pos), block = $pos.before($pos.depth);
  if (block !== w.prevBlock) { w.prev = ""; w.prevBlock = block; }
  const s = Math.max(w.from, pos) - pos, e = Math.min(w.to, pos + n.nodeSize) - pos;
  if (s > 0) w.prev = n.text!.charAt(s - 1);
  const seg = n.text!.slice(s, e), curled = curlQuotes(seg, w.prev);
  if (curled !== seg) w.edits.push({ from: pos + s, to: pos + e, text: curled });
  w.prev = curled.slice(-1) || w.prev;
}
const codeText = (n: Node, parent: Node | null): boolean => !!M.code.isInSet(n.marks) || parent?.type === N.code_block;
function curlEdits(state: EditorState): CurlWalk["edits"] {
  const { from, to } = state.selection;
  const w: CurlWalk = { from, to, prev: "", prevBlock: -1, edits: [] };
  state.doc.nodesBetween(from, to, (n, pos, parent) => {
    if (n.type === N.code_block) return false;
    if (!n.isText) return true;
    if (codeText(n, parent)) w.prev = "";
    else curlText(w, state.doc, n, pos);
    return true;
  });
  return w.edits;
}
export const curlSelection: Command = (state, dispatch) => {
  const { from, to, empty } = state.selection;
  if (empty) return false;
  const edits = curlEdits(state);
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
const inOneTextblock = ($from: ResolvedPos, $to: ResolvedPos): boolean => $from.sameParent($to) && $from.parent.isTextblock && $from.parent.type !== N.code_block;
export function cutMd(doc: Node, from: number, to: number): string {
  const $from = doc.resolve(from), $to = doc.resolve(to);
  if (inOneTextblock($from, $to)) {
    const block = $from.parent, content = block.slice($from.parentOffset, $to.parentOffset).content;
    const whole = $from.parentOffset === 0 && $to.parentOffset === block.content.size;
    const piece = whole && block.type === N.heading ? block.copy(content) : N.paragraph.create(null, content);
    return serializeMarkdown(N.doc.create(null, [piece])).trim();
  }
  return serializeMarkdown(doc.cut(from, to)).trim();
}
const LINK_HOSTS = new Set([N.paragraph, N.line, N.cell]);
export function replaceWithLink(state: EditorState, from: number, to: number, href: string, label: string): EditorState["tr"] {
  const tr = state.tr;
  const link = schema.text(label, [M.link.create({ href })]);
  tr.deleteRange(from, to);
  const at = tr.mapping.map(from);
  const $at = tr.doc.resolve(at);
  if ($at.parent.isTextblock) {
    tr.insert(at, link);
    if (!LINK_HOSTS.has($at.parent.type) && $at.parent.textContent === "") {
      tr.setBlockType($at.before(), $at.before() + 1, N.paragraph);
    }
  } else {
    tr.insert(at, N.paragraph.create(null, link));
  }
  return tr;
}
export const formatKeymap = keymap({ "Mod-b": bold, "Mod-i": italic, "Mod-u": underline, "Mod-'": curlSelection });

