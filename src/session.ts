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
import { imageView } from "./editor/images.ts";
import { setLineInterval } from "./editor/lineNumbers.ts";
import { entryKey, entryHash, todayKey, nsOf, pageParts } from "./store/keys.ts";
import { entryFile } from "./store/names.ts";
import { hashParts } from "./store/nav.ts";
import { navNeighbors, unmintedKey, registered } from "./store/lists.ts";
import { journalOf } from "./store/headings.ts";
import { referencePayload, entryLink, REFUSAL_TEXT } from "./editor/reference.ts";
import type { EntryLayer } from "./store/entries.ts";
import type { ImageStore } from "./store/store.ts";
import { copyText } from "./chrome/clipboard.ts";

export interface SessionOptions {
  mount: HTMLElement;
  layer: EntryLayer;
  images: ImageStore;
  interval: number;
  /* the corner's whisper; "saved" takes the current app's shorter time */
  say: (text: string, ms?: number) => void;
  /* the markdown on screen changed or an entry opened: the page's own
     display of it (the details pane, the root's data attributes) */
  onShow?: (md: string, stored: string, ekey: string) => void;
  /* an edit landed in the document — what arms the backup's idle timer */
  onEdit?: () => void;
}
export interface Session {
  readonly current: { date: string; tag: string | null };
  readonly view: EditorView | null;
  open(date: string, tag: string | null): void;
  openHash(): void;
  saveNow(): Promise<boolean>;
  flushSave(): Promise<boolean>;
  goto(hash: string, sameMsg?: string): void;
  step(dir: "prev" | "next"): void;
  today(): void;
  copyReference(): void;
  copyEntryLink(): void;
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
  const ekeyOf = (): string => entryKey(current.date, current.tag);
  const show = (): void => {
    if (!view || !opts.onShow) return;
    opts.onShow(serializeMarkdown(view.state.doc), layer.entryMd(ekeyOf()), ekeyOf());
  };
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
    current = { date, tag };
    const ekey = ekeyOf();
    const md = layer.entryMd(ekey);
    let doc;
    try { doc = parseMarkdown(md); }
    catch (err) {
      /* a stored text the model refuses is shown, not edited: an editor over
         a lossy parse would save the loss */
      console.error("cannot open", ekey, err);
      say("cannot open " + ekey + " — " + (err as Error).message);
      view?.destroy(); view = null;
      mount.replaceChildren();
      const pre = document.createElement("pre"); pre.textContent = md; mount.appendChild(pre);
      return;
    }
    view?.destroy();
    mount.replaceChildren();
    const dir = entryFile(date, tag).dir;
    view = createEditor(mount, doc, {
      interval,
      onChange: () => { scheduleSave(); show(); opts.onEdit?.(); },
      nodeViews: { image: imageView(resolver(dir)) },
    });
    document.documentElement.dataset.entry = ekey;
    show();
  }
  /* the address → the entry it opens. A namespace that does not mint on
     visit refuses an unknown key and the refusal lands on the entry already
     open — at boot that is today — with the address put back. */
  function openHash(): void {
    const h = hashParts(location.hash.slice(1));
    const keys = Object.keys(layer.cache);
    if (unmintedKey(keys, h.date, h.tag)) {
      /* the noun for what is MISSING: when the root is gone every segment
         under it reads unregistered too, so the depth asked for would call
         a vanished author a book — name the root, unless the root is there */
      const pp = pageParts(h.tag!);
      const ns = nsOf(h.date)!;
      say("no such " + (pp.sub && registered(keys, h.date, pp.name) ? ns.subNoun : ns.noun));
      history.replaceState(null, "", entryHash(current.date, current.tag));
      if (!view) open(current.date, current.tag);
      return;
    }
    open(h.date, h.tag);
  }
  function saveNow(): Promise<boolean> {
    cancelSave();
    if (!view || layer.storeReadFailed) return Promise.resolve(false);
    const ekey = ekeyOf();
    const md = serializeMarkdown(view.state.doc);
    const stored = layer.entryMd(ekey);
    if (md === stored) return Promise.resolve(true);
    if (!md.trim() && !stored) return Promise.resolve(true);   /* an empty document mints nothing */
    return layer.setEntry(ekey, md).then((landed) => { if (landed) say("saved", SAVED_MS); show(); return landed; });
  }
  function scheduleSave(): void { cancelSave(); saveTimer = setTimeout(() => { saveNow(); }, SAVE_DEBOUNCE_MS); }
  function cancelSave(): void { if (saveTimer) clearTimeout(saveTimer); saveTimer = null; }
  function flushSave(): Promise<boolean> { return saveTimer ? saveNow() : Promise.resolve(true); }
  /* a navigation that lands where it already is SAYS so, when given the
     words: silence there reads as a dead control */
  function goto(hash: string, sameMsg?: string): void {
    if (location.hash === hash) { if (sameMsg) say(sameMsg, 1500); return; }
    location.hash = hash;
  }
  function step(dir: "prev" | "next"): void {
    const nb = navNeighbors(Object.keys(layer.cache), current.date, current.tag, (k) => !!layer.entryMd(k).trim())[dir];
    if (!nb) { say(dir === "prev" ? "no earlier entry" : "no later entry"); return; }
    goto(entryHash(nb[0], nb[1]));
  }
  function today(): void { goto(entryHash(todayKey()), "already on today"); }
  /* ⌃⌘R copies a reference to the selected passage, ⌃⌘C a link to the
     entry; text/plain only until phase 3 adds the rich flavour, through
     the writer with the textarea fallback. A failed write is logged with
     the payload, which lives nowhere else. */
  function copy(text: string, okText: string, failText: string): void {
    copyText(text).then(() => say(okText), (err: unknown) => { console.error(failText, err, text); say(failText); });
  }
  function copyReference(): void {
    if (!view || !layer.warmed) { say("Still loading — try that again in a moment"); return; }
    const out = referencePayload(view.state, current.date, current.tag, journal);
    if ("refused" in out) { say(REFUSAL_TEXT[out.refused]); return; }
    copy(out.text, "Reference copied to clipboard", "Couldn't copy the reference");
  }
  function copyEntryLink(): void {
    if (!layer.warmed) { say("Still loading — try that again in a moment"); return; }
    copy(entryLink(current.date, current.tag, journal), "Link copied", "Couldn't copy the link");
  }
  /* the flush on leave: a navigation saves the entry being left; a hidden
     tab and an unload land what the debounce still holds */
  window.addEventListener("hashchange", () => { flushSave().then(openHash); });
  window.addEventListener("beforeunload", () => { saveNow(); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveNow(); });
  /* ⌃⌘, and ⌃⌘. walk, ⌃⌘T is today — the current app's chords (measured
     there 2026-07-24 as silent in Helium); both modifiers, ⇧ and ⌥ excluded */
  document.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey && e.metaKey && !e.shiftKey && !e.altKey)) return;
    if (e.key === ",") { e.preventDefault(); step("prev"); }
    else if (e.key === ".") { e.preventDefault(); step("next"); }
    else if (e.key === "t") { e.preventDefault(); today(); }
    else if (e.key === "r") { e.preventDefault(); copyReference(); }
    else if (e.key === "c") { e.preventDefault(); copyEntryLink(); }
  });
  return {
    get current() { return current; },
    get view() { return view; },
    open, openHash, saveNow, flushSave, goto, step, today, copyReference, copyEntryLink,
    setInterval: (n) => { interval = n; if (view) setLineInterval(n)(view.state, view.dispatch); },
  };
}
