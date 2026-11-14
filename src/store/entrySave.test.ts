import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { entrySave, SAVE_DEBOUNCE_MS, type OnScreen } from "./entrySave.ts";

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

function rig(stored: Record<string, string> = {}, screen: OnScreen | null = { ekey: "page/A", md: "typed" }) {
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
  expect(r.writes).toEqual([["page/A", "typed"]]);
  expect(r.wrote).toEqual([true]);
  r.layer.lands = false;
  r.at.screen = { ekey: "page/A", md: "typed again" };
  expect(await r.save.now()).toBe(false);
  expect(r.wrote).toEqual([true, false]);
});

test("nothing changed, or an empty entry never stored, writes nothing and answers true", async () => {
  expect(await rig({ "page/A": "typed" }).save.now()).toBe(true);
  const empty = rig({}, { ekey: "page/New", md: "  \n" });
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
  expect(r.writes).toEqual([["page/A", "typed"]]);
  await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
  expect(r.writes).toHaveLength(1);
});

test("a flush writes the waiting edit, and an open after it cancels nothing", async () => {
  const r = rig();
  r.save.edited();
  await r.save.flush();
  r.save.opened();
  expect(r.stored["page/A"]).toBe("typed");
  expect(r.save.unsaved()).toBe(false);
});

test("suspended for a rename, a waiting edit and every later one write nothing until the next open", async () => {
  const r = rig();
  r.save.edited();
  r.save.suspend();
  await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
  r.save.edited();
  await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
  expect(r.writes).toEqual([]);
  expect(r.save.unsaved()).toBe(true);
  r.save.opened();
  r.save.edited();
  await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
  expect(r.writes).toEqual([["page/A", "typed"]]);
});

test("after a flush the store holds what the screen shows", async () => {
  const r = rig({ "page/A": "before" });
  r.save.edited();
  expect(r.save.unsaved()).toBe(true);
  await r.save.flush();
  expect(r.layer.entryMd("page/A")).toBe(r.at.screen!.md);
  expect(r.save.unsaved()).toBe(false);
});

test("an entry deleted elsewhere is never written; text typed since is handed back, until the next open", async () => {
  const r = rig({ "page/A": "typed" });
  r.save.deleted();
  expect(await r.save.now()).toBe(false);
  expect(r.refused).toEqual([]);
  r.at.screen = { ekey: "page/A", md: "typed more" };
  expect(await r.save.now()).toBe(false);
  expect(r.refused).toEqual(["typed more"]);
  expect(r.writes).toEqual([]);
  r.save.opened();
  expect(await r.save.now()).toBe(true);
  expect(r.writes).toEqual([["page/A", "typed more"]]);
});

test("unsaved while a save waits, while suspended, or while the screen differs from the store", () => {
  expect(rig({ "page/A": "typed" }).save.unsaved()).toBe(false);
  expect(rig({ "page/A": "other" }).save.unsaved()).toBe(true);
  const waiting = rig({ "page/A": "typed" });
  waiting.save.edited();
  expect(waiting.save.unsaved()).toBe(true);
  const held = rig({ "page/A": "typed" });
  held.save.suspend();
  expect(held.save.unsaved()).toBe(true);
  expect(rig({}, null).save.unsaved()).toBe(false);
});
