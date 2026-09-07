// The folio gutter's switch: set where a leaf is the text's, not where it
// is a note's.
import { test, expect } from "vitest";
import { EditorState } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { hasFolios, folios } from "./folios.ts";

test("hasFolios: a marker in the text, not one inside a note", () => {
  expect(hasFolios(parseMarkdown("text ⟨8⟩ more"))).toBe(true);
  expect(hasFolios(parseMarkdown("> quoted ⟨ix⟩ leaf"))).toBe(true);
  expect(hasFolios(parseMarkdown("::: verse\na ⟨8⟩ b\n:::"))).toBe(true);
  expect(hasFolios(parseMarkdown("::: note\na ⟨8⟩ b\n:::"))).toBe(false);
  expect(hasFolios(parseMarkdown("::: verse\na\n::: note\n⟨8⟩\n:::\n:::"))).toBe(false);
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
