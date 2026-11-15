import { test, expect } from "vitest";
import { page } from "./page.ts";
import type { Event } from "./events.ts";

const at = (hm: string): string => "2026-11-15T" + hm;
const day: Event[] = [
  { at: at("09:00"), ev: "begin", next: {} },
  { at: at("09:00"), ev: "carry", id: "A1", list: "A", title: "the save's tests" },
  { at: at("09:00"), ev: "carry", id: "S1", list: "S", title: "fold <## sections>" },
  { at: at("09:10"), ev: "add", id: "A1.1", list: "S", parent: "A1", title: "a race", approx: true },
  { at: at("09:20"), ev: "start", id: "A1" },
  { at: at("09:30"), ev: "done", id: "A1", commits: ["d88609d"] },
  { at: at("10:00"), ev: "move", id: "S1", to: "B1", list: "B" },
];
const rows = (html: string): string[] => [...html.matchAll(/<td class="n">([^<]*)<\/td>/g)].map((m) => m[1]);

test("a section a list, a row an item in its tree's order, each with its number, its label and its three times", () => {
  const html = page(day, { day: "2026-11-15" });
  expect([...html.matchAll(/<h2>([^<—]*)/g)].map((m) => m[1].trim())).toEqual(["Architecture queue", "Side list", "Bigger questions"]);
  expect(rows(html)).toEqual(["A1", "A1.1", "S1", "B1"]);
  expect(html).toContain('<span class="chip s-part">done · spawned open</span>');
  expect(html).toContain("≈09:10");
  expect(html).toContain('<span class="chip s-moved">moved → bigger questions B1</span>');
  expect(html).toContain("fold &lt;## sections&gt;");
  expect(html.match(/s-start">starting item<\/span><span class="label">/g)).toHaveLength(3);
});

test("the two count lines: the day's starting items and what was spawned or added since, each by list", () => {
  const html = page(day, { day: "2026-11-15" });
  expect(html).toContain("Started with <b>2</b>: 1 architecture queue, 1 side list");
  expect(html).toContain("Spawned or added since <b>1</b>: 1 side list");
});

test("a snapshot is the page as it stood at its time, and says so", () => {
  const html = page(day, { day: "2026-11-15", at: "09:15" });
  expect(rows(html)).toEqual(["A1", "A1.1", "S1"]);
  expect(html).toContain("as it stood at 09:15");
  expect(html).toContain('<span class="chip s-open">unstarted</span>');
});

test("an item with a detail has it hidden beneath its label, inside its own row, opened by a click on the row; one without has none", () => {
  const told: Event[] = [...day, { at: at("10:10"), ev: "detail", id: "A1", text: "why <this> matters" }];
  const html = page(told, { day: "2026-11-15" });
  const a1 = /<tr class="[^"]*has-detail"[^>]*aria-expanded="false"[^>]*><td class="n">A1<\/td>(.*?)<\/tr>/.exec(html);
  expect(a1?.[1]).toMatch(/<span class="label">[^<]*<\/span><\/div><div class="detail-text" hidden>why &lt;this&gt; matters<\/div><\/td>/);
  expect(html.match(/class="detail-text"/g)).toHaveLength(1);
  expect(html).toContain('addEventListener("click"');
});
