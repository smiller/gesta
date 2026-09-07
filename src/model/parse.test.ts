// The parse arm: what each markdown form becomes as a document. The shapes
// are the current app's md.test.mjs pins (2026-09-07), re-asked of the tree.
import { test, expect } from "vitest";
import { parseMarkdown, visibleText } from "./parse.ts";
import { fenceBody, escapeProse, unescapeProse, openItemCol, escapeIndent, verseSplit, blockLineAt, readsAsBlock } from "./grammar.ts";

const doc = (md: string) => parseMarkdown(md).toJSON();
const kinds = (md: string) => parseMarkdown(md).content.content.map((n) => n.type.name);

test("the block dispatch: every top-level form lands as its node", () => {
  expect(kinds("text\n\n# h\n\n> q\n\n- a\n\n1. b\n\n```\nc\n```\n\n| a |\n| - |\n\n::: card-red\nx\n:::\n\n::: note\nn\n:::\n\n::: reference\nr\n:::\n\n::: verse\nv\n:::\n\n::: prose\np\n:::"))
    .toEqual(["paragraph", "heading", "blockquote", "bullet_list", "ordered_list", "code_block", "table", "card", "note", "reference", "verse", "prose"]);
});

test("headings take every level, and a hash without a space is text", () => {
  expect(doc("### three").content[0]).toMatchObject({ type: "heading", attrs: { level: 3 } });
  expect(doc("###### six").content[0].attrs.level).toBe(6);
  expect(kinds("#hashtag")).toEqual(["paragraph"]);
  expect(kinds("####### seven")).toEqual(["paragraph"]);
});

test("a paragraph keeps its breaks, its leading whitespace and its angle brackets", () => {
  const d = parseMarkdown(" <Sean> one\n  <suzie> two");
  expect(visibleText(d)).toBe(" <Sean> one\n  <suzie> two");
  expect(d.firstChild!.childCount).toBe(3);
});

test("an ordered countdown keeps its own numbers", () => {
  const d = doc("18. a\n17. b\n16. c");
  expect(d.content[0].attrs.start).toBe(18);
  expect(d.content[0].content.map((li: { attrs: { value: number | null } }) => li.attrs.value)).toEqual([null, 17, 16]);
});

test("a hanging block joins its item, one convention at every marker width", () => {
  const d = parseMarkdown("14. a\n\n    hangs under 14\n9. b\n\n    hangs under 9\n\nnot hanging");
  const items = d.firstChild!;
  expect(items.childCount).toBe(2);
  expect(items.child(0).childCount).toBe(2);
  expect(items.child(1).childCount).toBe(2);
  expect(d.childCount).toBe(2);
});

test("a nested list sits inside the item above it, by relative indent", () => {
  const d = parseMarkdown("- a\n  - b\n    - c\n- d");
  expect(d.firstChild!.childCount).toBe(2);
  const a = d.firstChild!.child(0);
  expect(a.child(1).type.name).toBe("bullet_list");
  expect(a.child(1).child(0).child(1).type.name).toBe("bullet_list");
});

test("a fence carries its lang lowercased; unclosed runs to EOF; a shorter backtick line stays code", () => {
  expect(doc("```Ruby\nputs 1\n```")).toMatchObject({ content: [{ type: "code_block", attrs: { lang: "ruby" } }] });
  expect(visibleText(parseMarkdown("```\nopen\nforever"))).toBe("open\nforever");
  expect(visibleText(parseMarkdown("````\n```\n````"))).toBe("```");
});

test("the reference body is plain text", () => {
  const d = doc("::: reference\n- not a list\n*not em*\n:::");
  expect(d.content[0]).toEqual({ type: "reference", content: [{ type: "text", text: "- not a list\n*not em*" }] });
});

test("verse rows: paired, full-width, and the stanza gap; prose gaps on an empty pair", () => {
  const v = parseMarkdown("::: verse\na | b\nsolo\n\nc |\n:::").firstChild!;
  expect(v.content.content.map((n) => n.type.name)).toEqual(["pair", "line", "gap", "pair"]);
  const pr = parseMarkdown("::: prose\na | b\n | \n:::").firstChild!;
  expect(pr.content.content.map((n) => n.type.name)).toEqual(["pair", "gap"]);
  const ve = parseMarkdown("::: verse\n | \n:::").firstChild!;
  expect(ve.content.content.map((n) => n.type.name)).toEqual(["pair"]);
});

test("the split is at the FIRST pipe, and an escaped one stays in its cell", () => {
  expect(verseSplit("a\\|b | c | d")).toBe(5);
  const pair = parseMarkdown("::: verse\na\\|b | c | d\n:::").firstChild!.firstChild!;
  expect(pair.child(0).textContent).toBe("a|b");
  expect(pair.child(1).textContent).toBe("c | d");
});

test("a ::: note inside a row fence is a row, and does not close it", () => {
  const v = parseMarkdown("::: verse\none\n::: note\nfoot\n:::\ntwo\n:::").firstChild!;
  expect(v.content.content.map((n) => n.type.name)).toEqual(["line", "note", "line"]);
  expect(parseMarkdown("::: verse\none\n::: note\nfoot\n:::\ntwo\n:::").childCount).toBe(1);
});

