import { test, expect } from "vitest";
import { TextSelection } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { caretNear } from "./renderedView.ts";

test("caretNear: a position before a stanza gap gives the caret at the next line's start, never the gap selected whole", () => {
  const d = parseMarkdown("::: verse\nOne line\n\nTwo line\n:::\n");
  let gap = -1;
  d.descendants((n, p) => { if (n.type.name === "gap") gap = p; });
  const s = caretNear(d, gap);
  expect(s).toBeInstanceOf(TextSelection);
  expect(d.textBetween(s.from, s.from + 8)).toBe("Two line");
  expect(caretNear(d, 0).from).toBe(2);
  expect(caretNear(d, d.content.size).from).toBe(d.content.size - 2);
});
