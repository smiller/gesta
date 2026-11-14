import type { EditorView } from "prosemirror-view";
import type { EntryLayer, Rewrite } from "../store/entries.ts";
import type { Session } from "../session.ts";
import type { HandOver } from "../store/entrySave.ts";
import type { Journal } from "../store/reference.ts";
import { mdLabel } from "../store/reference.ts";
import { typedName, typedAddress, filingForm, shownForm } from "./naming.ts";
import { subEntrySpec, takenText, subTreeHasContent, blankSubTree, renamePrompt, movePrompt, moveConfirm, deleteConfirm, deleteLanding, hostKey, refiledText, movedText } from "./subEntries.ts";
import { pointsInto, withHeading, linkingKeys } from "../store/refile.ts";
import { movePlan, moveLinks, joined, pictureNames, renamePictures, type MovePlan } from "../store/move.ts";
import { imageRefs, splitKey } from "../store/exportEntries.ts";
import { pictureKey } from "../store/names.ts";
import { unnamed, picturesOf } from "../store/pictures.ts";
import { rootLabel, trimLabel, ECHO_CAP } from "./mastheadModel.ts";
import { retargetLinks, relabelLinks } from "../store/links.ts";
import { linkRefusal, headingRefusal, cutsHeading, HEADING_REFUSAL, insertLinkAfter, linkMarkdown } from "../editor/insertLink.ts";
import { cutMd, replaceWithLink } from "../editor/format.ts";
import { firstHeading } from "../store/headings.ts";
import { nsOf, pageParts, entryKey, entryHash, KEYED_NS, NS_BOOK } from "../store/keys.ts";
import { SHELVES } from "../store/shelves.ts";
import { registered, childrenOf } from "../store/lists.ts";

export type EditorPort = Pick<EditorView, "state" | "dispatch">;
export interface SourcePort { insertAfter(text: string): void; inHeading(): boolean }
export type SessionPort = Pick<Session, "current" | "save" | "open" | "movePlace" | "movePlaces" | "refresh" | "goto">;
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
  moveKept(folds: Record<string, string>, bookmarks: Record<string, string>): void;
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