test("a nested note's body recurses, so it can hold a verse, and its fences do not end the block around it", () => {
  const d = parseMarkdown("::: card-red\n::: note\n::: verse\nx | y\n:::\n\n```\n:::\n```\n:::\n\nstill in the card\n:::\n\noutside");
  expect(d.childCount).toBe(2);
  const card = d.child(0);
  expect(card.child(0).type.name).toBe("note");
  expect(card.child(0).child(0).type.name).toBe("verse");
  expect(card.child(0).child(1).type.name).toBe("code_block");
  expect(card.child(1).textContent).toBe("still in the card");
});

test("a ::: line may be indented, opener and closer alike; the fence word must be exact", () => {
  expect(kinds("  ::: note\n  x\n  :::")).toEqual(["note"]);
  expect(kinds("::: versey\nx\n:::")).toEqual(["paragraph"]);
  expect(kinds("::: verse 0\nx\n:::")).toEqual(["paragraph"]);
  expect(kinds("::: card\nx\n:::")).toEqual(["paragraph"]);
});

test("a quote takes blocks at its own level, to any depth, and a blank quote line is content", () => {
  const q = parseMarkdown("> a\n> \n> b\n> - l\n> > deeper\n> > \n> > > deepest").firstChild!;
  expect(q.content.content.map((n) => n.type.name)).toEqual(["paragraph", "bullet_list", "blockquote"]);
  expect(q.child(0).childCount).toBe(4);   // a, br, br, b
  expect(q.child(2).child(1).type.name).toBe("blockquote");
});

test("body rows pad or trim to the header's column count", () => {
  const t = parseMarkdown("| a | b |\n| --- | --- |\n| 1 |\n| 1 | 2 | 3 |").firstChild!;
  expect(t.child(1).childCount).toBe(2);
  expect(t.child(2).childCount).toBe(2);
  expect(t.child(0).child(0).attrs.header).toBe(true);
});

test("inline: code spans keep markers literal, ⟩ is a word boundary, a folio in an href stays a token", () => {
  const d = parseMarkdown("`*x* ⟨8⟩` ⟨9⟩**bold** [t](https://x.test/⟨1⟩)");
  const kids = d.firstChild!.content.content;
  expect(kids[0].text).toBe("*x* ⟨8⟩");
  expect(kids[0].marks[0].type.name).toBe("code");
  expect(kids[2].type.name).toBe("folio");
  expect(kids[3].marks[0].type.name).toBe("strong");
  expect(kids[5].marks[0].attrs.href).toBe("https://x.test/⟨1⟩");
});

test("emphasis whose closer follows a space is not emphasis", () => {
  expect(visibleText(parseMarkdown("*not em * here"))).toBe("*not em * here");
});

test("a bare URL is one link even when it holds emphasis markers or a paren", () => {
  const d = parseMarkdown("see https://x.test/a_b_/c_d_/ and https://x.test/Foo_(bar). done");
  const kids = d.firstChild!.content.content;
  expect(kids[1].text).toBe("https://x.test/a_b_/c_d_/");
  expect(kids[1].marks.map((m) => m.type.name)).toEqual(["link"]);
  expect(kids[3].text).toBe("https://x.test/Foo_(bar)");
  expect(kids[4].text).toBe(". done");
  expect(visibleText(parseMarkdown("[x](https://x.test) https://y.test"))).toBe("x https://y.test");
});

test("a bare URL links, trailing punctuation stays outside, and a folio ends the run", () => {
  const d = parseMarkdown("see https://x.test/p). and www.y.test⟨8⟩");
  const kids = d.firstChild!.content.content;
  expect(kids[1].marks[0].attrs.href).toBe("https://x.test/p");
  expect(kids[2].text).toBe("). and ");
  expect(kids[3].marks[0].attrs.href).toBe("https://www.y.test");
  expect(kids[4].type.name).toBe("folio");
});

test("the underline tag is read only as a matched pair; other tags are text", () => {
  expect(parseMarkdown("<u>x</u>").firstChild!.firstChild!.marks[0].type.name).toBe("underline");
  expect(visibleText(parseMarkdown("<u>unclosed and <b>bold</b>"))).toBe("<u>unclosed and <b>bold</b>");
});

test("the escaping helpers: the mark escapes itself, and the indent is read backwards", () => {
  expect(escapeProse("- x")).toBe("\\- x");
  expect(escapeProse("\\- x")).toBe("\\\\- x");
  expect(unescapeProse("\\\\- x")).toBe("\\- x");
  expect(unescapeProse("\\usepackage")).toBe("\\usepackage");
  expect(openItemCol("- a\n  cont")).toBe(2);
  expect(openItemCol("- a\n\nplain")).toBe(-1);
  expect(escapeIndent("  hangs", "- a")).toBe("\\  hangs");
  expect(escapeIndent("free", "- a")).toBe("free");
  expect(readsAsBlock(":::")).toBe(true);
  expect(blockLineAt(["| a |", "| - |"], 0)).toBe(true);
});

test("fenceBody counts depth for the recursing forms and shields raw bodies", () => {
  const lines = "::: card-red\n::: verse\n::: card-red\n:::\nx\n:::\nafter".split("\n");
  // the raw "::: card-red" row inside the verse is no depth; the card closes at line 5
  expect(fenceBody(lines, 1)).toEqual({ body: ["::: verse", "::: card-red", ":::", "x"], next: 6 });
});
