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
import { screenState, EMPTY_MASTHEAD } from "./chrome/screen.svelte.ts";
import { mastheadModel, panelRows, rootLabel, trimLabel, ECHO_CAP } from "./chrome/mastheadModel.ts";
import { typedName } from "./chrome/naming.ts";
import { scopeOptions, defaultScope, sameScope, resultLabel } from "./chrome/searchModel.ts";
import { searchIndex } from "./store/searchIndex.ts";
import { searchEntries, snippetRuns, SEARCH_CAP } from "./store/search.ts";
import { flattenDoc } from "./model/flatten.ts";
import { subEntrySpec, takenText, subTreeHasContent, blankSubTree, renamePrompt, deleteConfirm, deleteLanding, hostKey } from "./chrome/subEntries.ts";
import { retargetLinks, relabelLinks } from "./store/links.ts";
import { linkRefusal, insertLinkAfter } from "./editor/insertLink.ts";
import { mdLabel } from "./store/reference.ts";
import { pageParts, nsOf } from "./store/keys.ts";
import { journalOf } from "./store/headings.ts";
import { todayKey, entryKey, entryHash, KEYED_NS } from "./store/keys.ts";
import { registered, childrenOf } from "./store/lists.ts";
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
type Ns = "page" | "bookshelf";
const acts = {
  today: () => {}, export: () => {}, import: () => {}, backups: () => {}, clear: () => {}, resume: () => {},
  interval: (_n: number) => {}, panel: (_ns: Ns) => {}, newRoot: (_ns: Ns) => {},
  create: () => {}, rename: () => {}, delete: () => {},
  search: { toggle: (_open: boolean) => {}, query: (_q: string) => {}, scope: (_at: number) => {}, walk: (_dir: 1 | -1) => {}, enter: () => {}, pick: (_i: number) => {} },
};
const closePanel = (): void => { screen.panel = null; };
mount(Corner, { target: document.body, props: { notices, onResume: () => acts.resume() } });
const masthead = mount(Masthead, { target: document.body, anchor: document.querySelector("main")!, props: {
  screen, onToday: () => acts.today(), onExport: () => acts.export(), onImport: () => acts.import(),
  onBackups: () => acts.backups(), onClear: () => acts.clear(), onInterval: (n: number) => { screen.interval = n; acts.interval(n); },
  onPanel: (ns: Ns) => acts.panel(ns), onClosePanel: closePanel, onNewRoot: (ns: Ns) => acts.newRoot(ns),
  onCreate: () => acts.create(), onRename: () => acts.rename(), onDelete: () => acts.delete(),
  search: {
    onToggle: (open: boolean) => acts.search.toggle(open), onQuery: (q: string) => acts.search.query(q), onScope: (at: number) => acts.search.scope(at),
    onWalk: (dir: 1 | -1) => acts.search.walk(dir), onEnter: () => acts.search.enter(), onPick: (i: number) => acts.search.pick(i),
  },
} });
/* the panels are not modal: a click outside any panel or opener closes
   the slot, and so does Escape. Read from the target, not from
   propagation — the components' handlers are delegated, and a
   stopPropagation there would not reach a document listener anyway. */
