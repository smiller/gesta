/* The ESCAPING — the column-0 backslash, the indent mark, the cell pipe, the
   fence escalation — and the mark hoist are the rules the stored corpus was
   written under: a change to one respells every entry it touches (pin:
   roundtrip.test › round trips: every form survives) */
import type { Node, Mark, MarkType, NodeType } from "prosemirror-model";
import { schema, MARK_ORDER } from "./schema.ts";
import {
  LIST_LINE, ITEM_BLOCK_INDENT, FENCE_CLOSE, blockLineAt, escapeProse, escapeIndent,
  escapeCell, pageToken, quotePrefix, rowKindToken, rowLabelToken, ROW_SKIP_TOKEN, ROW_TOKEN_ESCAPE, readsAsRowToken,
} from "./grammar.ts";

const N = schema.nodes;

/* ---------- inline ---------- */

/* a mark's markers go around its TEXT, edge whitespace outside them, and a
   mark with no text writes no markers: five footnotes written "***Name** "
   came back with the bold gone and a literal asterisk per cycle (pin:
   roundtrip.test › the Horace footnote shape) */
function markAround(marker: string, inner: string): string {
  const edge = /^(\s*)([^]*?)(\s*)$/.exec(inner)!;
  if (!edge[2]) return inner;
  return edge[1] + marker + edge[2] + marker + edge[3];
}

function linkMd(mark: Mark, inner: string): string {
  const href = String(mark.attrs.href);
  if ([inner, "https://" + inner, "http://" + inner].includes(href)) return inner;
  return inner && "[" + inner + "](" + destination(href) + ")";
}
const MARK_WRITERS = new Map<string, (mark: Mark, inner: string) => string>([
  ["strong", (_, inner) => markAround("**", inner)],
  ["em", (_, inner) => markAround("*", inner)],
  ["strike", (_, inner) => markAround("~~", inner)],
  ["underline", (_, inner) => inner && "<u>" + inner + "</u>"],
  ["code", (_, inner) => inner && "`" + inner + "`"],
  ["link", linkMd],
]);
function wrapMark(mark: Mark, inner: string): string {
  const write = MARK_WRITERS.get(mark.type.name);
  if (!write) throw new Error(`mark the serializer does not know: ${mark.type.name}`);
  return write(mark, inner);
}

/* bare, or in <…> when it holds whitespace or an unbalanced paren —
   CommonMark's rule, and what an imported site's converter wrote: MEASURED,
   eleven files with a space in a sidecar's name (pin: roundtrip.test ›
   round trips: every form survives) */
export function destination(s: string): string {
  const open = (s.match(/\(/g) || []).length, close = (s.match(/\)/g) || []).length;
  return /\s/.test(s) || open !== close ? "<" + s + ">" : s;
}

function leafMd(node: Node): string {
  if (node.isText) return node.text!.replace(/\u200B/g, "");
  switch (node.type) {
    case N.hard_break: return "\n";
    case N.image: return "![" + String(node.attrs.alt) + "](" + destination(String(node.attrs.src)) + ")";
    case N.page_label: return pageToken(String(node.attrs.label));
    default: throw new Error(`inline node the serializer does not know: ${node.type.name}`);
  }
}

/* A mark set has no order, so the nesting is CHOSEN here, locally: at each
   position the mark whose stretch runs LONGEST goes outermost, the rest
   recursing inside. MEASURED over the corpus: a fixed order (link
   outermost) broke 186 files, nearly all an italic sentence holding a link;
   a whole-paragraph count of alternations chose the link as outermost
   wherever two bold runs sat beside one link. A stretch is cut where the
   MARK changes, not its type, so two links side by side stay two (pin:
   roundtrip.test › round trips: every form survives) */
function markOf(node: Node, type: MarkType): Mark | undefined {
  return node.marks.find((m) => m.type === type);
}
function stretchOf(nodes: readonly Node[], i: number, mark: Mark): number {
  let j = i;
  while (j < nodes.length && nodes[j].marks.some((m) => m.eq(mark))) j++;
  return j - i;
}
function longestAt(nodes: readonly Node[], i: number, here: Mark[]): { mark: Mark; len: number } {
  let best = { mark: here[0], len: stretchOf(nodes, i, here[0]) };
  for (const mark of here.slice(1)) {
    const len = stretchOf(nodes, i, mark);
    if (len > best.len) best = { mark, len };
  }
  return best;
}
function runMd(nodes: readonly Node[], remaining: readonly MarkType[]): string {
  let out = "";
  let i = 0;
  while (i < nodes.length) {
    const here = remaining.map((t) => markOf(nodes[i], t)).filter((m): m is Mark => !!m);
    if (!here.length) { out += leafMd(nodes[i]); i++; continue; }
    const { mark, len } = longestAt(nodes, i, here);
    out += wrapMark(mark, runMd(nodes.slice(i, i + len), remaining.filter((t) => t !== mark.type)));
    i += len;
  }
  return out;
}

