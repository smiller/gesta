import { test, expect } from "vitest";
import { parseMarkdown } from "../model/parse.ts";
import { dualWaits, noteColumns, type DualRow } from "./dualLanguage.ts";

const latin = (top: number): DualRow => ({ top, english: null, clears: false });
const pair = (top: number, english: number): DualRow => ({ top, english, clears: false });

test("a sentence shorter than its Latin moves nothing", () => {
  expect(dualWaits([pair(0, 20), latin(28), pair(56, 20), latin(84)], 112)).toEqual({ margins: [0, 0, 0, 0], foot: 0 });
});

test("where the English runs long the Latin waits before the next row with English, and every row below moves with it", () => {
  // the first sentence takes three lines beside one line of Latin: the second sentence's row waits 56px
  expect(dualWaits([pair(0, 84), pair(28, 28), latin(56)], 84)).toEqual({ margins: [0, 56, 0], foot: 0 });
  // two waits add up: the second is measured from where the first left the rows
  expect(dualWaits([pair(0, 56), pair(28, 56), pair(56, 28)], 84).margins).toEqual([0, 28, 28]);
});

test("the last sentence running past the last Latin row leaves room at the block's foot", () => {
  expect(dualWaits([pair(0, 28), latin(28), pair(56, 84)], 84)).toEqual({ margins: [0, 0, 0], foot: 56 });
  expect(dualWaits([pair(0, 112), latin(28)], 56)).toEqual({ margins: [0, 0], foot: 56 });
});

test("a note waits for the English as a sentence's row does", () => {
  const note: DualRow = { top: 56, english: null, clears: true };
  expect(dualWaits([pair(0, 84), latin(28), note], 100)).toEqual({ margins: [0, 0, 28], foot: 0 });
});

test("an overlap under a pixel is the layout's rounding and no wait; a pixel or more rounds up", () => {
  expect(dualWaits([pair(0, 28.4), pair(28, 28)], 56).margins).toEqual([0, 0]);
  expect(dualWaits([pair(0, 29.2), pair(28, 28)], 56).margins).toEqual([0, 2]);
  expect(dualWaits([pair(0, 28.4)], 28).foot).toBe(0);
});

test("a note stands under the column its mark is in", () => {
  const block = parseMarkdown([
    "::: dual-language 352",
    "quam commune mihi genus et patruelis origo, | you whom the ties of common race and family,¹ whom the marriage couch",
    "deinde torus iunxit, nunc ipsa pericula iungunt,",
    "forma potest hominis, sed uti de marmore coeptis² | statues just begun",
    "::: note",
    "[1] *patruelis origo*. See line 390.",
    ":::",
    "::: note",
    "[2] *coeptis* Merkel: *coepta* MSS.",
    ":::",
    "::: note",
    "a note with no number",
    ":::",
    ":::",
  ].join("\n")).firstChild!;
  expect(noteColumns(block)).toEqual(new Map([[3, "english"], [4, "latin"], [5, "latin"]]));
});

test("a mark is a number's superscript digits whole: ¹ is not found in ¹²", () => {
  const block = parseMarkdown("::: dual-language\nline | sentence¹²\n::: note\n[1] one\n:::\n::: note\n[12] twelve\n:::\n:::").firstChild!;
  expect(noteColumns(block)).toEqual(new Map([[1, "latin"], [2, "english"]]));
});
