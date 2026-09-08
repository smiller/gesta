/* The page: the editor over the journal in the store, under the MASTHEAD
   and beside the CORNER — phase 3's components over the shared screen
   state — with phase 2's details pane still showing the markdown the
   editor holds beside what the store holds. This file is the wiring: the
   layer, the backup, the session and the ledger meet here, and the
   masthead's buttons call what each arm binds. `?fixture=pippa&interval=1` opens a fixture in SCRATCH — no
   store, no save — for a headless look as much as for a hand;
   `?store=write` writes one probe row; `?store=seed` writes the four
   fixtures as entries, for a headless look at the bridge over a profile no
   picker can fill; `?corner=pill` draws the paused pill. */
import "./editor/editor.css";
import "./chrome/chrome.css";
import { mount } from "svelte";
import { parseMarkdown } from "./model/parse.ts";
import { serializeMarkdown } from "./model/serialize.ts";
import { createEditor } from "./editor/editor.ts";
import { setLineInterval } from "./editor/lineNumbers.ts";
import { idbEntryStore, idbImageStore, idbBackupStore } from "./store/store.ts";
import { exportEntries } from "./store/exportEntries.ts";
import { writeFilesTo } from "./store/io.ts";
import { backupRunner, PAUSED_MSG } from "./store/backup.ts";
import { entryLayer } from "./store/entries.ts";
import { pickImportFiles } from "./store/pick.ts";
import type { Dir } from "./store/fsa.ts";
import { importFiles } from "./store/importFiles.ts";
import { entryDocs, isDoc, failMsg, errText } from "./store/files.ts";
import { startSession } from "./session.ts";
import { noticeLedger, type Progress } from "./chrome/notices.svelte.ts";
import { copyText } from "./chrome/clipboard.ts";
import { screenState } from "./chrome/screen.svelte.ts";
import { mastheadModel } from "./chrome/mastheadModel.ts";
import { journalOf } from "./store/headings.ts";
import { todayKey } from "./store/keys.ts";
import Corner from "./chrome/Corner.svelte";
import Masthead from "./chrome/Masthead.svelte";
import horace from "../fixtures/horace-odes-1.1.md?raw";
import pippa from "../fixtures/pippa-passes-intro.md?raw";
import twelfth from "../fixtures/twelfth-night-1.1.md?raw";
import williams from "../fixtures/williams-witchcraft-3.md?raw";

const fixtures: Record<string, string> = { horace, pippa, twelfth, williams };
const mountEl = document.getElementById("editor") as HTMLElement;
const out = document.getElementById("out") as HTMLElement;
const same = document.getElementById("same") as HTMLElement;
const root = document.documentElement;
const stage = (s: string): void => { root.dataset.probe = (root.dataset.probe || "") + s + ";"; };
const q = new URLSearchParams(location.search);

/* the chrome: the ledger over the clipboard writer, the corner at the
   body's end, the masthead before <main>, both over the shared screen
   state. The handlers the masthead calls are bound below, per arm. */
const notices = noticeLedger(copyText);
const say = notices.whisper;
const screen = screenState(q.get("interval") !== null ? +q.get("interval")! : 5);
const acts = {
  today: () => {}, export: () => {}, import: () => {}, backups: () => {}, clear: () => {}, resume: () => {},
  interval: (_n: number) => {},
};
mount(Corner, { target: document.body, props: { notices, onResume: () => acts.resume() } });
mount(Masthead, { target: document.body, anchor: document.querySelector("main")!, props: {
  screen, onToday: () => acts.today(), onExport: () => acts.export(), onImport: () => acts.import(),
  onBackups: () => acts.backups(), onClear: () => acts.clear(), onInterval: (n: number) => { screen.interval = n; acts.interval(n); },
} });

function showMd(md: string, source: string): void {
  out.textContent = md;
  const ok = md === source;
  same.textContent = ok ? "(identical to what the store holds)" : "(differs from what the store holds)";
  same.className = ok ? "" : "no";
}

const layer = entryLayer(idbEntryStore(), notices.entry);
const images = idbImageStore();
const count = (): void => { root.dataset.store = String(Object.keys(layer.cache).length); };

