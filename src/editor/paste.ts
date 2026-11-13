import { asAddress } from "../store/keys.ts";
import { Fragment, Slice, DOMParser, type ResolvedPos, type Node, type Mark, type ParseOptions } from "prosemirror-model";
import { type EditorState, type Transaction, TextSelection, Selection } from "prosemirror-state";
import type { EditorProps } from "prosemirror-view";
import { pastedImageFile } from "./images.ts";
import { schema } from "../model/schema.ts";
import { parseMarkdown } from "../model/parse.ts";
import { COPY_MARK } from "./copy.ts";
import { bareUrl } from "./typing.ts";
import { namesEntry, internalHash, makeHref } from "../store/nav.ts";
import { fenceRefusals, refusalsText } from "../model/fenceRefusals.ts";

const N = schema.nodes;
const LINE_BREAK_RE = /\r\n?|[\u2028\u2029]/g;
const ONE_HEADING_LINE = /^#{1,6} \S/;
const ONE_QUOTE_LINE = /^>+ \S/;
const INTERNAL_LINK_RE = /^\[[^\]]+\]\((#[^)\s]+)\)$/;
const FLAT_HOSTS = new Set([N.list_item, N.table_cell, N.line, N.cell]);
function inAny($ctx: ResolvedPos, types: Set<unknown>): boolean {
  for (let d = $ctx.depth; d >= 0; d--) if (types.has($ctx.node(d).type)) return true;
  return false;
}
/* A ONE-LINE QUOTE IS A QUOTE only outside one: pasted inside a quote it is
   that line's text, never a quote nested in it; and a picture is something
   drawn, so a quote holding one alone is not empty (pin: paste.test › a
   one-line quote pasted inside a quote is its text) */
const QUOTES = new Set([N.blockquote]);
const oneQuoteLine = (body: string, $context: ResolvedPos): boolean => ONE_QUOTE_LINE.test(body) && !inAny($context, QUOTES);
function draws(doc: Node): boolean {
  let yes = !!doc.textContent.trim();
  doc.descendants((n) => { if (n.type === N.image) yes = true; return !yes; });
  return yes;
}
function flat(lines: string[]): Slice {
  const nodes: Node[] = [];
  lines.forEach((l, i) => { if (i) nodes.push(N.hard_break.create()); if (l) nodes.push(schema.text(l)); });
  return new Slice(Fragment.from(nodes), 0, 0);
}
function onlyLineBreaks(raw: string, $context: ResolvedPos, html = ""): boolean {
  if ($context.parent.type.spec.code || html.includes("data-pm-slice")) return false;
  const txt = raw.replace(LINE_BREAK_RE, "\n");
  return txt.includes("\n") && !txt.trim();
}
const blockShaped = (body: string, lines: string[], $context: ResolvedPos): boolean =>
  lines.length > 1 || ONE_HEADING_LINE.test(body) || oneQuoteLine(body, $context);
function parsedBlocks(body: string, oneLine: boolean): Node[] | null {
  try {
    const doc = parseMarkdown(body);
    if (!draws(doc) && oneLine) return null;
    const blocks: Node[] = [];
    doc.forEach((b) => blocks.push(b));
    return blocks;
  } catch { return null; }
}
function pasteBlocks(raw: string, $context: ResolvedPos): Node[] | null {
  const body = raw.replace(LINE_BREAK_RE, "\n").replace(/\n$/, "");
  /* every code-shaped textblock is literal — the reference block too: a
     split there cut the one directive into two (pin: paste.test › inside a
     reference block every character is literal) */
  if ($context.parent.type.spec.code || inAny($context, FLAT_HOSTS)) return null;
  const lines = body.split("\n");
  if (!blockShaped(body, lines, $context) || INTERNAL_LINK_RE.test(body.trim())) return null;
  return parsedBlocks(body, lines.length === 1);
}
/* a pasted fence the model refuses is named with its reason (pin:
   paste.test › a pasted fence the model refuses is named)
   (pin: editing › a refused fence pasted) */
function pastedRefusal(blocks: Node[]): string | null {
  const refused = fenceRefusals(N.doc.create(null, blocks));
  return refused.length ? refusalsText(refused) : null;
}
/* SET DOWN, never fitted: a replace opens a block slice up to fit the
   paragraph it lands in and peels the first cell's text into it (MEASURED:
   a pasted verse fence lost its first original line to the paragraph
   above) (pin: paste.test › a verse fence pasted as text is set down
   whole) */
function insertedAt(tr: Transaction, pos: number, frag: Fragment): number {
  tr.insert(pos, frag);
  return pos;
}
function placeAt(tr: Transaction, $at: ResolvedPos, frag: Fragment): number {
  if (!$at.parent.isTextblock) return insertedAt(tr, $at.pos, frag);
  if (!$at.parent.content.size && $at.depth >= 1) {
    tr.replaceWith($at.before(), $at.after(), frag);
    return $at.before();
  }
  if ($at.parentOffset === 0) return insertedAt(tr, $at.before(), frag);
  if ($at.parentOffset === $at.parent.content.size) return insertedAt(tr, $at.after(), frag);
  tr.split($at.pos);
  return insertedAt(tr, tr.doc.resolve(tr.mapping.map($at.pos)).before(), frag);
}
function placeBlocks(state: EditorState, blocks: Node[]): Transaction {
  const tr = state.tr.deleteSelection();
  const frag = Fragment.from(blocks);
  const pos = placeAt(tr, tr.selection.$from, frag);
  tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(pos + frag.size, tr.doc.content.size)), -1));
  return tr;
}
const REFERENCE_HEAD_RE = /^(\[[^\]]+\]\((#[^)\s]+)\)):\n\n([^]*)$/;
const linkable = ($at: ResolvedPos): boolean => $at.parent.type.allowsMarkType(schema.marks.link);
function inlineSlice(md: string): Slice | null {
  try { return new Slice(parseMarkdown(md).firstChild!.content, 0, 0); } catch { return null; }
}
/* a copy made in this page pastes as itself: a cut reference and its
   quotation pasted mid-line arrived as the label alone, the quotation
   lost (pin: paste.test › text after a reference's first line) */
function pastedAddress(raw: string, html: string): { link: string; target: string; reference: boolean } | null {
  if (html.includes("data-pm-slice")) return null;
  const txt = raw.replace(LINE_BREAK_RE, "\n").trim();
  const ref = REFERENCE_HEAD_RE.exec(txt);
  const link = INTERNAL_LINK_RE.exec(txt);
  const found = ref && ref[3].split("\n").every((l) => l.startsWith(">")) ? { link: ref[1], target: ref[2], reference: true }
    : link ? { link: txt, target: link[1], reference: false } : null;
  return found && namesEntry(asAddress(found.target)) ? found : null;
}
const oneTextRun = (sel: Selection): boolean => !sel.empty && sel instanceof TextSelection && sel.$from.sameParent(sel.$to) && linkable(sel.$from);
function trimmedRange(doc: Node, from: number, to: number): [number, number] {
  while (from < to && /\s/.test(doc.textBetween(from, from + 1))) from++;
  while (to > from && /\s/.test(doc.textBetween(to - 1, to))) to--;
  return [from, to];
}
function linkSelection(state: EditorState, raw: string, html = ""): Transaction | null {
  const sel = state.selection;
  if (!oneTextRun(sel)) return null;
  const pasted = pastedAddress(raw, html);
  if (!pasted) return null;
  const [from, to] = trimmedRange(state.doc, sel.from, sel.to);
  if (from === to) return null;
  const tr = state.tr.addMark(from, to, schema.marks.link.create({ href: pasted.target }));
  return tr.setSelection(TextSelection.create(tr.doc, sel.to));
}
const typedLine = (sel: Selection): boolean => sel.empty && linkable(sel.$from) && !!sel.$from.parent.textContent.trim();
function referenceInLine(state: EditorState, raw: string, html = ""): Transaction | null {
  const sel = state.selection;
  if (!typedLine(sel)) return null;
  const pasted = pastedAddress(raw, html);
  const slice = pasted?.reference ? inlineSlice(pasted.link) : null;
  return slice && state.tr.replaceSelection(slice);
}
/* only PLAIN text is asked of this parser: HTML carries its own structure */
/* a link to an address naming no entry stays as typed: a dead link looked
   like a live one (pin: paste.test › a pasted link to an address that
   names no entry stays as typed); a bare URL alone is a link at once, not
   on the space typed after it (pin: paste.test › a bare URL pasted alone is
   a link at once) */
function linkSlice(body: string, oneLine: boolean): Slice | null {
  const url = oneLine ? bareUrl(body.trim()) : null;
  if (url) return new Slice(Fragment.from(schema.text(body.trim(), [schema.marks.link.create({ href: url })])), 0, 0);
  const internal = INTERNAL_LINK_RE.exec(body.trim());
  if (!internal) return null;
  return namesEntry(asAddress(internal[1])) ? inlineSlice(body.trim()) : new Slice(Fragment.from(schema.text(body)), 0, 0);
}
function blockSlice(body: string, lines: string[], $context: ResolvedPos): Slice | null {
  if (inAny($context, FLAT_HOSTS)) return flat(lines);
  try {
    const doc = parseMarkdown(body);
    if (draws(doc) || lines.length > 1) return new Slice(doc.content, 0, 0);
  } catch { /* a form the schema refuses stays as typed */ }
  return null;
}
function pasteSlice(raw: string, $context: ResolvedPos): Slice {
  const txt = raw.replace(LINE_BREAK_RE, "\n");
  const body = txt.replace(/\n$/, "");
  if ($context.parent.type.spec.code) return new Slice(Fragment.from(schema.text(txt)), 0, 0);
  const lines = body.split("\n");
  const slice = linkSlice(body, lines.length === 1) ?? (blockShaped(body, lines, $context) ? blockSlice(body, lines, $context) : null);
  if (slice) return slice;
  return lines.length > 1 ? flat(lines) : new Slice(Fragment.from(body ? schema.text(body) : Fragment.empty), 0, 0);
}
/* A TERMINAL'S COPY IS TEXT, NOT STRUCTURE: its HTML is one white-space: pre
   block of text and coloured inline runs, and read as HTML every run was a
   paragraph of its own (pin: paste.test › a terminal's copy is styled
   preformatted text alone) */
const TERMINAL_OPEN = /^\s*(?:<meta[^>]*>\s*|<html[^>]*>\s*|<head>[^]*?<\/head>\s*|<body[^>]*>\s*|<!--StartFragment-->\s*)*<div style="[^"]*white-space:\s*pre(?![\w-])[^"]*">/i;
const TERMINAL_CLOSE = /<\/div>\s*(?:<!--EndFragment-->\s*|<\/body>\s*|<\/html>\s*)*$/i;
const NOT_A_RUN = /<(?!div style="display: inline[;"]|\/div>|a\s|\/a>|span[\s>]|\/span>)/i;
function terminalCopy(html: string): boolean {
  const open = TERMINAL_OPEN.exec(html), close = TERMINAL_CLOSE.exec(html);
  return !!open && !!close && close.index >= open[0].length && !NOT_A_RUN.test(html.slice(open[0].length, close.index));
}
/* the terminal breaks its lines at the window's width: a line not ending a
   sentence runs on into the next, unless that one starts a list item or a
   message (pin: paste.test › a terminal's wrapped lines are joined); markdown
   copied out stays as it was (pin: paste.test › a terminal's copy of markdown
   keeps its structure) */
const STARTS_ITS_OWN = /^\s*(?:[-*+•]|\d+[.)]|⏺)\s/;
const ENDS_A_SENTENCE = /[.?!:…]["'”’)\]]*$/;
const HOLDS = /^\s*(?:```|:::|#{1,6}\s|>|\|)/;
const BREAKS: ((prev: string, line: string) => boolean)[] = [
  (prev, line) => !/\S/.test(prev) || !/\S/.test(line),
  (prev, line) => ENDS_A_SENTENCE.test(prev.trimEnd()) || STARTS_ITS_OWN.test(line),
  (prev, line) => HOLDS.test(prev) || HOLDS.test(line),
];
const runsOn = (prev: string, line: string): boolean => !BREAKS.some((b) => b(prev, line));
function fencesAfter(open: { code: boolean; blocks: number }, line: string): { code: boolean; blocks: number } {
  const t = line.trim();
  if (t.startsWith("```")) return { ...open, code: !open.code };
  if (open.code || !t.startsWith(":::")) return open;
  return { ...open, blocks: t === ":::" ? Math.max(0, open.blocks - 1) : open.blocks + 1 };
}
function unwrapped(text: string): string {
  const out: string[] = [];
  let open = { code: false, blocks: 0 };
  for (const line of text.split("\n")) {
    const last = open.code || open.blocks > 0 ? undefined : out.at(-1);
    if (last !== undefined && runsOn(last, line)) out[out.length - 1] = last.trimEnd() + " " + line.trimStart();
    else out.push(line);
    open = fencesAfter(open, line);
  }
  return out.join("\n");
}
/* A PASTED LINK TO THIS PAGE KEEPS ITS BARE ADDRESS: pasted HTML carries the
   page's full file address, which breaks when the page moves; a link whose
   words are its address stays whole (pin: paste.test › a pasted link to this
   page) (pin: paste.test › a link to this page in pasted markdown) */
const keepsAddress = (m: Mark, n: Node, docHref: string): boolean =>
  m.type !== schema.marks.link || (n.isText && n.text === m.attrs.href) || !internalHash(m.attrs.href as string, docHref);
function bareMark(m: Mark, n: Node, docHref: string): Mark {
  if (keepsAddress(m, n, docHref)) return m;
  const href = m.attrs.href as string, bare = makeHref(href, docHref);
  return bare === href ? m : schema.marks.link.create({ ...m.attrs, href: bare });
}
function barePiece(n: Node, docHref: string): Node {
  const marks = n.marks.map((m) => bareMark(m, n, docHref));
  const content = n.isText ? n.content : bareFragment(n.content, docHref);
  if (content === n.content && marks.every((m, i) => m === n.marks[i])) return n;
  return n.isText ? n.mark(marks) : n.copy(content).mark(marks);
}
function bareFragment(frag: Fragment, docHref: string): Fragment {
  const out: Node[] = [];
  frag.forEach((n) => { out.push(barePiece(n, docHref)); });
  return out.every((n, i) => n === frag.child(i)) ? frag : Fragment.fromArray(out);
}
function bareLinks(slice: Slice, docHref: string): Slice {
  const content = bareFragment(slice.content, docHref);
  return content === slice.content ? slice : new Slice(content, slice.openStart, slice.openEnd);
}
function bareBlocks(blocks: Node[], docHref: string): Node[] {
  const out: Node[] = [];
  bareFragment(Fragment.from(blocks), docHref).forEach((b) => out.push(b));
  return out;
}
/* HTML THIS PAGE WROTE KEEPS ITS SPACES: other HTML has its runs of spaces
   folded on a paste, which took the gap between a line's half-lines and
   two spaces after a full stop; a marked copy inside HTML of its own is not
   marked throughout, and that HTML's layout whitespace would come in with it
   (pin: a reference pasted › prose with two spaces pasted) (pin: paste.test ›
   pasted HTML keeps its spaces only when every block in it is one this page
   marked) */
interface PastedNode { nodeType: number; nodeName: string; textContent: string | null; hasAttribute?(name: string): boolean }
export function keepsSpaces(dom: globalThis.Node): boolean {
  let marked = false;
  for (const n of Array.from(dom.childNodes) as unknown as PastedNode[]) {
    if (n.nodeType === 3) { if (/\S/.test(n.textContent ?? "")) return false; continue; }
    if (n.nodeType !== 1) continue;
    if (n.hasAttribute?.(COPY_MARK)) { marked = true; continue; }
    if (!/^(META|STYLE)$/.test(n.nodeName)) return false;
  }
  return marked;
}
class SpaceKeepingParser extends DOMParser {
  parseSlice(dom: globalThis.Node, options: ParseOptions = {}): Slice {
    if (options.preserveWhitespace || !keepsSpaces(dom)) return super.parseSlice(dom, options);
    /* the layout's whitespace between blocks is not text */
    for (const n of Array.from(dom.childNodes)) if (n.nodeType === 3) dom.removeChild(n);
    return super.parseSlice(dom, { ...options, preserveWhitespace: true });
  }
}
const clipboardParser = new SpaceKeepingParser(schema, DOMParser.fromSchema(schema).rules);

export interface Clipboard { plain: string; html: string; types: readonly string[]; file: File | null }
export function clipboardOf(data: DataTransfer | null): Clipboard {
  return { plain: data?.getData("text/plain") ?? "", html: data?.getData("text/html") ?? "", types: data ? Array.from(data.types) : [], file: pastedImageFile(data) };
}
export type Pasted = { tr: Transaction; refused: string | null } | { file: File } | "nothing" | "editor's own";
/* as ProseMirror pastes plain text: the parsed slice, its links made bare, a
   single node set in whole, the transaction marked as a paste */
function plainPaste(state: EditorState, text: string, href: string): Pasted {
  if (!text) return "editor's own";
  const slice = bareLinks(pasteSlice(text, state.selection.$from), href);
  const single = slice.openStart === 0 && slice.openEnd === 0 && slice.content.childCount === 1 ? slice.content.firstChild : null;
  const tr = single ? state.tr.replaceSelectionWith(single, false) : state.tr.replaceSelection(slice);
  return { tr: tr.scrollIntoView().setMeta("paste", true).setMeta("uiEvent", "paste"), refused: null };
}
function asText(state: EditorState, text: string, href: string): Pasted {
  const parsed = pasteBlocks(text, state.selection.$from);
  if (!parsed) return plainPaste(state, text, href);
  const blocks = bareBlocks(parsed, href);
  return { tr: placeBlocks(state, blocks).scrollIntoView(), refused: pastedRefusal(blocks) };
}
type Route = (state: EditorState, clip: Clipboard, href: string) => Pasted | null;
const linked = (state: EditorState, clip: Clipboard): Transaction | null => linkSelection(state, clip.plain, clip.html) || referenceInLine(state, clip.plain, clip.html);
const outsideCode = (state: EditorState): boolean => !state.selection.$from.parent.type.spec.code;
/* THE ORDER IS THE RULE. A picture is handed on; a link or reference over
   words or into a line is placed; line breaks alone are nothing, from any app:
   they replaced a selection with empty paragraphs (pin: paste.test › a paste
   of line breaks alone); a terminal's copy outside code is its text,
   unwrapped (pin: a terminal's copy pasted › a terminal's one line pasted)
   (pin: a terminal's copy pasted › a terminal's copy pasted into a code
   block); other HTML is the editor's own; plain text is blocks where they
   are taken, else as ProseMirror pastes it */
const ROUTES: Route[] = [
  (_s, clip) => (clip.file ? { file: clip.file } : null),
  (s, clip) => { const tr = linked(s, clip); return tr ? { tr: tr.scrollIntoView(), refused: null } : null; },
  (s, clip) => (onlyLineBreaks(clip.plain, s.selection.$from, clip.html) ? "nothing" : null),
  (s, clip, href) => (terminalCopy(clip.html) && outsideCode(s) ? asText(s, unwrapped(clip.plain), href) : null),
  (_s, clip) => (clip.types.includes("text/html") ? "editor's own" : null),
  (s, clip, href) => asText(s, clip.plain, href),
];
export function pasted(state: EditorState, clip: Clipboard, href: string): Pasted {
  for (const route of ROUTES) {
    const r = route(state, clip, href);
    if (r) return r;
  }
  return "editor's own";
}
type PasteProps = Pick<EditorProps, "handlePaste" | "clipboardTextParser" | "clipboardParser" | "transformPasted">;
export function pasteProps(on: { file(f: File): void; refused(text: string): void; href(): string }): PasteProps {
  return {
    handlePaste: (view, event) => {
      const r = pasted(view.state, clipboardOf(event.clipboardData), on.href());
      if (r === "editor's own") return false;
      if (r === "nothing") return true;
      if ("file" in r) on.file(r.file);
      else { view.dispatch(r.tr); if (r.refused) on.refused(r.refused); }
      return true;
    },
    clipboardTextParser: (text, $context) => pasteSlice(text, $context),
    clipboardParser,
    transformPasted: (slice) => bareLinks(slice, on.href()),
  };
}
/* the markdown view's answer: a picture handed on, a terminal's copy as its
   text, unwrapped; null leaves the paste to the browser */
export function sourcePasted(clip: Clipboard): { file: File } | { text: string } | null {
  if (clip.file) return { file: clip.file };
  return terminalCopy(clip.html) ? { text: unwrapped(clip.plain) } : null;
}
