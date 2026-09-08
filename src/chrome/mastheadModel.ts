/* What the masthead READS for the open entry, as data: the date line as a
   breadcrumb, the bold leaf, the title row, the day's sibling tags, and
   whether today is worth reaching for. Ported 2026-09-07 from the current
   app's showDateLabel (06-save-load.js) and rootLabel (18-pages-panel.js),
   pure over the cache's keys and the journal's headings, so the component
   only draws. The rules kept: the date line is a BREADCRUMB — on any
   sub-entry the parent crumbs link back up, every ancestor its own link,
   and the leaf, the entry's own NAME, reads bold; a top-level page is its
   bold label alone; a day's main entry is "Era — date". Only a ROOT reads
   as something other than its key, and only in a namespace that titles
   its roots. The tag bar lists DESTINATIONS only: a day's sibling tags,
   never the open one. The title row is for TITLES, never names: a
   sub-page's first heading, or a day's — a headingless sub-page already
   names itself in the crumb. */
import { nsOf, pageParts, entryKey, entryHash, prettyDate, isDayKey, titlesRoots } from "../store/keys.ts";
import { childrenOf } from "../store/lists.ts";
import type { Journal } from "../store/reference.ts";

/* a unit of the date line: a link back up, or the plain date */
export interface Crumb { text: string; href: string | null; title: string }
export interface Link { text: string; href: string }
export interface MastheadModel {
  crumbs: Crumb[];
  /* the open entry's own bold name; null on a day's main entry */
  leaf: string | null;
  /* the title row's text, "" hides the row */
  title: string;
  tags: Link[];
  showToday: boolean;
}
/* a root's display name: the heading of its own entry where the
   namespace titles its roots, else the name */
export function rootLabel(ns: string, name: string, journal: Journal): string {
  return (titlesRoots(ns) && journal.heading(entryKey(ns, name))) || name;
}
export function mastheadModel(date: string, tag: string | null, keys: string[], journal: Journal, today: string): MastheadModel {
  const crumbs: Crumb[] = [];
  let leaf: string | null = null, title = "";
  let tags: Link[] = [];
  const ns = nsOf(date);
  if (ns) {
    const pp = pageParts(tag || "");
    if (pp.sub) {
      const path = pp.parent!.split("/");
      path.forEach((name, i) => {
        const label = i ? name : rootLabel(date, name, journal);
        crumbs.push({ text: label, href: entryHash(date, path.slice(0, i + 1).join("/")), title: "Back to " + label });
      });
      leaf = pp.leaf;
      title = journal.heading(entryKey(date, tag));
    } else {
      leaf = rootLabel(date, pp.name, journal);
    }
  } else {
    /* date keys are YYYY-MM-DD, so a string compare is chronological */
    const when = date === today ? "Today" : date < today ? "Past" : "Future";
    const text = when + " — " + prettyDate(date);
    if (tag) {
      crumbs.push({ text, href: entryHash(date), title: "Back to the main entry" });
      leaf = tag;
    } else {
      crumbs.push({ text, href: null, title: "" });
      title = journal.heading(date);
    }
    if (isDayKey(date)) {
      tags = childrenOf(keys, date).filter((t) => t !== tag).map((t) => ({ text: t, href: entryHash(date, t) }));
    }
  }
  return { crumbs, leaf, title, tags, showToday: date !== today };
}

/* the row-label cap every list surface shares, so their truncation of an
   untrusted name cannot drift apart; and how much of what the reader
   TYPED a refusal may quote back, shorter because it lands mid-sentence */
export const LABEL_CAP = 60;
export const ECHO_CAP = 24;
export function trimLabel(s: string, max: number): string {
  if (s.length <= max) return s;
  let cut = max - 1;
  if (/[\uD800-\uDBFF]/.test(s.charAt(cut - 1))) cut--;
  return s.slice(0, cut) + "…";
}
/* one namespace's roots as panel rows, each labelled the one way a root is
   labelled everywhere (rootLabel), in byName order of the KEYS */
export function panelRows(ns: string, keys: string[], journal: Journal): Link[] {
  return childrenOf(keys, ns).map((name) => ({ text: rootLabel(ns, name, journal), href: entryHash(ns, name) }));
}
