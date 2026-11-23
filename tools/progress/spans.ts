import { replay, spawned, type Event, type Stamp, type Status } from "./events.ts";

export const minutes = (at: string): number => +at.slice(11, 13) * 60 + +at.slice(14, 16);
export type Piece = [number, number];
export interface Span { kind: "span"; id: string; from: Stamp; to?: Stamp; ending: Status; note?: string; whole: number; own: Piece[] }
export interface Gap { kind: "gap"; from: number; to: number }
export interface Order { rows: (Span | Gap)[]; from: number; to: number; working: number; idle: number; inside: number }

type Begun = Omit<Span, "kind" | "whole" | "own">;

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

export function inOrder(events: Event[], end?: string): Order {
  if (!events.length) return { rows: [], from: 0, to: 0, working: 0, idle: 0, inside: 0 };
  const times = events.map((e) => e.at).sort(), from = minutes(times[0]);
  const to = Math.max(end ? minutes(end) : 0, minutes(times[times.length - 1]));
  const items = replay(events), below = spawned(items);
  const all = items.flatMap((i) => i.work.map((w) => ({ id: i.id, ...w }))).sort((a, b) => a.seq - b.seq);
  const reach = (s: Begun): Piece => [minutes(s.from.at), s.to ? minutes(s.to.at) : to];
  const spans = all.map(({ seq: _seq, ...s }): Span => {
    const mine = new Set(below(s.id).map((k) => k.id)), whole = reach(s);
    const under = union(clipped(whole, all.filter((k) => mine.has(k.id)).map(reach)));
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
