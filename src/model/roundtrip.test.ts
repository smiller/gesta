// The round trip: md -> document -> md. The 32-form matrix from the current
// app's serialize.test.mjs (2026-09-07), each form a fixed point at the top
// level and inside a quote, then the normalizations the grammar makes in one
// pass and then holds, then the mark hoist that keeps emphasis with edge
// whitespace from decaying a marker per cycle.
import { test, expect } from "vitest";
import { schema } from "./schema.ts";
import { parseMarkdown } from "./parse.ts";
import { serializeMarkdown } from "./serialize.ts";

const trip = (md: string): string => serializeMarkdown(parseMarkdown(md));

const ROUND_TRIPS = [
  "plain paragraph",
  "two\n\nparagraphs",
  "soft\nbroken\nlines",
  "# heading\n\ntext",
  "## sub heading",
  "### third\n\n#### fourth\n\n##### fifth\n\n###### sixth",
  "**bold** and *em* and ~~struck~~ and `code`",
  "[a link](https://x.test/p)",
  "https://bare.test/url",
  "- one\n- two\n  - nested\n- three",
  "1. first\n2. second\n3. third",
  "3. starts at three\n4. four",
  "18. countdown\n17. keeps\n16. its numbers",
  "1. item\n\n    a block hanging under it\n2. next",
  "1. item\n    a soft continuation\n2. next",
  "> quoted\n> lines",
  "> a quote\n> \n> with a gap",
  "> - a list\n> - in a quote",
  "> - a list\n> \n> then text after a blank quote line",
  "> text\n> - then a list",
  "> # heading in a quote\n> \n>> nested\n>> quote",
  "```\ncode here\nmore\n```",
  "```js\nvar x = 1;\n```",
  "| a | b |\n| --- | --- |\n| 1 | 2 |",
  "::: card-red\ninside a card\n:::",
  "::: card-blue\n# a heading in a card\n\n- and a list\n:::",
  "::: verse\nalpha\nbeta\n:::",
  "::: verse\noriginal | translation\nsecond | second's\n:::",
  "::: verse\nline one\n\nline two after a gap\n:::",
  "::: verse\npaired |\n:::",
  "::: verse\na pipe \\| kept | and \\\\ a backslash\n:::",
  "::: prose\nsentence | its translation\n:::",
  "::: prose\nfirst | one\n\nsecond | two\n:::",
  "::: verse 2\nsecond line\nthird\n:::",
  "::: prose 4\nfourth | its translation\n:::",
  "> ::: verse 3\n> third\n> :::",
  "::: note\na footnote\n:::",
  "::: reference\nSurname, Title\n:::",
  "::: note\n::: verse\nquoted | verse\n:::\n:::",
  "::: verse\nline\n::: note\na note as a row\n:::\nline after\n:::",
  "::: card-red\n::: verse\na verse in a card\n:::\n\nand text after it\n:::",
  "\\- not a list",
  "\\# not a heading",
  "\\::: not a fence",
  "> ::: card-red\n> a card inside a quote\n> :::",
  "text with a ⟨8⟩ folio",
  "⟨xxiv⟩**Enter GHOST**",
  "::: verse\n*Exit*\n⟨line⟩*Flower o’ the broom,*\n⟨line⟩*a* | *b*\n⟨line⟩\n:::",
  "::: prose\n⟨line⟩ |\n:::",
  "an image ![alt text](2022-02-06-img-1.webp) inline",
  "<u>underlined</u> text",
  "<Sean> a transcript line\n<suzie> stays literal",
  " a line opening with a space\n  and another",
  "a paragraph\n\n    four spaces in, not code",
  "***bold italic*** and ***Odes* 1.38**",
  "**`bold code`** and [**bold link**](https://x.test)",
  "[*an italic title*](https://x.test) and [https://x.test/a](https://x.test/a/b)",
  "[a](https://a.test)[b](https://b.test) two links side by side",
  "[Martin Buber, *I and Thou*](https://x.test) and *see [this](https://y.test) too*",
  "## a heading ending in a space ",
  "a url with https://x.test/a_b_/c_d_/ underscores and https://x.test/*e*/ stars",
  "https://en.wikipedia.org/wiki/Foo_(bar) keeps its paren",
  "![](<bookshelf--Popova, Maria--x-img-1.webp>) and [t](<a b>)",
  "*an italic sentence holding [a link](https://x.test) and more*",
  "[**bold** and plain](https://x.test) and *a **bold** word inside*",
];

test("round trips: every form survives md -> document -> md", () => {
  for (const md of ROUND_TRIPS) expect(trip(md), JSON.stringify(md)).toBe(md);
});

