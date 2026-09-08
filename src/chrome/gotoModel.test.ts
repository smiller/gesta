import { describe, it, expect } from "vitest";
import { gotoLevels, gotoPick, type Level } from "./gotoModel.ts";
import { journalOf } from "../store/headings.ts";

const cache: Record<string, string> = {
  "2026-09-07": "# A titled day", "2026-09-07/Ideas": "i", "2026-08-01": "x", "2025-12-25": "y",
  "page/Books": "[Essay](#page/Books/Essay) then [Two](#page/Books/Two)", "page/Books/Essay": "# The essay", "page/Books/Two": "2",
  "page/Empty": "nothing under it",
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
  it("a page: one select per level, the open leaf preselected, its parent's order and labels", () => {
    const L = gotoLevels(w, "page", "Books/Essay");
    expect(L[0]).toMatchObject({ value: "Books", valueNs: "page" });
    expect(L[1]).toMatchObject({ aria: "Sub-page", value: "Essay", sentinel: "← the page", path: "Books" });
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
    expect(gotoPick(w, "2026-09-07", "Ideas", L, 3, "07")).toEqual({ jump: "#2026-09-07" });
    const y = gotoPick(w, "2026-09-07", "Ideas", L, 1, "2025") as { levels: Level[] };
    expect(y.levels.map((l) => [l.aria, l.value])).toEqual([["Destination", ""], ["Year", "2025"], ["Month", null]]);
    expect(labels(y.levels[2])).toEqual(["December"]);
    const m = gotoPick(w, "2026-09-07", "Ideas", y.levels, 2, "12") as { levels: Level[] };
    expect(labels(m.levels[3])).toEqual(["25"]);
    expect(gotoPick(w, "2026-09-07", "Ideas", m.levels, 3, "25")).toEqual({ jump: "#2025-12-25" });
    expect(gotoPick(w, "2026-09-07", "Ideas", L, 4, "Ideas")).toEqual({ jump: "#2026-09-07/Ideas" });
    expect(gotoPick(w, "2026-09-07", "Ideas", L, 4, "")).toEqual({ jump: "#2026-09-07" });
  });
  it("a scope pick: a page with subs lists them placeholder-led, a page with none jumps, Journal opens today's shape from a page", () => {
    const L = gotoLevels(w, "page", "Books/Essay");
    const b = gotoPick(w, "page", "Books/Essay", L, 0, "Books", "page") as { levels: Level[] };
    expect(b.levels[1]).toMatchObject({ aria: "Sub-page", value: null, path: "Books" });
    expect(gotoPick(w, "page", "Books/Essay", L, 0, "Empty", "page")).toEqual({ jump: "#page/Empty" });
    const j = gotoPick(w, "page", "Books/Essay", L, 0, "", undefined) as { levels: Level[] };
    expect(j.levels.map((l) => l.aria)).toEqual(["Destination", "Year", "Month", "Day", "Tagged entry"]);
    expect(j.levels[3].value).toBe("07");
  });
  it("in a chain: the sentinel opens the parent, a leaf descends or jumps, the collapsed work's own row opens", () => {
    const L = gotoLevels(w, "page", "Books/Essay");
    expect(gotoPick(w, "page", "Books/Essay", L, 1, "")).toEqual({ jump: "#page/Books" });
    expect(gotoPick(w, "page", "Books/Essay", L, 1, "Two")).toEqual({ jump: "#page/Books/Two" });
    const V = gotoLevels(w, "bookshelf", "Virgil");
    expect(gotoPick(w, "bookshelf", "Virgil", V, 1, "Aeneid")).toEqual({ jump: "#bookshelf/Virgil/Aeneid" });
    expect(gotoPick(w, "bookshelf", "Virgil", V, 1, "Aeneid/1")).toEqual({ jump: "#bookshelf/Virgil/Aeneid/1" });
  });
});
