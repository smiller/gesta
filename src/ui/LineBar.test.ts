import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import LineBar from "./LineBar.svelte";
import { screenState } from "./screen.svelte.ts";

const none = () => {};
const draw = (patch: Partial<ReturnType<typeof screenState>["lineBar"]>): string => {
  const screen = screenState(5);
  Object.assign(screen.lineBar, patch);
  return render(LineBar, { props: { lineBar: screen.lineBar, onInput: none, onEnter: none, onClose: none } }).body;
};
describe("LineBar", () => {
  it("hidden when closed; open with both boxes and the or on a book with both kinds", () => {
    expect(draw({})).toMatch(/<div class="linebar[^"]*" hidden/);
    const html = draw({ open: true, kind: "both", line: "12" });
    expect(html).not.toMatch(/<div class="linebar[^"]*" hidden/);
    expect(html).toMatch(/<label for="lineinput"[^>]*>Line/);
    expect(html).toMatch(/id="lineinput"[^>]*value="12"/);
    expect(html).toMatch(/<span class="askor[^"]*">, or/);
    expect(html).toMatch(/<label for="folioinput"[^>]*>Page/);
  });
  it("a book of prose hides the Line box and the or", () => {
    const html = draw({ open: true, kind: "page" });
    expect(html).toMatch(/<span class="ask[^"]*" hidden[^>]*>(<!--[^>]*-->)*<label for="lineinput"/);
    expect(html).toMatch(/<span class="askor[^"]*" hidden/);
  });
});