const fixture = q.get("fixture");
if (fixture && fixtures[fixture]) {
  /* SCRATCH: the fixture in the editor, nothing stored, nothing saved */
  const md = fixtures[fixture];
  const gutter = (v: { dom: HTMLElement }): void => { screen.gutter = v.dom.classList.contains("versepage"); };
  const v = createEditor(mountEl, parseMarkdown(md), { interval: screen.interval, onChange: (v) => { showMd(serializeMarkdown(v.state.doc), md); gutter(v); } });
  showMd(md, md);
  gutter(v);
  screen.masthead = { crumbs: [{ text: "fixture " + fixture, href: null, title: "" }], leaf: null, title: "", tags: [], showToday: false };
  acts.interval = (n) => setLineInterval(n)(v.state, v.dispatch);
  root.dataset.store = "scratch";
} else {
  const win = window as unknown as { showDirectoryPicker?: (opts?: { mode?: "read" | "readwrite" }) => Promise<Dir> };
  /* the backup's status line is a whisper, each step restarting the clock:
     an autosave "saved" may overwrite "backing up…", as the current app
     let it (a background backup must not suppress the user's own save
     feedback), and a pin outranks both */
  const backupsLabel = (): void => { screen.backupsLabel = backup.configured ? "change backup folder…" : "set up automatic backups…"; };
  const backup = backupRunner({
    layer, images, store: idbBackupStore(),
    picker: win.showDirectoryPicker ? () => win.showDirectoryPicker!({ mode: "readwrite" }) : null,
    say,
    onTrouble: (msg) => { notices.setTrouble(msg); backupsLabel(); },
    stick: (text, err, copy) => { notices.stickErr(text, err, copy); },
  });
  backupsLabel();
  acts.backups = () => { backup.setupBackupFolder(); };
  acts.resume = () => { backup.resumeBackups(); };
  /* the masthead reads the open entry: recomputed when the entry or the
     text the store holds changes — an open, a landed save, an import's
     re-render — never per keystroke, since a day's tag list is a walk over
     every key. The heading behind the title row is memoised on the text. */
  const journal = journalOf(layer.cache);
  let shown = { ekey: "", stored: "" };
  const refreshMasthead = (): void => {
    const c = session.current;
    screen.masthead = mastheadModel(c.date, c.tag, Object.keys(layer.cache), journal, todayKey());
  };
  const session = startSession({
    mount: mountEl, layer, images, interval: screen.interval, say,
    onShow: (md, stored, ekey) => {
      showMd(md, stored);
      screen.gutter = !!session.view?.dom.classList.contains("versepage");
      if (ekey !== shown.ekey || stored !== shown.stored) { shown = { ekey, stored }; refreshMasthead(); }
    },
    onEdit: () => backup.scheduleBackup(),
  });
  /* leaving the tab with a backup still pending writes it at once, after
     the session's own flush (registered first, so it runs first) */
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") backup.firePendingBackup(); });
  acts.interval = (n) => session.setInterval(n);
  acts.today = () => session.today();
  stage("start");
  const seeds: Record<string, string> = {
    "page/Horace": horace, "bookshelf/Browning, Robert/Pippa Passes": pippa,
    "2026-09-06": twelfth, "2026-09-05": williams, "page/Williams/Witchcraft 3": williams,
  };
  const wrote = q.get("store") === "write" ? layer.setEntry("probe/" + Date.now(), "probe").then(() => stage("set"))
    : q.get("store") === "seed" ? Promise.all(Object.keys(seeds).map((k) => layer.setEntry(k, seeds[k]))).then(() => stage("seed"))
    : Promise.resolve();
  wrote.then(() => layer.warm()).then(() => {
    /* an unreadable journal is an error, not a status: it sticks, the
       caught failure copyable */
    if (layer.storeReadFailed) { stage("fail"); root.dataset.store = "failed: " + layer.storeReadError; notices.stickErr("the store could not be read — reload", layer.storeReadError); return; }
    stage("all"); count();
    say(Object.keys(layer.cache).length + " entries stored");
    session.openHash();
    /* `?corner=pill` draws the paused pill on a profile with no backup
       folder, AFTER the launch run, which clears the trouble of an
       unconfigured backup: the one state no headless run reaches */
    backup.runBackup().then(() => { if (q.get("corner") === "pill") notices.setTrouble(PAUSED_MSG); });
  });
  /* the manual export: a folder the user picks, filled with the journal as
     it stands. The picker opens FIRST, in the click, and so does the
     progress line; the flush and the walk run alongside. Nothing here
     deletes: the sweep belongs to the backup tiers, whose names this app
     reserves. A dismissed picker cancels the line silently. */
  acts.export = () => {
    if (!win.showDirectoryPicker) { say("export needs a browser that can open a folder to write into"); return; }
    if (!layer.warmed) { say("still loading — try that again in a moment"); return; }
    const dirPicked = win.showDirectoryPicker({ mode: "readwrite" });
    dirPicked.catch(() => {});
    const p = notices.progress("exporting…");
    session.flushSave().then(() => exportEntries(layer.cache, images)).then((files) => {
      if (!files.length) { p.ok("nothing to export"); return; }
      const docs = files.filter(isDoc).length;
      return dirPicked.then((dir) => writeFilesTo(dir, files, p.step)).then((failures) => {
        if (failures.length) {
          const lostDocs = failures.filter((x) => x.doc).length;
          console.error("export: " + failures.length + " file(s) failed", failures);
          const msg = "exported " + (docs - lostDocs) + " entries; " + failures.length + " file(s) failed";
          p.fail(msg, failures.map((x) => x.name + ": " + (errText(x.error) || String(x.error))).join("\n"));
        } else p.ok("exported " + docs + " entries");
      });
    }).catch((err: unknown) => {
      if ((err as Error)?.name === "AbortError") { p.cancel(); return; }
      console.error("export failed", err);
      const msg = (err as { collision?: boolean })?.collision ? "export failed — " + (err as Error).message : failMsg("export failed", err);
      p.fail(msg, msg);
    });
  };
  /* the picker opens synchronously in the click, then: names, the refusal,
     the read, the count-then-confirm gate, the progress line, the
     sequential import, the tally. The import NEVER clears — it overwrites
     entry by entry and deletes nothing, so a subset folder lands only its
     own entries. */
  acts.import = () => {
    if (!win.showDirectoryPicker) { say("import needs a folder picker"); return; }
    session.flushSave();
    let p: Progress | null = null;
    win.showDirectoryPicker().then(pickImportFiles).then((files) => {
      const docs = entryDocs(files);
      const n = docs.length;
      const refused = files.filter(isDoc).length - n;
      const refusedNote = refused ? refused + " .md file" + (refused === 1 ? "" : "s") + " will NOT be imported." : "";
      if (!n) { say(refused ? "nothing to import here — " + refusedNote : "nothing to import"); return; }
      const entries = n + (n === 1 ? " entry" : " entries");
      if (!confirm((refusedNote ? refusedNote + "\n\n" : "") + "Import " + entries +
          " from this folder? Each one overwrites that entry in this journal, and there is no undo.")) return;
      p = notices.progress("importing…");
      return importFiles(files, { setEntry: layer.setEntry, setImage: images.set }, p.step).then((tally) => {
        count();
        let msg = "imported " + tally.imported;
        if (tally.failed) {
          msg += ", " + tally.failed + " failed";
          console.error("import failures", tally.failures);
          p!.fail(msg, tally.failures.map((x) => x.path + ": " + x.error).join("\n"));
        } else p!.ok(msg + " entries");
        session.open(session.current.date, session.current.tag);   /* re-render in case the open entry was overwritten */
        refreshMasthead();   /* the key list moved under the tag bar */
      });
    }).catch((err: unknown) => {
      if ((err as Error)?.name === "AbortError") { p?.cancel(); return; }   /* the picker dismissed */
      console.error("import failed", err);
      const msg = failMsg("import failed", err);
      if (p) p.fail(msg, msg); else notices.stickErr("import failed", err);
    });
  };
  /* its own gesture, never the import's */
  acts.clear = () => {
    const n = Object.keys(layer.cache).length;
    if (!confirm("Delete all " + n + " stored entries and every picture? There is no undo.")) return;
    Promise.all([layer.clear(), images.clear()]).then(() => { count(); say("cleared"); session.open(session.current.date, session.current.tag); refreshMasthead(); },
      (err: unknown) => { notices.stickErr("clear failed", err); });
  };
}
