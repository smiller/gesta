import { describe, it, expect } from "vitest";
import { findHit } from "./highlight.ts";
import { parseMarkdown } from "../model/parse.ts";
import { selectionLink } from "./reference.ts";

/* the underscores sit in a code span: bare, they would be emphasis */
const doc = parseMarkdown("Her sister’s book.\n\n::: verse\nA sister | une sœur\nresisters\n:::\n\n`_private_` text\n");
describe("findHit", () => {
  it("the nth occurrence under the search parse, folded, across blocks", () => {
    const first = findHit(doc, "Sister", 0, true)!;
    expect(doc.textBetween(first.from, first.to)).toBe("sister");
    expect(doc.textBetween(findHit(doc, "sister", 1, true)!.from, findHit(doc, "sister", 1, true)!.to)).toBe("sister");
    expect(doc.textBetween(findHit(doc, "sister", 2, true)!.from, findHit(doc, "sister", 2, true)!.to)).toBe("sister");
    expect(findHit(doc, "sister", 3, true)).toBeNull();
    expect(findHit(doc, "_sister_", 1, true)).not.toBeNull();
    expect(findHit(doc, "_sister_", 2, true)).toBeNull();
    expect(findHit(doc, "", 0, true)).toBeNull();
  });
  it("a deep link replays literally: an edge underscore is text, where the search box reads it as a boundary", () => {
    const literal = findHit(doc, "_private_", 0, false)!;
    expect(doc.textBetween(literal.from, literal.to)).toBe("_private_");
    const marked = findHit(doc, "_private_", 0, true)!;
    expect(doc.textBetween(marked.from, marked.to)).toBe("private");
  });
  it("what selectionLink minted, findHit lands on: the two count over one stream", () => {
    const from = doc.textBetween(0, doc.content.size).indexOf("resisters");
    let pos = 0;
    doc.descendants((n, p) => { if (n.isText && n.text === "resisters") pos = p; });
    const hl = selectionLink(doc, pos + 2, pos + 8)!;
    expect(hl).toEqual({ q: "sister", nth: 2 });
    const hit = findHit(doc, hl.q!, hl.nth!, false)!;
    expect(hit).toEqual({ from: pos + 2, to: pos + 8 });
    expect(from).toBeGreaterThan(0);
  });
});
