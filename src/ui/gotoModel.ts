/* The line is a run of selects: a Destination (Journal, then every root grouped by
   namespace), then the picked scope's shape — Year, Month, Day and, only
   when that day has tagged entries, a Tagged entry select with "← the
   day"; or ONE SELECT PER LEVEL of a page's chain, each with a "← the
   parent" sentinel and its own path, so a pick knows what it is a child
   of. A terminal pick is a jump; a non-terminal one rebuilds
   strictly-downstream levels, placeholder-led, since a preselected option
   can never be re-picked (pin: gotoModel.test › a day pick jumps; a year
   pick refills the months placeholder-led). A page with no content-bearing
   subs is terminal on the scope pick itself. A SOLE CHILD THAT IS ITSELF A PARENT IS NOT
   WORTH A CLICK: its children stand in its place under its name as a
   section, with the work's own row first, reading "Index" — one hop, not
   a walk (pin: gotoModel.test › a sole child that is itself a parent
   collapses). A book's sections and its order come from one reading of the
   parent's contents. */
import { isDayKey, nsOf, pageParts, entryKey, entryHash, monthLabel, capitalized, todayKey, NS_KEYS, KEYED_NS, COMMONPLACE_KEY, NS_BOOK } from "../store/keys.ts";
import { dayKeys, childrenOf } from "../store/lists.ts";
import { subPageOrder, subPageDisplayList, type Bearing, type OrderMemo, type SubOrder } from "../store/contents.ts";
import type { Journal } from "../store/reference.ts";
import { rootLabel, trimLabel, LABEL_CAP } from "./mastheadModel.ts";
import { nsGroupLabel } from "./searchModel.ts";
import { rootGroups, SHELVES, type ShelfGroup } from "../store/shelves.ts";

export interface Row { v: string; label: string; group?: string | null; ns?: string; here?: boolean }
export interface Level { level: number; aria: string; rows: Row[]; value: string | null; valueNs?: string; sentinel: string | null; path: string | null }
export interface GotoWorld { keys: string[]; cache: Record<string, string>; journal: Journal; today?: string }
export type Pick = { jump: string } | { levels: Level[] } | null;
const bearingOf = (w: GotoWorld): Bearing => (k) => !!(w.cache[k] || "").trim();
/* the open day, or today for an open page: the journal shape always
   shows where you are */
function openDay(date: string, today: string): string { return isDayKey(date) ? date : today; }
function daysOf(w: GotoWorld, cd: string): string[] {
  const days = dayKeys(w.keys);
  if (days.indexOf(cd) === -1) { days.push(cd); days.sort(); }
  return days;
}
const nameRow = (n: string): Row => ({ v: n, label: n });
function monthRows(days: string[], year: string): Row[] {
  const months = Array.from(new Set(days.filter((d) => d.slice(0, 4) === year).map((d) => d.slice(5, 7)))).sort();
  return months.map((m) => ({ v: m, label: monthLabel(+m) }));
}
function dayRows(w: GotoWorld, days: string[], ym: string): Row[] {
  return days.filter((d) => d.slice(0, 7) === ym).map((d) => {
    const h = w.journal.heading(d);
    return { v: d.slice(8, 10), label: +d.slice(8, 10) + (h ? " — " + trimLabel(h, LABEL_CAP) : "") };
  });
}
function groupRows(w: GotoWorld, key: string, g: ShelfGroup): Row[] {
  const group = g.shelf === null ? nsGroupLabel(key) : trimLabel(g.shelf, LABEL_CAP);
  return g.roots.map((n) => ({ v: n, label: trimLabel(rootLabel(key, n, w.journal), LABEL_CAP), ns: key, group }));
}
function nsDestinations(w: GotoWorld, key: string, open: string | null): Row[] {
  const roots = childrenOf(w.keys, key);
  if (open && !roots.includes(open)) roots.push(open);
  roots.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return rootGroups(key, roots, w.cache[entryKey(NS_BOOK.key, SHELVES)] || "", open).flatMap((g) => groupRows(w, key, g));
}
export function destinationRows(w: GotoWorld, date: string, tag: string | null): Row[] {
  const open = nsOf(date) && tag ? pageParts(tag).name : null;
  return [{ v: "", label: "Journal" }, ...NS_KEYS.flatMap((key) => nsDestinations(w, key, date === key ? open : null))];
}
/* a select's runs of rows under one optgroup: a run breaks where its
   namespace does as well as its label, so a shelf named "Commonplaces" is not
   drawn among the commonplaces, and each run is keyed by where it starts (pin:
   gotoModel.test › a select's runs) */
