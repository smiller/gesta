/* `?fixture=pippa&interval=1` opens a fixture in SCRATCH — no store, no
   save; `?store=write` writes one probe row; `?store=seed` writes the four
   fixtures as entries, for a profile no picker can fill;
   `?store=seed-stanza` writes the stanza step's Faerie Queene alone;
   `?store=seed-margin` the margin-note step's Donne and prose page;
   `?corner=pill` draws the paused pill; `?warm=slow` holds the warm two
   seconds. */
import "./editor/editor.css";
import "./ui/ui.css";
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
import { readRaw } from "./store/local.ts";
import { bookmarkStore } from "./store/bookmarkStore.ts";
import { noticeLedger, type Progress } from "./ui/notices.svelte.ts";
import { copyText } from "./ui/clipboard.ts";
import { screenState, EMPTY_MASTHEAD } from "./ui/screen.svelte.ts";
import { mastheadModel, panelRows, trimLabel, ECHO_CAP } from "./ui/mastheadModel.ts";
import { lifecycle, refuseCold } from "./ui/lifecycle.ts";
import { overlays } from "./ui/overlays.ts";
import { scopeOptions, defaultScope, sameScope, resultLabel } from "./ui/searchModel.ts";
import { searchIndex } from "./store/searchIndex.ts";
import { searchEntries, snippetRuns, SEARCH_CAP } from "./store/search.ts";
import { flattenDoc } from "./model/flatten.ts";
import { linkRefusal, insertLinkAfter } from "./editor/insertLink.ts";
import { mdLabel, romanWorkKey } from "./store/reference.ts";
import { gotoLevels, gotoPick } from "./ui/gotoModel.ts";
import { askKind, lineHits, lineRefusal, nextHit, landingWord, folioHit, folioRefusal, askCheck, stanzaAskCheck, stanzaHit, hasStanzas } from "./editor/goto.ts";
import { openFoldAt } from "./editor/folds.ts";
import { landingPos, setLanding } from "./editor/landing.ts";
import { TextSelection } from "prosemirror-state";
import { matches, nearest, replaceAt, replaceEvery, countLabel } from "./editor/replace.ts";
import type { ReplacePort } from "./editor/surface.ts";
import { bookmarkIndex, bookmarkParts, reachableBookmarks, aliasHolder, aliasRefusal, setBookmarkAlias, addBookmark, bookmarksFull, numberedBookmarks, type Bookmark } from "./store/bookmarks.ts";
import { bookmarkRows, bookmarkFoot, bookmarkLabel, bookmarkLinkLabel, alreadyOn, typeAlias, resolveAlias, aliasCandidates } from "./ui/bookmarksModel.ts";
import { NS } from "./store/keys.ts";
import { parseShortcuts, filterShortcuts, type Shortcut } from "./store/shortcuts.ts";
import { nsOf } from "./store/keys.ts";
import { journalOf } from "./store/headings.ts";
import { todayKey, entryKey, entryHash } from "./store/keys.ts";
import { hashParts } from "./store/nav.ts";
import Corner from "./ui/Corner.svelte";
import Masthead from "./ui/Masthead.svelte";
import Toolbar from "./ui/Toolbar.svelte";
import CopyButton from "./ui/CopyButton.svelte";
import { writeClipboard } from "./ui/clipboard.ts";
import { richBlockHtml } from "./ui/richCopy.ts";
import { schema } from "./model/schema.ts";
import { bold, italic, underline, strike, heading, quote, codeBlock, curlSelection, inCode, formatState } from "./editor/format.ts";
import horace from "../fixtures/horace-odes-1.1.md?raw";
import pippa from "../fixtures/pippa-passes-intro.md?raw";
import twelfth from "../fixtures/twelfth-night-1.1.md?raw";
import williams from "../fixtures/williams-witchcraft-3.md?raw";
import donneMarginNotes from "../fixtures/donne-anniversarie-margin-notes.md?raw";
import marginsProse from "../fixtures/margins-prose.md?raw";

const fixtures: Record<string, string> = { horace, pippa, twelfth, williams };
const mountEl = document.getElementById("editor") as HTMLElement;
const root = document.documentElement;
const stage = (s: string): void => { root.dataset.probe = (root.dataset.probe || "") + s + ";"; };
const q = new URLSearchParams(location.search);

