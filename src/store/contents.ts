/* A BOOK'S OWN ORDER, read off the parent's CONTENTS. Ported 2026-09-07
   from contentsLinks, subPageOrder and subPageDisplayList
   (18-pages-panel.js), re-asked of the document model. The alphabet is
   wrong for a book — Dante's canticles read Inferno, Paradiso, Purgatorio
   — and what decides instead is the parent's own entry, which already
   lists its children as links in the book's order: no second place to
   store an order, nothing outside the text for a backup to lose. ALL OR
   NOTHING, over the subs a reader can see: the contents decides only
   when it links every CONTENT-BEARING sub, so a page mentioning one sub
   mid-sentence reorders nothing, and a blank registration gets no vote.
   The links' section headings (levels 1–3, in document order) are the
   sections a picker groups by; a heading that is itself a link names the
   section AND is a child, so its own row belongs where the heading
   stands, not inside the section it opens. Memoised on the parent's
   markdown. A book whose every sub name opens with a date reads as a
   feed and lists NEWEST FIRST — unless it states its own order. */
import type { Node } from "prosemirror-model";
import { parseMarkdown } from "../model/parse.ts";
import { schema } from "../model/schema.ts";
import { linkRuns } from "./links.ts";
import { childrenOf } from "./lists.ts";
import { entryKey, entryHash, byName, DATE_KEY_SRC } from "./keys.ts";

export interface ContentsLink { href: string; group: string | null }
export function contentsLinks(md: string): ContentsLink[] {
  let doc: Node;
  try { doc = parseMarkdown(md); } catch { return []; }
  /* headings and link runs in document order, a link inside a heading
     marked as such */
  const items: { pos: number; heading?: string; link?: { href: string; inHead: boolean } }[] = [];
  const heads: { from: number; to: number; text: string }[] = [];
  doc.descendants((n, pos) => {
    if (n.type === schema.nodes.heading && (n.attrs.level as number) <= 3) heads.push({ from: pos, to: pos + n.nodeSize, text: n.textContent.trim() });
    return true;
  });
  for (const h of heads) items.push({ pos: h.from, heading: h.text });
  for (const r of linkRuns(doc)) items.push({ pos: r.from, link: { href: r.href, inHead: heads.some((h) => r.from > h.from && r.to < h.to) } });
  items.sort((a, b) => a.pos - b.pos);
  const out: ContentsLink[] = [], seen = new Set<string>();
  let group: string | null = null, pending: string | null = null;
  for (const it of items) {
    if (it.heading !== undefined) { pending = it.heading || null; continue; }
    const l = it.link!;
    if (!l.inHead) group = pending;
    if (seen.has(l.href)) continue;
    seen.add(l.href);
    out.push({ href: l.href, group: l.inHead ? null : group });
  }
  return out;
}
export interface SubOrder { names: string[]; rows: { name: string; group: string | null }[] | null; stated: boolean }
export type Bearing = (key: string) => boolean;
export function subPageOrder(keys: string[], parentKey: string, parentMd: string, bearing: Bearing, memo?: Map<string, { md: string; links: ContentsLink[] }>): SubOrder {
  const names = childrenOf(keys, parentKey);
  if (!names.length) return { names: [], rows: null, stated: false };
  let m = memo?.get(parentKey);
  if (!m || m.md !== parentMd) { m = { md: parentMd, links: parentMd ? contentsLinks(parentMd) : [] }; memo?.set(parentKey, m); }
  const cut = parentKey.indexOf("/");
  const date = cut < 0 ? parentKey : parentKey.slice(0, cut), tag = cut < 0 ? "" : parentKey.slice(cut + 1);
  const wanted: Record<string, string> = Object.create(null);
  for (const n of names) wanted[entryHash(date, tag ? tag + "/" + n : n)] = n;
  const rows: { name: string; group: string | null }[] = [], linked = new Set<string>();
  for (const l of m.links) { if (!wanted[l.href]) continue; linked.add(wanted[l.href]); rows.push({ name: wanted[l.href], group: l.group }); }
  const extra = names.filter((n) => !linked.has(n));
  const stated = rows.length > 1 && extra.every((n) => !bearing(entryKey(parentKey, n)));
  if (!stated) return { names: names.slice().sort(byName), rows: null, stated: false };
  for (const n of extra) rows.push({ name: n, group: null });
  return { names: rows.map((r) => r.name), rows, stated: true };
}
const DATED_SUB_RE = new RegExp("^" + DATE_KEY_SRC + "(-|$)");
/* the display order of a book's picker rows: a stated order as stated;
   else byName, a feed of dated names newest first; an `extra` (the open
   unregistered sub) joins the END of a stated order and is sorted into an
   alphabetical one */
export function subPageDisplayList(order: SubOrder, parentKey: string, bearing: Bearing, extra: string | null): string[] {
  const subs = order.names.slice();
  const voters = subs.filter((s) => bearing(entryKey(parentKey, s)));
  const reversed = !order.stated && voters.length > 0 && voters.every((s) => DATED_SUB_RE.test(s));
  if (extra && subs.indexOf(extra) === -1) { subs.push(extra); if (!order.stated) subs.sort(byName); }
  if (reversed) subs.reverse();
  return subs;
}
