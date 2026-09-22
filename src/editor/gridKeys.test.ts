// The gestures at a grid's edges (2026-09-22): the one way out, the two
// refusals, and the base keymap's own behaviour inside a grid pinned as
// it was found under node — the shape the plan's "keys, measured not
// built" asked for. A key's reach in Helium is the hand's reading.
import { test, expect } from "vitest";
import { EditorState, TextSelection, type Command } from "prosemirror-state";
import { baseKeymap, splitBlock } from "prosemirror-commands";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { enterOutOfGrid, atCardEdge, GRID_JOIN } from "./gridKeys.ts";

/* the caret BEFORE the needle, or after it when `after` */
function caret(md: string, needle: string, after = false): EditorState {
  const doc = parseMarkdown(md);
  let pos = -1;
  doc.descendants((node, p) => { if (pos < 0 && node.isText && node.text!.indexOf(needle) >= 0) pos = p + node.text!.indexOf(needle) + (after ? needle.length : 0); return pos < 0; });
  if (pos < 0) throw new Error(needle);
  return EditorState.create({ doc, selection: TextSelection.create(doc, pos) });
}
const run = (cmd: Command, s: EditorState): EditorState => { let n = s; if (!cmd(s, (tr) => { n = s.apply(tr); })) throw new Error("refused"); return n; };
const md = (s: EditorState): string => serializeMarkdown(s.doc);
const TWO = "::: grid 2\n::: card-red\nalpha\n:::\n\n::: card-pink\nbeta\n:::\n:::";

test("Enter twice at the end of the last card lands in a paragraph after the grid; the card keeps its text", () => {
  const split = run(splitBlock, caret(TWO, "beta", true));      /* the base keymap's Enter: an empty paragraph in the card */
  expect(split.doc.child(0).child(1).childCount).toBe(2);
  const out = run(enterOutOfGrid, split);
  expect(out.doc.childCount).toBe(2);
  expect(out.doc.child(1).type.name).toBe("paragraph");
  expect(out.doc.child(1).childCount).toBe(0);
  expect(out.selection.$from.parent).toBe(out.doc.child(1));
  expect(out.doc.child(0).child(1).childCount).toBe(1);
  expect(md(out)).toBe(TWO);
});
test("the way out is the LAST card's: in a middle card the command declines, and the base keymap adds a line instead of lifting", () => {
  const split = run(splitBlock, caret(TWO, "alpha", true));
  expect(enterOutOfGrid(split)).toBe(false);
  expect(baseKeymap.Enter(split, undefined)).toBe(true);
  const again = run(baseKeymap.Enter, split);
  expect(again.doc.childCount).toBe(1);                          /* the grid is isolating: nothing lifted out of it */
  expect(again.doc.child(0).child(0).childCount).toBe(3);
});
test("a card whose only line is empty keeps that line when Enter steps out", () => {
  const s = caret("::: grid\n::: card-red\nx\n:::\n:::", "x");
  const emptied = s.apply(s.tr.delete(s.selection.from, s.selection.from + 1));
  const out = run(enterOutOfGrid, emptied);
  expect(out.doc.child(0).child(0).childCount).toBe(1);
  expect(out.doc.childCount).toBe(2);
});
test("Backspace at a card's start and Delete at its end inside a grid are the refused edges; elsewhere they are not this command's", () => {
  expect(atCardEdge(caret(TWO, "beta"), true)).toBe(true);
  expect(atCardEdge(caret(TWO, "alpha"), true)).toBe(true);
  expect(atCardEdge(caret(TWO, "alpha", true), false)).toBe(true);
  expect(atCardEdge(caret(TWO, "beta", true), false)).toBe(true);
  expect(atCardEdge(caret(TWO, "eta"), true)).toBe(false);
  expect(atCardEdge(caret(TWO, "alpha", true), true)).toBe(false);
  expect(atCardEdge(caret("::: card-red\nalpha\n:::", "alpha"), true)).toBe(false);
  expect(GRID_JOIN).toBe("a grid's cards are joined in the source view (⌃⌘M)");
});
test("pinned as found: Enter on an empty paragraph MID-card splits the card in two of the same colour, inside the grid", () => {
  const s = caret("::: grid\n::: card-red\nalpha\n\nbeta\n:::\n:::", "alpha", true);
  const split = run(splitBlock, s);
  const lifted = run(baseKeymap.Enter, split);
  expect(md(lifted)).toBe("::: grid\n::: card-red\nalpha\n:::\n\n::: card-red\nbeta\n:::\n:::");
});
