/* The masthead rendered to a string by svelte/server over a model in each
   shape: what the markup says. The sticky bar, the wrap and the clicks are
   looked at in Helium. */
import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import Masthead from "./Masthead.svelte";
import { screenState } from "./screen.svelte.ts";
import { mastheadModel } from "./mastheadModel.ts";
import { journalOf } from "../store/headings.ts";

const cache = { "2026-09-07": "# Titled\n\nx", "2026-09-07/Ideas": "i", "page/Books/Essay": "# The essay\n\nb" };
const journal = journalOf(cache);
const none = () => {};
function draw(date: string, tag: string | null, extra: Partial<{ gutter: boolean; interval: number; panel: "page" | "bookshelf"; rows: { text: string; href: string }[]; empty: string }> = {}): string {
  const screen = screenState(extra.interval ?? 5);
  screen.masthead = mastheadModel(date, tag, Object.keys(cache), journal, "2026-09-07");
  screen.gutter = !!extra.gutter;
  screen.backupsLabel = "set up automatic backups…";
  if (extra.panel) { screen.panel = extra.panel; screen.panelRows = extra.rows || []; screen.panelEmpty = extra.empty || ""; }
  return render(Masthead, { props: { screen, onToday: none, onExport: none, onImport: none, onBackups: none, onClear: none, onInterval: none, onPanel: none, onClosePanel: none, onNewRoot: none, onCreate: none, onRename: none, onDelete: none, search: { onToggle: none, onQuery: none, onScope: none, onWalk: none, onEnter: none, onPick: none }, goto: { onToggle: none, onPick: none } } }).body;
}

describe("Masthead", () => {
  it("today's main entry: the plain date unit, the title row, the tag, no today button", () => {
    const html = draw("2026-09-07", null);
    expect(html).toMatch(/<span class="date-unit[^"]*">Today — /);
    expect(html).toMatch(/<span class="page-title[^"]*">Titled<\/span>/);
    expect(html).toMatch(/href="#2026-09-07\/Ideas"[^>]*>Ideas<\/a>/);
    expect(html).toMatch(/title="Go to today" hidden/);
  });
  it("a tagged entry: the date links back, the bold leaf after ›, the today button hidden still", () => {
    const html = draw("2026-09-07", "Ideas");
    expect(html).toMatch(/<a class="datelink date-unit[^"]*" href="#2026-09-07" title="Back to the main entry">Today — /);
    expect(html).toMatch(/ › (<!--[^>]*-->)*<strong class="tag-current[^"]*">Ideas<\/strong>/);
    expect(html).toMatch(/class="page-title[^"]*" hidden/);
    expect(html).not.toContain(">Ideas</a>");
  });
  it("a sub-page: the parent crumb, the leaf, its heading as the title, the today button shown", () => {
    const html = draw("page", "Books/Essay");
    expect(html).toMatch(/href="#page\/Books" title="Back to Books">Books<\/a>(<!--[^>]*-->|\s)* › (<!--[^>]*-->)*<strong class="tag-current[^"]*">Essay<\/strong>/);
    expect(html).toContain(">The essay</span>");
    expect(html).toMatch(/title="Go to today">today/);
  });
  it("the Line numbering row shows only over a gutter, its select at the interval", () => {
    expect(draw("2026-09-07", null)).toMatch(/class="page-lines[^"]*" hidden/);
    const html = draw("2026-09-07", null, { gutter: true, interval: 1 });
    expect(html).not.toMatch(/class="page-lines[^"]*" hidden/);
    expect(html).toMatch(/<option value="1" selected[^>]*>every line/);
  });
  it("no panel by default; an open pages panel lists its rows and the create row; an empty shelf explains itself", () => {
    expect(draw("2026-09-07", null)).not.toContain('class="pages');
    const html = draw("2026-09-07", null, { panel: "page", rows: [{ text: "Books", href: "#page/Books" }] });
    expect(html).toMatch(/<nav class="pages[^"]*">(<!--[^>]*-->)*<a href="#page\/Books" title="Books"[^>]*>Books<\/a>/);
    expect(html).toContain(">New page…</button>");
    expect(html).not.toContain("panel-empty");
    const shelf = draw("2026-09-07", null, { panel: "bookshelf", rows: [], empty: "No authors yet — import a folder, or start one below." });
    expect(shelf).toMatch(/<span class="panel-empty[^"]*">No authors yet/);
    expect(shelf).toContain(">New author…</button>");
  });
  it("the sub-entry buttons: a day offers the create only, a tagged entry rename and delete only, a page all three with its nouns", () => {
    const day = draw("2026-09-07", null);
    expect(day).toMatch(/title="Create a tagged sub-entry for this day"[^>]*>\+ tagged entry/);
    expect(day).toMatch(/title="Rename this entry's tag" hidden/);
    const tagged = draw("2026-09-07", "Ideas");
    expect(tagged).toMatch(/title="Create a tagged sub-entry for this day" hidden/);
    expect(tagged).toMatch(/title="Delete this tagged entry">delete/);
    const page = draw("page", "Books/Essay");
    expect(page).toMatch(/title="Create a sub-page here">\+ sub-page/);
    expect(page).toMatch(/title="Rename this sub-page">rename/);
  });
});
