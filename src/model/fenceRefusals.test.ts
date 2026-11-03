import { test, expect } from "vitest";
import { parseMarkdown } from "./parse.ts";
import { fenceRefusals, refusalsText } from "./fenceRefusals.ts";

const refused = (md: string) => fenceRefusals(parseMarkdown(md));
test("a fence-shaped line that opens nothing is named with its reason; the words Gesta knows are told what they lack", () => {
  expect(refused("::: versey\nline\n:::")).toEqual([{ line: "::: versey", reason: "not a block Gesta knows" }]);
  expect(refused("::: verse 0\nline\n:::")[0].reason).toBe("0 is not a starting line");
  expect(refused("::: prose x\nline\n:::")[0].reason).toBe("x is not a starting sentence");
  expect(refused("::: dual-language 0\nline\n:::")[0].reason).toBe("0 is not a starting line");
  expect(refused("::: note 2\nline\n:::")[0].reason).toBe("note takes nothing after it");
  expect(refused("::: margin-note 2\nline\n:::")[0].reason).toBe("margin-note takes nothing after it");
  expect(refused("::: card\nline\n:::")[0].reason).toBe("card blocks must include a colour, like card-light-green");
  expect(refused("::: grid three\nline\n:::")[0].reason).toBe("three is not a count");
  expect(refused("::: grid 0\nline\n:::")[0].reason).toBe("0 is not a count");
  expect(refused("::: stanza\nline\n:::")[0].reason).toBe("stanza needs its number, like ::: stanza 2");
  expect(refused("::: stanza two\nline\n:::")[0].reason).toBe("two is not a stanza number");
  expect(refused("::: stanza 0\nline\n:::")[0].reason).toBe("0 is not a stanza number");
});
test("a second number is told it is verse's alone, or what is wrong with it", () => {
  expect(refused("::: dual-language 568 244\nline\n:::")[0].reason).toBe("dual-language takes one number; a second, for the right column, is verse's alone");
  expect(refused("::: prose 3 5\nline\n:::")[0].reason).toBe("prose takes one number; a second, for the right column, is verse's alone");
  expect(refused("::: verse 179 0\nline\n:::")[0].reason).toBe("0 is not a starting line for the right column");
  expect(refused("::: verse 0 244\nline\n:::")[0].reason).toBe("0 is not a starting line");
  expect(refused("::: verse 1 2 3\nline\n:::")[0].reason).toBe("verse takes two numbers at most: its first line, and its right column's");
});
test("a real fence, a bare closer, a code block's line and a row are none of them refusals", () => {
  expect(refused("::: verse\nline\n:::")).toEqual([]);
  expect(refused("::: stanza 2\nline\n:::")).toEqual([]);
  expect(refused("::: note\ntext\n:::")).toEqual([]);
  expect(refused("::: margin-note\ntext\n:::")).toEqual([]);
  expect(refused("```\n::: nope\n```")).toEqual([]);
  expect(refused("plain\n\n:::")).toEqual([]);
});
test("the pin's text: one line with its tail, several one per line with the count", () => {
  expect(refusalsText(refused("::: versey\nx\n:::"))).toBe("::: versey — not a block Gesta knows, so it stayed a paragraph");
  const two = refused("::: versey\nx\n:::\n\n::: card\ny\n:::");
  expect(refusalsText(two)).toBe("::: versey — not a block Gesta knows\n::: card — card blocks must include a colour, like card-light-green\n2 fences stayed paragraphs");
});

test("a misplaced or unsupported `numbered` is named as such", () => {
  const why = (md: string) => fenceRefusals(parseMarkdown(md)).map((r) => r.reason);
  expect(why("::: dual-language numbered\na\n:::")).toEqual(["dual-language takes no numbered: the word is verse's and prose's"]);
  expect(why("::: verse numbered 5\na\n:::")).toEqual(["numbered goes after the number, like ::: verse 5 numbered"]);
  expect(why("::: stanza 2 numbered\na\n:::")).toEqual(["stanza takes no numbered: the word is verse's and prose's"]);
});
