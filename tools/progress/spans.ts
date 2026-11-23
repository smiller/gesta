import type { Event, Stamp, Status } from "./events.ts";

export const minutes = (at: string): number => +at.slice(11, 13) * 60 + +at.slice(14, 16);
export type Piece = [number, number];
export interface Span { kind: "span"; id: string; from: Stamp; to?: Stamp; ending: Status; note?: string; whole: number; own: Piece[] }
export interface Gap { kind: "gap"; from: number; to: number }
export interface Order { rows: (Span | Gap)[]; from: number; to: number; working: number; idle: number; inside: number }

type Begun = Omit<Span, "kind" | "whole" | "own">;
const ENDING: Partial<Record<Event["ev"], Status>> = { stop: "paused", done: "done", drop: "dropped", move: "moved" };
const stamp = (e: Event): Stamp => ({ at: e.at, approx: !!e.approx });
const byTime = (events: Event[]): Event[] => [...events].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));

function ended(open: Map<string, Begun>, e: Event & { id: string }): void {
  const was = open.get(e.id), ending = ENDING[e.ev];
  if (!was || !ending) return;
  was.to = stamp(e);
  was.ending = ending;
  if ("note" in e && e.note) was.note = e.note;
  open.delete(e.id);
}
/* an item carried in under way is at work from the day's start */
const underway = (e: Event): boolean => e.ev === "carry" && !!e.started && !e.stopped;
function begun(timed: Event[]): Begun[] {
  const all: Begun[] = [], open = new Map<string, Begun>();
  for (const e of timed) {
    if (!("id" in e)) continue;
    if (e.ev !== "start" && !underway(e)) { ended(open, e); continue; }
    if (open.has(e.id)) continue;
    const s: Begun = { id: e.id, from: stamp(e), ending: "in progress" };
    all.push(s);
    open.set(e.id, s);
  }
  return all;
}

function union(pieces: Piece[]): Piece[] {
  const out: Piece[] = [];
  for (const [a, b] of [...pieces].sort((x, y) => x[0] - y[0])) {
    const last = out[out.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}
const length = (pieces: Piece[]): number => pieces.reduce((n, [a, b]) => n + b - a, 0);
function without([a, b]: Piece, taken: Piece[]): Piece[] {
  const out: Piece[] = [];
  let at = a;
  for (const [x, y] of taken) {
    if (x > at) out.push([at, x]);
    at = Math.max(at, y);
  }
  if (b > at) out.push([at, b]);
  return out;
}
const clipped = ([a, b]: Piece, pieces: Piece[]): Piece[] => pieces.map(([x, y]): Piece => [Math.max(a, x), Math.min(b, y)]).filter(([x, y]) => y > x);

function parents(events: Event[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const e of events) if ((e.ev === "add" || e.ev === "carry") && e.parent) out.set(e.id, e.parent);
  return out;
}
function spawnedBy(id: string, above: Map<string, string>): (other: string) => boolean {
  return (other) => {
    for (let p = above.get(other); p; p = above.get(p)) if (p === id) return true;
    return false;
  };
}

export function inOrder(events: Event[], end?: string): Order {
  if (!events.length) return { rows: [], from: 0, to: 0, working: 0, idle: 0, inside: 0 };
  const timed = byTime(events), from = minutes(timed[0].at);
  const to = Math.max(end ? minutes(end) : 0, minutes(timed[timed.length - 1].at));
  const all = begun(timed), above = parents(events);
  const reach = (s: Begun): Piece => [minutes(s.from.at), s.to ? minutes(s.to.at) : to];
  const spans = all.map((s): Span => {
    const mine = spawnedBy(s.id, above), whole = reach(s);
    const under = union(clipped(whole, all.filter((k) => mine(k.id)).map(reach)));
    return { kind: "span", ...s, whole: whole[1] - whole[0], own: without(whole, under) };
  });
  return placed(spans, from, to, union(all.map(reach)));
}
function placed(spans: Span[], from: number, to: number, worked: Piece[]): Order {
  const rows: (Span | Gap)[] = [];
  let covered = from, inside = 0;
  for (const s of spans) {
    const a = minutes(s.from.at);
    if (a > covered) rows.push({ kind: "gap", from: covered, to: a });
    if (a < covered) inside++;
    rows.push(s);
    covered = Math.max(covered, s.to ? minutes(s.to.at) : to);
  }
  if (to > covered) rows.push({ kind: "gap", from: covered, to });
  const idle = rows.reduce((n, r) => n + (r.kind === "gap" ? r.to - r.from : 0), 0);
  return { rows, from, to, working: length(worked), idle, inside };
}
