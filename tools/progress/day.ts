import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Event } from "./events.ts";

export const DIR = "docs/progress";
export const dayEvents = (day: string): Event[] => { const p = join(DIR, day + ".jsonl"); return existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Event) : []; };
export function lastDayEvents(day: string): Event[] {
  const last = existsSync(DIR) ? readdirSync(DIR).map((f) => f.replace(/\.jsonl$/, "")).filter((d) => d < day).sort().pop() : undefined;
  return last ? dayEvents(last) : [];
}
