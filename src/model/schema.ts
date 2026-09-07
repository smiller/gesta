/* The document model: every form the CURRENT markdown grammar can spell, as
   ProseMirror nodes and marks. A form the schema does not know cannot be
   parsed (the token walker throws) and cannot be typed, which is the whole
   reason a schema replaces a contenteditable surface. */
import { Schema, type NodeSpec, type MarkSpec, type Node as PMNode } from "prosemirror-model";

/* THE MARK NESTING ORDER, outermost first — the tie-break when the
   serializer's fewest-stretches rule (serialize.ts, runMd) finds two marks
   covering the same run, and the DOM serializer's nesting. Bold OUTSIDE
   italic, deliberately not CommonMark's em-outside: ***x*** must come back
   as ***x***. A link OUTSIDE emphasis covering the same text: MEASURED
   2026-09-07 over the corpus, "[*title*](u)" 31 times in 25 files against
   "*[title](u)*" 17 in 15, and the strong forms 0 and 0. Code innermost,
   so a bold code span writes **`x`** and never `**x**`. */
export const MARK_ORDER = ["link", "strong", "em", "strike", "underline", "code"] as const;

const rowBlock = (cls: string): NodeSpec => ({
  attrs: { start: { default: 1 } },
  content: "(line | pair | gap | note)*",
  group: "block",
  defining: true,
  toDOM: (n) => ["div", n.attrs.start > 1 ? { class: cls, "data-start": String(n.attrs.start) } : { class: cls }, 0],
});

const rowAttrs = (cls: string, n: PMNode): Record<string, string> =>
  n.attrs.kind ? { class: cls, "data-kind": String(n.attrs.kind) } : { class: cls };

