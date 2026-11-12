import { test, expect } from "vitest";
import { NUMERAL, runningHead, unspecked, witnessGaps, placeLines, indents, paragraphs, elided, smallCaps, roman, poemPage } from "./miltonPoems.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";
import { lineUnits } from "../src/editor/numbering.ts";

test("furniture between the lines: a stanza's numeral as the OCR reads it, the Hymn's heading, a running head with a speck", () => {
  for (const l of ["III", "Ill", "XXVII", "i", "THe Hymn", "The Hymn."]) expect(NUMERAL.test(l), l).toBe(true);
  expect(NUMERAL.test("It was the winter wild,")).toBe(false);
  expect(runningHead("POEMS WRITTEN AT SCHOOL AND AT COLLEGE Ig")).toBe(true);
  expect(runningHead("For his, &c.")).toBe(false);
  expect(unspecked("Smote with his thunder-clasping hand1,")).toBe("Smote with his thunder-clasping hand,");
});

test("a witness's lines with the stanza gaps before them, its numerals and its notes passed over", () => {
  const lines = ["", "  I", "", "First of one,", "second of one.", "", "Note: 2 one] won 1673.", "a note's second line", "", "  II", "", "First of two,", "second of two.", "After."];
  const verse = (l: string) => !NUMERAL.test(l.trim());
  expect(witnessGaps(lines, "First of one,", 4, verse)).toEqual({ lines: ["First of one,", "second of one.", "First of two,", "second of two."], gaps: [false, false, true, false] });
});

const at = (page: number, x: number, text: string) => ({ page, box: [x, 0, 0, 0] as [number, number, number, number], text });
test("each line placed on its OCR line by its opening: a run-over passed by, two lines the OCR read as one standing on the same", () => {
  const h = [at(40, 424, "Find out some uncouth cell,"), at(40, 471, "Where brooding Darkness spreads his jealous"), at(40, 516, "wings,"), at(40, 425, "And the night-raven sings; There under ebon shades"), at(40, 430, "As ragged as thy locks,")];
  const placed = placeLines(h, ["Find out some uncouth cell,", "Where brooding Darkness spreads his jealous wings,", "And the night-raven sings;", "There under ebon shades, and low-browed rocks,", "As ragged as thy locks,"]);
  expect(placed.map((l) => l.box[0])).toEqual([424, 471, 425, 425, 430]);
  expect(indents(placed)).toEqual([-1, 46, 0, 0, 5]);
});

test("a verse paragraph starts where a line stands in among flush ones; a measure's alternate indent is not one", () => {
  /* L'Allegro: lines 2, 4, 6 alternate; "Haste thee, Nymph" stands in alone */
  expect(paragraphs([0, 45, 0, 45, 0, 45, 0, 0, 0, 46, 0, 0]).flatMap((p, i) => (p ? [i] : []))).toEqual([9]);
  expect(paragraphs([0, 0, 90, 0, 0])).toEqual([false, false, false, false, false]);
});

test("an apostrophe at a word's head is an elision unless the line closes it as a quotation", () => {
  expect(elided("Which, ‘mongst the wanton gods, a foul reproach")).toBe("Which, ’mongst the wanton gods, a foul reproach");
  expect(elided("“Hobson has supped, and ‘s newly gone to bed.”")).toBe("“Hobson has supped, and ’s newly gone to bed.”");
  expect(elided("He said ‘come’ and went")).toBe("He said ‘come’ and went");
});

test("the first words in small capitals given an ordinary word's case", () => {
  expect(smallCaps("FAIREST Flower, no sooner blown")).toBe("Fairest Flower, no sooner blown");
  expect(smallCaps("O FAIREST flower, no sooner blown")).toBe("O fairest flower, no sooner blown");
  expect(smallCaps("This is the month")).toBe("This is the month");
});

test("the page: notes, the stanza numerals and headings as italic rows that take no number, the lines counted straight through", () => {
  expect([1, 4, 9, 14, 27].map(roman)).toEqual(["I", "IV", "IX", "XIV", "XXVII"]);
  const md = poemPage({
    heading: "Ode", notes: ["Text: here."], lines: ["a1", "a2", "b1", "b2", "c1", "c2"], opens: [false, false, true, false, true, false],
    rows: [{ before: 5, text: "The Hymn" }], after: "The rest was prose.", numerals: true,
  });
  expect(md).toBe("# Ode\n\n::: note\nText: here.\n:::\n\n::: verse\n*I*\na1\na2\n\n*II*\nb1\nb2\n\n*The Hymn*\n\n*I*\nc1\nc2\n\n*The rest was prose.*\n:::");
  const doc = parseMarkdown(md);
  expect(serializeMarkdown(doc)).toBe(md);
  expect(lineUnits(doc, 0).filter((u) => u.line).map((u) => `${u.line}:${u.node.textContent}`)).toEqual(["1:a1", "2:a2", "3:b1", "4:b2", "5:c1", "6:c2"]);
});
