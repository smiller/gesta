import { entryKey, entryHash, tagParts, hashTarget, asAddress } from "./keys.ts";
import { hashParts } from "./nav.ts";
import { rewriteLinks, followedLabel } from "./links.ts";
import { firstHeading } from "./headings.ts";
import { childrenOf, registered } from "./lists.ts";
import { entryFile, type EntryFile } from "./names.ts";
import { imageRefs, imageLinks, shownPictures, splitKey } from "./exportEntries.ts";
import { under } from "./refile.ts";
import { destination, serializeMarkdown } from "../model/serialize.ts";
import { parseMarkdown } from "../model/parse.ts";
import { schema } from "../model/schema.ts";
import { Transform } from "prosemirror-transform";

/* `moves` every key that changes its name, the root included; `twins` a
   sub-entry the place already holds by its title, which is deleted and whose
   links go to the one there; `into` that the place is an entry already,
   whose text the root's joins */
export interface MovePlan { moves: Record<string, string>; twins: Record<string, string>; into: boolean }

/* a twin is told by its title, its key being free to differ (the same essay
   filed under two dates); a twin with sub-entries of its own refuses, having
   nowhere to put them (pin: move.test › a twin with sub-entries of its own refuses) */
interface MoveCtx { cache: Record<string, string>; keys: string[]; from: string; to: string }
type Refusal = { refuse: string };
function placeRefusal(c: MoveCtx): string | null {
  if (under(c.to, c.from)) return "an entry can’t move under itself";
  const [ns, tag] = splitKey(c.to);
  const parent = tagParts(tag || "").parent;
  if (parent !== null && !registered(c.keys, ns, parent)) return "nothing at " + entryKey(ns, parent) + " to move it under";
  return null;
}
function titlesThere(c: MoveCtx): Record<string, string> {
  const there: Record<string, string> = Object.create(null);
  for (const leaf of childrenOf(c.keys, c.to)) {
    const h = firstHeading(c.cache[entryKey(c.to, leaf)] || "");
    if (h && !(h in there)) there[h] = entryKey(c.to, leaf);
  }
  return there;
}
const sameTwin = (cache: Record<string, string>, k: string, same: string, h: string): boolean =>
  !(cache[k] || "").trim() || (!!h && firstHeading(cache[same]) === h);
function twinOf(c: MoveCtx, leaf: string, there: Record<string, string>): string | undefined {
  const k = entryKey(c.from, leaf), h = firstHeading(c.cache[k] || ""), same = entryKey(c.to, leaf);
  if (same in c.cache && sameTwin(c.cache, k, same, h)) return same;
  return h ? there[h] : undefined;
}
const hasPages = (keys: string[], k: string): boolean => keys.some((x) => x !== k && under(x, k));
function findTwins(c: MoveCtx): { twins: Record<string, string> } | Refusal {
  const twins: Record<string, string> = Object.create(null);
  if (!(c.to in c.cache)) return { twins };
  const there = titlesThere(c);
  for (const leaf of childrenOf(c.keys, c.from)) {
    const twin = twinOf(c, leaf, there), k = entryKey(c.from, leaf);
    if (!twin) continue;
    if (hasPages(c.keys, k)) return { refuse: "“" + (firstHeading(c.cache[k] || "") || leaf) + "” is there already and has sub-entries of its own" };
    twins[k] = twin;
  }
  return { twins };
}
function movesOf(c: MoveCtx, twins: Record<string, string>): { moves: Record<string, string> } | Refusal {
  const moves: Record<string, string> = Object.create(null);
  for (const k of c.keys.filter((x) => under(x, c.from) && !(x in twins))) {
    const dest = c.to + k.slice(c.from.length);
    if (k !== c.from && dest in c.cache) return { refuse: dest + " is there already" };
    moves[k] = dest;
  }
  return { moves };
}
export function movePlan(cache: Record<string, string>, from: string, to: string): MovePlan | Refusal {
  const c: MoveCtx = { cache, keys: Object.keys(cache), from, to };
  const refusal = placeRefusal(c);
  if (refusal) return { refuse: refusal };
  const found = findTwins(c);
  if ("refuse" in found) return found;
  const planned = movesOf(c, found.twins);
  if ("refuse" in planned) return planned;
  return { moves: planned.moves, twins: found.twins, into: to in cache };
}

/* matched by the key the address names, its payload kept (pin: move.test ›
   an address into the entry moves with its payload) */
function destOf(key: string, from: string, plan: MovePlan): string | null {
  if (key in plan.twins) return plan.twins[key];
  if (!under(key, from)) return null;
  return plan.moves[key] ?? plan.moves[from] + key.slice(from.length);
}
export function moveHref(href: string, from: string, plan: MovePlan): string | null {
  if (!href.startsWith("#" + splitKey(from)[0] + "/")) return null;
  const p = hashParts(asAddress(href));
  const dest = destOf(entryKey(p.date, p.tag), from, plan);
  if (!dest) return null;
  const [date, tag] = splitKey(dest);
  return entryHash(date, tag, p.hl || undefined);
}
/* labels are left, what a reader wrote staying, but for `relabel`: a link to
   the page itself whose label is its old name takes the new (pin: move.test ›
   a link labelled with the page's old name) */
