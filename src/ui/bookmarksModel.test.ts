import { describe, it, expect } from "vitest";
import { bookmarkLabel, bookmarkLinkLabel, bookmarkRows, bookmarkFoot, typeAlias, resolveAlias, aliasCandidates, typedToward, rowAct } from "./bookmarksModel.ts";
import { journalOf } from "../store/headings.ts";

const cache = { "2026-09-07": "d", "commonplace/Books": "b", "commonplace/Books/Essay": "# The essay", "bookshelf/Milton, John": "# John Milton", "bookshelf/Milton, John/PL": "# Paradise Lost" };
const journal = journalOf(cache);
const row = (key: string, alias = "") => ({ key, alias });

describe("the rows", () => {
  it("labels read live: the shelf position for the row, the entry's own name for a link", () => {
    expect(bookmarkLabel("commonplace/Books/Essay", journal)).toBe("Books › The essay");
    expect(bookmarkLabel("2026-09-07/Ideas", journal)).toBe("2026-09-07 · Ideas");
    expect(bookmarkLinkLabel("commonplace/Books/Essay", journal)).toBe("The essay");
    expect(bookmarkLinkLabel("commonplace/Books", journal)).toBe("Books");
    expect(bookmarkLinkLabel("2026-09-07/Ideas", journal)).toBe("2026-09-07 · Ideas");
    expect(bookmarkLinkLabel("bookshelf/Milton, John", journal)).toBe("Milton, John");
  });
  it("keyed rows first by trigger, then the numbered ones with a cut before the first; the open row marked", () => {
    const list = [row("2026-09-07"), row("commonplace/Books", "pb"), row("commonplace/Books/Essay"), row("bookshelf/Milton, John/PL", "b2")];
    const rows = bookmarkRows(list, "commonplace/Books/Essay", journal);
    expect(rows.map((r) => [r.trigger, r.keyed, r.here, r.cut])).toEqual([["b2", true, false, false], ["pb", true, false, false], ["1", false, false, true], ["2", false, true, false]]);
    expect(bookmarkFoot(list, "commonplace/Books/Essay", journal)).toBeNull();
    expect(bookmarkFoot(list, "2020-01-01", journal)).toEqual({ full: false, name: "2020-01-01" });
    const full = Array.from({ length: 9 }, (_, i) => row("2020-01-0" + (i + 1)));
    expect(bookmarkFoot(full, "2021-01-01", journal)).toEqual({ full: true });
  });
});
describe("the typed key", () => {
  const list = [row("a"), row("b", "f"), row("c", "fb"), row("d", "scr12"), row("e", "purg2"), row("f", "purg19")];
  it("a key nothing else starts with goes on the press; one that could grow waits", () => {
    expect(typeAlias(list, "", "s")).toEqual({ buf: "s" });
    expect(typeAlias(list, "scr1", "2")).toEqual({ buf: "", jump: row("d", "scr12") });
    expect(typeAlias(list, "", "f")).toEqual({ buf: "f" });
    expect(typeAlias(list, "f", "b")).toEqual({ buf: "", jump: row("c", "fb") });
    expect(typeAlias(list, "", "z")).toEqual({ buf: "", say: "no bookmark z" });
    expect(typeAlias(list, "", "a")).toBeNull();
    expect(typeAlias(list, "", "1")).toBeNull();
    expect(typeAlias(list, "purg", "1")).toEqual({ buf: "purg1" });
  });
  it("Enter takes the exact key, the sole candidate, or asks for the rest with the prefix kept", () => {
    expect(resolveAlias(list, "f")).toEqual({ buf: "", jump: row("b", "f") });
    expect(resolveAlias(list, "sc")).toEqual({ buf: "", jump: row("d", "scr12") });
    expect(resolveAlias(list, "purg")).toEqual({ buf: "purg", say: "finish the key" });
    expect(resolveAlias(list, "q")).toEqual({ buf: "", say: "no bookmark q" });
    expect(aliasCandidates(list, "purg").map((b) => b.alias)).toEqual(["purg2", "purg19"]);
  });
});

describe("a row under the keys and the pointer", () => {
  const keyed = { key: "commonplace/Books", trigger: "fb", label: "Books", keyed: true, here: false, cut: false };
  it("a keyed row lights while what is typed so far begins its key", () => {
    expect(typedToward("f", keyed)).toBe(true);
    expect(typedToward("fb", keyed)).toBe(true);
    expect(typedToward("b", keyed)).toBe(false);
    expect(typedToward("", keyed)).toBe(false);
    expect(typedToward("1", { ...keyed, trigger: "1", keyed: false })).toBe(false);
  });
  it("a click is the act of the button it lands in, the row's jump elsewhere, and nothing in the key's field", () => {
    const on = (...classes: string[]) => (sel: string) => classes.some((c) => sel === "." + c);
    expect(rowAct(on("bookmark-del"))).toBe("del");
    expect(rowAct(on("bookmark-setalias"))).toBe("key");
    expect(rowAct(on("bookmark-link"))).toBe("link");
    expect(rowAct(on("bookmark-aliasinput"))).toBeNull();
    expect(rowAct(on())).toBe("jump");
  });
});
