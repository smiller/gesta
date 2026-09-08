/* The notice ledger's decisions, re-pinned from the current app's
   06-save-load.js: the whisper that times out, the pin that yields to
   nothing but a click, the progress line an op owns, the deferred one-shot
   and the keyed save-failure family. Timers are faked; the clipboard is a
   fake that can refuse. FAILURE 2026-09-07: this file was overwritten by
   a `Notices.test.ts` on the case-insensitive disk and lost with the
   rename; a component's file never shares a stem with a module's again. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { noticeLedger, IDLE_TEXT, WHISPER_MS, type Notices } from "./notices.svelte.ts";

let copied: string[];
let refuseCopy = false;
let n: Notices;
const copy = (text: string): Promise<void> => {
  copied.push(text);
  return refuseCopy ? Promise.reject(new Error("no clipboard")) : Promise.resolve();
};
const flush = (): Promise<void> => new Promise((r) => { setTimeout(r, 0); vi.advanceTimersByTime(0); });

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
  copied = [];
  refuseCopy = false;
  n = noticeLedger(copy);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("whisper", () => {
  it("shows the text and hides after its time, the text staying for the fade", () => {
    expect(n.state.text).toBe(IDLE_TEXT);
    n.whisper("no earlier entry", 3000);
    expect(n.state).toMatchObject({ text: "no earlier entry", shown: true });
    vi.advanceTimersByTime(2999);
    expect(n.state.shown).toBe(true);
    vi.advanceTimersByTime(1);
    expect(n.state).toMatchObject({ text: "no earlier entry", shown: false });
  });
  it("defaults its time", () => {
    n.whisper("saved");
    vi.advanceTimersByTime(WHISPER_MS - 1);
    expect(n.state.shown).toBe(true);
    vi.advanceTimersByTime(1);
    expect(n.state.shown).toBe(false);
  });
  it("a later whisper restarts the clock", () => {
    n.whisper("a", 1000);
    vi.advanceTimersByTime(900);
    n.whisper("b", 1000);
    vi.advanceTimersByTime(900);
    expect(n.state).toMatchObject({ text: "b", shown: true });
  });
  it("refuse says why once per press: a held key's repeats are swallowed", () => {
    n.refuse({ repeat: false }, "nothing above to nest under");
    expect(n.state.text).toBe("nothing above to nest under");
    n.click();
    n.refuse({ repeat: true }, "nothing above to nest under");
    expect(n.state.shown).toBe(false);
  });
  it("a click dismisses a whisper", () => {
    n.whisper("saved");
    n.click();
    expect(n.state.shown).toBe(false);
    vi.advanceTimersByTime(WHISPER_MS);
    expect(n.state.shown).toBe(false);
  });
});

describe("stick", () => {
  it("pins with the copy affordance in its own text, and a whisper yields to it", () => {
    n.stick("not saved", "detail");
    expect(n.state).toMatchObject({ text: "not saved (click to copy)", shown: true });
    expect(n.pinned).toBe(true);
    n.whisper("saved");
    expect(n.state.text).toBe("not saved (click to copy)");
    vi.advanceTimersByTime(10000);
    expect(n.state.shown).toBe(true);
  });
  it("a click copies the detail, releases, and whispers copied", async () => {
    n.stick("not saved", "detail");
    n.click();
    expect(copied).toEqual(["detail"]);
    expect(n.pinned).toBe(false);
    await flush();
    expect(n.state).toMatchObject({ text: "copied", shown: true });
    vi.advanceTimersByTime(1200);
    expect(n.state.shown).toBe(false);
  });
  it("copies the shown text when no detail was given", () => {
    n.stick("export failed — see console");
    n.click();
    expect(copied).toEqual(["export failed — see console"]);
  });
  it("a refused clipboard says so", async () => {
    refuseCopy = true;
    n.stick("not saved", "detail");
    n.click();
    await flush();
    expect(n.state.text).toBe("copy failed — see console");
  });
  it("a notice newer than the click stands the copied whisper down", async () => {
    n.stick("not saved", "detail");
    n.click();
    n.stick("another", "d2");
    await flush();
    expect(n.state.text).toBe("another (click to copy)");
  });
  it("stickErr logs and copies the error's text, else the shown text", () => {
    n.stickErr("backup blocked", new DOMException("denied", "NotAllowedError"));
    n.click();
    n.stickErr("backup blocked", null);
    n.click();
    expect(copied).toEqual(["NotAllowedError: denied", "backup blocked"]);
    expect(console.error).toHaveBeenCalledTimes(2);
  });
  it("releasePin releases only while the notice is still the owner's", () => {
    const gen = n.stickErr("fence refused", null);
    n.releasePin(gen);
    expect(n.state.shown).toBe(false);
    const g2 = n.stickErr("first", null);
    n.stickErr("second", null);
    n.releasePin(g2);
    expect(n.state.text).toBe("second (click to copy)");
    n.releasePin(0);
    expect(n.state.text).toBe("second (click to copy)");
  });
});

describe("progress", () => {
  it("shows at once, holds against a whisper, counts, and its ok ends it", () => {
    const p = n.progress("exporting…");
    expect(n.state).toMatchObject({ text: "exporting…", shown: true, busy: true });
    n.whisper("saved");
    expect(n.state.text).toBe("exporting…");
    p.step(2000, 7500);
    expect(n.state.text).toBe("exporting… 2000 / 7500");
    p.ok("exported 7500 entries", 3000);
    expect(n.state).toMatchObject({ text: "exported 7500 entries", busy: false });
    vi.advanceTimersByTime(3000);
    expect(n.state.shown).toBe(false);
  });
  it("its fail sticks; its cancel hides", () => {
    n.progress("exporting…").fail("export failed — x", "x");
    expect(n.state.text).toBe("export failed — x (click to copy)");
    expect(n.pinned).toBe(true);
    n.click();
    n.progress("importing…").cancel();
    expect(n.state).toMatchObject({ shown: false, busy: false });
  });
  it("a click while busy does nothing", () => {
    n.progress("exporting…");
    n.click();
    expect(n.state).toMatchObject({ text: "exporting…", shown: true, busy: true });
  });
  it("a newer progress retires the older handle", () => {
    const a = n.progress("exporting…");
    const b = n.progress("importing…");
    a.step(1, 2);
    a.ok("done");
    expect(n.state).toMatchObject({ text: "importing…", busy: true });
    b.ok("imported 2 entries");
    expect(n.state.busy).toBe(false);
  });
  it("a user-driven op drops a prior unclicked pin, so its own end can speak", () => {
    n.stick("old failure", "old");
    const p = n.progress("exporting…");
    expect(n.pinned).toBe(false);
    p.ok("exported 1 entry");
    expect(n.state.text).toBe("exported 1 entry");
    n.click();
    expect(copied).toEqual([]);
  });
});

describe("the deferred one-shot", () => {
  it("waits under a busy pin and resurfaces when the op ends", () => {
    const p = n.progress("importing…");
    expect(n.stickErrIdle("couldn't delete — reload", new Error("x"))).toBe(0);
    expect(n.state.text).toBe("importing…");
    expect(console.error).toHaveBeenCalledTimes(1);
    p.ok("imported 3 entries");
    expect(n.state.text).toBe("couldn't delete — reload (click to copy)");
  });
  it("one slot: a newer deferred failure supersedes an older unseen one", () => {
    const p = n.progress("importing…");
    n.stickErrIdle("first", null);
    n.stickErrIdle("second", null);
    p.cancel();
    expect(n.state.text).toBe("second (click to copy)");
  });
  it("resurfaces on the dismiss click of another pin", () => {
    const p = n.progress("importing…");
    n.stickErrIdle("deferred", null);
    p.fail("import failed", "x");
    n.click();
    expect(n.state.text).toBe("deferred (click to copy)");
  });
  it("sticks at once when nothing is busy", () => {
    expect(n.stickErrIdle("now", null)).toBeGreaterThan(0);
    expect(n.state.text).toBe("now (click to copy)");
  });
});

describe("the keyed save-failure family, as the entry layer speaks it", () => {
  it("a stuck write pins with the refused text as the copy, and its landing releases", () => {
    n.entry.stuck("not saved — changed in another tab, copy your text then reload", new Error("stale"), "2026-09-07", "# my text");
    expect(n.state.text).toBe("not saved — changed in another tab, copy your text then reload (click to copy)");
    n.entry.landed("2026-09-07");
    expect(n.state.shown).toBe(false);
    expect(n.pinned).toBe(false);
  });
  it("the pin stands until the LAST owed key lands", () => {
    n.entry.stuck("not saved", new Error("a"), "a");
    n.entry.stuck("not saved", new Error("b"), "b");
    n.entry.landed("a");
    expect(n.pinned).toBe(true);
    n.entry.landed("other");
    expect(n.pinned).toBe(true);
    n.entry.landed("b");
    expect(n.pinned).toBe(false);
  });
  it("a removed entry owes nothing", () => {
    n.entry.stuck("not saved", new Error("a"), "a");
    n.entry.removed("a");
    expect(n.pinned).toBe(false);
  });
  it("the copy payload is the error's text when no rescue was offered", () => {
    n.entry.stuck("not saved", new DOMException("full", "QuotaExceededError"), "a");
    n.click();
    expect(copied).toEqual(["QuotaExceededError: full"]);
  });
  it("a failure under a busy pin is logged, latched, and replayed when the op ends", () => {
    const p = n.progress("importing…");
    n.entry.stuck("not saved", new Error("x"), "a");
    expect(n.state.text).toBe("importing…");
    expect(console.error).toHaveBeenCalledTimes(1);
    p.ok("imported 3 entries");
    expect(n.state.text).toBe("not saved (click to copy)");
  });
  it("the latch stays armed across a later op until the key lands", () => {
    n.entry.stuck("not saved", new Error("x"), "a");
    n.progress("exporting…").ok("exported");
    expect(n.state.text).toBe("not saved (click to copy)");
    n.click();
    n.progress("exporting…").cancel();
    expect(n.state.text).toBe("not saved (click to copy)");
    n.entry.landed("a");
    n.progress("exporting…").ok("exported", 1000);
    expect(n.state.text).toBe("exported");
  });
  it("with both latches armed only the save failure shows; the one-shot waits for its dismiss", () => {
    const p = n.progress("importing…");
    n.stickErrIdle("couldn't delete — reload", null);
    n.entry.stuck("not saved", new Error("x"), "a");
    p.ok("imported");
    expect(n.state.text).toBe("not saved (click to copy)");
    n.click();
    expect(n.state.text).toBe("couldn't delete — reload (click to copy)");
  });
  it("a delete that failed for another reason is the unkeyed, deferred kind", () => {
    const p = n.progress("importing…");
    n.entry.stuckIdle("couldn't delete — reload", new Error("x"));
    p.ok("imported");
    expect(n.state.text).toBe("couldn't delete — reload (click to copy)");
    n.entry.landed("anything");
    expect(n.pinned).toBe(true);
  });
});

describe("the paused pill", () => {
  it("carries the backup's trouble text, empty when healthy", () => {
    expect(n.state.trouble).toBe("");
    n.setTrouble("backups paused — click to resume");
    expect(n.state.trouble).toBe("backups paused — click to resume");
    n.setTrouble("");
    expect(n.state.trouble).toBe("");
  });
});
