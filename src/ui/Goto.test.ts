import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import Goto from "./Goto.svelte";
import { gotoLevels } from "./gotoModel.ts";
import { journalOf } from "../store/headings.ts";

const cache = { "2026-09-07": "# Titled", "2026-09-07/Ideas": "i", "commonplace/Books": "[E](#commonplace/Books/E)", "commonplace/Books/E": "# The essay", "commonplace/Books/F": "f" };
const w = { keys: Object.keys(cache), cache, journal: journalOf(cache), today: "2026-09-07" };
const none = () => {};
const draw = (open: boolean, date: string, tag: string | null) => render(Goto, { props: { goto: { open, levels: open ? gotoLevels(w, date, tag) : [] }, onToggle: none, onPick: none } }).body;

describe("Goto", () => {
  it("closed: the summary alone", () => {
    const html = draw(false, "2026-09-07", null);
    expect(html).toMatch(/<details class="page-goto[^"]*">/);
    expect(html).not.toContain("<select");
  });
  it("open on a day: the destination grouped, the year, month and day preselected, the tag select with its sentinel", () => {
    const html = draw(true, "2026-09-07", "Ideas");
    expect(html).toMatch(/aria-label="Destination"[^>]*>(<!--[^>]*-->)*<option value="" selected[^>]*>Journal/);
    expect(html).toMatch(/<optgroup label="Commonplaces">(<!--[^>]*-->)*<option value="Books" data-ns="commonplace"[^>]*>Books/);
    expect(html).toMatch(/aria-label="Day"[^>]*>(<!--[^>]*-->)*<option value="07" selected[^>]*>7 — Titled/);
    expect(html).toMatch(/aria-label="Tagged entry"[^>]*>(<!--[^>]*-->)*<option value=""[^>]*>← the day<\/option>(<!--[^>]*-->)*<option value="Ideas" selected/);
  });
  it("open on a sub-entry: the chain's level with the sentinel and the leaf preselected by its title", () => {
    const html = draw(true, "commonplace", "Books/E");
    expect(html).toMatch(/aria-label="Sub-entry" data-level="1"[^>]*>(<!--[^>]*-->)*<option value=""[^>]*>← the commonplace<\/option>/);
    expect(html).toMatch(/<option value="E"[^>]*selected[^>]*>The essay/);
  });
  it("a placeholder leads a level with no preselect", () => {
    const levels = gotoLevels(w, "commonplace", "Books/E");
    levels[1].value = null;
    const html = render(Goto, { props: { goto: { open: true, levels }, onToggle: none, onPick: none } }).body;
    expect(html).toMatch(/<option value=""[^>]*disabled[^>]*>— go to —/);
  });
});
