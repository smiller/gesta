import { test, expect } from "vitest";
import { replay, counts, isOpen, isUnderway, isDone, LISTS, type Event } from "./events.ts";

const DAY = "2026-11-15T";
const at = (hm: string): string => DAY + hm;
const day: Event[] = [
  { at: at("09:26"), ev: "begin", next: { A: 2, S: 8, L: 3, B: 1 } },
  { at: at("09:26"), ev: "carry", id: "A1", list: "A", title: "the save's tests on the real layer" },
  { at: at("09:26"), ev: "carry", id: "S1", list: "S", title: "a directive ignored silently" },
  { at: at("09:26"), ev: "carry", id: "S3", list: "S", title: "⌃⌘G cycling" },
  { at: at("09:29"), ev: "start", id: "A1" },
  { at: at("09:35"), ev: "add", id: "A1.1", list: "A", parent: "A1", title: "found: a retry wrote nothing", approx: true },
  { at: at("09:56"), ev: "done", id: "A1.1", commits: ["d88609d"] },
  { at: at("09:56"), ev: "done", id: "A1", commits: ["d88609d"] },
  { at: at("09:56"), ev: "add", id: "A1.2", list: "A", parent: "A1", title: "phase review" },
  { at: at("10:06"), ev: "add", id: "A1.2.1", list: "S", parent: "A1.2", title: "the alerts' owed record" },
  { at: at("11:04"), ev: "move", id: "S3", to: "B1", list: "B" },
  { at: at("11:05"), ev: "start", id: "S1" },
  { at: at("12:14"), ev: "start", id: "A1.2.1" },
  { at: at("12:20"), ev: "stop", id: "A1.2.1", note: "to run later" },
  { at: at("13:00"), ev: "drop", id: "A1.2" },
];
const byId = (hm?: string) => Object.fromEntries(replay(day, hm && at(hm)).map((i) => [i.id, i]));

test("each item's label is worked out from its events", () => {
  const it = byId();
  expect([it.A1.status, it["A1.1"].status, it.S1.status, it.S3.status, it.B1.status, it["A1.2"].status]).toEqual(
    ["done, spawned open", "done", "in progress", "moved", "unstarted", "dropped"]);
  expect(it["A1.2.1"].status).toBe("paused");
  expect(it["A1.2.1"].stopped?.at).toBe(at("12:20"));
  expect(byId("12:15")["A1.2.1"].status).toBe("in progress");
  const resumed: Event[] = [...day, { at: at("13:20"), ev: "start", id: "A1.2.1" }];
  expect(replay(resumed).find((i) => i.id === "A1.2.1")!.status).toBe("in progress");
  expect(it["A1.1"].reported).toEqual({ at: at("09:35"), approx: true });
  expect(it.A1.commits).toEqual(["d88609d"]);
});

test("an item done while something it spawned is neither done nor dropped is done with spawned items open, and done once all are", () => {
  const it = byId("12:00");
  expect(it.A1.status).toBe("done, spawned open");
  expect(it["A1.2"].status).toBe("unstarted");
  const closed: Event[] = [...day, { at: at("13:10"), ev: "done", id: "A1.2.1" }];
  expect(replay(closed).find((i) => i.id === "A1")!.status).toBe("done");
});

test("an item closes when it and everything it spawned have ended, at the last of those ends", () => {
  expect(byId().A1.closed).toBeUndefined();
  const closed = Object.fromEntries(replay([...day, { at: at("13:10"), ev: "done", id: "A1.2.1" }]).map((i) => [i.id, i]));
  expect(closed.A1.closed?.at).toBe(at("13:10"));
  expect(closed["A1.2"].closed?.at).toBe(at("13:10"));
  expect(closed["A1.1"].closed).toBeUndefined();
});

test("a snapshot holds only what was reported by its time, each as it stood then", () => {
  const it = byId("09:40");
  expect(Object.keys(it).sort()).toEqual(["A1", "A1.1", "S1", "S3"]);
  expect([it.A1.status, it["A1.1"].status, it.S3.status]).toEqual(["in progress", "unstarted", "unstarted"]);
});

test("items carried in are the starting items, in the order reported; a moved one shows in both places and counts once", () => {
  const items = replay(day);
  expect(items.map((i) => i.id)).toEqual(["A1", "S1", "S3", "A1.1", "A1.2", "A1.2.1", "B1"]);
  const it = byId();
  expect([it.A1.starting, it.S3.starting, it.B1.starting, it["A1.1"].starting]).toEqual([true, true, true, false]);
  expect([it.S3.movedTo, it.B1.movedFrom, it.B1.title]).toEqual(["B1", "S3", "⌃⌘G cycling"]);
  const c = counts(items);
  expect(c.starting).toEqual({ total: 3, byList: { A: 1, S: 2 }, byStatus: { "done, spawned open": 1, "in progress": 1, moved: 1 } });
  expect(c.added).toEqual({ total: 3, byList: { A: 2, S: 1 }, byStatus: { done: 1, dropped: 1, paused: 1 } });
});

test("events apply in time order whatever order the log holds them in", () => {
  const backdated: Event[] = [...day, { at: at("09:30"), ev: "drop", id: "S1", note: "logged late" }];
  expect(replay(backdated, at("09:45")).find((i) => i.id === "S1")!.status).toBe("dropped");
});

