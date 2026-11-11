import { encPart } from "./keys.ts";
import { hashParts } from "./nav.ts";
import { linkRuns } from "./links.ts";
import { parseMarkdown } from "../model/parse.ts";
import { firstHeading } from "./headings.ts";
import { escapeRe } from "./reference.ts";

export const under = (tag: string, root: string): boolean => tag === root || tag.startsWith(root + "/");

const namesUnder = (href: string, ns: string, root: string): boolean => {
  if (!href.startsWith("#" + ns + "/")) return false;
  const p = hashParts(href.slice(1));
  return p.date === ns && !!p.tag && under(p.tag, root);
};
/* the links read by the key they name; then a
   text test for what is no link — a full URL, a text that does not parse
   (pin: refile.test › reads a link by the key it names, whatever its escapes) */
export function pointsInto(ns: string, root: string): (md: string) => boolean {
  const spellings = Array.from(new Set([root, encPart(root), encodeURIComponent(root)])).map(escapeRe);
  const re = new RegExp("#" + escapeRe(ns) + "/(?:" + spellings.join("|") + ")(?=[/?)>\"'\\s<]|%2F|$)", "im");
  return (md) => {
    if (re.test(md)) return true;
    try { return linkRuns(parseMarkdown(md)).some((r) => namesUnder(r.href, ns, root)); } catch { return false; }
  };
}
/* null when the page already has its title */
export function withHeading(md: string, name: string): string | null {
  if (firstHeading(md)) return null;
  return "# " + name + "\n" + (md.trim() ? "\n" + md : "");
}
/* wide on purpose: every entry naming the namespace at all, a narrower
   text test having skipped links that did need rewriting (pin:
   lifecycle.test › a link spelled with an encoded slash) */
export function linkingKeys(cache: Record<string, string>, ns: string, moves: Record<string, string>): string[] {
  const copies = new Set(Object.values(moves));
  return Object.keys(cache).filter((k) => !(k in moves) && !copies.has(k) && cache[k].includes("#" + ns + "/"));
}
