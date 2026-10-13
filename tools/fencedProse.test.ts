import { test, expect } from "vitest";
import { fenceKind, quoteFencedProse } from "./fencedProse.ts";

test("fenceKind: a fence naming a language is code", () => {
  expect(fenceKind("js", ["He went out into the rain and did not come back."])).toBe("code");
});
test("fenceKind: commands, paths, addresses and code signs are code", () => {
  expect(fenceKind("", ["claude --resume 76816474-267a-444b-89f6-fcf210ac0106"])).toBe("code");
  expect(fenceKind("", ["rails new esquisse3 -T -d postgresql", "cd esquisse3"])).toBe("code");
  expect(fenceKind("", ["~/Downloads/2026-08-29-1717-claude-writer-session"])).toBe("code");
  expect(fenceKind("", ["https://example.org/a/b"])).toBe("code");
  expect(fenceKind("", ["x = 1", "print(x)"])).toBe("code");
  expect(fenceKind("", ["<p>Hello there, reader.</p>"])).toBe("code");
  expect(fenceKind("", ["$ ls -la"])).toBe("code");
  expect(fenceKind("", ["pkzip a:dial.zip -rP c:\\dial\\*.* -&", "pkunzip a:dial.zip -d c:\\"])).toBe("code");
});
test("fenceKind: sentences are prose, indented or not", () => {
  expect(fenceKind("", ["ChatGPT is trained on a large amount of news data from top sources that fuel its AI."])).toBe("prose");
  expect(fenceKind("", ["\tHe had never admitted to himself that Gwendolen might refuse him, but – heaven", "\thelp us all! – we are often unable to act on our certainties."])).toBe("prose");
  expect(fenceKind("", ["JOB OPPORTUNITY: The Library of Congress is accepting applications for a Supervisory Librarian.", "DETAILS: https://usajobs.gov/job/661858400"])).toBe("prose");
});
test("fenceKind: columns set with tabs or runs of spaces, and lines indented apart from each other, keep their layout", () => {
  expect(fenceKind("", ["The Earthly Paradise", "\t\t\t7. The Lascivious - Chastity", "\tLove Excessive\t6. The Gluttonous - Temperance"])).toBe("aligned");
  expect(fenceKind("", ["Name      Born   Died", "Dante     1265   1321", "Petrarch  1304   1374"])).toBe("aligned");
  expect(fenceKind("", ["Whose woods these are I think I know.", "    His house is in the village though;"])).toBe("aligned");
  expect(fenceKind("", ["| Dr. Bruce Edwards | edwards@bgnet.bgsu.edu |", "| --- | --- |", "| English Dept. | 419-372-7541 |"])).toBe("aligned");
});
test("quoteFencedProse: a prose fence becomes a quotation, its lines kept and its indentation dropped; the rest is left alone", () => {
  const md = "Before.\n\n```\n\tHe had never admitted it to himself, not once,\n\tand would not now.\n```\n\n```\ncd esquisse3\n```\n\nAfter.\n";
  const r = quoteFencedProse(md);
  expect(r.md).toBe("Before.\n\n> He had never admitted it to himself, not once,\n> and would not now.\n\n```\ncd esquisse3\n```\n\nAfter.\n");
  expect(r.fences.map((f) => f.kind)).toEqual(["prose", "code"]);
});
test("quoteFencedProse: a blank line inside a prose fence is a blank quote line; a fence inside a quote or a list is left", () => {
  expect(quoteFencedProse("```\nOne paragraph of prose here, and more of it.\n\nAnother paragraph of prose follows here.\n```\n").md)
    .toBe("> One paragraph of prose here, and more of it.\n> \n> Another paragraph of prose follows here.\n");
  const quoted = "> ```\n> He went out into the rain and did not come back.\n> ```\n";
  expect(quoteFencedProse(quoted).md).toBe(quoted);
});
test("quoteFencedProse: a quotation that would change the words keeps the fence", () => {
  const md = "```\nSee [the notes](notes.html) for the rest of what was said there.\n```\n";
  const r = quoteFencedProse(md);
  expect(r.fences.map((f) => f.kind)).toEqual(["unsafe"]);
  expect(r.md).toBe(md);
});
test("quoteFencedProse: a fence named to be left keeps its fence", () => {
  const md = "```\nHe went out into the rain and did not come back.\n```\n\n```\nShe stayed in by the fire and read until morning.\n```\n";
  const r = quoteFencedProse(md, (line) => line === 1);
  expect(r.fences.map((f) => f.kind)).toEqual(["left", "prose"]);
  expect(r.md).toBe("```\nHe went out into the rain and did not come back.\n```\n\n> She stayed in by the fire and read until morning.\n");
});