const nodes: Record<string, NodeSpec> = {
  doc: { content: "block+" },
  paragraph: {
    content: "inline*", group: "block",
    parseDOM: [{ tag: "p" }], toDOM: () => ["p", 0],
  },
  heading: {
    attrs: { level: { default: 1 } }, content: "inline*", group: "block", defining: true,
    parseDOM: [1, 2, 3, 4, 5, 6].map((level) => ({ tag: "h" + level, attrs: { level } })),
    toDOM: (n) => ["h" + n.attrs.level, 0],
  },
  blockquote: {
    content: "block+", group: "block", defining: true,
    parseDOM: [{ tag: "blockquote" }], toDOM: () => ["blockquote", 0],
  },
  bullet_list: {
    content: "list_item+", group: "block",
    parseDOM: [{ tag: "ul" }], toDOM: () => ["ul", 0],
  },
  /* start records where the run OPENS; an item whose own number breaks the
     count carries it as list_item's value — the only way a countdown is
     expressible */
  ordered_list: {
    attrs: { start: { default: 1 } }, content: "list_item+", group: "block",
    parseDOM: [{ tag: "ol", getAttrs: (dom) => ({ start: dom.hasAttribute("start") ? +dom.getAttribute("start")! : 1 }) }],
    toDOM: (n) => ["ol", n.attrs.start === 1 ? {} : { start: n.attrs.start }, 0],
  },
  list_item: {
    attrs: { value: { default: null } },
    content: "paragraph (paragraph | bullet_list | ordered_list)*", defining: true,
    parseDOM: [{ tag: "li", getAttrs: (dom) => ({ value: dom.hasAttribute("value") ? +dom.getAttribute("value")! : null }) }],
    toDOM: (n) => ["li", n.attrs.value == null ? {} : { value: n.attrs.value }, 0],
  },
  code_block: {
    attrs: { lang: { default: "" } }, content: "text*", marks: "", group: "block", code: true, defining: true,
    parseDOM: [{ tag: "pre", preserveWhitespace: "full", getAttrs: (dom) => ({ lang: dom.getAttribute("data-lang") || "" }) }],
    toDOM: (n) => ["pre", n.attrs.lang ? { "data-lang": n.attrs.lang } : {}, ["code", 0]],
  },
  table: { content: "table_row+", group: "block", parseDOM: [{ tag: "table" }], toDOM: () => ["table", ["tbody", 0]] },
  table_row: { content: "table_cell+", parseDOM: [{ tag: "tr" }], toDOM: () => ["tr", 0] },
  /* a cell is ONE LINE of inline content: the markdown table has no room for
     a block in a cell, and the serializer collapses a break to a space */
  table_cell: {
    attrs: { header: { default: false } }, content: "inline*",
    parseDOM: [{ tag: "td" }, { tag: "th", attrs: { header: true } }],
    toDOM: (n) => [n.attrs.header ? "th" : "td", 0],
  },
  card: {
    attrs: { colour: {} }, content: "block+", group: "block", defining: true,
    toDOM: (n) => ["div", { class: n.attrs.colour }, 0],
  },
  /* text that is NOT the text; the one block form that may also be a ROW of
     a verse or prose block, which is how a footnote interrupts a text without
     closing its count */
  note: { content: "block+", group: "block", defining: true, toDOM: () => ["div", { class: "note" }, 0] },
  /* one directive read by code, never by the reader: plain text */
  reference: {
    content: "text*", marks: "", group: "block", code: true, defining: true,
    toDOM: () => ["div", { class: "reference" }, 0],
  },
  verse: rowBlock("verse"),
  prose: rowBlock("prose"),
  /* a full-width row: a line with no pipe. `kind` is the row's DECLARED kind:
     null leaves the numbering convention to read the marks, "line" counts
     the row whatever they say (grammar.ts, ROW_LINE_TOKEN, has the decision) */
  line: { attrs: { kind: { default: null } }, content: "inline*", toDOM: (n) => ["div", rowAttrs("vrow", n), 0] },
  /* a paired row: an original beside its translation; which cell is which is
     its position, and an empty translation is still a pair */
  pair: { attrs: { kind: { default: null } }, content: "cell cell", toDOM: (n) => ["div", rowAttrs("vrow vpair", n), 0] },
  cell: { content: "inline*", toDOM: () => ["div", { class: "vcell" }, 0] },
  /* a blank line inside the fence: verse's stanza break, prose's paragraph break */
  gap: { toDOM: () => ["div", { class: "vgap" }] },
  text: { group: "inline" },
  /* every newline inside a paragraph, kept as the line break it is */
  hard_break: { inline: true, group: "inline", selectable: false, parseDOM: [{ tag: "br" }], toDOM: () => ["br"] },
  /* a picture by whatever path the markdown names — relative sidecar, data:
     or http — storage's business, not the model's */
  image: {
    inline: true, group: "inline", draggable: true,
    attrs: { src: {}, alt: { default: "" } },
    parseDOM: [{ tag: "img[src]", getAttrs: (dom) => ({ src: dom.getAttribute("src"), alt: dom.getAttribute("alt") || "" }) }],
    toDOM: (n) => ["img", { src: n.attrs.src, alt: n.attrs.alt }],
  },
  /* the number a physical book prints on its leaves, marked where a new one
     begins: CONTENT that renders like display-only markup */
  folio: {
    inline: true, group: "inline",
    attrs: { label: {} },
    parseDOM: [{ tag: "span.folio", getAttrs: (dom) => ({ label: dom.getAttribute("data-folio") }) }],
    toDOM: (n) => ["span", { class: "folio", "data-folio": n.attrs.label }],
  },
};

const marks: Record<(typeof MARK_ORDER)[number], MarkSpec> = {
  link: {
    attrs: { href: {} }, inclusive: false,
    parseDOM: [{ tag: "a[href]", getAttrs: (dom) => ({ href: dom.getAttribute("href") }) }],
    toDOM: (m) => ["a", { href: m.attrs.href }, 0],
  },
  strong: { parseDOM: [{ tag: "strong" }, { tag: "b" }], toDOM: () => ["strong", 0] },
  em: { parseDOM: [{ tag: "em" }, { tag: "i" }], toDOM: () => ["em", 0] },
  strike: { parseDOM: [{ tag: "s" }, { tag: "del" }, { tag: "strike" }], toDOM: () => ["s", 0] },
  underline: { parseDOM: [{ tag: "u" }], toDOM: () => ["u", 0] },
  code: { parseDOM: [{ tag: "code" }], toDOM: () => ["code", 0] },
};

export const schema = new Schema({ nodes, marks });
export type GestaSchema = typeof schema;
