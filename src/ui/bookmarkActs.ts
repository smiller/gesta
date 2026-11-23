import type { Session } from "../session.ts";
import type { Journal } from "../store/reference.ts";
import type { Screen } from "./screen.svelte.ts";
import type { bookmarkStore } from "../store/bookmarkStore.ts";
import { entryKey, entryHash } from "../store/keys.ts";
import { linkRefusal, insertLinkAfter, linkMarkdown } from "../editor/insertLink.ts";
import { mdLabel } from "../store/reference.ts";
import { bookmarkIndex, bookmarkParts, reachableBookmarks, aliasHolder, aliasRefusal, setBookmarkAlias, addBookmark, bookmarksFull, numberedBookmarks, type Bookmark } from "../store/bookmarks.ts";
import { bookmarkRows, bookmarkFoot, bookmarkLabel, bookmarkLinkLabel, alreadyOn, typeAlias, resolveAlias, aliasCandidates, type Resolved } from "./bookmarksModel.ts";
import type { Raise } from "../model/alertText.ts";

export type BookmarkAct = "jump" | "del" | "key" | "link";
export interface BookmarkPanelDeps {
  bm: Screen["bookmarks"];
  marks: ReturnType<typeof bookmarkStore>;
  session: Pick<Session, "current" | "goto" | "focusText" | "view" | "mdView" | "insertText" | "save">;
  journal: Journal;
  /* why an act did nothing */
  raise: Raise;
  overlay: { open(opening: "bookmarks"): void };
  panel: { isOpen(): boolean; show(): void };
  closeOpened(): void;
  focusPanel(): void;
  caretInEntry(): boolean;
  keysNow(): string[];
  warmBlock(): boolean;
  warmed(): boolean;
}
export interface BookmarkPanel { open(): void; key(e: KeyboardEvent): void; draft(v: string): void; commit(typed: string): void; act(key: string, what: BookmarkAct): void }
export function bookmarkActs(d: BookmarkPanelDeps): BookmarkPanel {
  const { bm, marks, session, journal, raise, overlay, panel, closeOpened, focusPanel, caretInEntry, keysNow, warmBlock, warmed } = d;
  let cardCaret = false;
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
    setTimeout(() => { focusPanel(); bm.opening = 0; }, 0);
  };
  const openBookmarks = (): void => {
    cardCaret = caretInEntry();
    overlay.open("bookmarks");
    marks.open(warmed() ? keysNow : null).then((wrote) => { if (wrote && panel.isOpen()) renderBookmarks(); });
    bm.editing = ""; bm.draft = ""; bm.buf = "";
    panel.show();
    renderBookmarks();
  };
  const jumpBookmark = (b: Bookmark): void => {
    const p = bookmarkParts(b.key);
    closeOpened();
    session.goto(entryHash(p.date, p.tag), alreadyOn(b.key, journal));
  };
  const resolved = (r: Resolved): void => {
    bm.buf = r.buf;
    if (r.jump) jumpBookmark(r.jump);
    else if (r.warn) raise(r.warn);
  };
  const addOpenBookmark = (): void => {
    const here = hereKey();
    if (bookmarkIndex(marks.list(), here) !== -1) { raise("alreadyBookmarked"); return; }
    if (bookmarksFull(marks.list())) { raise("bookmarksFull"); return; }
    session.save.flush().then(() => {
      if (!panel.isOpen()) return;
      if (!reachableBookmarks([{ key: here, alias: "" }], keysNow()).length) { if (!warmBlock()) raise("nothingToBookmark"); return; }
      const next = addBookmark(marks.list(), here);
      if (next && marks.write(next)) renderBookmarks();
    });
  };
  const bookmarkEscape = (e: KeyboardEvent): void => {
    if (bm.editing) { e.stopPropagation(); bm.editing = ""; bm.draft = ""; renderBookmarks(); return; }
    if (bm.buf) { e.stopPropagation(); bm.buf = ""; return; }
    closeOpened();
    session.focusText();
  };
  const modded = (e: KeyboardEvent): boolean => e.metaKey || e.ctrlKey || e.altKey;
  const isDigit = (k: string): boolean => k.length === 1 && k >= "1" && k <= "9";
  const jumpNumbered = (k: string): void => {
    const b = numberedBookmarks(marks.list())[+k - 1];
    if (!b) raise("noBookmark", { n: k });
    else jumpBookmark(b);
  };
  const firstKey = (e: KeyboardEvent): boolean => {
    if (e.key.toLowerCase() === "a") { e.preventDefault(); addOpenBookmark(); return true; }
    if (!isDigit(e.key)) return false;
    e.preventDefault();
    jumpNumbered(e.key);
    return true;
  };
  const triggerKey = (e: KeyboardEvent): void => {
    const ch = e.key.length === 1 ? e.key.toLowerCase() : "";
    const r = ch ? typeAlias(marks.list(), bm.buf, ch) : null;
    if (r) { e.preventDefault(); resolved(r); }
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") { bookmarkEscape(e); return; }
    if (modded(e)) return;
    if (bm.editing) return;   /* the editor keeps every other key; its Enter is its own */
    if (e.key === "Enter" && bm.buf) { e.preventDefault(); resolved(resolveAlias(marks.list(), bm.buf)); return; }
    if (!bm.buf && firstKey(e)) return;
    triggerKey(e);
  };
  const draft = (v: string): void => { bm.draft = v; };
  const commit = (typed: string): void => {
    const key = bm.editing, alias = typed.trim().toLowerCase();
    if (!key) return;
    const holder = aliasHolder(marks.list(), alias);
    if (holder && holder.key !== key) { raise("keyTaken", { key: alias, label: bookmarkLabel(holder.key, journal) }); return; }
    const why = aliasRefusal(alias);
    if (why) { raise(why); return; }
    const next = setBookmarkAlias(marks.list(), key, alias);
    if (!next) { bm.editing = ""; bm.draft = ""; renderBookmarks(); return; }
    if (!marks.write(next)) { renderBookmarks(); return; }
    bm.editing = ""; bm.draft = "";
    renderBookmarks();
  };
  const deleteBookmark = (i: number): void => {
    const next = marks.list().slice();
    next.splice(i, 1);
    if (marks.write(next)) renderBookmarks();
  };
  const editBookmarkKey = (b: Bookmark): void => {
    bm.buf = ""; bm.editing = b.key; bm.draft = b.alias; bm.opening = 1;
    renderBookmarks();
  };
  const nowhereToType = (view: typeof session.view): boolean => !view && !session.mdView;
  /* the link after the caret the panel opened on; every way it cannot
     land says why, nothing is appended at the end, and the keys go back
     to the text either way (pin: editing › a
     bookmark's link pressed in inline code); in the markdown view it is
     typed there as markdown (pin: alerts and surfaces › a bookmark's link in
     the markdown view) */
  const bookmarkLink = (key: string): void => {
    if (warmBlock()) return;
    closeOpened();
    session.focusText();
    if (key === hereKey()) { raise(alreadyOn(key, journal)); return; }
    const view = session.view;
    if (!cardCaret || nowhereToType(view)) { raise("placeCursor"); return; }
    const why = view && linkRefusal(view.state);
    if (why) { raise(why); return; }
    const p = bookmarkParts(key), href = entryHash(p.date, p.tag), label = mdLabel(bookmarkLinkLabel(key, journal), "entry");
    if (view) insertLinkAfter(view, href, label);
    else session.insertText(linkMarkdown(href, label), true);
    session.save.now();
  };
  const act = (key: string, what: BookmarkAct): void => {
    const i = bookmarkIndex(marks.list(), key);
    if (i === -1) return;
    const b = marks.list()[i];
    if (what === "del") deleteBookmark(i);
    else if (what === "key") editBookmarkKey(b);
    else if (what === "link") bookmarkLink(key);
    else jumpBookmark(b);
  };
  return { open: openBookmarks, key: onKey, draft, commit, act };
}
