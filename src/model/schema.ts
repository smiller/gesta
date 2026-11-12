import { Schema, type NodeSpec, type MarkSpec, type Node as PMNode } from "prosemirror-model";

/* THE MARK NESTING ORDER, outermost first, for marks covering the same
   run. Bold OUTSIDE italic, not CommonMark's em-outside: ***x*** must come
   back as ***x***. A link OUTSIDE emphasis: MEASURED over the corpus,
   "[*title*](u)" 31 times in 25 files against "*[title](u)*" 17 in 15, and
   the strong forms 0 and 0. Code innermost: **`x`**, never `**x**`.
   (pin: roundtrip.test › round trips: every form survives) */
export const MARK_ORDER = ["link", "strong", "em", "strike", "underline", "code"] as const;

/* EVERY NODE THAT DRAWS ITSELF READS ITSELF BACK: without a parseDOM rule a
   copied verse block pasted back arrived as its cells' text in paragraphs,
   a paired canto interleaved line by line (pin: schema.test › every node
   that draws itself reads itself back) */
/* the verse block's dual-language form draws with both classes and is read
   back by the second: a copy pasted back keeps its layout (pin: schema.test ›
   a dual-language block draws as a verse block that says so) */
const rowBlock = (cls: string, stanzas = false): NodeSpec => ({
  attrs: stanzas ? { start: { default: 1 }, stanza: { default: null }, dual: { default: false }, facing: { default: null }, numbered: { default: false } } : { start: { default: 1 }, numbered: { default: false } },
  /* a prose block numbers sentences, and has no skipped line (pin:
     schema.test › a skipped line number is never selected, and stands only
     in verse) */
  content: stanzas ? "(line | pair | gap | skip | note | margin_note)*" : "(line | pair | gap | note | margin_note)*",
  group: "block",
  defining: true,
  parseDOM: [{ tag: "div." + cls, getAttrs: (dom) => rowBlockAttrs(dom, stanzas) }],
  toDOM: (n) => ["div", rowBlockDOM(cls, n), 0],
});
const numberAttr = (dom: HTMLElement, name: string): number | null => (dom.hasAttribute(name) ? +dom.getAttribute(name)! : null);
function rowBlockAttrs(dom: HTMLElement, stanzas: boolean) {
  const start = numberAttr(dom, "data-start") ?? 1;
  const numbered = dom.hasAttribute("data-numbered");
  if (!stanzas) return { start, numbered };
  const dual = dom.className.split(/\s+/).includes("dual-language");
  const stanza = numberAttr(dom, "data-stanza");
  /* only a plain verse block numbers its right column apart (pin: schema.test › a verse block numbered on both sides) */
  const facing = !dual && stanza === null ? numberAttr(dom, "data-facing") : null;
  return { start, stanza, dual, facing, numbered };
}
function rowBlockDOM(cls: string, n: PMNode): Record<string, string> {
  const attrs: Record<string, string> = { class: n.attrs.dual ? cls + " dual-language" : cls };
  if (n.attrs.start > 1) attrs["data-start"] = String(n.attrs.start);
  if (n.attrs.stanza != null) attrs["data-stanza"] = String(n.attrs.stanza);
  if (n.attrs.facing != null) attrs["data-facing"] = String(n.attrs.facing);
  if (n.attrs.numbered) attrs["data-numbered"] = "";
  return attrs;
}
const kindOf = (dom: HTMLElement): { kind: string | null; label: string | null } => ({ kind: dom.getAttribute("data-kind") || null, label: dom.getAttribute("data-label") || null });

