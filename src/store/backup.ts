/* The automated durable export: the whole journal written to the
   remembered folder, on launch and on a long idle, split into the mirror
   and the day's archives by writeBackup. Ported 2026-09-07 from
   ../writer/src/js/35-automated-durable-export-the-i-o-orchestration.js
   as a factory over the layer, the stores and two callbacks — the status
   line and the trouble affordance — in place of the notice ledger. Restore
   is not new code: point the import at an archive you have unzipped. */
import { NS, todayKey } from "./keys.ts";
import { imgHash } from "./names.ts";
import { filePath, errText, failMsg, fsaFatal } from "./files.ts";
import { backupPlan, type Manifest, type Archived } from "./plans.ts";
import { writeBackup, type Failure } from "./io.ts";
import { exportEntries, archiveRoots } from "./exportEntries.ts";
import type { EntryLayer } from "./entries.ts";
import type { ImageStore, BackupStore } from "./store.ts";
import type { Dir } from "./fsa.ts";

export const BACKUP_SIG = NS + "backup.sig";
export const BACKUP_DATED = NS + "backup.dated";
export const BACKUP_ON = NS + "backup.on";
export const PAUSED_MSG = "backups paused — click to resume";
/* the idle debounce — 10 min, deliberately long: a folder write is heavier
   than a store put, and the dedup skips the no-change case anyway */
export const IDLE_MS = 600000;
/* a compact fingerprint over the entry BODIES alone, sorted; the backup
   bookkeeping is volatile and none of it is written to the folder, and
   hashing it made the signature differ every run. VERSIONED: bumping it
   forces exactly one rewrite, which is what puts a folder into a new
   shape. The NUL delimiter is spelled as an escape, never a literal byte. */
