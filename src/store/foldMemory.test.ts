import { test, expect } from "vitest";
import { foldMemory, foldKind, parseFoldStore } from "./foldMemory.ts";
import { stored } from "./local.ts";

function memoryOver(raw: string | null, keys: string[] = []) {
  const m = new Map<string, string>(raw === null ? [] : [["folds", raw]]);
  const storage = () => ({ getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } });
  const mem = foldMemory(stored("folds", parseFoldStore, storage), () => keys);
  return { mem, keys, again: () => foldMemory(stored("folds", parseFoldStore, storage), () => keys), raw: () => m.get("folds") ?? null };
}

test("a work's contents folds as contents; any journal day or commonplace by its sections; nothing else folds", () => {
  const keys = ["bookshelf/Spenser, Edmund/The Faerie Queene", "bookshelf/Spenser, Edmund/The Faerie Queene/1.1", "bookshelf/Milton, John/Lycidas", "commonplace/Notes", "commonplace/Notes/Sub"];
  expect(foldKind(keys, "bookshelf", "Spenser, Edmund/The Faerie Queene")).toBe("contents");
  expect(foldKind(keys, "bookshelf", "Milton, John/Lycidas")).toBeNull();
  expect(foldKind(keys, "bookshelf", "Spenser, Edmund")).toBeNull();
  expect(foldKind(keys, "commonplace", "Notes")).toBe("sections");
  expect(foldKind(keys, "commonplace", "Notes/Sub")).toBe("sections");
  expect(foldKind(keys, "2026-09-28", null)).toBe("sections");
  expect(foldKind(keys, "2026-09-28", "gesta-wrangling")).toBe("sections");
});

test("an absent, empty or damaged store reads as empty, every entry starting as its kind starts", () => {
  for (const raw of [null, "", "not json", "[1,2]", '{"x": 3}']) expect(memoryOver(raw).mem.startOf("2026-01-07", null)).toEqual({ kind: "sections", flipped: [] });
});

test("a record from before, open sections or closed ones, is read as the entry's flipped sections, only what is well formed kept", () => {
  const { mem } = memoryOver('{"bookshelf/S/W": {"open": ["Book I", 3, null, "Dedications"], "left": 7}, "2026-01-07": {"closed": ["Walk"]}}', ["bookshelf/S/W", "bookshelf/S/W/1"]);
  expect(mem.startOf("bookshelf", "S/W")).toEqual({ kind: "contents", flipped: ["Book I", "Dedications"] });
  expect(mem.startOf("2026-01-07", null)).toEqual({ kind: "sections", flipped: ["Walk"] });
});

test("what an entry flipped is what it starts with next time, in this window or another reading the same store", () => {
  const { mem, again } = memoryOver(null);
  mem.record("2026-01-07", ["Walk", "Reading"]);
  expect(mem.startOf("2026-01-07", null)).toEqual({ kind: "sections", flipped: ["Walk", "Reading"] });
  expect(again().startOf("2026-01-07", null)).toEqual({ kind: "sections", flipped: ["Walk", "Reading"] });
  expect(again().startOf("2026-01-08", null)).toEqual({ kind: "sections", flipped: [] });
});

test("a work's page starts with no folds before its sub-entries are known, and as contents with its record once they are", () => {
  const { mem, keys } = memoryOver('{"bookshelf/S/W": {"flipped": ["Book I"]}}', ["bookshelf/S/W"]);
  expect(mem.startOf("bookshelf", "S/W")).toEqual({ kind: null, flipped: [] });
  keys.push("bookshelf/S/W/1.1");
  expect(mem.startOf("bookshelf", "S/W")).toEqual({ kind: "contents", flipped: ["Book I"] });
});

test("a moved entry's record goes with it, a dropped one's is forgotten, and the rest stay", () => {
  const { mem, again } = memoryOver('{"bookshelf/C. P. Cavafy/Poems":{"open":["Early"]},"commonplace/A":{"closed":["X"]},"commonplace/B":{"closed":["Y"]}}', ["bookshelf/Cavafy, C. P/Poems", "bookshelf/Cavafy, C. P/Poems/Walls"]);
  mem.move({ "bookshelf/C. P. Cavafy/Poems": "bookshelf/Cavafy, C. P/Poems" });
  mem.drop(["commonplace/A"]);
  const later = again();
  expect(later.startOf("bookshelf", "Cavafy, C. P/Poems")).toEqual({ kind: "contents", flipped: ["Early"] });
  expect(later.startOf("commonplace", "A")).toEqual({ kind: "sections", flipped: [] });
  expect(later.startOf("commonplace", "B")).toEqual({ kind: "sections", flipped: ["Y"] });
});
