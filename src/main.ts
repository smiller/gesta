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
import { gotoLevels, gotoPick } from "./chrome/gotoModel.ts";
import { askKind, lineHits, lineRefusal, nextHit, landingWord, folioHit, folioRefusal, askCheck } from "./editor/goto.ts";
import { landingPos, setLanding } from "./editor/landing.ts";
import { TextSelection } from "prosemirror-state";
import { parseBookmarks, serializeBookmarks, bookmarkIndex, aliasHolder, aliasRefusal, setBookmarkAlias, addBookmark, bookmarksFull, numberedBookmarks, type Bookmark } from "./store/bookmarks.ts";
import { reachableBookmarks, bookmarkRows, bookmarkFoot, bookmarkLabel, bookmarkLinkLabel, bookmarkParts, alreadyOn, typeAlias, resolveAlias, aliasCandidates } from "./chrome/bookmarksModel.ts";
import { NS } from "./store/keys.ts";
import { parseShortcuts, filterShortcuts, type Shortcut } from "./store/shortcuts.ts";
import { pageParts, nsOf } from "./store/keys.ts";
import { journalOf } from "./store/headings.ts";
import { todayKey, entryKey, entryHash, KEYED_NS } from "./store/keys.ts";
import { registered, childrenOf } from "./store/lists.ts";
import { hashParts } from "./store/nav.ts";
import Corner from "./chrome/Corner.svelte";
import Masthead from "./chrome/Masthead.svelte";
import Toolbar from "./chrome/Toolbar.svelte";
import CopyButton from "./chrome/CopyButton.svelte";
import { writeClipboard } from "./chrome/clipboard.ts";
import { richBlockHtml } from "./chrome/richCopy.ts";
import { schema } from "./model/schema.ts";
import { bold, italic, underline, strike, heading, quote, codeBlock, curlSelection, inCode, formatState, cutMd, replaceWithLink } from "./editor/format.ts";
import { firstHeading } from "./store/headings.ts";
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
type PanelName = Ns | "help" | "bookmarks" | "shortcuts" | "backups";
const acts = {
  today: () => {}, export: () => {}, import: () => {}, backups: () => {}, clear: () => {}, resume: () => {},
  backupsPanel: () => {},
  interval: (_n: number) => {}, panel: (_ns: PanelName) => {}, newRoot: (_ns: Ns) => {},
  create: () => {}, rename: () => {}, delete: () => {},
  goto: { toggle: (_open: boolean) => {}, pick: (_level: number, _value: string, _ns?: string) => {} },
  bar: (_act: string) => {},
  copyBlock: () => {},
  lines: (_open: boolean) => {},
  shortcuts: { query: (_q: string) => {}, pick: (_i: number) => {}, walk: (_d: 1 | -1) => {}, enter: () => {}, edit: () => {}, draft: (_v: string) => {}, save: () => {}, escape: () => {} },
  bookmarks: { key: (_e: KeyboardEvent) => {}, act: (_key: string, _what: "jump" | "del" | "key" | "link") => {}, draft: (_v: string) => {}, commit: (_v: string) => {} },
  lineBar: { toggle: () => {}, input: (_kind: "line" | "page", _v: string) => {}, enter: (_kind: "line" | "page", _v: string, _repeat: boolean) => {}, close: () => {} },
  search: { toggle: (_open: boolean) => {}, query: (_q: string) => {}, scope: (_at: number) => {}, walk: (_dir: 1 | -1) => {}, enter: () => {}, pick: (_i: number) => {} },
};
const closePanel = (): void => { screen.panel = null; };
mount(Corner, { target: document.body, props: { notices, onResume: () => acts.resume() } });
mount(Toolbar, { target: document.body, props: { bar: screen.bar, onAct: (act: string) => acts.bar(act) } });
mount(CopyButton, { target: document.body, props: { copy: screen.copy, onCopy: () => acts.copyBlock() } });
const masthead = mount(Masthead, { target: document.body, anchor: document.querySelector("main")!, props: {
  screen, onToday: () => acts.today(), onExport: () => acts.export(), onImport: () => acts.import(),
  onClear: () => acts.clear(), onInterval: (n: number) => { screen.interval = n; acts.interval(n); },
  onPanel: (ns: PanelName) => acts.panel(ns), onClosePanel: closePanel, onNewRoot: (ns: Ns) => acts.newRoot(ns),
  onCreate: () => acts.create(), onRename: () => acts.rename(), onDelete: () => acts.delete(),
  goto: { onToggle: (open: boolean) => acts.goto.toggle(open), onPick: (level: number, value: string, ns?: string) => acts.goto.pick(level, value, ns) },
  lineBar: { onInput: (kind: "line" | "page", v: string) => acts.lineBar.input(kind, v), onEnter: (kind: "line" | "page", v: string, repeat: boolean) => acts.lineBar.enter(kind, v, repeat), onClose: () => acts.lineBar.close() },
  shortcuts: { onQuery: (q: string) => acts.shortcuts.query(q), onPick: (i: number) => acts.shortcuts.pick(i), onWalk: (d: 1 | -1) => acts.shortcuts.walk(d), onEnter: () => acts.shortcuts.enter(), onEdit: () => acts.shortcuts.edit(), onDraft: (v: string) => acts.shortcuts.draft(v), onSave: () => acts.shortcuts.save(), onEscape: () => acts.shortcuts.escape() },
  backups: { onSetup: () => acts.backups(), onResume: () => acts.resume() },
  bookmarks: { onKey: (e: KeyboardEvent) => acts.bookmarks.key(e), onAct: (key: string, what: "jump" | "del" | "key" | "link") => acts.bookmarks.act(key, what), onDraft: (v: string) => acts.bookmarks.draft(v), onCommit: (v: string) => acts.bookmarks.commit(v) },
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
  if (!t?.closest(".pages, .opener, .helppanel")) closePanel();
  /* the results are an opaque overlay over the entry: a click into the
     writing lands on them, so a click outside the row closes it */
  if (!t?.closest(".page-search")) acts.search.toggle(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closePanel(); acts.search.toggle(false); acts.goto.toggle(false); acts.lineBar.close(); if (screen.linesOpen) acts.lines(false); }
  if (!(e.ctrlKey && e.metaKey && !e.shiftKey && !e.altKey)) return;
  /* ⌃⌘K toggles the Search row, the current app's chord; ⌃⌘N is "new" —
     a tagged entry, a sub-page, a book — reserved for it in phase 1 */
  if (e.key === "k") { e.preventDefault(); acts.search.toggle(!screen.search.open); }
  else if (e.key === "j") { e.preventDefault(); acts.goto.toggle(!screen.goto.open); }
  else if (e.key === "g") { e.preventDefault(); acts.lineBar.toggle(); }
  else if (e.key === "h") { e.preventDefault(); acts.panel("help"); }
  else if (e.key === "b") { e.preventDefault(); acts.panel("bookmarks"); }
  else if (e.key === "s") { e.preventDefault(); acts.panel("shortcuts"); }
  /* ⌃⌘L toggles the Line numbering row — L for lines; Tab belongs to
     indent, so no masthead row is reachable from the editor without a
     chord of its own */
  else if (e.key === "l") { e.preventDefault(); acts.lines(!screen.linesOpen); }
  else if (e.key === "n") { e.preventDefault(); acts.create(); }
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
  /* the backups panel reads the runner's state at its open and again on
     every trouble change while it stands */
  const readBackups = (): void => {
    screen.backups.canPick = !!win.showDirectoryPicker;
    screen.backups.configured = backup.configured;
    screen.backups.trouble = backup.trouble;
    screen.backups.warm = layer.storeReadFailed ? "failed" : layer.warmed ? "ok" : "loading";
  };
  const backup = backupRunner({
    layer, images, store: idbBackupStore(),
    picker: win.showDirectoryPicker ? () => win.showDirectoryPicker!({ mode: "readwrite" }) : null,
    say,
    onTrouble: (msg) => { notices.setTrouble(msg); if (screen.panel === "backups") readBackups(); },
    stick: (text, err, copy) => { notices.stickErr(text, err, copy); },
  });
  acts.backups = () => { backup.setupBackupFolder().then(readBackups); };
  acts.resume = () => { backup.resumeBackups().then(readBackups); };
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
    stick: (text) => { notices.stick(text); },
    pin: (text) => notices.stick(text), releasePin: (gen) => notices.releasePin(gen),
    onShow: (md, stored, ekey) => {
      showMd(md, stored);
      screen.gutter = !!session.view?.dom.classList.contains("versepage");
      if (ekey !== shown.ekey) { closePanel(); sr.query = ""; sr.rows = []; sr.empty = ""; openRow(false); gotoRow(false); closeLineBar(); }   /* a navigation dismisses an overlay drawn for another entry, the search with its query, and the go-to line whose preselects it made stale */
      if (ekey !== shown.ekey || stored !== shown.stored) { shown = { ekey, stored }; refreshMasthead(); relabelParent(ekey, stored); }
    },
    onEdit: () => backup.scheduleBackup(),
    onView: (md) => { screen.mdView = md; },
    onSelect: () => requestAnimationFrame(placeBar),
    onHighlight: () => suppressBar(),
  });
  /* leaving the tab with a backup still pending writes it at once, after
     the session's own flush (registered first, so it runs first) */
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") backup.firePendingBackup(); });
  acts.interval = (n) => session.setInterval(n);
  acts.today = () => session.today();
  /* ⌃⌘L: the Line numbering row opens with its select focused, closes
     with the caret back in the editor; refused where nothing is numbered */
  acts.lines = (open) => {
    if (open && !screen.gutter) { say("no line numbers here", 2000); return; }
    screen.linesOpen = open;
    if (open) { closePanel(); closeLineBar(); setTimeout(() => masthead.focusLines(), 0); }
    else session.view?.focus();
  };
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
  /* THE GO TO ROW: built fresh on every open — the lazy fill that keeps
     the list walks off the navigation hot path — with the first select
     focused; emptied on close. A terminal pick closes the row BEFORE the
     hash write, since a pick of the open entry moves no hash. Opening
     dismisses the overlays, which would cover the row just asked for;
     the row itself covers nothing, so an overlay opening leaves it alone.
     No save flush: it would rewrite an untouched entry. */
  const gotoWorld = () => ({ keys: keysNow(), cache: layer.cache, journal });
  const gotoRow = (open: boolean): void => {
    if (screen.goto.open === open) return;
    screen.goto.open = open;
    if (!open) { screen.goto.levels = []; session.view?.focus(); return; }
    closePanel();
    const c = session.current;
    screen.goto.levels = gotoLevels(gotoWorld(), c.date, c.tag);
    setTimeout(() => masthead.focusGoto(), 0);
  };
  acts.goto.toggle = gotoRow;
  acts.goto.pick = (level, value, ns) => {
    const c = session.current;
    const out = gotoPick(gotoWorld(), c.date, c.tag, screen.goto.levels, level, value, ns);
    if (!out) return;
    if ("jump" in out) { gotoRow(false); session.goto(out.jump, "already here"); return; }
    screen.goto.levels = out.levels;
  };
  /* CUSTOM SHORTCUTS (⌃⌘S): a code → text table in ONE localStorage key,
     raw text verbatim, device-local. The popup filters by prefix as you
     type and Enter or a row inserts the highlighted expansion at the
     caret, in either view. The editor's text is loaded ONLY on its
     hidden→shown transition and never while dirty, so a reopen after a
     close cannot wipe lines typed but not yet saved; only a landed Save
     makes it read as storage again. */
  const SHORTCUTS_KEY = NS + "shortcuts";
  const sc = screen.shortcuts;
  let shortcuts: Shortcut[] = parseShortcuts(localStorage.getItem(SHORTCUTS_KEY) || "");
  let shortcutsFailGen = 0;
  const renderShortcuts = (): void => {
    if (!shortcuts.length) { sc.rows = []; sc.empty = "No shortcuts yet — add some below."; sc.active = 0; if (!sc.editing) showEditor(true); return; }
    sc.rows = filterShortcuts(shortcuts, sc.query);
    sc.empty = sc.rows.length ? "" : "No matches.";
    sc.active = 0;
  };
  const showEditor = (on: boolean): void => {
    if (on && !sc.editing && !sc.dirty) sc.draft = localStorage.getItem(SHORTCUTS_KEY) || "";
    sc.editing = on;
  };
  const openShortcuts = (): void => {
    openRow(false); gotoRow(false); closeLineBar();
    sc.query = "";
    sc.editing = false;
    renderShortcuts();
    screen.panel = "shortcuts";
    setTimeout(() => masthead.focusShortcuts(), 0);
  };
  const insertShortcut = (expansion: string): void => {
    closePanel();
    if (!session.insertText(expansion)) say("place your cursor in the entry", 2000);
  };
  acts.shortcuts.query = (q) => { sc.query = q; renderShortcuts(); };
  acts.shortcuts.walk = (dir) => { if (sc.rows.length) sc.active = (sc.active + dir + sc.rows.length) % sc.rows.length; };
  acts.shortcuts.enter = () => { const row = sc.rows[sc.active]; if (row) insertShortcut(row.expansion); else say("no shortcut to insert", 2000); };
  acts.shortcuts.pick = (i) => { const row = sc.rows[i]; if (row) insertShortcut(row.expansion); };
  acts.shortcuts.edit = () => showEditor(!sc.editing);
  acts.shortcuts.draft = (v) => { sc.draft = v; sc.dirty = true; };
  acts.shortcuts.save = () => {
    try { localStorage.setItem(SHORTCUTS_KEY, sc.draft); }
    catch (e) { shortcutsFailGen = notices.stickErrIdle("shortcuts not saved — storage full", e); return; }
    notices.releasePin(shortcutsFailGen); shortcutsFailGen = 0;
    shortcuts = parseShortcuts(sc.draft);
    sc.dirty = false;
    renderShortcuts();
    say("shortcuts saved", 2000);
  };
  acts.shortcuts.escape = () => { closePanel(); session.view?.focus(); };
  /* BOOKMARKS (⌃⌘B): a list of pinned entries in ONE localStorage key —
     device-local, an accepted loss, the list being small and re-made in a
     minute. THE LATCH is where the cache and the store disagree on
     purpose: empty here, unreadable text there that somebody could still
     recover by hand, so writes are refused until a clean read. The two
     pages the current app pinned are seeded ONCE, when the key is absent;
     emptying the list writes "[]", which is present. */
  const BOOKMARKS_KEY = NS + "bookmarks";
  const bm = screen.bookmarks;
  let bookmarks: Bookmark[] = [];
  let bookmarksFailGen = 0;
  const loadBookmarks = (): void => {
    const read = parseBookmarks(localStorage.getItem(BOOKMARKS_KEY));
    bm.unreadable = read === null;
    bookmarks = read || [];
  };
  const saveBookmarks = (list: Bookmark[]): Error | null => {
    if (bm.unreadable) return new Error("bookmarks unreadable");
    try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(serializeBookmarks(list))); } catch (e) { return (e as Error) || new Error("setItem failed"); }
    loadBookmarks();
    return null;
  };
  const writeBookmarks = (list: Bookmark[]): boolean => {
    const err = saveBookmarks(list);
    if (err) { bookmarksFailGen = notices.stickErrIdle("bookmarks not saved", err); return false; }
    notices.releasePin(bookmarksFailGen);
    bookmarksFailGen = 0;
    return true;
  };
  loadBookmarks();
  if (localStorage.getItem(BOOKMARKS_KEY) === null) saveBookmarks([{ key: "page/Making Verity Cards", alias: "" }, { key: "page/Verdour", alias: "" }]);
  const hereKey = (): string => entryKey(session.current.date, session.current.tag);
  /* every render hands focus back: a delete removes the row its own
     button sits in, and "open" and "listening" must not disagree */
  const renderBookmarks = (): void => {
    bm.rows = bookmarkRows(bookmarks, hereKey(), journal);
    bm.foot = bookmarkFoot(bookmarks, hereKey(), journal);
    if (bm.buf && !aliasCandidates(bookmarks, bm.buf).length) bm.buf = "";
    setTimeout(() => { masthead.focusBookmarks(); bm.opening = 0; }, 0);
  };
  const openBookmarks = (): void => {
    openRow(false); gotoRow(false); closeLineBar();
    /* the sweep and its write together, gated on the warm: an absence and
       a deletion read the same, and only one should cost rows */
    if (layer.warmed) {
      const live = reachableBookmarks(bookmarks, keysNow());
      if (live.length !== bookmarks.length) writeBookmarks(live);
    }
    bm.editing = ""; bm.draft = ""; bm.buf = "";
    screen.panel = "bookmarks";
    renderBookmarks();
  };
  const jumpBookmark = (b: Bookmark): void => {
    const p = bookmarkParts(b.key);
    closePanel();
    session.goto(entryHash(p.date, p.tag), alreadyOn(b.key, journal));
  };
  const resolved = (r: { buf: string; jump?: Bookmark; say?: string }): void => {
    bm.buf = r.buf;
    if (r.jump) jumpBookmark(r.jump);
    else if (r.say) say(r.say, 2000);
  };
  const addOpenBookmark = (): void => {
    const here = hereKey();
    if (bookmarkIndex(bookmarks, here) !== -1) { say("already bookmarked", 2000); return; }
    if (bookmarksFull(bookmarks)) { say("bookmarks full — delete one, or give one its own key", 3000); return; }
    session.flushSave().then(() => {
      if (screen.panel !== "bookmarks") return;
      if (!reachableBookmarks([{ key: here, alias: "" }], keysNow()).length) { if (!warmBlock()) say("nothing to bookmark here yet", 2500); return; }
      const next = addBookmark(bookmarks, here);
      if (next && writeBookmarks(next)) renderBookmarks();
    });
  };
  acts.bookmarks.key = (e) => {
    if (e.key === "Escape") {
      if (bm.editing) { e.stopPropagation(); bm.editing = ""; bm.draft = ""; renderBookmarks(); return; }
      if (bm.buf) { e.stopPropagation(); bm.buf = ""; return; }
      closePanel(); session.view?.focus(); return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (bm.editing) return;   /* the editor keeps every other key; its Enter is its own */
    if (e.key === "Enter" && bm.buf) { e.preventDefault(); resolved(resolveAlias(bookmarks, bm.buf)); return; }
    if (!bm.buf && (e.key === "a" || e.key === "A")) { e.preventDefault(); addOpenBookmark(); return; }
    if (!bm.buf && e.key >= "1" && e.key <= "9" && e.key.length === 1) {
      e.preventDefault();
      const b = numberedBookmarks(bookmarks)[+e.key - 1];
      if (!b) say("no bookmark " + e.key, 2000); else jumpBookmark(b);
      return;
    }
    const ch = e.key.length === 1 ? e.key.toLowerCase() : "";
    const r = ch ? typeAlias(bookmarks, bm.buf, ch) : null;
    if (r) { e.preventDefault(); resolved(r); }
  };
  acts.bookmarks.draft = (v) => { bm.draft = v; };
  acts.bookmarks.commit = (typed) => {
    const key = bm.editing, alias = typed.trim().toLowerCase();
    if (!key) return;
    const holder = aliasHolder(bookmarks, alias);
    if (holder && holder.key !== key) { say("“" + alias + "” already goes to " + trimLabel(bookmarkLabel(holder.key, journal), ECHO_CAP), 2500); return; }
    const why = aliasRefusal(alias);
    if (why) { say(why, 2500); return; }
    const next = setBookmarkAlias(bookmarks, key, alias);
    if (!next) { bm.editing = ""; bm.draft = ""; renderBookmarks(); return; }
    if (!writeBookmarks(next)) { renderBookmarks(); return; }
    bm.editing = ""; bm.draft = "";
    renderBookmarks();
  };
  acts.bookmarks.act = (key, what) => {
    const i = bookmarkIndex(bookmarks, key);
    if (i === -1) return;
    const b = bookmarks[i];
    if (what === "del") {
      const wasEditing = bm.editing === key;
      const next = bookmarks.slice(); next.splice(i, 1);
      if (!writeBookmarks(next)) return;
      if (wasEditing) { bm.editing = ""; bm.draft = ""; }
      renderBookmarks();
    } else if (what === "key") {
      bm.buf = ""; bm.editing = key; bm.draft = b.alias; bm.opening = 1;
      renderBookmarks();
    } else if (what === "link") {
      /* the link at the caret the editor still holds; every way it cannot
         land says why, nothing is appended at the end */
      if (warmBlock()) return;
      closePanel();
      if (key === hereKey()) { say(alreadyOn(key, journal), 2000); return; }
      const view = session.view;
      if (!view) { say("place your cursor in the entry", 2000); return; }
      const why = linkRefusal(view.state);
      if (why) { say(why, 2000); return; }
      const p = bookmarkParts(key);
      insertLinkAfter(view, entryHash(p.date, p.tag), mdLabel(bookmarkLinkLabel(key, journal), "entry"));
      view.focus();
      session.saveNow();
    } else jumpBookmark(b);
  };
  /* ⌃⌘G: GO TO A LINE, OR A PAGE. A find bar, not a prompt: the bar keeps
     focus and Enter cycles through the blocks that hold that line. The
     landing is CENTRED in the readable band under the masthead — a
     reader who asked for line 254 wants the lines around it. The three
     routes aimed at the bar (Escape, the ×, ⌃⌘G again) hand the caret
     back to the landed row, the first cell of a pair, or just after a
     leaf marker; a navigation and a click outside take the plain close.
     A number is a coordinate into ONE text, so the boxes empty when the
     bar opens on another entry. */
  const lb = screen.lineBar;
  let lineAsked = 0, lastAskKey = "";
  const scrollIntoBand = (rect: { top: number; bottom: number }): void => {
    const top = document.querySelector(".site-head")?.getBoundingClientRect().bottom || 0;
    const mid = top + (document.documentElement.clientHeight - top) / 2;
    window.scrollBy(0, (rect.top + rect.bottom) / 2 - mid);
  };
  const landOn = (pos: number): void => {
    const view = session.view!;
    setLanding(view, pos);
    const node = view.state.doc.nodeAt(pos)!;
    const a = view.coordsAtPos(pos + (node.isLeaf ? 0 : 1)), b = view.coordsAtPos(pos + node.nodeSize - (node.isLeaf ? 0 : 1));
    scrollIntoBand({ top: Math.min(a.top, b.top), bottom: Math.max(a.bottom, b.bottom) });
  };
  const goToLine = (n: number): void => {
    const view = session.view!;
    const { hits, blocks } = lineHits(view.state.doc, n);
    if (!hits.length) { say(lineRefusal(blocks, n), 3000); return; }
    const hit = nextHit(hits, landingPos(view.state), n === lineAsked);
    lineAsked = n;
    landOn(hit.pos);
    const word = landingWord(hit, blocks, n);
    if (word) say(word, 2500);
  };
  const goToFolio = (tok: string): void => {
    const view = session.view!;
    const hit = folioHit(view.state.doc, tok);
    if (!hit) { say(folioRefusal(view.state.doc, tok), 3000); return; }
    landOn(hit.pos);
  };
  const closeLineBar = (): void => {
    if (!lb.open) return;
    if (session.view) setLanding(session.view, null);
    lb.open = false;
  };
  /* the caret hand-back: only the routes aimed at the bar */
  const putLineCaret = (): void => {
    if (!lb.open) return;
    const view = session.view;
    const had = document.querySelector(".linebar")?.contains(document.activeElement);
    const pos = view ? landingPos(view.state) : null;
    closeLineBar();
    if (!view) return;
    if (had && pos !== null) {
      const node = view.state.doc.nodeAt(pos);
      if (node) {
        const at = node.isLeaf ? pos + 1 : pos + 1 + (node.type.name === "pair" ? 1 : 0);
        view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(at))));
      }
    }
    view.focus();
  };
  acts.lineBar.toggle = () => {
    if (lb.open) { putLineCaret(); return; }
    if (session.mdView) { say("Switch to the rendered view to go to a line or a page", 3000); return; }
    const view = session.view;
    if (!view) return;
    const kind = askKind(view.state.doc);
    if (kind === "none") { say("no line or page numbers here", 2000); return; }
    const c = session.current, askKey = entryKey(c.date, c.tag);
    if (askKey !== lastAskKey) { lastAskKey = askKey; lb.line = ""; lb.page = ""; lineAsked = 0; }
    closePanel(); openRow(false); gotoRow(false);
    lb.kind = kind;
    lb.open = true;
    setTimeout(() => masthead.focusLineBar(), 0);
  };
  acts.lineBar.input = (kind, v) => { if (kind === "line") { lb.line = v; lineAsked = 0; } else lb.page = v; };
  acts.lineBar.enter = (kind, v, repeat) => {
    if (repeat) return;
    const why = askCheck(v, kind);
    if (why) { say(why, 2000); return; }
    if (kind === "page") goToFolio(v.trim()); else goToLine(parseInt(v.trim(), 10));
  };
  acts.lineBar.close = putLineCaret;
  document.addEventListener("click", (e) => {
    if (!lb.open) return;
    if (e.clientX > document.documentElement.clientWidth || e.clientY > document.documentElement.clientHeight) return;
    if ((e.target as Element).closest(".linebar")) return;
    closeLineBar();
  });
  /* THE COPY BUTTON: over whichever code block, quote, card, verse or
     prose block, note or reference the mouse is nearest inside; a quote
     inside a quote is ONE block with levels, so the copy is the whole
     nest, a card or a code block between them stopping the climb. It
     copies a code block's lines, or the block's FULL markdown — fences
     and "> " markers included — with the rendered HTML beside it. The
     label says "copied" only for the block it is still over, keyed on
     the element and a click counter, since a two-flavour write does not
     settle at once. */
  const cp = screen.copy;
  let copyTarget: HTMLElement | null = null, copySeq = 0, copyReset: ReturnType<typeof setTimeout> | null = null;
  const BLOCKS = "pre, blockquote, div.note, div.reference, div[class^='card-'], div.verse, div.prose";
  const hideCopy = (): void => { copyTarget = null; cp.show = false; if (copyReset) clearTimeout(copyReset); cp.label = "copy"; };
  const showCopy = (target: HTMLElement): void => {
    if (target !== copyTarget) { if (copyReset) clearTimeout(copyReset); cp.label = "copy"; }
    copyTarget = target;
    const rect = target.getBoundingClientRect();
    const head = (document.querySelector(".site-head")?.getBoundingClientRect().bottom || 0) + 7;
    const top = Math.max(rect.top + 5, head);
    if (top > rect.bottom - 27 || rect.top > window.innerHeight) { hideCopy(); return; }
    let cover = 0;
    const isPre = target.tagName === "PRE";
    if (isPre && target.dataset.lang) { const cs = getComputedStyle(target, "::after"); cover = (parseFloat(cs.width) + parseFloat(cs.right) || 0) - 4; }
    const cls = target.className || "";
    cp.title = isPre ? "Copy this code block" : /^card-/.test(cls) ? "Copy this card" : target.classList.contains("verse") ? "Copy this verse"
      : target.classList.contains("prose") ? "Copy this prose" : target.classList.contains("reference") ? "Copy this reference"
      : target.classList.contains("note") ? "Copy this note" : "Copy this quote";
    cp.minWidth = cover > 0 ? Math.ceil(cover) : 0;
    cp.top = top;
    cp.right = document.documentElement.clientWidth - rect.right + 8;
    cp.show = true;
  };
  document.addEventListener("mouseover", (e) => {
    const t = e.target as Element | null;
    if (!t?.closest || t.closest(".copybtn")) return;
    let target = t.closest(BLOCKS) as HTMLElement | null;
    while (target && target.parentElement && target.tagName === "BLOCKQUOTE" && target.parentElement.tagName === "BLOCKQUOTE") target = target.parentElement;
    if (target && session.view?.dom.contains(target) && !session.mdView) showCopy(target); else hideCopy();
  });
  window.addEventListener("scroll", () => { if (copyTarget) showCopy(copyTarget); }, { passive: true });
  /* the block the DOM element draws, found through the view */
  const blockAt = (el: HTMLElement): import("prosemirror-model").Node | null => {
    const view = session.view;
    if (!view) return null;
    const pos = view.posAtDOM(el, 0);
    const $pos = view.state.doc.resolve(pos);
    for (let d = $pos.depth; d >= 1; d--) if (view.nodeDOM($pos.before(d)) === el) return $pos.node(d);
    const after = view.state.doc.nodeAt(pos);
    return after && view.nodeDOM(pos) === el ? after : null;
  };
  acts.copyBlock = () => {
    const view = session.view;
    if (!copyTarget || !view || !view.dom.contains(copyTarget)) { hideCopy(); say("Nothing to copy", 2000); return; }
    const mine = copyTarget, seq = ++copySeq;
    const done = (ok: boolean): void => {
      if (mine !== copyTarget || seq !== copySeq) return;
      cp.label = ok ? "copied" : "copy failed";
      if (copyReset) clearTimeout(copyReset);
      copyReset = setTimeout(() => { cp.label = "copy"; }, 1200);
    };
    const node = blockAt(copyTarget);
    if (!node) { done(false); say("Copy failed", 3000); return; }
    const payload = node.type === schema.nodes.code_block ? node.textContent.replace(/\n$/, "")
      /* the swept HTML, not the raw: the raw outerHTML went out here until
         2026-09-08, when a card pasted into Mail arrived as plain lines */
      : { text: serializeMarkdown(schema.nodes.doc.create(null, [node])), html: richBlockHtml(copyTarget) };
    writeClipboard(payload).then((ok) => { done(ok); if (!ok && seq === copySeq) say("Copy failed", 3000); });
  };
  /* THE FLOATING BAR: placed over the selection on every selection change
     (a frame later) and scroll, clamped under the masthead; hidden in the
     source view and over a search jump's selection until the reader next
     touches the page — the bar is for text the reader chose to format. */
  let barSuppressed = false;
  const placeBar = (): void => {
    const view = session.view;
    const sel = document.getSelection();
    if (!view || session.mdView || barSuppressed || !sel || sel.rangeCount === 0 || sel.isCollapsed || !view.dom.contains(sel.anchorNode)) { screen.bar.show = false; return; }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!rect.width && !rect.height) { screen.bar.show = false; return; }
    const floor = (document.querySelector(".site-head")?.getBoundingClientRect().bottom || 0) + 8;
    screen.bar.left = rect.left + rect.width / 2;
    screen.bar.top = Math.max(rect.top, floor);
    screen.bar.incode = inCode(view.state);
    screen.bar.on = formatState(view.state);
    screen.bar.canTag = screen.masthead.buttons.canCreate;
    screen.bar.show = true;
  };
  document.addEventListener("selectionchange", () => requestAnimationFrame(placeBar));
  window.addEventListener("scroll", placeBar, { passive: true });
  document.addEventListener("mousedown", () => { barSuppressed = false; });
  mountEl.addEventListener("keydown", () => { barSuppressed = false; });
  const suppressBar = (): void => { barSuppressed = true; screen.bar.show = false; };
  acts.bar = (act) => {
    const view = session.view;
    if (!view) return;
    if (act === "reference") { session.copyReference(); return; }
    if (act === "words") { session.showWordCount(); return; }
    if (act === "tag") { extractToTag(); return; }
    const cmd = { bold, italic, underline, strike, heading, quote, code: codeBlock, curl: curlSelection }[act];
    if (cmd && !cmd(view.state, view.dispatch)) say("nothing to change there", 2000);
    view.focus();
    placeBar();
  };
  /* the selection into a new sub-entry, the link left in its place: the
     new entry is born WITH its heading, so the link is labelled by it at
     birth where a later relabel would never see the change */
  const extractToTag = (): void => {
    const view = session.view;
    if (!view || view.state.selection.empty || warmBlock()) return;
    const { from, to } = view.state.selection;
    const c = session.current;
    const ns = nsOf(c.date);
    const typedRaw = typedName(prompt(ns ? "Name for the new " + ns.subNoun + ":" : "Tag for the new entry:"));
    if (!typedRaw) return;
    if ("refuse" in typedRaw) { say(typedRaw.refuse); return; }
    const spec = subEntrySpec(c.date, c.tag, typedRaw.name);
    if (!spec) return;
    if ("refuse" in spec) { say(spec.refuse); return; }
    if (childrenOf(keysNow(), spec.listKey).indexOf(spec.tag) !== -1) { alert(takenText(spec.listKey, spec.tag)); return; }
    const md = cutMd(view.state.doc, from, to);
    const label = ns ? mdLabel(firstHeading(md), spec.tag) : spec.tag;
    layer.setEntry(entryKey(c.date, spec.full), md).then((landed) => {
      if (!landed) { say("couldn't create the entry — see the corner", 3000); return; }
      view.dispatch(replaceWithLink(view.state, from, to, spec.href, label));
      screen.bar.show = false;
      return session.saveNow().then(() => { refreshMasthead(); session.goto(spec.href); });
    });
  };
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
    /* the one leaf: the button is hidden there, but ⌃⌘N is a press */
    if (!ns && c.tag) { say("a tagged entry holds no entries of its own", 2500); return; }
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
    if (ns === "help") { openRow(false); closeLineBar(); screen.panel = "help"; return; }
    if (ns === "bookmarks") { openBookmarks(); return; }
    if (ns === "shortcuts") { openShortcuts(); return; }
    if (ns === "backups") { openRow(false); closeLineBar(); readBackups(); screen.panel = "backups"; return; }
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
  /* THE OPEN ENTRY FIRST, from ONE store row, before the warm reads the
     whole journal — the current app's primeOpenEntry: by hand 2026-09-08
     the entry took two seconds to appear after a refresh, the warm's time
     over 13,565 rows. A day opens whether or not its row exists; a keyed
     entry opens once its row is in the cache, and an absent one waits
     for the warm to answer whether it is refused. The masthead's lists
     read the whole cache, so they are redrawn when the warm lands. */
  let opened = false;
  const h0 = hashParts(location.hash.slice(1));
  const primed = wrote.then(() => layer.primeEntry(entryKey(h0.date, h0.tag))).then((found) => {
    if (found || entryKey(h0.date, h0.tag) in layer.cache || !nsOf(h0.date)) { session.openHash(); opened = true; stage("primed"); }
  }, () => {});
  primed.then(() => layer.warm()).then(() => {
    /* an unreadable journal is an error, not a status: it sticks, the
       caught failure copyable */
    if (layer.storeReadFailed) { stage("fail"); root.dataset.store = "failed: " + layer.storeReadError; notices.stickErr("the store could not be read — reload", layer.storeReadError); return; }
    stage("all"); count();
    say(Object.keys(layer.cache).length + " entries stored");
    if (!opened) session.openHash(); else refreshMasthead();
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
