import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { shelfIndex, quotedFrom, referenceAt, quotedProse } from "./bookshelfQuotes.ts";

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
test("referenceAt: a passage whose first line is quoted from mid-line, and its last line to mid-line, is quoted and highlighted from that word to that word, its closing mark kept, the line numbers standing; a cut inside a word takes the word", () => {
  const r = referenceAt(index, "bookshelf/Horace/Odes/1.9", 1, 3, { head: 20, tail: 16 }) as { text: string; passage: string; url: string };
  expect(r.text.split("\n")[0]).toMatch(/^\[Horace, \*Odes\*, 1\.9\.1-3\]\(#bookshelf\/Horace\/Odes\/1\.9\?h=alta%20stet/);
  expect(r.url).toMatch(/silvae%20laborantes%2C$/);
  expect(r.passage).toBe("> ::: verse\n> alta stet nive candidum\n> Soracte, nec iam sustineant onus\n> silvae laborantes,\n> :::");
  expect((referenceAt(index, "bookshelf/Horace/Odes/1.9", 1, 3, { head: 20, tail: 13 }) as { passage: string }).passage).toBe(r.passage);
  expect(referenceAt(index, "bookshelf/Horace/Odes/1.9", 1, 3, {})).toEqual(referenceAt(index, "bookshelf/Horace/Odes/1.9", 1, 3));
});
test("quotedFrom: an entry's own lines are not a quotation of itself", () => {
  expect(quotedFrom(index, [{ left: "sunt quos curriculo pulverem Olympicum" }, { left: "collegisse iuvat metaque fervidis" }], "bookshelf/Horace/Odes/1.1")).toBeNull();
});
test("quotedFrom: a passage of single-column verse is quoted as a verse block numbered from its first line", () => {
  const r = quotedFrom(index, [{ left: "Soracte, nec iam sustineant onus" }, { left: "silvae laborantes, geluque" }]);
  expect(r && "passage" in r && r.passage).toBe("> ::: verse 2\n> Soracte, nec iam sustineant onus\n> silvae laborantes, geluque\n> :::");
  expect(r && "text" in r && r.text.split("\n").slice(1).join("\n")).toBe("\n> ::: verse 2\n> Soracte, nec iam sustineant onus\n> silvae laborantes, geluque\n> :::");
});
test("quotedProse: a prose quotation is placed by its first and last lines in an entry under the prefix, speakers' names aside, from the start of the first speech, and is the reference a copy of that stretch makes", () => {
  const dw = shelfIndex({ ...cache, "bookshelf/Doctor Who/First Doctor/1-2 The Daleks": "# The Daleks\n\nTEMMOSUS: Yes, but we’ve changed over the centuries. Why shouldn’t they?\n\nDYONI: But the Daleks were teachers, weren’t they, Temmosus?\n\nTEMMOSUS: Yes, they were. And philosophers.\n" });
  const r = quotedProse(dw, "bookshelf/Doctor Who/", ["> TEMMOSUS: Yes, but we've changed over the centuries.", "> ", "> ELEVENTY: But the Daleks were teachers, weren't they, Temmosus?"]);
  expect(r && "url" in r && r.url).toMatch(/^#bookshelf\/Doctor%20Who\/First%20Doctor\/1-2%20The%20Daleks\?h=TEMMOSUS%3A%20Yes%2C%20but/);
  expect(r && "passage" in r && r.passage).toBe("> TEMMOSUS: Yes, but we’ve changed over the centuries. Why shouldn’t they?\n> \n> DYONI: But the Daleks were teachers, weren’t they, Temmosus?");
  expect(quotedProse(dw, "bookshelf/Horace/", ["> TEMMOSUS: Yes, but we've changed over the centuries."])).toBeNull();
});
test("quotedProse: the entries tried may be named, in the order given", () => {
  const two = { "bookshelf/Doctor Who/Fifth Doctor/20-7 The Five Doctors": "# x\n\nDOCTOR: One day I shall come back. Yes, I shall come back.\n", "bookshelf/Doctor Who/First Doctor/2-2 The Dalek Invasion of Earth": "# y\n\nDOCTOR: One day I shall come back. Yes, I shall come back.\n" };
  const ix = shelfIndex({ ...cache, ...two });
  const r = quotedProse(ix, "bookshelf/Doctor Who", ["> One day I shall come back."], ["bookshelf/Doctor Who/First Doctor/2-2 The Dalek Invasion of Earth", "bookshelf/Doctor Who/Fifth Doctor/20-7 The Five Doctors"]);
  expect(r && r.key).toBe("bookshelf/Doctor Who/First Doctor/2-2 The Dalek Invasion of Earth");
});
test("quotedProse: a quotation opening mid-speech starts where its words do", () => {
  const ix = shelfIndex({ ...cache, "bookshelf/Doctor Who/First Doctor/2-2 The Dalek Invasion of Earth": "# y\n\nDOCTOR: Believe me, my dear. One day I shall come back. Until then, there must be no regrets, no tears, no anxieties.\n" });
  const r = quotedProse(ix, "bookshelf/Doctor Who", ["> there must be no regrets, no tears, no anxieties."]);
  expect(r && r.passage).toBe("> there must be no regrets, no tears, no anxieties.");
});
test("quotedProse: a quotation differing from the entry within a line is placed by its first line's opening and its last line's close", () => {
  const ix = shelfIndex({ ...cache, "bookshelf/Lewis, C. S/The Four Loves/Eros": "# Eros\n\nCan we be in this selfless liberation for a lifetime?  Hardly for a week.  Between the best possible lovers this high condition is intermittent.\n\nBut these lapses will not destroy a marriage between two decent people, seen from one particular angle.\n" });
  const r = quotedProse(ix, "bookshelf/Lewis, C. S/The Four Loves/Eros", ["> Can we be in this selfless liberation for a lifetime?  Hardly for a week. Between the best possible lovers the high condition is intermittent.", "", "> But these lapses will not destroy a marriage between two decent people, seen from one particular angle."]);
  expect(r && r.passage).toBe("> Can we be in this selfless liberation for a lifetime?  Hardly for a week.  Between the best possible lovers this high condition is intermittent.\n> \n> But these lapses will not destroy a marriage between two decent people, seen from one particular angle.");
});
test("quotedProse: a passage named by its first and last words may run any length between them", () => {
  const long = "Between them, " + "a long stretch of words. ".repeat(40);
  const ix = shelfIndex({ ...cache, "2016-02-22": "# x\n\nAnd what did they both see in that moment? " + long + "\n\nWhat if she saw him only to dismiss him as none of her concern?\n" });
  expect(quotedProse(ix, "2016-02-22", ["And what did they both see in that moment", "saw him only to dismiss him as none of her concern?"], ["2016-02-22"])).toBeNull();
  const r = quotedProse(ix, "2016-02-22", ["And what did they both see in that moment", "saw him only to dismiss him as none of her concern?"], ["2016-02-22"], true);
  expect(r && r.passage.split("\n").length).toBe(3);
});

test("referenceAt: a passage of a block numbered on both sides is minted with both its columns, the shape the quotation takes", () => {
  const golding = shelfIndex({ "bookshelf/Ovid/Metamorphoses (with Golding’s translation)": "# *Metamorphoses* (with Golding’s translation)", "bookshelf/Ovid/Metamorphoses (with Golding’s translation)/Book 7": "# Book 7\n\n::: verse 197 265\nauraeque et venti | Ye Ayres and windes:\ndique omnes nemorum | Of standing Lakes,\n:::" });
  const r = referenceAt(golding, "bookshelf/Ovid/Metamorphoses (with Golding’s translation)/Book 7", 197, 198);
  expect("passage" in r && r.passage).toBe("> ::: verse 197 265\n> auraeque et venti | Ye Ayres and windes:\n> dique omnes nemorum | Of standing Lakes,\n> :::");
});
