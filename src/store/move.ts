import { entryKey, entryHash, pageParts } from "./keys.ts";
import { hashParts } from "./nav.ts";
import { rewriteLinks } from "./links.ts";
import { firstHeading } from "./headings.ts";
import { childrenOf, registered } from "./lists.ts";
import { entryFile } from "./names.ts";
import { imageRefs, imageLinks, splitKey } from "./exportEntries.ts";
import { under } from "./refile.ts";
import { destination } from "../model/serialize.ts";

/* `moves` every key that changes its name, the root included; `twins` a
   sub-page the place already holds by its title, which is deleted and whose
   links go to the one there; `into` that the place is an entry already,
   whose text the root's joins */
export interface MovePlan { moves: Record<string, string>; twins: Record<string, string>; into: boolean }

/* a twin is told by its title, its key being free to differ (the same essay
   filed under two dates); a twin with pages of its own refuses, having
   nowhere to put them (pin: move.test › a twin with pages of its own refuses) */
export function movePlan(cache: Record<string, string>, from: string, to: string): MovePlan | { refuse: string } {
  if (under(to, from)) return { refuse: "a page can’t move under itself" };
  const keys = Object.keys(cache);
  const [ns, tag] = splitKey(to);
  const parent = pageParts(tag || "").parent;
  if (parent !== null && !registered(keys, ns, parent))
    return { refuse: "nothing at " + entryKey(ns, parent) + " to move it under" };
  const into = to in cache;
  const twins: Record<string, string> = Object.create(null);
  if (into) {
    const there: Record<string, string> = Object.create(null);
    for (const leaf of childrenOf(keys, to)) {
      const h = firstHeading(cache[entryKey(to, leaf)] || "");
      if (h && !(h in there)) there[h] = entryKey(to, leaf);
    }
    for (const leaf of childrenOf(keys, from)) {
      const k = entryKey(from, leaf), h = firstHeading(cache[k] || "");
      const same = entryKey(to, leaf);
      const twin = same in cache && (!(cache[k] || "").trim() || (h && firstHeading(cache[same]) === h)) ? same : h ? there[h] : undefined;
      if (!twin) continue;
      if (keys.some((x) => x !== k && under(x, k))) return { refuse: "“" + h + "” is there already and has pages of its own" };
      twins[k] = twin;
    }
  }
  const moves: Record<string, string> = Object.create(null);
  for (const k of keys) {
    if (!under(k, from) || k in twins) continue;
    const dest = to + k.slice(from.length);
    if (k !== from && dest in cache) return { refuse: dest + " is there already" };
    moves[k] = dest;
  }
  return { moves, twins, into };
}

/* matched by the key the address names, its payload kept (pin: move.test ›
   an address into the page moves with its payload) */
export function moveHref(href: string, from: string, plan: MovePlan): string | null {
  if (!href.startsWith("#" + splitKey(from)[0] + "/")) return null;
  const p = hashParts(href.slice(1));
  const key = entryKey(p.date, p.tag);
  const dest = plan.twins[key] ?? (under(key, from) ? plan.moves[key] ?? plan.moves[from] + key.slice(from.length) : null);
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
    if (!relabel || run.text !== relabel.old) return { href };
    const p = hashParts(run.href.slice(1));
    return entryKey(p.date, p.tag) === from ? { href, text: relabel.new } : { href };
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
export function pictureNames(from: string, to: string, md: string, taken: string[]): Record<string, string> {
  const [a, b] = [splitKey(from), splitKey(to)].map(([d, t]) => entryFile(d, t));
  const stems: [string, string][] = [[a.flatBase, b.flatBase], [a.base, b.base]];
  let n = 0;
  for (const t of taken) { const m = IMG.exec(t); if (m && (m[1] === b.flatBase || m[1] === b.base)) n = Math.max(n, +m[2]); }
  const out: Record<string, string> = Object.create(null);
  for (const src of imageRefs(md)) {
    const m = IMG.exec(src);
    const pair = m && stems.find(([old]) => old === m[1]);
    out[src] = !pair ? src : pair[1] + "-img-" + (taken.length ? ++n : m![2]) + m![3];
  }
  return out;
}
export function renamePictures(md: string, names: Record<string, string>): string {
  return md.replace(imageLinks(), (all, s: string) => {
    const bare = s.charAt(0) === "<" ? s.slice(1, -1) : s;
    return bare in names && names[bare] !== bare ? all.slice(0, all.length - s.length - 1) + destination(names[bare]) + ")" : all;
  });
}
