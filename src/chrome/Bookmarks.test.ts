import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import Bookmarks from "./Bookmarks.svelte";
import { screenState } from "./screen.svelte.ts";

const none = () => {};
const draw = (patch: Partial<ReturnType<typeof screenState>["bookmarks"]>): string => {
  const screen = screenState(5);
  Object.assign(screen.bookmarks, patch);
  return render(Bookmarks, { props: { bookmarks: screen.bookmarks, onKey: none, onAct: none, onDraft: none, onCommit: none } }).body;
};
describe("Bookmarks", () => {
  it("empty: the one line and the foot's offer", () => {
    const html = draw({ foot: { full: false, name: "2026-09-07" } });
    expect(html).toContain("No bookmarks yet.");
    expect(html).toMatch(/Press (<!--[^>]*-->)*<code[^>]*>A<\/code>(<!--[^>]*-->)* to add bookmark for (<!--[^>]*-->)*<b>2026-09-07/);
  });
  it("rows: the keyed one with its trigger, the numbered one marked here, the editor in place of a trigger", () => {
    const html = draw({ rows: [
      { key: "page/B", trigger: "fb", label: "B", keyed: true, here: false, cut: false },
      { key: "2026-09-07", trigger: "1", label: "2026-09-07", keyed: false, here: true, cut: true },
    ], editing: "page/B", draft: "fb", foot: null });
    expect(html).toMatch(/<li class="hit[^"]*bookmark-keyed[^"]*"[^>]*data-key="page\/B"/);
    expect(html).toMatch(/<input class="bookmark-aliasinput[^"]*" type="text" value="fb"/);
    expect(html).toMatch(/bookmark-cut[^"]*"[^>]*data-key="2026-09-07"/);
    expect(html).toContain("you are here");
    expect(html).not.toContain("bookmarks-add");
  });
  it("an unreadable store says so and offers nothing", () => {
    const html = draw({ unreadable: true, foot: { full: false, name: "x" } });
    expect(html).toContain("your saved bookmarks are damaged");
    expect(html).not.toContain("bookmarks-add");
  });
});
