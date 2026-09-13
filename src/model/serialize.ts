/* ProseMirror document -> markdown: the other half of the round trip, and the
   inverse of every arm in parse.ts. Ported 2026-09-07 from
   ../writer/src/js/serialize.mjs, minus the defences a contenteditable DOM
   needed (strays at a row's root, cells one level too deep): the schema
   guarantees shape here, so each arm walks exactly the content its node type
   admits. What survives unchanged is the ESCAPING — the column-0 backslash,
   the indent mark, the cell pipe, the fence escalation — and the mark
   hoist, which are the rules the corpus was written under. */
import type { Node, Mark, MarkType } from "prosemirror-model";
import { schema, MARK_ORDER } from "./schema.ts";
import {
  LIST_LINE, ITEM_BLOCK_INDENT, FENCE_CLOSE, blockLineAt, escapeProse, escapeIndent,
  escapeCell, folioToken, quotePrefix, ROW_LINE_TOKEN,
} from "./grammar.ts";

const N = schema.nodes;

/* ---------- inline ---------- */

/* a mark's markers go around its TEXT, with any edge whitespace outside
   them, and a mark with no text writes no markers at all. Decided
   2026-09-07 in the current app, when five footnotes exported as "***Name** "
   came back with the bold gone and a literal asterisk per cycle; the
   fixed-point test in roundtrip.test.ts is what holds it. */
function markAround(marker: string, inner: string): string {
  const edge = /^(\s*)([^]*?)(\s*)$/.exec(inner)!;
  if (!edge[2]) return inner;
  return edge[1] + marker + edge[2] + marker + edge[3];
}

function wrapMark(mark: Mark, inner: string): string {
  switch (mark.type.name) {
    case "strong": return markAround("**", inner);
    case "em": return markAround("*", inner);
    case "strike": return markAround("~~", inner);
    case "underline": return inner && "<u>" + inner + "</u>";
    case "code": return inner && "`" + inner + "`";
    case "link": {
      const href = String(mark.attrs.href);
      /* an autolinked URL serializes as the bare URL, not [url](url) */
      if (inner === href || href === "https://" + inner || href === "http://" + inner) return inner;
      return inner && "[" + inner + "](" + destination(href) + ")";
    }
    default: throw new Error(`mark the serializer does not know: ${mark.type.name}`);
  }
}

/* a link or image destination: bare, or in <…> when it holds whitespace or
   an unbalanced paren — CommonMark's own rule, and what the Marginalian
   converter wrote (MEASURED 2026-09-07: eleven files with a space in a
   sidecar's name) */
function destination(s: string): string {
  const open = (s.match(/\(/g) || []).length, close = (s.match(/\)/g) || []).length;
  return /\s/.test(s) || open !== close ? "<" + s + ">" : s;
}

function leafMd(node: Node): string {
  if (node.isText) return node.text!.replace(/\u200B/g, "");
  switch (node.type) {
    case N.hard_break: return "\n";
    case N.image: return "![" + String(node.attrs.alt) + "](" + destination(String(node.attrs.src)) + ")";
    case N.folio: return folioToken(String(node.attrs.label));
    default: throw new Error(`inline node the serializer does not know: ${node.type.name}`);
  }
}

/* a run of inline nodes with its marks written around it. A ProseMirror mark
   set has no order, so the nesting is CHOSEN here, locally: at each position
   the mark whose stretch runs LONGEST from there goes outermost, ties broken
   by MARK_ORDER, and the ranks left recurse inside the stretch. MEASURED
   2026-09-07 over the corpus: a fixed order (link outermost) broke 186 files,
   nearly all an italic sentence holding a link; a whole-paragraph count of
   alternations then chose the link as outermost wherever two bold runs sat
   beside one link. A stretch is cut where the MARK changes, not the type, so
   two links with different addresses side by side stay two links. */
