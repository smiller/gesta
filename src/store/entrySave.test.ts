import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { entrySave, SAVE_DEBOUNCE_MS, type OnScreen } from "./entrySave.ts";

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

function rig(stored: Record<string, string> = {}, screen: OnScreen | null = { ekey: "commonplace/A", md: "typed" }) {
  const writes: [string, string][] = [], wrote: boolean[] = [], refused: string[] = [];
  const layer = {
    storeReadFailed: false,
    lands: true,
    entryMd: (k: string): string => stored[k] ?? "",
    setEntry: (k: string, md: string): Promise<boolean> => { writes.push([k, md]); if (layer.lands) stored[k] = md; return Promise.resolve(layer.lands); },
  };
  const at = { screen };
  const save = entrySave({ screen: () => at.screen, layer, wrote: (landed) => wrote.push(landed), refused: (md) => refused.push(md) });
  return { save, writes, wrote, refused, layer, at, stored };
}

test("an edit is written once typing has paused for the debounce, and each write's outcome is told", async () => {
  const r = rig();
  r.save.edited();
  vi.advanceTimersByTime(SAVE_DEBOUNCE_MS - 1);
  expect(r.writes).toEqual([]);
  r.save.edited();
  vi.advanceTimersByTime(SAVE_DEBOUNCE_MS - 1);
  expect(r.writes).toEqual([]);
  await vi.advanceTimersByTimeAsync(1);
  expect(r.writes).toEqual([["commonplace/A", "typed"]]);
  expect(r.wrote).toEqual([true]);
  r.layer.lands = false;
  r.at.screen = { ekey: "commonplace/A", md: "typed again" };
  expect(await r.save.now()).toBe(false);
  expect(r.wrote).toEqual([true, false]);
});

test("nothing changed, or an empty entry never stored, writes nothing and answers true", async () => {
  expect(await rig({ "commonplace/A": "typed" }).save.now()).toBe(true);
  const empty = rig({}, { ekey: "commonplace/New", md: "  \n" });
  expect(await empty.save.now()).toBe(true);
  expect(empty.writes).toEqual([]);
});

test("no entry on screen, or a store that could not be read, writes nothing and answers false", async () => {
  expect(await rig({}, null).save.now()).toBe(false);
  const unread = rig();
  unread.layer.storeReadFailed = true;
  expect(await unread.save.now()).toBe(false);
  expect(unread.writes).toEqual([]);
});

test("a flush writes only what waits on the debounce", async () => {
  const r = rig();
  expect(await r.save.flush()).toBe(true);
  expect(r.writes).toEqual([]);
  r.save.edited();
  expect(await r.save.flush()).toBe(true);
  expect(r.writes).toEqual([["commonplace/A", "typed"]]);
  await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
  expect(r.writes).toHaveLength(1);
});

test("a flush writes the waiting edit, and an open after it cancels nothing", async () => {
  const r = rig();
  r.save.edited();
  await r.save.flush();
  r.save.opened("commonplace/A", "typed");
  expect(r.stored["commonplace/A"]).toBe("typed");
  expect(r.save.unsaved()).toBe(false);
});

test("after a flush the store holds what the screen shows", async () => {
  const r = rig({ "commonplace/A": "before" });
  r.save.edited();
  expect(r.save.unsaved()).toBe(true);
  await r.save.flush();
  expect(r.layer.entryMd("commonplace/A")).toBe(r.at.screen!.md);
  expect(r.save.unsaved()).toBe(false);
});

test("an entry deleted elsewhere is never written; text typed since is handed back, until the next open", async () => {
  const r = rig({ "commonplace/A": "typed" });
  r.save.deleted();
  expect(await r.save.now()).toBe(false);
  expect(r.refused).toEqual([]);
  r.at.screen = { ekey: "commonplace/A", md: "typed more" };
  expect(await r.save.now()).toBe(false);
  expect(r.refused).toEqual(["typed more"]);
  expect(r.writes).toEqual([]);
  r.save.opened("commonplace/A", "typed");
  expect(await r.save.now()).toBe(true);
  expect(r.writes).toEqual([["commonplace/A", "typed more"]]);
});

test("unsaved while a save waits, during a hand-over, or while the screen differs from the store", async () => {
  expect(rig({ "commonplace/A": "typed" }).save.unsaved()).toBe(false);
  expect(rig({ "commonplace/A": "other" }).save.unsaved()).toBe(true);
  const waiting = rig({ "commonplace/A": "typed" });
  waiting.save.edited();
  expect(waiting.save.unsaved()).toBe(true);
  const held = rig({ "commonplace/A": "typed" });
  await held.save.handOver("commonplace/A");
  expect(held.save.unsaved()).toBe(true);
  expect(rig({}, null).save.unsaved()).toBe(false);
});

