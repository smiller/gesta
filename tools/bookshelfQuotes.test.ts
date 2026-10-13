import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { shelfIndex, quotedFrom, referenceAt } from "./bookshelfQuotes.ts";

const cache: Record<string, string> = {
  "bookshelf/Horace": "# Horace\n\n- [Odes](#bookshelf/Horace/Odes)\n",
  "bookshelf/Horace/Odes": "# Odes\n\n- [1.1 Maecenas atavis edite regibus](#bookshelf/Horace/Odes/1.1)\n- [1.9 Vides ut alta stet nive candidum](#bookshelf/Horace/Odes/1.9)\n",
  "bookshelf/Horace/Odes/1.9": "# Odes, 1.9\n\n::: verse\nVides ut alta stet nive candidum\nSoracte, nec iam sustineant onus\nsilvae laborantes, geluque\nflumina constiterint acuto.\n:::\n",
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
test("quotedFrom: lines the bookshelf does not hold are no reference; the same lines in another translation are still the bookshelf's passage", () => {
  expect(quotedFrom(index, [{ left: "Mes vers fuiraient, doux et frêles,", right: "My verses would flee" }, { left: "Vers votre jardin si beau,", right: "To your garden" }])).toBeNull();
  const other = quotedFrom(index, [
    { left: "sunt quos curriculo pulverem Olympicum", right: "Some delight in the Olympic dust" },
    { left: "collegisse iuvat metaque fervidis", right: "gathered on their chariots" },
  ]);
  expect(other && "url" in other && other.url).toMatch(/^#bookshelf\/Horace\/Odes\/1\.1\?h=sunt/);
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
test("referenceAt: a passage named by its entry and lines is the reference a copy of those lines makes, the same quotedFrom finds", () => {
  const found = quotedFrom(index, [{ left: "sunt quos curriculo pulverem Olympicum" }, { left: "collegisse iuvat metaque fervidis" }]);
  expect(referenceAt(index, "bookshelf/Horace/Odes/1.1", 3, 4)).toEqual(found);
  expect(referenceAt(index, "bookshelf/Horace/Odes/1.1", 3, 99)).toEqual({ why: "bookshelf/Horace/Odes/1.1 has no lines 3-99" });
});
test("quotedFrom: an entry's own lines are not a quotation of itself", () => {
  expect(quotedFrom(index, [{ left: "sunt quos curriculo pulverem Olympicum" }, { left: "collegisse iuvat metaque fervidis" }], "bookshelf/Horace/Odes/1.1")).toBeNull();
});
test("quotedFrom: a passage of single-column verse is quoted as a verse block numbered from its first line", () => {
  const r = quotedFrom(index, [{ left: "Soracte, nec iam sustineant onus" }, { left: "silvae laborantes, geluque" }]);
  expect(r && "passage" in r && r.passage).toBe("> ::: verse 2\n> Soracte, nec iam sustineant onus\n> silvae laborantes, geluque\n> :::");
  expect(r && "text" in r && r.text.split("\n").slice(1).join("\n")).toBe("\n> ::: verse 2\n> Soracte, nec iam sustineant onus\n> silvae laborantes, geluque\n> :::");
});
