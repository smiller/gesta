import type { EditorView } from "prosemirror-view";
import type { Node } from "prosemirror-model";
import { imageView, pastedPictureBytes } from "./editor/images.ts";
import { nextImageName, pictureKey } from "./store/names.ts";
import { imageRefs } from "./store/exportEntries.ts";
import { setLineInterval } from "./editor/lineNumbers.ts";
import { entryKey, entryHash, todayKey, nsOf, pageParts, NS } from "./store/keys.ts";
import { entryFile } from "./store/names.ts";
import { hashParts } from "./store/nav.ts";
import { navNeighbors, unmintedKey, registered } from "./store/lists.ts";
import { subPageOrder, foldsContents, type ContentsLink } from "./store/contents.ts";
import { parseFoldStore, foldPage, withFoldPage, type FoldPage } from "./store/foldState.ts";
import { stored } from "./store/local.ts";
import { foldsKey, setFolds } from "./editor/folds.ts";
import { journalOf } from "./store/headings.ts";
import { referencePayload, entryLinkParts, citationAnchorHTML, REFUSAL_TEXT } from "./editor/reference.ts";
import { writeClipboard } from "./chrome/clipboard.ts";
import { richReferenceHtml } from "./chrome/richCopy.ts";
import type { EntryLayer } from "./store/entries.ts";
import type { ImageStore } from "./store/store.ts";
import { highlightIn } from "./editor/highlight.ts";
import type { Highlight } from "./store/keys.ts";
import { surfaces, type Viewport } from "./editor/surface.ts";
import { placeKeeper, type Page } from "./editor/placeKeeper.ts";
import { renderedView, type RenderedView } from "./editor/renderedView.ts";
import { sourceView } from "./editor/sourceView.ts";

/* ARRIVING at an entry — a link, a walk, a pick, Back or Forward, a
   reload — returns to where it was last left, or the top on a first visit;
   KEEP (a refresh, a rename) moves nothing.
   (pin: places › Back again) (pin: entries left and renamed › a long entry renamed, scrolled) */
export type OpenHow = "arrive" | "keep";
export interface SessionOptions {
  mount: HTMLElement;
  layer: EntryLayer;
  images: ImageStore;
  interval: number;
  say: (text: string, ms?: number) => void;
  stick?: (text: string) => void;
  pin?: (text: string) => number;
  releasePin?: (gen: number) => void;
  onShow?: (stored: string, ekey: string) => void;
  onEdit?: () => void;
  onView?: (md: boolean) => void;
  /* read AFTER the editor has the selection: the DOM's selectionchange
     runs a beat ahead of the state. Unpinned: headless Helium does not
     reproduce the beat */
  onSelect?: () => void;
  onHighlight?: () => void;
}
export interface Session {
  readonly current: { date: string; tag: string | null };
  readonly view: EditorView | null;
  open(date: string, tag: string | null, how?: OpenHow): void;
  openHash(): void;
  saveNow(): Promise<boolean>;
  flushSave(): Promise<boolean>;
  refresh(): Promise<void>;
  suspendSaves(): void;
  surfaceMd(): string;
  readonly hashDeferred: boolean;
  refreshFolds(): void;
  /* to null: deleted (pin: placeState.test › a rename carries the place) */
  movePlace(from: string, to: string | null): void;
  goto(hash: string, sameMsg?: string): void;
  step(dir: "prev" | "next"): void;
  today(): void;
  copyReference(): void;
  copyEntryLink(): void;
  /* honorMarkers for a search-box jump; a link's payload is literal
     (pin: search › Enter) (pin: reference paste › the reference link followed) */
  highlight(q: string, nth: number, honorMarkers: boolean): boolean;
  insertText(text: string): boolean;
  readonly mdView: boolean;
  setView(md: boolean): void;
  showWordCount(): void;
  jump(date: string, tag: string | null, hl: Highlight, honorMarkers: boolean): void;
  setInterval(n: number): void;
}
export const SAVE_DEBOUNCE_MS = 500;
export const SAVED_MS = 1400;
const MIME: Record<string, string> = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml" };

