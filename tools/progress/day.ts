import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Event } from "./events.ts";

export const DIR = "docs/progress";
export const dayEvents = (day: string): Event[] => { const p = join(DIR, day + ".jsonl"); return existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Event) : []; };
/* a log's name is its date alone: a Dropbox conflicted copy sorts among
   the days, and taken for one its items would be carried in (pin:
   day.test › the last day is the latest dated log) */
const DATED = /^(\d{4}-\d{2}-\d{2})\.jsonl$/;
export const lastDay = (names: string[], day: string): string | undefined =>
  names.flatMap((f) => DATED.exec(f)?.[1] ?? []).filter((d) => d < day).sort().pop();
export function lastDayEvents(day: string): Event[] {
  const last = existsSync(DIR) ? lastDay(readdirSync(DIR), day) : undefined;
  return last ? dayEvents(last) : [];
}
