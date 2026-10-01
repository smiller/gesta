import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import Toolbar from "./Toolbar.svelte";
import { screenState } from "./screen.svelte.ts";

const draw = (patch: Partial<ReturnType<typeof screenState>["bar"]>): string => {
  const screen = screenState(5);
  Object.assign(screen.bar, patch);
  return render(Toolbar, { props: { bar: screen.bar, onAct: () => {} } }).body;
};
describe("Toolbar", () => {
  it("hidden by default; shown at its place with the lit state and the Tag button where the entry hosts", () => {
    expect(draw({})).not.toMatch(/class="fmt[^"]*show/);
    const html = draw({ show: true, left: 120, top: 80, on: { bold: true }, canTag: true });
    expect(html).toMatch(/class="fmt[^"]*show[^"]*" style="left: 120px; top: 80px"/);
    expect(html).toMatch(/<button class="b[^"]*on[^"]*" title="Bold/);
    expect(html).toMatch(/title="Move selection to a new sub-entry"[^>]*>Tag/);
    expect(html).not.toMatch(/title="Move selection to a new sub-entry" hidden/);
    expect(draw({ show: true }).toString()).toMatch(/title="Move selection to a new sub-entry" hidden/);
  });
  it("inside a code block the class says so", () => {
    expect(draw({ show: true, incode: true })).toMatch(/class="fmt[^"]*incode/);
  });
});
