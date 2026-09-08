/* What pasted text becomes, and what copied text says. Ported 2026-09-07
   from 13c-paste-and-source-copy.js, re-asked of the document model:
   several pasted lines render as the markdown they spell — a copied card,
   heading, list or table arrives as that block; a single line stays as
   typed unless it is an unambiguous quote or heading line, or a pasted
   entry link; inside a list item, a table cell or a verse row the lines
   arrive as line breaks; inside a code block every character is literal.
   The in-app copy needs no flavour of its own: the editor's HTML carries
   its structure, and this parser is asked only of PLAIN text — a foreign
   page's HTML parses through the schema's own rules. The copied text is
   the selection's markdown, so a list or a heading pasted into another
   entry arrives as itself. The source view is a textarea and pastes
   literally by nature. */
import { Fragment, Slice, type ResolvedPos, type Node } from "prosemirror-model";
import { schema } from "../model/schema.ts";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";

const N = schema.nodes;
const LINE_BREAK_RE = /\r\n?|[\u2028\u2029]/g;
/* heading levels are uncapped here (decision 5) */
const ONE_HEADING_LINE = /^#{1,6} \S/;
const ONE_QUOTE_LINE = /^>+ \S/;
const INTERNAL_LINK_RE = /^\[[^\]]+\]\(#[^)\s]+\)$/;
const FLAT_HOSTS = new Set([N.list_item, N.table_cell, N.line, N.cell]);
function inAny($ctx: ResolvedPos, types: Set<unknown>): boolean {
  for (let d = $ctx.depth; d >= 0; d--) if (types.has($ctx.node(d).type)) return true;
  return false;
}
/* the lines as text and breaks, one paragraph's worth of inline content */
function flat(lines: string[]): Slice {
  const nodes: Node[] = [];
  lines.forEach((l, i) => { if (i) nodes.push(N.hard_break.create()); if (l) nodes.push(schema.text(l)); });
  return new Slice(Fragment.from(nodes), 0, 0);
}
export function pasteSlice(raw: string, $context: ResolvedPos): Slice {
  const txt = raw.replace(LINE_BREAK_RE, "\n");
  const body = txt.replace(/\n$/, "");
  if ($context.parent.type === N.code_block) return new Slice(Fragment.from(schema.text(txt)), 0, 0);
  const lines = body.split("\n");
  const blockShaped = lines.length > 1 || ONE_HEADING_LINE.test(body);
  if (INTERNAL_LINK_RE.test(body.trim())) {
    try { return new Slice(parseMarkdown(body.trim()).firstChild!.content, 0, 0); } catch { /* literal below */ }
  }
  if (blockShaped || ONE_QUOTE_LINE.test(body)) {
    if (inAny($context, FLAT_HOSTS)) return flat(lines);
    try {
      const doc = parseMarkdown(body);
      if (doc.textContent.trim() || lines.length > 1) return new Slice(doc.content, 0, 0);
    } catch { /* a form the schema refuses stays as typed */ }
  }
  return lines.length > 1 ? flat(lines) : new Slice(Fragment.from(body ? schema.text(body) : Fragment.empty), 0, 0);
}
/* the copied selection as markdown: inline content is a paragraph's */
export function copyMd(slice: Slice): string {
  let content = slice.content;
  if (content.childCount && content.firstChild!.isInline) content = Fragment.from(N.paragraph.create(null, content));
  const blocks: Node[] = [];
  content.forEach((n) => blocks.push(n));
  if (!blocks.length) return "";
  try { return serializeMarkdown(N.doc.create(null, blocks)); } catch { return slice.content.textBetween(0, slice.content.size, "\n"); }
}
