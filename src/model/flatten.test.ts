import { describe, it, expect } from "vitest";
import { flattenDoc, flatRange } from "./flatten.ts";
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
