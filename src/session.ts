import type { EditorView } from "prosemirror-view";
import { parseMarkdown } from "./model/parse.ts";
import { serializeMarkdown } from "./model/serialize.ts";
import { createEditor } from "./editor/editor.ts";
import { imageView, pastedPictureBytes, pastedImageFile } from "./editor/images.ts";
import { nextImageName, pictureKey } from "./store/names.ts";
import { imageRefs } from "./store/exportEntries.ts";
import { schema } from "./model/schema.ts";
import { fenceRefusals, refusalsText } from "./model/fenceRefusals.ts";
import { setLineInterval } from "./editor/lineNumbers.ts";
import { entryKey, entryHash, todayKey, nsOf, pageParts, NS } from "./store/keys.ts";
import { entryFile } from "./store/names.ts";
import { hashParts } from "./store/nav.ts";
import { navNeighbors, unmintedKey, registered } from "./store/lists.ts";
import { subPageOrder, foldsContents, type ContentsLink } from "./store/contents.ts";
import { parseFoldStore, foldPage, withFoldPage, type FoldPage } from "./store/foldState.ts";
import { parsePlaces, placeOf, withPlace, movedPlace, type Place } from "./store/placeState.ts";
import { stored } from "./store/local.ts";
import { foldsKey, setFolds, openFoldAt } from "./editor/folds.ts";
import { journalOf } from "./store/headings.ts";
import { referencePayload, entryLinkParts, citationAnchorHTML, REFUSAL_TEXT } from "./editor/reference.ts";
import { writeClipboard } from "./chrome/clipboard.ts";
import { richReferenceHtml } from "./chrome/richCopy.ts";
import type { EntryLayer } from "./store/entries.ts";
import type { ImageStore } from "./store/store.ts";
import { highlightIn } from "./editor/highlight.ts";
import type { Highlight } from "./store/keys.ts";
import { TextSelection } from "prosemirror-state";
import { flattenDoc, flattenText } from "./model/flatten.ts";
import { countBefore, positionAt, arrivingCount, crossViewOffset, type Hold } from "./chrome/viewCarets.ts";
import { sourceTab } from "./editor/sourceKeys.ts";
import { wordCount, wordsOf } from "./editor/format.ts";

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
  let view: EditorView | null = null;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  /* the highlight owed to the next paint, and the navigation it belongs
     to: a later navigation drops it, or it would select against the wrong
     entry. Unpinned: a race between two tasks no step can order */
  let pending: { hl: Highlight; honor: boolean; gen: number } | null = null;
  let navGen = 0;
  let mdView = false;
  /* a stored text the model refuses FORCES the source view for that entry
     only; a reader's own choice is put back on the next open
     (pin: grid › the next entry after a refused switch) */
  let forced = false, readerView = false;
  let source: HTMLTextAreaElement | null = null;
  const carets: { rendered: Hold | null; source: Hold | null } = { rendered: null, source: null };
  let placedAt: number | null = null;
  const currentMd = (): string => mdView ? (source ? source.value : "") : view ? serializeMarkdown(view.state.doc) : "";
  const ekeyOf = (): string => entryKey(current.date, current.tag);
  const show = (): void => {
    if ((!view && !source) || !opts.onShow) return;
    opts.onShow(layer.entryMd(ekeyOf()), ekeyOf());
  };
  const teardown = (): void => { view?.destroy(); view = null; source = null; mount.replaceChildren(); };
  function mountSource(md: string): void {
    teardown();
    const ta = document.createElement("textarea");
    ta.className = "source";
    ta.spellcheck = false;
    ta.value = md;
    ta.addEventListener("input", () => { scheduleSave(); show(); opts.onEdit?.(); });
    ta.addEventListener("paste", (e) => { const f = pastedImageFile(e.clipboardData); if (f) { e.preventDefault(); pasteFile(f); } });
    ta.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      if (e.repeat && ta.selectionStart !== ta.selectionEnd) { e.preventDefault(); return; }
      const r = sourceTab(ta.value, ta.selectionStart, ta.selectionEnd, e.shiftKey);
      if (r === null) return;
      e.preventDefault();
      if ("refuse" in r) { if (!e.repeat) say(r.refuse); return; }
      ta.value = r.value;
      ta.setSelectionRange(r.start, r.end);
      ta.dispatchEvent(new Event("input"));
    });
    mount.appendChild(ta);
    source = ta;
  }
  /* WHERE A PICTURE WAS AIMED is checked when its bytes are ready: a reader
     can navigate while the decode runs. Every way it cannot land sticks:
     the gesture is spent. (pin: picture › a picture pasted, then another entry at once) */
  let decoding = false;
  let fencePin = 0;
  function pasteFile(file: File): void {
    if (decoding) { say("picture not pasted — one at a time; paste it again", 2600); return; }
    const aimedAt = ekeyOf(), aimedMd = mdView;
    decoding = true;
    pastedPictureBytes(file).then((bytes) => {
      decoding = false;
      if (aimedAt !== ekeyOf() || aimedMd !== mdView) { opts.stick?.("the picture had nowhere to land — paste it again"); return; }
      const name = nextImageName(entryFile(current.date, current.tag).base, imageRefs(currentMd()));
      return images.set(pictureKey(current.date, current.tag, name), bytes).then(() => {
        if (mdView && source) { insertText("![](" + name + ")"); return; }
        if (!view) return;
        const tr = view.state.tr.replaceSelectionWith(schema.nodes.image.create({ src: name, alt: "" }));
        /* a picture at the entry's end gets a line below it, the caret there:
           there is no other way to write on after it
           (pin: picture › a picture pasted at the entry's end) */
        const $end = tr.doc.resolve(tr.selection.to);
        if ($end.pos >= tr.doc.content.size - 1) {
          tr.insert(tr.doc.content.size, schema.nodes.paragraph.create());
          tr.setSelection(TextSelection.create(tr.doc, tr.doc.content.size - 1));
        }
        view.dispatch(tr.scrollIntoView());
        view.focus();
      });
    }).catch((err: unknown) => { decoding = false; console.error("picture not pasted", err); opts.stick?.("that picture couldn't be read — try copying it as a PNG"); });
  }
  const folds = stored(NS + "folds", parseFoldStore);
  const readFolds = (ekey: string): FoldPage => foldPage(folds.read(), ekey);
  const writeFolds = (ekey: string, patch: Partial<FoldPage>): void => folds.write((s) => withFoldPage(s, ekey, patch));
  /* a place the same as the last one written is not written: every scroll
     pause rewrote the whole list. Unpinned: a performance choice */
  const places = stored(NS + "places", parsePlaces);
  let lastWritten: (Place & { key: string }) | null = null;
  const writePlace = (ekey: string, place: Place): void => {
    if (lastWritten && lastWritten.key === ekey && lastWritten.pos === place.pos && lastWritten.y === place.y) return;
    places.write((s) => withPlace(s, ekey, place));
    lastWritten = { key: ekey, ...place };
  };
  /* a rename carries the place to the new key, a delete drops it: a new
     entry under a deleted one's name opened where the deleted one was left
     (pin: entries left and renamed › deleted scrolled: its place dropped) */
  function movePlace(from: string, to: string | null): void {
    places.write((s) => movedPlace(s, from, to));
    lastWritten = null;
  }
  /* the restored place is HELD, and set again whenever the editor changes
     size, until a reader moves: a wheel, key, pointer or touch, or any
     scroll landing where this code did not put the window, the browser's
     find among them. Read back from the scroll instead, the place drifted
     up with every picture above it. While held, the browser's scroll
     anchoring is OFF: a masthead shrinking after the restore let anchoring
     move the window 27px (pin: places › 400px grown above the held place)
     (pin: places › a held place, then a scroll no hand made) (pin: places ›
     a held place, the masthead shrinking under it) (pin: places › a forced
     entry left scrolled, returned to) */
  let held: { ekey: string; place: Place } | null = null;
  const setHeld = (h: typeof held): void => { held = h; document.documentElement.style.overflowAnchor = h ? "none" : ""; };
  const release = (): void => { if (held) setHeld(null); };
  let placedY = 0;
  for (const t of ["wheel", "keydown", "pointerdown", "touchstart"]) window.addEventListener(t, release, { capture: true, passive: true });
  new ResizeObserver(() => { if (held && held.ekey === ekeyOf()) applyPlace(held.place); }).observe(mount);
  /* the masthead is sticky over the page's top: a place is read, and set,
     just under it (pin: places › Back) */
  const underMasthead = (): number => Math.max(0, document.querySelector(".site-head")?.getBoundingClientRect().bottom ?? 0) + 4;
  function recordPlace(): void {
    if (held && held.ekey === ekeyOf()) return;   /* the store holds it: it was restored from there (pin: places › Back again) */
    if (mdView && source) { writePlace(ekeyOf(), { pos: -1, y: window.scrollY }); return; }
    if (!view) return;
    const box = view.dom.getBoundingClientRect();
    const hit = view.posAtCoords({ left: box.left + 24, top: Math.max(underMasthead(), box.top + 1) });
    writePlace(ekeyOf(), { pos: hit ? hit.pos : 0, y: window.scrollY });
  }
  /* a position inside a closed section opens it: a hidden block has no box
     (pin: places › back to a place in a closed section) */
  function applyPlace(p: Place): void {
    /* left at the top, back at the top: the text position under the
       masthead lies below the page's top padding (pin: places › Horace followed) */
    if (mdView || !view || p.pos < 0 || p.y <= 0) window.scrollTo(0, Math.max(0, p.y));
    else {
      const pos = Math.min(p.pos, view.state.doc.content.size);
      openFoldAt(pos)(view.state, view.dispatch);
      try {
        const c = view.coordsAtPos(pos);
        window.scrollTo(0, window.scrollY + c.top - underMasthead());
      } catch { window.scrollTo(0, p.y); }
    }
    placedY = window.scrollY;
  }
  let placeTimer: ReturnType<typeof setTimeout> | null = null;
  window.addEventListener("scroll", () => {
    if (held && Math.abs(window.scrollY - placedY) > 1) release();
    if (placeTimer) clearTimeout(placeTimer);
    placeTimer = setTimeout(recordPlace, 400);
  }, { passive: true });
  window.addEventListener("pagehide", () => recordPlace());
  function mountEditor(doc: import("prosemirror-model").Node, date: string, tag: string | null): void {
    teardown();
    const ekey = entryKey(date, tag);
    const folding = foldsContents(Object.keys(layer.cache), date, tag);
    const page = folding ? readFolds(ekey) : null;
    view = createEditor(mount, doc, {
      interval,
      onChange: () => { scheduleSave(); show(); opts.onEdit?.(); },
      onSelect: () => opts.onSelect?.(),
      nodeViews: { image: imageView(resolver(date, tag)) },
      /* given even off: refreshFolds switches it on */
      folds: { on: folding, open: page ? page.open : [], onChange: (open) => writeFolds(ekey, { open }) },
      onRoute: (frag) => goto(frag, "already here"),
      onRefuse: (why) => say(why),
      onPasteFile: pasteFile,
    });
  }
  /* a MOVED caret retires the other view's hold
     (pin: source view › the caret moved in the source, ⌃⌘M back) */
  function holdViewCaret(): void {
    let hold: Hold | null = null;
    if (mdView && source) {
      const flat = flattenText(source.value);
      const at = countBefore(flat, source.selectionStart);
      hold = { at, text: flat.text, tail: at >= flat.text.length, seen: sourceCaretSeen(source) };
    } else if (view) {
      const flat = flattenDoc(view.state.doc);
      const pos = view.state.selection.from;
      const at = countBefore(flat, pos);
      let seen = true;
      try { const box = view.coordsAtPos(pos); seen = box.bottom >= 0 && box.top <= document.documentElement.clientHeight; } catch { seen = true; }
      hold = { at, text: flat.text, tail: at >= flat.text.length, seen };
    }
    if (hold && hold.at !== placedAt) carets[mdView ? "rendered" : "source"] = null;
    carets[mdView ? "source" : "rendered"] = hold;
  }
  /* where a character of the textarea stands on screen, measured on a
     hidden twin that wraps as it does: a textarea reports no geometry for
     its text. Built once per question, removed with done(). */
  function sourceTwin(ta: HTMLTextAreaElement): { topOf(i: number): number; indexAt(y: number): number; done(): void } {
    const cs = getComputedStyle(ta), twin = document.createElement("div");
    for (const p of ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "wordSpacing", "tabSize", "padding", "borderWidth", "borderStyle", "boxSizing", "overflowWrap", "wordBreak"] as const) twin.style[p] = cs[p];
    Object.assign(twin.style, { position: "absolute", visibility: "hidden", top: "0", left: "-9999px", whiteSpace: "pre-wrap", width: ta.getBoundingClientRect().width + "px" });
    const text = twin.appendChild(document.createTextNode(ta.value + "\u200b"));
    document.body.appendChild(twin);
    const range = document.createRange();
    const origin = ta.getBoundingClientRect().top - twin.getBoundingClientRect().top - ta.scrollTop;
    const topOf = (i: number): number => {
      range.setStart(text, Math.min(i, ta.value.length)); range.setEnd(text, Math.min(i, ta.value.length) + 1);
      const r = range.getClientRects()[0] || range.getBoundingClientRect();
      return origin + r.top;
    };
    const indexAt = (y: number): number => {
      let lo = 0, hi = ta.value.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (topOf(mid) < y - 1) lo = mid + 1; else hi = mid; }
      return lo;
    };
    return { topOf, indexAt, done: () => twin.remove() };
  }
  /* reported seen always, the switch back jumped to a caret a reader had
     scrolled away from (pin: source view › ⌃⌘M back, still scrolled away) */
  function sourceCaretSeen(ta: HTMLTextAreaElement): boolean {
    const t = sourceTwin(ta), top = t.topOf(ta.selectionStart);
    t.done();
    return top + parseFloat(getComputedStyle(ta).lineHeight) >= 0 && top <= document.documentElement.clientHeight;
  }
  /* the text at the window's top: a count into the leaving view's flat
     stream, with that stream, for the crossing */
  function topCount(): { at: number; text: string } | null {
    const under = underMasthead();
    if (mdView && source) {
      const t = sourceTwin(source), i = t.indexAt(under);
      t.done();
      const flat = flattenText(source.value);
      return { at: countBefore(flat, i), text: flat.text };
    }
    if (!view) return null;
    /* the first line whose top is at or below the masthead, as the source's
       twin reads it: a point in the gap between stanzas resolved to the end
       of the stanza above, one stanza early
       (pin: the switch carries the text › a long canto switched at its middle) */
    const box = view.dom.getBoundingClientRect();
    for (let dy = 0; dy < 240; dy += 4) {
      const hit = view.posAtCoords({ left: box.left + box.width / 2, top: Math.max(under, box.top + 1) + dy });
      if (!hit) continue;
      try { if (view.coordsAtPos(hit.pos).top >= under - 1) { const flat = flattenDoc(view.state.doc); return { at: countBefore(flat, hit.pos), text: flat.text }; } } catch { /* no box: the next point */ }
    }
    return null;
  }
  /* carried across by the caret's own crossing: the source's stream holds
     every fence line the rendered one lacks, and a count taken as equal in
     both drifted seven lines by stanza 21
     (pin: the switch carries the text › a long canto switched at its middle).
     Nothing above the first line ARRIVED AT: near the top stays at the top,
     where setting the first character under the masthead pushed the page's
     own top out of view, and a source top above its first fence's text maps
     to the rendered start (pin: the switch carries the text › ⌃⌘M from 20px down) */
  function alignTop(from: { at: number; text: string }): void {
    const under = underMasthead();
    if (mdView && source) {
      const flat = flattenText(source.value), count = crossViewOffset(from.text, flat.text, from.at, true, false);
      if (count === 0) { window.scrollTo(0, 0); return; }
      const i = positionAt(flat, count) ?? source.value.length;
      const t = sourceTwin(source), top = t.topOf(i);
      t.done();
      window.scrollTo(0, window.scrollY + top - under);
      return;
    }
    if (!view) return;
    const flat = flattenDoc(view.state.doc), count = crossViewOffset(from.text, flat.text, from.at, false, false);
    if (count === 0) { window.scrollTo(0, 0); return; }
    const pos = Math.min(positionAt(flat, count) ?? view.state.doc.content.size, view.state.doc.content.size);
    /* HELD like an arrival's place, and remembered: a closed section opens,
       and a page that grows above it — pictures, the fitted measure — sets it
       again (pin: the switch carries the text › ⌃⌘M back, then 400px grown above)
       (pin: places › a closed section's text switched to) */
    const place = { pos, y: 1 };
    setHeld({ ekey: ekeyOf(), place });
    applyPlace(place);
    /* the offset remembered is the rendered view's, after the place is set:
       the source's beside a rendered position misled the fallback
       (pin: the switch carries the text › the switch's place remembered) */
    place.y = Math.max(1, window.scrollY);
    writePlace(ekeyOf(), place);
  }
  function putViewCaret(): void {
    const here = mdView ? "source" : "rendered", other = mdView ? "rendered" : "source";
    if (mdView && source) {
      const flat = flattenText(source.value);
      const arriving = arrivingCount(carets[here], carets[other], flat.text, true);
      const pos = arriving ? (positionAt(flat, arriving.at) ?? source.value.length) : source.value.length;
      placedAt = arriving ? arriving.at : null;
      /* the caret BEFORE the focus: a fresh textarea's selection sits at
         its end, and focusing scrolls that into view (pin: source view › ⌃⌘M from the top) */
      source.setSelectionRange(pos, pos);
      /* KEEP THE CARET AS VISIBLE AS IT WAS: a reader who scrolled away from
         the caret stays where they scrolled; a miss scrolls, having no bit to
         follow (pin: source view › ⌃⌘M scrolled away from the caret) */
      source.focus({ preventScroll: !!arriving && !arriving.seen });
    } else if (view) {
      const flat = flattenDoc(view.state.doc);
      const arriving = arrivingCount(carets[here], carets[other], flat.text, false);
      const pos = arriving ? (positionAt(flat, arriving.at) ?? view.state.doc.content.size) : 0;
      placedAt = arriving ? arriving.at : null;
      const tr = view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(Math.min(pos, view.state.doc.content.size))));
      /* a caret that was seen is brought into view and wins over the switch's
         held place, which the page's resize re-applies a frame later.
         Unpinned: no step's page has shown the re-apply taking the caret out
         of view — a canto, headings and pictures tried */
      if (!arriving || arriving.seen) { tr.scrollIntoView(); setHeld(null); }
      view.dispatch(tr);
      view.focus();
    }
  }
  function setView(md: boolean): void {
    if (md === mdView) return;
    const wasForced = forced;
    forced = false;
    holdViewCaret();
    /* THE TEXT AT THE TOP SURVIVES THE SWAP: the two views lay one text out
       at different heights, and the pixel offset alone put another passage
       there (stanza 55 came up as 45). Set after the new surface is built —
       the teardown clamps the scroll to the top — and before the caret is
       placed, so a caret that was seen still scrolls into view and one that
       was not leaves a reader where they were reading.
       (pin: the switch carries the text › a long canto switched at its middle)
       (pin: source view › ⌃⌘M scrolled away from the caret) */
    const y = window.scrollY, top = y > 0 ? topCount() : null;
    if (md) {
      const text = currentMd();
      mdView = true;
      mountSource(text);
    } else {
      let doc;
      try { doc = parseMarkdown(source ? source.value : ""); }
      catch (err) {
        /* PINNED, in the open path's words: the writer stays in source to fix
           the line the message quotes, and a whisper faded before a slow
           reader found it; released by the clean parse below
           (pin: grid › a stray line in a grid, switched back) */
        if (fencePin) opts.releasePin?.(fencePin);
        fencePin = opts.pin?.("cannot render " + ekeyOf() + " — " + (err as Error).message + "; shown as source") || 0;
        forced = wasForced;   /* a forced source view stays forced, so the next open renders (pin: grid › the next entry after a refused switch) */
        return;
      }
      mdView = false;
      mountEditor(doc, current.date, current.tag);
      const refused = fenceRefusals(doc);
      if (fencePin) { opts.releasePin?.(fencePin); fencePin = 0; }
      if (refused.length) fencePin = opts.pin?.(refusalsText(refused)) || 0;
    }
    window.scrollTo(0, y);
    if (top !== null) alignTop(top);
    opts.onView?.(mdView);
    scheduleSave();
    show();
    putViewCaret();
  }
  const resolver = (date: string, tag: string | null) => (src: string): Promise<string | null> =>
    images.get(pictureKey(date, tag, src)).then((row) => {
      if (!row) return null;
      const ext = (src.split(".").pop() || "").toLowerCase();
      return URL.createObjectURL(new Blob([row.bytes as BlobPart], { type: MIME[ext] || "application/octet-stream" }));
    });
  function open(date: string, tag: string | null, how: OpenHow = "keep"): void {
    cancelSave();
    suspended = false;
    /* recorded BEFORE a forced source view is released: released first, the
       source's place read as a rendered one with no view and was lost
       (pin: places › a forced entry left scrolled, returned to) */
    if (view || source) recordPlace();
    if (forced) { mdView = readerView; forced = false; opts.onView?.(mdView); }   /* the chrome's pill followed the forced view but not its release (pin: grid › the next entry after a refused switch) */
    current = { date, tag };
    const ekey = ekeyOf();
    if (held && held.ekey !== ekey) setHeld(null);
    const md = layer.entryMd(ekey);
    /* the open view stays the open view across a navigation; the carets and
       a pinned fence refusal belong to the entry left (pin: walk › ⌃⌘M, then ⌃⌘.) */
    carets.rendered = carets.source = null; placedAt = null;
    if (fencePin) { opts.releasePin?.(fencePin); fencePin = 0; }
    if (mdView) { mountSource(md); place(ekey, how); }
    else {
      let doc;
      try { doc = parseMarkdown(md); }
      catch (err) {
        /* not edited as a document — an editor over a lossy parse would save
           the loss — but as source: the switch back parses it again
           (pin: grid › the faulty entry opened) */
        console.error("cannot render", ekey, (err as Error).message);   /* the message, not the stack: minified names churn per build (pin: console › cannot render page/Gridded) */
        /* PINNED, released by the next open: a whisper was covered by the
           entry count before it was read (pin: grid › the faulty entry opened) */
        fencePin = opts.pin?.("cannot render " + ekey + " — " + (err as Error).message + "; shown as source") || 0;
        readerView = mdView; forced = true;
        mdView = true;
        mountSource(md);
        place(ekey, how);
        opts.onView?.(true);
        document.documentElement.dataset.entry = ekey;
        show();
        return;
      }
      mountEditor(doc, date, tag);
      place(ekey, how);
    }
    document.documentElement.dataset.entry = ekey;
    show();
    if (pending && pending.gen === navGen) { highlight(pending.hl.q || "", pending.hl.nth || 0, pending.honor); pending = null; }
  }
  /* a highlight owed wins over the remembered place: it is what a reader
     asked to see (pin: reference paste › the reference link followed) */
  function place(ekey: string, how: OpenHow): void {
    if (how !== "arrive") return;
    const p = pending && pending.gen === navGen ? null : placeOf(places.read(), ekey);
    setHeld(p ? { ekey, place: p } : null);
    if (p) applyPlace(p); else window.scrollTo(0, 0);
  }
  /* a page opened before the warm drew unfolded, its sub-entries not yet in
     the cache (pin: places › the warm landed) */
  function refreshFolds(): void {
    if (!view || mdView) return;
    const st = foldsKey.getState(view.state);
    const on = foldsContents(Object.keys(layer.cache), current.date, current.tag);
    if (!st || st.on === on) return;
    const page = on ? readFolds(ekeyOf()) : null;
    setFolds(on, page ? page.open : [])(view.state, view.dispatch);
    /* the folds moved the text under a held place: set again now, not a
       frame later when the size is observed (pin: places › the warm landed) */
    if (held && held.ekey === ekeyOf()) applyPlace(held.place);
  }
  function insertText(text: string): boolean {
    if (mdView && source) {
      const a = source.selectionStart, b = source.selectionEnd;
      source.setRangeText(text, a, b, "end");
      source.focus();
      source.dispatchEvent(new Event("input"));
      return true;
    }
    if (!view) return false;
    view.dispatch(view.state.tr.insertText(text).scrollIntoView());
    view.focus();
    return true;
  }
  function highlight(q: string, nth: number, honorMarkers: boolean): boolean {
    const did = !!view && highlightIn(view, q, nth, honorMarkers);
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
      if (!view && !source) open(current.date, current.tag);
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
    if ((!view && !source) || layer.storeReadFailed) return Promise.resolve(false);
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
  /* in the source view the markdown is parsed first, so syntax never counts
     as words and both views report one number
     (pin: source view › ⌃⌘W in the source view) */
  function showWordCount(): void {
    let n = 0;
    if (mdView && source) {
      const a = source.selectionStart, b = source.selectionEnd;
      const text = a === b ? source.value : source.value.slice(a, b);
      try { n = wordCount(parseMarkdown(text), 0, 0); } catch { n = wordsOf(text); }
    } else if (view) {
      const { from, to } = view.state.selection;
      n = wordCount(view.state.doc, from, to);
    }
    say(n === 1 ? "1 word" : n + " words", 2000);
  }
  function copyReference(): void {
    if (mdView) { say("switch to the rendered view (⌃⌘M) to copy a reference"); return; }
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
  /* the window's place is the page's alone: the browser's own restore on
     Back and Forward ran before hashchange, against the entry being left
     (pin: places › Forward) (pin: places › Back again) */
  history.scrollRestoration = "manual";
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
    else if (e.key === "m") { e.preventDefault(); setView(!mdView); }
    else if (e.key === "w") { e.preventDefault(); showWordCount(); }
  });
  return {
    get current() { return current; },
    get view() { return view; },
    open, openHash, saveNow, flushSave, refresh, suspendSaves, surfaceMd: currentMd, goto, step, today, copyReference, copyEntryLink, highlight, jump, setView, showWordCount, insertText,
    get mdView() { return mdView; },
    get hashDeferred() { return hashDeferred; },
    refreshFolds,
    movePlace,
    setInterval: (n) => { interval = n; if (view) setLineInterval(n)(view.state, view.dispatch); },
  };
}