export function backupSig(cache: Record<string, string>): string {
  const keys = Object.keys(cache).sort();
  const s = keys.map((k) => k + "\u0000" + cache[k]).join("\u0000");
  return "2." + imgHash(s) + "." + s.length;
}
export interface BackupOptions {
  layer: EntryLayer;
  images: ImageStore;
  store: BackupStore;
  picker: (() => Promise<Dir>) | null;
  say: (text: string) => void;
  /* the ONE writer of the trouble state: "" is healthy, else the reason the
     last run did not complete, click-to-resume */
  onTrouble: (msg: string) => void;
  /* a failure worth keeping on screen, with the text to copy */
  stick: (text: string, err: unknown, copy?: string) => void;
}
export interface Backup {
  readonly configured: boolean;
  readonly trouble: string;
  runBackup(): Promise<void>;
  scheduleBackup(): void;
  firePendingBackup(): Promise<void> | null;
  setupBackupFolder(): Promise<void>;
  resumeBackups(): Promise<void>;
}
export function backupRunner(opts: BackupOptions): Backup {
  const { layer, images, store, picker, say, stick } = opts;
  /* the signature THIS TAB last committed, never stored: equal to the
     shared one means no other tab has written the folder since, the only
     ground on which this run may delete from it */
  let committedSig: string | null = null;
  /* a synchronous "a folder is configured" mirror for the edit hot path,
     seeded from the durable hint; the run's store read corrects it */
  let configured = !!localStorage.getItem(BACKUP_ON);
  let handle: Dir | null = null;   /* cached so a resume can requestPermission SYNCHRONOUSLY in the click */
  let running: Promise<void> | null = null;   /* the single-flight latch */
  let trouble = "";
  let timer: ReturnType<typeof setTimeout> | null = null;
  function setTrouble(msg: string): void { trouble = msg || ""; opts.onTrouble(configured ? trouble : ""); }
  /* self-sealing: resolves on both arms, never rejects, so the launch and
     idle callers need no catch. Gated on the warm: never back up a blank
     or unread cache. */
  function runBackup(): Promise<void> {
    if (running || !layer.warmed || layer.storeReadFailed) return running || Promise.resolve();
    const run = (handle ? Promise.resolve(handle) : store.get() as Promise<Dir | null>).then((h) => {
      /* a folder picked while we read: the newer pick wins, and this run
         is dropped rather than guarded line by line */
      if (handle && handle !== h) return;
      handle = h;
      configured = !!h;
      if (!h) { localStorage.removeItem(BACKUP_ON); setTrouble(""); return; }
      /* no gesture behind a launch or idle run, so only a handle already
         granted writes; a 'prompt' handle (a file:// tab after a restart)
         surfaces the paused affordance, whose click is the gesture */
      return h.queryPermission({ mode: "readwrite" }).then((perm) => {
        if (perm !== "granted") { setTrouble(PAUSED_MSG); return; }
        const today = todayKey(), sig = backupSig(layer.cache), lastSig = localStorage.getItem(BACKUP_SIG);
        const datedWas = localStorage.getItem(BACKUP_DATED);
        const plan = backupPlan(today, datedWas, sig, lastSig, committedSig !== null && lastSig === committedSig);
        if (!plan.writeMirror && !plan.dated) { setTrouble(""); return; }
        say("backing up…");
        /* the census's walk in the SAME tick as the export's snapshot: the
           export yields for seconds, and a walk taken after it reads the
           keys seconds of live typing later than the files it describes */
        const roots = archiveRoots(Object.keys(layer.cache));
        return Promise.all([exportEntries(layer.cache, images), store.getManifest(), store.getArchives()]).then(([files, m, a]) => {
          const manifest = (m || {}) as Manifest, archived = (a || {}) as Archived;
          /* ONE WALK, TWO ANSWERS: a NAME is spared when its pictures did not
             arrive; a FAULT joins the failures, to be answered there */
          const spare = [], picFaults: Failure[] = [];
          for (const f of files) {
            if (f.picsLost) spare.push(f.picsLost);
            if (f.picsFaulted) picFaults.push({ name: filePath(f), error: new Error("this entry's pictures could not be read"), doc: true });
          }
          return writeBackup({ dir: h, files, plan, manifest, archived, roots, unread: plan.reconcile ? spare : null,
            onProgress: (done, total) => say("backing up… " + done + " / " + total) }).then((written) => {
            const failures = written.concat(picFaults);
            /* a folder change repointed the handle mid-run: this run wrote
               the OLD folder, so commit nothing and claim nothing */
            if (h !== handle) return;
            /* EACH KIND OF FAILURE withholds only what it cannot vouch for: a
               lost WRITE withholds both scalars; a BLIND sweep the mirror's
               signature only; a failed DELETE neither, since every file the
               run was asked to write landed */
            const lostWrite = failures.some((x) => !x.sweep && !x.blind);
            const blind = failures.some((x) => x.blind);
            const datedThen = localStorage.getItem(BACKUP_DATED);   /* sampled BEFORE our own write */
            if (plan.dated && !lostWrite) localStorage.setItem(BACKUP_DATED, plan.dated);
            if (plan.writeMirror && !lostWrite && !blind) { localStorage.setItem(BACKUP_SIG, sig); committedSig = sig; }
            if (failures.length) {
              console.error("backup: " + failures.length + " file(s) failed\n" + failures.map((x) => x.name + " — " + (errText(x.error) || x.error)).join("\n"), failures);
            }
            if (lostWrite || blind) setTrouble("backup incomplete — click to retry");
            else if (failures.length) {
              /* a delete-only failure is not backup trouble: a resume click
                 could do nothing against a file something else holds open */
              setTrouble("");
              stick("backup couldn't remove " + failures.length + " old file(s)", failures[0].error, failures.map((x) => x.name).join(", "));
            } else { setTrouble(""); say("backed up"); }
            /* the commits, ONE AFTER THE OTHER: both ride in the same record.
               Another tab's dated run voids ours: the shared scalar moved
               under us, so we record nothing and the next dated run archives
               again. */
            let commits: Promise<void> = Promise.resolve();
            if (plan.writeMirror) commits = commits.then(() => {
              if (h !== handle) return;
              return store.setManifest(manifest).catch((err: unknown) => { console.error("backup: could not store the file manifest — the next run will rewrite everything", err); });
            });
            if (plan.dated && datedThen !== datedWas) return commits;
            if (plan.dated) commits = commits.then(() => {
              if (h !== handle) return;
              return store.setArchives(archived).catch((err: unknown) => { console.error("backup: could not store the archive signatures — the next dated run will re-archive everything", err); });
            });
            return commits;
          });
        });
      });
    }).catch((err: unknown) => {
      /* a DETERMINISTIC failure gets no retry affordance: the same journal
         throws the same error on every retry */
      if (err && (err as { collision?: boolean }).collision) {
        setTrouble("backup blocked — two entries share a filename");
        stick("backup blocked — " + (err as Error).message, err, (err as Error).message);
        return;
      }
      console.error("backup failed", err);
      setTrouble(fsaFatal(err) ? PAUSED_MSG : "backup failed — click to retry");
    }).then(() => { running = null; }, () => { running = null; });
    running = run;
    return run;
  }
  function scheduleBackup(): void {
    if (!configured || !picker) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(firePendingBackup, IDLE_MS);
  }
  /* run the ARMED backup now and disarm — the idle timer's own callback and
     the leave-the-tab capture: a hidden tab's timers are throttled or never
     served. A fire while a run is in flight chains a FRESH run behind it. */
  function firePendingBackup(): Promise<void> | null {
    if (!timer) return null;
    clearTimeout(timer);
    timer = null;
    if (running) return running.then(() => runBackup());
    return runBackup();
  }
  /* the one-time gesture: pick a folder, PERSIST its handle, back up at
     once. The picker opens synchronously in the click. */
  function setupBackupFolder(): Promise<void> {
    if (!picker) { say("automatic backups need a Chromium browser"); return Promise.resolve(); }
    return picker().then((h) => {
      handle = h;
      return store.set(h as unknown as FileSystemDirectoryHandle).then(() => {
        configured = true;
        localStorage.setItem(BACKUP_ON, "1");
        localStorage.removeItem(BACKUP_SIG);   /* the first backup writes everything */
        localStorage.removeItem(BACKUP_DATED);
        setTrouble("");
        return Promise.resolve(running).then(runBackup);
      });
    }).catch((err: unknown) => {
      if (err && (err as Error).name === "AbortError") return;
      stick(failMsg("couldn't set up backups", err), err);
    });
  }
  /* the paused affordance's click: requestPermission re-grants the CACHED
     handle SYNCHRONOUSLY, as the first statement, since it needs the
     click's activation */
  function resumeBackups(): Promise<void> {
    if (!picker) return Promise.resolve();
    if (!handle) return setupBackupFolder();
    return handle.requestPermission({ mode: "readwrite" }).then((perm) => {
      if (perm === "granted") { setTrouble(""); return runBackup(); }
      setTrouble(PAUSED_MSG);
    }).catch((err: unknown) => {
      if (err && (err as Error).name === "AbortError") return;
      console.error("resume backups failed", err);
    });
  }
  return {
    get configured() { return configured; },
    get trouble() { return trouble; },
    runBackup, scheduleBackup, firePendingBackup, setupBackupFolder, resumeBackups,
  };
}
