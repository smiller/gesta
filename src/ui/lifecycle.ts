import type { EditorView } from "prosemirror-view";
import type { EntryLayer } from "../store/entries.ts";
import type { Session } from "../session.ts";
import type { Journal } from "../store/reference.ts";
import { mdLabel } from "../store/reference.ts";
import { typedName, typedAddress, filingForm, shownForm } from "./naming.ts";
import { subEntrySpec, takenText, subTreeHasContent, blankSubTree, renamePrompt, movePrompt, moveConfirm, deleteConfirm, deleteLanding, hostKey, refiledText, movedText } from "./subEntries.ts";
import { refileKeys, refileLinks, pointsInto, withHeading, linkingKeys } from "../store/refile.ts";
import { movePlan, moveLinks, joined, pictureNames, renamePictures } from "../store/move.ts";
import { imageRefs, splitKey } from "../store/exportEntries.ts";
import { pictureKey } from "../store/names.ts";
import { unnamed, picturesOf } from "../store/pictures.ts";
import { rootLabel, trimLabel, ECHO_CAP } from "./mastheadModel.ts";
import { retargetLinks, relabelLinks } from "../store/links.ts";
import { linkRefusal, headingRefusal, insertLinkAfter, linkMarkdown } from "../editor/insertLink.ts";
import { cutMd, replaceWithLink } from "../editor/format.ts";
import { firstHeading } from "../store/headings.ts";
import { nsOf, pageParts, entryKey, entryHash, KEYED_NS, NS_BOOK } from "../store/keys.ts";
import { SHELVES } from "../store/shelves.ts";
import { registered, childrenOf } from "../store/lists.ts";

export type EditorPort = Pick<EditorView, "state" | "dispatch">;
export interface SourcePort { insertAfter(text: string): void }
export type SessionPort = Pick<Session, "current" | "flushSave" | "suspendSaves" | "surfaceMd" | "open" | "movePlace" | "movePlaces" | "refresh" | "goto" | "saveNow">;
export interface Dialogs {
  prompt(text: string, value?: string): string | null;
  confirm(text: string): boolean;
  alert(text: string): void;
}
export interface UiPort {
  say(text: string, ms?: number): void;
  pin(text: string): void;
  redraw(): void;
  replaceHash(hash: string): void;
  hideBar(): void;
  focus(): void;
}
export interface LifecycleDeps {
  layer: EntryLayer;
  journal: Journal;
  view(): EditorPort | null;
  /* read as an act begins, before a prompt takes the focus */
  caretInEntry(): boolean;
  /* the markdown view, where it is the one showing */
  source(): SourcePort | null;
  session: SessionPort;
  dialogs: Dialogs;
  ui: UiPort;
  /* the folded sections and bookmarks of each moved key */
  moveKept(moves: Record<string, string>): void;
  moveBookmarks(moves: Record<string, string>): void;
  /* false when the store holds no picture under `from`; rejects when the write failed */
  copyPicture(from: string, to: string): Promise<boolean>;
  /* whether `to` holds a picture other than the one under `from` */
  pictureClash(from: string, to: string): Promise<boolean>;
  removePictures(keys: string[]): Promise<void>;
}
/* each settles once its writes have landed */
export interface Lifecycle {
  create(): Promise<void>;
  extract(): Promise<void>;
  rename(): Promise<void>;
  remove(): Promise<void>;
  newRoot(ns: string): Promise<void>;
  shelves(): Promise<void>;
  shown(ekey: string, stored: string): void;
}

/* null once the cache is complete (pin: lifecycle.test › says loading while the warm runs) */
export function coldRefusal(layer: Pick<EntryLayer, "warmed" | "storeReadFailed">): string | null {
  if (layer.warmed) return null;
  return layer.storeReadFailed ? "couldn’t load entries — reload first" : "still loading — try that again in a moment";
}

/* says the refusal and answers whether it refused (pin: lifecycle.test › says loading while the warm runs) */
export function refuseCold(layer: Pick<EntryLayer, "warmed" | "storeReadFailed">, say: (text: string, ms?: number) => void): boolean {
  const why = coldRefusal(layer);
  if (why) say(why, 2500);
  return !!why;
}

