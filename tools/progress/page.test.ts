import { test, expect } from "vitest";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { page, drawn, terminal, PUBLISHED } from "./page.ts";
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

test("the process list comes last, after every list of the app's own work", () => {
  const html = page([...day, { at: at("10:10"), ev: "add", id: "P1", list: "P", title: "begin carries its items in" }], { day: "2026-11-15" });
  expect([...html.matchAll(/<h2>([^<—]*)/g)].map((m) => m[1].trim())).toEqual(["Architecture queue", "Side list", "Bigger questions", "Process"]);
  expect(rows(html).at(-1)).toBe("P1");
});

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

test("the two count lines: the day's starting items and what was spawned or added since, each by list in parentheses", () => {
  const html = page(day, { day: "2026-11-15" });
  expect(html).toContain("Started with <b>2</b> (1 architecture queue, 1 side list)");
  expect(html).toContain("Spawned or added since <b>1</b> (1 side list)");
});

test("a snapshot is the page as it stood at its time, and says so", () => {
  const html = page(day, { day: "2026-11-15", at: "09:15" });
  expect(rows(html)).toEqual(["A1", "A1.1", "S1"]);
  expect(html).toContain("as it stood at 09:15");
  expect(html).toContain('<span class="chip s-open">unstarted</span>');
});

test("an item with a detail has it in a hidden row of its own beneath it, spanning every column right of the number, the two rows one group; one without has none", () => {
  const told: Event[] = [...day, { at: at("10:10"), ev: "detail", id: "A1", text: "why <this> matters" }];
  const html = page(told, { day: "2026-11-15" });
  const a1 = /<tbody><tr class="[^"]*has-detail"[^>]*aria-expanded="false"[^>]*><td class="n">A1<\/td>.*?<\/tr>(<tr[^>]*>)(.*?)<\/tr><\/tbody>/.exec(html);
  expect(a1?.[1]).toMatch(/^<tr class="detail [^"]*" hidden>$/);
  expect(a1?.[2]).toBe('<td></td><td colspan="6"><div class="detail-text">why &lt;this&gt; matters</div></td>');
  expect(a1?.[1]).not.toContain("has-detail");
  expect(html.match(/class="detail-text"/g)).toHaveLength(1);
  expect(html).toContain('addEventListener("click"');
});

test("a day is drawn as its page and its slideshow, each named with the artifact it is published to", () => {
  const out = mkdtempSync(join(tmpdir(), "progress-"));
  const d = drawn("2026-11-15", day, out);
  expect(d).toEqual([{ path: join(out, "2026-11-15.html"), url: PUBLISHED.day }, { path: join(out, "2026-11-15-slides.html"), url: PUBLISHED.slides }]);
  expect(d.every((x) => existsSync(x.path))).toBe(true);
  expect(readFileSync(d[0].path, "utf8")).toContain('<td class="n">A1.1</td>');
  expect(readFileSync(d[1].path, "utf8")).toContain('class="frame"');
});

test("a paused item's ended time is its stop's; an item in progress has none", () => {
  const cells = (html: string, id: string): string[] => [...new RegExp('<td class="n">' + id.replace(".", "\\.") + "</td>.*?</tr>").exec(html)![0].matchAll(/<td class="t">([^<]*)<\/td>/g)].map((m) => m[1]);
  const started: Event[] = [...day, { at: at("10:20"), ev: "start", id: "A1.1" }];
  expect(cells(page(started, { day: "2026-11-15" }), "A1.1").slice(0, 3)).toEqual(["≈09:10", "10:20", "—"]);
  const paused: Event[] = [...started, { at: at("10:34"), ev: "stop", id: "A1.1", note: "waiting" }];
  expect(cells(page(paused, { day: "2026-11-15" }), "A1.1").slice(0, 3)).toEqual(["≈09:10", "10:20", "10:34"]);
});

test("a detail's parts each start their own line, the header in bold; text before any header stands as it is", () => {
  const told: Event[] = [...day, { at: at("10:10"), ev: "detail", id: "A1", text: "Asked: a <race> found. Why: it blocks. Done when: it holds. Paused (10:34): run 12 times. Reactivates when: it fails again." }];
  const text = /<div class="detail-text">(.*?)<\/div><\/td>/.exec(page(told, { day: "2026-11-15" }))![1];
  expect(text.split("</span>").filter(Boolean)).toEqual([
    '<span class="part"><b>Asked:</b> a &lt;race&gt; found.', '<span class="part"><b>Why:</b> it blocks.', '<span class="part"><b>Done when:</b> it holds.',
    '<span class="part"><b>Paused (10:34):</b> run 12 times.', '<span class="part"><b>Reactivates when:</b> it fails again.',
  ]);
  const plain: Event[] = [...day, { at: at("10:10"), ev: "detail", id: "A1", text: "no headers here, nor a Why without its colon" }];
  expect(/<div class="detail-text">(.*?)<\/div>/.exec(page(plain, { day: "2026-11-15" }))![1]).toBe("no headers here, nor a Why without its colon");
});

const words = (s: string): string[] => s.replace(/<[^>]*>/g, " ").replace(/--|[(),·]/g, " ").split(/\s+/).filter(Boolean);
test("the terminal copy says the page's count lines in the same words, each status on a line of its own, then each list's items in tree order with status, starting mark and label", () => {
  const html = page(day, { day: "2026-11-15" }), text = terminal(day, { day: "2026-11-15" });
  const tallies = /<div class="tallies">(.*?)<\/div><section>/s.exec(html)![1];
  const lines = text.split("\n");
  expect(lines.slice(0, 8)).toEqual(["Sunday, 15 November 2026", "", "Started with 2 (1 architecture queue, 1 side list)", "-- done · spawned open 1", "-- moved 1", "", "Spawned or added since 1 (1 side list)", "-- unstarted 1"]);
  expect(words(lines.slice(2, 8).join(" "))).toEqual(words(tallies));
  expect(lines.slice(9)).toEqual([
    "Architecture queue",
    "  A1  done · spawned open · starting item  the save's tests",
    "    A1.1  unstarted  a race",
    "",
    "Side list",
    "  S1  moved → bigger questions B1 · starting item  fold <## sections>",
    "",
    "Bigger questions",
    "  B1  unstarted · starting item  fold <## sections> (moved in from S1)",
  ]);
});