export function inlineMd(node: Node): string {
  const kids: Node[] = [];
  node.forEach((n) => { kids.push(n); });
  return runMd(kids, MARK_ORDER.map((name) => schema.marks[name]));
}

function oneLineMd(node: Node): string {
  return inlineMd(node).replace(/\s*\n\s*/g, " ").trim();
}
/* one line, its text kept to the character, a trailing space included:
   MEASURED, nine files end a heading in a space (pin: roundtrip.test ›
   round trips: every form survives) */
function headingMd(node: Node): string {
  return "#".repeat(node.attrs.level as number) + " " + inlineMd(node).replace(/\s*\n\s*/g, " ");
}

/* ---------- blocks ---------- */

/* escaped at column 0 of a blocks body or a quote body, never in a cell or
   an item, whose own line it is part of */
function paragraphMd(node: Node, escaping: boolean): string {
  const md = inlineMd(node);
  return escaping ? md.split("\n").map(escapeProse).join("\n") : md;
}

export function blocksMd(parent: Node): string {
  const out: string[] = [];
  let prev = "";
  parent.forEach((child) => {
    let b = blockMd(child, true);
    if (!b.trim()) return;
    b = escapeIndent(b, prev);
    prev = b;
    out.push(b);
  });
  return out.join("\n\n");
}

/* a quote body is a LINE RUN: nothing is joined by a blank line the text
   did not hold — EXCEPT two adjacent paragraphs, which take one: written
   with none they read back as one run, a paragraph break lost on the first
   save. MEASURED over 40,756 quotations in the mirror: no stored text
   changes spelling (pin: roundtrip.test › two adjacent paragraphs in a
   quotation are written with the blank quote line between them) */
function quoteBodyMd(parent: Node): string {
  const lines: string[] = [];
  let lastWasParagraph = false;
  parent.forEach((child) => {
    if (child.type === N.paragraph) {
      if (lastWasParagraph) lines.push("");
      const md = escapeIndent(paragraphMd(child, true), lines.join("\n"));
      lines.push(...md.split("\n"));
    } else lines.push(...blockMd(child, true).split("\n"));
    lastWasParagraph = child.type === N.paragraph;
  });
  return lines.join("\n");
}

const fenced = (opener: string, node: Node): string => opener + "\n" + blocksMd(node) + "\n:::";
/* a bare opener stays bare: a normalised count would respell every such
   entry. An empty grid is written as nothing (pin: roundtrip.test › an
   empty grid serializes to nothing) */
function gridMd(node: Node): string {
  if (!node.childCount) return "";
  return fenced("::: grid" + (node.attrs.n == null ? "" : " " + String(node.attrs.n)), node);
}
const referenceMd = (node: Node): string => (node.textContent ? "::: reference\n" + node.textContent + "\n:::" : "::: reference\n:::");
const listBlockMd = (node: Node): string => listMd(node, 0).join("\n");
const BLOCK_WRITERS = new Map<NodeType, (node: Node, escaping: boolean) => string>([
  [N.paragraph, paragraphMd],
  [N.heading, headingMd],
  [N.blockquote, (node) => quoteBodyMd(node).split("\n").map(quotePrefix).join("\n")],
  [N.bullet_list, listBlockMd],
  [N.ordered_list, listBlockMd],
  [N.code_block, fenceMd],
  [N.table, tableMd],
  [N.card, (node) => fenced("::: " + String(node.attrs.colour), node)],
  [N.note, (node) => fenced("::: note", node)],
  [N.margin_note, (node) => fenced("::: margin-note", node)],
  [N.grid, gridMd],
  [N.reference, referenceMd],
  [N.verse, (node) => rowsMd(node, node.attrs.dual ? "dual-language" : "verse")],
  [N.prose, (node) => rowsMd(node, "prose")],
]);
function blockMd(node: Node, escaping: boolean): string {
  const write = BLOCK_WRITERS.get(node.type);
  if (!write) throw new Error(`block the serializer does not know: ${node.type.name}`);
  return write(node, escaping);
}

/* the fence outgrows any line of nothing but backticks, else the block
   truncates (pin: roundtrip.test › round trips: every form survives) */
function fenceMd(node: Node): string {
  const text = node.textContent;
  let n = 3;
  text.split("\n").forEach((l) => {
    const m = l.match(FENCE_CLOSE);
    if (m) n = Math.max(n, m[1].length + 1);
  });
  const fence = "`".repeat(n);
  const lang = String(node.attrs.lang).replace(/`/g, "");
  return fence + lang + String(node.attrs.rest ?? "").replace(/`/g, "") + "\n" + text + "\n" + fence;
}