export function rowGroups(rows: Row[]): { group: string | null; at: number; rows: Row[] }[] {
  const out: { group: string | null; at: number; rows: Row[] }[] = [];
  rows.forEach((r, i) => {
    const g = r.group || null, last = out[out.length - 1];
    if (last && last.group === g && last.rows[0].ns === r.ns) last.rows.push(r); else out.push({ group: g, at: i, rows: [r] });
  });
  return out;
}
export function journalLevels(w: GotoWorld, cd: string, tag: string | null): Level[] {
  const days = daysOf(w, cd);
  const years = Array.from(new Set(days.map((d) => d.slice(0, 4)))).sort().reverse();
  const out: Level[] = [
    { level: 1, aria: "Year", rows: years.map(nameRow), value: cd.slice(0, 4), sentinel: null, path: null },
    { level: 2, aria: "Month", rows: monthRows(days, cd.slice(0, 4)), value: cd.slice(5, 7), sentinel: null, path: null },
    { level: 3, aria: "Day", rows: dayRows(w, days, cd.slice(0, 7)), value: cd.slice(8, 10), sentinel: null, path: null },
  ];
  const tags = childrenOf(w.keys, cd);
  if (tag && tags.indexOf(tag) === -1) tags.push(tag);
  if (tags.length) out.push({ level: 4, aria: "Tagged entry", rows: tags.map(nameRow), value: tag, sentinel: "← the day", path: null });
  return out;
}
/* one level of a page chain under `path` in `ns`; `sub` the preselect,
   `home` whether this is the open key's own chain, `deep` the segment
   below the preselect (for a collapse). Returns how many segments the
   level took, and the level — or a jump when a non-home build finds
   nothing to list */
