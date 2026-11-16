import { test, expect } from "vitest";
import { frameTimes, slides } from "./page.ts";
import type { Event } from "./events.ts";

const at = (hm: string): string => "2026-11-15T" + hm;
const day: Event[] = [
  { at: at("09:26"), ev: "begin", next: {} },
  { at: at("09:26"), ev: "carry", id: "S1", list: "S", title: "a side item" },
  { at: at("09:40"), ev: "start", id: "S1" },
  { at: at("10:10"), ev: "add", id: "S1.1", list: "S", parent: "S1", title: "found on the way" },
  { at: at("10:20"), ev: "done", id: "S1", commits: ["abc1234"] },
  { at: at("10:41"), ev: "done", id: "S1.1" },
];
const frames = (html: string): string[] => html.split('<div class="frame"').slice(1);

test("frames at the day's start, every clock half hour after it, and its last event", () => {
  expect(frameTimes(day)).toEqual(["09:26", "09:30", "10:00", "10:30", "10:41"]);
  expect(frameTimes(day.slice(0, 5))).toEqual(["09:26", "09:30", "10:00", "10:20"]);
});

test("each frame marks the rows reported since the frame before as new, and a row whose label changed with its label before", () => {
  const f = frames(slides(day, { day: "2026-11-15" }));
  expect(f).toHaveLength(5);
  expect(f[0]).not.toContain("chip s-new");
  expect(f[1]).not.toContain("was ");
  expect(f[2]).toContain("was unstarted");
  expect(f[3]).toMatch(/<td class="n">S1\.1<\/td><td><div class="item"><span class="chip s-new">new<\/span>/);
  expect(f[3]).toContain("was in progress");
  expect(f[4]).toContain("was unstarted");
  expect(f[4]).not.toContain("chip s-new");
});

test("the counts show their change since the frame before", () => {
  const f = frames(slides(day, { day: "2026-11-15" }));
  expect(f[3]).toContain("Spawned or added since <b>1</b> (+1)");
  expect(f[4]).toMatch(/done <b>1<\/b> \(\+1\)/);
});

test("the slideshow is one page: a strip of the day's counts, a slider, and a pause that resumes", () => {
  const html = slides(day, { day: "2026-11-15" });
  expect(html.match(/<rect class="bar/g)?.length).toBeGreaterThanOrEqual(5);
  expect(html).toContain('<input id="when" type="range" min="0" max="4"');
  expect(html).toContain('id="pause"');
  expect(html).toContain("5000");
});

test("the strip counts a paused item with those under way", () => {
  const paused: Event[] = [...day.slice(0, 3), { at: at("09:50"), ev: "stop", id: "S1" }];
  expect(slides(paused, { day: "2026-11-15" })).toContain("<title>09:50: 0 done, 1 in progress, 0 unstarted</title>");
});
