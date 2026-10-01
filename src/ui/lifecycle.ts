import type { EditorView } from "prosemirror-view";
import type { EntryLayer } from "../store/entries.ts";
import type { Session } from "../session.ts";
import type { Journal } from "../store/reference.ts";
import { mdLabel } from "../store/reference.ts";
import { typedName } from "./naming.ts";
import { subEntrySpec, takenText, subTreeHasContent, blankSubTree, renamePrompt, deleteConfirm, deleteLanding, hostKey } from "./subEntries.ts";
import { rootLabel, trimLabel, ECHO_CAP } from "./mastheadModel.ts";
import { retargetLinks, relabelLinks } from "../store/links.ts";
import { linkRefusal, insertLinkAfter } from "../editor/insertLink.ts";
import { cutMd, replaceWithLink } from "../editor/format.ts";
import { firstHeading } from "../store/headings.ts";
import { nsOf, pageParts, entryKey, entryHash, KEYED_NS } from "../store/keys.ts";
import { registered, childrenOf } from "../store/lists.ts";

export type EditorPort = Pick<EditorView, "state" | "dispatch">;
export type SessionPort = Pick<Session, "current" | "flushSave" | "suspendSaves" | "surfaceMd" | "open" | "movePlace" | "refresh" | "goto" | "saveNow">;
export interface Dialogs {
  prompt(text: string, value?: string): string | null;
  confirm(text: string): boolean;
  alert(text: string): void;
}
export interface UiPort {
  say(text: string, ms?: number): void;
  redraw(): void;
  replaceHash(hash: string): void;
  hideBar(): void;
  focus(): void;
}
export interface LifecycleDeps {
  layer: EntryLayer;
  journal: Journal;
  view(): EditorPort | null;
  session: SessionPort;
  dialogs: Dialogs;
  ui: UiPort;
}
/* each settles once its writes have landed */
export interface Lifecycle {
  create(): Promise<void>;
  extract(): Promise<void>;
  rename(): Promise<void>;
  remove(): Promise<void>;
  newRoot(ns: string): Promise<void>;
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

  function create(): Promise<void> {
    if (cold()) return done;
    const c = session.current;
    const ns = nsOf(c.date);
    /* the one leaf: a day's tagged entry hosts nothing, and ⌃⌘N reaches it all the same */
    if (!ns && c.tag) { ui.say("a tagged entry holds no entries of its own", 2500); return done; }
    const typed = typedName(dialogs.prompt(newName(ns)));
    if (!typed) return done;
    if ("refuse" in typed) { ui.say(typed.refuse); return done; }
    const spec = subEntrySpec(c.date, c.tag, typed.name);
    if (!spec) return done;
    if ("refuse" in spec) { ui.say(spec.refuse); return done; }
    const key = entryKey(c.date, spec.full);
    if (registered(keysNow(), c.date, spec.full)) { session.goto(spec.href, "already here"); return done; }
    const view = deps.view();
    if (!view) { ui.say("place your cursor in the entry", 2000); return done; }
    const why = linkRefusal(view.state);
    if (why) { ui.say(why, 2000); return done; }
    /* the entry FIRST, the link once it has landed: linked first, a write
       that failed left the host saved with a link to nothing
       (pin: lifecycle.test › says a registration that did not land) */
    return layer.setEntry(key, "").then((landed) => {
      if (!landed) { ui.say("couldn't create the entry — see the corner", 3000); return; }
      if (view !== deps.view()) { ui.say("the entry was made — the link was not placed", 3000); return; }
      insertLinkAfter(view, spec.href, mdLabel(spec.tag, "entry"));
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
    if (ns && subTreeHasContent(keysNow(), layer.cache, entryKey(date, old))) { ui.say("rename after the " + ns.subNoun + "s are deleted", 2500); return done; }
    const oldLeaf = pp ? pp.leaf : old;
    const typed = typedName(dialogs.prompt(renamePrompt(date, old, shownName(date, old)), oldLeaf));
    if (!typed) return done;
    if ("refuse" in typed) { ui.say(typed.refuse); return done; }
    const leaf = typed.name;
    if (leaf === oldLeaf) return done;
    const listKey = pp && pp.sub ? entryKey(date, pp.parent) : date;
    if (childrenOf(keysNow(), listKey).indexOf(leaf) !== -1) { dialogs.alert(takenText(listKey, leaf)); return done; }
    const full = pp && pp.sub ? pp.parent + "/" + leaf : leaf;
    renaming = true;
    return session.flushSave().then(() => {
      if (session.current.date !== date || session.current.tag !== old) return;
      session.suspendSaves();   /* nothing lands under the old key from here on */
      const oldKey = entryKey(date, old), md = layer.entryMd(oldKey);
      const sweptKeys = ns ? blankSubTree(keysNow(), oldKey) : [];
      const sweep = sweptKeys.map((k) => layer.removeEntry(k));
      /* an EMPTY body moves too: the row is the registration */
      const moved = layer.setEntry(entryKey(date, full), md);
      return Promise.all([moved, ...sweep]).then(() => layer.removeEntry(oldKey)).then(() => retargetHost(date, old, full)).then(() => {
        /* typed into the surface while the writes ran: carried to the new key */
        const live = session.surfaceMd();
        return live !== md ? layer.setEntry(entryKey(date, full), live) : true;
      }).then(() => {
        ui.replaceHash(entryHash(date, full));
        session.open(date, full);
        session.movePlace(oldKey, entryKey(date, full));
        for (const k of sweptKeys) session.movePlace(k, null);
        ui.redraw();
      });
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
    /* the landing FIRST, the remove after: a save still owed to the deleted
       entry, landing after its remove, resurrected it
       (pin: lifecycle.test › opens the landing and drops the places BEFORE removing) */
    ui.replaceHash(entryHash(back.date, back.tag));
    session.open(back.date, back.tag, "arrive");
    for (const k of [key, ...sweptKeys]) session.movePlace(k, null);
    /* the text typed on the entry landed on is saved BEFORE the retarget
       reads the host, and the repaint comes only where the store moved (a
       lost link) */
    return Promise.all([layer.removeEntry(key), ...sweep]).then(() => session.flushSave()).then(() => retargetHost(date, tag, null)).then(() => session.refresh()).then(() => {
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
    const noun = KEYED_NS[ns].noun;
    const raw = dialogs.prompt("Name for the new " + noun + ":");
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
    return layer.setEntry(entryKey(ns, name), "").then((landed) => { if (landed) go(name); });
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

  return { create, extract, rename, remove, newRoot, shown };
}