const notices = noticeLedger(copyText);
const say = notices.whisper;
const screen = screenState(q.get("interval") !== null ? +q.get("interval")! : 5);
type Ns = "page" | "bookshelf";
type PanelName = Ns | "help" | "bookmarks" | "shortcuts" | "backups";
const acts = {
  today: () => {}, export: () => {}, import: () => {}, backups: () => {}, resume: () => {},
  backupsPanel: () => {},
  interval: (_n: number) => {}, panel: (_ns: PanelName) => {}, newRoot: (_ns: Ns) => {},
  create: () => {}, rename: () => {}, delete: () => {},
  goto: { toggle: (_open: boolean) => {}, pick: (_level: number, _value: string, _ns?: string) => {} },
  bar: (_act: string) => {},
  copyBlock: () => {},
  lines: (_open: boolean) => {},
  shortcuts: { query: (_q: string) => {}, pick: (_i: number) => {}, walk: (_d: 1 | -1) => {}, enter: () => {}, edit: () => {}, draft: (_v: string) => {}, save: () => {}, escape: () => {} },
  bookmarks: { key: (_e: KeyboardEvent) => {}, act: (_key: string, _what: "jump" | "del" | "key" | "link") => {}, draft: (_v: string) => {}, commit: (_v: string) => {} },
  lineBar: { toggle: () => {}, input: (_kind: "line" | "page", _v: string) => {}, enter: (_kind: "line" | "page", _v: string, _repeat: boolean) => {}, close: () => {}, dismiss: () => {} },
  replace: { open: () => {}, find: (_v: string) => {}, with: (_v: string) => {}, next: (_back: boolean) => {}, one: () => {}, all: () => {}, close: () => {}, closeOver: () => {}, dismiss: () => {}, check: () => {} },
  search: { toggle: (_open: boolean) => {}, query: (_q: string) => {}, scope: (_at: number) => {}, walk: (_dir: 1 | -1) => {}, enter: () => {}, pick: (_i: number) => {} },
};
const closePanel = (): void => { screen.panel = null; };
const overlay = overlays({
  panel: closePanel,
  search: () => acts.search.toggle(false),
  goto: () => acts.goto.toggle(false),
  lineBar: () => acts.lineBar.dismiss(),
  lineBarCaret: () => acts.lineBar.close(),
  lines: () => { if (screen.linesOpen) acts.lines(false); },
  replace: () => acts.replace.closeOver(),
  replaceBack: () => acts.replace.close(),
});
mount(Corner, { target: document.body, props: { notices, onResume: () => acts.resume() } });
mount(Toolbar, { target: document.body, props: { bar: screen.bar, onAct: (act: string) => acts.bar(act) } });
mount(CopyButton, { target: document.body, props: { copy: screen.copy, onCopy: () => acts.copyBlock() } });
const masthead = mount(Masthead, { target: document.body, anchor: document.querySelector("main")!, props: {
  screen, onToday: () => acts.today(), onExport: () => acts.export(), onImport: () => acts.import(),
  onInterval: (n: number) => { screen.interval = n; acts.interval(n); },
  onPanel: (ns: PanelName) => acts.panel(ns), onClosePanel: closePanel, onNewRoot: (ns: Ns) => acts.newRoot(ns),
  onCreate: () => acts.create(), onRename: () => acts.rename(), onDelete: () => acts.delete(),
  goto: { onToggle: (open: boolean) => acts.goto.toggle(open), onPick: (level: number, value: string, ns?: string) => acts.goto.pick(level, value, ns) },
  lineBar: { onInput: (kind: "line" | "page", v: string) => acts.lineBar.input(kind, v), onEnter: (kind: "line" | "page", v: string, repeat: boolean) => acts.lineBar.enter(kind, v, repeat), onClose: () => acts.lineBar.close() },
  replace: { onFind: (v: string) => acts.replace.find(v), onWith: (v: string) => acts.replace.with(v), onNext: (back: boolean) => acts.replace.next(back), onOne: () => acts.replace.one(), onAll: () => acts.replace.all(), onClose: () => acts.replace.close() },
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
  if (e.key === "Escape") overlay.open("escape");
  if (!(e.ctrlKey && e.metaKey && !e.shiftKey && !e.altKey)) return;
  /* ⌃⌘N is "new": a tagged entry, a sub-page, a book */
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
  /* ⌃⌘R is the reference, so replace is ⌃⌘E, for exchange */
  else if (e.key === "e") { e.preventDefault(); acts.replace.open(); }
});

const tabs = typeof BroadcastChannel === "function" ? new BroadcastChannel(NS + "entries") : null;
const layer = entryLayer(idbEntryStore(), notices.entry, { announce: (ekey) => tabs?.postMessage(ekey) });
const images = idbImageStore();
const count = (): void => { root.dataset.store = String(Object.keys(layer.cache).length); };

const fixture = q.get("fixture");
if (fixture && fixtures[fixture]) {
  /* SCRATCH: the fixture in the editor, nothing stored, nothing saved */
  const md = fixtures[fixture];
  const gutter = (v: { dom: HTMLElement }): void => { screen.gutter = v.dom.classList.contains("versepage"); };
  const v = createEditor(mountEl, parseMarkdown(md), { interval: screen.interval, onChange: gutter });
  gutter(v);
  screen.masthead = { ...EMPTY_MASTHEAD, crumbs: [{ text: "fixture " + fixture, href: null, title: "" }] };
  acts.interval = (n) => setLineInterval(n)(v.state, v.dispatch);
  root.dataset.store = "scratch";
} else {
  const win = window as unknown as { showDirectoryPicker?: (opts?: { mode?: "read" | "readwrite" }) => Promise<Dir> };
  /* the backup's status line is a whisper, each step restarting the clock:
     an autosave "saved" may overwrite "backing up…" (a background backup
     must not suppress the user's own save feedback), and a pin outranks
     both */
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
    stick: (text, copy) => { notices.stick(text, copy); },
    pin: (text, copy) => notices.stick(text, copy), pinned: () => notices.pinned, releasePin: (gen) => notices.releasePin(gen),
    onShow: (stored, ekey) => {
      screen.gutter = !!session.view?.dom.classList.contains("versepage");
      if (ekey !== shown.ekey) { sr.query = ""; sr.rows = []; sr.empty = ""; overlay.open("navigated"); }   /* the search's query belongs to the entry left */
      else acts.replace.check();
      if (ekey !== shown.ekey || stored !== shown.stored) { shown = { ekey, stored }; refreshMasthead(); life.shown(ekey, stored); }
    },
    onEdit: () => backup.scheduleBackup(),
    onView: (md) => { screen.mdView = md; if (md) overlay.open("sourceView"); else acts.replace.dismiss(); },
    onSelect: () => requestAnimationFrame(placeBar),
    onHighlight: () => { suppressBar(); requestAnimationFrame(centreSelection); },
  });
  /* gathered for a beat and the masthead redrawn once: an import in
     another tab announces every entry it writes */
  const heard = new Set<string>();
  let hearing: ReturnType<typeof setTimeout> | null = null;
  if (tabs) tabs.onmessage = (e: MessageEvent) => {
    if (typeof e.data !== "string") return;
    heard.add(e.data);
    hearing ??= setTimeout(() => {
      hearing = null;
      const keys = [...heard];
      heard.clear();
      Promise.all(keys.map((k) => session.takeNotice(k))).then(() => { refreshMasthead(); count(); });
    }, 50);
  };
  /* leaving the tab with a backup still pending writes it at once, after the
     entry's own flush, registered first so it runs first */
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") backup.firePendingBackup(); });
  acts.interval = (n) => session.setInterval(n);
  acts.today = () => session.today();
  acts.lines = (open) => {
    if (open && !screen.gutter) { say("no line numbers here", 2000); return; }
    screen.linesOpen = open;
    if (open) { overlay.open("lines"); setTimeout(() => masthead.focusLines(), 0); }
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
      /* not while an op holds the line: progress() retires the live
         handle, and an export's failed writes would end unshown */
      if (!indexing && !notices.state.busy) indexing = notices.progress("indexing…");
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
    overlay.open("search");
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
     hash write, since a pick of the open entry moves no hash. No save
     flush: it would rewrite an untouched entry. */
  const gotoWorld = () => ({ keys: keysNow(), cache: layer.cache, journal });
  const gotoRow = (open: boolean): void => {
    if (screen.goto.open === open) return;
    screen.goto.open = open;
    if (!open) { screen.goto.levels = []; session.view?.focus(); return; }
    overlay.open("goto");
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
  /* read inside try: reaching localStorage throws where it is refused,
     and read bare at boot it stopped the page before it drew
     (pin: entries left and renamed › a page opened with localStorage refused) */
  const SHORTCUTS_KEY = NS + "shortcuts";
  const sc = screen.shortcuts;
  let shortcuts: Shortcut[] = parseShortcuts(readRaw(SHORTCUTS_KEY) || "");
  let shortcutsFailGen = 0;
  const renderShortcuts = (): void => {
    if (!shortcuts.length) { sc.rows = []; sc.empty = "No shortcuts yet — add some below."; sc.active = 0; if (!sc.editing) showEditor(true); return; }
    sc.rows = filterShortcuts(shortcuts, sc.query);
    sc.empty = sc.rows.length ? "" : "No matches.";
    sc.active = 0;
  };
  const showEditor = (on: boolean): void => {
    if (on && !sc.editing && !sc.dirty) sc.draft = readRaw(SHORTCUTS_KEY) || "";
    sc.editing = on;
  };
  const openShortcuts = (): void => {
    overlay.open("shortcuts");
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
  const bm = screen.bookmarks;
  const marks = bookmarkStore({
    seed: [{ key: "page/Making Verity Cards", alias: "" }, { key: "page/Verdour", alias: "" }],
    pin: (text, err) => notices.stickErrIdle(text, err),
    release: (gen) => notices.releasePin(gen),
    storedKeys: () => layer.storedKeys(),
  });
  const hereKey = (): string => entryKey(session.current.date, session.current.tag);
  /* every render hands focus back: a delete removes the row its own
     button sits in, and "open" and "listening" must not disagree */
  const renderBookmarks = (): void => {
    const bookmarks = marks.list();
    bm.unreadable = marks.unreadable();
    if (bm.editing && bookmarkIndex(bookmarks, bm.editing) === -1) { bm.editing = ""; bm.draft = ""; }
    bm.rows = bookmarkRows(bookmarks, hereKey(), journal);
    bm.foot = bookmarkFoot(bookmarks, hereKey(), journal);
    if (bm.buf && !aliasCandidates(bookmarks, bm.buf).length) bm.buf = "";
    setTimeout(() => { masthead.focusBookmarks(); bm.opening = 0; }, 0);
  };
  const openBookmarks = (): void => {
    overlay.open("bookmarks");
    marks.open(layer.warmed ? keysNow : null).then((wrote) => { if (wrote && screen.panel === "bookmarks") renderBookmarks(); });
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
    if (bookmarkIndex(marks.list(), here) !== -1) { say("already bookmarked", 2000); return; }
    if (bookmarksFull(marks.list())) { say("bookmarks full — delete one, or give one its own key", 3000); return; }
    session.flushSave().then(() => {
      if (screen.panel !== "bookmarks") return;
      if (!reachableBookmarks([{ key: here, alias: "" }], keysNow()).length) { if (!warmBlock()) say("nothing to bookmark here yet", 2500); return; }
      const next = addBookmark(marks.list(), here);
      if (next && marks.write(next)) renderBookmarks();
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
    if (e.key === "Enter" && bm.buf) { e.preventDefault(); resolved(resolveAlias(marks.list(), bm.buf)); return; }
    if (!bm.buf && (e.key === "a" || e.key === "A")) { e.preventDefault(); addOpenBookmark(); return; }
    if (!bm.buf && e.key >= "1" && e.key <= "9" && e.key.length === 1) {
      e.preventDefault();
      const b = numberedBookmarks(marks.list())[+e.key - 1];
      if (!b) say("no bookmark " + e.key, 2000); else jumpBookmark(b);
      return;
    }
    const ch = e.key.length === 1 ? e.key.toLowerCase() : "";
    const r = ch ? typeAlias(marks.list(), bm.buf, ch) : null;
    if (r) { e.preventDefault(); resolved(r); }
  };
  acts.bookmarks.draft = (v) => { bm.draft = v; };
  acts.bookmarks.commit = (typed) => {
    const key = bm.editing, alias = typed.trim().toLowerCase();
    if (!key) return;
    const holder = aliasHolder(marks.list(), alias);
    if (holder && holder.key !== key) { say("“" + alias + "” already goes to " + trimLabel(bookmarkLabel(holder.key, journal), ECHO_CAP), 2500); return; }
    const why = aliasRefusal(alias);
    if (why) { say(why, 2500); return; }
    const next = setBookmarkAlias(marks.list(), key, alias);
    if (!next) { bm.editing = ""; bm.draft = ""; renderBookmarks(); return; }
    if (!marks.write(next)) { renderBookmarks(); return; }
    bm.editing = ""; bm.draft = "";
    renderBookmarks();
  };
  acts.bookmarks.act = (key, what) => {
    const i = bookmarkIndex(marks.list(), key);
    if (i === -1) return;
    const b = marks.list()[i];
    if (what === "del") {
      const next = marks.list().slice(); next.splice(i, 1);
      if (!marks.write(next)) return;
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
      session.saveNow();
    } else jumpBookmark(b);
  };
  /* ⌃⌘G: GO TO A LINE, OR A PAGE. A find bar, not a prompt: the bar keeps
     focus and Enter cycles through the blocks that hold that line. The
     landing is CENTRED in the readable band under the masthead — a
     reader who asked for line 254 wants the lines around it, and so does
     one following a reference link, which lands the same way. The three
     routes aimed at the bar (Escape, the ×, ⌃⌘G again) hand the caret
     back to the landed row, the first cell of a pair, or just after a
     leaf marker; a navigation and a click outside take the plain close.
     A number is a coordinate into ONE text, so the boxes empty when the
     bar opens on another entry. */
  const lb = screen.lineBar;
  let lineAsked = 0, lastAskKey = "";
  function scrollIntoBand(rect: { top: number; bottom: number }): void {
    const top = document.querySelector(".site-head")?.getBoundingClientRect().bottom || 0;
    const mid = top + (document.documentElement.clientHeight - top) / 2;
    window.scrollBy(0, (rect.top + rect.bottom) / 2 - mid);
  }
  /* a jump's selection centred A FRAME AFTER it was placed: the fit's
     first pass runs on the frame after a mount, and a paired entry's rows
     re-wrap under it — centred at once, a passage in Horace sat exactly
     mid-band, then the fit shrank the page from 6611px to 2065px, the
     scroll clamped and the passage sat 304px above centre, under the
     masthead (MEASURED in headless Helium). A frame queued after the fit's
     measures the settled box (pin: reference paste › the reference link
     followed) */
  function centreSelection(): void {
    const view = session.view;
    if (!view || session.mdView || view.state.selection.empty) return;
    const { from, to } = view.state.selection;
    const a = view.coordsAtPos(from), b = view.coordsAtPos(to);
    scrollIntoBand({ top: Math.min(a.top, b.top), bottom: Math.max(a.bottom, b.bottom) });
  }
  const landOn = (pos: number): void => {
    const view = session.view!;
    /* a landing inside a closed contents section opens it first: it stayed
       hidden and scrolled to nothing (pin: folds.test › openFoldAt opens the
       section a position is in) */
    openFoldAt(pos)(view.state, view.dispatch);
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
  acts.lineBar.dismiss = closeLineBar;
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
    overlay.open("lineBar");
    lb.kind = kind;
    lb.open = true;
    setTimeout(() => masthead.focusLineBar(), 0);
  };
  acts.lineBar.input = (kind, v) => { if (kind === "line") { lb.line = v; lineAsked = 0; } else lb.page = v; };
  acts.lineBar.enter = (kind, v, repeat) => {
    if (repeat || session.mdView || !session.view) return;
    /* a work citing by stanza: on a page holding stanzas the Line box takes
       `N` or `N.M`, stanza and line, one place each; a plain verse page of
       the same work keeps the line ask (pin: stanza › ⌃⌘G 2.1) */
    const c = session.current;
    if (kind === "line" && romanWorkKey(c.date, c.tag, journal) && hasStanzas(session.view.state.doc)) {
      const bad = stanzaAskCheck(v);
      if (bad) { say(bad, 2000); return; }
      const hit = stanzaHit(session.view.state.doc, v);
      if (typeof hit === "string") say(hit, 3000); else landOn(hit.pos);
      return;
    }
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
  /* FIND AND REPLACE, on the markdown: ⌃⌘E in the rendered view switches
     to the source view first, and closing the bar switches back */
  const rb = screen.replace;
  let hits: number[] = [], at = -1, fromRendered = false, unwatch: (() => void) | null = null, editing = false, counting = 0;
  /* THE BAR HOLDS THE VIEW IT OPENED ON: the offsets are that text's, and
     a save from another window rebuilt the view under them, so a Replace
     wrote at the old offsets into the new text
     (pin: replace › the entry saved in another window, the bar open) */
  let barPort: ReplacePort | null = null;
  const headFoot = (): number => document.querySelector(".site-head")?.getBoundingClientRect().bottom || 0;
  const draw = (port: ReplacePort): void => {
    rb.count = countLabel(rb.find, hits.length, at);
    rb.any = hits.length > 0;
    port.show(hits, rb.find.length, at, headFoot());
  };
  const seek = (port: ReplacePort, from: number): void => {
    hits = matches(port.text(), rb.find);
    at = nearest(hits, from);
    draw(port);
  };
  const recount = (port: ReplacePort): void => {
    hits = matches(port.text(), rb.find);
    at = -1;
    draw(port);
  };
  const dismissReplace = (): void => {
    if (!rb.open) return;
    rb.open = false;
    unwatch?.(); unwatch = null;
    cancelAnimationFrame(counting);
    barPort?.clear();
    barPort = null;
    hits = []; at = -1;
  };
  /* the port the bar opened on, or null with the bar closed when the view was replaced */
  const port = (): ReplacePort | null => {
    if (!rb.open) return null;
    if (session.replacer() === barPort) return barPort;
    acts.replace.dismiss();
    return null;
  };
  acts.replace.dismiss = () => { dismissReplace(); fromRendered = false; };
  acts.replace.check = () => {
    if (!rb.open || port()) return;
    const a = document.activeElement;
    if (session.mdView && (!a || a === document.body || a.closest(".replacebar"))) session.replacer()?.focus();
  };
  /* every close switches back to the view the bar was opened from, but a
     navigation or a rebuilt view, which only closes it
     (pin: replace › ⌃⌘H over the bar). A switch back the parse refuses
     leaves the source view open and the cursor in its text, not in the
     hidden Find box (pin: replace › Escape, the switch back refused) */
  const closeBack = (focus: boolean): void => {
    if (!rb.open) return;
    if (session.replacer() !== barPort) { acts.replace.dismiss(); return; }
    const back = fromRendered;
    acts.replace.dismiss();
    const inBar = !!document.activeElement?.closest(".replacebar");
    if (back) session.setView(false);
    if (session.mdView && (focus || inBar)) session.replacer()?.focus();
  };
  acts.replace.close = () => closeBack(true);
  acts.replace.closeOver = () => closeBack(false);
  acts.replace.open = () => {
    if (rb.open && port()) { masthead.focusReplace(); return; }
    overlay.open("replace");
    let switched = false;
    if (!session.mdView) {
      session.setView(true);
      if (!session.mdView) return;
      switched = true;
      say("Source view, to replace", 3000);
    }
    const p = session.replacer();
    if (!p) return;
    rb.open = true;
    barPort = p;
    fromRendered = switched;
    /* typing in the text recounts once a frame, a recount being the whole
       text matched and laid out again */
    unwatch = p.watch(() => {
      if (editing) return;
      cancelAnimationFrame(counting);
      counting = requestAnimationFrame(() => { const q = port(); if (q) recount(q); });
    });
    seek(p, p.start(headFoot()));
    setTimeout(() => masthead.focusReplace(), 0);
  };
  acts.replace.find = (v) => {
    rb.find = v;
    const p = port();
    if (p) seek(p, at >= 0 ? hits[at] : p.start(headFoot()));
  };
  acts.replace.with = (v) => { rb.with = v; };
  acts.replace.next = (back) => {
    const p = port();
    if (!p || !hits.length) return;
    if (at < 0) { seek(p, p.start(headFoot())); return; }
    at = (at + (back ? hits.length - 1 : 1)) % hits.length;
    draw(p);
  };
  const edit = (p: ReplacePort, from: number, to: number, text: string, caret: number): void => {
    editing = true;
    try { p.edit(from, to, text, caret); } finally { editing = false; }
  };
  acts.replace.one = () => {
    const p = port();
    if (!p || !hits.length) return;
    if (at < 0) { seek(p, p.start(headFoot())); return; }
    const r = replaceAt(p.text(), hits[at], rb.find, rb.with);
    edit(p, hits[at], hits[at] + rb.find.length, rb.with, r.caret);
    seek(p, r.caret);
  };
  /* recounted after: a replacement holding the find leaves matches, and
     "none" disabled the buttons over them (pin: replace › Replace All, the replacement holding the find) */
  acts.replace.all = () => {
    const p = port();
    if (!p || !hits.length) return;
    const text = p.text();
    const r = replaceEvery(text, rb.find, rb.with, at >= 0 ? hits[at] : p.start(headFoot()));
    edit(p, 0, text.length, r.text, r.caret);
    recount(p);
  };
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
  const BLOCKS = "pre, blockquote, div.note, div.reference, div[class^='card-'], div.verse, div.prose, div.grid";
  /* THE GRID'S BUTTON: a card wins while the mouse is
     over it, so the grid's own corner is a card's. Its button is drawn
     ABOVE the top-right corner, and appears when the mouse comes to the
     band just above that corner — the way every block's appears at its
     corner — or is in a gap between the cards: drawn inside the corner it
     could not be reached from a gap without crossing the card, which took
     it over. Its idle label says which one it is (pin: grid › hovered above
     its corner). */
  const idle = (t: HTMLElement | null): string => t?.classList.contains("grid") ? "copy grid" : "copy";
  const hideCopy = (): void => { copyTarget = null; cp.show = false; if (copyReset) clearTimeout(copyReset); cp.label = "copy"; };
  const showCopy = (target: HTMLElement): void => {
    if (target !== copyTarget) { if (copyReset) clearTimeout(copyReset); cp.label = idle(target); }
    copyTarget = target;
    const rect = target.getBoundingClientRect();
    const head = (document.querySelector(".site-head")?.getBoundingClientRect().bottom || 0) + 7;
    const grid = target.classList.contains("grid");
    const top = Math.max(grid ? rect.top - 25 : rect.top + 5, head);
    if (top > rect.bottom - 27 || rect.top > window.innerHeight) { hideCopy(); return; }
    let cover = 0;
    const isPre = target.tagName === "PRE";
    if (isPre && target.dataset.lang) { const cs = getComputedStyle(target, "::after"); cover = (parseFloat(cs.width) + parseFloat(cs.right) || 0) - 4; }
    const cls = target.className || "";
    cp.title = isPre ? "Copy this code block" : /^card-/.test(cls) ? "Copy this card" : target.classList.contains("grid") ? "Copy this grid" : target.classList.contains("verse") ? "Copy this verse"
      : target.classList.contains("prose") ? "Copy this prose" : target.classList.contains("reference") ? "Copy this reference"
      : target.classList.contains("note") ? "Copy this note" : "Copy this quote";
    cp.minWidth = cover > 0 ? Math.ceil(cover) : 0;
    cp.top = top;
    cp.right = document.documentElement.clientWidth - rect.right + 8;
    cp.show = true;
  };
  /* the band above a grid's top-right corner: 26px tall, the rightmost
     140px. The band is asked first, on mouseover and on mousemove alike, because a card
     directly above a grid covers most of it and the band wins there; and
     leaving the band falls back to the block under the mouse, so the card
     above keeps its own button. The grid list is read afresh each time:
     MEASURED in headless Helium, 1,000 synthetic moves over
     an entry with one grid: 0.012 ms per move over a clean tree, 0.028 ms
     with the tree dirtied before each. */
  const GRID_BAND = { above: 26, wide: 140 };
  const bandGrid = (x: number, y: number): HTMLElement | null => {
    const grids = session.view?.dom.getElementsByClassName("grid");
    if (!grids?.length) return null;
    for (const g of Array.from(grids) as HTMLElement[]) {
      const r = g.getBoundingClientRect();
      if (x >= r.right - GRID_BAND.wide && x <= r.right + 8 && y >= r.top - GRID_BAND.above && y <= r.top + 2) return g;
    }
    return null;
  };
  const blockUnder = (t: Element): HTMLElement | null => {
    let target = t.closest(BLOCKS) as HTMLElement | null;
    while (target && target.parentElement && target.tagName === "BLOCKQUOTE" && target.parentElement.tagName === "BLOCKQUOTE") target = target.parentElement;
    return target && session.view?.dom.contains(target) && !session.mdView ? target : null;
  };
  const point = (e: MouseEvent, t: Element): void => {
    const target = (session.view && !session.mdView && bandGrid(e.clientX, e.clientY)) || blockUnder(t);
    if (target) { if (target !== copyTarget) showCopy(target); } else hideCopy();
  };
  document.addEventListener("mouseover", (e) => {
    const t = e.target as Element | null;
    if (!t?.closest || t.closest(".copybtn")) return;
    point(e, t);
  });
  document.addEventListener("mousemove", (e) => {
    const t = e.target as Element | null;
    if (!t?.closest || t.closest(".copybtn")) return;
    if (session.view && !session.mdView && session.view.dom.getElementsByClassName("grid").length) point(e, t);
  });
  /* the layout viewport's width on the root, for the grid's break-out: 100vw
     counts a classic scrollbar's width and overflowed by it; observed on the
     root element, not the window's resize, because a scrollbar's arrival
     changes the width and fires no resize */
  const clientW = (): void => { document.documentElement.style.setProperty("--client-w", document.documentElement.clientWidth + "px"); };
  clientW();
  new ResizeObserver(clientW).observe(document.documentElement);
  window.addEventListener("scroll", () => { if (copyTarget) showCopy(copyTarget); }, { passive: true });
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
      copyReset = setTimeout(() => { cp.label = idle(mine); }, 1200);
    };
    const node = blockAt(copyTarget);
    if (!node) { done(false); say("Copy failed", 3000); return; }
    const payload = node.type === schema.nodes.code_block ? node.textContent.replace(/\n$/, "")
      /* the swept HTML, not the raw: with the raw outerHTML a card pasted into
         Mail arrived as plain lines (pin: card copy › a card hover-copied) */
      : { text: serializeMarkdown(schema.nodes.doc.create(null, [node])), html: richBlockHtml(copyTarget) };
    writeClipboard(payload).then((ok) => { done(ok); if (!ok && seq === copySeq) say("Copy failed", 3000); });
  };
  /* THE FLOATING BAR: placed over the selection on every selection change
     (a frame later) and scroll, clamped under the masthead; hidden in the
     source view and over a search jump's selection until a reader next
     touches the page — the bar is for text a reader chose to format (pin:
     toolbar › a word double-clicked) */
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
    if (act === "tag") { life.extract(); return; }
    const cmd = { bold, italic, underline, strike, heading, quote, code: codeBlock, curl: curlSelection }[act];
    if (cmd && !cmd(view.state, view.dispatch)) say("nothing to change there", 2000);
    view.focus();
    placeBar();
  };
  const warmBlock = (): boolean => refuseCold(layer, say);
  const keysNow = (): string[] => Object.keys(layer.cache);
  const life = lifecycle({
    layer, journal, session,
    view: () => session.view,
    dialogs: { prompt: (text, value) => prompt(text, value), confirm: (text) => confirm(text), alert: (text) => alert(text) },
    moveKept: (moves) => {
      session.moveFolds(moves);
      marks.move(moves);
    },
    ui: { say, pin: (text) => { notices.stick(text); }, redraw: refreshMasthead, replaceHash: (hash) => history.replaceState(null, "", hash), hideBar: () => { screen.bar.show = false; }, focus: () => session.view?.focus() },
  });
  acts.create = () => { life.create(); };
  acts.rename = () => { life.rename(); };
  acts.delete = () => { life.remove(); };
  /* an opener TOGGLES its own panel and displaces any other: the rows are
     built per open and never rebuilt while open — a live rebuild would
     detach a mid-click target. "No authors" is a claim about the journal,
     not made before the warm has read it. */
  acts.panel = (ns) => {
    if (screen.panel === ns) { closePanel(); return; }
    if (ns === "help") { overlay.open("help"); screen.panel = "help"; return; }
    if (ns === "bookmarks") { openBookmarks(); return; }
    if (ns === "shortcuts") { openShortcuts(); return; }
    if (ns === "backups") { overlay.open("backups"); readBackups(); screen.panel = "backups"; return; }
    overlay.open("pages");
    screen.panelRows = panelRows(ns, Object.keys(layer.cache), journal);
    screen.panelEmpty = ns !== "bookshelf" ? ""
      : !layer.warmed ? (layer.storeReadFailed ? "Couldn’t load the bookshelf." : "Still loading…")
      : "No authors yet — import a folder, or start one below.";
    screen.panel = ns;
  };
  acts.newRoot = (ns) => {
    closePanel();
    life.newRoot(ns);
  };
  stage("start");
  const seeds: Record<string, string> = {
    "page/Horace": horace, "bookshelf/Browning, Robert/Pippa Passes": pippa,
    "2026-09-06": twelfth, "2026-09-05": williams, "page/Williams/Witchcraft 3": williams,
    "page/Links": "A link to [Horace](#page/Horace), one to [itself](#page/Links), and one [outside](https://example.org/).\n",
    "bookshelf/Boethius/Consolatio": "# De consolatione philosophiae\n\n## Book 3\n\n- [3pr1](#bookshelf/Boethius/Consolatio/3pr1)\n- [3m1](#bookshelf/Boethius/Consolatio/3m1)\n- [3pr2](#bookshelf/Boethius/Consolatio/3pr2)\n",
    "bookshelf/Boethius/Consolatio/3pr1": "# 3pr1\n\nIam cantum illa finiuerat.\n", "bookshelf/Boethius/Consolatio/3m1": "# 3m1\n\nQui serere ingenuum uolet agrum.\n", "bookshelf/Boethius/Consolatio/3pr2": "# 3pr2\n\nTum defixo paululum uisu.\n",
  };
  /* the stanza step's own seed: a Faerie Queene work under its directive,
     written only when that step asks, so the entries every earlier step
     reads — the books panel, search, Go to — stay as they were; the steps
     hold the same text */
  const stanzaSeeds: Record<string, string> = {
    "bookshelf/Spenser, Edmund": "# Edmund Spenser\n\n- [The Faerie Queene](#bookshelf/Spenser%2C%20Edmund/The%20Faerie%20Queene)\n",
    "bookshelf/Spenser, Edmund/The Faerie Queene": "# The Faerie Queene\n\n::: reference\nroman book and canto\n:::\n\n## Book I: The Legende of the Knight of the Red Crosse, or of Holinesse\n\n- [Canto i](#bookshelf/Spenser%2C%20Edmund/The%20Faerie%20Queene/1.1)\n",
    "bookshelf/Spenser, Edmund/The Faerie Queene/1.1": "# Book I, Canto i\n\n::: note\nThe Patron of true Holinesse,\nFoule Errour doth defeate:\n:::\n\n::: stanza 1\nA Gentle Knight was pricking on the plaine,\nYcladd in mightie armes and siluer shielde,\nWherein old dints of deepe wounds did remaine,\n:::\n\n::: stanza 2\nBut on his brest a bloudie Crosse he bore,\nThe deare remembrance of his dying Lord,\nFor whose sweete sake that glorious badge he wore,\n:::\n\n::: stanza 3\nVpon a great aduenture he was bond,\nThat greatest Gloriana to him gaue,\nThat greatest Glorious Queene of Faerie lond,\n:::\n",
  };
  /* the margin-note step's own seed, written only when that step asks */
  const marginSeeds: Record<string, string> = {
    "bookshelf/Donne, John/Anniversaries/The First Anniversarie": donneMarginNotes, "page/Margins": marginsProse,
  };
  const wrote = q.get("store") === "write" ? layer.setEntry("probe/" + Date.now(), "probe").then(() => stage("set"))
    : q.get("store") === "seed" ? Promise.all(Object.keys(seeds).map((k) => layer.setEntry(k, seeds[k]))).then(() => stage("seed"))
    : q.get("store") === "seed-stanza" ? Promise.all(Object.keys(stanzaSeeds).map((k) => layer.setEntry(k, stanzaSeeds[k]))).then(() => stage("seed"))
    : q.get("store") === "seed-margin" ? Promise.all(Object.keys(marginSeeds).map((k) => layer.setEntry(k, marginSeeds[k]))).then(() => stage("seed"))
    : Promise.resolve();
  /* THE OPEN ENTRY FIRST, from ONE store row, before the warm reads the
     whole journal: without it the entry took two seconds to appear after a
     refresh, the time a full read takes over 13,565 rows (pin: places ›
     before the warm). A day opens whether or not its row exists; a keyed
     entry opens once its row is in the cache, and an absent one waits for
     the warm to answer whether it is refused. The masthead lists read the
     whole cache, so they are redrawn when the warm lands. */
  let opened = false;
  const h0 = hashParts(location.hash.slice(1));
  const primed = wrote.then(() => layer.primeEntry(entryKey(h0.date, h0.tag))).then((found) => {
    if (found || entryKey(h0.date, h0.tag) in layer.cache || !nsOf(h0.date)) { session.openHash(); opened = true; stage("primed"); }
  }, () => {});
  /* the one way a step opens a page before the warm lands (pin: places › before the warm) */
  const held = q.get("warm") === "slow" ? () => new Promise<void>((r) => setTimeout(r, 2000)) : () => undefined;
  primed.then(held).then(() => layer.warm()).then(() => {
    /* an unreadable journal is an error, not a status: it sticks, the
       caught failure copyable */
    if (layer.storeReadFailed) { stage("fail"); root.dataset.store = "failed: " + layer.storeReadError; notices.stickErr("the store could not be read — reload", layer.storeReadError); return; }
    stage("all"); count();
    say(Object.keys(layer.cache).length + " entries stored");
    /* an entry opened from its primed row is redrawn only where the warm
       changes it: the masthead lists, and whether a contents page folds (pin:
       places › the warm landed) */
    if (!opened || session.hashDeferred) session.openHash(); else { refreshMasthead(); session.refreshFolds(); }
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
        /* the open entry may have been overwritten: repainted only where
           the store differs from the surface, what was typed landing first */
        return session.refresh().then(() => refreshMasthead());   /* the key list moved under the tag bar */
      });
    }).catch((err: unknown) => {
      if ((err as Error)?.name === "AbortError") { p?.cancel(); return; }   /* the picker dismissed */
      console.error("import failed", err);
      const msg = failMsg("import failed", err);
      if (p) p.fail(msg, msg); else notices.stickErr("import failed", err);
    });
  };
}
