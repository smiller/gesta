/* Timers are faked; the clipboard is a fake that can refuse. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { alertLedger, liveAlerts, IDLE_TEXT, INFO_MS, WARNING_MS, type Alerts } from "./alertLedger.svelte.ts";
import { said } from "../model/alertText.ts";

let copied: string[];
let refuseCopy = false;
let n: Alerts;
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
  n = alertLedger(copy);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("an info", () => {
  it("shows the text and hides after its time, the text staying for the fade", () => {
    expect(n.state.info.text).toBe(IDLE_TEXT);
    n.raise("entriesStored", { n: 1 });
    expect(n.state.info).toMatchObject({ text: "1 entry stored", shown: true });
    vi.advanceTimersByTime(2999);
    expect(n.state.info.shown).toBe(true);
    vi.advanceTimersByTime(1);
    expect(n.state.info).toMatchObject({ text: "1 entry stored", shown: false });
  });
  it("defaults its time", () => {
    n.raise("entriesStored", { n: 5 });
    vi.advanceTimersByTime(INFO_MS - 1);
    expect(n.state.info.shown).toBe(true);
    vi.advanceTimersByTime(1);
    expect(n.state.info.shown).toBe(false);
  });
  it("a later info restarts the clock", () => {
    n.raise("entriesStored", { n: 1 });
    vi.advanceTimersByTime(900);
    n.raise("entriesStored", { n: 2 });
    vi.advanceTimersByTime(900);
    expect(n.state.info).toMatchObject({ text: "2 entries stored", shown: true });
  });
  it("a click on an info copies its words and says so; a click on that dismisses it", async () => {
    n.raise("entriesStored", { n: 193 });
    n.click("info");
    await flush();
    expect(copied).toEqual(["193 entries stored"]);
    expect(n.state.success).toMatchObject({ text: "copied", shown: true });
    n.click("success");
    await flush();
    expect(copied).toEqual(["193 entries stored"]);
    expect(n.state.success.shown).toBe(false);
  });
  it("a routine success — saved, copied — only goes when clicked", async () => {
    for (const id of ["saved", "copied"] as const) {
      n.raise(id);
      n.click("success");
      await flush();
      expect(n.state.success.shown).toBe(false);
    }
    expect(copied).toEqual([]);
  });
  it("an info whose copy never answers fades on its own clock", () => {
    const stuck = alertLedger(() => new Promise(() => {}));
    stuck.raise("entriesStored", { n: 1 });
    stuck.click("info");
    vi.advanceTimersByTime(INFO_MS);
    expect(stuck.state.info.shown).toBe(false);
  });
  it("a click on an info already faded copies nothing", async () => {
    n.raise("entriesStored", { n: 1 });
    vi.advanceTimersByTime(INFO_MS);
    n.click("info");
    await flush();
    expect(copied).toEqual([]);
  });
});

describe("an error", () => {
  it("stands with its words, and an info beside it still speaks", () => {
    n.raise("notSaved", { copy: "detail" });
    expect(n.state.error).toMatchObject({ text: "not saved", shown: true });
    expect(n.errorShown).toBe(true);
    n.raise("oneWord");
    expect(n.state.info).toMatchObject({ text: "1 word", shown: true });
    vi.advanceTimersByTime(10000);
    expect(n.state.error.shown).toBe(true);
  });
  it("a click copies the detail, releases, and says copied", async () => {
    n.raise("notSaved", { copy: "detail" });
    n.click("error");
    expect(copied).toEqual(["detail"]);
    expect(n.errorShown).toBe(false);
    expect(n.state.error.shown).toBe(false);
    await flush();
    expect(n.state.success).toMatchObject({ text: "copied", shown: true });
    vi.advanceTimersByTime(1200);
    expect(n.state.success.shown).toBe(false);
  });
  it("copies the shown text when no detail was given", () => {
    n.raise("exportFailed", { why: "see console" });
    n.click("error");
    expect(copied).toEqual(["export failed — see console"]);
  });
  it("a refused clipboard says so, as an error", async () => {
    refuseCopy = true;
    n.raise("notSaved", { copy: "detail" });
    n.click("error");
    await flush();
    expect(n.state.error).toMatchObject({ text: "copy failed — see console", shown: true });
  });
  it("a success newer than the click stands the copied one down", async () => {
    n.raise("notSaved", { copy: "detail" });
    n.click("error");
    n.raise("saved");
    await flush();
    expect(n.state.success.text).toBe("saved");
  });
  it("an error with what was caught logs it and copies its text, else the shown text", () => {
    n.raise("bundleNotWritten", { caught: new DOMException("denied", "NotAllowedError") });
    n.click("error");
    n.raise("bundleNotWritten", { caught: null });
    n.click("error");
    expect(copied).toEqual(["NotAllowedError: denied", "backed up, but gesta.zip for the reader couldn’t be written"]);
    expect(console.error).toHaveBeenCalledTimes(2);
  });
  it("resolveError resolves only while the error is still the owner's", () => {
    const gen = n.raise("lineNumbersNotSaved", { caught: null });
    n.resolveError(gen);
    expect(n.state.error.shown).toBe(false);
    const g2 = n.raise("bookmarksNotSaved", { caught: null });
    n.raise("shortcutsNotSaved", { caught: null });
    n.resolveError(g2);
    expect(n.state.error.text).toBe("shortcuts not saved — storage full");
    n.resolveError(0);
    expect(n.state.error.text).toBe("shortcuts not saved — storage full");
  });
  it("a click where no error stands does nothing", () => {
    n.click("error");
    expect(copied).toEqual([]);
  });
});

describe("a warning", () => {
  it("stands beside an error and an info, each untouched", () => {
    n.raise("notSaved", { copy: "detail" });
    n.raise("refTwoBlocks");
    n.raise("oneWord");
    expect(n.state.warning).toMatchObject({ text: "That spans two verse blocks — reference them one at a time", shown: true });
    expect(n.state.error.shown).toBe(true);
    expect(n.state.info).toMatchObject({ text: "1 word", shown: true });
    vi.advanceTimersByTime(INFO_MS);
    expect(n.state.warning.shown).toBe(true);
    expect(n.state.info.shown).toBe(false);
  });
  it("a click copies its words, clears it, and says copied", async () => {
    n.raise("noLineNumbers");
    n.click("warning");
    expect(copied).toEqual(["no line numbers here"]);
    expect(n.state.warning.shown).toBe(false);
    await flush();
    expect(n.state.success.text).toBe("copied");
  });
  it("the next warning replaces it, and another entry opened clears it", () => {
    n.raise("alreadyBookmarked");
    n.raise("noBookmark", { n: "3" });
    expect(n.state.warning.text).toBe("no bookmark 3");
    n.clearWarning();
    expect(n.state.warning.shown).toBe(false);
    n.click("warning");
    expect(copied).toEqual([]);
  });
});

describe("progress", () => {
  it("shows at once, holds the info place against an info, counts, and its ok ends it in a success", () => {
    const p = n.progress("exporting");
    expect(n.state.info).toMatchObject({ text: "exporting…", shown: true });
    expect(n.state.busy).toBe(true);
    n.raise("oneWord");
    expect(n.state.info.text).toBe("exporting…");
    p.step(2000, 7500);
    expect(n.state.info.text).toBe("exporting… 2000 / 7500");
    p.ok(said("exported", { n: 7500 }));
    expect(n.state.success.text).toBe("exported 7500 entries");
    expect(n.state.info.shown).toBe(false);
    expect(n.state.busy).toBe(false);
    vi.advanceTimersByTime(3000);
    expect(n.state.success.shown).toBe(false);
  });
  it("its fail raises an error and ends the line; its cancel hides the line", () => {
    n.progress("exporting").fail(said("exportFailed", { why: "x" }), "x");
    expect(n.state.error.text).toBe("export failed — x");
    expect(n.state.info.shown).toBe(false);
    expect(n.errorShown).toBe(true);
    n.click("error");
    n.progress("importing").cancel();
    expect(n.state.info.shown).toBe(false);
    expect(n.state.busy).toBe(false);
  });
  it("a click on the line while busy does nothing", () => {
    n.progress("exporting");
    n.click("info");
    expect(n.state.info).toMatchObject({ text: "exporting…", shown: true });
    expect(copied).toEqual([]);
  });
  it("a newer progress retires the older handle", () => {
    const a = n.progress("exporting");
    const b = n.progress("importing");
    a.step(1, 2);
    a.ok(said("nothingToExport"));
    expect(n.state.info.text).toBe("importing…");
    expect(n.state.busy).toBe(true);
    b.ok(said("imported", { n: 2 }));
    expect(n.state.busy).toBe(false);
  });
  it("an error standing is left by an op, and an error during one shows at once", () => {
    n.raise("bookmarksNotSaved", { copy: "old" });
    const p = n.progress("importing");
    expect(n.state.error.text).toBe("bookmarks not saved");
    n.raise("couldntDelete", { caught: new Error("x") });
    expect(n.state.error.text).toBe("couldn’t delete — reload");
    expect(n.state.info.text).toBe("importing…");
    p.ok(said("imported", { n: 2 }));
    expect(n.state.success.text).toBe("imported 2 entries");
  });
});

describe("the keyed save-error family, as the entry layer speaks it", () => {
  it("a stuck write raises an error with the refused text as the copy, and its landing releases", () => {
    n.entry.stuck("notSavedChangedElsewhere", new Error("stale"), "2026-09-07", "# my text");
    expect(n.state.error.text).toBe("not saved — changed in another tab, copy your text then reload");
    n.entry.landed("2026-09-07");
    expect(n.state.error.shown).toBe(false);
    expect(n.errorShown).toBe(false);
  });
  it("the error stands until the LAST owed key lands", () => {
    n.entry.stuck("notSaved", new Error("a"), "a");
    n.entry.stuck("notSaved", new Error("b"), "b");
    n.entry.landed("a");
    expect(n.errorShown).toBe(true);
    n.entry.landed("other");
    expect(n.errorShown).toBe(true);
    n.entry.landed("b");
    expect(n.errorShown).toBe(false);
  });
  it("a removed entry owes nothing", () => {
    n.entry.stuck("notSaved", new Error("a"), "a");
    n.entry.removed("a");
    expect(n.errorShown).toBe(false);
  });
  it("the copy payload is the error's text when no rescue was offered", () => {
    n.entry.stuck("notSaved", new DOMException("full", "QuotaExceededError"), "a");
    n.click("error");
    expect(copied).toEqual(["QuotaExceededError: full"]);
  });
  it("an error during an op shows at once, beside the progress line", () => {
    n.progress("importing");
    n.entry.stuck("notSaved", new Error("x"), "a");
    expect(n.state.error.text).toBe("not saved");
    expect(n.state.info.text).toBe("importing…");
  });
  it("a save error covered by another error comes back when that one is clicked, until its key lands", () => {
    n.entry.stuck("notSaved", new Error("x"), "a");
    n.raise("exportFailed", { why: "x" }, { copy: "x" });
    n.click("error");
    expect(n.state.error.text).toBe("not saved");
    n.click("error");
    expect(n.state.error.shown).toBe(false);
    n.entry.stuck("notSaved", new Error("x"), "a");
    n.entry.landed("a");
    n.raise("exportFailed", { why: "x" }, { copy: "x" });
    n.click("error");
    expect(n.state.error.shown).toBe(false);
  });
  it("a delete that failed for another reason raises an error unkeyed: no landing releases it", () => {
    n.entry.stuckUnkeyed("couldntDelete", new Error("x"));
    expect(n.state.error.text).toBe("couldn’t delete — reload");
    n.entry.landed("anything");
    expect(n.errorShown).toBe(true);
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
  it("closes each place without copying: an info, a warning, an error", async () => {
    n.raise("oneWord");
    n.raise("noLineNumbers");
    n.raise("notSaved", { copy: "detail" });
    n.dismiss("info");
    n.dismiss("warning");
    n.dismiss("error");
    await flush();
    expect(copied).toEqual([]);
    expect([n.state.info.shown, n.state.warning.shown, n.state.error.shown]).toEqual([false, false, false]);
    expect(n.errorShown).toBe(false);
  });
  it("a progress line has none to close; a save error covered by another comes back when that one is closed", () => {
    n.progress("exporting");
    n.dismiss("info");
    expect(n.state.info.shown).toBe(true);
    n.entry.stuck("notSaved", new Error("x"), "a");
    n.raise("exportFailed", { why: "x" }, { copy: "x" });
    n.dismiss("error");
    expect(n.state.error.text).toBe("not saved");
  });
});

describe("a warning fades", () => {
  it("after ten seconds, the text staying for the fade; a newer one restarts the clock", () => {
    n.raise("refSelect");
    vi.advanceTimersByTime(WARNING_MS - 1);
    expect(n.state.warning.shown).toBe(true);
    n.raise("noLineNumbers");
    vi.advanceTimersByTime(WARNING_MS - 1);
    expect(n.state.warning.shown).toBe(true);
    vi.advanceTimersByTime(1);
    expect(n.state.warning).toMatchObject({ text: "no line numbers here", shown: false });
  });
  it("an error does not", () => {
    n.raise("copyButtonFailed");
    vi.advanceTimersByTime(WARNING_MS * 10);
    expect(n.state.error.shown).toBe(true);
  });
});

describe("the live alerts", () => {
  it("each kind present only while live: none at rest, then what stands, the info gone when it fades", () => {
    expect(liveAlerts(n.state)).toEqual({});
    n.raise("notSaved", { copy: "detail" });
    n.raise("noLineNumbers");
    n.raise("entriesStored", { n: 1 });
    expect(liveAlerts(n.state)).toEqual({ error: "not saved", warning: "no line numbers here", info: "1 entry stored", latest: "info" });
    vi.advanceTimersByTime(INFO_MS);
    expect(liveAlerts(n.state)).toEqual({ error: "not saved", warning: "no line numbers here" });
  });
});

describe("each error and warning told as it is raised", () => {
  it("a warning, an error and a save error are told once each; an info and a save error brought back are not", () => {
    const told: string[] = [];
    const l = alertLedger(copy, (kind, text) => { told.push(kind + " " + text); });
    l.raise("oneWord");
    l.raise("noLineNumbers");
    l.entry.stuck("notSaved", new Error("x"), "a");
    l.raise("exportFailed", { why: "x" }, { copy: "x" });
    l.click("error");
    expect(l.state.error.text).toBe("not saved");
    expect(told).toEqual(["warning no line numbers here", "error not saved", "error export failed — x"]);
  });
});

describe("info and success, each in its own place", () => {
  it("an info and a success are shown at once, each in its place; a progress line is info and its end a success", () => {
    n.raise("oneWord");
    n.raise("linkCopied");
    expect([n.state.info.text, n.state.success.text, n.state.info.shown, n.state.success.shown]).toEqual(["1 word", "Link copied", true, true]);
    const p = n.progress("exporting");
    expect(n.state.info.text).toBe("exporting…");
    p.ok(said("exported", { n: 3 }));
    expect(n.state.success.text).toBe("exported 3 entries");
  });
  it("a success shows while a progress line holds the info place", () => {
    n.progress("exporting");
    n.raise("saved");
    expect(n.state.info).toMatchObject({ text: "exporting…", shown: true });
    expect(n.state.success).toMatchObject({ text: "saved", shown: true });
  });
  it("a copy made by a click is a success; a copy the clipboard refused is an error", async () => {
    n.raise("entriesStored", { n: 1 });
    n.click("info");
    await flush();
    expect(n.state.success).toMatchObject({ text: "copied", shown: true });
    refuseCopy = true;
    n.raise("entriesStored", { n: 2 });
    n.click("info");
    await flush();
    expect(n.state.error).toMatchObject({ text: "copy failed — see console", shown: true });
  });
});

describe("the newer of info and success", () => {
  it("is named among the live alerts while it is shown", () => {
    n.raise("entriesStored", { n: 12 });
    n.raise("saved");
    expect(liveAlerts(n.state).latest).toBe("success");
    n.raise("toReplace");
    expect(liveAlerts(n.state).latest).toBe("info");
    n.dismiss("info");
    expect(liveAlerts(n.state).latest).toBe(undefined);
  });
});

describe("the review's findings", () => {
  it("a save error covered by another error comes back when its owner resolves that one", () => {
    n.entry.stuck("notSaved", new Error("x"), "a");
    const g = n.raise("referenceNotCopied", { copy: "x" });
    n.resolveError(g);
    expect(n.state.error).toMatchObject({ text: "not saved", shown: true });
  });
  it("a routine success is held back while a save error stands; another success is not", () => {
    n.entry.stuck("notSaved", new Error("x"), "a");
    n.raise("saved");
    expect(n.state.success.shown).toBe(false);
    n.raise("linkCopied");
    expect(n.state.success).toMatchObject({ text: "Link copied", shown: true });
    n.entry.landed("a");
    n.raise("saved");
    expect(n.state.success).toMatchObject({ text: "saved", shown: true });
  });
  it("a click on the copy-failed error closes it without copying again", async () => {
    refuseCopy = true;
    n.raise("notSaved", { copy: "detail" });
    n.click("error");
    await flush();
    expect(n.state.error.text).toBe("copy failed — see console");
    copied = [];
    n.click("error");
    await flush();
    expect(copied).toEqual([]);
    expect(n.state.error.shown).toBe(false);
  });
  it("a log that cannot be written leaves the alert shown", () => {
    const l = alertLedger(copy, () => { throw new Error("log broken"); });
    l.raise("noLineNumbers");
    l.raise("notSaved");
    expect([l.state.warning.shown, l.state.error.shown]).toEqual([true, true]);
  });
});

describe("raise", () => {
  it("shows an alert by its id, in the place its kind names, with its words", () => {
    n.raise("notSaved");
    n.raise("alreadyBookmarked");
    n.raise("words", { n: 12 });
    n.raise("backedUp");
    expect(liveAlerts(n.state)).toEqual({ error: "not saved", warning: "already bookmarked", info: "12 words", success: "backed up", latest: "success" });
  });
  it("an info or a success stays its own time from the table, else the ledger's", () => {
    n.raise("saved");
    vi.advanceTimersByTime(1399);
    expect(n.state.success.shown).toBe(true);
    vi.advanceTimersByTime(1);
    expect(n.state.success.shown).toBe(false);
    n.raise("backedUp");
    vi.advanceTimersByTime(INFO_MS - 1);
    expect(n.state.success.shown).toBe(true);
  });
  it("an error carries what was caught and its copy, and answers its generation for resolveError", () => {
    const gen = n.raise("notSaved", { copy: "my text" });
    n.click("error");
    expect(copied).toEqual(["my text"]);
    const g2 = n.raise("bookmarksNotSaved", { caught: new DOMException("full", "QuotaExceededError") });
    n.resolveError(g2);
    expect(n.state.error.shown).toBe(false);
    expect(gen).toBeGreaterThan(0);
  });
  it("raises a Said a module chose, its parameters with it", () => {
    n.raise(said("noBookmark", { n: "4" }));
    expect(n.state.warning.text).toBe("no bookmark 4");
  });
});