test("a spawned item moved to another list still counts under what spawned it, as the item it became", () => {
  const moved: Event[] = [
    { at: at("09:00"), ev: "begin", next: {} },
    { at: at("09:00"), ev: "carry", id: "A1", list: "A", title: "a" },
    { at: at("09:10"), ev: "add", id: "A1.1", list: "A", parent: "A1", title: "spawned" },
    { at: at("09:20"), ev: "done", id: "A1" },
    { at: at("09:30"), ev: "move", id: "A1.1", to: "S5", list: "S" },
  ];
  const open = Object.fromEntries(replay(moved).map((i) => [i.id, i]));
  expect([open.A1.status, open.A1.closed, open.S5.parent]).toEqual(["done, spawned open", undefined, undefined]);
  const done = Object.fromEntries(replay([...moved, { at: at("10:00"), ev: "done", id: "S5" }]).map((i) => [i.id, i]));
  expect([done.A1.status, done.A1.closed?.at]).toEqual(["done", at("10:00")]);
});

test("a stop or drop given without a note keeps the note the item had", () => {
  const kept: Event[] = [...day, { at: at("13:30"), ev: "drop", id: "A1.2.1" }];
  expect(replay(kept).find((i) => i.id === "A1.2.1")!.note).toBe("to run later");
});

test("which labels are open, which under way, which done, and the lists there are, said once", () => {
  expect(["unstarted", "in progress", "paused", "done", "done, spawned open", "moved", "dropped"].map((s) => [isOpen(s as never), isUnderway(s as never), isDone(s as never)])).toEqual([
    [true, false, false], [true, true, false], [true, true, false], [false, false, true], [false, false, true], [false, false, false], [false, false, false],
  ]);
  expect(LISTS).toEqual(["U", "A", "S", "L", "B", "W", "P"]);
});

test("an item's detail is the one it was added with, or the last detail event's, and is kept through a move", () => {
  const detailed: Event[] = [...day,
    { at: at("13:10"), ev: "add", id: "S8", list: "S", title: "s8", detail: "the fuller description" },
    { at: at("13:20"), ev: "detail", id: "S1", text: "first" },
    { at: at("13:30"), ev: "detail", id: "S1", text: "second" },
    { at: at("13:40"), ev: "move", id: "S1", to: "B2", list: "B" },
  ];
  const it = Object.fromEntries(replay(detailed).map((i) => [i.id, i]));
  expect([it.S8.detail, it.S1.detail, it.B2.detail, it.A1.detail]).toEqual(["the fuller description", "second", "second", undefined]);
  expect(replay(detailed, at("13:25")).find((i) => i.id === "S1")!.detail).toBe("first");
});
test("an item's watch is the last watch event's, carried in with it, kept through a move, and ends when the item starts again", () => {
  const watched: Event[] = [...day,
    { at: at("13:10"), ev: "add", id: "S9", list: "S", title: "s9" },
    { at: at("13:20"), ev: "start", id: "S9" },
    { at: at("13:30"), ev: "stop", id: "S9" },
    { at: at("13:31"), ev: "watch", id: "S9", text: "the bar did not show" },
    { at: at("13:40"), ev: "start", id: "S9" },
  ];
  expect(replay(watched, at("13:35")).find((i) => i.id === "S9")!.watch).toBe("the bar did not show");
  expect(replay(watched).find((i) => i.id === "S9")!.watch).toBeUndefined();
  const moved = replay([...watched.slice(0, -1), { at: at("13:35"), ev: "move", id: "S9", to: "B9", list: "B" }]);
  expect(moved.find((i) => i.id === "B9")!.watch).toBe("the bar did not show");
  const carried = replay([{ at: at("09:00"), ev: "begin", next: {} }, { at: at("09:00"), ev: "carry", id: "S6.1", list: "S", title: "t", watch: "the bar did not show" }]);
  expect(carried[0].watch).toBe("the bar did not show");
});
test("a start given a note takes it as the item's note, as a stop does", () => {
  const started = replay([...day, { at: at("13:10"), ev: "add", id: "S9", list: "S", title: "s9" }, { at: at("13:20"), ev: "start", id: "S9", note: "woken" }]);
  expect(started.find((i) => i.id === "S9")!.note).toBe("woken");
});

test("an item's stretches of work: each start to its stop, done, drop or move, how it ended and its note; one carried in under way from the carry; none carried in paused", () => {
  const events: Event[] = [
    { at: at("08:00"), ev: "begin", next: {} },
    { at: at("08:00"), ev: "carry", id: "U1", list: "U", title: "under way", started: { at: "2026-11-14T22:00", approx: false } },
    { at: at("08:00"), ev: "carry", id: "U2", list: "U", title: "paused", started: { at: "2026-11-14T20:00", approx: false }, stopped: { at: "2026-11-14T21:00", approx: false } },
    { at: at("09:00"), ev: "add", id: "A1", list: "A", title: "a" },
    { at: at("09:00"), ev: "start", id: "A1" }, { at: at("09:10"), ev: "stop", id: "A1", note: "waiting" },
    { at: at("09:20"), ev: "start", id: "A1" }, { at: at("09:30"), ev: "done", id: "A1", note: "built" },
    { at: at("09:40"), ev: "done", id: "U1" },
  ];
  const work = (id: string) => replay(events).find((i) => i.id === id)!.work.map((w) => [w.from.at.slice(11), w.to?.at.slice(11), w.ending, w.note]);
  expect(work("A1")).toEqual([["09:00", "09:10", "paused", "waiting"], ["09:20", "09:30", "done", "built"]]);
  expect(work("U1")).toEqual([["08:00", "09:40", "done", undefined]]);
  expect(work("U2")).toEqual([]);
});
