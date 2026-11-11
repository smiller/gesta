/* A pasted dated-article URL names the entry
   YYYY-MM-DD-slug so a book of essays stays chronological; a slash in a
   typed name becomes a dash (the slash is structure in a key); then the
   filename rule, and a name it cleans away to nothing is REFUSED with a
   reason — silence there reads as a broken button, where a cancelled
   prompt is silent on purpose (pin: naming.test › a name the filename rule
   cleans away is refused with the reason). NOUN-FREE messages: one prompt serves days,
   pages, sub-pages and the bookshelf. */
import { pageName, nameFromUrl } from "../store/names.ts";
import { namesEntry, hashParts } from "../store/nav.ts";
import { nsOf, NS_KEYS } from "../store/keys.ts";

export const REFUSE_URL = "that link's title can't be a name — type one instead";
export const REFUSE_EMPTY = "that name leaves nothing a filename can keep";
export type Typed = { name: string } | { refuse: string } | null;
export function typedName(raw: string | null | undefined): Typed {
  const s = (raw || "").trim();
  if (!s) return null;
  const derived = nameFromUrl(s);
  if (derived === "") return { refuse: REFUSE_URL };
  const name = pageName(derived || s.replace(/\//g, "-"));
  return name ? { name } : { refuse: REFUSE_EMPTY };
}

/* a place typed where a name is asked: an address (`#bookshelf/…`) or one
   spelled from its namespace (`bookshelf/Miller, Sean/Essays`), a
   page or book there; anything else is a name (pin: naming.test › a typed
   address names a page or book) */
export function typedAddress(raw: string | null | undefined): { date: string; tag: string } | null {
  const s = (raw || "").trim();
  const addr = s.startsWith("#") ? s.slice(1) : NS_KEYS.some((ns) => s.startsWith(ns + "/")) ? s : null;
  if (!addr || !namesEntry(addr)) return null;
  const p = hashParts(addr);
  return nsOf(p.date) && p.tag ? { date: p.date, tag: p.tag } : null;
}

const words = (s: string): string => s.trim().replace(/\s+/g, " ");
/* deliberately simple: "Bingen, Hildegard of" is wrong and stays wrong
   (pin: naming.test › the filing form puts the last word first) */
const parts = (s: string): string[] => s.split(",").map(words).filter(Boolean);
export function filingForm(name: string): string {
  const s = words(name);
  if (s.includes(",")) return parts(s).join(", ");
  const cut = s.lastIndexOf(" ");
  return cut === -1 ? s : s.slice(cut + 1) + ", " + s.slice(0, cut);
}
/* one comma only: "King, Martin Luther, Jr." turned at its first read
   "Martin Luther, Jr. King" (pin: naming.test › two commas or more are kept as typed) */
export function shownForm(typed: string): string {
  const s = words(typed);
  const derived = nameFromUrl(s);
  if (derived) return derived;
  const p = parts(s);
  return p.length === 2 ? p[1] + " " + p[0] : p.join(", ");
}
