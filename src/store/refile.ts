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
/* every address in the namespace the text holds, read as an address without
   parsing the text: a link, a link's definition, a full URL, bracketed or not.
   An entry with none under `root` cannot link there, and is not parsed (pin:
   refile.test › mayName) */
export function mayName(ns: string, root: string): (md: string) => boolean {
  const re = new RegExp("<[^<>\\n]*#" + escapeRe(ns) + "/([^<>\\n]*)>|#" + escapeRe(ns) + "/([^\\s\"<>\\]]*)", "g");
  /* a bare address runs to the space after it, so where it ends is not
     known: every stop at a closing bracket or a quote is tried, a name
     holding either being read whole (pin: refile.test › a name with a
     straight apostrophe or brackets) */
  const stops = (run: string): string[] => {
    const out = [run];
    for (let i = run.length - 1; i > 0; i--) if (run[i] === ")" || run[i] === "'") out.push(run.slice(0, i));
    return out;
  };
  return (md) => {
    if (md.indexOf("#" + ns + "/") === -1) return false;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(md))) {
      for (const path of m[1] !== undefined ? [m[1]] : stops(m[2])) if (namesUnder("#" + ns + "/" + path, ns, root)) return true;
    }
    return false;
  };
}
/* null when the page already has its title */
export function withHeading(md: string, name: string): string | null {
  if (firstHeading(md)) return null;
  return "# " + name + "\n" + (md.trim() ? "\n" + md : "");
}
/* every entry outside the move holding an address under `root`, in any
   spelling: a narrower text test once skipped links that did need rewriting
   (pin: lifecycle.test › a link spelled with an encoded slash) */
export function linkingKeys(cache: Record<string, string>, ns: string, root: string, moves: Record<string, string>): string[] {
  const copies = new Set(Object.values(moves));
  const may = mayName(ns, root);
  return Object.keys(cache).filter((k) => !(k in moves) && !copies.has(k) && may(cache[k]));
}
