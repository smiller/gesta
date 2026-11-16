import { test, expect } from "vitest";
import { inOrder, type Gap, type Span } from "./spans.ts";
import type { Event } from "./events.ts";

const at = (hm: string): string => "2026-11-16T" + hm;
const add = (hm: string, id: string, parent?: string): Event => ({ at: at(hm), ev: "add", id, list: "A", title: id, ...(parent ? { parent } : {}) });
const ev = (hm: string, e: "start" | "stop" | "done" | "drop", id: string, note?: string): Event => ({ at: at(hm), ev: e, id, ...(note ? { note } : {}) } as Event);
const spansOf = (events: Event[], end?: string): Span[] => inOrder(events, end).rows.filter((r): r is Span => r.kind === "span");
const gapsOf = (events: Event[], end?: string): [number, number][] => inOrder(events, end).rows.filter((r): r is Gap => r.kind === "gap").map((g) => [g.from, g.to]);
const hm = (h: number, m: number): number => h * 60 + m;

test("a span runs from a start to its stop, done, drop or move, ending as it ended, with that event's note; a restart after a stop is a span of its own", () => {
  const events: Event[] = [
    add("09:00", "A1"), add("09:00", "A2"), add("09:00", "A3"),
    ev("09:00", "start", "A1"), ev("09:10", "stop", "A1", "waiting"), ev("09:20", "start", "A1"), ev("09:30", "done", "A1", "built"),
    ev("09:30", "start", "A2"), ev("09:40", "drop", "A2"),
    ev("09:40", "start", "A3"), { at: at("09:45"), ev: "move", id: "A3", to: "B1", list: "B" },
  ];
  expect(spansOf(events).map((s) => [s.id, s.from.at.slice(11), s.to?.at.slice(11), s.ending, s.note])).toEqual([
    ["A1", "09:00", "09:10", "paused", "waiting"],
    ["A1", "09:20", "09:30", "done", "built"],
    ["A2", "09:30", "09:40", "dropped", undefined],
    ["A3", "09:40", "09:45", "moved", undefined],
  ]);
});

test("a start on a span already open is not a second span", () => {
  const events = [add("09:00", "A1"), ev("09:00", "start", "A1"), ev("09:05", "start", "A1"), ev("09:10", "done", "A1")];
  expect(spansOf(events).map((s) => [s.from.at.slice(11), s.to?.at.slice(11)])).toEqual([["09:00", "09:10"]]);
});

test("a span still open runs to the end given, and the day with it; without one, to the day's last event", () => {
  const events = [add("09:00", "A1"), ev("09:00", "start", "A1"), add("09:20", "A2")];
  const [open] = spansOf(events, at("10:00"));
  expect([open.to, open.ending, open.whole]).toEqual([undefined, "in progress", 60]);
  expect(inOrder(events, at("10:00")).to).toBe(hm(10, 0));
  expect(spansOf(events)[0].whole).toBe(20);
});

test("a parent's own time is its span less what its spawned items' spans cover within it; a span inside another that it did not spawn is not taken out", () => {
  const events = [
    add("09:00", "A1"), add("09:00", "P1"), add("09:10", "A1.1", "A1"), add("09:10", "A1.1.1", "A1.1"),
    ev("09:00", "start", "A1"), ev("09:05", "start", "P1"), ev("09:08", "done", "P1"),
    ev("09:10", "start", "A1.1"), ev("09:20", "start", "A1.1.1"), ev("09:30", "done", "A1.1.1"), ev("09:35", "done", "A1.1"), ev("09:40", "done", "A1"),
  ];
  const by = Object.fromEntries(spansOf(events).map((s) => [s.id, s]));
  expect([by.A1.whole, by.A1.own]).toEqual([40, [[hm(9, 0), hm(9, 10)], [hm(9, 35), hm(9, 40)]]]);
  expect([by["A1.1"].whole, by["A1.1"].own]).toEqual([25, [[hm(9, 10), hm(9, 20)], [hm(9, 30), hm(9, 35)]]]);
  expect(by.P1.own).toEqual([[hm(9, 5), hm(9, 8)]]);
});

test("every stretch of a minute or more no span covers is a gap, in its place among the spans, the last running to the day's end; working and the gaps together are the day", () => {
  const events = [
    add("09:00", "A1"), add("09:00", "A2"), add("09:00", "A3"),
    ev("09:00", "start", "A1"), ev("09:10", "done", "A1"), ev("09:11", "start", "A2"), ev("09:30", "done", "A2"),
    ev("09:15", "start", "A3"), ev("09:40", "done", "A3"),
  ];
  const o = inOrder(events, at("10:00"));
  expect(o.rows.map((r) => (r.kind === "gap" ? "gap" : r.id))).toEqual(["A1", "gap", "A2", "A3", "gap"]);
  expect(gapsOf(events, at("10:00"))).toEqual([[hm(9, 10), hm(9, 11)], [hm(9, 40), hm(10, 0)]]);
  expect({ from: o.from, to: o.to, working: o.working, idle: o.idle, inside: o.inside }).toEqual({ from: hm(9, 0), to: hm(10, 0), working: 39, idle: 21, inside: 1 });
});

test("a day with no events has no rows and no time", () => {
  expect(inOrder([])).toEqual({ rows: [], from: 0, to: 0, working: 0, idle: 0, inside: 0 });
});