export function startSession(opts: SessionOptions): Session {
  const { mount, layer, images, say } = opts;
  const journal = journalOf(layer.cache);
  let interval = opts.interval;
  let current = { date: todayKey(), tag: null as string | null };
  let rendered: RenderedView | null = null;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
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
  const edited = (): void => { scheduleSave(); show(); opts.onEdit?.(); };
  /* WHERE A PICTURE WAS AIMED is checked when its bytes are ready: a reader
     can navigate while the decode runs. Every way it cannot land sticks:
     the gesture is spent. (pin: picture › a picture pasted, then another entry at once) */
  let decoding = false;
  function pasteFile(file: File): void {
    if (decoding) { say("picture not pasted — one at a time; paste it again", 2600); return; }
    const aimedAt = ekeyOf(), aimedMd = surface.md;
    decoding = true;
    pastedPictureBytes(file).then((bytes) => {
      decoding = false;
      if (aimedAt !== ekeyOf() || aimedMd !== surface.md) { opts.stick?.("the picture had nowhere to land — paste it again"); return; }
      const name = nextImageName(entryFile(current.date, current.tag).base, imageRefs(currentMd()));
      return images.set(pictureKey(current.date, current.tag, name), bytes).then(() => { surface.current?.insertPicture(name); });
    }).catch((err: unknown) => { decoding = false; console.error("picture not pasted", err); opts.stick?.("that picture couldn't be read — try copying it as a PNG"); });
  }
  const folds = stored(NS + "folds", parseFoldStore);
  const readFolds = (ekey: string): FoldPage => foldPage(folds.read(), ekey);
  const writeFolds = (ekey: string, patch: Partial<FoldPage>): void => folds.write((s) => withFoldPage(s, ekey, patch));
  /* the masthead is sticky over the page's top: a place is read, and set,
     just under it (pin: places › Back) */
  const underMasthead = (): number => Math.max(0, document.querySelector(".site-head")?.getBoundingClientRect().bottom ?? 0) + 4;
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
  function mountEditor(doc: Node, date: string, tag: string | null): RenderedView {
    rendered = null;
    mount.replaceChildren();
    const ekey = entryKey(date, tag);
    const folding = foldsContents(Object.keys(layer.cache), date, tag);
    const page = folding ? readFolds(ekey) : null;
    rendered = renderedView(mount, doc, {
      interval,
      onChange: edited,
      onSelect: () => opts.onSelect?.(),
      nodeViews: { image: imageView(resolver(date, tag)) },
      /* given even off: refreshFolds switches it on */
      folds: { on: folding, open: page ? page.open : [], onChange: (open) => writeFolds(ekey, { open }) },
      onRoute: (frag) => goto(frag, "already here"),
      onRefuse: (why) => say(why),
      onPasteFile: pasteFile,
    });
    return rendered;
  }
  const surface = surfaces({
    build: {
      rendered: (doc) => mountEditor(doc, current.date, current.tag),
      source: (md) => { rendered = null; mount.replaceChildren(); return sourceView(mount, md, { onChange: edited, onPasteFile: pasteFile, onRefuse: (why) => say(why) }); },
    },
    window: viewport,
    places: keeper,
    pin: (text) => opts.pin?.(text) || 0,
    releasePin: (gen) => opts.releasePin?.(gen),
    onView: (md) => opts.onView?.(md),
    switched: () => { scheduleSave(); show(); },
  });
  const resolver = (date: string, tag: string | null) => (src: string): Promise<string | null> =>
    images.get(pictureKey(date, tag, src)).then((row) => {
      if (!row) return null;
      const ext = (src.split(".").pop() || "").toLowerCase();
      return URL.createObjectURL(new Blob([row.bytes as BlobPart], { type: MIME[ext] || "application/octet-stream" }));
    });
  function open(date: string, tag: string | null, how: OpenHow = "keep"): void {
    cancelSave();
    suspended = false;
    current = { date, tag };
    const ekey = ekeyOf();
    /* a highlight owed wins over the remembered place: it is what a reader
       asked to see (pin: reference paste › the reference link followed) */
    const owed = how === "arrive" && !!pending && pending.gen === navGen;
    keeper.open(ekey, owed ? "owed" : how, () => surface.show(layer.entryMd(ekey), ekey));
    document.documentElement.dataset.entry = ekey;
    show();
    if (surface.forced) return;
    if (pending && pending.gen === navGen) { highlight(pending.hl.q || "", pending.hl.nth || 0, pending.honor); pending = null; }
  }
  /* a page opened before the warm drew unfolded, its sub-entries not yet in
     the cache (pin: places › the warm landed) */
  function refreshFolds(): void {
    const view = rendered?.view;
    if (!view || surface.md) return;
    const st = foldsKey.getState(view.state);
    const on = foldsContents(Object.keys(layer.cache), current.date, current.tag);
    if (!st || st.on === on) return;
    const page = on ? readFolds(ekeyOf()) : null;
    setFolds(on, page ? page.open : [])(view.state, view.dispatch);
    /* the folds moved the text under a held place: set again now, not a
       frame later when the size is observed (pin: places › the warm landed) */
    keeper.reapply();
  }
  function insertText(text: string): boolean {
    if (!surface.current) return false;
    surface.current.insertText(text);
    return true;
  }
  function highlight(q: string, nth: number, honorMarkers: boolean): boolean {
    const did = !!rendered && highlightIn(rendered.view, q, nth, honorMarkers);
    if (did) opts.onHighlight?.();
    return did;
  }
  function jump(date: string, tag: string | null, hl: Highlight, honorMarkers: boolean): void {
    /* the open entry at once: a hash set to its own value fires no hashchange
       (pin: search › a jump to a hit in the entry already open) */
    if (date === current.date && (tag || null) === current.tag) { navGen++; highlight(hl.q || "", hl.nth || 0, honorMarkers); return; }
    pending = { hl, honor: honorMarkers, gen: ++navGen };
    goto(entryHash(date, tag));
  }
  /* a namespace that does not mint on visit refuses an unknown key; the
     refusal lands on the entry already open — at boot, today — with the
     address put back (pin: bridge › an unknown book is refused) */
  let hashDeferred = false;
  function openHash(): void {
    hashDeferred = false;
    const h = hashParts(location.hash.slice(1));
    const keys = Object.keys(layer.cache);
    if (unmintedKey(keys, h.date, h.tag)) {
      /* BEFORE THE WARM an address the cache lacks is not yet refused: its
         own row is primed, and failing that the warm answers
         (pin: places › a contents link clicked before the warm) */
      if (!layer.warmed) {
        hashDeferred = true;
        const want = entryKey(h.date, h.tag);
        layer.primeEntry(want).then(() => { if (hashDeferred && (layer.warmed || want in layer.cache)) openHash(); }, () => {});
        return;
      }
      /* the noun for what is MISSING: when the root is gone every segment
         under it reads unregistered too, so the depth asked for would call a
         vanished author a book (pin: bridge › an unknown book under a known author) */
      const pp = pageParts(h.tag!);
      const ns = nsOf(h.date)!;
      say("no such " + (pp.sub && registered(keys, h.date, pp.name) ? ns.subNoun : ns.noun));
      history.replaceState(null, "", entryHash(current.date, current.tag));
      if (!surface.current) open(current.date, current.tag);
      return;
    }
    /* a "?h=" payload replays LITERALLY: the passage is text, and an old
       link's nth, counted under substring rules, still lands
       (pin: reference paste › the reference link followed) */
    if (h.hl) pending = { hl: h.hl, honor: false, gen: ++navGen };
    open(h.date, h.tag, "arrive");
  }
  function saveNow(): Promise<boolean> {
    cancelSave();
    if (!surface.current || layer.storeReadFailed) return Promise.resolve(false);
    const ekey = ekeyOf();
    const md = currentMd();
    const inStore = layer.entryMd(ekey);
    if (md === inStore) return Promise.resolve(true);
    if (!md.trim() && !inStore) return Promise.resolve(true);   /* an empty document mints nothing (pin: entries left and renamed › an unknown page visited and left untouched) */
    return layer.setEntry(ekey, md).then((landed) => { if (landed) say("saved", SAVED_MS); show(); return landed; });
  }
  /* SUSPENDED while a rename moves the entry between keys: a debounce firing
     then wrote the surface back under the old key, and the entry stood under
     both; the next open() lifts it. Unpinned: a race no step can hold open */
  let suspended = false;
  function suspendSaves(): void { cancelSave(); suspended = true; }
  function scheduleSave(): void { if (suspended) return; cancelSave(); saveTimer = setTimeout(() => { saveNow(); }, SAVE_DEBOUNCE_MS); }
  function cancelSave(): void { if (saveTimer) clearTimeout(saveTimer); saveTimer = null; }
  function flushSave(): Promise<boolean> { return saveTimer ? saveNow() : Promise.resolve(true); }
  /* repainted from the store ONLY where the store moved under it, after the
     debounce has landed: a reopen after an async write threw away keystrokes
     typed in the window. Unpinned: a race no step can hold open */
  function refresh(): Promise<void> {
    return flushSave().then(() => { if (layer.entryMd(ekeyOf()) !== currentMd()) open(current.date, current.tag); });
  }
  /* a navigation that lands where it already is SAYS so, when given the
     words: silence reads as a dead control
     (pin: launch, panels, the corner, links › a link to itself) */
  function goto(hash: string, sameMsg?: string): void {
    if (location.hash === hash) { if (sameMsg) say(sameMsg, 1500); return; }
    location.hash = hash;
  }
  /* the walk follows the parent's index where it states one
     (pin: walk › ⌃⌘. from 3pr1 over an index of 3pr1, 3m1, 3pr2) */
  const orderMemo = new Map<string, { md: string; links: ContentsLink[] }>();
  function step(dir: "prev" | "next"): void {
    if (!layer.warmed) { say("still loading — try that again in a moment", 2500); return; }
    const keys = Object.keys(layer.cache), bearing = (k: string) => !!layer.entryMd(k).trim();
    const nb = navNeighbors(keys, current.date, current.tag, bearing, (pk) => subPageOrder(keys, pk, layer.entryMd(pk), bearing, orderMemo).names)[dir];
    if (!nb) { say(dir === "prev" ? "no earlier entry" : "no later entry"); return; }
    goto(entryHash(nb[0], nb[1]));
  }
  function today(): void { goto(entryHash(todayKey()), "already on today"); }
  /* a failed write is an error, pinned to be clicked into a bug report;
     the markdown, which lives nowhere else, goes to the console
     (pin: entries left and renamed › ⌃⌘C with the clipboard refused) */
  let copyPin = 0, copyGen = 0;
  function copy(payload: { text: string; html: string }, okText: string, failText: string): void {
    const gen = ++copyGen;
    writeClipboard(payload).then((ok) => {
      /* the LATEST copy's outcome is the corner's: one that lands releases a
         failed one's pin (pin: entries left and renamed › ⌃⌘C again, the
         clipboard back); an older copy settling late changes nothing
         (unpinned: two writes no step can order) */
      if (gen !== copyGen) return;
      if (copyPin) { opts.releasePin?.(copyPin); copyPin = 0; }
      if (ok) { say(okText); return; }
      console.error(failText, payload.text);
      copyPin = opts.pin ? opts.pin(failText) : 0;
      if (!copyPin) say(failText);
    });
  }
  function showWordCount(): void {
    const n = surface.current ? surface.current.words() : 0;
    say(n === 1 ? "1 word" : n + " words", 2000);
  }
  function copyReference(): void {
    if (surface.md) { say("switch to the rendered view (⌃⌘M) to copy a reference"); return; }
    const view = rendered?.view;
    if (!view || !layer.warmed) { say("Still loading — try that again in a moment"); return; }
    const out = referencePayload(view.state, current.date, current.tag, journal);
    if ("refused" in out) { say(REFUSAL_TEXT[out.refused]); return; }
    let html = "";
    try { html = richReferenceHtml(view.dom, out.url, out.label, out.passage); } catch (err) { console.error("the rich flavour failed", err); }
    copy({ text: out.text, html }, "Reference copied to clipboard", "Couldn't copy the reference");
  }
  function copyEntryLink(): void {
    if (!layer.warmed) { say("Still loading — try that again in a moment"); return; }
    const p = entryLinkParts(current.date, current.tag, journal);
    copy({ text: "[" + p.label + "](" + p.url + ")", html: citationAnchorHTML(p.url, p.label) }, "Link copied", "Couldn't copy the link");
  }
  window.addEventListener("hashchange", () => { flushSave().then(openHash); });
  window.addEventListener("beforeunload", () => { saveNow(); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveNow(); });
  /* the current app's chords, silent in Helium; both modifiers, ⇧ and ⌥
     excluded (pin: walk › ⌃⌘. from 3pr1 over an index of 3pr1, 3m1, 3pr2)
     (pin: source view › ⌃⌘W rendered) */
  document.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey && e.metaKey && !e.shiftKey && !e.altKey)) return;
    if (e.key === ",") { e.preventDefault(); step("prev"); }
    else if (e.key === ".") { e.preventDefault(); step("next"); }
    else if (e.key === "t") { e.preventDefault(); today(); }
    else if (e.key === "r") { e.preventDefault(); copyReference(); }
    else if (e.key === "c") { e.preventDefault(); copyEntryLink(); }
    else if (e.key === "m") { e.preventDefault(); surface.switchTo(!surface.md); }
    else if (e.key === "w") { e.preventDefault(); showWordCount(); }
  });
  return {
    get current() { return current; },
    get view() { return rendered ? rendered.view : null; },
    open, openHash, saveNow, flushSave, refresh, suspendSaves, surfaceMd: currentMd, goto, step, today, copyReference, copyEntryLink, highlight, jump, setView: (md) => surface.switchTo(md), showWordCount, insertText,
    get mdView() { return surface.md; },
    get hashDeferred() { return hashDeferred; },
    refreshFolds,
    movePlace: keeper.move,
    setInterval: (n) => { interval = n; if (rendered) setLineInterval(n)(rendered.view.state, rendered.view.dispatch); },
  };
}
