/* The alerts rendered to a string by svelte/server over a ledger in each
   of its states: what the markup says, not how it behaves — the click and
   the clock are looked at in Helium. */
import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import Alerts from "./Alerts.svelte";
import { alertLedger } from "./alertLedger.svelte.ts";

const draw = (a = alertLedger(() => Promise.resolve())): string => render(Alerts, { props: { alerts: a, onResume: () => {} } }).body;

describe("Alerts", () => {
  it("idle: every alert hidden, the info with its idle word, the pill hidden", () => {
    const html = draw();
    expect(html).toMatch(/<span class="alert info[^"]*">saved<span class="close/);
    expect(html).not.toMatch(/class="alert[^"]*show/);
    expect(html).toMatch(/<button class="backup-paused[^"]*" hidden/);
  });
  it("an info: shown, with its text", () => {
    const a = alertLedger(() => Promise.resolve());
    a.raise("oneWord");
    expect(draw(a)).toMatch(/class="alert info[^"]*show[^"]*">1 word<span class="close/);
  });
  it("an error and a warning at once: both shown, the error first, each with its ×", () => {
    const a = alertLedger(() => Promise.resolve());
    a.raise("noLineNumbers");
    a.raise("notSaved", { copy: "detail" });
    const html = draw(a);
    expect(html).toMatch(/class="alert error[^"]*show[^"]*">not saved<span class="close/);
    expect(html).toMatch(/class="alert warning[^"]*show[^"]*">no line numbers here<span class="close/);
    expect(html.indexOf("alert error")).toBeLessThan(html.indexOf("alert warning"));
  });
  it("one stack: the error, the warning, the info, then the success", () => {
    const html = draw();
    const stack = html.slice(html.indexOf('class="alerts'), html.indexOf("</div>"));
    const at = ["error", "warning", "info", "success"].map((k) => stack.indexOf("alert " + k));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((x, y) => x - y)).toEqual(at);
  });
  it("an info and a success shown at once, each in its own box", () => {
    const a = alertLedger(() => Promise.resolve());
    a.raise("oneWord");
    a.raise("linkCopied");
    const html = draw(a);
    expect(html).toMatch(/class="alert info[^"]*show[^"]*">1 word/);
    expect(html).toMatch(/class="alert success[^"]*show[^"]*">Link copied/);
  });
  it("trouble draws the pill with its text", () => {
    const a = alertLedger(() => Promise.resolve());
    a.setTrouble("backups paused — click to resume");
    const html = draw(a);
    expect(html).toMatch(/<button class="backup-paused[^"]*">backups paused — click to resume<\/button>/);
    expect(html).not.toMatch(/backup-paused[^>]*hidden/);
  });
});
