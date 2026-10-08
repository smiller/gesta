import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import ReplaceBar from "./ReplaceBar.svelte";
import { screenState } from "./screen.svelte.ts";

const none = () => {};
const draw = (patch: Partial<ReturnType<typeof screenState>["replace"]>): string => {
  const screen = screenState(5);
  Object.assign(screen.replace, patch);
  return render(ReplaceBar, { props: { replace: screen.replace, onFind: none, onWith: none, onNext: none, onOne: none, onAll: none, onClose: none } }).body;
};
describe("ReplaceBar", () => {
  it("hidden when closed", () => {
    expect(draw({})).toMatch(/<div class="replacebar[^"]*" hidden/);
  });
  it("open: Find with its count, Replace with with Skip, Replace and Replace All in that order, and the ×", () => {
    const html = draw({ open: true, find: "*-*", with: "-", count: "2 of 7", any: true });
    expect(html).not.toMatch(/<div class="replacebar[^"]*" hidden/);
    expect(html).toMatch(/<label for="replacefind"[^>]*>Find/);
    expect(html).toMatch(/id="replacefind"[^>]*value="\*-\*"/);
    expect(html).toMatch(/class="count[^"]*"[^>]*>2 of 7/);
    expect(html).toMatch(/<label for="replacewith"[^>]*>Replace with/);
    expect(html).toMatch(/id="replacewith"[^>]*value="-"/);
    expect(html).toMatch(/<button[^>]*>Skip<\/button>\s*<button[^>]*>Replace<\/button>\s*<button[^>]*>Replace All<\/button>/);
    expect(html).toMatch(/title="Close \(Esc\)"/);
  });
  it("nothing to replace: the two buttons refuse, and none reads as a miss", () => {
    const html = draw({ open: true, find: "zzz", count: "none", any: false });
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Replace<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Skip<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Replace All<\/button>/);
    expect(html).toMatch(/class="count[^"]* none/);
  });
});
