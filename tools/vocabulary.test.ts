import { test, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { retiredWord, retiredAlertSense, headerForMasthead, toolbarByOldName, menuOrPanelByOldName, menuAreaByOldName } from "./vocabulary.ts";

test("retiredWord: the noun, the verb and an identifier built on either; never a word that only contains the letters", () => {
  for (const bad of ["a citation", "Citations", "it cites both", "cited by", "citing", "re-cited", "citesLocator", "citationAnchorHTML", "referenceCitation", "A CITATION", "const CITATION = 1", "CitationAnchor", "citeRange", "CITED_LINES", "cite_x", "type CitesLocator", "_citation", "uncited", "miscited"]) expect(retiredWord(bad), bad).toBe(true);
  for (const good of ["a reference", "excited", "solicited", "recite", "incite", "explicit", "elicited", "specificity", "felicitation"]) expect(retiredWord(good), good).toBe(false);
});

test("retiredWord: an alert's names before, flash, notice and whisper, in any form an identifier takes; never a word that only contains the letters", () => {
  for (const bad of ["a flash", "Flashes", "data-flashes", "--flash", "flashLog", "liveFlashes", "FlashEntry", "the notice", "Notices", "noticeLedger", "takeNotice", "EntryNotices", "tabNotice", "whisper", "WHISPER_MS", "n.whisper", "it whispers", "whispering", "flashed"]) expect(retiredWord(bad), bad).toBe(true);
  for (const good of ["an alert", "a reader noticed", "flashy", "unnoticeable", "whisk"]) expect(retiredWord(good), good).toBe(false);
});

test("retiredWord: a dated plan's path keeps its words, the rest of its line still read", () => {
  expect(retiredWord("  docs/plans/2026-11-22-feat-notices-apart-plan.md (U5 took about four")).toBe(false);
  expect(retiredWord("docs/plans/2026-11-22-feat-notices-apart-plan.md, a flash")).toBe(true);
});

test("retiredAlertSense: an alert's kind or its area by the names before; never the words for an act refused or a strip of images", () => {
  for (const bad of ['kind: "refusal"', "[\"failure\", \"info\"]", "'passing'", "top: var(--strip-top, 0px)"]) expect(retiredAlertSense(bad), bad).toBe(true);
  for (const good of ["a refusal", "the store refuses", "L.refusal(name, fp)", "stripSheets(cases)", "a strip of the day's counts", "failures.push(x)"]) expect(retiredAlertSense(good), good).toBe(false);
});

test("retiredAlertSense: a standing error by its name before, pin, in code; never a checking pin, a fixed clock or a layout's pinned", () => {
  for (const bad of ["alerts.pinned", "pinned: () => true", "errorShown?: () => boolean; pinned?: () => boolean", "let fencePin = 0", "detachedPins.push(g)", "loadPins(8000, a)", "unpin()", "repin(() => 1)", "export interface Pins {"]) expect(retiredAlertSense(bad), bad).toBe(true);
  for (const good of ["(pin: surface.test › a show)", "stays pinned to the bottom", "today is pinned, not scrubbed", "test(\"pinned as found: Enter\"", "(unpinned: two writes no step can order)", "Unpinned: a race"]) expect(retiredAlertSense(good), good).toBe(false);
});

test("headerForMasthead: the band at the top or one of its rows called a header; never a table's, a zip member's, a step section's or a detail's header", () => {
  for (const bad of ["stuck under the header", "the header's foot", "open the header’s “Go to” row", "a header row, opened", "every other header row", "A Header row", "await underHeader()"]) expect(headerForMasthead(bad), bad).toBe(true);
  for (const good of ["its first row the header, a row's", "pad or trim to the header's column count", "trims each to the header\", () =>", "the header pair agrees", "a header row, a <code>| --- |", "A table's header row is not one", "the header in bold", "opens on a header of its own line", "<header class=\"site-head\">", "header: r === 0", "{ headers: { \"User-Agent\" } }"]) expect(headerForMasthead(good), good).toBe(false);
});

test("toolbarByOldName: a toolbar by its names before, a popup or a bar, in prose, an identifier or a CSS class; never a line or a bar alone", () => {
  for (const bad of ["the line bar", "Line bar", "lineBarActs", "LineBar.svelte", ".linebar .ask", "line-bar", "the Go to popup", "gotoPopupActs", ".goto-popup", "THE GO TO POPUP", "the format bar", "formatBarActs", "the replace bar", "ReplaceBar.svelte", ".replacebar", "the Selection toolbar", "a formatting toolbar", "a popup with links"]) expect(toolbarByOldName(bad), bad).toBe(true);
  for (const good of ["the Go to toolbar", "the format toolbar", "the replace toolbar", "a line", "a line, bar none", "linebreak", "the line barely fits", "an underline bar", "the sticky bar", "the tag bar"]) expect(toolbarByOldName(good), good).toBe(false);
});

test("menuOrPanelByOldName: a menu or a panel by its names before; never a menu, a panel or a card in an entry", () => {
  for (const bad of ["THE DROPDOWN PANEL", "an open lists panel", "books panel, displacing it", "the bookshelf list", "the commonplaces list", "Tab out of the bookmarks card", "the help card's promises"]) expect(menuOrPanelByOldName(bad), bad).toBe(true);
  for (const good of ["the bookshelf menu", "the commonplace menu", "the bookmarks panel", "a card hover-copied", "a list of commonplaces", "the backups panel"]) expect(menuOrPanelByOldName(good), good).toBe(false);
});

test("menuAreaByOldName: the menu area by its names before; never room in its plain sense", () => {
  for (const bad of ["the menu room", "Menu-room", "menuRoom()", "leaveRoom(px)", "var(--menu-room)"]) expect(menuAreaByOldName(bad), bad).toBe(true);
  for (const good of ["the menu area", "makes room for one more bookmark", "--menu-area-w", "a roomy menu"]) expect(menuAreaByOldName(good), good).toBe(false);
});

// Milton's own preface to Samson Agonistes uses the verb.
const QUOTES_A_BOOK = new Set(["one-offs/miltonSamsonRun.ts", "tools/vocabulary.ts", "tools/vocabulary.test.ts"]);
const ALERT_SENSE_KEPT: Record<string, string> = {
  "src/ui/alertLog.ts": "carries a log kept under its kinds' names before",
  "src/ui/alertLog.test.ts": "carries a log kept under its kinds' names before",
  "tools/commentRules.ts": "its resolvers are the checking pin's, bridgePin and the rest",
};
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === "out" || name === "node_modules") return [];
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
test("the app, its tools, its one-off scripts, CLAUDE.md, the layout, the reviews' page and the glossary say reference, alert, masthead, toolbar, menu, menu area and panel: no retired word anywhere", () => {
  const files = [...walk("src"), ...walk("tools"), ...walk("one-offs"), "CLAUDE.md", "docs/LAYOUT.md", "docs/REVIEWS.md", "GLOSSARY.md", "index.html"].filter((f) => !QUOTES_A_BOOK.has(f) && /\.(ts|mjs|svelte|html|css|sh|txt|md)$/.test(f));
  const rules = [retiredWord, headerForMasthead, toolbarByOldName, menuOrPanelByOldName, menuAreaByOldName];
  const retired = (f: string) => (t: string): boolean => rules.some((rule) => rule(t)) || (!(f in ALERT_SENSE_KEPT) && retiredAlertSense(t));
  const found = files.flatMap((f) => readFileSync(f, "utf8").split("\n").flatMap((t, i) => (retired(f)(t) ? [f + ":" + (i + 1)] : [])));
  expect(found).toEqual([]);
});
