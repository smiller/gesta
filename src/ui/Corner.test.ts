/* The notices rendered to a string by svelte/server over a ledger in each
   of its states: what the markup says, not how it behaves — the click and
   the clock are looked at in Helium. */
import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import Corner from "./Corner.svelte";
import { noticeLedger } from "./notices.svelte.ts";

const draw = (n = noticeLedger(() => Promise.resolve())): string => render(Corner, { props: { notices: n, onResume: () => {} } }).body;

describe("Corner", () => {
  it("idle: every notice hidden, the info with its idle word, the pill hidden", () => {
    const html = draw();
    expect(html).toMatch(/<span class="notice info[^"]*">saved<span class="close/);
    expect(html).not.toMatch(/class="notice[^"]*show/);
    expect(html).toMatch(/<button class="backup-paused[^"]*" hidden/);
  });
  it("a whisper: the info shown, with its text", () => {
    const n = noticeLedger(() => Promise.resolve());
    n.whisper("1 word");
    expect(draw(n)).toMatch(/class="notice info[^"]*show[^"]*">1 word<span class="close/);
  });
  it("a failure and a refusal at once: both shown, the failure first, each with its ×", () => {
    const n = noticeLedger(() => Promise.resolve());
    n.refuse("no line numbers here");
    n.stick("not saved", "detail");
    const html = draw(n);
    expect(html).toMatch(/class="notice failure[^"]*show[^"]*">not saved<span class="close/);
    expect(html).toMatch(/class="notice refusal[^"]*show[^"]*">no line numbers here<span class="close/);
    expect(html.indexOf("notice failure")).toBeLessThan(html.indexOf("notice refusal"));
  });
  it("one stack: the failure, the refusal, the info, then the success", () => {
    const html = draw();
    const stack = html.slice(html.indexOf('class="notices'), html.indexOf("</div>"));
    const at = ["failure", "refusal", "info", "success"].map((k) => stack.indexOf("notice " + k));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((x, y) => x - y)).toEqual(at);
  });
  it("an info and a success shown at once, each in its own box", () => {
    const n = noticeLedger(() => Promise.resolve());
    n.whisper("1 word");
    n.succeed("Link copied");
    const html = draw(n);
    expect(html).toMatch(/class="notice info[^"]*show[^"]*">1 word/);
    expect(html).toMatch(/class="notice success[^"]*show[^"]*">Link copied/);
  });
  it("trouble draws the pill with its text", () => {
    const n = noticeLedger(() => Promise.resolve());
    n.setTrouble("backups paused — click to resume");
    const html = draw(n);
    expect(html).toMatch(/<button class="backup-paused[^"]*">backups paused — click to resume<\/button>/);
    expect(html).not.toMatch(/backup-paused[^>]*hidden/);
  });
});
