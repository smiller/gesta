import { test, expect } from "vitest";
import { parseMarkdown } from "../model/parse.ts";
import { hasPages, pages } from "./pages.ts";

test("a page begins at a page label in the text, not one inside a note or a margin-note", () => {
  expect(hasPages(parseMarkdown("text ⟨8⟩ more"))).toBe(true);
  expect(hasPages(parseMarkdown("> quoted ⟨ix⟩ leaf"))).toBe(true);
  expect(hasPages(parseMarkdown("::: verse\na ⟨8⟩ b\n:::"))).toBe(true);
  expect(hasPages(parseMarkdown("::: note\na ⟨8⟩ b\n:::"))).toBe(false);
  expect(hasPages(parseMarkdown("::: verse\na\n::: note\n⟨8⟩\n:::\n:::"))).toBe(false);
  expect(hasPages(parseMarkdown("::: margin-note\na ⟨8⟩ b\n:::"))).toBe(false);
  expect(hasPages(parseMarkdown("::: verse\na\n::: margin-note\n⟨8⟩\n:::\n:::"))).toBe(false);
  expect(hasPages(parseMarkdown("no leaf"))).toBe(false);
  expect(pages(parseMarkdown("⟨7⟩ a\n\n::: note\n⟨8⟩\n:::\n\n⟨ix⟩ b")).map((l) => l.label)).toEqual(["7", "ix"]);
});

test("each page begins at the first character after its label, past spaces, a block's end, and a note", () => {
  const starts = (md: string): string[] => { const d = parseMarkdown(md); return pages(d).map(({ at }) => at === null ? "none" : d.textBetween(at, at + 1)); };
  expect(starts("a ⟨8⟩word")).toEqual(["w"]);
  expect(starts("a⟨8⟩ word")).toEqual(["w"]);
  expect(starts("end of it⟨8⟩\n\nnext paragraph")).toEqual(["n"]);
  expect(starts("a⟨8⟩\n\n::: note\nnoted\n:::\n\nprose")).toEqual(["p"]);
  expect(starts("last⟨8⟩")).toEqual(["none"]);
});
