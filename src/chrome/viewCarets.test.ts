import { describe, it, expect } from "vitest";
import { countBefore, positionAt, crossViewOffset, arrivingCount } from "./viewCarets.ts";
import { flattenDoc, flattenText } from "../model/flatten.ts";
import { parseMarkdown } from "../model/parse.ts";

describe("the count", () => {
  it("counts the flat characters before a document position, a block's end staying in its block", () => {
    const doc = parseMarkdown("ab\n\ncd");
    const flat = flattenDoc(doc);   /* "ab cd", positions 1 2 null 5 6 */
    expect(countBefore(flat, 1)).toBe(0);
    expect(countBefore(flat, 3)).toBe(2);   /* the end of "ab": after b, before the edge */
    expect(countBefore(flat, 5)).toBe(3);
    expect(countBefore(flat, 7)).toBe(5);
    expect(positionAt(flat, 0)).toBe(1);
    expect(positionAt(flat, 2)).toBe(3);   /* the edge: after the last mapped character */
    expect(positionAt(flat, 3)).toBe(5);
    expect(positionAt(flat, 5)).toBe(7);
  });
  it("the source text folds the same way with raw indices", () => {
    const flat = flattenText("ab\n\ncd  e");
    expect(flat.text).toBe("ab cd e");
    expect(flat.pos).toEqual([0, 1, 2, 4, 5, 6, 8]);
    expect(countBefore(flat, 4)).toBe(3);
    expect(countBefore(flat, 3)).toBe(3);   /* inside the folded run: the run's first kept char counts as reached */
  });
});
describe("crossViewOffset", () => {
  const src = "# Title with **bold** and [a link](#x) here";
  const rendered = "Title with bold and a link here";
  it("to the rendered side, the syntax never advances the count", () => {
    expect(crossViewOffset(src, rendered, src.indexOf("bold"), false, false)).toBe(rendered.indexOf("bold"));
    expect(crossViewOffset(src, rendered, src.indexOf("here"), false, false)).toBe(rendered.indexOf("here"));
  });
  it("to the source, glued syntax stays ahead of the caret; a separate token is crossed", () => {
    expect(crossViewOffset(rendered, src, rendered.indexOf("bold"), true, false)).toBe(src.indexOf("**bold"));
    expect(crossViewOffset(rendered, src, rendered.indexOf("a link"), true, false)).toBe(src.indexOf("[a link"));
    /* the inputs are FOLDED streams, as the views hand them over */
    const src2 = flattenText("out.\n\n![](p.webp)\n\nBe there").text;
    const r2 = "out. Be there";
    expect(crossViewOffset(r2, src2, r2.indexOf("Be"), true, false)).toBe(src2.indexOf("Be"));
  });
  it("past the last rendered character the tail belongs behind a reader who was below it all", () => {
    const src2 = "out.\n\n![](p.webp)";
    expect(crossViewOffset("out.", src2, 4, true, true)).toBe(src2.length);
    expect(crossViewOffset("out.", src2, 4, true, false)).toBe(4);
  });
});
describe("arrivingCount", () => {
  it("an exact hold wins while the text matches; else the other view's place carries across; else nothing", () => {
    const held = { at: 7, text: "same text", tail: false, seen: true };
    expect(arrivingCount(held, null, "same text", false)).toEqual({ at: 7, tail: false, seen: true });
    const left = { at: 5, text: "Title bold", tail: false, seen: false };
    expect(arrivingCount(held, left, "# Title **bold**", true)).toEqual({ at: 7, tail: false, seen: false });   /* before the space that precedes the glued ** */
    expect(arrivingCount(null, null, "x", true)).toBeNull();
  });
});
