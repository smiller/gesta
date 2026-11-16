import { readFileSync } from "node:fs";
import { replay, isOpen, type Event, type Item } from "./events.ts";
import { dayEvents } from "./day.ts";
import { logged, today, clock } from "./log.ts";

const LINE = 300;
export function woken(items: Item[], output: string): { id: string; line: string }[] {
  const lines = output.split("\n");
  return items.filter((i) => i.watch && isOpen(i.status) && i.status !== "in progress").flatMap((i) => {
    const line = lines.find((l) => l.includes(i.watch!));
    return line === undefined ? [] : [{ id: i.id, line: line.trim().slice(0, LINE) }];
  });
}
/* a day not begun has nothing to wake, and no begin for a start to follow */
export function wake(output: string, day = today()): string[] {
  const events = dayEvents(day);
  if (!events.some((e) => e.ev === "begin")) return [];
  const up = woken(replay(events), output);
  if (!up.length) return [];
  const at = day + "T" + clock();
  const starts = up.map((w): Event => ({ at, ev: "start", id: w.id, note: "woken by a Helium run: " + w.line }));
  return [...up.map((w) => w.id + " reactivates: " + w.line), ...logged(day, starts)];
}
/* `node tools/progress/wake.ts` < a run's output */
if (import.meta.url === "file://" + process.argv[1]) for (const l of wake(readFileSync(0, "utf8"))) console.log(l);
