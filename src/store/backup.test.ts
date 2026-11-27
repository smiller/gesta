import { test, expect, vi, afterEach } from "vitest";
import { backupRunner, PAUSED_MSG, PERMISSION_MS } from "./backup.ts";
import { memBackupStore, memImageStore } from "./store.ts";
import type { EntryLayer } from "./entries.ts";
import type { Dir } from "./fsa.ts";

afterEach(() => { vi.useRealTimers(); });

/* a folder whose permission check answers with `answers`, one call after another; `null` never answers */
function folder(answers: (PermissionState | null)[]): Dir & { asked: number } {
  const d = {
    kind: "directory", name: "gesta-backups", asked: 0,
    queryPermission: () => { const a = answers[Math.min(d.asked++, answers.length - 1)]; return a === null ? new Promise<PermissionState>(() => {}) : Promise.resolve(a); },
  };
  return d as unknown as Dir & { asked: number };
}
async function runner(h: Dir) {
  const store = memBackupStore();
  await store.set(h as unknown as FileSystemDirectoryHandle);
  const troubles: string[] = [], raised: string[] = [];
  const layer = { warmed: true, storeReadFailed: false, cache: { "2026-11-27": "a day" } } as unknown as EntryLayer;
  const b = backupRunner({ layer, images: memImageStore(), store, picker: () => Promise.resolve(h), raise: ((k: string) => { raised.push(k); }) as never, onTrouble: (m) => troubles.push(m) });
  return { b, troubles, raised };
}

test("a permission check that never answers pauses the backups, and the next run asks again", async () => {
  vi.useFakeTimers();
  const h = folder([null, "prompt"]);
  const { b, troubles, raised } = await runner(h);
  const run = b.runBackup();
  await vi.advanceTimersByTimeAsync(PERMISSION_MS);
  await run;
  expect(troubles.at(-1)).toBe(PAUSED_MSG);
  expect(raised).not.toContain("backingUp");
  await b.runBackup();
  expect(h.asked).toBe(2);
});

test("a permission check answered in time is waited for", async () => {
  vi.useFakeTimers();
  const h = folder(["prompt"]);
  const { b, troubles } = await runner(h);
  await b.runBackup();
  expect(troubles.at(-1)).toBe(PAUSED_MSG);
  expect(h.asked).toBe(1);
});

test("the folder's name is known once a run has read it", async () => {
  const h = folder(["prompt"]);
  const { b } = await runner(h);
  expect(b.folder).toBeNull();
  await b.runBackup();
  expect(b.folder).toBe("gesta-backups");
});
