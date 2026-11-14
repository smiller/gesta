import { describe, it, expect } from "vitest";
import { gotoLevels, gotoPick, destinationRows, rowGroups, isPicked, type Level } from "./gotoModel.ts";
import { journalOf } from "../store/headings.ts";

const cache: Record<string, string> = {
  "2026-09-07": "# A titled day", "2026-09-07/Ideas": "i", "2026-08-01": "x", "2025-12-25": "y",
  "commonplace/Books": "[Essay](#commonplace/Books/Essay) then [Two](#commonplace/Books/Two)", "commonplace/Books/Essay": "# The essay", "commonplace/Books/Two": "2",
  "commonplace/Empty": "nothing under it",
  "bookshelf/Virgil": "# Virgil\n\n[Aeneid](#bookshelf/Virgil/Aeneid)",
  "bookshelf/Virgil/Aeneid": "# Aeneid\n\n## Books\n\n[1](#bookshelf/Virgil/Aeneid/1), [2](#bookshelf/Virgil/Aeneid/2)",
  "bookshelf/Virgil/Aeneid/1": "arma", "bookshelf/Virgil/Aeneid/2": "conticuere",
};
const w = { keys: Object.keys(cache), cache, journal: journalOf(cache), today: "2026-09-07" };
const labels = (l: Level) => l.rows.map((r) => r.label);

describe("gotoLevels", () => {
  it("a day: the destination on Journal, then year, month, day preselected, and the tags with the way back", () => {
    const L = gotoLevels(w, "2026-09-07", "Ideas");
    expect(L.map((l) => [l.aria, l.value])).toEqual([["Destination", ""], ["Year", "2026"], ["Month", "09"], ["Day", "07"], ["Tagged entry", "Ideas"]]);
    expect(labels(L[0])).toEqual(["Journal", "Books", "Empty", "Virgil"]);
    expect(L[0].rows[3]).toMatchObject({ ns: "bookshelf", group: "Authors" });
    expect(labels(L[1])).toEqual(["2026", "2025"]);
    expect(labels(L[2])).toEqual(["August", "September"]);
    expect(labels(L[3])).toEqual(["7 — A titled day"]);
    expect(L[4].sentinel).toBe("← the day");
    expect(gotoLevels(w, "2026-08-01", null).length).toBe(4);
  });
  it("a commonplace: one select per level, the open leaf preselected, its parent's order and labels", () => {
    const L = gotoLevels(w, "commonplace", "Books/Essay");
    expect(L[0]).toMatchObject({ value: "Books", valueNs: "commonplace" });
    expect(L[1]).toMatchObject({ aria: "Sub-entry", value: "Essay", sentinel: "← the commonplace", path: "Books" });
    expect(labels(L[1])).toEqual(["The essay", "Two"]);
    expect(L.length).toBe(2);
  });
  it("a sole child that is itself a parent collapses: its books stand in its place under its name, its own row reading Index", () => {
    const L = gotoLevels(w, "bookshelf", "Virgil");
    expect(L[1].rows).toEqual([
      { v: "Aeneid", label: "Index", group: "Aeneid", here: true },
      { v: "Aeneid/1", label: "1", group: "Aeneid" }, { v: "Aeneid/2", label: "2", group: "Aeneid" },
    ]);
    expect(L[1].value).toBe("");
    const deep = gotoLevels(w, "bookshelf", "Virgil/Aeneid/2");
    expect(deep[1].value).toBe("Aeneid/2");
    expect(deep.length).toBe(2);
  });
});
describe("gotoPick", () => {
  it("a day pick jumps; a year pick refills the months placeholder-led; a tag pick carries the tag; the sentinel opens the day", () => {
    const L = gotoLevels(w, "2026-09-07", "Ideas");
    expect(gotoPick(w, { date: "2026-09-07", tag: "Ideas" }, L, { level: 3, value: "07" })).toEqual({ jump: "#2026-09-07" });
    const y = gotoPick(w, { date: "2026-09-07", tag: "Ideas" }, L, { level: 1, value: "2025" }) as { levels: Level[] };
    expect(y.levels.map((l) => [l.aria, l.value])).toEqual([["Destination", ""], ["Year", "2025"], ["Month", null]]);
    expect(labels(y.levels[2])).toEqual(["December"]);
    const m = gotoPick(w, { date: "2026-09-07", tag: "Ideas" }, y.levels, { level: 2, value: "12" }) as { levels: Level[] };
    expect(labels(m.levels[3])).toEqual(["25"]);
    expect(gotoPick(w, { date: "2026-09-07", tag: "Ideas" }, m.levels, { level: 3, value: "25" })).toEqual({ jump: "#2025-12-25" });
    expect(gotoPick(w, { date: "2026-09-07", tag: "Ideas" }, L, { level: 4, value: "Ideas" })).toEqual({ jump: "#2026-09-07/Ideas" });
    expect(gotoPick(w, { date: "2026-09-07", tag: "Ideas" }, L, { level: 4, value: "" })).toEqual({ jump: "#2026-09-07" });
  });
  it("a scope pick: a commonplace with subs lists them placeholder-led, a commonplace with none jumps, Journal opens today's shape from a commonplace", () => {
    const L = gotoLevels(w, "commonplace", "Books/Essay");
    const b = gotoPick(w, { date: "commonplace", tag: "Books/Essay" }, L, { level: 0, value: "Books", ns: "commonplace" }) as { levels: Level[] };
    expect(b.levels[1]).toMatchObject({ aria: "Sub-entry", value: null, path: "Books" });
    expect(gotoPick(w, { date: "commonplace", tag: "Books/Essay" }, L, { level: 0, value: "Empty", ns: "commonplace" })).toEqual({ jump: "#commonplace/Empty" });
    const j = gotoPick(w, { date: "commonplace", tag: "Books/Essay" }, L, { level: 0, value: "", ns: undefined }) as { levels: Level[] };
    expect(j.levels.map((l) => l.aria)).toEqual(["Destination", "Year", "Month", "Day", "Tagged entry"]);
    expect(j.levels[3].value).toBe("07");
  });
  it("in a chain: the sentinel opens the parent, a leaf descends or jumps, the collapsed work's own row opens", () => {
    const L = gotoLevels(w, "commonplace", "Books/Essay");
    expect(gotoPick(w, { date: "commonplace", tag: "Books/Essay" }, L, { level: 1, value: "" })).toEqual({ jump: "#commonplace/Books" });
    expect(gotoPick(w, { date: "commonplace", tag: "Books/Essay" }, L, { level: 1, value: "Two" })).toEqual({ jump: "#commonplace/Books/Two" });
    const V = gotoLevels(w, "bookshelf", "Virgil");
    expect(gotoPick(w, { date: "bookshelf", tag: "Virgil" }, V, { level: 1, value: "Aeneid" })).toEqual({ jump: "#bookshelf/Virgil/Aeneid" });
    expect(gotoPick(w, { date: "bookshelf", tag: "Virgil" }, V, { level: 1, value: "Aeneid/1" })).toEqual({ jump: "#bookshelf/Virgil/Aeneid/1" });
  });
});

