import type { Session } from "../session.ts";
import type { Journal } from "../store/reference.ts";
import type { Screen } from "./screen.svelte.ts";
import type { bookmarkStore } from "../store/bookmarkStore.ts";
import { entryKey, entryHash } from "../store/keys.ts";
import { linkRefusal, insertLinkAfter, linkMarkdown } from "../editor/insertLink.ts";
import { mdLabel } from "../store/reference.ts";
import { bookmarkIndex, bookmarkParts, reachableBookmarks, aliasHolder, aliasRefusal, setBookmarkAlias, addBookmark, bookmarksFull, numberedBookmarks, type Bookmark } from "../store/bookmarks.ts";
import { bookmarkRows, bookmarkFoot, bookmarkLabel, bookmarkLinkLabel, alreadyOn, typeAlias, resolveAlias, aliasCandidates } from "./bookmarksModel.ts";
import { trimLabel, ECHO_CAP } from "./mastheadModel.ts";

export type BookmarkAct = "jump" | "del" | "key" | "link";
export interface BookmarkCardDeps {
  bm: Screen["bookmarks"];
  marks: ReturnType<typeof bookmarkStore>;
  session: Pick<Session, "current" | "goto" | "focusText" | "view" | "mdView" | "insertText" | "save">;
  journal: Journal;
  say(text: string, ms?: number): void;
  overlay: { open(opening: "bookmarks"): void };
  panel: { isOpen(): boolean; show(): void };
  closePanel(): void;
  focusCard(): void;
  caretInEntry(): boolean;
  keysNow(): string[];
  warmBlock(): boolean;
  warmed(): boolean;
}
export interface BookmarkCard { open(): void; key(e: KeyboardEvent): void; draft(v: string): void; commit(typed: string): void; act(key: string, what: BookmarkAct): void }
export function bookmarkActs(d: BookmarkCardDeps): BookmarkCard {
  const { bm, marks, session, journal, say, overlay, panel, closePanel, focusCard, caretInEntry, keysNow, warmBlock, warmed } = d;
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
    setTimeout(() => { focusCard(); bm.opening = 0; }, 0);
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
    session.save.flush().then(() => {
      if (!panel.isOpen()) return;
      if (!reachableBookmarks([{ key: here, alias: "" }], keysNow()).length) { if (!warmBlock()) say("nothing to bookmark here yet", 2500); return; }
      const next = addBookmark(marks.list(), here);
      if (next && marks.write(next)) renderBookmarks();
    });
  };
  const bookmarkEscape = (e: KeyboardEvent): void => {
    if (bm.editing) { e.stopPropagation(); bm.editing = ""; bm.draft = ""; renderBookmarks(); return; }
    if (bm.buf) { e.stopPropagation(); bm.buf = ""; return; }
    closePanel();
    session.focusText();
  };
  const modded = (e: KeyboardEvent): boolean => e.metaKey || e.ctrlKey || e.altKey;
  const isDigit = (k: string): boolean => k.length === 1 && k >= "1" && k <= "9";
  const jumpNumbered = (k: string): void => {
    const b = numberedBookmarks(marks.list())[+k - 1];
    if (!b) say("no bookmark " + k, 2000);
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
    if (holder && holder.key !== key) { say("“" + alias + "” already goes to " + trimLabel(bookmarkLabel(holder.key, journal), ECHO_CAP), 2500); return; }
    const why = aliasRefusal(alias);
    if (why) { say(why, 2500); return; }
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
  /* the link after the caret the card opened on; every way it cannot
     land says why, nothing is appended at the end, and the keys go back
     to the text either way (pin: editing › a
     bookmark's link pressed in inline code); in the markdown view it is
     typed there as markdown (pin: notices and surfaces › a bookmark's link in
     the markdown view) */
  const bookmarkLink = (key: string): void => {
    if (warmBlock()) return;
    closePanel();
    session.focusText();
    if (key === hereKey()) { say(alreadyOn(key, journal), 2000); return; }
    const view = session.view;
    if (!cardCaret || nowhereToType(view)) { say("place your cursor in the entry", 2000); return; }
    const why = view && linkRefusal(view.state);
    if (why) { say(why, 2000); return; }
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
