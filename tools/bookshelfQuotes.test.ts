import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { shelfIndex, quotedFrom } from "./bookshelfQuotes.ts";

const cache: Record<string, string> = {
  "bookshelf/Horace": "# Horace\n\n- [Odes](#bookshelf/Horace/Odes)\n",
  "bookshelf/Horace/Odes": "# Odes\n\n- [1.1 Maecenas atavis edite regibus](#bookshelf/Horace/Odes/1.1)\n",
  "bookshelf/Horace/Odes/1.1": readFileSync(new URL("../fixtures/horace-odes-1.1.md", import.meta.url), "utf8"),
};
const index = shelfIndex(cache);

test("quotedFrom: lines quoting a passage of the bookshelf, their marks and spacing aside, are the reference a copy of that passage makes", () => {
  const r = quotedFrom(index, [
    { left: "sunt quos curriculo pulverem Olympicum", right: "There are who joy them in the Olympic strife" },
    { left: "collegisse iuvat, metaque fervidis", right: "And love the dust they gather in the course;" },
  ]);
  expect(r && "text" in r).toBe(true);
  const text = (r as { text: string }).text;
  expect(text.split("\n")[0]).toMatch(/^\[Horace, \*Odes\*, 1\.1\.3-4\]\(#bookshelf\/Horace\/Odes\/1\.1\?h=sunt%20quos/);
  expect(text.split("\n").slice(1)).toEqual(["", "> ::: verse 3", "> sunt quos curriculo pulverem Olympicum | There are who joy them in the Olympic strife", "> collegisse iuvat metaque fervidis | And love the dust they gather in the course;", "> :::"]);
});
test("quotedFrom: lines the bookshelf does not hold are no reference; the same lines with another translation are named, not referred", () => {
  expect(quotedFrom(index, [{ left: "Mes vers fuiraient, doux et frêles,", right: "My verses would flee" }, { left: "Vers votre jardin si beau,", right: "To your garden" }])).toBeNull();
  const other = quotedFrom(index, [
    { left: "sunt quos curriculo pulverem Olympicum", right: "Some delight in the Olympic dust" },
    { left: "collegisse iuvat metaque fervidis", right: "gathered on their chariots" },
  ]);
  expect(other).toEqual({ why: "the bookshelf's Horace/Odes/1.1 has another translation" });
});
test("quotedFrom: a line differing from the bookshelf's in a word still places the passage, and a note's mark in the bookshelf's line is not a letter", () => {
  const r = quotedFrom(index, [
    { left: "O sunt quos curriculo pulverem Olympicum", right: "There are who joy them in the Olympic strife" },
    { left: "collegisse iuvat metaque fervidis", right: "And love the dust they gather in the course;" },
    { left: "evitata rotis palmaque nobilis", right: "The goal by hot wheels shunned, the famous prize," },
    { left: "terrarum dominos evehit ad deos;", right: "Exalt them to the gods that rule mankind;" },
    { left: "hunc, si mobilium turba Quiritium", right: "This joys, if rabbles fickle as the wind" },
  ]);
  expect(r && "url" in r && r.url).toMatch(/^#bookshelf\/Horace\/Odes\/1\.1\?h=sunt/);
  const noted = shelfIndex({ ...cache, "bookshelf/Horace/Odes/1.1": cache["bookshelf/Horace/Odes/1.1"].replace("metaque fervidis |", "metaque ² fervidis |") });
  expect(quotedFrom(noted, [{ left: "collegisse iuvat metaque fervidis" }, { left: "evitata rotis palmaque nobilis" }])).not.toBeNull();
});
test("quotedFrom: a passage of three lines or more may differ from the bookshelf in one; one of two lines may not", () => {
  const four = ["Oh sunt quos curriculo pulverem Olympicum", "collegisse iuvat metaque fervidis", "evitata rotis palmaque nobilis", "terrarum dominos evehit ad deos;"].map((left) => ({ left }));
  expect(quotedFrom(index, four)).not.toBeNull();
  expect(quotedFrom(index, [{ left: "Oh sunt quos curriculo pulverem Olympicum" }, { left: "collegisse iuvat metaque fervidis" }])).toBeNull();
});
