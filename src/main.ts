/* `?store=write` writes one probe row; `?corner=pill` draws the paused
   pill; `?warm=slow` holds the warm two seconds. */
import "./editor/editor.css";
import "./ui/ui.css";
import { mount } from "svelte";
import { idbEntryStore, idbImageStore, idbBackupStore, memEntryStore, dexieKeyedStore, type ImageStore } from "./store/store.ts";
import { readBundle, bundleImages, bundleKeeper, heldLabel, READER_DB, READER_STORE, type BundleRow } from "./store/bundle.ts";
import { backupRunner, PAUSED_MSG } from "./store/backup.ts";
import { entryLayer } from "./store/entries.ts";
import type { Dir } from "./store/fsa.ts";
import { failMsg, errText } from "./store/files.ts";
import { startSession } from "./session.ts";
import { readRaw, writeRaw } from "./store/local.ts";
import { bookmarkStore } from "./store/bookmarkStore.ts";
import { noticeLedger } from "./ui/notices.svelte.ts";
import { copyText } from "./ui/clipboard.ts";
import { screenState } from "./ui/screen.svelte.ts";
import { loadPatience } from "./ui/loadPatience.ts";
import { mastheadModel } from "./ui/mastheadModel.ts";
import { lifecycle, refuseCold } from "./ui/lifecycle.ts";
import { overlays } from "./ui/overlays.ts";
import { bookmarkActs } from "./ui/bookmarkActs.ts";
import { replaceActs } from "./ui/replaceActs.ts";
import { copyButton } from "./ui/copyButtonActs.ts";
import { lineBarActs } from "./ui/lineBarActs.ts";
import { folderActs } from "./ui/folderActs.ts";
import { searchActs } from "./ui/searchActs.ts";
import { gotoActs } from "./ui/gotoActs.ts";
import { listenHeldKeys, plainChord } from "./ui/heldKeys.ts";
import { pictureMoves } from "./store/pictures.ts";
import { formatBar } from "./ui/formatBarActs.ts";
import { backupsPanel } from "./ui/backupsPanelActs.ts";
import { panelActs, type PanelName, type Ns } from "./ui/panelActs.ts";
import { NS, asAddress } from "./store/keys.ts";
import { parseShortcuts, filterShortcuts, type Shortcut } from "./store/shortcuts.ts";
import { nsOf } from "./store/keys.ts";
import { journalOf } from "./store/headings.ts";
import { todayKey, entryKey, entryHash } from "./store/keys.ts";
import { hashParts } from "./store/nav.ts";
import Corner from "./ui/Corner.svelte";
import Masthead from "./ui/Masthead.svelte";
import Toolbar from "./ui/Toolbar.svelte";
import CopyButton from "./ui/CopyButton.svelte";
import icon from "./favicon.ico?inline";

/* the read-only build (`vite build --mode reader`): the entries a picked
   bundle holds, every one locked */
const READER = import.meta.env.MODE === "reader";
/* a gutter whose numbers the Line numbering row sets: not one a page's own numbered blocks draw */
const offersInterval = (dom: HTMLElement): boolean => dom.classList.contains("versepage") && !dom.classList.contains("ownnumbers");
if (READER) document.title = "Gesta reader";
const mountEl = document.getElementById("editor") as HTMLElement;
const root = document.documentElement;
const stage = (s: string): void => { root.dataset.probe = (root.dataset.probe || "") + s + ";"; };
const q = new URLSearchParams(location.search);
/* ms before a store that has not answered is said not to have loaded */
const LOAD_PATIENCE_MS = 8000;

/* the tab's icon, inlined: the page is one file (pin: notices and surfaces ›
   the tab's icon) */
document.head.append(Object.assign(document.createElement("link"), { rel: "icon", href: icon }));
const notices = noticeLedger(copyText);
const say = notices.whisper;
/* the Line numbering choice is kept in this browser, out of the entries, so
   no backup carries it (pin: notices and surfaces ›
   Line numbering kept across a reload) */