export interface Want { sub: string | null; home: boolean; level: number; deep: string | null }
interface Listing { listKey: string; order: SubOrder; subs: string[]; group: string | null; took: number; sub: string | null }
function bearingSubs(w: GotoWorld, key: string, memo: OrderMemo, extra: string | null): { order: SubOrder; subs: string[] } {
  const bearing = bearingOf(w);
  const order = subPageOrder({ keys: w.keys, bearing }, key, w.cache[key] || "", memo);
  return { order, subs: subPageDisplayList(order, key, bearing, extra).filter((s) => bearing(entryKey(key, s))) };
}
function listing(w: GotoWorld, ns: string, path: string, want: Want): Listing {
  const memo: OrderMemo = new Map(), listKey = entryKey(ns, path);
  const top = bearingSubs(w, listKey, memo, want.sub);
  const plain: Listing = { listKey, order: top.order, subs: top.subs, group: null, took: 1, sub: want.sub };
  if (top.subs.length !== 1) return plain;
  const only = top.subs[0], onlyKey = entryKey(listKey, only);
  const deeper = bearingSubs(w, onlyKey, memo, want.deep);
  if (!deeper.subs.length) return plain;
  const sub = want.deep ? only + "/" + want.deep : want.sub === only ? only : null;
  return { listKey: onlyKey, order: deeper.order, group: only, took: 2, sub, subs: [only, ...deeper.subs.map((d) => only + "/" + d)] };
}
function listedRow(w: GotoWorld, l: Listing, s: string, sectionOf: Record<string, string | null>): Row {
  if (l.group && s === l.group) return { v: s, label: "Index", group: l.group, here: true };
  const leaf = l.group ? s.slice(l.group.length + 1) : s;
  return { v: s, label: trimLabel(w.journal.heading(entryKey(l.listKey, leaf)) || leaf, LABEL_CAP), group: l.group || sectionOf[leaf] || null };
}
function levelRows(w: GotoWorld, l: Listing): Row[] {
  const sectionOf: Record<string, string | null> = Object.create(null);
  for (const r of l.order.rows || []) sectionOf[r.name] = r.group;
  return l.subs.map((s) => listedRow(w, l, s, sectionOf));
}
const pickedValue = (home: boolean, sub: string | null, subs: string[]): string | null => (!home ? null : !sub ? "" : subs.includes(sub) ? sub : null);
function sentinelOf(ns: string, path: string): string {
  const pp = pageParts(path);
  return pp.sub ? "← " + pp.leaf : "← the " + KEYED_NS[ns].noun;
}
export function subLevel(w: GotoWorld, ns: string, path: string, want: Want): { took: number; level: Level | null; jump?: string } {
  const l = listing(w, ns, path, want);
  if (!l.subs.length) return { took: 0, level: null, jump: want.home ? undefined : entryHash(ns, path) };
  const level: Level = { level: want.level, aria: capitalized(KEYED_NS[ns].subNoun), rows: levelRows(w, l), value: pickedValue(want.home, l.sub, l.subs), sentinel: sentinelOf(ns, path), path };
  return { took: l.took, level };
}
function advanced(walk: string, segs: string[], i: number, took: number): { walk: string; i: number } {
  for (let t = 0; t < took && i < segs.length; t++) walk = entryKey(walk, segs[i++]);
  return { walk, i };
}
function chainLevels(w: GotoWorld, date: string, root: string, segs: string[]): Level[] {
  const out: Level[] = [];
  let at = { walk: root, i: 0 };
  for (let lvl = 1; ; lvl++) {
    const r = subLevel(w, date, at.walk, { sub: segs[at.i] || null, home: true, level: lvl, deep: segs[at.i + 1] || null });
    if (r.level) out.push(r.level);
    if (!r.took || at.i >= segs.length) break;
    at = advanced(at.walk, segs, at.i, r.took);
  }
  return out;
}
const todayOf = (w: GotoWorld): string => w.today || todayKey();
export function gotoLevels(w: GotoWorld, date: string, tag: string | null): Level[] {
  const pp = nsOf(date) && tag ? pageParts(tag) : null;
  const out: Level[] = [{ level: 0, aria: "Destination", rows: destinationRows(w, date, tag), value: pp ? pp.name : "", valueNs: pp ? date : undefined, sentinel: null, path: null }];
  if (!pp) return out.concat(journalLevels(w, openDay(date, todayOf(w)), tag));
  return out.concat(chainLevels(w, date, pp.name, (tag || "").split("/").slice(1)));
}
function gotoNs(levels: Level[], date: string): string {
  const d = levels[0];
  const row = d.rows.find((r) => r.v === d.value && (!d.valueNs || r.ns === d.valueNs));
  return row?.ns || (nsOf(date) ? date : COMMONPLACE_KEY);
}
const val = (levels: Level[], level: number): string | null => levels.find((l) => l.level === level)?.value ?? null;
const below = (levels: Level[], level: number): Level[] => levels.filter((l) => l.level < level);
export interface PickAt { level: number; value: string; ns?: string }
interface PickCtx { w: GotoWorld; date: string; tag: string | null; next: Level[]; kept: Level[]; p: PickAt; picked: Level }
const deeperPick = (c: PickCtx, r: ReturnType<typeof subLevel>): Pick => (r.jump ? { jump: r.jump } : { levels: r.level ? c.kept.concat([r.level]) : c.kept });
function destinationPick(c: PickCtx): Pick {
  if (c.p.value === "") return { levels: c.kept.concat(journalLevels(c.w, openDay(c.date, todayOf(c.w)), nsOf(c.date) ? null : c.tag)) };
  return deeperPick(c, subLevel(c.w, c.p.ns || gotoNs(c.next, c.date), c.p.value, { sub: null, home: false, level: 1, deep: null }));
}
function pagePick(c: PickCtx): Pick {
  const ns = gotoNs(c.next, c.date), path = c.picked.path!;
  if (c.p.value === "") return { jump: entryHash(ns, path) };
  if (c.picked.rows.find((r) => r.v === c.p.value)?.here) return { jump: entryHash(ns, entryKey(path, c.p.value)) };
  return deeperPick(c, subLevel(c.w, ns, entryKey(path, c.p.value), { sub: null, home: false, level: c.p.level + 1, deep: null }));
}
function journalPick(c: PickCtx): Pick {
  const { next, p } = c;
  if (p.level >= 3) return { jump: entryHash(val(next, 1) + "-" + val(next, 2) + "-" + val(next, 3), p.level === 4 ? p.value || null : null) };
  const days = daysOf(c.w, openDay(c.date, todayOf(c.w)));
  if (p.level === 1) return { levels: c.kept.concat([{ level: 2, aria: "Month", rows: monthRows(days, p.value), value: null, sentinel: null, path: null }]) };
  return { levels: c.kept.concat([{ level: 3, aria: "Day", rows: dayRows(c.w, days, val(next, 1) + "-" + p.value), value: null, sentinel: null, path: null }]) };
}
export function gotoPick(w: GotoWorld, at: { date: string; tag: string | null }, levels: Level[], p: PickAt): Pick {
  const picked = levels.find((l) => l.level === p.level);
  if (!picked) return null;
  const next = levels.map((l) => (l.level === p.level ? { ...l, value: p.value, valueNs: p.level === 0 ? p.ns : l.valueNs } : l));
  const c: PickCtx = { w, date: at.date, tag: at.tag, next, kept: below(next, p.level + 1), p, picked };
  if (p.level === 0) return destinationPick(c);
  return val(next, 0) !== "" ? pagePick(c) : journalPick(c);
}
export const isPicked = (l: Level, r: Row): boolean => l.value !== null && r.v === l.value && (!l.valueNs || r.ns === l.valueNs);
