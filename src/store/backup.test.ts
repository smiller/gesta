import { test, expect, vi, afterEach } from "vitest";
import { backupRunner, PERMISSION_MS, type BackupState } from "./backup.ts";
import { memBackupStore, memImageStore } from "./store.ts";
import type { EntryLayer } from "./entries.ts";
import type { Dir } from "./fsa.ts";

afterEach(() => { vi.useRealTimers(); });

/* a folder whose permission check answers with `answers`, one call after another: `null` never answers, a
   [state, ms] pair answers that late; a request for permission is granted */
function folder(answers: (PermissionState | null | [PermissionState, number])[]): Dir & { asked: number } {
  const d = {
    kind: "directory", name: "gesta-backups", asked: 0,
    queryPermission: () => {
      const a = answers[Math.min(d.asked++, answers.length - 1)];
      if (a === null) return new Promise<PermissionState>(() => {});
      if (Array.isArray(a)) return new Promise<PermissionState>((r) => setTimeout(() => r(a[0]), a[1]));
      return Promise.resolve(a);
    },
    requestPermission: () => Promise.resolve("granted" as PermissionState),
  };
  return d as unknown as Dir & { asked: number };
}
async function runner(h: Dir) {
  const store = memBackupStore();
  await store.set(h as unknown as FileSystemDirectoryHandle);
  const troubles: BackupState["trouble"][] = [], raised: string[] = [], changes: BackupState[] = [];
  const layer = { warmed: true, storeReadFailed: false, cache: { "2026-11-27": "a day" } } as unknown as EntryLayer;
  const b = backupRunner({ layer, images: memImageStore(), store, picker: () => Promise.resolve(h), raise: ((k: string) => { raised.push(k); }) as never, onChange: (c) => { changes.push(c); troubles.push(c.trouble); } });
  return { b, troubles, raised, changes };
}

test("the runner says whether a folder is set up, its name and its trouble, each time one of them changes", async () => {
  vi.useFakeTimers();
  const h = folder(["prompt"]);
  const { b, changes } = await runner(h);
  expect(changes).toEqual([{ configured: false, trouble: "none", folder: null }]);
  await b.runBackup();
  expect(changes.slice(1)).toEqual([{ configured: true, trouble: "none", folder: "gesta-backups" }, { configured: true, trouble: "paused", folder: "gesta-backups" }]);
});

test("a run ending as the one before it did says nothing new", async () => {
  vi.useFakeTimers();
  const h = folder(["prompt", "prompt"]);
  const { b, changes } = await runner(h);
  await b.runBackup();
  expect(changes.at(-1)?.trouble).toBe("paused");
  const said = changes.length;
  await b.runBackup();
  expect(h.asked).toBe(2);
  expect(changes.length).toBe(said);
});

test("a permission check that never answers pauses the backups, and the next run asks again", async () => {
  vi.useFakeTimers();
  const h = folder([null, "prompt"]);
  const { b, troubles, raised } = await runner(h);
  const run = b.runBackup();
  await vi.advanceTimersByTimeAsync(PERMISSION_MS);
  await run;
  expect(troubles.at(-1)).toBe("paused");
  expect(raised).not.toContain("backingUp");
  await b.runBackup();
  expect(h.asked).toBe(2);
});

test("a permission check answered in time is waited for", async () => {
  vi.useFakeTimers();
  const h = folder(["prompt"]);
  const { b, troubles } = await runner(h);
  await b.runBackup();
  expect(troubles.at(-1)).toBe("paused");
  expect(h.asked).toBe(1);
});

test("the folder's name is known once a run has read it", async () => {
  const h = folder(["prompt"]);
  const { b } = await runner(h);
  expect(b.folder).toBeNull();
  await b.runBackup();
  expect(b.folder).toBe("gesta-backups");
});

test("a resume granted in the click runs without asking the permission check again", async () => {
  vi.useFakeTimers();
  const h = folder([null]);
  const { b, raised } = await runner(h);
  const run = b.runBackup();
  await vi.advanceTimersByTimeAsync(PERMISSION_MS);
  await run;
  await b.resumeBackups();
  expect(h.asked).toBe(1);
  expect(raised).toContain("backingUp");
});

test("a permission check answering granted after the wait unpauses and runs", async () => {
  vi.useFakeTimers();
  const h = folder([["granted", PERMISSION_MS + 1000], "granted"]);
  const { b, troubles, raised } = await runner(h);
  const run = b.runBackup();
  await vi.advanceTimersByTimeAsync(PERMISSION_MS);
  await run;
  expect(troubles.at(-1)).toBe("paused");
  await vi.advanceTimersByTimeAsync(1000);
  expect(troubles.at(-1)).toBe("none");
  expect(raised).toContain("backingUp");
});

test("a folder just picked runs without asking the permission check", async () => {
  const h = folder([null]);
  const { b, raised } = await runner(h);
  await b.setupBackupFolder();
  expect(h.asked).toBe(0);
  expect(raised).toContain("backingUp");
});

test("a folder picked whose save fails is not taken: the runner keeps the folder it had, and says so", async () => {
  const was = folder(["prompt"]), picked = Object.assign(folder(["prompt"]), { name: "elsewhere" });
  const store = memBackupStore();
  await store.set(was as unknown as FileSystemDirectoryHandle);
  const raised: string[] = [], changes: BackupState[] = [];
  const layer = { warmed: true, storeReadFailed: false, cache: { "2026-11-27": "a day" } } as unknown as EntryLayer;
  const b = backupRunner({ layer, images: memImageStore(), store, picker: () => Promise.resolve(picked), raise: ((k: string) => { raised.push(k); }) as never, onChange: (c) => { changes.push(c); } });
  await b.runBackup();
  store.set = () => Promise.reject(new Error("quota"));
  await b.setupBackupFolder();
  expect(raised).toContain("couldntSetUpBackups");
  expect(b.folder).toBe("gesta-backups");
  expect(changes.at(-1)?.folder).toBe("gesta-backups");
});