export function moveLinks(md: string, from: string, plan: MovePlan, relabel?: { old: string; new: string }): string | null {
  return rewriteLinks(md, (run) => {
    const href = moveHref(run.href, from, plan);
    if (href === null) return null;
    if (!relabel) return { href };
    const [date, tag] = splitKey(plan.moves[from]);
    return hashTarget(asAddress(href)) === entryHash(date, tag) ? { href, text: followedLabel(run.text, relabel.old, relabel.new) } : { href };
  });
}
export function joined(there: string, moved: string): string {
  if (!moved.trim()) return there;
  if (!there.trim()) return moved;
  return there.replace(/\s+$/, "") + "\n\n" + moved.replace(/^\s+/, "");
}

const IMG = /^(.*)-img-(\d+)(\.\w+)$/;
/* every picture the text names, old name to new: one named for its entry,
   by the whole path or by the entry's own name, takes the new entry's in the
   same form; into a text that names pictures already, the moved are numbered
   past the highest of them (pin:
   move.test › into an entry whose text names pictures already) */
function highestTaken(taken: string[], stems: string[]): number {
  let n = 0;
  for (const t of taken) {
    const m = IMG.exec(t);
    if (m && stems.includes(m[1])) n = Math.max(n, +m[2]);
  }
  return n;
}
export function pictureNames(from: string, to: string, md: string, taken: string[]): Record<string, string> {
  const [a, b] = [splitKey(from), splitKey(to)].map(([d, t]) => entryFile(d, t));
  return pictureNamesBetween(a, b, md, taken);
}
export function pictureNamesBetween(a: EntryFile, b: EntryFile, md: string, taken: string[]): Record<string, string> {
  const stems: [string, string][] = [[a.flatBase, b.flatBase], [a.base, b.base]];
  let n = highestTaken(taken, [b.flatBase, b.base]);
  const out: Record<string, string> = Object.create(null);
  const number = (m: RegExpExecArray): string => (taken.length ? String(++n) : m[2]);
  for (const src of imageRefs(md)) out[src] = renamedPicture(src, stems, number);
  return out;
}
function renamedPicture(src: string, stems: [string, string][], number: (m: RegExpExecArray) => string): string {
  const m = IMG.exec(src);
  const pair = m && stems.find(([old]) => old === m[1]);
  return pair ? pair[1] + "-img-" + number(m!) + m![3] : src;
}
/* each picture renamed where its address is written, the rest of the text as
   it was, a title included, picture syntax shown in code left alone; which
   pictures there are is read by parsing, and where an address cannot be found
   as written the document is written anew, so no picture is left under a name
   gone (pin: move.test › each picture renamed where its address is written)
   (pin: move.test › picture syntax shown in code) */
export function renamePictures(md: string, names: Record<string, string>): string {
  if (!Object.keys(names).some((k) => names[k] !== k)) return md;
  const before = shownPictures(md);
  if (!before) return renameBySyntax(md, names);
  const code = codeSpans(md);
  const inCode = (at: number): boolean => code.some(([from, to]) => at >= from && at < to);
  const text = md.replace(imageLinks(), (all, s: string, at: number) => (inCode(at) ? all : renamedLink(all, s, names)));
  if (allRenamed(before, shownPictures(text), names)) return text;
  return renameInDocument(md, names);
}
const allRenamed = (before: string[], after: string[] | null, names: Record<string, string>): boolean =>
  !!after && after.length === before.length && after.every((s, i) => s === (names[before[i]] ?? before[i]));
function renameInDocument(md: string, names: Record<string, string>): string {
  const doc = parseMarkdown(md), tr = new Transform(doc);
  doc.descendants((n, pos) => {
    const src = String(n.attrs.src);
    if (n.type === schema.nodes.image && names[src]) tr.setNodeMarkup(pos, null, { ...n.attrs, src: names[src] });
    return true;
  });
  return serializeMarkdown(tr.doc);
}
function renamedLink(all: string, s: string, names: Record<string, string>): string {
  const bare = s.charAt(0) === "<" ? s.slice(1, -1) : s;
  if (!(bare in names) || names[bare] === bare) return all;
  const cut = all.lastIndexOf("](" + s) + 2;
  return all.slice(0, cut) + destination(names[bare]) + all.slice(cut + s.length);
}
/* the stretches of a text that are code — a fence's lines, a backtick run */
const FENCE_SPAN = /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[ \t]*$|(?![\s\S]))/gm;
const TICK_SPAN = /(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g;
const spanOf = (m: RegExpMatchArray): [number, number] => [m.index!, m.index! + m[0].length];
function codeSpans(md: string): [number, number][] {
  const out = [...md.matchAll(FENCE_SPAN)].map(spanOf);
  const inFence = (at: number): boolean => out.some(([f, t]) => at >= f && at < t);
  for (const m of md.matchAll(TICK_SPAN)) if (!inFence(m.index!)) out.push(spanOf(m));
  return out;
}
function renameBySyntax(md: string, names: Record<string, string>): string {
  return md.replace(imageLinks(), (all, s: string) => renamedLink(all, s, names));
}
