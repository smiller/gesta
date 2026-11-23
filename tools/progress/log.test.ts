import { test, expect } from "vitest";
import { nextId, beginning, commandLine, refusal, batchRefusal, built, opened } from "./log.ts";
import { replay, type Event } from "./events.ts";

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

test("a yes-or-no flag takes no word after it", () => {
  const c = commandLine(["add", "S", "--approx", "the", "card-copy", "race", "--at", "10:22"]);
  expect([c.cmd, c.asked.rest, c.asked.base.approx, c.asked.base.at.slice(11)]).toEqual(["add", ["S", "the", "card-copy", "race"], true, "10:22"]);
});

test("an event naming no list, no item the day knows, or a day not begun is refused, nothing written", () => {
  expect(refusal({ at: at("10:00"), ev: "add", id: "s1", list: "s" as "S", title: "t" }, day)).toBe("no list s: U, A, S, L, B or P");
  expect(refusal({ at: at("10:00"), ev: "start", id: "S99" }, day)).toBe("no item S99 on this day");
  expect(refusal({ at: at("10:00"), ev: "add", id: "S1", list: "S", title: "t" }, [])).toBe("the day has not begun: run begin first");
  expect(refusal({ at: at("10:00"), ev: "start", id: "B1" }, day)).toBeNull();
  expect(refusal({ at: at("10:00"), ev: "begin", next: {} }, [])).toBeNull();
});

test("a batch is read against the day as it will stand: a begin lets its own carries through", () => {
  const opened = beginning(day, "2026-11-16T09:00");
  expect(opened.some((e) => e.ev === "carry")).toBe(true);
  expect(batchRefusal(opened, [])).toBeNull();
  expect(batchRefusal(opened.slice(1), [])).toBe("the day has not begun: run begin first");
});

test("a paused item is carried into the next day as an open one", () => {
  const paused: Event[] = [...day, { at: at("10:00"), ev: "start", id: "S6" }, { at: at("10:05"), ev: "stop", id: "S6", note: "waiting" }];
  expect(beginning(paused, "2026-11-16T09:00").some((e) => "id" in e && e.id === "S6")).toBe(true);
});
test("an item in progress or paused is carried in as it stood, its start and stop kept, and shows so on the new day", () => {
  const going: Event[] = [...day, { at: at("10:00"), ev: "start", id: "S6" }];
  const paused: Event[] = [...going, { at: at("10:05"), ev: "stop", id: "S6", note: "waiting" }];
  const carriedIn = (last: Event[]) => replay(beginning(last, "2026-11-16T09:00")).find((i) => i.id === "S6");
  expect(carriedIn(going)).toMatchObject({ status: "in progress", started: { at: at("10:00") } });
  expect(carriedIn(paused)).toMatchObject({ status: "paused", started: { at: at("10:00") }, stopped: { at: at("10:05") } });
  expect(carriedIn(day)).toMatchObject({ status: "unstarted" });
});

test("an item's detail is given with --detail on add, or later by the detail command, and carried into the next day", () => {
  const added = commandLine(["add", "S", "a", "title", "--detail", "the fuller description"]);
  expect([added.asked.rest, added.asked.detail]).toEqual([["S", "a", "title"], "the fuller description"]);
  expect(built(added, day)).toMatchObject({ ev: "add", id: "S7", title: "a title", detail: "the fuller description" });
  expect(built(commandLine(["detail", "S6", "said", "later"]), day)).toMatchObject({ ev: "detail", id: "S6", text: "said later" });
  expect(refusal({ at: at("10:00"), ev: "detail", id: "S99", text: "t" }, day)).toBe("no item S99 on this day");
  const told: Event[] = [...day, { at: at("10:00"), ev: "detail", id: "S6", text: "why" }];
  expect(beginning(told, "2026-11-16T09:00").find((e) => "id" in e && e.id === "S6")).toMatchObject({ detail: "why" });
});
test("a watch is given by the watch command, refused for an item the day does not know, and carried into the next day", () => {
  expect(built(commandLine(["watch", "S6", "the", "bar", "did", "not", "show"]), day)).toMatchObject({ ev: "watch", id: "S6", text: "the bar did not show" });
  expect(refusal({ at: at("10:00"), ev: "watch", id: "S99", text: "t" }, day)).toBe("no item S99 on this day");
  const watching: Event[] = [...day, { at: at("10:00"), ev: "start", id: "S6" }, { at: at("10:05"), ev: "stop", id: "S6" }, { at: at("10:06"), ev: "watch", id: "S6", text: "the bar did not show" }];
  expect(beginning(watching, "2026-11-16T09:00").find((e) => "id" in e && e.id === "S6")).toMatchObject({ watch: "the bar did not show" });
});
test("a day not begun is begun by its first event: the begin and its carries ahead of it, at its time, its number the next the last day kept; a begun day never reads the last", () => {
  const owed = opened([], () => day, "2026-11-16T08:00");
  expect(owed).toEqual(beginning(day, "2026-11-16T08:00"));
  expect(opened(owed, () => { throw new Error("the last day read once this one has begun"); }, "2026-11-16T08:05")).toEqual([]);
  expect(built(commandLine(["add", "S", "new", "--day", "2026-11-16"]), owed)).toMatchObject({ id: "S7" });
  const start: Event = { at: "2026-11-16T08:00", ev: "start", id: "A1" };
  expect(batchRefusal([...owed, start], [])).toBeNull();
});
