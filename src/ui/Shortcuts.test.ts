import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import Shortcuts from "./Shortcuts.svelte";
import { screenState } from "./screen.svelte.ts";

const none = () => {};
const draw = (patch: Partial<ReturnType<typeof screenState>["shortcuts"]>): string => {
  const screen = screenState(5);
  Object.assign(screen.shortcuts, patch);
  return render(Shortcuts, { props: { shortcuts: screen.shortcuts, onQuery: none, onPick: none, onWalk: none, onEnter: none, onEdit: none, onDraft: none, onSave: none, onEscape: none } }).body;
};
describe("Shortcuts", () => {
  it("the rows with the first active, the code and its expansion; the editor closed", () => {
    const html = draw({ rows: [{ code: "sig", expansion: "Sean" }, { code: "md", expansion: "markdown" }], active: 0 });
    expect(html).toMatch(/<li class="hit[^"]*active[^"]*"[^>]*>(<!--[^>]*-->)*<span class="shortcut-code[^"]*">sig<\/span><span class="shortcut-exp[^"]*">Sean/);
    expect(html).not.toContain("shortcut-edit");
  });
  it("the empty line, and the editor open with its draft", () => {
    expect(draw({ empty: "No shortcuts yet — add some below.", editing: true, draft: "a: b" })).toMatch(/<textarea class="shortcut-edit[^"]*"[^>]*>a: b<\/textarea>/);
  });
});
