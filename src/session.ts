/* THE BRIDGE: the editor over the journal. Open the entry the address
   names, save what is typed through the entry layer on a debounce, flush
   on the way out, walk to the neighbours. Ported 2026-09-07 from the
   current app's load, saveNow, routeHash and the flush-on-leave listeners,
   re-asked of a store that holds markdown and a document model that
   serializes to it: a save is serialize-and-compare, skipped when the text
   is what the store holds, and an empty document over no stored entry
   mints nothing. */
import type { EditorView } from "prosemirror-view";
import { parseMarkdown } from "./model/parse.ts";
import { serializeMarkdown } from "./model/serialize.ts";
import { createEditor } from "./editor/editor.ts";
import { imageView, pastedPictureBytes, pastedImageFile } from "./editor/images.ts";
import { nextImageName } from "./store/names.ts";
import { imageRefs } from "./store/exportEntries.ts";
import { schema } from "./model/schema.ts";
import { fenceRefusals, refusalsText } from "./model/fenceRefusals.ts";
import { setLineInterval } from "./editor/lineNumbers.ts";
import { entryKey, entryHash, todayKey, nsOf, pageParts } from "./store/keys.ts";
import { entryFile } from "./store/names.ts";
import { hashParts } from "./store/nav.ts";
import { navNeighbors, unmintedKey, registered } from "./store/lists.ts";
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
import { countBefore, positionAt, arrivingCount, type Hold } from "./chrome/viewCarets.ts";
import { sourceTab } from "./editor/sourceKeys.ts";
import { wordCount, wordsOf } from "./editor/format.ts";

