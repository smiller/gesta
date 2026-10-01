import { describe, it, expect } from "vitest";
import { flattenDoc, flatRange, flattenText } from "./flatten.ts";
import { parseMarkdown } from "./parse.ts";
import horace from "../../fixtures/horace-odes-1.1.md?raw";
import pippa from "../../fixtures/pippa-passes-intro.md?raw";
import twelfth from "../../fixtures/twelfth-night-1.1.md?raw";
import williams from "../../fixtures/williams-witchcraft-3.md?raw";

const same = (md: string): void => {
  const doc = parseMarkdown(md);
  const flat = flattenDoc(doc);
  expect(flat.text).toBe(doc.textBetween(0, doc.content.size, " ", " ").replace(/\s+/g, " "));
  expect(flat.pos.length).toBe(flat.text.length);
};
describe("flattenDoc", () => {
  it("is textBetween with a space between blocks and for each leaf, whitespace folded, over every fixture", () => {
    for (const md of [horace, pippa, twelfth, williams]) same(md);
    same("# T\n\nline one  \nline two\n\n::: verse\na | b\n\nc\n:::\n\n```\ncode\n  here\n```\n");
  });
  it("maps every text character to its position, and a span back to a selection", () => {
    const doc = parseMarkdown("ab\n\ncd ⟨5⟩ ef");
    const flat = flattenDoc(doc);
    expect(flat.text).toBe("ab cd ef");
    /* the space kept is the text's own at 7; the folio's and the next
       text's leading space fold into it */
    expect(flat.pos).toEqual([1, 2, null, 5, 6, 7, 10, 11]);
    expect(flatRange(flat, 3, 2)).toEqual({ from: 5, to: 7 });
    expect(doc.textBetween(5, 7)).toBe("cd");
    expect(flatRange(flat, 2, 2)).toBeNull();
  });
});
describe("flattenText", () => {
  it("folds a plain text as flattenDoc does, each kept character at its raw index", () => {
    const flat = flattenText("ab\n\n  cd\te");
    expect(flat.text).toBe("ab cd e");
    expect(flat.pos).toEqual([0, 1, 2, 6, 7, 8, 9]);
  });
});
describe("footnote marks", () => {
  it("a space and superscript digits after a word are skipped: the text reads on, each kept character at its own position", () => {
    const doc = parseMarkdown("was but a Pedenteria ¹ in comparison, So as Amphion, ³ was said");
    const flat = flattenDoc(doc);
    expect(flat.text).toBe("was but a Pedenteria in comparison, So as Amphion, was said");
    expect(flat.pos.length).toBe(flat.text.length);
    const at = flat.text.indexOf("Pedenteria in");
    const r = flatRange(flat, at, "Pedenteria in".length)!;
    expect(doc.textBetween(r.from, r.to)).toBe("Pedenteria ¹ in");
  });
  it("two marks on one word are both skipped, a mark of two digits too", () => {
    expect(flattenDoc(parseMarkdown("a word ¹ ² next, and ¹⁹ last")).text).toBe("a word next, and last");
  });
  it("a superscript joined to its word stays: m² and 10³ are text", () => {
    expect(flattenDoc(parseMarkdown("an area of 4 m² and 10³ more")).text).toBe("an area of 4 m² and 10³ more");
  });
  it("a superscript opening a block is not a mark: it stays, and so does the space between the blocks", () => {
    expect(flattenDoc(parseMarkdown("end.\n\n¹ start")).text).toBe("end. ¹ start");
  });
  it("flattenText skips the same marks, so the two views count alike", () => {
    const md = "was but a Pedenteria ¹ in comparison\n\n¹ start, m² and a word ¹ ² next";
    expect(flattenText(md).text).toBe(flattenDoc(parseMarkdown(md)).text);
  });
});
