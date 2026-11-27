import type { EditorView } from "prosemirror-view";
import type { Node } from "prosemirror-model";
import { imageView, pastedPictureBytes } from "./editor/images.ts";
import { nextImageName, pictureKey } from "./store/names.ts";
import { imageRefs } from "./store/exportEntries.ts";
import { pictureBlob } from "./store/pictures.ts";
import { setLineInterval } from "./editor/lineNumbers.ts";
import { entryKey, entryHash, todayKey, nsOf, tagParts, NS, asAddress } from "./store/keys.ts";
import { entryFile } from "./store/names.ts";
import { hashParts } from "./store/nav.ts";
import { navNeighbors, unmintedKey, registered } from "./store/lists.ts";
import { subEntryOrder, type ContentsLink } from "./store/contents.ts";
import { foldMemory, parseFoldStore } from "./store/foldMemory.ts";
import { stored } from "./store/local.ts";
import { errText } from "./store/files.ts";
import { foldsKey, setFolds } from "./editor/folds.ts";
import { journalOf } from "./store/headings.ts";
import { referencePayload, entryLinkParts, referenceAnchorHTML, REFUSAL_ALERT } from "./editor/reference.ts";
import { writeClipboard } from "./ui/clipboard.ts";
import { richReferenceHtml } from "./ui/richCopy.ts";
import type { EntryLayer } from "./store/entries.ts";
import { entrySave, type EntrySave } from "./store/entrySave.ts";
import type { ImageStore } from "./store/store.ts";
import { highlightIn, escapeJump } from "./editor/highlight.ts";
import type { Highlight } from "./store/keys.ts";
import { shownOf, surfaces, type Shown, type Surface, type Viewport } from "./editor/surface.ts";
import { placeKeeper, type Page } from "./editor/placeKeeper.ts";
import { htmlMode, type HtmlMode } from "./editor/htmlMode.ts";
import { markdownMode } from "./editor/markdownMode.ts";
import { screenTake, type ScreenTake } from "./ui/tabWrite.ts";
import { alertWords, said, type Raise, type Said, type ErrorOwner } from "./model/alertText.ts";
import { refuseCold } from "./ui/journalLoad.ts";
import { pageTop, pageTopCached } from "./ui/alertArea.ts";
import { publish } from "./published.ts";

export type OpenHow = "arrive" | "keep";
/* what a navigation to where you already are says */
export type Same = Said;
export interface SessionOptions {
  mount: HTMLElement;
  layer: EntryLayer;
  images: ImageStore;
  interval: number;
  raise: Raise;
  owner: () => ErrorOwner;
  onShow?: (stored: string, ekey: string) => void;
  onView?: (md: boolean) => void;
  /* a navigation to the entry already open */
  onHere?: () => void;
  /* ⌃⌘M pressed, before the switch */
  onSwitch?: () => void;
  /* read AFTER the editor has the selection: the DOM's selectionchange
     runs a beat ahead of the state. Unpinned: headless Helium does not
     reproduce the beat */
  onSelect?: () => void;
  onHighlight?: () => void;
  onLine?: (line: string) => void;
  /* every entry locked and markdown mode refused */
  readOnly?: boolean;
}
export interface Session {
  readonly current: { date: string; tag: string | null };
  readonly shown: Shown | null;
  /* the open entry is one an import is writing */
  readonly locked: boolean;
  /* the focus back to the text in either view, its selection as it stands
     (pin: markdown mode › ⌃⌘K, then Escape, in markdown mode) */
  focusText(): void;
  /* the line at the window's top kept there while the page reflows, until
     a hand moves; at the entry's very top, nothing is held */
  holdTop(): void;
  /* null: every entry takes typing again */
  lockEntries(keys: Set<string> | null): void;
  open(date: string, tag: string | null, how?: OpenHow): void;
  openHash(): void;
  /* another tab landed a write under ekey */
  takeTabWrite(ekey: string): Promise<void>;
  readonly save: Pick<EntrySave, "now" | "flush" | "handOver">;
  refresh(): Promise<void>;
  surfaceMd(): string;
  readonly hashDeferred: boolean;
  refreshFolds(): void;
  /* to null: deleted (pin: placeState.test › a rename carries the place) */
  movePlace(from: string, to: string | null): void;
  movePlaces(moves: Record<string, string>): void;
  moveFolds(moves: Record<string, string>): void;
  dropFolds(keys: string[]): void;
  goto(hash: string, sameMsg?: Same): void;
  step(dir: "prev" | "next"): void;
  today(): void;
  /* `all`: a block numbered on both sides quoted with both its columns */
  copyReference(all?: boolean): void;
  copyEntryLink(): void;
  /* honorMarkers for a search-box jump; a link's payload is literal
     (pin: search › Enter) (pin: reference paste › the reference link followed) */
  highlight(q: string, nth: number, honorMarkers: boolean): boolean;
  insertText(text: string, after?: boolean): boolean;
  setView(md: boolean): void;
  /* the other view, refused on a read-only page */
  switchView(): void;
  showWordCount(): void;
  jump(date: string, tag: string | null, hl: Highlight, honorMarkers: boolean): void;
  setInterval(n: number): void;
}

