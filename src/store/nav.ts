import { isDayKey, nsOf, todayKey, hashTarget, type Highlight } from "./keys.ts";
import { pageName } from "./names.ts";

export interface HashParts { date: string; tag: string | null; hl: Highlight | null }
/* The today fallback — an undecodable escape, a bare or empty #page/, an
   empty interior segment — drops the highlight payload with it, or it would
   select some innocent passage in today's entry. Trailing empties are the
   parent: #page/Name/ is the page itself.
   (pin: nav.test › hashParts: a page routes; anything less falls back)
   (pin: nav.test › hashParts: a page hierarchy at any depth) */
export function hashParts(raw: string): HashParts {
  const fallback: HashParts = { date: todayKey(), tag: null, hl: null };
  let hl: Highlight | null = null;
  const qpos = raw.indexOf("?");
  if (qpos !== -1) {
    const query = raw.slice(qpos + 1);
    try {
      const m = query.match(/(?:^|&)h=([^&]*)(?:&n=(\d+))?/);
      if (m && m[1]) hl = { q: decodeURIComponent(m[1]), nth: parseInt(m[2], 10) || 0 };
    } catch { hl = null; }   /* a mangled payload loses only the highlight (pin: nav.test › hashParts: the ?h=…&n=… highlight payload) */
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
/* A full URL copied from the address bar is an internal link in external
   clothing; a link to a different deploy or file is genuinely external.
   The raw slice keeps the percent-escapes byte-intact.
   (pin: nav.test › internalHash: same origin and path is this document) */
export function internalHash(href: string, docHref: string = location.href): string | null {
  const hashAt = href.indexOf("#");
  if (hashAt < 0) return null;
  try {
    const url = new URL(href, docHref), doc = new URL(docHref);
    return url.origin === doc.origin && url.pathname === doc.pathname ? href.slice(hashAt) : null;
  } catch { return null; }
}
/* a same-document URL mints as its bare fragment, portable across deploys
   (pin: nav.test › makeHref: a same-document URL mints as its bare fragment) */
export function makeHref(url: string, docHref: string = location.href): string {
  const frag = internalHash(url, docHref);
  return (frag || (/^www\./i.test(url) ? "https://" + url : url)).replace(/"/g, "%22");
}