const LINES_KEY = NS + "lineinterval";
const keptInterval = parseInt(readRaw(LINES_KEY) ?? "", 10);
const screen = screenState(q.get("interval") !== null ? +q.get("interval")! : isNaN(keptInterval) || keptInterval < 0 ? 5 : keptInterval);
type WalkDir = "prev" | "next";
function keepPicked(file: File): void {
  const p = notices.progress("keeping the backup…");
  keptBundle!.keep(file).then(() => location.reload(), (err: unknown) => { console.error("the backup could not be kept", err); p.fail(failMsg("couldn't keep the backup", err), errText(err)); });
}
const acts = {
  today: () => {}, walk: (_dir: "prev" | "next") => {}, export: () => {}, import: () => {}, backups: () => {}, resume: () => {}, sweep: () => {},
  backupsPanel: () => {},
  interval: (_n: number) => {}, panel: (_ns: PanelName, _byKey?: boolean) => {}, newRoot: (_ns: Ns) => {}, shelves: () => {},
  create: () => {}, rename: () => {}, delete: () => {},
  goto: { toggle: (_open: boolean) => {}, pick: (_level: number, _value: string, _ns?: string) => {} },
  bar: (_act: string) => {},
  copyBlock: () => {},
  lines: (_open: boolean) => {},
  shortcuts: { query: (_q: string) => {}, pick: (_i: number) => {}, walk: (_d: 1 | -1) => {}, enter: () => {}, edit: () => {}, draft: (_v: string) => {}, save: () => {}, escape: () => {} },
  bookmarks: { key: (_e: KeyboardEvent) => {}, act: (_key: string, _what: "jump" | "del" | "key" | "link") => {}, draft: (_v: string) => {}, commit: (_v: string) => {} },
  lineBar: { toggle: () => {}, reask: () => {}, input: (_kind: "line" | "page" | "stanza", _v: string) => {}, enter: (_kind: "line" | "page" | "stanza", _v: string, _repeat: boolean) => {}, close: () => {}, dismiss: () => {} },
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
if (!READER) {
  mount(Toolbar, { target: document.body, props: { bar: screen.bar, onAct: (act: string) => acts.bar(act) } });
  mount(CopyButton, { target: document.body, props: { copy: screen.copy, onCopy: () => acts.copyBlock() } });
}
const keptBundle = READER ? bundleKeeper(dexieKeyedStore<BundleRow>(READER_DB, READER_STORE, "k")) : null;
const masthead = mount(Masthead, { target: document.body, anchor: document.querySelector("main")!, props: {
  screen, onToday: () => acts.today(), onExport: () => acts.export(), onImport: () => acts.import(),
  /* the choice takes effect whether or not it could be kept: a failed
     write says so, and the select and the gutter agree */
  onInterval: (n: number) => {
    if (!writeRaw(LINES_KEY, String(n))) notices.stickErrIdle("line numbers not saved — storage full", null);
    screen.interval = n; acts.interval(n);
  },
  /* the row closed by its own label hands the keys back as ⌃⌘L does
     (pin: where the keys go › Line numbering closed by its label) */
  onLines: (open: boolean) => acts.lines(open),
  onPanel: (ns: PanelName) => acts.panel(ns), onClosePanel: closePanel, onNewRoot: (ns: Ns) => acts.newRoot(ns), onShelves: () => acts.shelves(),
  onCreate: () => acts.create(), onRename: () => acts.rename(), onDelete: () => acts.delete(),
  /* a new pick is kept, then read as at any launch */
  reader: READER ? { onOpen: keepPicked, onWalk: (dir: WalkDir) => acts.walk(dir) } : null,
  goto: { onToggle: (open: boolean) => acts.goto.toggle(open), onPick: (level: number, value: string, ns?: string) => acts.goto.pick(level, value, ns) },
  lineBar: { onInput: (kind: "line" | "page" | "stanza", v: string) => acts.lineBar.input(kind, v), onEnter: (kind: "line" | "page" | "stanza", v: string, repeat: boolean) => acts.lineBar.enter(kind, v, repeat), onClose: () => acts.lineBar.close() },
  replace: { onFind: (v: string) => acts.replace.find(v), onWith: (v: string) => acts.replace.with(v), onNext: (back: boolean) => acts.replace.next(back), onOne: () => acts.replace.one(), onAll: () => acts.replace.all(), onClose: () => acts.replace.close() },
  shortcuts: { onQuery: (q: string) => acts.shortcuts.query(q), onPick: (i: number) => acts.shortcuts.pick(i), onWalk: (d: 1 | -1) => acts.shortcuts.walk(d), onEnter: () => acts.shortcuts.enter(), onEdit: () => acts.shortcuts.edit(), onDraft: (v: string) => acts.shortcuts.draft(v), onSave: () => acts.shortcuts.save(), onEscape: () => acts.shortcuts.escape() },
  backups: { onSetup: () => acts.backups(), onResume: () => acts.resume(), onSweep: () => acts.sweep() },
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
listenHeldKeys(document, window);
/* ⌃⌘N is "new": a tagged entry, a sub-page, a book; ⌃⌘L toggles the Line
   numbering row — L for lines; Tab belongs to indent, so no masthead row is
   reachable from the editor without a chord of its own; ⌃⌘R is the
   reference, so replace is ⌃⌘E, for exchange */
const CHORDS: Record<string, () => void> = {
  k: () => acts.search.toggle(!screen.search.open),
  j: () => acts.goto.toggle(!screen.goto.open),
  g: () => acts.lineBar.toggle(),
  h: () => acts.panel("help", true),
  b: () => acts.panel("bookmarks", true),
  s: () => acts.panel("shortcuts", true),
  l: () => acts.lines(!screen.linesOpen),
  n: () => acts.create(),
  e: () => acts.replace.open(),
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") overlay.open("escape");
  if (!plainChord(e)) return;
  /* a letter is matched in either case: Caps Lock leaves the chord a
     chord (pin: notices and surfaces › ⌃⌘K with Caps Lock) */
  const k = e.key.toLowerCase();
  if (READER && "hbsne".includes(k)) return;
  const chord = CHORDS[k];
  if (!chord) return;
  e.preventDefault();
  chord();
});

const tabs = !READER && typeof BroadcastChannel === "function" ? new BroadcastChannel(NS + "entries") : null;
/* every landed write or delete arms the folder backup, not typing alone:
   an import, a rename or a delete waited for the next launch
   (pin: entries.test › a landed write and a landed delete are told to onLanded) */
let armBackup = (): void => {};
const readerStore = READER ? memEntryStore() : null;
const layer = entryLayer(readerStore ?? idbEntryStore(), notices.entry, { announce: (ekey) => tabs?.postMessage(ekey), onLanded: () => armBackup() });
let bundlePictures: ImageStore | null = null;
const images: ImageStore = READER ? {
  get: (id) => bundlePictures ? bundlePictures.get(id) : Promise.resolve(null),
  set: () => Promise.reject(new Error("nothing is written here")),
  del: () => Promise.reject(new Error("nothing is written here")),
  keys: () => bundlePictures ? bundlePictures.keys() : Promise.resolve([]),
  clear: () => Promise.resolve(),
} : idbImageStore();
const count = (): void => { root.dataset.store = String(Object.keys(layer.cache).length); };

const win = window as unknown as { showDirectoryPicker?: (opts?: { mode?: "read" | "readwrite" }) => Promise<Dir> };
/* the backup's status line is a whisper, each step restarting the clock:
   an autosave "saved" may overwrite "backing up…" (a background backup
   must not suppress the user's own save feedback), and a pin outranks
   both */
const bkPanel = backupsPanel({
  bk: screen.backups, canPick: () => !!win.showDirectoryPicker, reader: READER, backup: () => backup,
  layer, images, say, confirm: (text) => confirm(text), flushSave: () => session.flushSave(),
});
const readBackups = bkPanel.read;
acts.sweep = bkPanel.sweep;
const backup = backupRunner({
  layer, images, store: idbBackupStore(),
  picker: win.showDirectoryPicker ? () => win.showDirectoryPicker!({ mode: "readwrite" }) : null,
  say,
  onTrouble: (msg) => { notices.setTrouble(msg); if (screen.panel === "backups") readBackups(); },
  stick: (text, err, copy) => { notices.stickErr(text, err, copy); },
});
armBackup = () => backup.scheduleBackup();
acts.backups = () => { backup.setupBackupFolder().then(readBackups); };
acts.resume = () => { backup.resumeBackups().then(readBackups); };
/* the masthead reads the open entry: recomputed when the entry or the
   text the store holds changes — an open, a landed save, an import's
   re-render — never per keystroke, since a day's tag list is a walk over
   every key. The heading behind the title row is memoised on the text. */
const journal = journalOf(layer.cache);
let shown = { ekey: "", stored: "" };
let dropStaleCopy = (): void => {};
const refreshMasthead = (): void => {
  const c = session.current;
  screen.masthead = mastheadModel(c.date, c.tag, { keys: Object.keys(layer.cache), journal, today: todayKey() });
};
/* the search's query belongs to the entry left */
const leftEntry = (): void => {
  Object.assign(screen.search, { query: "", rows: [], empty: "" });
  overlay.open("navigated");
};
const entryShown = (stored: string, ekey: string): void => {
  dropStaleCopy();
  screen.gutter = !!session.view && offersInterval(session.view.dom);
  if (ekey !== shown.ekey) leftEntry();
  else acts.replace.check();
  if (screen.lineBar.open) acts.lineBar.reask();
  if (ekey === shown.ekey && stored === shown.stored) return;
  shown = { ekey, stored };
  refreshMasthead();
  life.shown(ekey, stored);
};
const session = startSession({
  mount: mountEl, layer, images, interval: screen.interval, say,
  stick: (text, copy) => { notices.stick(text, copy); },
  pin: (text, copy) => notices.stick(text, copy), pinned: () => notices.pinned, releasePin: (gen) => notices.releasePin(gen),
  onShow: (stored, ekey) => entryShown(stored, ekey),
  onView: (md) => { dropStaleCopy(); screen.mdView = md; if (md) overlay.open("sourceView"); else acts.replace.dismiss(); },
  onSwitch: () => overlay.open("view"),
  onHere: () => overlay.open("here"),
  onSelect: () => requestAnimationFrame(() => fmt.place()),
  onHighlight: () => { fmt.suppress(); lineActs.centreSoon(); },
  onLine: (line) => lineActs.landSoon(line),
  readOnly: READER,
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
if (!READER) document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") backup.firePendingBackup(); });
acts.interval = (n) => session.setInterval(n);
acts.today = () => session.today();
acts.walk = (dir) => session.step(dir);
acts.lines = (open) => {
  if (open && !screen.gutter) { say("no line numbers here", 2000); return; }
  screen.linesOpen = open;
  if (open) { overlay.open("lines"); setTimeout(() => masthead.focusLines(), 0); }
  else session.focusText();
};
const search = searchActs({
  sr: screen.search, session, layer, journal, notices, reader: READER,
  opened: () => overlay.open("search"),
  focusRow: () => masthead.focusSearch(),
});
Object.assign(acts.search, search);
const goRow = gotoActs({
  gt: screen.goto, session, layer, journal,
  opened: () => overlay.open("goto"),
  focusRow: () => masthead.focusGoto(),
});
acts.goto.toggle = goRow.toggle;
acts.goto.pick = goRow.pick;
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
const editorIdle = (): boolean => !sc.editing && !sc.dirty;
const showEditor = (on: boolean): void => {
  if (on && editorIdle()) sc.draft = readRaw(SHORTCUTS_KEY) || "";
  sc.editing = on;
};
/* WHERE THE KEYS WERE when a card opened or an act began: the window's
   selection, which a button's press leaves where it was. A card that
   inserts reads it at its opening, so a card opened from outside the
   entry inserts nothing (pin: notices and surfaces › a shortcut chosen with
   no cursor in the entry) */
const caretInEntry = (): boolean => { const a = document.getSelection()?.anchorNode; return !!a && mountEl.contains(a); };
const sourcePort = { insertAfter: (text: string) => { session.insertText(text, true); }, inHeading: () => session.sourceLineIsHeading() };
let cardCaret = false;
const openShortcuts = (): void => {
  cardCaret = caretInEntry();
  overlay.open("shortcuts");
  sc.query = "";
  sc.editing = false;
  renderShortcuts();
  screen.panel = "shortcuts";
  setTimeout(() => masthead.focusShortcuts(), 0);
};
const insertShortcut = (expansion: string): void => {
  closePanel();
  if (!cardCaret || !session.insertText(expansion)) { say("place your cursor in the entry", 2000); session.focusText(); }
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
acts.shortcuts.escape = () => { closePanel(); session.focusText(); };
const bm = screen.bookmarks;
const marks = bookmarkStore({
  seed: [{ key: "page/Making Verity Cards", alias: "" }, { key: "page/Verdour", alias: "" }],
  pin: (text, err) => notices.stickErrIdle(text, err),
  release: (gen) => notices.releasePin(gen),
  storedKeys: () => layer.storedKeys(),
});
const card = bookmarkActs({
  bm, marks, session, journal, say, overlay, closePanel, caretInEntry,
  panel: { isOpen: () => screen.panel === "bookmarks", show: () => { screen.panel = "bookmarks"; } },
  focusCard: () => masthead.focusBookmarks(),
  keysNow: () => Object.keys(layer.cache),
  warmBlock: () => refuseCold(layer, say),
  warmed: () => layer.warmed,
});
acts.bookmarks.key = card.key;
acts.bookmarks.draft = card.draft;
acts.bookmarks.commit = card.commit;
acts.bookmarks.act = card.act;
const openBookmarks = card.open;
const lineActs = lineBarActs({
  lb: screen.lineBar, session, journal, say,
  opened: () => overlay.open("lineBar"),
  focusBar: () => masthead.focusLineBar(),
  warmed: () => layer.warmed,
});
Object.assign(acts.lineBar, lineActs);
Object.assign(acts.replace, replaceActs({
  rb: screen.replace, session, say,
  opened: () => overlay.open("replace"),
  focusBar: () => masthead.focusReplace(),
}));
/* the layout viewport's width on the root, as --client-w: 100vw
   counts a classic scrollbar's width and overflowed by it; observed on the
   root element, not the window's resize, because a scrollbar's arrival
   changes the width and fires no resize */
const clientW = (): void => { document.documentElement.style.setProperty("--client-w", document.documentElement.clientWidth + "px"); };
clientW();
new ResizeObserver(clientW).observe(document.documentElement);
const copy = copyButton({ cp: screen.copy, session, say });
acts.copyBlock = copy.copyBlock;
dropStaleCopy = copy.dropStale;
const fmt = formatBar({
  bar: screen.bar, buttons: () => screen.masthead.buttons, session, say, mountEl,
  extract: () => life.extract(), head: document.querySelector(".site-head")!,
});
acts.bar = fmt.act;
const life = lifecycle({
  layer, journal, session,
  view: () => session.view,
  caretInEntry,
  source: () => session.mdView ? sourcePort : null,
  dialogs: { prompt: (text, value) => prompt(text, value), confirm: (text) => confirm(text), alert: (text) => alert(text) },
  moveKept: (folds, bookmarks) => {
    session.moveFolds(folds);
    marks.move(bookmarks);
  },
  ...pictureMoves(images),
  ui: { say, pin: (text) => { notices.stick(text); }, redraw: refreshMasthead, replaceHash: (hash) => history.replaceState(null, "", hash), hideBar: () => { screen.bar.show = false; }, focus: () => session.focusText() },
});
acts.create = () => { life.create(); };
acts.rename = () => { life.rename(); };
acts.delete = () => { life.remove(); };
const panels = panelActs({
  screen, layer, journal, session, closePanel, openBookmarks, openShortcuts, readBackups,
  open: (opening) => overlay.open(opening),
});
acts.panel = panels.panel;
/* A SURFACE OPENED BEFORE THE JOURNAL WAS READ is answered again when the
   read ends, well or badly: the search; the Go to row while nothing has
   been picked in it, its focus put back on its first select; an open
   panel once the pointer has left it, so no row is rebuilt under a
   click, its rows keyed so the keys stay where they were; and the
   backups status (pin: notices and surfaces ›
   Search opened before the warm) (pin: notices and surfaces › Go to opened
   before the warm) (pin: notices and
   surfaces › the bookshelf opened before the warm, the keys on its button) */
const reanswerOpen = (): void => {
  search.reanswer();
  goRow.reanswer();
  panels.reanswer();
};
acts.newRoot = (ns) => {
  closePanel();
  life.newRoot(ns);
};
acts.shelves = () => {
  closePanel();
  life.shelves();
};
stage("start");
/* the kept bundle read into the memory store before the open entry is
   primed from it; none kept, the page says where one is found */
const openBundle = (): Promise<void> => keptBundle!.get().then((row) => {
  if (!row) { screen.held = "no backup opened"; notices.stick("open backup: gesta.zip in Dropbox › gesta-backups › reader"); return; }
  screen.held = heldLabel(row.modified);
  const p = notices.progress("opening the backup…");
  return readBundle(row.file, p.step).then((b) => {
    if (b.written !== null) screen.held = heldLabel(b.written);
    bundlePictures = bundleImages(row.file, b.pictures);
    const keys = Object.keys(b.entries);
    return Promise.all(keys.map((k) => readerStore!.foreignSet(k, b.entries[k]))).then(() => { p.ok(keys.length + " entries"); stage("bundle"); });
  }).catch((err: unknown) => { console.error("the backup could not be read", err); p.fail(failMsg("couldn't read the backup", err), errText(err)); });
});
const wrote = READER ? openBundle() : q.get("store") === "write" ? layer.setEntry("probe/" + Date.now(), "probe").then(() => stage("set"))
  : Promise.resolve();
/* THE OPEN ENTRY FIRST, from ONE store row, before the warm reads the
   whole journal: without it the entry took two seconds to appear after a
   refresh, the time a full read takes over 13,565 rows (pin: places ›
   before the warm). A day opens whether or not its row exists; a keyed
   entry opens once its row is in the cache, and an absent one waits for
   the warm to answer whether it is refused. The masthead lists read the
   whole cache, so they are redrawn when the warm lands. */
let opened = false;
/* a bare launch names the day it opens in the address (pin: notices and
   surfaces › a bare launch) */
if (!location.hash) history.replaceState(null, "", entryHash(todayKey()));
const h0 = hashParts(asAddress(location.hash));
const opensNow = (found: boolean): boolean => found || entryKey(h0.date, h0.tag) in layer.cache || !nsOf(h0.date);
const primed = wrote.then(() => layer.primeEntry(entryKey(h0.date, h0.tag))).then((found) => {
  if (opensNow(found)) { session.openHash(); opened = true; stage("primed"); }
}, () => {});
/* the one way a step opens a page before the warm lands (pin: places › before the warm),
   and one where it never does (pin: losing nothing › a store that never answers) */
const held = q.get("warm") === "slow" ? () => new Promise<void>((r) => setTimeout(r, 2000))
  : q.get("warm") === "hang" ? () => new Promise<void>(() => {}) : () => undefined;
/* asked once: an unpersisted store may be evicted under storage pressure
   (pin: losing nothing › a store that never answers) */
navigator.storage?.persist?.().catch(() => {});
const patience = loadPatience(LOAD_PATIENCE_MS, notices);
/* the bundle's own progress line speaks while it is read, however long a
   slow device takes */
if (READER) wrote.then(patience.start); else patience.start();
primed.then(held).then(() => layer.warm()).then(() => {
  patience.done();
  /* an unreadable journal is an error, not a status: it sticks, the
     caught failure copyable */
  if (layer.storeReadFailed) { stage("fail"); root.dataset.store = "failed: " + layer.storeReadError; notices.stickErr("the store could not be read — reload", layer.storeReadError); reanswerOpen(); return; }
  stage("all"); count();
  say(Object.keys(layer.cache).length + " entries stored");
  /* an entry opened from its primed row is redrawn only where the warm
     changes it: the masthead lists, and whether a contents page folds (pin:
     places › the warm landed) */
  if (!opened || session.hashDeferred) session.openHash(); else { refreshMasthead(); session.refreshFolds(); }
  reanswerOpen();
  lineActs.replayOwed();
  search.buildIndex();
  /* `?corner=pill` draws the paused pill on a profile with no backup
     folder, AFTER the launch run, which clears the trouble of an
     unconfigured backup: the one state no headless run reaches */
  if (!READER) backup.runBackup().then(() => { if (q.get("corner") === "pill") notices.setTrouble(PAUSED_MSG); });
});
const folders = folderActs({
  session, layer, images, notices, say, picker: () => win.showDirectoryPicker?.bind(window), count, refreshMasthead,
  warmBlock: () => refuseCold(layer, say),
});
acts.export = folders.exportAll;
acts.import = folders.importFolder;