test("a hand-over waits for the save, then holds every edit until the next open, and answers nothing once the entry has gone", async () => {
  const r = rig();
  r.save.edited();
  const h = await r.save.handOver("commonplace/A");
  expect(r.writes).toEqual([["commonplace/A", "typed"]]);
  expect(h?.md).toBe("typed");
  r.save.edited();
  await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
  expect(r.writes).toHaveLength(1);
  expect(await r.save.handOver("commonplace/Elsewhere")).toBeNull();
});

test("a hand-over landing writes only what was typed since it began, under the new key through the rewrite, and says it was written", async () => {
  const r = rig({ "commonplace/A": "typed" });
  const h = (await r.save.handOver("commonplace/A"))!;
  expect(await h.land("commonplace/B", (md) => md.toUpperCase())).toBe(true);
  expect(r.writes).toEqual([]);
  r.at.screen = { ekey: "commonplace/A", md: "typed more" };
  expect(await h.land("commonplace/B", (md) => md.toUpperCase())).toBe(true);
  expect(r.writes).toEqual([["commonplace/B", "TYPED MORE"]]);
  expect(r.wrote).toEqual([true]);
});

test("a hand-over kept writes what was typed since back under the old key", async () => {
  const r = rig({ "commonplace/A": "typed" });
  const h = (await r.save.handOver("commonplace/A"))!;
  r.at.screen = { ekey: "commonplace/A", md: "typed more" };
  await h.keep();
  expect(r.writes).toEqual([["commonplace/A", "typed more"]]);
});

test("leaving writes the waiting edit before it goes on", async () => {
  const r = rig();
  r.save.edited();
  const seen: [string, string][][] = [];
  await r.save.leave(() => { seen.push([...r.writes]); });
  expect(seen).toEqual([[["commonplace/A", "typed"]]]);
});

test("the store moved under the entry only when it changed since the last open or write and nothing was typed since", async () => {
  const r = rig({ "commonplace/A": "typed" });
  r.save.opened("commonplace/A", "typed");
  expect(r.save.moved()).toBe(false);
  r.stored["commonplace/A"] = "from an import";
  expect(r.save.moved()).toBe(true);
  r.at.screen = { ekey: "commonplace/A", md: "typed more" };
  r.save.edited();
  expect(r.save.moved()).toBe(false);
  await r.save.flush();
  expect(r.save.moved()).toBe(false);
});

test("the store moved is told from the stored text alone, whatever form the screen writes it back in", () => {
  const r = rig({ "commonplace/A": "x\n" }, { ekey: "commonplace/A", md: "x" });
  r.save.opened("commonplace/A", "x\n");
  expect(r.save.moved()).toBe(false);
  r.stored["commonplace/A"] = "y\n";
  expect(r.save.moved()).toBe(true);
});

test("an edit made while a write is out keeps the store from reading as moved until that edit is written", async () => {
  const r = rig({ "commonplace/A": "before" });
  r.save.opened("commonplace/A", "before");
  r.save.edited();
  await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS - 1);
  r.save.edited();
  r.stored["commonplace/A"] = "from an import";
  expect(r.save.moved()).toBe(false);
});

test("a hand-over's ends write nothing once the screen shows another entry", async () => {
  const r = rig({ "commonplace/A": "typed" });
  const h = (await r.save.handOver("commonplace/A"))!;
  r.at.screen = { ekey: "commonplace/Q", md: "another entry's text" };
  expect(await h.land("commonplace/B", (md) => md)).toBe(true);
  expect(await h.keep()).toBe(true);
  expect(r.writes).toEqual([]);
});

test("text typed during a rename of an entry deleted elsewhere still lands under the new name", async () => {
  const r = rig({ "commonplace/A": "typed" });
  const h = (await r.save.handOver("commonplace/A"))!;
  r.save.deleted();
  r.at.screen = { ekey: "commonplace/A", md: "typed more" };
  expect(await h.land("commonplace/B", (md) => md)).toBe(true);
  expect(r.writes).toEqual([["commonplace/B", "typed more"]]);
});

test("an edit that leaves the text as stored still counts as written: the store moving later reads as moved", async () => {
  const r = rig({ "commonplace/A": "typed" });
  r.save.opened("commonplace/A", "typed");
  r.save.edited();
  await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
  expect(r.writes).toEqual([]);
  r.stored["commonplace/A"] = "from an import";
  expect(r.save.moved()).toBe(true);
});

test("a hand-over of an entry deleted elsewhere hands nothing back before it lands what was typed", async () => {
  const r = rig({ "commonplace/A": "typed" });
  r.save.deleted();
  r.at.screen = { ekey: "commonplace/A", md: "typed more" };
  r.save.edited();
  const h = (await r.save.handOver("commonplace/A"))!;
  expect(r.refused).toEqual([]);
  await h.land("commonplace/B", (md) => md);
  expect(r.writes).toEqual([["commonplace/B", "typed more"]]);
});