export function lifecycle(deps: LifecycleDeps): Lifecycle {
  const { layer, journal, session, dialogs, ui } = deps;
  const done = Promise.resolve();
  /* THE SUB-ENTRIES. Every gate over "what exists" refuses on a cold
     cache: a create would write into a blank painted over a real entry.
     A new name REGISTERS at once (an empty body, as a root does) so the
     lists hold it while it is empty; an existing name just opens. The
     link lands after the caret, never replacing a selection and never
     appended at the end; a caret with nowhere to land refuses before
     anything is minted (pin: lifecycle.test › refuses every operation)
     (pin: lifecycle.test › refuses with no editor) */
  const cold = (): boolean => refuseCold(layer, ui.say);
  /* "Shelves" is no author's: the shelves hold no books, keep their name,
     and no author is filed under it, or it would be hidden from every list
     (pin: lifecycle.test › the shelves are no author) */
  const onShelves = (date: string, tag: string | null): boolean => date === NS_BOOK.key && !!tag && pageParts(tag).name === SHELVES;
  const SHELVES_KEEP = "the shelves keep their name", SHELVES_EMPTY = "the shelves hold no books", SHELVES_TAKEN = "“" + SHELVES + "” is the shelves’ own name";
  const keysNow = (): string[] => Object.keys(layer.cache);
  const shownName = (date: string, tag: string): string => {
    const ns = nsOf(date), pp = pageParts(tag);
    return ns && !pp.sub ? rootLabel(date, tag, journal) : ns ? pp.leaf : tag;
  };
  const retargetHost = (date: string, oldTag: string, newTag: string | null): Promise<unknown> => {
    const host = hostKey(date, oldTag);
    if (!host) return Promise.resolve();
    const oldLabel = nsOf(date) ? pageParts(oldTag).leaf : oldTag;
    const newLabel = newTag ? (nsOf(date) ? pageParts(newTag).leaf : newTag) : null;
    const out = retargetLinks(layer.entryMd(host), entryHash(date, oldTag), newTag ? entryHash(date, newTag) : null, oldLabel, newLabel);
    return out === null ? Promise.resolve() : layer.setEntry(host, out);
  };
  const newName = (ns: ReturnType<typeof nsOf>): string => ns ? "Name for the new " + ns.subNoun + ":" : "Tag for the new entry:";

  /* A NEW NAME'S LINK GOES AFTER THE CARET THE ACT BEGAN WITH: none in the
     entry refuses before anything is minted, and an existing name just
     opens (pin: lifecycle.test › a new name with the caret outside the
     entry refuses); in the markdown view it is typed there as markdown,
     anywhere (pin: lifecycle.test › in the markdown view the link is typed) */
  function create(): Promise<void> {
    if (cold()) return done;
    const inEntry = deps.caretInEntry();
    const c = session.current;
    const ns = nsOf(c.date);
    /* the one leaf: a day's tagged entry hosts nothing, and ⌃⌘N reaches it all the same */
    if (!ns && c.tag) { ui.say("a tagged entry holds no entries of its own", 2500); return done; }
    if (onShelves(c.date, c.tag)) { ui.say(SHELVES_EMPTY, 2500); return done; }
    const typed = typedName(dialogs.prompt(newName(ns)));
    if (!typed) return done;
    if ("refuse" in typed) { ui.say(typed.refuse); return done; }
    const spec = subEntrySpec(c.date, c.tag, typed.name);
    if (!spec) return done;
    if ("refuse" in spec) { ui.say(spec.refuse); return done; }
    const key = entryKey(c.date, spec.full);
    if (registered(keysNow(), c.date, spec.full)) { session.goto(spec.href, "already here"); return done; }
    const view = deps.view(), source = view ? null : deps.source();
    if (!inEntry || (!view && !source)) { ui.say("place your cursor in the entry", 2000); return done; }
    const why = view && (linkRefusal(view.state) || headingRefusal(view.state));
    if (why) { ui.say(why, 2000); return done; }
    /* the entry FIRST, the link once it has landed: linked first, a write
       that failed left the host saved with a link to nothing
       (pin: lifecycle.test › says a registration that did not land) */
    return layer.setEntry(key, "").then((landed) => {
      if (!landed) { ui.say("couldn't create the entry — see the corner", 3000); return; }
      const moved = view ? view !== deps.view() : source !== deps.source() || entryKey(session.current.date, session.current.tag) !== entryKey(c.date, c.tag);
      if (moved) { ui.say("the entry was made — the link was not placed", 3000); return; }
      if (view) insertLinkAfter(view, spec.href, mdLabel(spec.tag, "entry"));
      else source!.insertAfter(linkMarkdown(spec.href, mdLabel(spec.tag, "entry")));
      return session.saveNow().then(() => { ui.redraw(); session.goto(spec.href); });
    });
  }

  /* the selection into a new sub-entry, the link left in its place: the
     new entry is born WITH its heading, so the link is labelled by it at
     birth where a later relabel would never see the change
     (pin: lifecycle.test › moves the selection into the new entry) */
  function extract(): Promise<void> {
    const view = deps.view();
    if (!view || view.state.selection.empty || cold()) return done;
    const { from, to } = view.state.selection;
    const c = session.current;
    const ns = nsOf(c.date);
    if (onShelves(c.date, c.tag)) { ui.say(SHELVES_EMPTY, 2500); return done; }
    const typed = typedName(dialogs.prompt(newName(ns)));
    if (!typed) return done;
    if ("refuse" in typed) { ui.say(typed.refuse); return done; }
    const spec = subEntrySpec(c.date, c.tag, typed.name);
    if (!spec) return done;
    if ("refuse" in spec) { ui.say(spec.refuse); return done; }
    if (childrenOf(keysNow(), spec.listKey).indexOf(spec.tag) !== -1) { dialogs.alert(takenText(spec.listKey, spec.tag)); return done; }
    const md = cutMd(view.state.doc, from, to);
    const cutText = view.state.doc.textBetween(from, to, " ", " ");
    const label = ns ? mdLabel(firstHeading(md), spec.tag) : spec.tag;
    return layer.setEntry(entryKey(c.date, spec.full), md).then((landed) => {
      if (!landed) { ui.say("couldn't create the entry — see the corner", 3000); return; }
      /* the positions were taken before the write: a document that moved
         under them keeps its text, the new entry standing
         (pin: lifecycle.test › places no link when the text moved) */
      if (view !== deps.view() || view.state.doc.textBetween(from, to, " ", " ") !== cutText) { ui.say("the text moved while the entry was made — the link was not placed", 3000); return; }
      view.dispatch(replaceWithLink(view.state, from, to, spec.href, label));
      ui.hideBar();
      return session.saveNow().then(() => { ui.redraw(); session.goto(spec.href); });
    });
  }

  /* a rename is in flight from the prompt until its writes land: a second
     click replayed against the renamed state would move nothing yet still
     retarget the address to a name that holds nothing. The new key lands
     BEFORE the old one clears, so a crash between leaves a transient
     duplicate, never a lost entry. A sub-page renames by its leaf, within
     its parent; content-bearing descendants block, blanks are swept only
     past the prompt (pin: lifecycle.test › flushes, suspends, writes the new key)
     (pin: lifecycle.test › ignores a second rename) */
  let renaming = false;
  function rename(): Promise<void> {
    const c = session.current;
    if (!c.tag || renaming || cold()) return done;
    const date = c.date, old = c.tag, ns = nsOf(date), pp = ns ? pageParts(old) : null;
    if (onShelves(date, old)) { ui.say(SHELVES_KEEP, 2500); return done; }
    if (ns && ns.titledRoots && !pp!.sub) return refile(date, old);
    const deep = !!ns && subTreeHasContent(keysNow(), layer.cache, entryKey(date, old));
    const oldLeaf = pp ? pp.leaf : old;
    const filled = deep ? entryKey(date, old) : oldLeaf;
    const raw = dialogs.prompt(deep ? movePrompt(date, old, shownName(date, old)) : renamePrompt(date, old, shownName(date, old)), filled);
    if ((raw || "").trim() === filled) return done;
    const addr = ns ? typedAddress(raw) : null;
    if (addr && "refuse" in addr) { ui.say(addr.refuse); return done; }
    if (addr) return move(date, old, entryKey(addr.date, addr.tag));
    const typed = typedName(raw);
    if (!typed) return done;
    if ("refuse" in typed) { ui.say(typed.refuse); return done; }
    const leaf = typed.name;
    if (leaf === oldLeaf) return done;
    const listKey = pp && pp.sub ? entryKey(date, pp.parent) : date;
    if (childrenOf(keysNow(), listKey).indexOf(leaf) !== -1) { dialogs.alert(takenText(listKey, leaf)); return done; }
    const full = pp && pp.sub ? pp.parent + "/" + leaf : leaf;
    if (deep) return move(date, old, entryKey(date, full));
    renaming = true;
    return session.flushSave().then(() => {
      if (session.current.date !== date || session.current.tag !== old) return;
      session.suspendSaves();   /* nothing lands under the old key from here on */
      const oldKey = entryKey(date, old), md = layer.entryMd(oldKey);
      const sweptKeys = ns ? blankSubTree(keysNow(), oldKey) : [];
      const sweep = sweptKeys.map((k) => layer.removeEntry(k));
      /* an EMPTY body moves too: the row is the registration */
      const ownLabel = ns ? pageParts(old).leaf : old, newOwnLabel = ns ? pageParts(full).leaf : full;
      const followed = (text: string): string => retargetLinks(text, entryHash(date, old), entryHash(date, full), ownLabel, newOwnLabel) ?? text;
      const moved = layer.setEntry(entryKey(date, full), followed(md));
      return Promise.all([moved, ...sweep]).then(() => layer.removeEntry(oldKey)).then(() => retargetHost(date, old, full)).then(() => {
        /* typed into the surface while the writes ran: carried to the new key */
        const live = session.surfaceMd();
        return live !== md ? layer.setEntry(entryKey(date, full), followed(live)) : true;
      }).then(() => {
        /* the kept state before the open, the place after it (pin:
           lifecycle.test › flushes, suspends, writes the new key) */
        deps.moveKept({ [oldKey]: entryKey(date, full) });
        ui.replaceHash(entryHash(date, full));
        session.open(date, full);
        session.movePlace(oldKey, entryKey(date, full));
        for (const k of sweptKeys) session.movePlace(k, null);
        ui.redraw();
      });
    }).finally(() => { renaming = false; });
  }

  /* the pictures no entry names any more, deleted; `still` the texts of
     entries whose removal did not land, whose pictures stay. One that will
     not go is left, and nothing is said (pin: lifecycle.test › a move deletes
     the old copy) (pin: lifecycle.test › an old entry whose removal fails) */
  const stillThere = (keys: string[], removed: boolean[], md: (i: number) => string): Record<string, string> => {
    const out: Record<string, string> = Object.create(null);
    keys.forEach((k, i) => { if (!removed[i]) out[k] = md(i); });
    return out;
  };
  const dropUnnamed = (keys: string[], still: Record<string, string> = {}): Promise<void> => deps.removePictures(unnamed(keys, { ...layer.cache, ...still })).catch(() => {});
  /* THE PICTURES OF ENTRIES CHANGING KEY, copied before any entry is written,
     so none lands where its pictures are not: one copy for each new place,
     none where a picture stays put, each checked and made one at a time, so a
     book's pictures are never all read at once (pin: lifecycle.test › a
     picture two pages share is copied once). A place holding another picture
     under the new name would show that one in its place, so the copying stops
     and the clash is named (pin: lifecycle.test › each copy is checked); a
     failed read or copy rejects. `copied` gathers each copy made, to be taken
     back; `olds` the keys copied from */
  function carryPictures(moved: { from: string; to: string; named: Record<string, string> }[], copied: string[]): Promise<{ lost: number; olds: string[] } | { clash: string }> {
    const source: Record<string, string> = Object.create(null);
    for (const m of moved) {
      const [a, b] = [splitKey(m.from), splitKey(m.to)];
      for (const src of Object.keys(m.named)) {
        const pa = pictureKey(a[0], a[1], src), pb = pictureKey(b[0], b[1], m.named[src]);
        if (pa !== pb) source[pb] = pa;
      }
    }
    const dests = Object.keys(source);
    let lost = 0, clash = "";
    return dests.reduce((chain, pb) => chain.then(() => clash ? undefined : deps.pictureClash(source[pb], pb).then((taken) => {
      if (taken) { const cut = pb.lastIndexOf("/"); clash = "a picture named " + pb.slice(cut + 1) + " is there already in " + pb.slice(0, cut); return; }
      return deps.copyPicture(source[pb], pb).then((f) => { if (f) copied.push(pb); else lost++; });
    })), Promise.resolve()).then(() => clash ? { clash } : { lost, olds: Array.from(new Set(dests.map((d) => source[d]))) });
  }

  /* AN AUTHOR RE-FILED, its books and their pictures with it: every copy
     lands before any old key is cleared, and a copy that fails takes the others back, the
     old author standing whole (pin: lifecycle.test › a failed move removes
     the copies made). The other entries' links are rewritten after the
     copies land, and one that cannot be is NAMED in a pin rather than
     undone: the undo is more writes that can fail the same way (pin:
     lifecycle.test › a link refused once as stale is rewritten on the
     retry) */
  function refile(date: string, old: string): Promise<void> {
    const typed = typedName(dialogs.prompt(renamePrompt(date, old, shownName(date, old)), old));
    if (!typed) return done;
    if ("refuse" in typed) { ui.say(typed.refuse); return done; }
    const root = typed.name;
    if (root === old) return done;
    if (onShelves(date, root)) { ui.say(SHELVES_TAKEN, 2500); return done; }
    if (childrenOf(keysNow(), date).indexOf(root) !== -1) { dialogs.alert(takenText(date, root)); return done; }
    renaming = true;
    return session.flushSave().then(() => {
      if (session.current.date !== date || session.current.tag !== old) return;
      session.suspendSaves();
      const oldKey = entryKey(date, old), newKey = entryKey(date, root);
      const points = pointsInto(date, old);
      const rewrite = (md: string): string => (md.includes("#" + date + "/") && refileLinks(md, date, old, root)) || md;
      const headed = (md: string): string => withHeading(md, old) ?? md;
      const flushed = layer.entryMd(oldKey);
      const moves = refileKeys(keysNow(), date, old, root);
      /* an author whose books arrived without its own page gets one, or it
         would read as the new filed name (pin: lifecycle.test › an author
         with no page of its own) */
      const pageless = !(oldKey in moves);
      if (pageless) moves[oldKey] = newKey;
      const named = (k: string): Record<string, string> => pictureNames(k, moves[k], layer.entryMd(k), []);
      const rootNames = named(oldKey);
      const rootMd = (md: string): string => renamePictures(headed(rewrite(md)), rootNames);
      const moved = Object.keys(moves).map((from) => {
        const names = from === oldKey ? rootNames : named(from);
        return { from, to: moves[from], named: names, md: from === oldKey ? rootMd(layer.entryMd(from)) : renamePictures(rewrite(layer.entryMd(from)), names) };
      });
      const failed = (keys: string[], results: boolean[]): string[] => keys.filter((_, i) => !results[i]);
      const copied: string[] = [];
      const keepTyped = (): Promise<unknown> => { const live = session.surfaceMd(); return (live !== flushed ? layer.setEntry(oldKey, live) : Promise.resolve(true)).catch(() => {}); };
      const refused = (why: string): Promise<void> => keepTyped().then(() => dropUnnamed(copied)).then(() => { session.open(date, old); ui.pin("couldn't re-file — " + why); });
      return carryPictures(moved, copied).then((carried) => {
      if ("clash" in carried) return refused(carried.clash);
      return Promise.all(moved.map((m) => layer.setEntry(m.to, m.md))).then((landed) => {
        if (landed.includes(false)) {
          /* typed while the copies ran: kept under the old name, which the
             reopen reads (pin: lifecycle.test › a failed move keeps what was typed) */
          const live = session.surfaceMd();
          const kept = live !== flushed ? layer.setEntry(oldKey, live) : Promise.resolve(true);
          return kept.then(() => Promise.all(moved.map((m) => layer.removeEntry(m.to)))).then((removed) => dropUnnamed(copied, stillThere(moved.map((m) => m.to), removed, (i) => moved[i].md)).then(() => removed)).then((removed) => {
            const left = failed(moved.map((m) => m.to), removed).filter((_, i) => landed[i]);
            session.open(date, old);
            ui.pin(left.length ? "couldn't re-file — copies left: " + left.join(", ") : "couldn't re-file — nothing was moved");
          });
        }
        const linking = linkingKeys(layer.cache, date, moves);
        return Promise.all(linking.map((k) => layer.rewriteEntry(k, (md) => refileLinks(md, date, old, root)))).then((results) => {
          const left = [
            ...moved.filter((m) => points(m.md)).map((m) => m.to),
            ...linking.filter((k, i) => results[i] === "failed" || points(layer.entryMd(k))),
          ];
          const updated = linking.filter((k, i) => results[i] === "landed" && left.indexOf(k) === -1).length;
          const olds = Object.keys(moves).filter((k) => !(pageless && k === oldKey));
          const was = olds.map((k) => layer.entryMd(k));
          return Promise.all(olds.map((k) => layer.removeEntry(k))).then((removed) => {
            const stayed = failed(olds, removed);
            const still = stillThere(olds, removed, (i) => was[i]);
            /* typed into the surface while the writes ran: carried to the new key */
            const live = session.surfaceMd();
            return (live !== flushed ? layer.setEntry(newKey, rootMd(live)) : Promise.resolve(true)).then(() => dropUnnamed(carried.olds, still)).then(() => stayed);
          }).then((stayed) => {
            deps.moveKept(moves);
            ui.replaceHash(entryHash(date, root));
            session.open(date, root);
            session.movePlaces(moves);
            ui.redraw();
            const text = refiledText(root, moved.length - (pageless ? 1 : 0), updated, left, stayed, carried.lost);
            if (left.length || stayed.length) ui.pin(text); else ui.say(text);
          });
        });
      });
      }, () => refused("a picture could not be copied, nothing was moved"));
    }).finally(() => { renaming = false; });
  }

  /* A PAGE MOVED WITH ITS SUB-PAGES, to any place: the same order as the
     re-file, the pictures copied first, so no entry lands where its
     pictures are not, each under the name its new entry gives it. Into an
     entry already there, its text joins after the text there and a sub-page the place holds by its title
     is deleted, its links going to that one; a failed copy puts the text
     there back as it was (pin: lifecycle.test › a failed copy takes the
     others back) */
  function move(date: string, old: string, to: string): Promise<void> {
    const from = entryKey(date, old);
    if (to === from) return done;
    const [toDate, toTag] = splitKey(to);
    if (toDate === NS_BOOK.key && toTag && pageParts(toTag).name === SHELVES) { ui.say(pageParts(toTag).sub ? SHELVES_EMPTY : SHELVES_TAKEN, 2500); return done; }
    const first = movePlan(layer.cache, from, to);
    if ("refuse" in first) { ui.say(first.refuse, 3000); return done; }
    const twinTitles = Object.keys(first.twins).map((k) => firstHeading(layer.entryMd(k)) || pageParts(splitKey(k)[1]!).leaf);
    if (!dialogs.confirm(moveConfirm(date, old, shownName(date, old), to, { moved: Object.keys(first.moves).length - 1, into: first.into, twins: twinTitles }))) return done;
    renaming = true;
    return session.flushSave().then(() => {
      if (session.current.date !== date || session.current.tag !== old) return;
      session.suspendSaves();
      const plan = movePlan(layer.cache, from, to);
      if ("refuse" in plan) { session.open(date, old); ui.pin("couldn't move — " + plan.refuse); return; }
      const rewrite = (md: string): string => moveLinks(md, from, plan) ?? md;
      const flushed = layer.entryMd(from), there = plan.into ? layer.entryMd(to) : "";
      const names = (k: string): Record<string, string> => pictureNames(k, plan.moves[k], layer.entryMd(k), k === from && plan.into ? imageRefs(there) : []);
      const rootNames = names(from);
      const rootMd = (md: string): string => {
        const own = renamePictures(rewrite(md), rootNames);
        return plan.into ? joined(rewrite(there), own) : own;
      };
      const moved = Object.keys(plan.moves).map((k) => {
        const named = k === from ? rootNames : names(k);
        return { from: k, to: plan.moves[k], named, md: k === from ? rootMd(flushed) : renamePictures(rewrite(layer.entryMd(k)), named) };
      });
      const failed = (keys: string[], results: boolean[]): string[] => keys.filter((_, i) => !results[i]);
      const copied: string[] = [];
      const twinPictures = Object.keys(plan.twins).flatMap((k) => picturesOf(k, layer.entryMd(k)));
      const keepTyped = (): Promise<unknown> => { const live = session.surfaceMd(); return (live !== flushed ? layer.setEntry(from, live) : Promise.resolve(true)).catch(() => {}); };
      const refused = (why: string): Promise<void> => keepTyped().then(() => dropUnnamed(copied)).then(() => { session.open(date, old); ui.pin("couldn't move — " + why); });
      const takeBack = (landed: boolean[]): Promise<void> => {
        const live = session.surfaceMd();
        const kept = live !== flushed ? layer.setEntry(from, live) : Promise.resolve(true);
        return kept.then(() => Promise.all(moved.map((m) => m.to === to && plan.into ? layer.setEntry(to, there) : layer.removeEntry(m.to)))).then((undone) => dropUnnamed(copied, stillThere(moved.map((m) => m.to), undone, (i) => moved[i].md)).then(() => undone)).then((undone) => {
          const left = failed(moved.map((m) => m.to), undone).filter((_, i) => landed[i]);
          session.open(date, old);
          ui.pin(left.length ? "couldn't move — copies left: " + left.join(", ") : "couldn't move — nothing was moved");
        });
      };
      return carryPictures(moved, copied).then((carried) => {
        if ("clash" in carried) return refused(carried.clash);
        const lost = carried.lost;
        return Promise.all(moved.map((m) => layer.setEntry(m.to, m.md))).then((landed) => {
          if (landed.includes(false)) return takeBack(landed);
          const twins = Object.keys(plan.twins);
          const linking = linkingKeys(layer.cache, date, plan.moves).filter((k) => !(k in plan.twins));
          const points = pointsInto(date, old);
          const host = hostKey(date, old), newLeaf = pageParts(toTag!).leaf, oldLeaf = pageParts(old).leaf;
          const relabel = newLeaf !== oldLeaf ? { old: oldLeaf, new: newLeaf } : undefined;
          return Promise.all(linking.map((k) => layer.rewriteEntry(k, (md) => moveLinks(md, from, plan, k === host ? relabel : undefined)))).then((results) => {
            const left = [
              ...moved.filter((m) => points(m.md)).map((m) => m.to),
              ...linking.filter((k, i) => results[i] === "failed" || points(layer.entryMd(k))),
            ];
            const updated = linking.filter((k, i) => results[i] === "landed" && left.indexOf(k) === -1).length;
            const olds = [...Object.keys(plan.moves), ...twins];
            const was = olds.map((k) => k === from ? flushed : layer.entryMd(k));
            return Promise.all(olds.map((k) => layer.removeEntry(k))).then((removed) => {
              const still = stillThere(olds, removed, (i) => was[i]);
              const live = session.surfaceMd();
              return (live !== flushed ? layer.setEntry(to, rootMd(live)) : Promise.resolve(true)).then(() => dropUnnamed([...carried.olds, ...twinPictures], still)).then(() => failed(olds, removed));
            }).then((stayed) => {
              const kept: Record<string, string> = Object.create(null);
              for (const k of Object.keys(plan.moves)) if (!(plan.into && k === from)) kept[k] = plan.moves[k];
              deps.moveKept(kept);
              deps.moveBookmarks({ ...plan.twins, ...(plan.into ? { [from]: to } : {}) });
              ui.replaceHash(entryHash(toDate, toTag));
              session.open(toDate, toTag);
              session.movePlaces(kept);
              for (const k of plan.into ? [...twins, from] : twins) session.movePlace(k, null);
              ui.redraw();
              const text = movedText(to, moved.length, twins.length, lost, updated, left, stayed);
              if (left.length || stayed.length) ui.pin(text); else ui.say(text);
            });
          });
        });
      }, () => refused("a picture could not be copied, nothing was moved"));
    }).finally(() => { renaming = false; });
  }

  function remove(): Promise<void> {
    const c = session.current;
    if (!c.tag || cold()) return done;
    const date = c.date, tag = c.tag, ns = nsOf(date);
    if (ns && subTreeHasContent(keysNow(), layer.cache, entryKey(date, tag))) { ui.say("delete the " + ns.subNoun + "s first", 2500); return done; }
    if (!dialogs.confirm(deleteConfirm(date, tag, shownName(date, tag)))) return done;
    const key = entryKey(date, tag);
    const sweptKeys = ns ? blankSubTree(keysNow(), key) : [];
    const sweep = sweptKeys.map((k) => layer.removeEntry(k));
    const back = deleteLanding(date, tag);
    const pictures = picturesOf(key, layer.entryMd(key));
    /* the landing FIRST, the remove after: a save still owed to the deleted
       entry, landing after its remove, resurrected it
       (pin: lifecycle.test › opens the landing and drops the places BEFORE removing) */
    ui.replaceHash(entryHash(back.date, back.tag));
    session.open(back.date, back.tag, "arrive");
    for (const k of [key, ...sweptKeys]) session.movePlace(k, null);
    /* the text typed on the entry landed on is saved BEFORE the retarget
       reads the host, and the repaint comes only where the store moved (a
       lost link) */
    return Promise.all([layer.removeEntry(key), ...sweep]).then(([gone]) => gone ? dropUnnamed(pictures) : undefined).then(() => session.flushSave()).then(() => retargetHost(date, tag, null)).then(() => session.refresh()).then(() => {
      ui.redraw();
      ui.focus();
    });
  }

  /* create a namespace ROOT: prompt → the naming rule → register → go. An
     existing name just opens; a new one is stored with an empty body at
     once so the list holds it while it is empty, and the address opens. The
     echo is the LABEL, where the key is what was typed (pin: lifecycle.test ›
     goes to a name already there). A name typed as the dropdown SHOWS a
     root — a bookshelf author keyed "Last, First" and shown by its heading —
     is that root, matched as typed and as the naming rule rewrote it:
     matched by key alone, it registered an empty twin (pin: lifecycle.test ›
     goes to the author whose label was typed) (pin: lifecycle.test › matches
     the label as typed) */
  function newRoot(ns: string): Promise<void> {
    const desc = KEYED_NS[ns];
    const raw = dialogs.prompt("Name for the new " + desc.noun + ":");
    const typed = typedName(raw);
    if (!typed) return done;
    if ("refuse" in typed) { ui.say(typed.refuse); return done; }
    const name = typed.name;
    const asTyped = [(raw || "").trim().toLowerCase(), name.toLowerCase()];
    const go = (root: string): void => session.goto(entryHash(ns, root), "already on " + trimLabel(rootLabel(ns, root, journal), ECHO_CAP));
    if (cold()) return done;   /* a name checked against one primed row could store an empty body over a real one */
    if (registered(keysNow(), ns, name)) { go(name); return done; }
    const labelled = childrenOf(keysNow(), ns).find((root) => asTyped.includes(rootLabel(ns, root, journal).toLowerCase()));
    if (labelled !== undefined) { go(labelled); return done; }
    if (!desc.titledRoots) return layer.setEntry(entryKey(ns, name), "").then((landed) => { if (landed) go(name); });
    /* a root whose label is its heading is asked a second name, the one it
       is filed under (pin: lifecycle.test › asks the name, then where it sorts) */
    const shown = shownForm(raw!);
    const filed = typedName(dialogs.prompt("Sorted under:", filingForm(shown)));
    if (!filed) return done;
    if ("refuse" in filed) { ui.say(filed.refuse); return done; }
    if (onShelves(ns, filed.name)) { ui.say(SHELVES_TAKEN, 2500); return done; }
    if (registered(keysNow(), ns, filed.name)) { go(filed.name); return done; }
    return layer.setEntry(entryKey(ns, filed.name), "# " + shown + "\n").then((landed) => { if (landed) go(filed.name); });
  }

  /* the parent's index link reads as a sub-page's TITLE: when a landed
     save moves a sub-page's first heading, the parent's minted labels
     follow — the bare name or the previous heading; a hand-written label
     stays. The previous heading is remembered per key from the last look
     (pin: lifecycle.test › remembers the heading at first sight) */
  const headingSeen: Record<string, string> = Object.create(null);
  function shown(ekey: string, stored: string): void {
    const cut = ekey.indexOf("/");
    if (cut === -1) return;
    const date = ekey.slice(0, cut), tag = ekey.slice(cut + 1);
    if (!nsOf(date)) return;
    const pp = pageParts(tag);
    const heading = journal.heading(ekey);
    const before = ekey in headingSeen ? headingSeen[ekey] : heading;
    headingSeen[ekey] = heading;
    if (!pp.sub || before === heading || !stored) return;
    const parent = entryKey(date, pp.parent);
    const out = relabelLinks(layer.entryMd(parent), entryHash(date, tag), pp.leaf, before, heading);
    if (out !== null) layer.setEntry(parent, out);
  }

  /* the shelves page opened, made with its heading when there is none: a
     bookshelf address makes nothing on a visit (pin: lifecycle.test › the
     shelves opened) */
  function shelves(): Promise<void> {
    if (cold()) return done;
    const key = entryKey(NS_BOOK.key, SHELVES), href = entryHash(NS_BOOK.key, SHELVES);
    if (key in layer.cache) { session.goto(href, "already here"); return done; }
    return layer.setEntry(key, "# " + SHELVES + "\n").then((landed) => { if (landed) session.goto(href, "already here"); });
  }

  return { create, extract, rename, remove, newRoot, shelves, shown };
}
