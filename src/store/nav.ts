import { isDayKey, nsOf, todayKey, asAddress, type Address, type Highlight } from "./keys.ts";
import { pageName } from "./names.ts";

export interface HashParts { date: string; tag: string | null; hl: Highlight | null }
/* The today fallback — an undecodable escape, a bare or empty #page/, an
   empty interior segment — drops the highlight payload with it, or it would
   select some innocent passage in today's entry. Trailing empties are the
   parent: #page/Name/ is the page itself.
   (pin: nav.test › hashParts: a page routes; anything less falls back)
   (pin: nav.test › hashParts: a page hierarchy at any depth) */
export function hashParts(a: Address): HashParts {
  return namedBy(a.replace(/^#/, "")) ?? { date: todayKey(), tag: null, hl: null };
}
/* whether an address names an entry at all, the fallback's cases being no */
export function namesEntry(a: Address): boolean {
  return namedBy(a.replace(/^#/, "")) !== null;
}
function searchedFor(query: string): Highlight | null {
  try {
    const m = query.match(/(?:^|&)h=([^&]*)(?:&n=(\d+))?/);
    return m?.[1] ? { q: decodeURIComponent(m[1]), nth: parseInt(m[2], 10) || 0 } : null;
  } catch { return null; }
}
function highlightOf(raw: string): Highlight | null {
  const qpos = raw.indexOf("?");
  if (qpos === -1) return null;
  const query = raw.slice(qpos + 1);
  const line = query.match(/(?:^|&)line=([1-9]\d*(?:\.\d+|[a-z])?|\[\d+\])(?:&|$)/);
  return searchedFor(query) ?? (line ? { q: "", nth: 0, line: line[1] } : null);
}
function pagePath(tag: string | null): string | null {
  const parts = (tag || "").split("/").map(pageName);
  while (parts.length > 1 && !parts[parts.length - 1]) parts.pop();
  return parts.indexOf("") === -1 ? parts.join("/") : null;
}
function namedBy(whole: string): HashParts | null {
  const hl = highlightOf(whole);
  const raw = whole.split("?")[0];
  const slash = raw.indexOf("/");
  const date = slash === -1 ? raw : raw.slice(0, slash);
  let tag: string | null;
  try { tag = slash === -1 ? null : decodeURIComponent(raw.slice(slash + 1)); }
  catch { return null; }
  if (nsOf(date)) {
    const path = pagePath(tag);
    return path === null ? null : { date, tag: path, hl };
  }
  if (!isDayKey(date)) return null;
  return { date, tag: tag || null, hl };
}
/* A full URL copied from the address bar is an internal link in external
   clothing; a link to a different deploy or file is genuinely external.
   The raw slice keeps the percent-escapes byte-intact.
   (pin: nav.test › internalHash: same origin and path is this document) */
export function internalHash(href: string, docHref: string = location.href): Address | null {
  const hashAt = href.indexOf("#");
  if (hashAt < 0) return null;
  try {
    const url = new URL(href, docHref), doc = new URL(docHref);
    return url.origin === doc.origin && url.pathname === doc.pathname ? asAddress(href.slice(hashAt)) : null;
  } catch { return null; }
}
/* a same-document URL mints as its bare fragment, portable across deploys
   (pin: nav.test › makeHref: a same-document URL mints as its bare fragment) */
export function makeHref(url: string, docHref: string = location.href): string {
  const frag = internalHash(url, docHref);
  return (frag || (/^www\./i.test(url) ? "https://" + url : url)).replace(/"/g, "%22");
}