describe("the destination on the shelves", () => {
  it("an author's group is its shelf, in the shelves' order; the shelves entry is no destination unless it is open", () => {
    const c = { "bookshelf/Horace": "# Horace", "bookshelf/Milton, John": "# John Milton", "bookshelf/Shelves": "# Shelves\n\n## Latin\n- [Horace](#bookshelf/Horace)\n\n## English\n", "commonplace/Notes": "n" };
    const world = { keys: Object.keys(c), cache: c, journal: journalOf(c), today: "2026-09-07" };
    const rows = destinationRows(world, "2026-09-07", null).map((r) => [r.label, r.group ?? null]);
    expect(rows).toEqual([["Journal", null], ["Notes", "Commonplaces"], ["Horace", "Latin"], ["John Milton", "English"]]);
    expect(destinationRows(world, "bookshelf", "Shelves").map((r) => r.v)).toContain("Shelves");
  });
});
describe("rowGroups", () => {
  it("a select's runs break where the namespace does as well as the label, keyed by where each starts", () => {
    const c = { "commonplace/Notes": "n", "bookshelf/Horace": "# Horace", "bookshelf/Virgil": "# Virgil", "bookshelf/Shelves": "# Shelves\n\n## Commonplaces\n- [Horace](#bookshelf/Horace)\n\n## Latin\n- [Virgil](#bookshelf/Virgil)" };
    const world = { keys: Object.keys(c), cache: c, journal: journalOf(c) };
    expect(rowGroups(destinationRows(world, "2026-09-07", null)).map((g) => [g.group, g.at, g.rows.map((r) => r.v)])).toEqual([
      [null, 0, [""]], ["Commonplaces", 1, ["Notes"]], ["Commonplaces", 2, ["Horace"]], ["Latin", 3, ["Virgil"]],
    ]);
  });
});

describe("the option a level shows picked", () => {
  const level = (value: string | null, valueNs?: string): Level => ({ level: 0, aria: "a", rows: [], value, valueNs, sentinel: null, path: null });
  it("the row whose value is the level's, and in its namespace where the level names one", () => {
    expect(isPicked(level("Books"), { v: "Books", label: "Books" })).toBe(true);
    expect(isPicked(level("Books"), { v: "Essay", label: "Essay" })).toBe(false);
    expect(isPicked(level("Milton", "bookshelf"), { v: "Milton", label: "Milton", ns: "commonplace" })).toBe(false);
    expect(isPicked(level("Milton", "bookshelf"), { v: "Milton", label: "Milton", ns: "bookshelf" })).toBe(true);
  });
  it("nothing picked at a level not yet chosen", () => {
    expect(isPicked(level(null), { v: "", label: "" })).toBe(false);
  });
});
