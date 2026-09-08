import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import Search from "./Search.svelte";
import { screenState } from "./screen.svelte.ts";

const none = () => {};
function draw(patch: Partial<ReturnType<typeof screenState>["search"]>): string {
  const screen = screenState(5);
  Object.assign(screen.search, patch);
  return render(Search, { props: { search: screen.search, onToggle: none, onQuery: none, onScope: none, onWalk: none, onEnter: none, onPick: none } }).body;
}
const options = [
  { label: "Everything", scope: { kind: "everything" as const }, group: null },
  { label: "Journal", scope: { kind: "journal" as const }, group: null },
  { label: "Books", scope: { kind: "book" as const, ns: "page", book: "Books" }, group: "Pages" },
];
describe("Search", () => {
  it("closed by default, the scope select grouped, the picked option selected", () => {
    const html = draw({ options, scopeAt: 2 });
    expect(html).toMatch(/<details class="page-search[^"]*">/);
    expect(html).not.toMatch(/<details class="page-search[^"]*" open/);
    expect(html).toMatch(/<optgroup label="Pages">(<!--[^>]*-->)*<option value="2" selected[^>]*>Books/);
  });
  it("open, with rows: the where, the marked snippet, the active bar, the cap notice", () => {
    const html = draw({ open: true, query: "sister", options, active: 1, capped: true, rows: [
      { result: { date: "2026-09-07", tag: null, nth: 0, snippet: "" }, where: "2026-09-07", runs: [{ text: "her ", mark: false }, { text: "sister", mark: true }] },
      { result: { date: "page", tag: "Books", nth: 0, snippet: "" }, where: "Books", runs: [{ text: "x", mark: false }] },
    ] });
    expect(html).toMatch(/<details class="page-search[^"]*" open/);
    expect(html).toMatch(/<li class="hit[^"]*">(<!--[^>]*-->)*<span class="where[^"]*">2026-09-07<\/span>/);
    expect(html).toMatch(/<mark class="[^"]*">sister<\/mark>/);
    expect(html).toMatch(/<li class="hit[^"]*active[^"]*">/);
    expect(html).toContain("Showing the first 200 matches");
  });
  it("the empty line", () => {
    expect(draw({ open: true, options, empty: "No matches." })).toMatch(/<li class="empty[^"]*">No matches\./);
  });
});
