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
import { failWhy, errText } from "./store/files.ts";
import { said } from "./model/alertText.ts";
import { startSession } from "./session.ts";
import { readRaw, writeRaw, stored } from "./store/local.ts";
import { alertLog, carryLog, chordName, clickName, parseLog, type AlertEntry } from "./ui/alertLog.ts";
import { placeArea } from "./ui/alertArea.ts";
import { landingActs, windowPage, windowHand } from "./ui/landingActs.ts";
import { conventionsOf } from "./store/conventions.ts";
import { bookmarkStore } from "./store/bookmarkStore.ts";
import { alertLedger } from "./ui/alertLedger.svelte.ts";
import { copyText } from "./ui/clipboard.ts";
import { screenState } from "./ui/screen.svelte.ts";
import { loadErrors, refuseCold } from "./ui/journalLoad.ts";
import { mastheadModel } from "./ui/mastheadModel.ts";
import { lifecycle } from "./ui/lifecycle.ts";
import { keptState } from "./ui/keptState.ts";
import { overlays } from "./ui/overlays.ts";
import { bookmarkActs } from "./ui/bookmarkActs.ts";
import { replaceActs } from "./ui/replaceActs.ts";
import { copyButton } from "./ui/copyButtonActs.ts";
import { gotoToolbarActs } from "./ui/gotoToolbarActs.ts";
import { folderActs } from "./ui/folderActs.ts";
import { searchActs } from "./ui/searchActs.ts";
import { gotoRowActs } from "./ui/gotoRowActs.ts";
import { listenHeldKeys, plainChord } from "./ui/heldKeys.ts";
import { pictureMoves } from "./store/pictures.ts";
import { afterLoad } from "./store/toCommonplaces.ts";
import { formatToolbar } from "./ui/formatToolbarActs.ts";
import { backupsPanel } from "./ui/backupsPanelActs.ts";
import { openerActs } from "./ui/openerActs.ts";
import { menuActs } from "./ui/menuActs.ts";
import { stepped } from "./ui/pickKeys.ts";
import { menuArea, browserLayout, provideMenuArea } from "./editor/menuArea.ts";
import { writeCap } from "./editor/fit.ts";
import { isMenu, jRound, reasonOpened, type CloseReason, type MenuName, type Opened } from "./ui/menuModel.ts";
import { NS, asAddress } from "./store/keys.ts";
import { parseShortcuts, filterShortcuts, type Shortcut } from "./store/shortcuts.ts";
import { nsOf } from "./store/keys.ts";
import { journalOf } from "./store/headings.ts";
import { todayKey, entryKey, entryHash } from "./store/keys.ts";
import { hashParts } from "./store/nav.ts";
import Alerts from "./ui/Alerts.svelte";
import Masthead from "./ui/Masthead.svelte";
import FormatToolbar from "./ui/FormatToolbar.svelte";
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

/* the tab's icon, inlined: the page is one file (pin: alerts and surfaces ›
   the tab's icon) */
document.head.append(Object.assign(document.createElement("link"), { rel: "icon", href: icon }));
/* every error and warning, kept three months for later debugging, with
   a reader's last key chord or control clicked; read in the console as
   gesta.alerts(); the log kept under its key before is carried over first,
   and a storage that refuses leaves it where it is */
try { carryLog(localStorage, NS + "flashlog", NS + "alertlog"); } catch {}
const logged = alertLog(stored(NS + "alertlog", parseLog));
let lastAction = "none";
document.addEventListener("keydown", (e) => { lastAction = chordName(e) ?? lastAction; }, true);
document.addEventListener("click", (e) => { lastAction = clickName(e.target instanceof Element ? e.target : null) ?? lastAction; }, true);
const alerts = alertLedger(copyText, (kind, text) => logged.add({ page: document.documentElement.dataset.entry || "", action: lastAction, kind, text }));
(window as unknown as { gesta: object }).gesta = { alerts: (): AlertEntry[] => { const log = logged.entries(); console.table(log); return log; } };
const raise = alerts.raise;
/* the Line numbering choice is kept in this browser, out of the entries, so
   no backup carries it (pin: alerts and surfaces ›
   Line numbering kept across a reload) */
