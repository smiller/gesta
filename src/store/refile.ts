import { entryKey, entryHash, encPart } from "./keys.ts";
import { hashParts } from "./nav.ts";
import { rewriteLinks } from "./links.ts";
import { firstHeading } from "./headings.ts";

const under = (tag: string, root: string): boolean => tag === root || tag.startsWith(root + "/");

export function refileKeys(keys: string[], ns: string, oldRoot: string, newRoot: string): Record<string, string> {
  const from = entryKey(ns, oldRoot), to = entryKey(ns, newRoot);
  const moves: Record<string, string> = Object.create(null);
  for (const k of keys) if (k === from || k.startsWith(from + "/")) moves[k] = to + k.slice(from.length);
  return moves;
}
/* matched by the key the address names, not its spelling, so a
   hand-typed href moves too (pin: refile.test › a hand-spelled address) */
export function refileHref(href: string, ns: string, oldRoot: string, newRoot: string): string | null {
  if (!href.startsWith("#" + ns + "/")) return null;
  const p = hashParts(href.slice(1));
  if (p.date !== ns || !p.tag || !under(p.tag, oldRoot)) return null;
  return entryHash(ns, newRoot + p.tag.slice(oldRoot.length), p.hl || undefined);
}
/* labels are left: the name a reader sees has not changed */
export function refileLinks(md: string, ns: string, oldRoot: string, newRoot: string): string | null {
  return rewriteLinks(md, (run) => {
    const href = refileHref(run.href, ns, oldRoot, newRoot);
    return href === null ? null : { href };
  });
}
const reEscape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/* the text test, read where the rewrite could not: a text that does not
   parse, or a link written as a full URL, still answers */
export function pointsInto(md: string, ns: string, root: string): boolean {
  const spellings = Array.from(new Set([root, encPart(root), encodeURIComponent(root)])).map(reEscape);
  return new RegExp("#" + reEscape(ns) + "/(?:" + spellings.join("|") + ")(?=[/?)\"'\\s<]|$)", "m").test(md);
}
/* null when the page already has its title */
export function withHeading(md: string, name: string): string | null {
  if (firstHeading(md)) return null;
  return "# " + name + "\n" + (md.trim() ? "\n" + md : "");
}
export function linkingKeys(cache: Record<string, string>, ns: string, moves: Record<string, string>): string[] {
  const copies = new Set(Object.values(moves));
  return Object.keys(cache).filter((k) => !(k in moves) && !copies.has(k) && cache[k].includes(ns + "/"));
}
