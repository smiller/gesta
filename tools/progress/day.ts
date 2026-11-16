import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Event } from "./events.ts";

export const DIR = "docs/progress";
const pad = (n: number): string => String(n).padStart(2, "0");
export const today = (d = new Date()): string => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const clock = (d = new Date()): string => pad(d.getHours()) + ":" + pad(d.getMinutes());
export const dayEvents = (day: string): Event[] => { const p = join(DIR, day + ".jsonl"); return existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Event) : []; };
/* a log's name is its date alone: a Dropbox conflicted copy sorts among
   the days, and taken for one its items would be carried in (pin:
   day.test › the last day is the latest dated log) */
const DATED = /^(\d{4}-\d{2}-\d{2})\.jsonl$/;
const dated = (names: string[]): string[] => names.flatMap((f) => DATED.exec(f)?.[1] ?? []).sort();
export const lastDay = (names: string[], day: string): string | undefined => dated(names).filter((d) => d < day).pop();
export interface Days { before?: string; after?: string }
export const neighbours = (names: string[], day: string): Days => ({ before: lastDay(names, day), after: dated(names).find((d) => d > day) });
export const logNames = (): string[] => (existsSync(DIR) ? readdirSync(DIR) : []);
export function lastDayEvents(day: string): Event[] {
  const last = lastDay(logNames(), day);
  return last ? dayEvents(last) : [];
}