const LINES_KEY = NS + "lineinterval";
const keptInterval = parseInt(readRaw(LINES_KEY) ?? "", 10);
const screen = screenState(q.get("interval") !== null ? +q.get("interval")! : isNaN(keptInterval) || keptInterval < 0 ? 5 : keptInterval);
type WalkDir = "prev" | "next";
function keepPicked(file: File): void {
  const p = alerts.progress("keepingBackup");
  keptBundle!.keep(file).then(() => location.reload(), (err: unknown) => { console.error("the backup could not be kept", err); p.fail(said("couldntKeepBackup", { why: failWhy(err) }), errText(err)); });
}
const acts = {
  today: () => {}, walk: (_dir: "prev" | "next") => {}, export: () => {}, import: () => {}, backups: () => {}, resume: () => {}, sweep: () => {},
  backupsPanel: () => {},
  interval: (_n: number) => {}, opener: (_ns: Opened, _byKey?: boolean) => {}, newRoot: (_ns: MenuName) => {}, shelves: () => {},
  create: () => {}, rename: () => {}, delete: () => {},
  goto: { toggle: (_open: boolean) => {}, pick: (_level: number, _value: string, _ns?: string) => {} },
  formatToolbar: (_act: string) => {},
  copyBlock: () => {},
  lines: (_open: boolean) => {},
  shortcuts: { query: (_q: string) => {}, pick: (_i: number) => {}, walk: (_d: 1 | -1) => {}, enter: () => {}, edit: () => {}, draft: (_v: string) => {}, save: () => {}, escape: () => {} },
  bookmarks: { key: (_e: KeyboardEvent) => {}, act: (_key: string, _what: "jump" | "del" | "key" | "link") => {}, draft: (_v: string) => {}, commit: (_v: string) => {} },
  gotoToolbar: { toggle: () => {}, reask: () => {}, input: (_kind: "line" | "page" | "stanza", _v: string) => {}, enter: (_kind: "line" | "page" | "stanza", _v: string, _repeat: boolean) => {}, close: () => {}, dismiss: () => {} },
  replace: { open: () => {}, find: (_v: string) => {}, with: (_v: string) => {}, next: (_back: boolean) => {}, one: () => {}, all: () => {}, close: () => {}, closeOver: () => {}, dismiss: () => {}, check: () => {} },
  search: {
    toggle: (_open: boolean) => {}, query: (_q: string) => {}, scope: (_at: number) => {}, walk: (_dir: 1 | -1) => {}, enter: () => {}, pick: (_i: number) => {},
    hover: (_i: number) => {},
  },
  menus: {
    open: (_name: MenuName) => {}, close: (_reason: CloseReason) => {}, key: (_e: KeyboardEvent) => false, hover: (_i: number) => {}, choose: (_i: number) => {},
    mounted: (_right: number) => {}, answer: () => {},
  },
};
const closeOpened = (reason: CloseReason = "displaced"): void => { if (isMenu(screen.opened)) acts.menus.close(reason); else screen.opened = null; };
const overlay = overlays({
  opened: (by) => closeOpened(reasonOpened(by)),
  search: () => acts.search.toggle(false),
  goto: () => acts.goto.toggle(false),
  gotoToolbar: () => acts.gotoToolbar.dismiss(),
  gotoToolbarCaret: () => acts.gotoToolbar.close(),
  lines: () => { if (screen.linesOpen) acts.lines(false); },
  replace: () => acts.replace.closeOver(),
  replaceBack: () => acts.replace.close(),
});
if (!READER) {
  mount(FormatToolbar, { target: document.body, props: { toolbar: screen.formatToolbar, onAct: (act: string) => acts.formatToolbar(act) } });
  mount(CopyButton, { target: document.body, props: { copy: screen.copy, onCopy: () => acts.copyBlock() } });
}
const keptBundle = READER ? bundleKeeper(dexieKeyedStore<BundleRow>(READER_DB, READER_STORE, "k")) : null;
const masthead = mount(Masthead, { target: document.body, anchor: document.querySelector("main")!, props: {
  screen, onToday: () => acts.today(), onExport: () => acts.export(), onImport: () => acts.import(),
  /* the choice takes effect whether or not it could be kept: a failed
     write says so, and the select and the gutter agree */
  onInterval: (n: number) => {
    if (!writeRaw(LINES_KEY, String(n))) raise("lineNumbersNotSaved", { caught: null });
    screen.interval = n; acts.interval(n);
  },
  /* the row closed by its own label hands the keys back as ⌃⌘L does
     (pin: where the keys go › Line numbering closed by its label) */
  onLines: (open: boolean) => acts.lines(open),
  onOpener: (ns: Opened) => acts.opener(ns), onCloseOpened: closeOpened, menus: {
    onKey: (e: KeyboardEvent) => acts.menus.key(e), onHover: (i: number) => acts.menus.hover(i), onChoose: (i: number) => acts.menus.choose(i),
    onClose: (reason: CloseReason) => acts.menus.close(reason), onMounted: (right: number) => acts.menus.mounted(right),
  },
  onCreate: () => acts.create(), onRename: () => acts.rename(), onDelete: () => acts.delete(),
  /* a new pick is kept, then read as at any launch */
  reader: READER ? { onOpen: keepPicked, onWalk: (dir: WalkDir) => acts.walk(dir) } : null,
  goto: { onToggle: (open: boolean) => acts.goto.toggle(open), onPick: (level: number, value: string, ns?: string) => acts.goto.pick(level, value, ns) },
  gotoToolbar: { onInput: (kind: "line" | "page" | "stanza", v: string) => acts.gotoToolbar.input(kind, v), onEnter: (kind: "line" | "page" | "stanza", v: string, repeat: boolean) => acts.gotoToolbar.enter(kind, v, repeat), onClose: () => acts.gotoToolbar.close() },
  replace: { onFind: (v: string) => acts.replace.find(v), onWith: (v: string) => acts.replace.with(v), onNext: (back: boolean) => acts.replace.next(back), onOne: () => acts.replace.one(), onAll: () => acts.replace.all(), onClose: () => acts.replace.close() },
  shortcuts: { onQuery: (q: string) => acts.shortcuts.query(q), onPick: (i: number) => acts.shortcuts.pick(i), onWalk: (d: 1 | -1) => acts.shortcuts.walk(d), onEnter: () => acts.shortcuts.enter(), onEdit: () => acts.shortcuts.edit(), onDraft: (v: string) => acts.shortcuts.draft(v), onSave: () => acts.shortcuts.save(), onEscape: () => acts.shortcuts.escape() },
  backups: { onSetup: () => acts.backups(), onResume: () => acts.resume(), onSweep: () => acts.sweep() },
  bookmarks: { onKey: (e: KeyboardEvent) => acts.bookmarks.key(e), onAct: (key: string, what: "jump" | "del" | "key" | "link") => acts.bookmarks.act(key, what), onDraft: (v: string) => acts.bookmarks.draft(v), onCommit: (v: string) => acts.bookmarks.commit(v) },
  search: {
    onToggle: (open: boolean) => acts.search.toggle(open), onQuery: (q: string) => acts.search.query(q), onScope: (at: number) => acts.search.scope(at),
    onWalk: (dir: 1 | -1) => acts.search.walk(dir), onEnter: () => acts.search.enter(), onPick: (i: number) => acts.search.pick(i), onHover: (i: number) => acts.search.hover(i),
  },
} });
/* the alert area, between the masthead and the entry (pin: alertArea.test › the alert area is stuck at the masthead's foot) */
mount(Alerts, { target: document.body, anchor: document.querySelector("main")!, props: { alerts, onResume: () => acts.resume() } });
placeArea(document.documentElement, document.querySelector(".site-head")!, document.querySelector(".alerts")!);
/* the panels are not modal: a click outside any panel or opener closes
   the slot, and so does Escape. Read from the target, not from
   propagation — the components' handlers are delegated, and a
   stopPropagation there would not reach a document listener anyway. */
