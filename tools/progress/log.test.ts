import { test, expect } from "vitest";
import { nextId, beginning } from "./log.ts";
import type { Event } from "./events.ts";

const at = (hm: string): string => "2026-11-15T" + hm;
const day: Event[] = [
  { at: at("09:00"), ev: "begin", next: { A: 2, S: 6 } },
  { at: at("09:00"), ev: "carry", id: "A1", list: "A", title: "a" },
  { at: at("09:00"), ev: "carry", id: "S5", list: "S", title: "s" },
  { at: at("09:10"), ev: "add", id: "A1.1", list: "A", parent: "A1", title: "a.1" },
  { at: at("09:20"), ev: "add", id: "A1.2", list: "S", parent: "A1", title: "a.2" },
  { at: at("09:30"), ev: "done", id: "A1.1" },
  { at: at("09:40"), ev: "add", id: "S6", list: "S", title: "s6" },
  { at: at("09:50"), ev: "move", id: "S5", to: "B1", list: "B" },
];

test("a spawned item takes its parent's number and the next place under it; a list's own item the list's next number", () => {
  expect(nextId(day, "S", "A1")).toBe("A1.3");
  expect(nextId(day, "S", "A1.1")).toBe("A1.1.1");
  expect(nextId(day, "S")).toBe("S7");
  expect(nextId(day, "A")).toBe("A2");
  expect(nextId(day, "B")).toBe("B2");
  expect(nextId(day, "L")).toBe("L1");
});

test("a new day begins with the last day's unstarted and in-progress items carried in, under their parent where it is carried too, and every list's next number kept", () => {
  const next = beginning(day, at("23:00").replace("11-15", "11-16"));
  expect(next[0]).toEqual({ at: "2026-11-16T23:00", ev: "begin", next: { A: 2, S: 7, B: 2 } });
  expect(next.slice(1).map((e) => ("id" in e ? e.id : ""))).toEqual(["A1", "A1.2", "S6", "B1"]);
  expect(next.find((e) => "id" in e && e.id === "A1.2")).toMatchObject({ parent: "A1" });
  expect(next.every((e) => e.ev === "begin" || e.ev === "carry")).toBe(true);
});
