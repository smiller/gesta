import { test, expect } from "vitest";
import { woken, wakeEvents } from "./wake.ts";
import { replay, type Event } from "./events.ts";

const at = (hm: string): string => "2026-11-16T" + hm;
const day: Event[] = [
  { at: at("09:00"), ev: "begin", next: {} },
  { at: at("09:00"), ev: "carry", id: "S6.1", list: "S", title: "carried, watching", watch: "the bar did not show" },
  { at: at("09:10"), ev: "add", id: "S7", list: "S", title: "paused, watching" },
  { at: at("09:11"), ev: "start", id: "S7" },
  { at: at("09:12"), ev: "stop", id: "S7" },
  { at: at("09:13"), ev: "watch", id: "S7", text: "card copy raced" },
  { at: at("09:20"), ev: "add", id: "S8", list: "S", title: "in progress, watching" },
  { at: at("09:21"), ev: "watch", id: "S8", text: "the bar did not show" },
  { at: at("09:22"), ev: "start", id: "S8" },
  { at: at("09:23"), ev: "watch", id: "S8", text: "the bar did not show" },
];
const RUN = "== bookmarks\nfb over a selection: FAILED the bar did not show: {\"selected\":0}\n== keys\nok";

test("a run wakes each open item not under way whose watch its output holds, with the line that holds it", () => {
  expect(woken(replay(day), RUN)).toEqual([{ id: "S6.1", line: "fb over a selection: FAILED the bar did not show: {\"selected\":0}" }]);
  expect(woken(replay(day), RUN + "\ncard copy raced at 3")).toEqual([
    { id: "S6.1", line: "fb over a selection: FAILED the bar did not show: {\"selected\":0}" }, { id: "S7", line: "card copy raced at 3" }]);
  expect(woken(replay(day), "== keys\nok")).toEqual([]);
});
test("a woken item's line is cut to 300 characters", () => {
  expect(woken(replay(day), "the bar did not show " + "x".repeat(400))[0].line.length).toBe(300);
});
test("on a day not begun, a run wakes what the begin would carry in, and the begin is written ahead of its start; nothing woken, nothing written", () => {
  const written = wakeEvents([], day, RUN, "2026-11-17T08:00");
  expect(written.map((e) => e.ev + ("id" in e ? " " + e.id : ""))).toEqual(["begin", "carry S6.1", "carry S7", "carry S8", "start S6.1", "start S8"]);
  expect(wakeEvents([], day, "== keys\nok", "2026-11-17T08:00")).toEqual([]);
  expect(wakeEvents(day, [], RUN, "2026-11-16T10:00").map((e) => e.ev)).toEqual(["start"]);
});