document.addEventListener("click", (e) => {
  const t = e.target as Element | null;
  if (!t?.closest(".menu, .opener, .helppanel")) closeOpened(document.activeElement === document.body ? "lost" : "outside");
  /* the results are an opaque overlay over the entry: a click into the
     writing lands on them, so a click outside the row closes it */
  if (!t?.closest(".page-search")) acts.search.toggle(false);
});
listenHeldKeys(document, window);
/* ⌃⌘N is "new": a tagged entry, a sub-entry, a book; ⌃⌘L toggles the Line
   numbering row — L for lines; Tab belongs to indent, so a masthead row is
   reached from the editor only by a chord; ⌃⌘R is the reference, so
   replace is ⌃⌘E, for exchange; the menus share ⌃⌘J with the Go to row,
   B being bookmarks */
const roundTo = (to: ReturnType<typeof jRound>): void => {
  if (to === "goto" || to === "none") acts.goto.toggle(to === "goto");
  else acts.opener(to, true);
};
const CHORDS: Record<string, () => void> = {
  k: () => acts.search.toggle(!screen.search.open),
  j: () => roundTo(jRound(screen.opened, screen.goto.open)),
  g: () => acts.gotoToolbar.toggle(),
  h: () => acts.opener("help", true),
  b: () => acts.opener("bookmarks", true),
  s: () => acts.opener("shortcuts", true),
  l: () => acts.lines(!screen.linesOpen),
  n: () => acts.create(),
  e: () => acts.replace.open(),
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") overlay.open("escape");
  if (!plainChord(e)) return;
  /* a letter is matched in either case: Caps Lock leaves the chord a
     chord (pin: alerts and surfaces › ⌃⌘K with Caps Lock) */
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
const layer = entryLayer(readerStore ?? idbEntryStore(), { owner: () => alerts.owner({ holdsSaved: true }), raise }, { announce: (ekey) => tabs?.postMessage(ekey), onLanded: () => armBackup() });
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
/* the backup's status line is an info, each step restarting the clock:
   an autosave "saved" may overwrite "backing up…" (a background backup
   must not suppress the user's own save feedback), and an error outranks
   both */
const bkPanel = backupsPanel({
  bk: screen.backups, canPick: () => !!win.showDirectoryPicker, reader: READER, backup: () => backup,
  layer, images, raise, confirm: (text) => confirm(text), flushSave: () => session.save.flush(),
});
const readBackups = bkPanel.read;
acts.sweep = bkPanel.sweep;
const backup = backupRunner({
  layer, images, store: idbBackupStore(),
  picker: win.showDirectoryPicker ? () => win.showDirectoryPicker!({ mode: "readwrite" }) : null,
  raise,
  onTrouble: (msg) => { alerts.setTrouble(msg); if (screen.opened === "backups") readBackups(); },
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
  /* a warning belongs to the entry it was met on (pin: alerts and places
     › another entry clears the warning); one met before any entry was
     shown, an address refused at launch, stays (pin: bridge › an unknown
     book is refused) */
  if (ekey !== shown.ekey) { leftEntry(); if (shown.ekey) alerts.clearWarning(); }
  else acts.replace.check();
  if (screen.gotoToolbar.open) acts.gotoToolbar.reask();
  if (ekey === shown.ekey && stored === shown.stored) return;
  shown = { ekey, stored };
  refreshMasthead();
  life.shown(ekey, stored);
};
/* the cap on the root before anything is drawn */
writeCap(document.documentElement);
const session = startSession({
  mount: mountEl, layer, images, interval: screen.interval, raise,
  owner: () => alerts.owner(),
  onShow: (stored, ekey) => entryShown(stored, ekey),
  onView: (md) => { dropStaleCopy(); screen.mdView = md; if (md) overlay.open("sourceView"); else acts.replace.dismiss(); },
  onSwitch: () => overlay.open("view"),
  onHere: () => overlay.open("here"),
  onSelect: () => requestAnimationFrame(() => fmt.place()),
  onHighlight: () => { fmt.suppress(); landing.centreSoon(); },
  onLine: (line) => landing.followSoon(line),
  readOnly: READER,
});
/* the one menu area, given before any entry is drawn */
const area = menuArea(browserLayout(document.documentElement), { hold: () => session.holdTop() });
provideMenuArea(area);
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
    Promise.all(keys.map((k) => session.takeTabWrite(k))).then(() => { refreshMasthead(); count(); });
  }, 50);
};
/* leaving the tab with a backup still pending writes it at once, after the
   entry's own flush, registered first so it runs first */
