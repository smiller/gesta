/* Phase 2's screen: the editor over the journal in the store. The address
   names the entry; the bar walks, imports and clears; the details pane
   shows the markdown the editor holds beside what the store holds. The
   chrome is phase 3. `?fixture=pippa&interval=1` opens a fixture in
   SCRATCH — no store, no save — for a headless look as much as for a hand;
   `?store=write` writes one probe row; `?store=seed` writes the four
   fixtures as entries, for a headless look at the bridge over a profile no
   picker can fill. */
import "./editor/editor.css";
import { parseMarkdown } from "./model/parse.ts";
import { serializeMarkdown } from "./model/serialize.ts";
import { createEditor } from "./editor/editor.ts";
import { setLineInterval } from "./editor/lineNumbers.ts";
import { idbEntryStore, idbImageStore, idbBackupStore } from "./store/store.ts";
import { exportEntries } from "./store/exportEntries.ts";
import { writeFilesTo } from "./store/io.ts";
import { backupRunner } from "./store/backup.ts";
import { entryLayer } from "./store/entries.ts";
import { pickImportFiles } from "./store/pick.ts";
import type { Dir } from "./store/fsa.ts";
import { importFiles } from "./store/importFiles.ts";
import { entryDocs, isDoc, failMsg } from "./store/files.ts";
import { startSession } from "./session.ts";
import horace from "../fixtures/horace-odes-1.1.md?raw";
import pippa from "../fixtures/pippa-passes-intro.md?raw";
import twelfth from "../fixtures/twelfth-night-1.1.md?raw";
import williams from "../fixtures/williams-witchcraft-3.md?raw";

const fixtures: Record<string, string> = { horace, pippa, twelfth, williams };
const mount = document.getElementById("editor") as HTMLElement;
const out = document.getElementById("out") as HTMLElement;
const same = document.getElementById("same") as HTMLElement;
const interval = document.getElementById("interval") as HTMLSelectElement;
const status = document.getElementById("status") as HTMLElement;
const paused = document.getElementById("paused") as HTMLElement;
const backupsBtn = document.getElementById("backups") as HTMLButtonElement;
const where = document.getElementById("where") as HTMLElement;
const root = document.documentElement;
const stage = (s: string): void => { root.dataset.probe = (root.dataset.probe || "") + s + ";"; };
const say = (text: string): void => { status.textContent = text; };
const q = new URLSearchParams(location.search);
if (q.get("interval") !== null) interval.value = q.get("interval")!;

function showMd(md: string, source: string, label: string): void {
  out.textContent = md;
  const ok = md === source;
  same.textContent = ok ? "(identical to what the store holds)" : "(differs from what the store holds)";
  same.className = ok ? "" : "no";
  where.textContent = label;
}

const layer = entryLayer(idbEntryStore(), {
  landed: () => {},
  removed: () => {},
  stuck: (text, err, ekey, rescue) => { console.error(text, ekey, err, rescue); say(text + " (" + ekey + ")"); },
  stuckIdle: (text, err) => { console.error(text, err); say(text); },
});
const images = idbImageStore();
const count = (): void => { root.dataset.store = String(Object.keys(layer.cache).length); };

