/* What the Go to row READS and how a pick ROUTES, pure. Ported 2026-09-07
   from 19-the-consolidated-go-to-line-the-build-half.js. The line is a run
   of selects: a Destination (Journal, then every root grouped by
   namespace), then the picked scope's shape — Year, Month, Day and, only
   when that day has tagged entries, a Tagged entry select with "← the
   day"; or ONE SELECT PER LEVEL of a page's chain, each with a "← the
   parent" sentinel and its own path, so a pick knows what it is a child
   of. A terminal pick is a jump; a non-terminal one rebuilds
   strictly-downstream levels, placeholder-led, since a preselected option
   can never be re-picked. A page with no content-bearing subs is terminal
   on the scope pick itself. A SOLE CHILD THAT IS ITSELF A PARENT IS NOT
   WORTH A CLICK: its children stand in its place under its name as a
   section, with the work's own row first, reading "Index" — one hop, not
   a walk. A book's sections and its order come from one reading of the
   parent's contents. */
import { isDayKey, nsOf, pageParts, entryKey, entryHash, monthLabel, capitalized, todayKey, NS_KEYS, KEYED_NS, PAGE_KEY } from "../store/keys.ts";
import { dayKeys, childrenOf } from "../store/lists.ts";
import { subPageOrder, subPageDisplayList, type Bearing } from "../store/contents.ts";
import type { Journal } from "../store/reference.ts";
import { rootLabel, trimLabel, LABEL_CAP } from "./mastheadModel.ts";
import { nsGroupLabel } from "./searchModel.ts";

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
export function destinationRows(w: GotoWorld, date: string, tag: string | null): Row[] {
  const dest: Row[] = [{ v: "", label: "Journal" }];
  const open = nsOf(date) && tag ? pageParts(tag).name : null;
  for (const key of NS_KEYS) {
    const roots = childrenOf(w.keys, key);
    if (open && date === key && roots.indexOf(open) === -1) roots.push(open);
    for (const n of roots.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) dest.push({ v: n, label: trimLabel(rootLabel(key, n, w.journal), LABEL_CAP), ns: key, group: nsGroupLabel(key) });
  }
  return dest;
}
/* the journal shape at FULL preselect depth on the given day */
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
export function subLevel(w: GotoWorld, ns: string, path: string, sub: string | null, home: boolean, level: number, deep: string | null): { took: number; level: Level | null; jump?: string } {
  const bearing = bearingOf(w);
  let listKey = entryKey(ns, path);
  const memo = new Map();
  const segs0 = sub;
  let order = subPageOrder(w.keys, listKey, w.cache[listKey] || "", bearing, memo);
  let subs = subPageDisplayList(order, listKey, bearing, sub).filter((s) => bearing(entryKey(listKey, s)));
  let group: string | null = null, took = 1;
  if (subs.length === 1) {
    const only = subs[0], onlyKey = entryKey(listKey, only);
    const deeperOrder = subPageOrder(w.keys, onlyKey, w.cache[onlyKey] || "", bearing, memo);
    const deeper = subPageDisplayList(deeperOrder, onlyKey, bearing, deep).filter((s) => bearing(entryKey(onlyKey, s)));
    if (deeper.length) {
      group = only; took = 2; listKey = onlyKey; order = deeperOrder;
      sub = deep ? only + "/" + deep : (segs0 === only ? only : null);
      subs = [only, ...deeper.map((d) => only + "/" + d)];
    }
  }
  if (!subs.length) return { took: 0, level: null, jump: home ? undefined : entryHash(ns, path) };
  const value = !home ? null : !sub ? "" : subs.indexOf(sub) !== -1 ? sub : null;
  const sectionOf: Record<string, string | null> = Object.create(null);
  for (const r of order.rows || []) sectionOf[r.name] = r.group;
  const rows: Row[] = subs.map((s) => {
    if (group && s === group) return { v: s, label: "Index", group, here: true };
    const leaf = group ? s.slice(group.length + 1) : s;
    return { v: s, label: trimLabel(w.journal.heading(entryKey(listKey, leaf)) || leaf, LABEL_CAP), group: group || sectionOf[leaf] || null };
  });
  const pp = pageParts(path);
  return { took, level: { level, aria: capitalized(KEYED_NS[ns].subNoun), rows, value, sentinel: pp.sub ? "← " + pp.leaf : "← the " + KEYED_NS[ns].noun, path } };
}
/* the whole line for the open entry */
export function gotoLevels(w: GotoWorld, date: string, tag: string | null): Level[] {
  const today = w.today || todayKey();
  const pp = nsOf(date) && tag ? pageParts(tag) : null;
  const out: Level[] = [{ level: 0, aria: "Destination", rows: destinationRows(w, date, tag), value: pp ? pp.name : "", valueNs: pp ? date : undefined, sentinel: null, path: null }];
  if (!pp) return out.concat(journalLevels(w, openDay(date, today), tag));
  const segs = (tag || "").split("/").slice(1);
  let walk = pp.name;
  for (let i = 0, lvl = 1; ; lvl++) {
    const r = subLevel(w, date, walk, segs[i] || null, true, lvl, segs[i + 1] || null);
    if (r.level) out.push(r.level);
    if (!r.took || i >= segs.length) break;
    for (let t = 0; t < r.took && i < segs.length; t++) { walk = entryKey(walk, segs[i]); i++; }
  }
  return out;
}
/* the namespace the line works in: the destination row's, read live */
function gotoNs(levels: Level[], date: string): string {
  const d = levels[0];
  const row = d.rows.find((r) => r.v === d.value && (!d.valueNs || r.ns === d.valueNs));
  return row?.ns || (nsOf(date) ? date : PAGE_KEY);
}
const val = (levels: Level[], level: number): string | null => levels.find((l) => l.level === level)?.value ?? null;
const below = (levels: Level[], level: number): Level[] => levels.filter((l) => l.level < level);
/* a pick at `level` of `value`: the levels afterwards, or the jump */
export function gotoPick(w: GotoWorld, date: string, tag: string | null, levels: Level[], level: number, value: string, valueNs?: string): Pick {
  const today = w.today || todayKey();
  const picked = levels.find((l) => l.level === level);
  if (!picked) return null;
  const next = levels.map((l) => l.level === level ? { ...l, value, valueNs: level === 0 ? valueNs : l.valueNs } : l);
  const kept = below(next, level + 1);
  if (level === 0) {
    if (value === "") return { levels: kept.concat(journalLevels(w, openDay(date, today), nsOf(date) ? null : tag)) };
    const r = subLevel(w, valueNs || gotoNs(next, date), value, null, false, 1, null);
    return r.jump ? { jump: r.jump } : { levels: r.level ? kept.concat([r.level]) : kept };
  }
  const ns = gotoNs(next, date);
  if (val(next, 0) !== "") {
    const here = picked;
    if (value === "") return { jump: entryHash(ns, here.path!) };
    const row = here.rows.find((r) => r.v === value);
    if (row?.here) return { jump: entryHash(ns, entryKey(here.path!, value)) };
    const r = subLevel(w, ns, entryKey(here.path!, value), null, false, level + 1, null);
    return r.jump ? { jump: r.jump } : { levels: r.level ? kept.concat([r.level]) : kept };
  }
  if (level === 3 || level === 4) {
    const day = val(next, 1) + "-" + val(next, 2) + "-" + val(next, 3);
    return { jump: entryHash(day, level === 4 ? value || null : null) };
  }
  const days = daysOf(w, openDay(date, today));
  if (level === 1) return { levels: kept.concat([{ level: 2, aria: "Month", rows: monthRows(days, value), value: null, sentinel: null, path: null }]) };
  return { levels: kept.concat([{ level: 3, aria: "Day", rows: dayRows(w, days, val(next, 1) + "-" + value), value: null, sentinel: null, path: null }]) };
}
