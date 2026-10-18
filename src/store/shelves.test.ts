import { test, expect } from "vitest";
import { parseShelves, shelved, rootGroups, SHELVES } from "./shelves.ts";

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

test("read as the page renders: a shelf named twice is one shelf; a ## in a code block or a quote is none; a heading's markup is not its name", () => {
  expect(parseShelves("## Latin\n- [Horace](#bookshelf/Horace)\n\n## English\n\n## Latin\n- [Virgil](#bookshelf/Virgil)")).toEqual([
    { name: "Latin", roots: ["Horace", "Virgil"] }, { name: "English", roots: [] },
  ]);
  expect(shelved(["Horace", "Milton, John", "Virgil"], parseShelves("## Latin\n- [Horace](#bookshelf/Horace)\n\n## English\n\n## Latin\n- [Virgil](#bookshelf/Virgil)"))).toEqual([
    { shelf: "Latin", roots: ["Horace", "Virgil"] }, { shelf: "English", roots: ["Milton, John"] },
  ]);
  expect(parseShelves("## Latin\n\n```\n## not\n[Horace](#bookshelf/Horace)\n```\n\n> ## quoted\n")).toEqual([{ name: "Latin", roots: [] }]);
  expect(parseShelves("## Greek *poets*\n- [Cavafy](#bookshelf/Cavafy%2C%20C.%20P)\n\n## C#")).toEqual([{ name: "Greek poets", roots: ["Cavafy, C. P"] }, { name: "C#", roots: [] }]);
  // a link elsewhere than the bookshelf, or not an address, places no one
  expect(parseShelves("## Latin\n- [a page](#page/Horace) [web](https://example.com) [day](#2026-09-07)")).toEqual([{ name: "Latin", roots: [] }]);
});

test("the groups every list draws: the bookshelf's by shelf, the shelves entry only while open; another namespace one group", () => {
  const md = "## Latin\n- [Horace](#bookshelf/Horace)\n\n## English\n";
  expect(rootGroups("bookshelf", ["Horace", "Milton, John", SHELVES], md, null)).toEqual([{ shelf: "Latin", roots: ["Horace"] }, { shelf: "English", roots: ["Milton, John"] }]);
  expect(rootGroups("bookshelf", ["Horace", SHELVES], md, SHELVES)).toEqual([{ shelf: "Latin", roots: ["Horace"] }, { shelf: null, roots: [SHELVES] }]);
  expect(rootGroups("page", ["Notes", SHELVES], md, null)).toEqual([{ shelf: null, roots: ["Notes", SHELVES] }]);
});
