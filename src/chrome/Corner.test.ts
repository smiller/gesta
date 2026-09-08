/* The corner rendered to a string by svelte/server over a ledger in each
   of its states: what the markup says, not how it behaves — the click and
   the fade are looked at in Helium. */
import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import Corner from "./Corner.svelte";
import { noticeLedger } from "./notices.svelte.ts";

const draw = (n = noticeLedger(() => Promise.resolve())): string => render(Corner, { props: { notices: n, onResume: () => {} } }).body;

describe("Corner", () => {
  it("idle: the indicator hidden with its idle word, the pill hidden", () => {
    const html = draw();
    expect(html).toMatch(/<span class="saved[^"]*">saved<\/span>/);
    expect(html).not.toMatch(/class="saved[^"]*show/);
    expect(html).toMatch(/<button class="backup-paused[^"]*" hidden/);
  });
  it("a whisper: shown, with its text", () => {
    const n = noticeLedger(() => Promise.resolve());
    n.whisper("no earlier entry");
    expect(draw(n)).toMatch(/class="saved[^"]*show[^"]*">no earlier entry<\/span>/);
  });
  it("a pin carries its copy affordance", () => {
    const n = noticeLedger(() => Promise.resolve());
    n.stick("not saved", "detail");
    expect(draw(n)).toContain(">not saved (click to copy)</span>");
  });
  it("trouble draws the pill with its text", () => {
    const n = noticeLedger(() => Promise.resolve());
    n.setTrouble("backups paused — click to resume");
    const html = draw(n);
    expect(html).toMatch(/<button class="backup-paused[^"]*">backups paused — click to resume<\/button>/);
    expect(html).not.toMatch(/backup-paused[^>]*hidden/);
  });
});