function tableMd(table: Node): string {
  const lines: string[] = [];
  table.forEach((row, _, idx) => {
    const cells: string[] = [];
    row.forEach((cell) => { cells.push(oneLineMd(cell)); });
    lines.push("| " + cells.join(" | ") + " |");
    if (idx === 0) lines.push("| " + cells.map(() => "---").join(" | ") + " |");
  });
  return lines.join("\n");
}

/* ONE line: a newline surviving here would split one row in two and shift
   every line below it (pin: roundtrip.test › a break inside a row's cell is
   written as a space) */
function cellMd(node: Node): string {
  return escapeCell(oneLineMd(node));
}
function pairMd(a: string, b: string): string {
  return b ? a + " | " + b : a + " |";
}
function rowHead(row: Node, text: string): string {
  if (row.attrs.label) return rowLabelToken(row.attrs.label as string);
  const kind = rowKindToken(row.attrs.kind as string | null);
  return kind || (readsAsRowToken(text) ? ROW_TOKEN_ESCAPE : "");
}
function lineRowMd(row: Node): string {
  if (row.type !== N.pair) { const a = cellMd(row); return rowHead(row, a) + a; }
  const a = cellMd(row.child(0));
  return rowHead(row, a) + (row.childCount > 1 ? pairMd(a, cellMd(row.child(1))) : a);
}
function rowMd(row: Node): string {
  if (row.type === N.gap) return "";
  if (row.type === N.skip) return ROW_SKIP_TOKEN;
  if (row.type === N.note || row.type === N.margin_note) return blockMd(row, true);
  return lineRowMd(row);
}
function rowNumbers(block: Node, start: number, stanza: number | null | undefined): string {
  const facing = block.attrs.dual || stanza != null ? null : block.attrs.facing as number | null | undefined;
  if (facing != null) return " " + start + " " + facing;
  return start > 1 ? " " + start : "";
}
function rowsOpener(block: Node, word: string): string {
  const start = block.attrs.start as number, stanza = block.attrs.stanza as number | null | undefined;
  if (stanza != null && start === 1) return "::: stanza " + stanza;
  return "::: " + word + rowNumbers(block, start, stanza) + (block.attrs.numbered ? " numbered" : "");
}
function rowsMd(block: Node, word: string): string {
  const rows: string[] = [];
  block.forEach((row) => { rows.push(rowMd(row)); });
  const open = rowsOpener(block, word) + "\n";
  return rows.length ? open + rows.join("\n") + "\n:::" : open + ":::";
}

/* the number each item of a list shows: the list's start, one up per item,
   reset wherever an item carries its own */
export function itemNumbers(list: Node): number[] {
  let n = ((list.attrs.start as number | undefined) ?? 1) - 1;
  const out: number[] = [];
  list.forEach((li) => {
    n++;
    const own = li.attrs.value as number | null;
    if (own != null) n = own;
    out.push(n);
  });
  return out;
}
/* an empty line is not indented: trailing whitespace would take two
   passes to settle (pin: roundtrip.test › a list item's empty
   continuation line is written unindented); nor a block-shaped one, which
   the indent would destroy */
function pushContinuation(lines: string[], contPad: string, mdLines: string[]): void {
  mdLines.forEach((l, k) => { lines.push(l && !blockLineAt(mdLines, k) ? contPad + l : l); });
}
function itemChildMd(lines: string[], child: Node, contPad: string, depth: number): void {
  if (child.type !== N.paragraph) { lines.push(...listMd(child, depth + 1)); return; }
  const text = inlineMd(child).replace(/\n+$/, "");
  if (!text) return;
  lines.push("");
  pushContinuation(lines, contPad, text.split("\n"));
}
function itemMd(li: Node, pad: string, marker: string, depth: number): string[] {
  const body = inlineMd(li.child(0)).replace(/\n+$/, "").split("\n");
  const head = pad + marker + body[0];
  const hm = head.match(LIST_LINE);
  const contCol = hm ? head.length - hm[3].length : pad.length + marker.length;
  const contPad = " ".repeat(Math.max(pad.length + ITEM_BLOCK_INDENT.length, contCol));
  const lines = [head];
  pushContinuation(lines, contPad, body.slice(1));
  for (let k = 1; k < li.childCount; k++) itemChildMd(lines, li.child(k), contPad, depth);
  return lines;
}
function listMd(list: Node, depth: number): string[] {
  const ordered = list.type === N.ordered_list;
  const pad = "  ".repeat(depth);
  const numbers = itemNumbers(list);
  const lines: string[] = [];
  list.forEach((li, _, i) => { lines.push(...itemMd(li, pad, ordered ? numbers[i] + ". " : "- ", depth)); });
  return lines;
}

export function serializeMarkdown(doc: Node): string {
  return blocksMd(doc);
}
