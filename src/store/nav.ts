/* The address grammar: a hash string → the entry it names, and an href →
   the link the app mints for it. Ported 2026-09-07 from
   ../writer/src/js/nav.mjs; the document's own address is a parameter here
   rather than the global, so node tests supply it. */
import { isDayKey, nsOf, todayKey, hashTarget, type Highlight } from "./keys.ts";
import { pageName } from "./names.ts";

export interface HashParts { date: string; tag: string | null; hl: Highlight | null }
/* a hash's text (after the "#") resolved to the entry it names, saying
   nothing about whether that entry exists. The today fallback for any hash
   that cannot route — an undecodable escape, a bare or empty #page/, an
   empty interior segment — drops the highlight payload with it, or it would
   select some innocent passage in today's entry. A KEYED hash routes at
   ANY depth, each segment through the same pageName rule as every
   key-minting path; trailing empties are the parent (#page/Name/ is the
   page itself). */
export function hashParts(raw: string): HashParts {
  const fallback: HashParts = { date: todayKey(), tag: null, hl: null };
  let hl: Highlight | null = null;
  const qpos = raw.indexOf("?");
  if (qpos !== -1) {
    const query = raw.slice(qpos + 1);
    try {
      const m = query.match(/(?:^|&)h=([^&]*)(?:&n=(\d+))?/);
      if (m && m[1]) hl = { q: decodeURIComponent(m[1]), nth: parseInt(m[2], 10) || 0 };
    } catch { hl = null; }   /* a mangled payload loses only the highlight */
    raw = hashTarget(raw);
  }
  const slash = raw.indexOf("/");
  const date = slash === -1 ? raw : raw.slice(0, slash);
  let tag: string | null;
  try { tag = slash === -1 ? null : decodeURIComponent(raw.slice(slash + 1)); }
  catch { return fallback; }
  if (nsOf(date)) {
    const parts = (tag || "").split("/").map(pageName);
    while (parts.length > 1 && !parts[parts.length - 1]) parts.pop();
    if (parts.indexOf("") !== -1) return fallback;
    return { date, tag: parts.join("/"), hl };
  }
  if (!isDayKey(date)) return fallback;
  return { date, tag: tag || null, hl };
}
/* the "#…" fragment of an href that points at THIS document — a full URL
   copied from the address bar is an internal link in external clothing.
   Null for anything else: a link to a different deploy or file is
   genuinely external. The raw slice keeps the percent-escapes byte-intact. */
export function internalHash(href: string, docHref: string = location.href): string | null {
  const hashAt = href.indexOf("#");
  if (hashAt < 0) return null;
  try {
    const url = new URL(href, docHref), doc = new URL(docHref);
    return url.origin === doc.origin && url.pathname === doc.pathname ? href.slice(hashAt) : null;
  } catch { return null; }
}
/* a same-document URL mints as its bare fragment, portable across deploys;
   a bare www. address gets its scheme; quotes are encoded for the href */
export function makeHref(url: string, docHref: string = location.href): string {
  const frag = internalHash(url, docHref);
  return (frag || (/^www\./i.test(url) ? "https://" + url : url)).replace(/"/g, "%22");
}
