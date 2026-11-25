/* The masthead rendered to a string by svelte/server over a model in each
   shape: what the markup says. The sticky bar, the wrap and the clicks are
   looked at in Helium. */
import { describe, it, expect } from "vitest";
import { menuActs, menuItems, type MenuName, type Opened } from "./menuModel.ts";
import { render } from "svelte/server";
import Masthead from "./Masthead.svelte";
import { screenState } from "./screen.svelte.ts";
import { mastheadModel, type MenuRow } from "./mastheadModel.ts";
import { journalOf } from "../store/headings.ts";

const cache = { "2026-09-07": "# Titled\n\nx", "2026-09-07/Ideas": "i", "commonplace/Books/Essay": "# The essay\n\nb" };
const journal = journalOf(cache);
const none = () => {};
function draw(date: string, tag: string | null, extra: Partial<{ gutter: boolean; interval: number; opened: Opened; rows: MenuRow[]; empty: string; reader: boolean }> = {}): string {
  const screen = screenState(extra.interval ?? 5);
  screen.masthead = mastheadModel(date, tag, { keys: Object.keys(cache), journal, today: "2026-09-07" });
  screen.gutter = !!extra.gutter;
  if (extra.opened) { screen.opened = extra.opened; screen.menuRows = extra.rows || []; screen.menuEmpty = extra.empty || ""; screen.menu.sel = 0; }
  return render(Masthead, { props: { screen, onToday: none, onExport: none, onImport: none, onInterval: none, onOpener: none, onCloseOpened: none, menus: { onKey: () => false, onHover: none, onChoose: none, onClose: none, onMounted: none, items: (name: MenuName) => menuItems(screen.menuRows, menuActs(name, false).map((x) => x.text)) }, onCreate: none, onRename: none, onDelete: none, search: { onToggle: none, onQuery: none, onScope: none, onWalk: none, onEnter: none, onPick: none, onHover: none }, goto: { onToggle: none, onPick: none }, gotoToolbar: { onInput: none, onEnter: none, onClose: none }, replace: { onFind: none, onWith: none, onNext: none, onOne: none, onAll: none, onClose: none }, bookmarks: { onKey: none, onAct: none, onDraft: none, onCommit: none }, shortcuts: { onQuery: none, onPick: none, onWalk: none, onEnter: none, onEdit: none, onDraft: none, onSave: none, onEscape: none }, backups: { onSetup: none, onResume: none, onSweep: none }, reader: extra.reader ? { onOpen: none, onWalk: none } : null } }).body;
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
  it("a sub-entry: the parent crumb, the leaf, its heading as the title, the today button shown", () => {
    const html = draw("commonplace", "Books/Essay");
    expect(html).toMatch(/href="#commonplace\/Books" title="Back to Books">Books<\/a>(<!--[^>]*-->|\s)* › (<!--[^>]*-->)*<strong class="tag-current[^"]*">Essay<\/strong>/);
    expect(html).toContain(">The essay</span>");
    expect(html).toMatch(/title="Go to today">today/);
  });
  it("the Line numbering row shows only over a gutter, its select at the interval", () => {
    expect(draw("2026-09-07", null)).toMatch(/class="page-lines[^"]*" hidden/);
    const html = draw("2026-09-07", null, { gutter: true, interval: 1 });
    expect(html).not.toMatch(/class="page-lines[^"]*" hidden/);
    expect(html).toMatch(/<option value="1" selected[^>]*>every line/);
    expect(html).toMatch(/<option value="3"[^>]*>every 3rd/);
  });
  it("the bookshelf on its shelves: a shelf's row is a heading, not a link, its authors set in; the shelves entry its own row at the foot, made when there is none", () => {
    const html = draw("2026-09-07", null, { opened: "bookshelf", rows: [{ text: "Latin", href: "", shelf: true }, { text: "Horace", href: "#bookshelf/Horace", shelved: true }] });
    expect(html).toMatch(/<span class="shelf[^"]*">Latin<\/span>/);
    expect(html).toMatch(/<a href="#bookshelf\/Horace" title="Horace" class="[^"]*shelved[^"]*">Horace<\/a>/);
    expect(html).toMatch(/New author…<\/button>(<!--[^>]*-->|\s)*<button class="menu-act[^"]*" type="button">Shelves…<\/button>/);
    expect(draw("2026-09-07", null, { opened: "commonplace", rows: [] })).not.toMatch(/>Shelves…</);
  });
  it("no menu by default; an open commonplace menu lists its rows, the selected one marked, and the create row; an empty shelf explains itself", () => {
    expect(draw("2026-09-07", null)).not.toContain('class="menu');
    const html = draw("2026-09-07", null, { opened: "commonplace", rows: [{ text: "Books", href: "#commonplace/Books" }] });
    expect(html).toMatch(/<nav class="menu[^"]*"[^>]*>(<!--[^>]*-->)*<a href="#commonplace\/Books" title="Books" class="[^"]*\bsel\b[^"]*">Books<\/a>/);
    expect(html).toContain(">New commonplace…</button>");
    expect(html).not.toContain("menu-empty");
    const shelf = draw("2026-09-07", null, { opened: "bookshelf", rows: [], empty: "No authors yet — import a folder, or start one below." });
    expect(shelf).toMatch(/<span class="menu-empty[^"]*">No authors yet/);
    expect(shelf).toContain(">New author…</button>");
  });
  it("the open menu's icon says it is expanded, the other icon not; neither icon carries a caret", () => {
    const expanded = (html: string, label: string) => html.match(new RegExp(`aria-label="${label}" aria-expanded="(\\w+)"`))?.[1];
    for (const [opened, shelf, place] of [[undefined, "false", "false"], ["bookshelf", "true", "false"], ["commonplace", "false", "true"], ["help", "false", "false"]] as const) {
      const html = draw("2026-09-07", null, opened ? { opened } : {});
      expect([expanded(html, "Bookshelf menu"), expanded(html, "Commonplace menu")]).toEqual([shelf, place]);
      expect(html).not.toContain("▾");
    }
  });
  it("the sub-entry buttons: a day offers the create only, a tagged entry rename and delete only, a commonplace all three with its nouns", () => {
    const day = draw("2026-09-07", null);
    expect(day).toMatch(/title="Create a tagged sub-entry for this day"[^>]*>\+ tagged entry/);
    expect(day).toMatch(/title="Rename this entry’s tag" hidden/);
    const tagged = draw("2026-09-07", "Ideas");
    expect(tagged).toMatch(/title="Create a tagged sub-entry for this day" hidden/);
    expect(tagged).toMatch(/title="Delete this tagged entry">delete/);
    const page = draw("commonplace", "Books/Essay");
    expect(page).toMatch(/title="Create a sub-entry here">\+ sub-entry/);
    expect(page).toMatch(/title="Rename this sub-entry">rename/);
  });
  it("the read-only page: ‹ and › either side of the crumbs to walk without a keyboard, the bundle's control in place of the writing tools", () => {
    const html = draw("2026-09-07", null, { reader: true });
    expect(html).toMatch(/aria-label="Previous entry"[^>]*>‹<\/button>(.|\n)*class="datelabel(.|\n)*aria-label="Next entry"[^>]*>›<\/button>/);
    expect(html).toContain(">open backup<");
    expect(html).not.toContain(">export</button>");
    expect(draw("2026-09-07", null)).not.toContain("Previous entry");
  });
});