const fixture = q.get("fixture");
if (fixture && fixtures[fixture]) {
  /* SCRATCH: the fixture in the editor, nothing stored, nothing saved */
  const md = fixtures[fixture];
  const v = createEditor(mount, parseMarkdown(md), { interval: +interval.value, onChange: (v) => showMd(serializeMarkdown(v.state.doc), md, "fixture " + fixture) });
  showMd(md, md, "fixture " + fixture);
  interval.addEventListener("change", () => setLineInterval(+interval.value)(v.state, v.dispatch));
  root.dataset.store = "scratch";
} else {
  const win = window as unknown as { showDirectoryPicker?: (opts?: { mode?: "read" | "readwrite" }) => Promise<Dir> };
  const backup = backupRunner({
    layer, images, store: idbBackupStore(),
    picker: win.showDirectoryPicker ? () => win.showDirectoryPicker!({ mode: "readwrite" }) : null,
    say,
    onTrouble: (msg) => { paused.hidden = !msg; paused.textContent = msg; backupsBtn.textContent = backup.configured ? "change backup folder…" : "set up automatic backups…"; },
    stick: (text, err, copy) => { console.error(text, err, copy); say(text); },
  });
  backupsBtn.textContent = backup.configured ? "change backup folder…" : "set up automatic backups…";
  backupsBtn.addEventListener("click", () => { backup.setupBackupFolder(); });
  paused.addEventListener("click", () => { backup.resumeBackups(); });
  const session = startSession({
    mount, layer, images, interval: +interval.value, say,
    onShow: (md, stored, ekey) => showMd(md, stored, ekey),
    onEdit: () => backup.scheduleBackup(),
  });
  /* leaving the tab with a backup still pending writes it at once, after
     the session's own flush (registered first, so it runs first) */
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") backup.firePendingBackup(); });
  interval.addEventListener("change", () => session.setInterval(+interval.value));
  document.getElementById("prev")!.addEventListener("click", () => session.step("prev"));
  document.getElementById("next")!.addEventListener("click", () => session.step("next"));
  document.getElementById("today")!.addEventListener("click", () => session.today());
  stage("start");
  const seeds: Record<string, string> = {
    "page/Horace": horace, "bookshelf/Browning, Robert/Pippa Passes": pippa,
    "2026-09-06": twelfth, "2026-09-05": williams, "page/Williams/Witchcraft 3": williams,
  };
  const wrote = q.get("store") === "write" ? layer.setEntry("probe/" + Date.now(), "probe").then(() => stage("set"))
    : q.get("store") === "seed" ? Promise.all(Object.keys(seeds).map((k) => layer.setEntry(k, seeds[k]))).then(() => stage("seed"))
    : Promise.resolve();
  wrote.then(() => layer.warm()).then(() => {
    if (layer.storeReadFailed) { stage("fail"); root.dataset.store = "failed: " + layer.storeReadError; say("the store could not be read — reload"); return; }
    stage("all"); count();
    say(Object.keys(layer.cache).length + " entries stored");
    session.openHash();
    backup.runBackup();
  });
  /* the manual export: a folder the user picks, filled with the journal as
     it stands. The picker opens FIRST, in the click; the flush and the walk
     run alongside. Nothing here deletes: the sweep belongs to the backup
     tiers, whose names this app reserves. */
  document.getElementById("export")!.addEventListener("click", () => {
    if (!win.showDirectoryPicker) { say("export needs a browser that can open a folder to write into"); return; }
    if (!layer.warmed) { say("still loading — try that again in a moment"); return; }
    const dirPicked = win.showDirectoryPicker({ mode: "readwrite" });
    dirPicked.catch(() => {});
    say("exporting…");
    session.flushSave().then(() => exportEntries(layer.cache, images)).then((files) => {
      if (!files.length) { say("nothing to export"); return; }
      const docs = files.filter(isDoc).length;
      return dirPicked.then((dir) => writeFilesTo(dir, files, (n, of) => say("exporting… " + n + " / " + of))).then((failures) => {
        if (failures.length) {
          const lostDocs = failures.filter((x) => x.doc).length;
          console.error("export: " + failures.length + " file(s) failed", failures);
          say("exported " + (docs - lostDocs) + " entries; " + failures.length + " file(s) failed");
        } else say("exported " + docs + " entries");
      });
    }).catch((err: unknown) => {
      if ((err as Error)?.name === "AbortError") { say(""); return; }
      console.error("export failed", err);
      say((err as { collision?: boolean })?.collision ? "export failed — " + (err as Error).message : failMsg("export failed", err));
    });
  });
  /* the picker opens synchronously in the click, then: names, the refusal,
     the read, the count-then-confirm gate, the sequential import, the tally.
     The import NEVER clears — it overwrites entry by entry and deletes
     nothing, so a subset folder lands only its own entries. */
  document.getElementById("import")!.addEventListener("click", () => {
    if (!win.showDirectoryPicker) { say("import needs a folder picker"); return; }
    session.flushSave();
    win.showDirectoryPicker().then(pickImportFiles).then((files) => {
      const docs = entryDocs(files);
      const n = docs.length;
      const refused = files.filter(isDoc).length - n;
      const refusedNote = refused ? refused + " .md file" + (refused === 1 ? "" : "s") + " will NOT be imported." : "";
      if (!n) { say(refused ? "nothing to import here — " + refusedNote : "nothing to import"); return; }
      const entries = n + (n === 1 ? " entry" : " entries");
      if (!confirm((refusedNote ? refusedNote + "\n\n" : "") + "Import " + entries +
          " from this folder? Each one overwrites that entry in this journal, and there is no undo.")) return;
      say("importing…");
      return importFiles(files, { setEntry: layer.setEntry, setImage: images.set },
        (done, total) => say("importing… " + done + " / " + total)).then((tally) => {
        count();
        let msg = "imported " + tally.imported;
        if (tally.failed) { msg += ", " + tally.failed + " failed"; console.error("import failures", tally.failures); }
        else msg += " entries";
        say(msg);
        session.open(session.current.date, session.current.tag);   /* re-render in case the open entry was overwritten */
      });
    }).catch((err: unknown) => {
      if ((err as Error)?.name === "AbortError") return;   /* the picker dismissed */
      console.error("import failed", err);
      say(failMsg("import failed", err));
    });
  });
  /* its own gesture, never the import's */
  document.getElementById("clear")!.addEventListener("click", () => {
    const n = Object.keys(layer.cache).length;
    if (!confirm("Delete all " + n + " stored entries and every picture? There is no undo.")) return;
    Promise.all([layer.clear(), images.clear()]).then(() => { count(); say("cleared"); session.open(session.current.date, session.current.tag); },
      (err: unknown) => { console.error("clear failed", err); say(failMsg("clear failed", err)); });
  });
}
