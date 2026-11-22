import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { alertsPage, shown } from "./alertsPage.ts";

test("shown: fixed words as they are; a part that varies is …, runs of them one", () => {
  expect(shown("saved")).toBe("saved");
  expect(shown((p: { n: string }) => "no bookmark " + p.n)).toBe("no bookmark …");
  expect(shown((p: { n: number }) => p.n + " " + p.n + " entries")).toBe("… entries");
});

test("the page has a table per kind, its rows each alert of that kind, and the phrases after", () => {
  const page = alertsPage();
  expect(page.indexOf("## Error")).toBeLessThan(page.indexOf("## Warning"));
  expect(page.indexOf("## Info")).toBeLessThan(page.indexOf("## Success"));
  expect(page).toContain("| `not saved` | A save of an entry did not reach storage.");
  expect(page).toContain("| `no bookmark …` |");
  expect(page).toContain("## Phrases");
});

test("docs/alerts.md is the page the table writes: `node tools/alertsPage.ts` writes it again", () => {
  expect(readFileSync("docs/alerts.md", "utf8")).toBe(alertsPage());
});
