/* A BOOK'S OWN ORDER, read off the parent's CONTENTS. The alphabet is
   wrong for a book — Dante's canticles read Inferno, Paradiso, Purgatorio
   — and what decides instead is the parent's own entry, which already
   lists its children as links in the book's order: no second place to
   store an order, nothing outside the text for a backup to lose. ALL OR
   NOTHING, over the subs a reader can see: the contents decides only
   when it links every CONTENT-BEARING sub, so an entry mentioning one sub mid-sentence reorders nothing, and a blank registration gets no vote
   (pin: contents.test › an entry mentioning one sub mid-sentence keeps the
   alphabet).
   The links' section headings (levels 1–3, in document order) are the
   sections a picker groups by; a heading that is itself a link names the
   section AND is a child, so its own row belongs where the heading
   stands, not inside the section it opens (pin: contents.test › links in
   document order with the section heading in force). Memoised on the
   parent's markdown. A book whose every sub name opens with a date reads
   as a feed and lists NEWEST FIRST — unless it states its own order (pin:
   contents.test › a feed of dated names lists newest first) */
import type { Node } from "prosemirror-model";
import { parseMarkdown } from "../model/parse.ts";
import { schema } from "../model/schema.ts";
import { linkRuns } from "./links.ts";
import { childrenOf, type Walk } from "./lists.ts";
import { entryKey, entryHash, byName, DATE_KEY_SRC, NS_BOOK } from "./keys.ts";

export interface ContentsLink { href: string; group: string | null }
interface Head { from: number; to: number; text: string }
interface Item { pos: number; heading?: string; link?: { href: string; inHead: boolean } }
function headsOf(doc: Node): Head[] {
  const heads: Head[] = [];
  doc.descendants((n, pos) => {
    if (n.type === schema.nodes.heading && (n.attrs.level as number) <= 3) heads.push({ from: pos, to: pos + n.nodeSize, text: n.textContent.trim() });
    return true;
  });
  return heads;
}
function itemsOf(doc: Node): Item[] {
  const heads = headsOf(doc);
  const items: Item[] = heads.map((h) => ({ pos: h.from, heading: h.text }));
  for (const r of linkRuns(doc)) items.push({ pos: r.from, link: { href: r.href, inHead: heads.some((h) => r.from > h.from && r.to < h.to) } });
  return items.sort((a, b) => a.pos - b.pos);
}
export function contentsLinks(md: string): ContentsLink[] {
  let doc: Node;
  try { doc = parseMarkdown(md); } catch { return []; }
  return grouped(itemsOf(doc));
}
function grouped(items: Item[]): ContentsLink[] {
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
export type OrderMemo = Map<string, { md: string; links: ContentsLink[] }>;
function linksOf(parentKey: string, parentMd: string, memo?: OrderMemo): ContentsLink[] {
  let m = memo?.get(parentKey);
  if (!m || m.md !== parentMd) { m = { md: parentMd, links: parentMd ? contentsLinks(parentMd) : [] }; memo?.set(parentKey, m); }
  return m.links;
}
function keyParts(key: string): { date: string; tag: string } {
  const cut = key.indexOf("/");
  return cut < 0 ? { date: key, tag: "" } : { date: key.slice(0, cut), tag: key.slice(cut + 1) };
}
function wantedHrefs(parentKey: string, names: string[]): Record<string, string> {
  const { date, tag } = keyParts(parentKey);
  const wanted: Record<string, string> = Object.create(null);
  for (const n of names) wanted[entryHash(date, tag ? tag + "/" + n : n)] = n;
  return wanted;
}
export function subPageOrder(walk: Walk, parentKey: string, parentMd: string, memo?: OrderMemo): SubOrder {
  const names = childrenOf(walk.keys, parentKey);
  if (!names.length) return { names: [], rows: null, stated: false };
  const wanted = wantedHrefs(parentKey, names);
  const rows: { name: string; group: string | null }[] = [], linked = new Set<string>();
  for (const l of linksOf(parentKey, parentMd, memo)) {
    const name = wanted[l.href];
    if (!name) continue;
    linked.add(name);
    rows.push({ name, group: l.group });
  }
  const extra = names.filter((n) => !linked.has(n));
  const stated = rows.length > 1 && extra.every((n) => !walk.bearing(entryKey(parentKey, n)));
  if (!stated) return { names: names.slice().sort(byName), rows: null, stated: false };
  for (const n of extra) rows.push({ name: n, group: null });
  return { names: rows.map((r) => r.name), rows, stated: true };
}
const DATED_SUB_RE = new RegExp("^" + DATE_KEY_SRC + "(-|$)");
export function subPageDisplayList(order: SubOrder, parentKey: string, bearing: Bearing, extra: string | null): string[] {
  const subs = order.names.slice();
  const reversed = !order.stated && datedVotes(subs.filter((s) => bearing(entryKey(parentKey, s))));
  withExtra(subs, extra, order.stated);
  if (reversed) subs.reverse();
  return subs;
}
const datedVotes = (voters: string[]): boolean => voters.length > 0 && voters.every((s) => DATED_SUB_RE.test(s));
function withExtra(subs: string[], extra: string | null, stated: boolean): void {
  if (!extra || subs.includes(extra)) return;
  subs.push(extra);
  if (!stated) subs.sort(byName);
}

export function foldsContents(keys: string[], date: string, tag: string | null): boolean {
  if (date !== NS_BOOK.key || !tag) return false;
  if (tag.split("/").length < 2) return false;
  return childrenOf(keys, entryKey(date, tag)).length > 0;
}
