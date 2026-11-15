export type List = "A" | "S" | "L" | "B";
export interface Stamp { at: string; approx: boolean }
interface Base { at: string; approx?: boolean }
export type Event = Base & (
  | { ev: "begin"; next: Partial<Record<List, number>> }
  | { ev: "carry" | "add"; id: string; list: List; title: string; parent?: string }
  | { ev: "start" | "stop" | "drop"; id: string; note?: string }
  | { ev: "done"; id: string; commits?: string[]; note?: string }
  | { ev: "move"; id: string; to: string; list: List }
);
export type Status = "unstarted" | "in progress" | "done" | "done, spawned open" | "moved" | "dropped";
export interface Item {
  id: string; list: List; title: string; parent?: string;
  /* on the day's list when it began: carried in, or moved from an item that was */
  starting: boolean;
  movedFrom?: string; movedTo?: string;
  reported?: Stamp; started?: Stamp; stopped?: Stamp; ended?: Stamp;
  commits: string[]; note?: string;
  status: Status;
}

const stamp = (e: Base): Stamp => ({ at: e.at, approx: !!e.approx });
type Items = Map<string, Item>;
function created(items: Items, e: Event): void {
  if (e.ev === "carry" || e.ev === "add") {
    items.set(e.id, { id: e.id, list: e.list, title: e.title, parent: e.parent, starting: e.ev === "carry", reported: e.ev === "add" ? stamp(e) : undefined, commits: [], status: "unstarted" });
    return;
  }
  if (e.ev !== "move") return;
  const was = items.get(e.id);
  if (!was) return;
  was.movedTo = e.to;
  was.ended = stamp(e);
  items.set(e.to, { id: e.to, list: e.list, title: was.title, starting: was.starting, movedFrom: e.id, reported: was.reported, commits: [], status: "unstarted" });
}
function changed(it: Item, e: Event): void {
  if (e.ev === "start") { it.started = stamp(e); it.stopped = undefined; }
  else if (e.ev === "stop") { it.stopped = stamp(e); it.note = e.note; }
  else if (e.ev === "done") { it.ended = stamp(e); it.commits = e.commits ?? []; it.note = e.note ?? it.note; it.status = "done"; }
  else if (e.ev === "drop") { it.ended = stamp(e); it.note = e.note; it.status = "dropped"; }
}
const stillOpen = (s: Status): boolean => s === "unstarted" || s === "in progress";
function settled(items: Items): void {
  const all = [...items.values()];
  const below = (id: string): Item[] => all.filter((i) => i.parent === id).flatMap((c) => [c, ...below(c.id)]);
  for (const it of all) {
    if (it.movedTo) it.status = "moved";
    else if (it.status === "unstarted" && it.started) it.status = "in progress";
  }
  for (const it of all) if (it.status === "done" && below(it.id).some((c) => stillOpen(c.status))) it.status = "done, spawned open";
}
const opens = (e: Event): boolean => e.ev === "carry" || e.ev === "add" || e.ev === "move";
function applied(items: Items, e: Event): void {
  if (opens(e)) { created(items, e); return; }
  const it = "id" in e ? items.get(e.id) : undefined;
  if (it) changed(it, e);
}
/* the day's items as they stood at `until` (all of it when absent), in
   the order they were reported */
export function replay(events: Event[], until?: string): Item[] {
  const items: Items = new Map();
  for (const e of events) {
    if (until && e.at > until) break;
    applied(items, e);
  }
  settled(items);
  return [...items.values()];
}

export interface Tally { total: number; byList: Partial<Record<List, number>>; byStatus: Partial<Record<Status, number>> }
function tally(items: Item[]): Tally {
  const t: Tally = { total: items.length, byList: {}, byStatus: {} };
  for (const i of items) {
    t.byList[i.list] = (t.byList[i.list] ?? 0) + 1;
    t.byStatus[i.status] = (t.byStatus[i.status] ?? 0) + 1;
  }
  return t;
}
/* a moved item counts once, where it started */
export function counts(items: Item[]): { starting: Tally; added: Tally } {
  const own = items.filter((i) => !i.movedFrom);
  return { starting: tally(own.filter((i) => i.starting)), added: tally(own.filter((i) => !i.starting)) };
}