const rowAttrs = (cls: string, n: PMNode): Record<string, string> => ({
  class: cls,
  ...(n.attrs.kind ? { "data-kind": String(n.attrs.kind) } : {}),
  ...(n.attrs.label ? { "data-label": String(n.attrs.label) } : {}),
});

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
    attrs: { lang: { default: "" }, rest: { default: "" } }, content: "text*", marks: "", group: "block", code: true, defining: true,
    parseDOM: [{ tag: "pre", preserveWhitespace: "full", getAttrs: (dom) => ({ lang: dom.getAttribute("data-lang") || "", rest: dom.getAttribute("data-rest") || "" }) }],
    toDOM: (n) => ["pre", { ...(n.attrs.lang ? { "data-lang": n.attrs.lang } : {}), ...(n.attrs.rest ? { "data-rest": n.attrs.rest } : {}) }, ["code", 0]],
  },
  table: { content: "table_row+", group: "block", parseDOM: [{ tag: "table" }], toDOM: () => ["table", ["tbody", 0]] },
  table_row: { content: "table_cell+", parseDOM: [{ tag: "tr" }], toDOM: () => ["tr", 0] },
  table_cell: {
    attrs: { header: { default: false } }, content: "inline*",
    parseDOM: [{ tag: "td" }, { tag: "th", attrs: { header: true } }],
    toDOM: (n) => [n.attrs.header ? "th" : "td", 0],
  },
  card: {
    attrs: { colour: {} }, content: "block+", group: "block", defining: true,
    /* only the editor's own copies, marked data-card: a web page's
       `card-body` div became a card of a colour nothing draws (pin:
       schema.test › a card is read back only from the editor's own copy) */
    parseDOM: [{ tag: "div[class^='card-'][data-card]", getAttrs: (dom) => ({ colour: dom.className.split(/\s+/).find((c) => /^card-/.test(c)) }) }],
    toDOM: (n) => ["div", { class: n.attrs.colour, "data-card": "" }, 0],
  },
  /* isolating, so no lift or join crosses the grid's edge. `card*`, not
     `card+`: a card's colour has no default, and prosemirror-model refuses a
     required node it cannot generate (pin: schema.test › a grid cannot
     require a card) */
  grid: {
    attrs: { n: { default: null } }, content: "card*", group: "block", defining: true, isolating: true,
    /* only the editor's own copies, which carry data-n: a web page's
       `div.grid` parsed to an empty grid drawn as a blank gap (pin:
       schema.test › a grid is read back only when it carries data-n) */
    parseDOM: [{ tag: "div.grid", getAttrs: (dom) => dom.hasAttribute("data-n") ? { n: dom.dataset.n ? +dom.dataset.n : null } : false }],
    toDOM: (n) => ["div", { class: "grid", "data-n": n.attrs.n ?? "", style: "--n: " + (n.attrs.n ?? 3) }, 0],
  },
  note: { content: "block+", group: "block", defining: true, parseDOM: [{ tag: "div.note" }], toDOM: () => ["div", { class: "note" }, 0] },
  margin_note: { content: "block+", group: "block", defining: true, parseDOM: [{ tag: "div.margin-note" }], toDOM: () => ["div", { class: "margin-note" }, 0] },
  reference: {
    content: "text*", marks: "", group: "block", code: true, defining: true,
    parseDOM: [{ tag: "div.reference", preserveWhitespace: "full" }],
    toDOM: () => ["div", { class: "reference" }, 0],
  },
  verse: rowBlock("verse", true),
  prose: rowBlock("prose"),
  line: { attrs: { kind: { default: null }, label: { default: null } }, content: "inline*", parseDOM: [{ tag: "div.vrow:not(.vpair)", getAttrs: kindOf }], toDOM: (n) => ["div", rowAttrs("vrow", n), 0] },
  pair: { attrs: { kind: { default: null }, label: { default: null } }, content: "cell cell", parseDOM: [{ tag: "div.vrow.vpair", getAttrs: kindOf }], toDOM: (n) => ["div", rowAttrs("vrow vpair", n), 0] },
  cell: { content: "inline*", parseDOM: [{ tag: "div.vcell" }], toDOM: () => ["div", { class: "vcell" }, 0] },
  gap: { parseDOM: [{ tag: "div.vgap" }], toDOM: () => ["div", { class: "vgap" }] },
  /* never selected: it holds nothing for a caret (pin: schema.test › a
     skipped line number is never selected) */
  skip: { selectable: false, parseDOM: [{ tag: "div.vskip" }], toDOM: () => ["div", { class: "vskip" }] },
  text: { group: "inline" },
  /* a newline where a block holds no breaks: code over broken lines kept
     each line, where it ran them into one (pin: format.test › code over lines broken by Enter) */
  hard_break: { inline: true, group: "inline", selectable: false, linebreakReplacement: true, parseDOM: [{ tag: "br" }], toDOM: () => ["br"] },
  /* src is the path as the markdown wrote it, never resolved here */
  image: {
    inline: true, group: "inline", draggable: true,
    attrs: { src: {}, alt: { default: "" } },
    parseDOM: [{ tag: "img[src]", getAttrs: (dom) => ({ src: dom.getAttribute("src"), alt: dom.getAttribute("alt") || "" }) }],
    toDOM: (n) => ["img", { src: n.attrs.src, alt: n.attrs.alt }],
  },
  /* a printed book's leaf number, where a new leaf begins: CONTENT, in the
     text, though it renders like display-only markup */
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
