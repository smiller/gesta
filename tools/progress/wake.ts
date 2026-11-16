import { readFileSync } from "node:fs";
import { replay, isOpen, type Event, type Item } from "./events.ts";
import { dayEvents, lastDayEvents } from "./day.ts";
import { logged, opened, today, clock } from "./log.ts";

const LINE = 300;
export function woken(items: Item[], output: string): { id: string; line: string }[] {
  const lines = output.split("\n");
  return items.filter((i) => i.watch && isOpen(i.status) && i.status !== "in progress").flatMap((i) => {
    const line = lines.find((l) => l.includes(i.watch!));
    return line === undefined ? [] : [{ id: i.id, line: line.trim().slice(0, LINE) }];
  });
}
/* on a day not begun, what the begin would carry in is read, the begin
   going ahead of the starts; nothing woken, nothing written, so a run
   alone never begins a day (pin: wake.test › on a day not begun) */
export function wakeEvents(today: Event[], last: () => Event[], output: string, at: string): Event[] {
  const owed = opened(today, last, at);
  const up = woken(replay([...today, ...owed]), output);
  return up.length ? [...owed, ...up.map((w): Event => ({ at, ev: "start", id: w.id, note: "woken by a Helium run: " + w.line }))] : [];
}
export function wake(output: string, day = today()): string[] {
  const events = wakeEvents(dayEvents(day), () => lastDayEvents(day), output, day + "T" + clock());
  if (!events.length) return [];
  const out = logged(day, events);
  if ("refused" in out) return ["wake refused: " + out.refused];
  const woke = events.flatMap((e) => (e.ev === "start" ? [e.id + " reactivates: " + e.note] : []));
  return [...woke, ...out.lines];
}
/* `node tools/progress/wake.ts` < a run's output */
if (import.meta.url === "file://" + process.argv[1]) for (const l of wake(readFileSync(0, "utf8"))) console.log(l);