function markOf(node: Node, type: MarkType): Mark | undefined {
  return node.marks.find((m) => m.type === type);
}
function runMd(nodes: readonly Node[], remaining: readonly MarkType[]): string {
  let out = "";
  let i = 0;
  while (i < nodes.length) {
    const here = remaining.map((t) => markOf(nodes[i], t)).filter((m): m is Mark => !!m);
    if (!here.length) { out += leafMd(nodes[i]); i++; continue; }
    const stretch = (mark: Mark): number => {
      let j = i;
      while (j < nodes.length && nodes[j].marks.some((m) => m.eq(mark))) j++;
      return j - i;
    };
    let mark = here[0], len = stretch(mark);
    for (const m of here.slice(1)) { const l = stretch(m); if (l > len) { mark = m; len = l; } }
    const inner = runMd(nodes.slice(i, i + len), remaining.filter((t) => t !== mark.type));
    out += wrapMark(mark, inner);
    i += len;
  }
  return out;
}

/* a node's inline content as one markdown string, breaks as newlines */
export function inlineMd(node: Node): string {
  const kids: Node[] = [];
  node.forEach((n) => { kids.push(n); });
  return runMd(kids, MARK_ORDER.map((name) => schema.marks[name]));
}

/* the ONE-LINE form for a cell: a break is a space, and the edges are
   trimmed as the parser trims them */
function oneLineMd(node: Node): string {
  return inlineMd(node).replace(/\s*\n\s*/g, " ").trim();
}
/* a heading is one line too, but its text is kept to the character — the
   parser keeps a trailing space, so the serializer must (MEASURED
   2026-09-07: nine files end a heading in a space) */
function headingMd(node: Node): string {
  return "#".repeat(node.attrs.level as number) + " " + inlineMd(node).replace(/\s*\n\s*/g, " ");
}

/* ---------- blocks ---------- */

/* a paragraph's lines, each escaped where the reader's text would read as
   syntax — at column 0 of a blocks body or a quote body, never in a cell or
   an item, whose own line it is part of */
function paragraphMd(node: Node, escaping: boolean): string {
  const md = inlineMd(node);
  return escaping ? md.split("\n").map(escapeProse).join("\n") : md;
}

/* a body of blocks separated by blank lines — the document, a card, a note.
   A block emitting nothing is stepped over, and the indent mark is read
   against the block before. */
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

/* a quote body is a LINE RUN: a paragraph contributes its lines (a break is
   a line, so a blank quote line is a paragraph's empty line), a block its
   own, and nothing is joined by a blank line that the text did not hold —
   EXCEPT two adjacent paragraphs, which take the blank line between them:
   written with none they read back as one run, a paragraph break lost
   on the first save (the quote toggle's shape, and the reference's; the
   parser yields no adjacent quoted paragraphs, so no stored text changes
   spelling — MEASURED by the block's closing review over 40,756 quotations
   in the mirror, 2026-09-12). */
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

function blockMd(node: Node, escaping: boolean): string {
  switch (node.type) {
    case N.paragraph: return paragraphMd(node, escaping);
    case N.heading: return headingMd(node);
    case N.blockquote: return quoteBodyMd(node).split("\n").map(quotePrefix).join("\n");
    case N.bullet_list: case N.ordered_list: return listMd(node, 0).join("\n");
    case N.code_block: return fenceMd(node);
    case N.table: return tableMd(node);
    case N.card: return "::: " + String(node.attrs.colour) + "\n" + blocksMd(node) + "\n:::";
    case N.note: return "::: note\n" + blocksMd(node) + "\n:::";
    case N.reference: return node.textContent ? "::: reference\n" + node.textContent + "\n:::" : "::: reference\n:::";
    case N.verse: return rowsMd(node, "verse");
    case N.prose: return rowsMd(node, "prose");
    default: throw new Error(`block the serializer does not know: ${node.type.name}`);
  }
}

/* a <pre> back to its fenced lines: the fence outgrows any line of nothing
   but backticks (CommonMark's escalation), else the block truncates */
