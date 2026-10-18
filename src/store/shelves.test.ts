import { test, expect } from "vitest";
import { parseShelves, shelved, SHELVES } from "./shelves.ts";

const PAGE = `# Shelves

Which shelf each author sits on.

## Latin
- [Horace](#bookshelf/Horace)
- [Boethius](#bookshelf/Boethius/Consolatio)

## Old English
- [Beowulf](#bookshelf/Beowulf)

## French
- [Edmond Rostand](#bookshelf/Rostand%2C%20Edmond)

## English
`;

test("the shelves page: its ## headings in order, each with the authors its links name", () => {
  expect(parseShelves(PAGE)).toEqual([
    { name: "Latin", roots: ["Horace", "Boethius"] },
    { name: "Old English", roots: ["Beowulf"] },
    { name: "French", roots: ["Rostand, Edmond"] },
    { name: "English", roots: [] },
  ]);
  expect(parseShelves("")).toEqual([]);
  expect(parseShelves("# Shelves\n\n- [Horace](#bookshelf/Horace)")).toEqual([]);
});

test("each author on its shelf in the shelves' order, keeping the list's own order within one; the shelf that lists no one takes everyone else", () => {
  const roots = ["Austen, Jane", "Beowulf", "Boethius", "Horace", "Milton, John", "Rostand, Edmond", SHELVES];
  expect(shelved(roots, parseShelves(PAGE))).toEqual([
    { shelf: "Latin", roots: ["Boethius", "Horace"] },
    { shelf: "Old English", roots: ["Beowulf"] },
    { shelf: "French", roots: ["Rostand, Edmond"] },
    { shelf: "English", roots: ["Austen, Jane", "Milton, John"] },
  ]);
});

test("no shelves page: one unnamed group, the shelves entry never among the authors; a shelf left empty is not shown; with no shelf for the rest they come last, unnamed", () => {
  expect(shelved(["Horace", SHELVES, "Milton, John"], [])).toEqual([{ shelf: null, roots: ["Horace", "Milton, John"] }]);
  const shelves = [{ name: "Latin", roots: ["Virgil"] }, { name: "French", roots: ["Rostand, Edmond"] }];
  expect(shelved(["Horace", "Rostand, Edmond"], shelves)).toEqual([{ shelf: "French", roots: ["Rostand, Edmond"] }, { shelf: null, roots: ["Horace"] }]);
  // an author listed twice sits on the first shelf that lists it
  expect(shelved(["Horace"], [{ name: "Latin", roots: ["Horace"] }, { name: "Odes", roots: ["Horace"] }])).toEqual([{ shelf: "Latin", roots: ["Horace"] }]);
});