export function startSession(opts: SessionOptions): Session {
  const { mount, layer, images, raise } = opts;
  const deleted = opts.owner(), rescued = opts.owner(), copied = opts.owner(), fenced = opts.owner();
  const journal = journalOf(layer.cache);
  let interval = opts.interval;
  let current = { date: todayKey(), tag: null as string | null };
  let html: HtmlMode | null = null;
  const live = (): EditorView | null => html && surface.current === html ? html.view : null;
  /* the highlight owed to the next paint, and the navigation it belongs
     to: a later navigation drops it, or it would select against the wrong
     entry. Unpinned: a race between two tasks no step can order */
  let pending: { hl: Highlight; honor: boolean; gen: number } | null = null;
  let navGen = 0;
  const currentMd = (): string => surface.current ? surface.current.md() : "";
  const ekeyOf = (): string => entryKey(current.date, current.tag);
  const show = (): void => {
    if (!surface.current || !opts.onShow) return;
    opts.onShow(layer.entryMd(ekeyOf()), ekeyOf());
  };
  const save = entrySave({
    screen: () => (surface.current ? { ekey: ekeyOf(), md: currentMd() } : null),
    layer,
    wrote: () => { show(); },
    refused: (md) => { rescued.raise("notSavedDeletedElsewhere", { copy: md }); },
    pending: (n) => { publish("savesPending", n); },
  });
  const edited = (): void => { save.edited(); show(); };
  /* WHERE A PICTURE WAS AIMED is checked when its bytes are ready: a reader
     can navigate while the decode runs. Every way it cannot land sticks:
     the gesture is spent. (pin: picture › a picture pasted, then another entry at once) */
  let decoding = false;
  /* a write that fails is not a picture that could not be read, and only
     a full store is said to be full; the error copies the caught error
     (pin: alerts and surfaces › a picture whose write fails) */
  function pictureNotSaved(err: unknown): void {
    console.error("picture not saved", err);
    raise((err as { name?: string })?.name === "QuotaExceededError" ? "pictureNotSavedFull" : "pictureNotSaved", { copy: errText(err) });
  }
  function landPicture(bytes: Awaited<ReturnType<typeof pastedPictureBytes>>, aimedAt: string, aimedView: boolean): Promise<void> | void {
    if (aimedAt !== ekeyOf() || aimedView !== surface.md) { raise("pictureNowhere"); return; }
    const name = nextImageName(entryFile(current.date, current.tag).base, imageRefs(currentMd()));
    return images.set(pictureKey(current.date, current.tag, name), bytes).then(() => { surface.current?.insertPicture(name); }, pictureNotSaved);
  }
  function pasteFile(file: File): void {
    if (locked?.has(ekeyOf())) return;
    if (decoding) { raise("pictureOneAtATime"); return; }
    const aimedAt = ekeyOf(), aimedView = surface.md;
    decoding = true;
    pastedPictureBytes(file).then((bytes) => { decoding = false; return landPicture(bytes, aimedAt, aimedView); })
      .catch((err: unknown) => { decoding = false; console.error("picture not pasted", err); raise("pictureUnreadable"); });
  }
  const folds = foldMemory(stored(NS + "folds", parseFoldStore), () => Object.keys(layer.cache));
  /* the masthead is sticky over the page's top: a place is read, and set,
     just under it (pin: places › Back) */
  const underMasthead = (): number => pageTop() + 4;
  const viewport: Viewport = { y: () => window.scrollY, scrollTo: (y) => window.scrollTo(0, y), under: underMasthead };
  function browserPage(): Page {
    /* the window's place is the page's alone: the browser's own restore on
       Back and Forward ran before hashchange, against the entry being left
       (pin: places › Forward) (pin: places › Back again) */
    history.scrollRestoration = "manual";
    return {
      on: (event, fn) => {
        if (event === "hand") for (const t of ["wheel", "keydown", "pointerdown", "touchstart"]) window.addEventListener(t, fn, { capture: true, passive: true });
        else if (event === "resize") new ResizeObserver(fn).observe(mount);
        else if (event === "scroll") window.addEventListener("scroll", fn, { passive: true });
        else window.addEventListener("pagehide", fn);
      },
      anchoring: (on) => { document.documentElement.style.overflowAnchor = on ? "" : "none"; },
    };
  }
  const keeper = placeKeeper({ surface: () => surface.current, window: viewport, page: browserPage() });
  function mountEditor(doc: Node, date: string, tag: string | null): HtmlMode {
    mount.replaceChildren();
    const ekey = entryKey(date, tag);
    const start = folds.startOf(date, tag);
    html = htmlMode(mount, doc, {
      interval,
      onChange: edited,
      onSelect: () => opts.onSelect?.(),
      nodeViews: { image: imageView(resolver(date, tag)) },
      /* given even off: refreshFolds switches it on */
      folds: { ...start, onChange: (keys) => folds.record(ekey, keys) },
      onRoute: (frag) => goto(frag, said("alreadyHere")),
      onOpen: (url) => { window.open(url, "_blank", "noopener"); },
      raise: (s) => { raise(s); },
      onPasteFile: pasteFile,
      clearOf: pageTopCached,
    });
    return html;
  }
  /* the entries an import is writing take no typing until it ends: typed
     into, the open one kept the typing and lost the import's text unsaid
     (pin: losing nothing › typed into an entry an import overwrites) */
  let locked: Set<string> | null = null;
  const lockedNow = <S extends Surface>(s: S): S => { s.lock(!!opts.readOnly || !!locked?.has(ekeyOf())); return s; };
  const surface = surfaces({
    build: {
      html: (doc) => lockedNow(mountEditor(doc, current.date, current.tag)),
      markdown: (md) => { mount.replaceChildren(); return lockedNow(markdownMode(mount, md, { onChange: edited, onPasteFile: pasteFile, raise: (s) => { raise(s); } })); },
    },
    window: viewport,
    places: keeper,
    fenceError: fenced,
    onView: (md) => opts.onView?.(md),
    switched: () => { save.edited(); show(); },
  });
  const resolver = (date: string, tag: string | null) => (src: string): Promise<string | null> =>
    images.get(pictureKey(date, tag, src)).then((row) => {
      if (!row) return null;
      return URL.createObjectURL(pictureBlob(src, row.bytes));
    });
  function releaseDetached(): void {
    deleted.resolve();
    rescued.resolve();
  }
  const pendingNow = (): boolean => pending?.gen === navGen;
  function replayPending(): void {
    if (!pending || pending.gen !== navGen) return;
    if (pending.hl.line) opts.onLine?.(pending.hl.line);
    else highlight(pending.hl.q || "", pending.hl.nth || 0, pending.honor);
    pending = null;
  }
  function open(date: string, tag: string | null, how: OpenHow = "keep"): void {
    releaseDetached();
    current = { date, tag };
    const ekey = ekeyOf();
    save.opened(ekey, layer.entryMd(ekey));
    /* a highlight owed wins over the remembered place: it is what a reader
       asked to see (pin: reference paste › the reference link followed) */
    const owed = how === "arrive" && pendingNow();
    keeper.open(ekey, owed ? "owed" : how, () => surface.show(layer.entryMd(ekey), ekey, how === "keep"));
    publish("entry", ekey);
    show();
    if (!surface.forced) replayPending();
  }
  /* an entry opened before the warm drew unfolded, its sub-entries not yet in
     the cache (pin: places › the warm landed) */
  function refreshFolds(): void {
    const view = live();
    if (!view) return;
    const st = foldsKey.getState(view.state);
    const start = folds.startOf(current.date, current.tag);
    if (!st || st.kind === start.kind) return;
    setFolds(start.kind, start.flipped)(view.state, view.dispatch);
    /* the folds moved the text under a held place: set again now, not a
       frame later when the size is observed (pin: places › the warm landed) */
    keeper.reapply();
  }
  function insertText(text: string, after = false): boolean {
    if (!surface.current) return false;
    surface.current.insertText(text, after);
    return true;
  }
  function highlight(q: string, nth: number, honorMarkers: boolean): boolean {
    const view = live();
    const did = !!view && highlightIn(view, q, nth, honorMarkers);
    if (did) opts.onHighlight?.();
    return did;
  }
  const isOpen = (date: string, tag: string | null): boolean => date === current.date && (tag || null) === current.tag;
  function jump(date: string, tag: string | null, hl: Highlight, honorMarkers: boolean): void {
    /* the open entry at once: a hash set to its own value fires no hashchange
       (pin: search › a jump to a hit in the entry already open) */
    if (isOpen(date, tag)) { navGen++; highlight(hl.q || "", hl.nth || 0, honorMarkers); return; }
    pending = { hl, honor: honorMarkers, gen: ++navGen };
    goto(entryHash(date, tag));
  }
  /* a namespace that does not mint on visit refuses an unknown key; the
     refusal lands on the entry already open — at boot, today — with the
     address put back (pin: bridge › an unknown book is refused) */
  let hashDeferred = false;
  function openHash(): void { openAddress(false); }
  function readThenOpen(want: string): void {
    hashDeferred = true;
    const asked = location.hash;
    const still = (): boolean => hashDeferred && location.hash === asked;
    const then = (): void => { if (still()) save.leave(() => { if (still()) openAddress(true); }); };
    layer.primeEntry(want).then(then, then);
  }
  const primedOrWarm = (want: string): boolean => layer.warmed || want in layer.cache;
  function primeBeforeWarm(want: string): void {
    hashDeferred = true;
    layer.primeEntry(want).then(() => { if (hashDeferred && primedOrWarm(want)) openHash(); }, () => {});
  }
  /* the noun for what is MISSING: when the root is gone every segment
     under it reads unregistered too, so the depth asked for would call a
     vanished author a book (pin: bridge › an unknown book under a known author) */
  function missingNoun(h: ReturnType<typeof hashParts>): string {
    const pp = tagParts(h.tag!), ns = nsOf(h.date)!;
    return pp.sub && registered(Object.keys(layer.cache), h.date, pp.name) ? ns.subNoun : ns.noun;
  }
  function refuseUnminted(h: ReturnType<typeof hashParts>, want: string): void {
    /* BEFORE THE WARM an address the cache lacks is not yet refused: its
       own row is primed, and failing that the warm answers
       (pin: places › a contents link clicked before the warm) */
    if (!layer.warmed) { primeBeforeWarm(want); return; }
    raise("noSuch", { noun: missingNoun(h) });
    history.replaceState(null, "", entryHash(current.date, current.tag));
    if (!surface.current) open(current.date, current.tag);
  }
  const unreadAfterWarm = (want: string): boolean => layer.warmed && !(want in layer.cache);
  function openAddress(primed: boolean): void {
    hashDeferred = false;
    const h = hashParts(asAddress(location.hash));
    /* AFTER THE WARM an address the cache lacks is read from the store
       first: another window may have written it since
       (pin: bookmarks from another window › its row's commonplace opened from the first).
       A read answers only while its own address is still the one asked
       for: a later address opened by an earlier read went unread. What was
       typed into the entry still on screen during the read is written
       before the open (pin: entrySave.test › leaving writes the waiting
       edit before it goes on) */
    const want = entryKey(h.date, h.tag);
    if (!primed && unreadAfterWarm(want)) { readThenOpen(want); return; }
    if (unmintedKey(Object.keys(layer.cache), h.date, h.tag)) { refuseUnminted(h, want); return; }
    /* a "?h=" payload replays LITERALLY: the passage is text, and an old
       link's nth, counted under substring rules, still lands
       (pin: reference paste › the reference link followed) */
    if (h.hl) pending = { hl: h.hl, honor: false, gen: ++navGen };
    open(h.date, h.tag, "arrive");
  }
  /* the entry on screen redrawn where it was, or left to its unsaved
     typing (a rename's suspension counted as such), or, deleted, kept on
     screen with its saves refused
     (pin: tabWrite.test › the entry on screen)
     (pin: bookmarks from another window › the commonplace open in the first, saved in the second)
     (pin: bookmarks from another window › typed into the commonplace deleted in the second) */
  /* the errors of a deleted entry on screen last while it is on screen
     (pin: bookmarks from another window › the deleted commonplace left for the day) */
  const onScreenKey = (ekey: string): boolean => !!surface.current && ekey === ekeyOf();
  function takeVerdict(ekey: string, md: string | null): ScreenTake {
    const here = onScreenKey(ekey);
    const verdict = screenTake(here, here && save.unsaved(), md);
    if (verdict === "deleted") save.deleted();
    return verdict;
  }
  function afterTabWrite(ekey: string, verdict: ScreenTake, moved: boolean): void {
    if (!moved) return;
    if (verdict === "deleted") deleted.raise("deletedElsewhere", { beneath: true });
    else if (onScreenKey(ekey)) redraw();
  }
  function takeTabWrite(ekey: string): Promise<void> {
    let verdict: ScreenTake = "take";
    return layer.takeTabWrite(ekey, (md) => {
      verdict = takeVerdict(ekey, md);
      return verdict !== "leave";
    }).then((moved) => afterTabWrite(ekey, verdict, moved));
  }
  /* the open entry drawn again from the cache, the caret where it was and
     the focus kept: a reader may be mid-sentence
     (pin: sub-entries › deleted: back on the day, its link gone, the other tag left) */
  function redraw(): void {
    surface.showAgain(opts.mount.contains(document.activeElement), () => open(current.date, current.tag));
  }
  /* repainted from the store ONLY where the store moved under it, after the
     debounce has landed: a reopen after an async write threw away keystrokes
     typed in the window (pin: entrySave.test › the store moved under the
     entry) */
  function refresh(): Promise<void> {
    return save.leave(() => { if (save.moved()) redraw(); });
  }
  /* a navigation that lands where it already is SAYS so, when given the
     words: silence reads as a dead control
     (pin: launch, menus, the corner, links › a link to itself) */
  /* the hash already there fires no hashchange: what stands over the
     entry is closed and the focus given back here, the selection as it stood
     (pin: bookmarks › b typed, already here) (pin: bookmarks › fb over a selection, already here)
     (pin: where the keys go › ⌃⌘T on today from Search) */
  function alreadyHere(hash: string, sameMsg?: Same): void {
    opts.onHere?.();
    /* a link naming a line lands again where another says it is already here
       (pin: a link to a line › a link to a line, clicked again) */
    const line = hashParts(asAddress(hash)).hl?.line;
    if (line) opts.onLine?.(line);
    else if (sameMsg) raise(sameMsg);
    if (!opts.mount.contains(document.activeElement)) surface.current?.focus();
  }
  function goto(hash: string, sameMsg?: Same): void {
    if (location.hash === hash) alreadyHere(hash, sameMsg);
    else location.hash = hash;
  }
  /* the walk follows the parent's index where it states one
     (pin: walk › ⌃⌘. from 3pr1 over an index of 3pr1, 3m1, 3pr2) */
  const orderMemo = new Map<string, { md: string; links: ContentsLink[] }>();
  function step(dir: "prev" | "next"): void {
    if (refuseCold(layer, raise)) return;
    const keys = Object.keys(layer.cache), bearing = (k: string) => !!layer.entryMd(k).trim();
    const nb = navNeighbors({ keys, bearing }, current.date, current.tag, (pk) => subEntryOrder({ keys, bearing }, pk, layer.entryMd(pk), orderMemo).names)[dir];
    if (!nb) { raise(dir === "prev" ? "noEarlier" : "noLater"); return; }
    goto(entryHash(nb[0], nb[1]));
  }
  function today(): void { goto(entryHash(todayKey()), said("alreadyOnToday")); }
  /* a failed write raises an error, and a click on it copies the markdown
     the write was carrying; the console keeps it too (pin: entries left
     and renamed › ⌃⌘C with the clipboard refused) */
  let copyGen = 0;
  function copy(payload: { text: string; html: string }, ok: "referenceCopied" | "linkCopied", fail: "referenceNotCopied" | "linkNotCopied"): void {
    const gen = ++copyGen;
    writeClipboard(payload).then((landed) => {
      /* the LATEST copy's outcome is the one shown: one that lands resolves a
         failed one's error (pin: entries left and renamed › ⌃⌘C again, the
         clipboard back); an older copy settling late changes nothing
         (unpinned: two writes no step can order) */
      if (gen !== copyGen) return;
      copied.resolve();
      if (landed) { raise(ok); return; }
      console.error(alertWords({ id: fail }), payload.text);
      copied.raise(fail, { copy: payload.text });
    });
  }
  function showWordCount(): void {
    const n = surface.current ? surface.current.words() : 0;
    if (n === 1) raise("oneWord"); else raise("words", { n });
  }
  function copyReference(all = false): void {
    if (surface.md) { raise("referenceInMarkdown"); return; }
    const view = live();
    if (refuseCold(layer, raise)) return;
    if (!view) { raise("stillLoading"); return; }
    const out = referencePayload(view.state, { date: current.date, tag: current.tag }, journal, all);
    if ("refused" in out) { raise(REFUSAL_ALERT[out.refused]); return; }
    let html = "";
    try { html = richReferenceHtml(view.dom, out.url, out.label, out.passage); } catch (err) { console.error("the rich flavour failed", err); }
    copy({ text: out.text, html }, "referenceCopied", "referenceNotCopied");
  }
  function copyEntryLink(): void {
    if (refuseCold(layer, raise)) return;
    const p = entryLinkParts(current.date, current.tag, journal);
    copy({ text: "[" + p.label + "](" + p.url + ")", html: referenceAnchorHTML(p.url, p.label) }, "linkCopied", "linkNotCopied");
  }
  window.addEventListener("hashchange", () => { save.leave(openHash); });
  /* every key owed is written again too, not only the entry on screen
     (pin: entries.test › the keys owed are written again) */
  const owedOut = (): void => { save.now(); layer.retryOwed(); };
  window.addEventListener("beforeunload", owedOut);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") owedOut(); });
  /* a view that is not editable never holds the keys, so its own keymap
     never sees Escape (pin: reader › Escape after the hit) */
  if (opts.readOnly) document.addEventListener("keydown", (e) => {
    const view = live();
    if (e.key === "Escape" && view) escapeJump(view.state, view.dispatch);
  });
  function switchView(): void {
    if (opts.readOnly) { raise("noMarkdownMode"); return; }
    opts.onSwitch?.();
    surface.switchTo(!surface.md);
  }
  return {
    get current() { return current; },
    get shown() { return shownOf(surface.current, html); },
    get locked() { return !!opts.readOnly || !!locked?.has(ekeyOf()); },
    focusText: () => { surface.current?.focus(); },
    holdTop: () => {
      const s = surface.current?.markdownMode ? null : surface.current;
      if (!s) return;
      if (viewport.y() <= 0) return;
      const pos = s.topAt(underMasthead());
      if (pos !== null) keeper.carry(pos);
    },
    lockEntries: (keys) => { locked = keys; if (surface.current) lockedNow(surface.current); },
    open, openHash, takeTabWrite, save, refresh, surfaceMd: currentMd, goto, step, today, copyReference, copyEntryLink, highlight, jump, setView: (md) => surface.switchTo(md), switchView, showWordCount, insertText,
    get hashDeferred() { return hashDeferred; },
    refreshFolds,
    movePlace: keeper.move,
    movePlaces: keeper.moveAll,
    moveFolds: (moves) => folds.move(moves),
    dropFolds: (keys) => folds.drop(keys),
    setInterval: (n) => { interval = n; const v = live(); if (v) setLineInterval(n)(v.state, v.dispatch); },
  };
}