function fenceMd(node: Node): string {
  const text = node.textContent;
  let n = 3;
  text.split("\n").forEach((l) => {
    const m = l.match(FENCE_CLOSE);
    if (m) n = Math.max(n, m[1].length + 1);
  });
  const fence = "`".repeat(n);
  const lang = String(node.attrs.lang).replace(/`/g, "");
  return fence + lang + "\n" + text + "\n" + fence;
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

/* a cell's markdown, collapsed to ONE line and escaped: a newline surviving
   here would split one row in two and shift every line below it */
function cellMd(node: Node): string {
  return escapeCell(oneLineMd(node));
}
/* the separator carries its spaces, EXCEPT before an empty translation */
function pairMd(a: string, b: string): string {
  return b ? a + " | " + b : a + " |";
}
/* a row's declared kind, at its head and flush, as a folio at a row's head is */
function rowHead(row: Node): string {
  return row.attrs.kind === "line" ? ROW_LINE_TOKEN : "";
}
function rowsMd(block: Node, word: string): string {
  const rows: string[] = [];
  block.forEach((row) => {
    if (row.type === N.gap) rows.push("");
    else if (row.type === N.note) rows.push(blockMd(row, true));
    /* a pair with one cell — a cut that dropped the other — is its one
       cell's line: until 2026-09-12 it threw out of ⌘C's text flavour
       and the cut-to-link act (the confirmation pass) */
    else if (row.type === N.pair) rows.push(rowHead(row) + (row.childCount > 1 ? pairMd(cellMd(row.child(0)), cellMd(row.child(1))) : cellMd(row.child(0))));
    else rows.push(rowHead(row) + cellMd(row));
  });
  const start = block.attrs.start as number;
  const open = "::: " + word + (start > 1 ? " " + start : "") + "\n";
  return rows.length ? open + rows.join("\n") + "\n:::" : open + ":::";
}

/* a list to its lines, one item per line, two spaces of indent per level;
   an item's own paragraph is its line plus soft continuations, a further
   paragraph a block hanging under it after a blank line, a nested list its
   own lines. The continuation indent CLEARS THE ITEM'S CONTENT COLUMN,
   measured off the line actually emitted by the parser's own expression,
   with ITEM_BLOCK_INDENT as the floor. */
function listMd(list: Node, depth: number): string[] {
  const ordered = list.type === N.ordered_list;
  const pad = "  ".repeat(depth);
  let n = ((list.attrs.start as number | undefined) ?? 1) - 1;
  const lines: string[] = [];
  list.forEach((li) => {
    n++;
    const own = li.attrs.value as number | null;
    if (own != null) n = own;
    const marker = ordered ? n + ". " : "- ";
    const body = inlineMd(li.child(0)).replace(/\n+$/, "").split("\n");
    const head = pad + marker + body[0];
    const hm = head.match(LIST_LINE);
    const contCol = hm ? head.length - hm[3].length : pad.length + marker.length;
    const contPad = " ".repeat(Math.max(pad.length + ITEM_BLOCK_INDENT.length, contCol));
    /* an empty line is not indented (trailing whitespace that would take two
       passes to settle), nor a block-shaped one (the indent is what would
       destroy it) */
    const pushCont = (mdLines: string[]) => {
      mdLines.forEach((l, k) => { lines.push(l && !blockLineAt(mdLines, k) ? contPad + l : l); });
    };
    lines.push(head);
    pushCont(body.slice(1));
    for (let k = 1; k < li.childCount; k++) {
      const child = li.child(k);
      if (child.type === N.paragraph) {
        const blockMdText = inlineMd(child).replace(/\n+$/, "");
        if (!blockMdText) continue;
        lines.push("");
        pushCont(blockMdText.split("\n"));
      } else lines.push(...listMd(child, depth + 1));
    }
  });
  return lines;
}

export function serializeMarkdown(doc: Node): string {
  return blocksMd(doc);
}
