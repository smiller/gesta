import { test, expect } from "vitest";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { page, drawn, terminal, frameTimes, slides, PUBLISHED } from "./page.ts";
import { terminalText } from "../../src/editor/terminalCopy.ts";
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
const lists = (html: string): string => html.split('<section class="in-order">')[0];
const rows = (html: string): string[] => [...lists(html).matchAll(/<td class="n">([^<]*)<\/td>/g)].map((m) => m[1]);
const headings = (html: string): string[] => [...lists(html).matchAll(/<h2>([^<—]*)/g)].map((m) => m[1].trim());

test("the process list comes last, after every list of the app's own work", () => {
  const html = page([...day, { at: at("10:10"), ev: "add", id: "P1", list: "P", title: "begin carries its items in" }], { day: "2026-11-15" });
  expect(headings(html)).toEqual(["Architecture queue", "Side list", "Bigger questions", "Process"]);
  expect(rows(html).at(-1)).toBe("P1");
});

test("a section a list, a row an item in its tree's order, each with its number, its label and its three times", () => {
  const html = page(day, { day: "2026-11-15" });
  expect(headings(html)).toEqual(["Architecture queue", "Side list", "Bigger questions"]);
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

const inOrder = (html: string): string => html.split('<section class="in-order">')[1] ?? "";
test("the day page ends with the day in order: a row a span, its start, finish, own time of its whole, number, title and note; a gap a row of its own; the day's from, working and gaps", () => {
  const worked: Event[] = [...day, { at: at("09:22"), ev: "start", id: "A1.1" }, { at: at("09:25"), ev: "done", id: "A1.1", note: "held" }];
  const html = inOrder(page(worked, { day: "2026-11-15" }));
  expect([...html.matchAll(/<td class="n">([^<]*)<\/td>/g)].map((m) => m[1])).toEqual(["A1", "A1.1"]);
  expect(html).toContain('<td class="t">09:20</td><td class="t">09:30</td><td class="t took">7 min<span class="of">of 10 min</span></td>');
  expect(html).toContain('<span class="label">a race</span><span class="note">held</span>');
  expect(html.match(/nothing started or ended<\/td>/g)).toHaveLength(2);
  expect(html).toContain('<td class="t">09:30</td><td class="t">10:00</td><td class="t took">30 min</td>');
  expect(html).toContain("<div>from 09:00 to 10:00</div><div>working for <b>10 min</b></div><div>nothing started or ended for <b>50 min</b></div>");
});

test("a span still open runs to now on the day itself, or to a snapshot's time", () => {
  const open: Event[] = [...day, { at: at("10:05"), ev: "start", id: "S1" }];
  expect(inOrder(page(open, { day: "2026-11-15", now: "11:35" }))).toContain('<td class="t">10:05</td><td class="t">—</td><td class="t took">1 h 30 min</td>');
  expect(inOrder(page(open, { day: "2026-11-15", now: "11:35" }))).toContain("from 09:00 to 11:35 (now)");
  expect(inOrder(page(open, { day: "2026-11-15", at: "09:25" }))).toContain('<td class="t">09:20</td><td class="t">—</td><td class="t took">5 min</td>');
});

test("each frame of the slideshow ends with the day in order as it stood at its time, a span open then running to it; a frame before any span has none", () => {
  const html = slides([...day, { at: at("10:05"), ev: "start", id: "S1" }, { at: at("10:40"), ev: "done", id: "S1" }], { day: "2026-11-15" });
  const frames = html.split('<div class="frame"').slice(1);
  expect(frames.map((f) => /data-at="([^"]*)"/.exec(f)?.[1])).toEqual(["09:00", "09:30", "10:00", "10:30", "10:40"]);
  expect(frames.map((f) => f.split('<section class="in-order">').length - 1)).toEqual([0, 1, 1, 1, 1]);
  expect(frames[3]).toContain('<td class="t">10:05</td><td class="t">—</td><td class="t took">25 min</td>');
  expect(frames[3]).toContain("from 09:00 to 10:30</div>");
  expect(frames[4]).toContain('<td class="t">10:05</td><td class="t">10:40</td><td class="t took">35 min</td>');
});

test("a day is drawn as its page and its slideshow, each named with the artifact it is published to and the files published beside it: its own and the logged day before's, redrawn", () => {
  const out = mkdtempSync(join(tmpdir(), "progress-"));
  const names = ["2026-11-14.jsonl", "2026-11-15.jsonl"];
  const d = drawn("2026-11-15", day, { out, names, read: () => [] });
  expect(d).toEqual([
    { path: join(out, "2026-11-15.html"), url: PUBLISHED.day, beside: [join(out, "2026-11-14.html"), join(out, "2026-11-15.html")] },
    { path: join(out, "2026-11-15-slides.html"), url: PUBLISHED.slides, beside: [join(out, "2026-11-14-slides.html"), join(out, "2026-11-15-slides.html")] },
  ]);
  expect(d.flatMap((x) => x.beside).every((p) => existsSync(p))).toBe(true);
  expect(readFileSync(d[0].path, "utf8")).toContain('<td class="n">A1.1</td>');
  expect(readFileSync(d[1].path, "utf8")).toContain('class="frame"');
  expect(readFileSync(join(out, "2026-11-14.html"), "utf8")).toContain('href="2026-11-15.html"');
  expect(drawn("2026-11-14", [], { out, names: ["2026-11-14.jsonl"], read: () => [] })[0].beside).toEqual([join(out, "2026-11-14.html")]);
});

test("the day page links to the logged day before and the one after, each where there is one, by its file beside it", () => {
  const links = (html: string): string[] => [...html.matchAll(/<a rel="(prev|next)" href="([^"]*)">([^<]*)<\/a>/g)].map((m) => m[1] + " " + m[2] + " " + m[3]);
  expect(links(page(day, { day: "2026-11-15", days: { before: "2026-11-14", after: "2026-11-16" } }))).toEqual([
    "prev 2026-11-14.html ← Previous day, Saturday 14 November", "next 2026-11-16.html Next day, Monday 16 November →"]);
  expect(links(page(day, { day: "2026-11-15", days: { after: "2026-11-16" } }))).toEqual(["next 2026-11-16.html Next day, Monday 16 November →"]);
  expect(page(day, { day: "2026-11-15", days: {} })).not.toContain('<nav class="days"');
  expect(links(slides(day, { day: "2026-11-15", days: { before: "2026-11-14" } }))).toEqual(["prev 2026-11-14-slides.html ← Previous day, Saturday 14 November"]);
});

test("each page is a whole document, as a file published beside another page is served unwrapped", () => {
  for (const html of [page(day, { day: "2026-11-15" }), slides(day, { day: "2026-11-15" })]) {
    expect(html).toMatch(/^<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="[^"]*">\n<title>/);
    expect(html).toMatch(/<\/head>\n<body>\n<main>[^]*<\/body>\n<\/html>\n$/);
  }
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
test("the terminal copy says the page's count lines in the same words, each status on a line of its own, then each list's items in tree order, each a -- line with status, starting mark and label", () => {
  const html = page(day, { day: "2026-11-15" }), text = terminal(day, { day: "2026-11-15" });
  const tallies = /<div class="tallies">(.*?)<\/div><section>/s.exec(html)![1];
  const lines = text.split("\n");
  expect(lines.slice(0, 8)).toEqual(["Sunday, 15 November 2026", "", "Started with 2 (1 architecture queue, 1 side list)", "-- done · spawned open 1", "-- moved 1", "", "Spawned or added since 1 (1 side list)", "-- unstarted 1"]);
  expect(words(lines.slice(2, 8).join(" "))).toEqual(words(tallies));
  expect(lines.slice(9)).toEqual([
    "Architecture queue",
    "-- A1  done · spawned open · starting item  the save's tests",
    "  -- A1.1  unstarted  a race",
    "",
    "Side list",
    "-- S1  moved → bigger questions B1 · starting item  fold <## sections>",
    "",
    "Bigger questions",
    "-- B1  unstarted · starting item  fold <## sections> (moved in from S1)",
  ]);
});
test("a terminal copy at a time is the day as it stood then, and says so", () => {
  const text = terminal(day, { day: "2026-11-15", at: "09:15" });
  expect(text.split("\n")[0]).toBe("Sunday, 15 November 2026, as it stood at 09:15");
  expect(text).toContain("-- A1  unstarted · starting item  the save's tests");
});
/* a terminal shows a copy two spaces in */
test("the terminal copy pasted from a terminal keeps every line of it its own: no list's items run together", () => {
  const text = terminal(day, { day: "2026-11-15" }), shown = text.split("\n").map((l) => (l ? "  " + l : l)).join("\n");
  expect(terminalText(shown).split("\n")).toEqual(text.split("\n"));
});

const halfHours: Event[] = [
  { at: at("09:26"), ev: "begin", next: {} },
  { at: at("09:26"), ev: "carry", id: "S1", list: "S", title: "a side item" },
  { at: at("09:40"), ev: "start", id: "S1" },
  { at: at("10:10"), ev: "add", id: "S1.1", list: "S", parent: "S1", title: "found on the way" },
  { at: at("10:20"), ev: "done", id: "S1", commits: ["abc1234"] },
  { at: at("10:41"), ev: "done", id: "S1.1" },
];
const frames = (html: string): string[] => html.split('<div class="frame"').slice(1);

test("frames at the day's start, every clock half hour after it, and its last event", () => {
  expect(frameTimes(halfHours)).toEqual(["09:26", "09:30", "10:00", "10:30", "10:41"]);
  expect(frameTimes(halfHours.slice(0, 5))).toEqual(["09:26", "09:30", "10:00", "10:20"]);
});

test("each frame marks the rows reported since the frame before as new, and a row whose label changed with its label before", () => {
  const f = frames(slides(halfHours, { day: "2026-11-15" }));
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
  const f = frames(slides(halfHours, { day: "2026-11-15" }));
  expect(f[3]).toContain("Spawned or added since <b>1</b> (+1)");
  expect(f[4]).toMatch(/done <b>1<\/b> \(\+1\)/);
});

test("the slideshow is one page: a strip of the day's counts, a slider, and a pause that resumes", () => {
  const html = slides(halfHours, { day: "2026-11-15" });
  expect(html.match(/<rect class="bar/g)?.length).toBeGreaterThanOrEqual(5);
  expect(html).toContain('<input id="when" type="range" min="0" max="4"');
  expect(html).toContain('id="pause"');
  expect(html).toContain("5000");
});

test("the strip counts a paused item with those under way", () => {
  const paused: Event[] = [...halfHours.slice(0, 3), { at: at("09:50"), ev: "stop", id: "S1" }];
  expect(slides(paused, { day: "2026-11-15" })).toContain("<title>09:50: 0 done, 1 in progress, 0 unstarted</title>");
});