export interface SessionOptions {
  mount: HTMLElement;
  layer: EntryLayer;
  images: ImageStore;
  interval: number;
  /* the corner's whisper; "saved" takes the current app's shorter time */
  say: (text: string, ms?: number) => void;
  /* a failure worth pinning until seen — a lost picture */
  stick?: (text: string) => void;
  /* an OWNED pin: the refused fences named on a switch back, released by
     the next clean parse of the page (the switch's, and only that one) */
  pin?: (text: string) => number;
  releasePin?: (gen: number) => void;
  /* the document changed, a save landed or an entry opened: what the
     store holds for the open entry and its key, for the chrome that reads
     them. The markdown on screen is not handed over — until 2026-09-08 it
     was, for phase 2's pane, at a serialize per keystroke. */
  onShow?: (stored: string, ekey: string) => void;
  /* an edit landed in the document — what arms the backup's idle timer */
  onEdit?: () => void;
  /* the view switched: true in the markdown source view */
  onView?: (md: boolean) => void;
  /* the editor's selection moved — read AFTER the editor has it, where
     the DOM's selectionchange runs a beat ahead of the state */
  onSelect?: () => void;
  /* a highlight was placed — a search jump's or a link payload's — which
     the format bar must not float over: it is for text the reader chose */
  onHighlight?: () => void;
}
export interface Session {
  readonly current: { date: string; tag: string | null };
  readonly view: EditorView | null;
  open(date: string, tag: string | null): void;
  openHash(): void;
  saveNow(): Promise<boolean>;
  flushSave(): Promise<boolean>;
  refresh(): Promise<void>;
  surfaceMd(): string;
  readonly hashDeferred: boolean;
  goto(hash: string, sameMsg?: string): void;
  step(dir: "prev" | "next"): void;
  today(): void;
  copyReference(): void;
  copyEntryLink(): void;
  /* select the nth occurrence of q in the open entry and scroll to it;
     honorMarkers for a search-box jump, literal for a link's payload */
  highlight(q: string, nth: number, honorMarkers: boolean): boolean;
  /* text typed in at the caret, in either view — a shortcut's expansion */
  insertText(text: string): boolean;
  /* the markdown source view: both views edit the one entry */
  readonly mdView: boolean;
  setView(md: boolean): void;
  showWordCount(): void;
  /* open the entry and highlight once it paints — or at once when it is
     the open one, since a hash set to its own value fires no hashchange */
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
     to: a later navigation drops it, or it would select against the
     wrong, now-current entry */
  let pending: { hl: Highlight; honor: boolean; gen: number } | null = null;
  let navGen = 0;
  /* THE SOURCE VIEW: the same markdown in a textarea, both views editing
     the one entry. Ported 2026-09-07 from 13b-the-view-switch-and-its-
     carets.js, re-asked of a store that holds markdown: the switch is a
     serialize, the switch back a parse, and a text the model refuses
     stays in the source view and says why. The carets are viewCarets'. */
  let mdView = false;
  /* a stored text the model refuses FORCES the source view for that entry
     only; the reader's own choice is put back on the next open (the
     2026-09-08 review: one refused entry switched every later navigation
     to source until a ⌃⌘M) */
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
  /* the source surface: a textarea over the markdown, sized to its text,
     saving on the debounce like the editor; Tab and Shift-Tab are the
     source's (sourceKeys.ts) */
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
  /* A PASTED PICTURE: filed beside the entry under the next sidecar name,
     then placed — the image node at the caret in the rendered view, its
     `![](name)` in the source — and saved. WHERE IT WAS AIMED is checked
     when the bytes are ready: the decode lands a beat later and a reader
     can navigate in that window, and a picture dropped into whatever is
     open then is the current app's measured loss. Every way it cannot
     land sticks, since the gesture is spent. */
  let decoding = false;
  let fencePin = 0;
  function pasteFile(file: File): void {
    if (decoding) { say("picture not pasted — one at a time; paste it again", 2600); return; }
    const aimedAt = ekeyOf(), aimedMd = mdView;
    decoding = true;
    pastedPictureBytes(file).then((bytes) => {
      decoding = false;
      if (aimedAt !== ekeyOf() || aimedMd !== mdView) { opts.stick?.("the picture had nowhere to land — paste it again"); return; }
      const at = entryFile(current.date, current.tag);
      const name = nextImageName(at.base, imageRefs(currentMd()));
      return images.set(at.dir + name, bytes).then(() => {
        if (mdView && source) { insertText("![](" + name + ")"); return; }
        if (!view) return;
        const tr = view.state.tr.replaceSelectionWith(schema.nodes.image.create({ src: name, alt: "" }));
        /* a picture at the entry's end gets a line below it, the caret there */
        const $end = tr.doc.resolve(tr.selection.to);
        if ($end.pos >= tr.doc.content.size - 1) tr.insert(tr.doc.content.size, schema.nodes.paragraph.create());
        view.dispatch(tr.scrollIntoView());
        view.focus();
      });
    }).catch((err: unknown) => { decoding = false; console.error("picture not pasted", err); opts.stick?.("that picture couldn't be read — try copying it as a PNG"); });
  }
  function mountEditor(doc: import("prosemirror-model").Node, date: string, tag: string | null): void {
    teardown();
    const dir = entryFile(date, tag).dir;
    view = createEditor(mount, doc, {
      interval,
      onChange: () => { scheduleSave(); show(); opts.onEdit?.(); },
      onSelect: () => opts.onSelect?.(),
      nodeViews: { image: imageView(resolver(dir)) },
      onRoute: (frag) => goto(frag, "already here"),
      onRefuse: (why) => say(why),
      onPasteFile: pasteFile,
    });
  }
  /* held on the way OUT: how many flat characters precede the caret, the
     text as the staleness test, whether anything follows, whether the
     reader was looking at it. A MOVED caret retires the other view's hold. */
  function holdViewCaret(): void {
    let hold: Hold | null = null;
    if (mdView && source) {
      const flat = flattenText(source.value);
      const at = countBefore(flat, source.selectionStart);
      hold = { at, text: flat.text, tail: at >= flat.text.length, seen: true };
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
  function putViewCaret(): void {
    const here = mdView ? "source" : "rendered", other = mdView ? "rendered" : "source";
    if (mdView && source) {
      const flat = flattenText(source.value);
      const arriving = arrivingCount(carets[here], carets[other], flat.text, true);
      const pos = arriving ? (positionAt(flat, arriving.at) ?? source.value.length) : source.value.length;
      placedAt = arriving ? arriving.at : null;
      /* the caret BEFORE the focus: a fresh textarea's selection sits at
         its end, and focusing scrolls that into view — MEASURED 2026-09-07
         in Helium, a toggle from the top landed the window at the end */
      source.setSelectionRange(pos, pos);
      /* KEEP THE CARET AS VISIBLE AS IT WAS, a weaker promise than always
         visible: a reader who scrolled away from the caret stays where
         they scrolled — the current app's rule, asked for again by hand
         2026-09-07; the miss scrolls, having no bit to follow */
      source.focus({ preventScroll: !!arriving && !arriving.seen });
    } else if (view) {
      const flat = flattenDoc(view.state.doc);
      const arriving = arrivingCount(carets[here], carets[other], flat.text, false);
      const pos = arriving ? (positionAt(flat, arriving.at) ?? view.state.doc.content.size) : 0;
      placedAt = arriving ? arriving.at : null;
      const tr = view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(Math.min(pos, view.state.doc.content.size))));
      if (!arriving || arriving.seen) tr.scrollIntoView();
      view.dispatch(tr);
      view.focus();
    }
  }
  function setView(md: boolean): void {
    if (md === mdView) return;
    forced = false;   /* the reader's choice from here */
    holdViewCaret();
    /* THE SCROLL SURVIVES THE SWAP: the teardown empties the page for an
       instant and the window's scroll clamps to the top before the new
       surface is tall again — MEASURED 2026-09-07, a reader scrolled to
       the bottom arrived at the top of the source. Put back before the
       caret is placed, so a caret that was seen still scrolls into view
       and one that was not leaves the reader where they scrolled. */
    const y = window.scrollY;
    if (md) {
      const text = currentMd();
      mdView = true;
      mountSource(text);
    } else {
      let doc;
      try { doc = parseMarkdown(source ? source.value : ""); }
      catch (err) { say("the source cannot be rendered — " + (err as Error).message); return; }
      mdView = false;
      mountEditor(doc, current.date, current.tag);
      /* a clean parse OF THE PAGE releases the pin; a refusal renews it */
      const refused = fenceRefusals(doc);
      if (fencePin) { opts.releasePin?.(fencePin); fencePin = 0; }
      if (refused.length) fencePin = opts.pin?.(refusalsText(refused)) || 0;
    }
    window.scrollTo(0, y);
    opts.onView?.(mdView);
    scheduleSave();
    show();
    putViewCaret();
  }
  /* a relative src resolves in the entry's OWN export folder, which is
     where the import filed it */
  const resolver = (dir: string) => (src: string): Promise<string | null> =>
    images.get(dir + src).then((row) => {
      if (!row) return null;
      const ext = (src.split(".").pop() || "").toLowerCase();
      return URL.createObjectURL(new Blob([row.bytes as BlobPart], { type: MIME[ext] || "application/octet-stream" }));
    });
  function open(date: string, tag: string | null): void {
    cancelSave();
    if (forced) { mdView = readerView; forced = false; }
    current = { date, tag };
    const ekey = ekeyOf();
    const md = layer.entryMd(ekey);
    /* the open view stays the open view: a navigation in the source view
       paints the next entry's source; the holds belong to the entry left,
       and so does a pinned fence refusal (the data pins stay) */
    carets.rendered = carets.source = null; placedAt = null;
    if (fencePin) { opts.releasePin?.(fencePin); fencePin = 0; }
    if (mdView) { mountSource(md); }
    else {
      let doc;
      try { doc = parseMarkdown(md); }
      catch (err) {
        /* a stored text the model refuses is not edited as a document — an
           editor over a lossy parse would save the loss — but it IS edited
           as source: the switch back parses it again */
        console.error("cannot render", ekey, err);
        say("cannot render " + ekey + " — " + (err as Error).message + "; shown as source");
        readerView = mdView; forced = true;
        mdView = true;
        mountSource(md);
        opts.onView?.(true);
        document.documentElement.dataset.entry = ekey;
        show();
        return;
      }
      mountEditor(doc, date, tag);
    }
    document.documentElement.dataset.entry = ekey;
    show();
    if (pending && pending.gen === navGen) { highlight(pending.hl.q || "", pending.hl.nth || 0, pending.honor); pending = null; }
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
    if (date === current.date && (tag || null) === current.tag) { navGen++; highlight(hl.q || "", hl.nth || 0, honorMarkers); return; }
    pending = { hl, honor: honorMarkers, gen: ++navGen };
    goto(entryHash(date, tag));
  }
  /* the address → the entry it opens. A namespace that does not mint on
     visit refuses an unknown key and the refusal lands on the entry already
     open — at boot that is today — with the address put back. */
  let hashDeferred = false;
  function openHash(): void {
    hashDeferred = false;
    const h = hashParts(location.hash.slice(1));
    const keys = Object.keys(layer.cache);
    if (unmintedKey(keys, h.date, h.tag)) {
      /* BEFORE THE WARM the cache holds the primed row alone, so an
         address it lacks is not yet refused: its own row is primed, and
         failing that the warm answers (the page reopens the hash when it
         lands). The 2026-09-08 review: a contents link clicked in the two
         seconds after a refresh said "no such author". */
      if (!layer.warmed) {
        hashDeferred = true;
        const want = entryKey(h.date, h.tag);
        layer.primeEntry(want).then(() => { if (hashDeferred && (layer.warmed || want in layer.cache)) openHash(); }, () => {});
        return;
      }
      /* the noun for what is MISSING: when the root is gone every segment
         under it reads unregistered too, so the depth asked for would call
         a vanished author a book — name the root, unless the root is there */
      const pp = pageParts(h.tag!);
      const ns = nsOf(h.date)!;
      say("no such " + (pp.sub && registered(keys, h.date, pp.name) ? ns.subNoun : ns.noun));
      history.replaceState(null, "", entryHash(current.date, current.tag));
      if (!view && !source) open(current.date, current.tag);
      return;
    }
    /* a "?h=" payload replays LITERALLY: the passage is text, and an old
       link's nth, counted under substring rules, still lands */
    if (h.hl) pending = { hl: h.hl, honor: false, gen: ++navGen };
    open(h.date, h.tag);
  }
  function saveNow(): Promise<boolean> {
    cancelSave();
    if ((!view && !source) || layer.storeReadFailed) return Promise.resolve(false);
    const ekey = ekeyOf();
    const md = currentMd();
    const stored = layer.entryMd(ekey);
    if (md === stored) return Promise.resolve(true);
    if (!md.trim() && !stored) return Promise.resolve(true);   /* an empty document mints nothing */
    return layer.setEntry(ekey, md).then((landed) => { if (landed) say("saved", SAVED_MS); show(); return landed; });
  }
  function scheduleSave(): void { cancelSave(); saveTimer = setTimeout(() => { saveNow(); }, SAVE_DEBOUNCE_MS); }
  function cancelSave(): void { if (saveTimer) clearTimeout(saveTimer); saveTimer = null; }
  function flushSave(): Promise<boolean> { return saveTimer ? saveNow() : Promise.resolve(true); }
  /* the open entry repainted from the store ONLY where the store moved
     under it, after what the debounce holds has landed: open() cancels
     the pending save and repaints, and a reopen after an async write —
     a delete's retarget, an import's overwrite — threw away keystrokes
     typed in the window (the 2026-09-08 review) */
  function refresh(): Promise<void> {
    return flushSave().then(() => { if (layer.entryMd(ekeyOf()) !== currentMd()) open(current.date, current.tag); });
  }
  /* a navigation that lands where it already is SAYS so, when given the
     words: silence there reads as a dead control */
  function goto(hash: string, sameMsg?: string): void {
    if (location.hash === hash) { if (sameMsg) say(sameMsg, 1500); return; }
    location.hash = hash;
  }
  function step(dir: "prev" | "next"): void {
    if (!layer.warmed) { say("still loading — try that again in a moment", 2500); return; }
    const nb = navNeighbors(Object.keys(layer.cache), current.date, current.tag, (k) => !!layer.entryMd(k).trim())[dir];
    if (!nb) { say(dir === "prev" ? "no earlier entry" : "no later entry"); return; }
    goto(entryHash(nb[0], nb[1]));
  }
  function today(): void { goto(entryHash(todayKey()), "already on today"); }
  /* ⌃⌘R copies a reference to the selected passage, ⌃⌘C a link to the
     entry, in TWO flavours: the markdown as text, and the HTML beside it
     for the applications that take one (richCopy.ts), through the writer
     with the textarea fallback. A failed write is logged with the
     markdown, which lives nowhere else. */
  function copy(payload: { text: string; html: string }, okText: string, failText: string): void {
    writeClipboard(payload).then((ok) => {
      if (ok) { say(okText); return; }
      console.error(failText, payload.text);
      say(failText);
    });
  }
  /* ⌃⌘W and the bar's Words: the selection's count, else the whole
     entry's; in the source view the markdown is parsed first so syntax
     never counts as words and both views report one number */
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
  /* the flush on leave: a navigation saves the entry being left; a hidden
     tab and an unload land what the debounce still holds */
  window.addEventListener("hashchange", () => { flushSave().then(openHash); });
  window.addEventListener("beforeunload", () => { saveNow(); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveNow(); });
  /* ⌃⌘, and ⌃⌘. walk, ⌃⌘T is today, ⌃⌘M the view — the current app's
     chords (measured there 2026-07-24 as silent in Helium); both
     modifiers, ⇧ and ⌥ excluded */
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
    open, openHash, saveNow, flushSave, refresh, surfaceMd: currentMd, goto, step, today, copyReference, copyEntryLink, highlight, jump, setView, showWordCount, insertText,
    get mdView() { return mdView; },
    get hashDeferred() { return hashDeferred; },
    setInterval: (n) => { interval = n; if (view) setLineInterval(n)(view.state, view.dispatch); },
  };
}
