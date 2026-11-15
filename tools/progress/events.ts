export type List = "A" | "S" | "L" | "B";
export interface Stamp { at: string; approx: boolean }
interface Base { at: string; approx?: boolean }
export type Event = Base & (
  | { ev: "begin"; next: Partial<Record<List, number>> }
  | { ev: "carry" | "add"; id: string; list: List; title: string; parent?: string; detail?: string }
  | { ev: "detail"; id: string; text: string }
  | { ev: "start" | "stop" | "drop"; id: string; note?: string }
  | { ev: "done"; id: string; commits?: string[]; note?: string }
  | { ev: "move"; id: string; to: string; list: List }
);
export type Status = "unstarted" | "in progress" | "paused" | "done" | "done, spawned open" | "moved" | "dropped";
export interface Item {
  id: string; list: List; title: string; parent?: string; detail?: string;
  /* on the day's list when it began: carried in, or moved from an item that was */
  starting: boolean;
  movedFrom?: string; movedTo?: string;
  reported?: Stamp; started?: Stamp; stopped?: Stamp; ended?: Stamp;
  /* the item and everything it spawned ended, at the last of those ends */
  closed?: Stamp;
  commits: string[]; note?: string;
  status: Status;
}

const stamp = (e: Base): Stamp => ({ at: e.at, approx: !!e.approx });
type Items = Map<string, Item>;
function created(items: Items, e: Event): void {
  if (e.ev === "carry" || e.ev === "add") {
    items.set(e.id, { id: e.id, list: e.list, title: e.title, parent: e.parent, detail: e.detail, starting: e.ev === "carry", reported: e.ev === "add" ? stamp(e) : undefined, commits: [], status: "unstarted" });
    return;
  }
  if (e.ev !== "move") return;
  const was = items.get(e.id);
  if (!was) return;
  was.movedTo = e.to;
  was.ended = stamp(e);
  items.set(e.to, { id: e.to, list: e.list, title: was.title, detail: was.detail, starting: was.starting, movedFrom: e.id, reported: was.reported, commits: [], status: "unstarted" });
}
function changed(it: Item, e: Event): void {
  if (e.ev === "start") { it.started = stamp(e); it.stopped = undefined; }
  else if (e.ev === "stop") { it.stopped = stamp(e); it.note = e.note ?? it.note; }
  else if (e.ev === "done") { it.ended = stamp(e); it.commits = e.commits ?? []; it.note = e.note ?? it.note; it.status = "done"; }
  else if (e.ev === "drop") { it.ended = stamp(e); it.note = e.note ?? it.note; it.status = "dropped"; }
  else if (e.ev === "detail") it.detail = e.text;
}
/* moved, or started and so in progress or, stopped since, paused */
function begun(it: Item): Status {
  if (it.movedTo) return "moved";
  if (it.status !== "unstarted" || !it.started) return it.status;
  return it.stopped ? "paused" : "in progress";
}
/* THE ONE PLACE a label's group is said: written out at each use, adding
   "paused" meant finding every copy (pin: events.test › which labels are open) */
export const LISTS: List[] = ["A", "S", "L", "B"];
const OPEN = new Set<Status>(["unstarted", "in progress", "paused"]);
const UNDERWAY = new Set<Status>(["in progress", "paused"]);
const DONE = new Set<Status>(["done", "done, spawned open"]);
export const isOpen = (s: Status): boolean => OPEN.has(s);
export const isUnderway = (s: Status): boolean => UNDERWAY.has(s);
export const isDone = (s: Status): boolean => DONE.has(s);
/* the items that count: a moved one counts once, where it started */
export const own = (items: Item[]): Item[] => items.filter((i) => !i.movedFrom);
function settled(items: Items): void {
  const all = [...items.values()];
  /* what an item spawned, a moved one followed to the item it became: its
     parent's work is not done while that is open */
  const became = (it: Item): Item[] => { const to = it.movedTo ? items.get(it.movedTo) : undefined; return to ? [to, ...became(to)] : []; };
  const below = (id: string): Item[] => all.filter((i) => i.parent === id).flatMap((c) => [c, ...became(c), ...below(c.id)]);
  for (const it of all) it.status = begun(it);
  for (const it of all) if (it.status === "done" && below(it.id).some((c) => isOpen(c.status))) it.status = "done, spawned open";
  for (const it of all) closing(it, below(it.id));
}
const later = (a: Stamp | undefined, b: Stamp | undefined): Stamp | undefined => (!a || (b && b.at > a.at) ? b : a);
function closing(it: Item, under: Item[]): void {
  const tree = [it, ...under];
  if (!under.length || tree.some((x) => isOpen(x.status))) return;
  it.closed = tree.map((x) => x.ended).reduce(later, undefined);
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
  /* in time order: an event logged late, with an earlier time, lands where it belongs */
  const timed = [...events].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  for (const e of timed) {
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
export function counts(items: Item[]): { starting: Tally; added: Tally } {
  const counted = own(items);
  return { starting: tally(counted.filter((i) => i.starting)), added: tally(counted.filter((i) => !i.starting)) };
}
