import { test, expect } from "vitest";
import { parseMarkdown } from "./parse.ts";
import { fenceRefusals, refusalsText } from "./fenceRefusals.ts";

const refused = (md: string) => fenceRefusals(parseMarkdown(md));
test("a fence-shaped line that opens nothing is named with its reason; the words Gesta knows are told what they lack", () => {
  expect(refused("::: versey\nline\n:::")).toEqual([{ line: "::: versey", reason: "not a block Gesta knows" }]);
  expect(refused("::: verse 0\nline\n:::")[0].reason).toBe("0 is not a starting line");
  expect(refused("::: prose x\nline\n:::")[0].reason).toBe("x is not a starting sentence");
  expect(refused("::: note 2\nline\n:::")[0].reason).toBe("note takes nothing after it");
  expect(refused("::: card\nline\n:::")[0].reason).toBe("card blocks must include a colour, like card-light-green");
});
test("a real fence, a bare closer, a code block's line and a row are none of them refusals", () => {
  expect(refused("::: verse\nline\n:::")).toEqual([]);
  expect(refused("::: note\ntext\n:::")).toEqual([]);
  expect(refused("```\n::: nope\n```")).toEqual([]);
  expect(refused("plain\n\n:::")).toEqual([]);
});
test("the pin's text: one line with its tail, several one per line with the count", () => {
  expect(refusalsText(refused("::: versey\nx\n:::"))).toBe("::: versey — not a block Gesta knows, so it stayed a paragraph");
  const two = refused("::: versey\nx\n:::\n\n::: card\ny\n:::");
  expect(refusalsText(two)).toBe("::: versey — not a block Gesta knows\n::: card — card blocks must include a colour, like card-light-green\n2 fences stayed paragraphs");
});
