// The folio gutter's switch: set where a leaf is the text's, not where it
// is a note's.
import { test, expect } from "vitest";
import { EditorState } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { hasFolios, folios, leafStarts } from "./folios.ts";

test("hasFolios: a marker in the text, not one inside a note", () => {
  expect(hasFolios(parseMarkdown("text ⟨8⟩ more"))).toBe(true);
  expect(hasFolios(parseMarkdown("> quoted ⟨ix⟩ leaf"))).toBe(true);
  expect(hasFolios(parseMarkdown("::: verse\na ⟨8⟩ b\n:::"))).toBe(true);
  expect(hasFolios(parseMarkdown("::: note\na ⟨8⟩ b\n:::"))).toBe(false);
  expect(hasFolios(parseMarkdown("::: verse\na\n::: note\n⟨8⟩\n:::\n:::"))).toBe(false);
  expect(hasFolios(parseMarkdown("::: margin-note\na ⟨8⟩ b\n:::"))).toBe(false);
  expect(hasFolios(parseMarkdown("::: verse\na\n::: margin-note\n⟨8⟩\n:::\n:::"))).toBe(false);
  expect(hasFolios(parseMarkdown("no leaf"))).toBe(false);
});

test("the root carries foliopage exactly then", () => {
  const attrs = (md: string) => {
    const s = EditorState.create({ doc: parseMarkdown(md), plugins: [folios()] });
    const a = s.plugins[0].props.attributes;
    return typeof a === "function" ? a(s) : a;
  };
  expect(attrs("⟨15⟩ text")).toEqual({ class: "foliopage" });
  expect(attrs("::: note\n⟨15⟩\n:::")).toEqual({});
});

test("leafStarts: each marker's leaf begins at the first character after it, past spaces, a block's end, and a note", () => {
  const starts = (md: string): string[] => { const d = parseMarkdown(md); return leafStarts(d).map(({ at }) => at === null ? "none" : d.textBetween(at, at + 1)); };
  expect(starts("a ⟨8⟩word")).toEqual(["w"]);
  expect(starts("a⟨8⟩ word")).toEqual(["w"]);
  expect(starts("end of it⟨8⟩\n\nnext paragraph")).toEqual(["n"]);
  expect(starts("a⟨8⟩\n\n::: note\nnoted\n:::\n\nprose")).toEqual(["p"]);
  expect(starts("last⟨8⟩")).toEqual(["none"]);
});