document.addEventListener("click", (e) => {
  const t = e.target as Element | null;
  if (!t?.closest(".pages, .opener")) closePanel();
  /* the results are an opaque overlay over the entry: a click into the
     writing lands on them, so a click outside the row closes it */
  if (!t?.closest(".page-search")) acts.search.toggle(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closePanel(); acts.search.toggle(false); }
  /* ⌃⌘K toggles the Search row, the current app's chord */
  if (e.ctrlKey && e.metaKey && !e.shiftKey && !e.altKey && e.key === "k") { e.preventDefault(); acts.search.toggle(!screen.search.open); }
});

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
  screen.masthead = { ...EMPTY_MASTHEAD, crumbs: [{ text: "fixture " + fixture, href: null, title: "" }] };
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
      if (ekey !== shown.ekey) { closePanel(); sr.query = ""; sr.rows = []; sr.empty = ""; openRow(false); }   /* a navigation dismisses an overlay drawn for another entry, and the search with its query */
      if (ekey !== shown.ekey || stored !== shown.stored) { shown = { ekey, stored }; refreshMasthead(); relabelParent(ekey, stored); }
    },
    onEdit: () => backup.scheduleBackup(),
  });
  /* leaving the tab with a backup still pending writes it at once, after
     the session's own flush (registered first, so it runs first) */
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") backup.firePendingBackup(); });
  acts.interval = (n) => session.setInterval(n);
  acts.today = () => session.today();
  /* SEARCH. The index is built from the parsed text, once per session:
     MEASURED 4.4 s over the whole mirror under node, so it is built in
     chunks that yield — kicked off in idle time after the warm, and
     finished on demand under a progress line when a search comes first.
     After that every scan is a walk over the memo. The scan runs 150 ms
     after the last keystroke, off the query as TYPED; Enter and the
     arrows flush a pending scan first, so type-then-Enter opens the top
     row. A real navigation collapses the row and drops its query; a
     same-entry re-render leaves an open row alone. */
  const index = searchIndex(layer.cache, (md) => flattenDoc(parseMarkdown(md)).text);
  let indexing: Progress | null = null;
  const CHUNK_MS = 12;
  const buildIndex = (then?: () => void): void => {
    if (index.complete) { then?.(); return; }
    const { done, total } = index.step(performance.now() + CHUNK_MS);
    if (indexing) indexing.step(done, total);
    if (index.complete) { indexing?.ok("indexed " + total + " entries", 1400); indexing = null; then?.(); return; }
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
    if (then) setTimeout(() => buildIndex(then), 0);   /* wanted now: keep going, yielding only to paint */
    else if (idle) idle(() => buildIndex());
    else setTimeout(() => buildIndex(), 50);
  };
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  const sr = screen.search;
  const scopeNow = () => sr.options[sr.scopeAt]?.scope || defaultScope(session.current.date, session.current.tag);
  const renderSearch = (): void => {
    if (!sr.open) return;
    const q = sr.query.trim();
    sr.rows = []; sr.capped = false; sr.active = -1; sr.empty = "";
    if (!q) return;
    if (!layer.warmed) { sr.empty = layer.storeReadFailed ? "Couldn’t load entries." : "Still loading…"; return; }
    if (!index.complete) {
      if (!indexing) indexing = notices.progress("indexing…");
      buildIndex(renderSearch);
      return;
    }
    const scope = scopeNow();
    let results = searchEntries(index.rows(), q, scope);
    if (!results.length) { sr.empty = "No matches."; return; }
    sr.capped = results.length > SEARCH_CAP;
    if (sr.capped) results = results.slice(0, SEARCH_CAP);
    sr.rows = results.map((result) => ({ result, where: resultLabel(result, scope, journal), runs: snippetRuns(result.snippet, q) }));
    sr.active = 0;
  };
  const cancelScan = (): void => { if (searchTimer) clearTimeout(searchTimer); searchTimer = null; };
  const flushScan = (): void => { if (searchTimer) { cancelScan(); renderSearch(); } };
  const openRow = (open: boolean): void => {
    if (sr.open === open) return;
    cancelScan();
    sr.open = open;
    if (!open) { session.view?.focus(); return; }
    closePanel();
    session.flushSave();
    const c = session.current;
    sr.options = scopeOptions(c.date, c.tag, Object.keys(layer.cache), journal);
    const pre = defaultScope(c.date, c.tag);
    sr.scopeAt = Math.max(0, sr.options.findIndex((o) => sameScope(o.scope, pre)));
    setTimeout(() => masthead.focusSearch(), 0);
    renderSearch();
  };
  acts.search.toggle = openRow;
  acts.search.query = (q) => { sr.query = q; cancelScan(); searchTimer = setTimeout(() => { searchTimer = null; renderSearch(); }, 150); };
  acts.search.scope = (at) => { sr.scopeAt = at; cancelScan(); renderSearch(); };
  acts.search.walk = (dir) => {
    flushScan();
    if (!sr.rows.length) return;
    sr.active = (sr.active + dir + sr.rows.length) % sr.rows.length;
    document.querySelectorAll(".search-results li.hit")[sr.active]?.scrollIntoView({ block: "nearest" });
  };
  acts.search.pick = (i) => {
    const row = sr.rows[i];
    if (!row) return;
    const q = sr.query;   /* the query the row was BUILT for */
    openRow(false);
    session.jump(row.result.date, row.result.tag, { q, nth: row.result.nth }, true);
  };
  acts.search.enter = () => { flushScan(); if (sr.active >= 0) acts.search.pick(sr.active); };
  /* THE SUB-ENTRIES. Every gate over "what exists" refuses on a cold
     cache: a create would write into a blank painted over a real entry.
     A new name REGISTERS at once (an empty body, as a root does) so the
     lists hold it while it is empty; an existing name just opens. The
     link lands after the caret, never replacing a selection and never
     appended at the end; a caret with nowhere to land refuses before
     anything is minted. */
  const warmBlock = (): boolean => {
    if (layer.warmed) return false;
    say(layer.storeReadFailed ? "couldn’t load entries — reload first" : "still loading — try that again in a moment", 2500);
    return true;
  };
  const keysNow = (): string[] => Object.keys(layer.cache);
  const shownName = (date: string, tag: string): string => {
    const ns = nsOf(date), pp = pageParts(tag);
    return ns && !pp.sub ? rootLabel(date, tag, journal) : ns ? pp.leaf : tag;
  };
  /* the host's links to a moved or deleted sub-entry, rewritten in the
     store; the open host is re-rendered from the store afterwards */
  const retargetHost = (date: string, oldTag: string, newTag: string | null): Promise<unknown> => {
    const host = hostKey(date, oldTag);
    if (!host) return Promise.resolve();
    const oldLabel = nsOf(date) ? pageParts(oldTag).leaf : oldTag;
    const newLabel = newTag ? (nsOf(date) ? pageParts(newTag).leaf : newTag) : null;
    const out = retargetLinks(layer.entryMd(host), entryHash(date, oldTag), newTag ? entryHash(date, newTag) : null, oldLabel, newLabel);
    return out === null ? Promise.resolve() : layer.setEntry(host, out);
  };
  acts.create = () => {
    if (warmBlock()) return;
    const c = session.current;
    const ns = nsOf(c.date);
    const typedRaw = typedName(prompt(ns ? "Name for the new " + ns.subNoun + ":" : "Tag for the new entry:"));
    if (!typedRaw) return;
    if ("refuse" in typedRaw) { say(typedRaw.refuse); return; }
    const spec = subEntrySpec(c.date, c.tag, typedRaw.name);
    if (!spec) return;
    if ("refuse" in spec) { say(spec.refuse); return; }
    const key = entryKey(c.date, spec.full);
    if (registered(keysNow(), c.date, spec.full)) { session.goto(spec.href, "already here"); return; }
    const view = session.view;
    if (!view) { say("place your cursor in the entry", 2000); return; }
    const why = linkRefusal(view.state);
    if (why) { say(why, 2000); return; }
    insertLinkAfter(view, spec.href, mdLabel(spec.tag, "entry"));
    layer.setEntry(key, "").then(() => session.saveNow()).then(() => { refreshMasthead(); session.goto(spec.href); });
  };
  /* a rename is in flight from the prompt until its writes land: a second
     click replayed against the renamed state would move nothing yet still
     retarget the address to a name that holds nothing. The new key lands
     BEFORE the old one clears, so a crash between leaves a transient
     duplicate, never a lost entry. A sub-page renames by its leaf, within
     its parent; content-bearing descendants block, blanks are swept only
     past the prompt. */
  let renaming = false;
  acts.rename = () => {
    const c = session.current;
    if (!c.tag || renaming || warmBlock()) return;
    const date = c.date, old = c.tag, ns = nsOf(date), pp = ns ? pageParts(old) : null;
    if (ns && subTreeHasContent(keysNow(), layer.cache, entryKey(date, old))) { say("rename after the " + ns.subNoun + "s are deleted", 2500); return; }
    const oldLeaf = pp ? pp.leaf : old;
    const typedRaw = typedName(prompt(renamePrompt(date, old, shownName(date, old)), oldLeaf));
    if (!typedRaw) return;
    if ("refuse" in typedRaw) { say(typedRaw.refuse); return; }
    const leaf = typedRaw.name;
    if (leaf === oldLeaf) return;
    const listKey = pp && pp.sub ? entryKey(date, pp.parent) : date;
    if (childrenOf(keysNow(), listKey).indexOf(leaf) !== -1) { alert(takenText(listKey, leaf)); return; }
    const full = pp && pp.sub ? pp.parent + "/" + leaf : leaf;
    renaming = true;
    session.flushSave().then(() => {
      if (session.current.date !== date || session.current.tag !== old) return;
      const oldKey = entryKey(date, old), md = layer.entryMd(oldKey);
      const sweep = ns ? blankSubTree(keysNow(), oldKey).map((k) => layer.removeEntry(k)) : [];
      /* an EMPTY body moves too: the row is the registration here, where
         the current app re-listed the name in its index whatever the body */
      const moved = layer.setEntry(entryKey(date, full), md);
      return Promise.all([moved, ...sweep]).then(() => layer.removeEntry(oldKey)).then(() => retargetHost(date, old, full)).then(() => {
        history.replaceState(null, "", entryHash(date, full));
        session.open(date, full);
        refreshMasthead();
      });
    }).finally(() => { renaming = false; });
  };
  acts.delete = () => {
    const c = session.current;
    if (!c.tag || warmBlock()) return;
    const date = c.date, tag = c.tag, ns = nsOf(date);
    if (ns && subTreeHasContent(keysNow(), layer.cache, entryKey(date, tag))) { say("delete the " + ns.subNoun + "s first", 2500); return; }
    if (!confirm(deleteConfirm(date, tag, shownName(date, tag)))) return;
    const key = entryKey(date, tag);
    const sweep = ns ? blankSubTree(keysNow(), key).map((k) => layer.removeEntry(k)) : [];
    const back = deleteLanding(date, tag);
    /* the landing FIRST: opening another entry cancels the pending save
       that would otherwise resurrect this one */
    history.replaceState(null, "", entryHash(back.date, back.tag));
    session.open(back.date, back.tag);
    Promise.all([layer.removeEntry(key), ...sweep]).then(() => retargetHost(date, tag, null)).then(() => {
      session.open(back.date, back.tag);   /* the host's body may have lost a link */
      refreshMasthead();
      session.view?.focus();
    });
  };
  /* the parent's index link reads as a sub-page's TITLE: when a landed
     save moves a sub-page's first heading, the parent's minted labels
     follow — the bare name or the previous heading; a hand-written label
     stays. The previous heading is remembered per key from the last look. */
  const headingSeen: Record<string, string> = Object.create(null);
  const relabelParent = (ekey: string, stored: string): void => {
    const cut = ekey.indexOf("/");
    if (cut === -1) return;
    const date = ekey.slice(0, cut), tag = ekey.slice(cut + 1);
    if (!nsOf(date)) return;
    const pp = pageParts(tag);
    const heading = journal.heading(ekey);
    const before = ekey in headingSeen ? headingSeen[ekey] : heading;
    headingSeen[ekey] = heading;
    if (!pp.sub || before === heading || !stored) return;
    const parent = entryKey(date, pp.parent);
    const out = relabelLinks(layer.entryMd(parent), entryHash(date, tag), pp.leaf, before, heading);
    if (out !== null) layer.setEntry(parent, out);
  };
  /* an opener TOGGLES its own panel and displaces any other: the rows are
     built per open and never rebuilt while open — a live rebuild would
     detach a mid-click target. "No authors" is a claim about the journal,
     not made before the warm has read it. */
  acts.panel = (ns) => {
    if (screen.panel === ns) { closePanel(); return; }
    screen.panelRows = panelRows(ns, Object.keys(layer.cache), journal);
    screen.panelEmpty = ns !== "bookshelf" ? ""
      : !layer.warmed ? (layer.storeReadFailed ? "Couldn’t load the bookshelf." : "Still loading…")
      : "No authors yet — import a folder, or start one below.";
    screen.panel = ns;
  };
  /* create a namespace ROOT: prompt → the naming rule → register → go. An
     existing name just opens; a new one is stored with an empty body at
     once so the list holds it while it is empty (the export skips a blank,
     so nothing lands on disk) — and in the bookshelf, whose unknown keys
     are refused, that registration is what lets the address open at all.
     The echo is the LABEL, where the key is what was typed. */
  acts.newRoot = (ns) => {
    closePanel();
    const noun = KEYED_NS[ns].noun;
    const typed = typedName(prompt("Name for the new " + noun + ":"));
    if (!typed) return;
    if ("refuse" in typed) { say(typed.refuse); return; }
    const name = typed.name;
    const go = (): void => session.goto(entryHash(ns, name), "already on " + trimLabel(rootLabel(ns, name, journal), ECHO_CAP));
    if (registered(Object.keys(layer.cache), ns, name)) { go(); return; }
    layer.setEntry(entryKey(ns, name), "").then((landed) => { if (landed) go(); });
  };
  stage("start");
  const seeds: Record<string, string> = {
    "page/Horace": horace, "bookshelf/Browning, Robert/Pippa Passes": pippa,
    "2026-09-06": twelfth, "2026-09-05": williams, "page/Williams/Witchcraft 3": williams,
    "page/Links": "A link to [Horace](#page/Horace), one to [itself](#page/Links), and one [outside](https://example.org/).\n",
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
    buildIndex();
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