if (!READER) document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") backup.firePendingBackup(); });
acts.interval = (n) => session.setInterval(n);
acts.today = () => session.today();
acts.walk = (dir) => session.step(dir);
acts.lines = (open) => {
  if (open && !screen.gutter) { raise("noLineNumbers"); return; }
  screen.linesOpen = open;
  if (open) { overlay.open("lines"); setTimeout(() => masthead.focusLines(), 0); }
  else session.focusText();
};
const search = searchActs({
  sr: screen.search, session, layer, journal, alerts, reader: READER,
  opened: () => overlay.open("search"),
  focusRow: () => masthead.focusSearch(),
});
Object.assign(acts.search, search);
const goRow = gotoRowActs({
  gt: screen.goto, session, layer, journal,
  opened: () => overlay.open("goto"),
  focusRow: () => masthead.focusGoto(),
});
acts.goto.toggle = goRow.toggle;
acts.goto.pick = goRow.pick;
/* CUSTOM SHORTCUTS (⌃⌘S): a code → text table in ONE localStorage key,
   raw text verbatim, device-local. The panel filters by prefix as you
   type and Enter or a row inserts the highlighted expansion at the
   caret, in either view. The editor's text is loaded ONLY on its
   hidden→shown transition and never while dirty, so a reopen after a
   close cannot wipe lines typed but not yet saved; only a landed Save
   makes it read as storage again. */
