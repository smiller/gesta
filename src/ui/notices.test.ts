/* Timers are faked; the clipboard is a fake that can refuse. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { noticeLedger, liveFlashes, IDLE_TEXT, WHISPER_MS, REFUSAL_MS, type Notices } from "./notices.svelte.ts";

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

describe("an info", () => {
  it("shows the text and hides after its time, the text staying for the fade", () => {
    expect(n.state.info.text).toBe(IDLE_TEXT);
    n.whisper("1 word", 3000);
    expect(n.state.info).toMatchObject({ text: "1 word", shown: true });
    vi.advanceTimersByTime(2999);
    expect(n.state.info.shown).toBe(true);
    vi.advanceTimersByTime(1);
    expect(n.state.info).toMatchObject({ text: "1 word", shown: false });
  });
  it("defaults its time", () => {
    n.whisper("saved");
    vi.advanceTimersByTime(WHISPER_MS - 1);
    expect(n.state.info.shown).toBe(true);
    vi.advanceTimersByTime(1);
    expect(n.state.info.shown).toBe(false);
  });
  it("a later whisper restarts the clock", () => {
    n.whisper("a", 1000);
    vi.advanceTimersByTime(900);
    n.whisper("b", 1000);
    vi.advanceTimersByTime(900);
    expect(n.state.info).toMatchObject({ text: "b", shown: true });
  });
  it("a click on a whisper copies its words and says so; a click on that dismisses it", async () => {
    n.whisper("removed 193 unused pictures");
    n.click("info");
    await flush();
    expect(copied).toEqual(["removed 193 unused pictures"]);
    expect(n.state.success).toMatchObject({ text: "copied", shown: true });
    n.click("success");
    await flush();
    expect(copied).toEqual(["removed 193 unused pictures"]);
    expect(n.state.success.shown).toBe(false);
  });
  it("a routine whisper — saved, copied, a failed copy — only goes when clicked", async () => {
    for (const text of ["saved", "copied", "copy failed — see console"]) {
      n.whisper(text);
      n.click("info");
      await flush();
      expect(n.state.info.shown).toBe(false);
    }
    expect(copied).toEqual([]);
  });
  it("a whisper whose copy never answers fades on its own clock", () => {
    const stuck = noticeLedger(() => new Promise(() => {}));
    stuck.whisper("removed 1 unused picture", 1000);
    stuck.click("info");
    vi.advanceTimersByTime(1000);
    expect(stuck.state.info.shown).toBe(false);
  });
  it("a click on a whisper already faded copies nothing", async () => {
    n.whisper("saved", 1000);
    vi.advanceTimersByTime(1000);
    n.click("info");
    await flush();
    expect(copied).toEqual([]);
  });
});

describe("a failure", () => {
  it("pins its words, and a whisper beside it still speaks", () => {
    n.stick("not saved", "detail");
    expect(n.state.failure).toMatchObject({ text: "not saved", shown: true });
    expect(n.pinned).toBe(true);
    n.whisper("1 word");
    expect(n.state.info).toMatchObject({ text: "1 word", shown: true });
    vi.advanceTimersByTime(10000);
    expect(n.state.failure.shown).toBe(true);
  });
  it("a click copies the detail, releases, and whispers copied", async () => {
    n.stick("not saved", "detail");
    n.click("failure");
    expect(copied).toEqual(["detail"]);
    expect(n.pinned).toBe(false);
    expect(n.state.failure.shown).toBe(false);
    await flush();
    expect(n.state.success).toMatchObject({ text: "copied", shown: true });
    vi.advanceTimersByTime(1200);
    expect(n.state.success.shown).toBe(false);
  });
  it("copies the shown text when no detail was given", () => {
    n.stick("export failed — see console");
    n.click("failure");
    expect(copied).toEqual(["export failed — see console"]);
  });
  it("a refused clipboard says so, as an error", async () => {
    refuseCopy = true;
    n.stick("not saved", "detail");
    n.click("failure");
    await flush();
    expect(n.state.failure).toMatchObject({ text: "copy failed — see console", shown: true });
  });
  it("a success newer than the click stands the copied one down", async () => {
    n.stick("not saved", "detail");
    n.click("failure");
    n.succeed("saved");
    await flush();
    expect(n.state.success.text).toBe("saved");
  });
  it("stickErr logs and copies the error's text, else the shown text", () => {
    n.stickErr("backup blocked", new DOMException("denied", "NotAllowedError"));
    n.click("failure");
    n.stickErr("backup blocked", null);
    n.click("failure");
    expect(copied).toEqual(["NotAllowedError: denied", "backup blocked"]);
    expect(console.error).toHaveBeenCalledTimes(2);
  });
  it("releasePin releases only while the failure is still the owner's", () => {
    const gen = n.stickErr("fence refused", null);
    n.releasePin(gen);
    expect(n.state.failure.shown).toBe(false);
    const g2 = n.stickErr("first", null);
    n.stickErr("second", null);
    n.releasePin(g2);
    expect(n.state.failure.text).toBe("second");
    n.releasePin(0);
    expect(n.state.failure.text).toBe("second");
  });
  it("a click where no failure stands does nothing", () => {
    n.click("failure");
    expect(copied).toEqual([]);
  });
});

describe("a refusal", () => {
  it("stands beside a failure and an info, each untouched", () => {
    n.stick("not saved", "detail");
    n.refuse("That spans two verse blocks — reference them one at a time");
    n.whisper("saved");
    expect(n.state.refusal).toMatchObject({ text: "That spans two verse blocks — reference them one at a time", shown: true });
    expect(n.state.failure.shown).toBe(true);
    expect(n.state.info).toMatchObject({ text: "saved", shown: true });
    vi.advanceTimersByTime(WHISPER_MS);
    expect(n.state.refusal.shown).toBe(true);
    expect(n.state.info.shown).toBe(false);
  });
  it("a click copies its words, clears it, and whispers copied", async () => {
    n.refuse("no line numbers here");
    n.click("refusal");
    expect(copied).toEqual(["no line numbers here"]);
    expect(n.state.refusal.shown).toBe(false);
    await flush();
    expect(n.state.success.text).toBe("copied");
  });
  it("the next refusal replaces it, and another entry opened clears it", () => {
    n.refuse("already bookmarked");
    n.refuse("no bookmark 3");
    expect(n.state.refusal.text).toBe("no bookmark 3");
    n.clearRefusal();
    expect(n.state.refusal.shown).toBe(false);
    n.click("refusal");
    expect(copied).toEqual([]);
  });
});

describe("progress", () => {
  it("shows at once, holds the info place against a whisper, counts, and its ok ends it in a success", () => {
    const p = n.progress("exporting…");
    expect(n.state.info).toMatchObject({ text: "exporting…", shown: true });
    expect(n.state.busy).toBe(true);
    n.whisper("saved");
    expect(n.state.info.text).toBe("exporting…");
    p.step(2000, 7500);
    expect(n.state.info.text).toBe("exporting… 2000 / 7500");
    p.ok("exported 7500 entries", 3000);
    expect(n.state.success.text).toBe("exported 7500 entries");
    expect(n.state.info.shown).toBe(false);
    expect(n.state.busy).toBe(false);
    vi.advanceTimersByTime(3000);
    expect(n.state.success.shown).toBe(false);
  });
  it("its fail pins a failure and ends the line; its cancel hides the line", () => {
    n.progress("exporting…").fail("export failed — x", "x");
    expect(n.state.failure.text).toBe("export failed — x");
    expect(n.state.info.shown).toBe(false);
    expect(n.pinned).toBe(true);
    n.click("failure");
    n.progress("importing…").cancel();
    expect(n.state.info.shown).toBe(false);
    expect(n.state.busy).toBe(false);
  });
  it("a click on the line while busy does nothing", () => {
    n.progress("exporting…");
    n.click("info");
    expect(n.state.info).toMatchObject({ text: "exporting…", shown: true });
    expect(copied).toEqual([]);
  });
  it("a newer progress retires the older handle", () => {
    const a = n.progress("exporting…");
    const b = n.progress("importing…");
    a.step(1, 2);
    a.ok("done");
    expect(n.state.info.text).toBe("importing…");
    expect(n.state.busy).toBe(true);
    b.ok("imported 2 entries");
    expect(n.state.busy).toBe(false);
  });
  it("a failure standing is left by an op, and a failure during one pins at once", () => {
    n.stick("old failure", "old");
    const p = n.progress("importing…");
    expect(n.state.failure.text).toBe("old failure");
    n.stickErr("couldn’t delete — reload", new Error("x"));
    expect(n.state.failure.text).toBe("couldn’t delete — reload");
    expect(n.state.info.text).toBe("importing…");
    p.ok("imported 1 entry");
    expect(n.state.success.text).toBe("imported 1 entry");
  });
});

describe("the keyed save-failure family, as the entry layer speaks it", () => {
  it("a stuck write pins with the refused text as the copy, and its landing releases", () => {
    n.entry.stuck("not saved — changed in another tab, copy your text then reload", new Error("stale"), "2026-09-07", "# my text");
    expect(n.state.failure.text).toBe("not saved — changed in another tab, copy your text then reload");
    n.entry.landed("2026-09-07");
    expect(n.state.failure.shown).toBe(false);
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
    n.click("failure");
    expect(copied).toEqual(["QuotaExceededError: full"]);
  });
  it("a failure during an op pins at once, beside the progress line", () => {
    n.progress("importing…");
    n.entry.stuck("not saved", new Error("x"), "a");
    expect(n.state.failure.text).toBe("not saved");
    expect(n.state.info.text).toBe("importing…");
  });
  it("a save failure covered by another failure comes back when that one is clicked, until its key lands", () => {
    n.entry.stuck("not saved", new Error("x"), "a");
    n.stick("export failed", "x");
    n.click("failure");
    expect(n.state.failure.text).toBe("not saved");
    n.click("failure");
    expect(n.state.failure.shown).toBe(false);
    n.entry.stuck("not saved", new Error("x"), "a");
    n.entry.landed("a");
    n.stick("export failed", "x");
    n.click("failure");
    expect(n.state.failure.shown).toBe(false);
  });
  it("a delete that failed for another reason pins unkeyed: no landing releases it", () => {
    n.entry.stuckIdle("couldn’t delete — reload", new Error("x"));
    expect(n.state.failure.text).toBe("couldn’t delete — reload");
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

describe("the dismiss ×", () => {
  it("closes each place without copying: an info, a refusal, a failure", async () => {
    n.whisper("1 word");
    n.refuse("no line numbers here");
    n.stick("not saved", "detail");
    n.dismiss("info");
    n.dismiss("refusal");
    n.dismiss("failure");
    await flush();
    expect(copied).toEqual([]);
    expect([n.state.info.shown, n.state.refusal.shown, n.state.failure.shown]).toEqual([false, false, false]);
    expect(n.pinned).toBe(false);
  });
  it("a progress line has none to close; a save failure covered by another comes back when that one is closed", () => {
    n.progress("exporting…");
    n.dismiss("info");
    expect(n.state.info.shown).toBe(true);
    n.entry.stuck("not saved", new Error("x"), "a");
    n.stick("export failed", "x");
    n.dismiss("failure");
    expect(n.state.failure.text).toBe("not saved");
  });
});

describe("a refusal fades", () => {
  it("after ten seconds, the text staying for the fade; a newer one restarts the clock", () => {
    n.refuse("Select a passage to reference first");
    vi.advanceTimersByTime(REFUSAL_MS - 1);
    expect(n.state.refusal.shown).toBe(true);
    n.refuse("no line numbers here");
    vi.advanceTimersByTime(REFUSAL_MS - 1);
    expect(n.state.refusal.shown).toBe(true);
    vi.advanceTimersByTime(1);
    expect(n.state.refusal).toMatchObject({ text: "no line numbers here", shown: false });
  });
  it("a failure does not", () => {
    n.stick("Copy failed");
    vi.advanceTimersByTime(REFUSAL_MS * 10);
    expect(n.state.failure.shown).toBe(true);
  });
});

describe("the live flashes", () => {
  it("each kind present only while live: none at rest, then what stands, the info gone when it fades", () => {
    expect(liveFlashes(n.state)).toEqual({});
    n.stick("not saved", "detail");
    n.refuse("no line numbers here");
    n.whisper("saved", 1000);
    expect(liveFlashes(n.state)).toEqual({ failure: "not saved", refusal: "no line numbers here", info: "saved", latest: "info" });
    vi.advanceTimersByTime(1000);
    expect(liveFlashes(n.state)).toEqual({ failure: "not saved", refusal: "no line numbers here" });
  });
});

describe("each failure and refusal told as it is raised", () => {
  it("a refusal, a failure and a save failure are told once each; a whisper and a save failure brought back are not", () => {
    const told: string[] = [];
    const l = noticeLedger(copy, (kind, text) => { told.push(kind + " " + text); });
    l.whisper("saved");
    l.refuse("no line numbers here");
    l.entry.stuck("not saved", new Error("x"), "a");
    l.stick("export failed", "x");
    l.click("failure");
    expect(l.state.failure.text).toBe("not saved");
    expect(told).toEqual(["refusal no line numbers here", "failure not saved", "failure export failed"]);
  });
});

describe("info and success, each in its own place", () => {
  it("a whisper is info, succeed a success, both shown at once; a progress line is info and its end a success", () => {
    n.whisper("1 word");
    n.succeed("Link copied");
    expect([n.state.info.text, n.state.success.text, n.state.info.shown, n.state.success.shown]).toEqual(["1 word", "Link copied", true, true]);
    const p = n.progress("exporting…");
    expect(n.state.info.text).toBe("exporting…");
    p.ok("exported 3 entries");
    expect(n.state.success.text).toBe("exported 3 entries");
  });
  it("a success shows while a progress line holds the info place", () => {
    n.progress("exporting…");
    n.succeed("saved");
    expect(n.state.info).toMatchObject({ text: "exporting…", shown: true });
    expect(n.state.success).toMatchObject({ text: "saved", shown: true });
  });
  it("a copy made by a click is a success; a copy the clipboard refused is an error", async () => {
    n.whisper("removed 1 unused picture");
    n.click("info");
    await flush();
    expect(n.state.success).toMatchObject({ text: "copied", shown: true });
    refuseCopy = true;
    n.whisper("removed 2 unused pictures");
    n.click("info");
    await flush();
    expect(n.state.failure).toMatchObject({ text: "copy failed — see console", shown: true });
  });
});

describe("the newer of info and success", () => {
  it("is named among the live flashes while it is shown", () => {
    n.whisper("12 entries stored");
    n.succeed("saved");
    expect(liveFlashes(n.state).latest).toBe("success");
    n.whisper("Source view, to replace");
    expect(liveFlashes(n.state).latest).toBe("info");
    n.dismiss("info");
    expect(liveFlashes(n.state).latest).toBe(undefined);
  });
});
