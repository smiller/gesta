import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import GotoPopup from "./GotoPopup.svelte";
import { screenState } from "./screen.svelte.ts";

const none = () => {};
const draw = (patch: Partial<ReturnType<typeof screenState>["gotoPopup"]>): string => {
  const screen = screenState(5);
  Object.assign(screen.gotoPopup, patch);
  return render(GotoPopup, { props: { gotoPopup: screen.gotoPopup, onInput: none, onEnter: none, onClose: none } }).body;
};
describe("GotoPopup", () => {
  it("hidden when closed; open with both boxes and the or on a book with both kinds", () => {
    expect(draw({})).toMatch(/<div class="goto-popup[^"]*" hidden/);
    const html = draw({ open: true, kind: "both", line: "12" });
    expect(html).not.toMatch(/<div class="goto-popup[^"]*" hidden/);
    expect(html).toMatch(/<label for="lineinput"[^>]*>Line/);
    expect(html).toMatch(/id="lineinput"[^>]*value="12"/);
    expect(html).toMatch(/<span class="askor[^"]*">, or/);
    expect(html).toMatch(/<label for="pageinput"[^>]*>Page/);
  });
  it("a book of prose hides the Line box and the or", () => {
    const html = draw({ open: true, kind: "page" });
    expect(html).toMatch(/<span class="ask[^"]*" hidden[^>]*>(<!--[^>]*-->)*<label for="lineinput"/);
    expect(html).toMatch(/<span class="askor[^"]*" hidden/);
  });
  it("names its box as it is told: Paragraph on a work asked by paragraph, Line otherwise", () => {
    expect(draw({ open: true, kind: "line" })).toMatch(/<label for="lineinput"[^>]*>Line/);
    expect(draw({ open: true, kind: "line", lineLabel: "Paragraph" })).toMatch(/<label for="lineinput"[^>]*>Paragraph/);
  });
});