test("...and inside a quote", () => {
  for (const md of ROUND_TRIPS) {
    if (md.startsWith(">") || md.startsWith("<")) continue;
    const quoted = md.split("\n").map((l) => (l ? "> " + l : "> ")).join("\n");
    expect(trip(quoted), JSON.stringify(quoted)).toBe(quoted);
  }
});

// a spelling the parse accepts but the serializer does not write comes back
// in its canonical form after ONE pass, and that form is then a fixed point
const NORMALIZED: [string, string][] = [
  ["> > nested\n> > quote", ">> nested\n>> quote"],
  ["**[x](https://x.test)**", "[**x**](https://x.test)"],
  ["*[t](https://x.test)*", "[*t*](https://x.test)"],
  ["> a quote\n>\n> with a gap", "> a quote\n> \n> with a gap"],
  ["::: verse\npaired | empty translation |\n:::", "::: verse\npaired | empty translation \\|\n:::"],
  ["::: verse 1\nfirst\n:::", "::: verse\nfirst\n:::"],
  ["::: verse 007\nseventh\n:::", "::: verse 7\nseventh\n:::"],
  ["_em_ and __strong__", "*em* and **strong**"],
  ["[www link](www.x.test/p)", "[www link](https://www.x.test/p)"],
  ["a\n\n\n\nb", "a\n\nb"],
  ["```Ruby\nx\n```", "```ruby\nx\n```"],
];
test("non-canonical spellings normalize in one pass and then hold", () => {
  for (const [input, canonical] of NORMALIZED) {
    expect(trip(input), JSON.stringify(input)).toBe(canonical);
    expect(trip(canonical), "a fixed point").toBe(canonical);
  }
});

// the hoist: a mark's edge whitespace belongs OUTSIDE its markers
const p = (...content: (string | ReturnType<typeof schema.text>)[]) =>
  schema.nodes.doc.create(null, schema.nodes.paragraph.create(null, content.map((c) => (typeof c === "string" ? schema.text(c) : c))));
const em = (t: string) => schema.text(t, [schema.marks.em.create()]);
const strong = (t: string) => schema.text(t, [schema.marks.strong.create()]);
const strike = (t: string) => schema.text(t, [schema.marks.strike.create()]);
const both = (t: string) => schema.text(t, [schema.marks.strong.create(), schema.marks.em.create()]);

test("an em ending in a space writes the space after its closer", () => {
  expect(serializeMarkdown(p(em("Name "), "x"))).toBe("*Name* x");
});
test("an em beginning with a space writes the space before its opener", () => {
  expect(serializeMarkdown(p("x", em(" Name")))).toBe("x *Name*");
});
test("a strong and a strike hoist the same way", () => {
  expect(serializeMarkdown(p(strong("Name "), "x"))).toBe("**Name** x");
  expect(serializeMarkdown(p(strike("Name "), "x"))).toBe("~~Name~~ x");
});
test("the space hoists through nested marks", () => {
  expect(serializeMarkdown(p(both("Name"), strong(" "), "x"))).toBe("***Name*** x");
});
test("the Horace footnote shape: an em ending in a space beside a strong", () => {
  expect(serializeMarkdown(p(both("Name"), em(" "), strong("1.37"), " (t)"))).toBe("***Name*** **1.37** (t)");
});
test("a mark holding only whitespace writes the whitespace and no markers", () => {
  expect(serializeMarkdown(p("a", em(" "), "b"))).toBe("a b");
});
test("each hoisted form is a fixed point", () => {
  const forms = ["*Name* x", "x *Name*", "**Name** x", "~~Name~~ x", "***Name*** x", "***Name*** **1.37** (t)", "***Odes* 1.38**"];
  for (const md of forms) expect(trip(md), JSON.stringify(md)).toBe(md);
});

// the property the whole-corpus check rests on: a second pass changes nothing
test("the serializer's output is the parser's fixed point", () => {
  for (const md of ROUND_TRIPS.concat(NORMALIZED.map(([i]) => i))) {
    const once = trip(md);
    expect(trip(once), JSON.stringify(md)).toBe(once);
  }
});


test("a pair cut down to one cell serializes as that cell's line, never a throw (the 2026-09-12 second confirmation pass: ⌘C's text flavour and the cut-to-link act)", () => {
  const doc = parseMarkdown("::: verse\nalpha | one two\n:::\n\nAfter.");
  let from = 0, to = 0;
  doc.descendants((n, pos) => { if (n.isText && n.text!.includes("two")) from = pos + n.text!.indexOf("two"); if (n.isText && n.text!.includes("After")) to = pos + n.text!.indexOf("After") + 5; });
  expect(serializeMarkdown(doc.cut(from, to))).toBe("::: verse\ntwo\n:::\n\nAfter");
});
