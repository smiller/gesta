import { describe, it, expect } from "vitest";
import { markdownTab, markdownTyped, markdownSpanAt } from "./markdownKeys.ts";
import { said } from "../model/alertText.ts";

describe("markdownSpanAt", () => {
  it("a heading's line, at its start or end; a line in a fence is the fence's, the empty line before a heading and the body nothing", () => {
    const text = "\n# Title\nbody\n```\n# comment\n```\n";
    expect(markdownSpanAt(text, 1)).toBe("heading");
    expect(markdownSpanAt(text, 8)).toBe("heading");
    expect(markdownSpanAt(text, 0)).toBeNull();
    expect(markdownSpanAt(text, 12)).toBeNull();
    expect(markdownSpanAt(text, text.indexOf("# comment") + 3)).toBe("fence");
  });
});

describe("markdownTab", () => {
  it("a collapsed Tab inserts two spaces; Shift-Tab takes up to two back, or is left alone", () => {
    expect(markdownTab("ab", 1, 1, false)).toEqual({ value: "a  b", start: 3, end: 3 });
    expect(markdownTab("a   b", 4, 4, true)).toEqual({ value: "a b", start: 2, end: 2 });
    expect(markdownTab("a b", 2, 2, true)).toEqual({ value: "ab", start: 1, end: 1 });
    expect(markdownTab("ab", 1, 1, true)).toBeNull();
  });
  it("a selection shifts every line it touches, stays selected, and an end at a line start leaves that line", () => {
    const v = "one\ntwo\nthree\nfour";
    expect(markdownTab(v, 5, 9, false)).toEqual({ value: "one\n  two\n  three\nfour", start: 4, end: 17 });
    expect(markdownTab(v, 5, 8, false)).toEqual({ value: "one\n  two\nthree\nfour", start: 4, end: 9 });
    expect(markdownTab("  one\n two\nthree", 0, 16, true)).toEqual({ value: "one\ntwo\nthree", start: 0, end: 13 });
  });
  it("an empty line gains nothing, and a selection that moved nothing says why", () => {
    expect(markdownTab("a\n\nb", 0, 4, false)).toEqual({ value: "  a\n\n  b", start: 0, end: 8 });
    expect(markdownTab("\n\n", 0, 2, false)).toEqual({ refuse: said("nothingToIndent") });
    expect(markdownTab("a\nb", 0, 3, true)).toEqual({ refuse: said("noSpacesToRemove") });
  });
});

describe("markdownTyped", () => {
  /* the text with the character just typed at the caret's left */
  const typedIn = (before: string, after = ""): string => {
    const value = before + after, r = markdownTyped(value, before.length);
    return r ? value.slice(0, r.from) + r.text + value.slice(r.to) : value;
  };
  it("a -- between spaces becomes a dash, and straight quotes curl, as in HTML mode", () => {
    expect(typedIn("a -- ")).toBe("a — ");
    expect(typedIn("x \"")).toBe("x “");
    expect(typedIn("x “b\"")).toBe("x “b”");
    expect(typedIn("it'")).toBe("it’");
    expect(typedIn("\n'")).toBe("\n‘");
    expect(typedIn("x ”\"")).toBe("x \"");
  });
  it("code is left alone: a fenced block, and an inline code span", () => {
    expect(typedIn("```\nx \"")).toBe("```\nx \"");
    expect(typedIn("see `a -- ")).toBe("see `a -- ");
    expect(typedIn("```\ncode\n```\nx \"")).toBe("```\ncode\n```\nx “");
  });
  it("a link's address and title, and a bare address, are left alone; prose after a closed link curls", () => {
    expect(typedIn("[x](#commonplace/O'")).toBe("[x](#commonplace/O'");
    expect(typedIn("[a](http://x \"")).toBe("[a](http://x \"");
    expect(typedIn("see https://x.org/a'")).toBe("see https://x.org/a'");
    expect(typedIn("see <https://x.org/a -- ")).toBe("see <https://x.org/a -- ");
    expect(typedIn("[x](#a) and \"")).toBe("[x](#a) and “");
  });
});

it("what the caret is inside, in markdown mode, read as a link typed there would parse: a fence, inline code, a link or a bare address it would break, a heading's line; nothing in prose", () => {
  const at = (text: string) => markdownSpanAt(text.replace("|", ""), text.indexOf("|"));
  expect(at("```\nsome |code\n```\n")).toBe("fence");
  expect(at("```|\ncode\n```\n")).toBe("fence");
  expect(at("see `co|de` now")).toBe("code");
  expect(at("see ``a ` |b`` now")).toBeNull();
  expect(at("it`s |fine")).toBeNull();
  expect(at("see [the li|nk](#x) now")).toBe("link");
  expect(at("see [the link](#x|) now")).toBe("link");
  expect(at("see |[the link](#x) now")).toBeNull();
  expect(at("see [the link](#x)| now")).toBeNull();
  expect(at("# A He|ading")).toBe("heading");
  expect(at("# A `co|de` heading")).toBe("code");
  expect(at("plain |prose")).toBeNull();
  expect(at("- https://chelsea|troy.com/2024/ai/")).toBe("link");
  expect(at("see www.exam|ple.org now")).toBe("link");
  expect(at("see https://example.org/| now")).toBe("link");
  expect(at("see https://example.org/page.| Next")).toBe("link");
  expect(at("see |https://example.org/ now")).toBe("link");
  expect(at("see _https://exam|ple.org/_ now")).toBe("link");
  expect(at("see [x](https://en.wikipedia.org/wiki/A_(b)|) now")).toBe("link");
  expect(at("````\n```\nso|me\n````\n")).toBe("fence");
  expect(at("see x:https://exa|mple.org now")).toBeNull();
  expect(at("see https://example.org/ |now")).toBeNull();
  expect(at("see <https://exam|ple.org/> now")).toBeNull();
  expect(at("```\ncode\n```\n\nafter |it")).toBeNull();
});
