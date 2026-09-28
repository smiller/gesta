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
const rowBlock = (cls: string, stanzas = false): NodeSpec => ({
  attrs: stanzas ? { start: { default: 1 }, stanza: { default: null } } : { start: { default: 1 } },
  content: "(line | pair | gap | note)*",
  group: "block",
  defining: true,
  parseDOM: [{
    tag: "div." + cls,
    getAttrs: (dom) => {
      const start = dom.hasAttribute("data-start") ? +dom.getAttribute("data-start")! : 1;
      return stanzas ? { start, stanza: dom.hasAttribute("data-stanza") ? +dom.getAttribute("data-stanza")! : null } : { start };
    },
  }],
  toDOM: (n) => {
    const attrs: Record<string, string> = { class: cls };
    if (n.attrs.start > 1) attrs["data-start"] = String(n.attrs.start);
    if (n.attrs.stanza != null) attrs["data-stanza"] = String(n.attrs.stanza);
    return ["div", attrs, 0];
  },
});
const kindOf = (dom: HTMLElement): { kind: string | null } => ({ kind: dom.getAttribute("data-kind") || null });

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
     expressible (pin: parse.test › an ordered countdown keeps its own numbers) */
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
  /* inline, never blocks: a markdown table row has no room for a block */
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
  /* `n` is null when the count was not typed, drawn as 3, so a bare opener
     stays bare (pin: parse.test › a grid holds cards and remembers whether
     its count was typed). Isolating, so no lift or join crosses the grid's
     edge. `card*`, not `card+`: a card's colour has no default, and
     prosemirror-model refuses a required node it cannot generate (pin:
     schema.test › a grid cannot require a card) */
  grid: {
    attrs: { n: { default: null } }, content: "card*", group: "block", defining: true, isolating: true,
    /* only the editor's own copies, which carry data-n: a web page's
       `div.grid` parsed to an empty grid drawn as a blank gap (pin:
       schema.test › a grid is read back only when it carries data-n) */
    parseDOM: [{ tag: "div.grid", getAttrs: (dom) => dom.hasAttribute("data-n") ? { n: dom.dataset.n ? +dom.dataset.n : null } : false }],
    toDOM: (n) => ["div", { class: "grid", "data-n": n.attrs.n ?? "", style: "--n: " + (n.attrs.n ?? 3) }, 0],
  },
  /* the one block form that may also be a ROW of a verse or prose block:
     a footnote interrupts a text without closing its count (pin: parse.test
     › a ::: note inside a row fence is a row, and does not close it) */
  note: { content: "block+", group: "block", defining: true, parseDOM: [{ tag: "div.note" }], toDOM: () => ["div", { class: "note" }, 0] },
  reference: {
    content: "text*", marks: "", group: "block", code: true, defining: true,
    parseDOM: [{ tag: "div.reference", preserveWhitespace: "full" }],
    toDOM: () => ["div", { class: "reference" }, 0],
  },
  verse: rowBlock("verse", true),
  prose: rowBlock("prose"),
  /* `kind` is what the row DECLARES, null when it declares nothing — never
     read off its marks (pin: parse.test › a ⟨line⟩ token at a row's head is
     the row's declared kind, not its text) */
  line: { attrs: { kind: { default: null } }, content: "inline*", parseDOM: [{ tag: "div.vrow:not(.vpair)", getAttrs: kindOf }], toDOM: (n) => ["div", rowAttrs("vrow", n), 0] },
  /* an original beside its translation, told apart by position; an empty
     translation is still a pair (pin: roundtrip.test › round trips: every
     form survives) */
  pair: { attrs: { kind: { default: null } }, content: "cell cell", parseDOM: [{ tag: "div.vrow.vpair", getAttrs: kindOf }], toDOM: (n) => ["div", rowAttrs("vrow vpair", n), 0] },
  cell: { content: "inline*", parseDOM: [{ tag: "div.vcell" }], toDOM: () => ["div", { class: "vcell" }, 0] },
  gap: { parseDOM: [{ tag: "div.vgap" }], toDOM: () => ["div", { class: "vgap" }] },
  text: { group: "inline" },
  hard_break: { inline: true, group: "inline", selectable: false, parseDOM: [{ tag: "br" }], toDOM: () => ["br"] },
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
export type GestaSchema = typeof schema;