/* read inside try: reaching localStorage throws where it is refused,
   and read bare at boot it stopped the page before it drew
   (pin: entries left and renamed › a commonplace opened with localStorage refused) */
const SHORTCUTS_KEY = NS + "shortcuts";
const sc = screen.shortcuts;
let shortcuts: Shortcut[] = parseShortcuts(readRaw(SHORTCUTS_KEY) || "");
const shortcutsError = alerts.owner();
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
   entry inserts nothing (pin: alerts and surfaces › a shortcut chosen with
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
  screen.opened = "shortcuts";
  setTimeout(() => masthead.focusShortcuts(), 0);
};
const insertShortcut = (expansion: string): void => {
  closeOpened();
  if (!cardCaret || !session.insertText(expansion)) { raise("placeCursor"); session.focusText(); }
};
acts.shortcuts.query = (q) => { sc.query = q; renderShortcuts(); };
acts.shortcuts.walk = (dir) => { sc.active = stepped(sc.active, dir, sc.rows.length); };
acts.shortcuts.enter = () => { const row = sc.rows[sc.active]; if (row) insertShortcut(row.expansion); else raise("noShortcut"); };
acts.shortcuts.pick = (i) => { const row = sc.rows[i]; if (row) insertShortcut(row.expansion); };
acts.shortcuts.edit = () => showEditor(!sc.editing);
acts.shortcuts.draft = (v) => { sc.draft = v; sc.dirty = true; };
acts.shortcuts.save = () => {
  try { localStorage.setItem(SHORTCUTS_KEY, sc.draft); }
  catch (e) { shortcutsError.raise("shortcutsNotSaved", { caught: e }); return; }
  shortcutsError.resolve();
  shortcuts = parseShortcuts(sc.draft);
  sc.dirty = false;
  renderShortcuts();
  raise("shortcutsSaved");
};
acts.shortcuts.escape = () => { closeOpened(); session.focusText(); };
const bm = screen.bookmarks;
const marks = bookmarkStore({
  seed: [{ key: "commonplace/Making Verity Cards", alias: "" }, { key: "commonplace/Verdour", alias: "" }],
  error: alerts.owner(),
  storedKeys: () => layer.storedKeys(),
});
const card = bookmarkActs({
  bm, marks, session, journal, raise, overlay, closeOpened, caretInEntry,
  panel: { isOpen: () => screen.opened === "bookmarks", show: () => { screen.opened = "bookmarks"; } },
  focusPanel: () => masthead.focusBookmarks(),
  keysNow: () => Object.keys(layer.cache),
  warmBlock: () => refuseCold(layer, raise),
  warmed: () => layer.warmed,
});
acts.bookmarks.key = card.key;
acts.bookmarks.draft = card.draft;
acts.bookmarks.commit = card.commit;
acts.bookmarks.act = card.act;
const openBookmarks = card.open;
const landing = landingActs({
  session, raise,
  conventions: () => conventionsOf(session.current.date, session.current.tag, journal),
  warmed: () => layer.warmed,
  page: windowPage, hand: windowHand,
});
const gotoToolbar = gotoToolbarActs({
  lb: screen.gotoToolbar, session, journal, raise, landing,
  opened: () => overlay.open("gotoToolbar"),
  focusBar: () => masthead.focusGotoToolbar(),
  listen: (type, f) => document.addEventListener(type, f, true),
});
Object.assign(acts.gotoToolbar, gotoToolbar);
Object.assign(acts.replace, replaceActs({
  rb: screen.replace, session, raise,
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
const copy = copyButton({ cp: screen.copy, session, raise });
acts.copyBlock = copy.copyBlock;
dropStaleCopy = copy.dropStale;
const fmt = formatToolbar({
  toolbar: screen.formatToolbar, buttons: () => screen.masthead.buttons, session, raise, mountEl,
  extract: () => life.extract(), head: document.querySelector(".site-head")!,
});
acts.formatToolbar = fmt.act;
const kept = keptState({
  places: { move: session.movePlace, moveAll: session.movePlaces },
  folds: { move: session.moveFolds, drop: session.dropFolds },
  bookmarks: { move: (moves) => marks.move(moves) },
});
const life = lifecycle({
  layer, journal, session,
  view: () => session.view,
  caretInEntry,
  source: () => session.mdView ? sourcePort : null,
  dialogs: { prompt: (text, value) => prompt(text, value), confirm: (text) => confirm(text), alert: (text) => alert(text) },
  kept,
  ...pictureMoves(images),
  ui: { raise, redraw: refreshMasthead, replaceHash: (hash) => history.replaceState(null, "", hash), hideBar: () => { screen.formatToolbar.show = false; }, focus: () => session.focusText() },
});
acts.create = () => { life.create(); };
acts.rename = () => { life.rename(); };
acts.delete = () => { life.remove(); };
const openers = openerActs({
  screen, layer, journal, session, closeOpened, openBookmarks, openShortcuts, readBackups,
  menus: { open: (name) => acts.menus.open(name), close: (reason) => acts.menus.close(reason), answer: () => acts.menus.answer() },
  open: (opening) => overlay.open(opening),
});
acts.opener = openers.opener;
acts.menus = menuActs({
  ...openers.ports(), area, screen, readOnly: READER, flush: () => session.save.flush(), overlay: () => overlay.open("menu"),
  go: (href) => { location.hash = href; }, isHere: (href) => href === location.hash, act: (name, act) => (act === "shelves" ? acts.shelves() : acts.newRoot(name)),
});
/* A SURFACE OPENED BEFORE THE JOURNAL WAS READ is answered again when the
   read ends, well or badly: the search; the Go to row while nothing has
   been picked in it, its focus put back on its first select; an open
   panel once the pointer has left it, so no row is rebuilt under a
   click, its rows keyed so the keys stay where they were; and the
   backups status (pin: alerts and surfaces ›
   Search opened before the warm) (pin: alerts and surfaces › Go to opened
   before the warm) (pin: alerts and
   surfaces › the bookshelf opened before the warm, the keys on its button) */
const reanswerOpen = (): void => {
  search.reanswer();
  goRow.reanswer();
  openers.reanswer();
};
acts.newRoot = (ns) => {
  closeOpened();
  life.newRoot(ns);
};
acts.shelves = () => {
  closeOpened();
  life.shelves();
};
stage("start");
/* the kept bundle read into the memory store before the open entry is
   primed from it; none kept, the page says where one is found */
const openBundle = (): Promise<void> => keptBundle!.get().then((row) => {
  if (!row) { screen.held = "no backup opened"; raise("noBackupKept"); return; }
  screen.held = heldLabel(row.modified);
  const p = alerts.progress("openingBackup");
  return readBundle(row.file, p.step).then((b) => {
    if (b.written !== null) screen.held = heldLabel(b.written);
    bundlePictures = bundleImages(row.file, b.pictures);
    const keys = Object.keys(b.entries);
    return Promise.all(keys.map((k) => readerStore!.foreignSet(k, b.entries[k]))).then(() => { p.ok(said("bundleOpened", { n: keys.length })); stage("bundle"); });
  }).catch((err: unknown) => { console.error("the backup could not be read", err); p.fail(said("couldntReadBackup", { why: failWhy(err) }), errText(err)); });
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
/* a bare launch names the day it opens in the address (pin: alerts and
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
const loadWatch = loadErrors(LOAD_PATIENCE_MS, alerts.owner());
/* the bundle's own progress line speaks while it is read, however long a
   slow device takes */
if (READER) wrote.then(loadWatch.start); else loadWatch.start();
/* the pages became commonplaces before anything reads the keys: the
   lists, the search index, the backup's folders */
primed.then(held).then(() => layer.warm()).then(() => loadWatch.landed(layer)).then(afterLoad({ layer, pictures: pictureMoves(images), kept: [(moved) => kept.relocate({ moved })], readOnly: READER })).then((migrated) => {
  if (layer.storeReadFailed) { stage("fail"); root.dataset.store = "failed: " + layer.storeReadError; reanswerOpen(); return; }
  stage("all"); count();
  raise("entriesStored", { n: Object.keys(layer.cache).length });
  /* an entry opened from its primed row is redrawn only where the warm
     changes it: the masthead lists, and whether a contents page folds (pin:
     places › the warm landed) */
  if (!opened || session.hashDeferred) session.openHash(); else { refreshMasthead(); session.refreshFolds(); }
  /* an entry opened before the migration shows the links it rewrote */
  if (migrated) session.refresh();
  reanswerOpen();
  landing.replayOwed();
  search.buildIndex();
  /* `?corner=pill` draws the paused pill on a profile with no backup
     folder, AFTER the launch run, which clears the trouble of an
     unconfigured backup: the one state no headless run reaches */
  if (!READER) backup.runBackup().then(() => { if (q.get("corner") === "pill") alerts.setTrouble(PAUSED_MSG); });
});
const folders = folderActs({
  session, layer, images, alerts, picker: () => win.showDirectoryPicker?.bind(window), count, refreshMasthead,
  warmBlock: () => refuseCold(layer, raise),
});
acts.export = folders.exportAll;
acts.import = folders.importFolder;