type Current = SessionPort["current"];
type Spec = Exclude<ReturnType<typeof subEntrySpec>, null | { refuse: string }>;
const failedOf = (keys: string[], results: boolean[]): string[] => keys.filter((_, i) => !results[i]);
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
    const out = retargetLinks(layer.entryMd(host), { href: entryHash(date, oldTag), label: oldLabel }, newTag ? { href: entryHash(date, newTag), label: newLabel! } : null);
    return out === null ? Promise.resolve() : layer.setEntry(host, out);
  };
  const newName = (ns: ReturnType<typeof nsOf>): string => ns ? "Name for the new " + ns.subNoun + ":" : "Tag for the new entry:";
  const refused = (why: string, ms?: number): Promise<void> => {
    ui.say(why, ms);
    return done;
  };
  function typedNameAt(raw: string | null): string | null {
    const typed = typedName(raw);
    if (!typed) return null;
    if ("refuse" in typed) { ui.say(typed.refuse); return null; }
    return typed.name;
  }
  function askSpec(c: Current): Spec | null {
    const name = typedNameAt(dialogs.prompt(newName(nsOf(c.date))));
    if (name === null) return null;
    const spec = subEntrySpec(c.date, c.tag, name);
    if (!spec) return null;
    if ("refuse" in spec) { ui.say(spec.refuse); return null; }
    return spec;
  }
  function createRefusal(c: Current): string | null {
    /* the one leaf: a day's tagged entry hosts nothing, and ⌃⌘N reaches it all the same */
    if (!nsOf(c.date) && c.tag) return "a tagged entry holds no entries of its own";
    return onShelves(c.date, c.tag) ? SHELVES_EMPTY : null;
  }
  const nowhere = (view: EditorPort | null, source: SourcePort | null): boolean => !view && !source;
  function placeRefusal(inEntry: boolean, view: EditorPort | null, source: SourcePort | null): string {
    if (!inEntry || nowhere(view, source)) return "place your cursor in the entry";
    if (view) return linkRefusal(view.state) || headingRefusal(view.state);
    return source!.inHeading() ? HEADING_REFUSAL : "";
  }
  interface Placing { c: Current; spec: Spec; view: EditorPort | null; source: SourcePort | null }
  const placeMoved = (p: Placing): boolean =>
    (p.view ? p.view !== deps.view() : p.source !== deps.source() || entryKey(session.current.date, session.current.tag) !== entryKey(p.c.date, p.c.tag));
  function linkPlaced(p: Placing, landed: boolean): Promise<void> | void {
    if (!landed) { ui.say("couldn't create the entry — see the corner", 3000); return; }
    if (placeMoved(p)) { ui.say("the entry was made — the link was not placed", 3000); return; }
    const label = mdLabel(p.spec.tag, "entry");
    if (p.view) insertLinkAfter(p.view, p.spec.href, label);
    else p.source!.insertAfter(linkMarkdown(p.spec.href, label));
    return session.save.now().then(() => { ui.redraw(); session.goto(p.spec.href); });
  }

  /* A NEW NAME'S LINK GOES AFTER THE CARET THE ACT BEGAN WITH: none in the
     entry refuses before anything is minted, and an existing name just
     opens (pin: lifecycle.test › a new name with the caret outside the
     entry refuses); in the markdown view it is typed there as markdown,
     anywhere (pin: lifecycle.test › in the markdown view the link is typed) */
  function create(): Promise<void> {
    if (cold()) return done;
    const inEntry = deps.caretInEntry(), c = session.current;
    const no = createRefusal(c);
    if (no) return refused(no, 2500);
    const spec = askSpec(c);
    if (!spec) return done;
    if (registered(keysNow(), c.date, spec.full)) { session.goto(spec.href, "already here"); return done; }
    const view = deps.view(), source = view ? null : deps.source();
    const why = placeRefusal(inEntry, view, source);
    if (why) return refused(why, 2000);
    /* the entry FIRST, the link once it has landed: linked first, a write
       that failed left the host saved with a link to nothing
       (pin: lifecycle.test › says a registration that did not land) */
    return layer.setEntry(entryKey(c.date, spec.full), "").then((landed) => linkPlaced({ c, spec, view, source }, landed));
  }

  function cutToEntry(view: EditorPort, c: Current, spec: Spec): Promise<void> {
    const { from, to } = view.state.selection;
    const md = cutMd(view.state.doc, from, to), cutText = view.state.doc.textBetween(from, to, " ", " ");
    const label = nsOf(c.date) ? mdLabel(firstHeading(md), spec.tag) : spec.tag;
    return layer.setEntry(entryKey(c.date, spec.full), md).then((landed) => {
      if (!landed) { ui.say("couldn't create the entry — see the corner", 3000); return; }
      /* the positions were taken before the write: a document that moved
         under them keeps its text, the new entry standing
         (pin: lifecycle.test › places no link when the text moved) */
      if (view !== deps.view() || view.state.doc.textBetween(from, to, " ", " ") !== cutText) { ui.say("the text moved while the entry was made — the link was not placed", 3000); return; }
      view.dispatch(replaceWithLink(view.state, from, to, spec.href, label));
      ui.hideBar();
      return session.save.now().then(() => { ui.redraw(); session.goto(spec.href); });
    });
  }
  /* the selection into a new sub-entry, the link left in its place: the
     new entry is born WITH its heading, so the link is labelled by it at
     birth where a later relabel would never see the change
     (pin: lifecycle.test › moves the selection into the new entry) */
  function extract(): Promise<void> {
    const view = deps.view();
    if (!view || view.state.selection.empty) return done;
    if (cold()) return done;
    const c = session.current;
    if (onShelves(c.date, c.tag)) return refused(SHELVES_EMPTY, 2500);
    if (cutsHeading(view.state)) return refused(HEADING_REFUSAL, 2000);
    const spec = askSpec(c);
    if (!spec) return done;
    if (childrenOf(keysNow(), spec.listKey).includes(spec.tag)) { dialogs.alert(takenText(spec.listKey, spec.tag)); return done; }
    return cutToEntry(view, c, spec);
  }

  /* a rename is in flight from the prompt until its writes land: a second
     click replayed against the renamed state would move nothing yet still
     retarget the address to a name that holds nothing. The new key lands
     BEFORE the old one clears, so a crash between leaves a transient
     duplicate, never a lost entry (pin: lifecycle.test › hands over, writes
     the new key) (pin: lifecycle.test › ignores a second rename). A
     page or book goes the one way, `relocate`, whether renamed, re-filed or
     moved; a day's tagged entry, which hosts nothing, is renamed here */
  let renaming = false;
  function rename(): Promise<void> {
    const c = session.current;
    if (!c.tag || renaming) return done;
    if (cold()) return done;
    const date = c.date, old = c.tag;
    if (onShelves(date, old)) return refused(SHELVES_KEEP, 2500);
    if (nsOf(date)?.titledRoots && !pageParts(old).sub) return refile(date, old);
    return renameAsked(date, old);
  }
  interface Renaming { date: string; old: string; pp: ReturnType<typeof pageParts> | null; deep: boolean; oldLeaf: string }
  function renamingOf(date: string, old: string): Renaming {
    const ns = nsOf(date), pp = ns ? pageParts(old) : null;
    return { date, old, pp, deep: !!ns && subTreeHasContent(keysNow(), layer.cache, entryKey(date, old)), oldLeaf: pp ? pp.leaf : old };
  }
  function renameTyped(r: Renaming, raw: string | null): Promise<void> {
    const addr = r.pp ? typedAddress(raw) : null;
    if (addr) return "refuse" in addr ? refused(addr.refuse) : relocate(r.date, r.old, entryKey(addr.date, addr.tag), "move");
    const leaf = typedNameAt(raw);
    if (leaf === null || leaf === r.oldLeaf) return done;
    return renameLeaf(r, leaf);
  }
  function renameAsked(date: string, old: string): Promise<void> {
    const r = renamingOf(date, old), filled = r.deep ? entryKey(date, old) : r.oldLeaf;
    const raw = dialogs.prompt((r.deep ? movePrompt : renamePrompt)(date, old, shownName(date, old)), filled);
    if ((raw || "").trim() === filled) return done;
    return renameTyped(r, raw);
  }
  function renameLeaf(r: Renaming, leaf: string): Promise<void> {
    const listKey = r.pp?.sub ? entryKey(r.date, r.pp.parent) : r.date;
    if (childrenOf(keysNow(), listKey).includes(leaf)) { dialogs.alert(takenText(listKey, leaf)); return done; }
    const full = r.pp?.sub ? r.pp.parent + "/" + leaf : leaf;
    if (r.pp) return relocate(r.date, r.old, entryKey(r.date, full), r.deep ? "move" : "rename");
    return renameTagged(r.date, r.old, full);
  }
  interface TagMove { date: string; old: string; full: string; hand: HandOver }
  const followedTag = (t: TagMove, text: string): string =>
    retargetLinks(text, { href: entryHash(t.date, t.old), label: t.old }, { href: entryHash(t.date, t.full), label: t.full }) ?? text;
  function tagRenameFailed(t: TagMove): Promise<void> {
    return t.hand.keep().then(() => { session.open(t.date, t.old); ui.pin("couldn't rename — nothing was moved"); });
  }
  function tagRenamed(t: TagMove): Promise<void> {
    const oldKey = entryKey(t.date, t.old), newKey = entryKey(t.date, t.full);
    return layer.removeEntry(oldKey).then(() => retargetHost(t.date, t.old, t.full))
      .then(() => t.hand.land(newKey, (typed) => followedTag(t, typed))).then(() => {
      /* the kept state before the open, the place after it (pin:
         lifecycle.test › hands over, writes the new key) */
      const kept = { [oldKey]: newKey };
      deps.moveKept(kept, kept);
      ui.replaceHash(entryHash(t.date, t.full));
      session.open(t.date, t.full);
      session.movePlace(oldKey, newKey);
      ui.redraw();
    });
  }
  function renameTagged(date: string, old: string, full: string): Promise<void> {
    renaming = true;
    return session.save.handOver(entryKey(date, old)).then((hand) => {
      if (!hand) return;
      const t: TagMove = { date, old, full, hand };
      return layer.setEntry(entryKey(date, full), followedTag(t, hand.md)).then((landed) => (landed ? tagRenamed(t) : tagRenameFailed(t)));
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

  /* AN AUTHOR RE-FILED, its books and their pictures with it, a name typed
     in the filing form */
  function refile(date: string, old: string): Promise<void> {
    const root = typedNameAt(dialogs.prompt(renamePrompt(date, old, shownName(date, old)), old));
    if (root === null || root === old) return done;
    if (onShelves(date, root)) return refused(SHELVES_TAKEN, 2500);
    if (childrenOf(keysNow(), date).includes(root)) { dialogs.alert(takenText(date, root)); return done; }
    return relocate(date, old, entryKey(date, root), "refile");
  }

  /* A PAGE OR BOOK TO ANOTHER KEY, its sub-pages, pictures and every link to
     them with it — renamed, re-filed or moved. Every copy lands before any
     old key is cleared, and a copy that fails takes the others back, the
     old standing whole, the text there put back as it was (pin:
     lifecycle.test › a failed move removes the copies made) (pin:
     lifecycle.test › a failed copy takes the others back). The other
     entries' links are rewritten after the copies land, and one that cannot
     be is NAMED in a pin rather than undone: the undo is more writes that
     can fail the same way (pin: lifecycle.test › a link refused once as
     stale is rewritten on the retry). Only a move asks first; into an entry
     already there, its text joins after the text there and a sub-page the
     place holds by its title is deleted, its links and bookmarks going to
     that one. An author re-filed keeps its name as its page's heading, and
     one whose books came without a page is given one (pin: lifecycle.test ›
     an author with no page of its own) */
  type Mode = "move" | "rename" | "refile";
  const COULDNT: Record<Mode, string> = { move: "couldn't move", rename: "couldn't rename", refile: "couldn't re-file" };
  interface Move { date: string; old: string; to: string; toDate: string; toTag: string; from: string; mode: Mode }
  interface Moved { from: string; to: string; named: Record<string, string>; md: string }
  interface Relocation extends Move {
    plan: MovePlan; pageless: boolean; relabel?: { old: string; new: string }; hand: HandOver; there: string;
    rootNames: Record<string, string>; moved: Moved[]; copied: string[]; twinPictures: string[]; couldnt: string;
  }
  type Carried = { lost: number; olds: string[] };
  interface Tally { left: string[]; updated: number; stayed: string[] }
  const shelvesPlace = (date: string, tag: string): boolean => date === NS_BOOK.key && pageParts(tag).name === SHELVES;
  function moveAsked(date: string, old: string, to: string, plan: MovePlan): boolean {
    const twinTitles = Object.keys(plan.twins).map((k) => firstHeading(layer.entryMd(k)) || pageParts(splitKey(k)[1]!).leaf);
    return dialogs.confirm(moveConfirm({ date, tag: old, shown: shownName(date, old) }, to, { moved: Object.keys(plan.moves).length - 1, into: plan.into, twins: twinTitles }));
  }
  function relocate(date: string, old: string, to: string, mode: Mode): Promise<void> {
    const from = entryKey(date, old);
    if (to === from) return done;
    const [toDate, toTag] = splitKey(to) as [string, string];
    if (shelvesPlace(toDate, toTag)) return refused(pageParts(toTag).sub ? SHELVES_EMPTY : SHELVES_TAKEN, 2500);
    const first = movePlan(layer.cache, from, to);
    if ("refuse" in first) return refused(first.refuse, 3000);
    if (mode === "move" && !moveAsked(date, old, to, first)) return done;
    return flushedMove({ date, old, to, toDate, toTag, from, mode });
  }
  function flushedMove(m: Move): Promise<void> {
    renaming = true;
    return session.save.handOver(m.from).then((hand) => (hand ? relocateNow(m, hand) : undefined)).finally(() => { renaming = false; });
  }
  function relabelOf(m: Move): { old: string; new: string } | undefined {
    const newLeaf = pageParts(m.toTag).leaf, oldLeaf = pageParts(m.old).leaf;
    return newLeaf !== oldLeaf ? { old: oldLeaf, new: newLeaf } : undefined;
  }
  const headedMd = (r: Relocation, md: string): string => (r.mode === "refile" ? withHeading(md, r.old) ?? md : md);
  const otherText = (r: Relocation, md: string): string => moveLinks(md, r.from, r.plan) ?? md;
  const picturesFor = (r: Relocation, k: string): Record<string, string> =>
    pictureNames(k, r.plan.moves[k], layer.entryMd(k), k === r.from && r.plan.into ? imageRefs(r.there) : []);
  function rootText(r: Relocation, md: string): string {
    const own = renamePictures(headedMd(r, moveLinks(md, r.from, r.plan, r.relabel) ?? md), r.rootNames);
    return r.plan.into ? joined(otherText(r, r.there), own) : own;
  }
  function movedOf(r: Relocation, k: string): Moved {
    if (k === r.from) return { from: k, to: r.plan.moves[k], named: r.rootNames, md: rootText(r, r.hand.md) };
    const named = picturesFor(r, k);
    return { from: k, to: r.plan.moves[k], named, md: renamePictures(otherText(r, layer.entryMd(k)), named) };
  }
  function relocation(m: Move, plan: MovePlan, hand: HandOver): Relocation {
    const pageless = !(m.from in plan.moves);
    if (pageless) plan.moves[m.from] = m.to;
    const r: Relocation = {
      ...m, plan, pageless, relabel: relabelOf(m), hand, there: plan.into ? layer.entryMd(m.to) : "",
      rootNames: {}, moved: [], copied: [], twinPictures: Object.keys(plan.twins).flatMap((k) => picturesOf(k, layer.entryMd(k))), couldnt: COULDNT[m.mode],
    };
    r.rootNames = picturesFor(r, m.from);
    r.moved = Object.keys(plan.moves).map((k) => movedOf(r, k));
    return r;
  }
  function relocateNow(m: Move, hand: HandOver): Promise<void> {
    const plan = movePlan(layer.cache, m.from, m.to);
    if ("refuse" in plan) { session.open(m.date, m.old); ui.pin(COULDNT[m.mode] + " — " + plan.refuse); return done; }
    const r = relocation(m, plan, hand);
    return carryPictures(r.moved, r.copied).then(
      (carried) => ("clash" in carried ? moveRefused(r, carried.clash) : writeMoved(r, carried)),
      () => moveRefused(r, "a picture could not be copied, nothing was moved"),
    );
  }
  /* typed while the copies ran: kept under the old name (pin:
     lifecycle.test › a failed move keeps what was typed) */
  function moveRefused(r: Relocation, why: string): Promise<void> {
    return r.hand.keep().then(() => dropUnnamed(r.copied)).then(() => { session.open(r.date, r.old); ui.pin(r.couldnt + " — " + why); });
  }
  const undoCopy = (r: Relocation, m: Moved): Promise<boolean> => (m.to === r.to && r.plan.into ? layer.setEntry(r.to, r.there) : layer.removeEntry(m.to));
  function takeBack(r: Relocation, landed: boolean[]): Promise<void> {
    const tos = r.moved.map((m) => m.to);
    return r.hand.keep()
      .then(() => Promise.all(r.moved.map((m) => undoCopy(r, m))))
      .then((undone) => dropUnnamed(r.copied, stillThere(tos, undone, (i) => r.moved[i].md)).then(() => undone))
      .then((undone) => {
        const left = failedOf(tos, undone).filter((_, i) => landed[i]);
        session.open(r.date, r.old);
        ui.pin(left.length ? r.couldnt + " — copies left: " + left.join(", ") : r.couldnt + " — nothing was moved");
      });
  }
  function writeMoved(r: Relocation, carried: Carried): Promise<void> {
    return Promise.all(r.moved.map((m) => layer.setEntry(m.to, m.md))).then((landed) => (landed.includes(false) ? takeBack(r, landed) : linksAfter(r, carried)));
  }
  function tallied(r: Relocation, linking: string[], results: Rewrite[]): Omit<Tally, "stayed"> {
    const points = pointsInto(r.date, r.old);
    const left = [
      ...r.moved.filter((m) => points(m.md)).map((m) => m.to),
      ...linking.filter((k, i) => results[i] === "failed" || points(layer.entryMd(k))),
    ];
    return { left, updated: linking.filter((k, i) => results[i] === "landed" && !left.includes(k)).length };
  }
  function linksAfter(r: Relocation, carried: Carried): Promise<void> {
    const linking = linkingKeys(layer.cache, r.date, r.old, r.plan.moves).filter((k) => !(k in r.plan.twins));
    const host = hostKey(r.date, r.old);
    return Promise.all(linking.map((k) => layer.rewriteEntry(k, (md) => moveLinks(md, r.from, r.plan, k === host ? r.relabel : undefined))))
      .then((results) => clearOlds(r, carried, tallied(r, linking, results)));
  }
  function clearOlds(r: Relocation, carried: Carried, t: Omit<Tally, "stayed">): Promise<void> {
    const olds = [...Object.keys(r.plan.moves).filter((k) => !(r.pageless && k === r.from)), ...Object.keys(r.plan.twins)];
    const was = olds.map((k) => (k === r.from ? r.hand.md : layer.entryMd(k)));
    return Promise.all(olds.map((k) => layer.removeEntry(k))).then((removed) => {
      const still = stillThere(olds, removed, (i) => was[i]);
      return r.hand.land(r.to, (typed) => rootText(r, typed)).then(() => dropUnnamed([...carried.olds, ...r.twinPictures], still)).then(() => failedOf(olds, removed));
    }).then((stayed) => arrived(r, carried, { ...t, stayed }));
  }
  function keptMoves(r: Relocation): Record<string, string> {
    const kept: Record<string, string> = Object.create(null);
    for (const k of Object.keys(r.plan.moves)) if (!(r.plan.into && k === r.from)) kept[k] = r.plan.moves[k];
    return kept;
  }
  function outcomeText(r: Relocation, carried: Carried, t: Tally): string {
    const o = { moved: r.moved.length - (r.pageless ? 1 : 0), updated: t.updated, left: t.left, stayed: t.stayed, lost: carried.lost };
    if (r.mode === "refile") return refiledText(r.toTag, o);
    return movedText(r.to, { ...o, twins: Object.keys(r.plan.twins).length }, r.mode === "rename" ? "renamed" : "moved");
  }
  /* the kept state before the open, the places after it */
  function arrived(r: Relocation, carried: Carried, t: Tally): void {
    const twins = Object.keys(r.plan.twins), kept = keptMoves(r);
    deps.moveKept(kept, { ...kept, ...r.plan.twins, ...(r.plan.into ? { [r.from]: r.to } : {}) });
    ui.replaceHash(entryHash(r.toDate, r.toTag));
    session.open(r.toDate, r.toTag);
    session.movePlaces(kept);
    for (const k of r.plan.into ? [...twins, r.from] : twins) session.movePlace(k, null);
    ui.redraw();
    const text = outcomeText(r, carried, t);
    if (t.left.length || t.stayed.length) ui.pin(text);
    else ui.say(text);
  }

  function removeAt(date: string, tag: string): Promise<void> {
    const key = entryKey(date, tag);
    const sweptKeys = nsOf(date) ? blankSubTree(keysNow(), key) : [];
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
    return Promise.all([layer.removeEntry(key), ...sweep]).then(([gone]) => gone ? dropUnnamed(pictures) : undefined).then(() => session.save.flush()).then(() => retargetHost(date, tag, null)).then(() => session.refresh()).then(() => {
      ui.redraw();
      ui.focus();
    });
  }
  function remove(): Promise<void> {
    const c = session.current;
    if (!c.tag || cold()) return done;
    const date = c.date, tag = c.tag, ns = nsOf(date);
    if (ns && subTreeHasContent(keysNow(), layer.cache, entryKey(date, tag))) return refused("delete the " + ns.subNoun + "s first", 2500);
    if (!dialogs.confirm(deleteConfirm(date, tag, shownName(date, tag)))) return done;
    return removeAt(date, tag);
  }
  const goRoot = (ns: string, root: string): void => session.goto(entryHash(ns, root), "already on " + trimLabel(rootLabel(ns, root, journal), ECHO_CAP));
  function knownRoot(ns: string, name: string, raw: string | null): string | null {
    if (registered(keysNow(), ns, name)) return name;
    const asTyped = [(raw || "").trim().toLowerCase(), name.toLowerCase()];
    return childrenOf(keysNow(), ns).find((root) => asTyped.includes(rootLabel(ns, root, journal).toLowerCase())) ?? null;
  }
  /* a root whose label is its heading is asked a second name, the one it
     is filed under (pin: lifecycle.test › asks the name, then where it sorts) */
  function filedRoot(ns: string, raw: string): Promise<void> {
    const shown = shownForm(raw);
    const filed = typedNameAt(dialogs.prompt("Sorted under:", filingForm(shown)));
    if (filed === null) return done;
    if (onShelves(ns, filed)) return refused(SHELVES_TAKEN, 2500);
    if (registered(keysNow(), ns, filed)) { goRoot(ns, filed); return done; }
    return layer.setEntry(entryKey(ns, filed), "# " + shown + "\n").then((landed) => { if (landed) goRoot(ns, filed); });
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
    const name = typedNameAt(raw);
    if (name === null) return done;
    if (cold()) return done;   /* a name checked against one primed row could store an empty body over a real one */
    const known = knownRoot(ns, name, raw);
    if (known !== null) { goRoot(ns, known); return done; }
    if (!desc.titledRoots) return layer.setEntry(entryKey(ns, name), "").then((landed) => { if (landed) goRoot(ns, name); });
    return filedRoot(ns, raw!);
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
    if (!pp.sub || !stored) return;
    if (before === heading) return;
    const parent = entryKey(date, pp.parent);
    const out = relabelLinks(layer.entryMd(parent), entryHash(date, tag), pp.leaf, { was: before, now: heading });
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
