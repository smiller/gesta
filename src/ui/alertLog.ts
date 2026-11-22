import type { Kept } from "./alertLedger.svelte.ts";

export interface AlertEntry {
  time: string;
  /* the entry on screen when it was raised */
  page: string;
  /* a reader's last chord, named key or control clicked before it was raised; "none" before any */
  action: string;
  kind: Kept;
  text: string;
}
export interface LogPort { read(): AlertEntry[]; write(next: (log: AlertEntry[]) => AlertEntry[]): void }

/* three months back by the calendar, a day the month lacks taken as its
   last: setMonth from May 31 rolled over to March 3 (pin: alertLog.test ›
   three months back from a month's last day) */
function threeMonthsBefore(now: Date): Date {
  const since = new Date(now);
  since.setDate(1);
  since.setMonth(since.getMonth() - 3);
  since.setDate(Math.min(now.getDate(), new Date(since.getFullYear(), since.getMonth() + 1, 0).getDate()));
  return since;
}
const kept = (log: AlertEntry[], now: Date): AlertEntry[] => log.filter((e) => new Date(e.time) >= threeMonthsBefore(now));
const KIND_BEFORE: Record<string, Kept> = { failure: "error", refusal: "warning" };
export function parseLog(raw: string | null): AlertEntry[] {
  try {
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.map((e: AlertEntry) => ({ ...e, kind: KIND_BEFORE[e.kind] ?? e.kind })) : [];
  } catch { return []; }
}

/* once: the log kept under its key before, set ahead of what its own key
   holds, the old key cleared so it is never read again */
export function carryLog(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">, from: string, to: string): void {
  const before = storage.getItem(from);
  if (before === null) return;
  storage.setItem(to, JSON.stringify([...parseLog(before), ...parseLog(storage.getItem(to))]));
  storage.removeItem(from);
}

const MODIFIERS: [keyof Chord, string][] = [["ctrlKey", "⌃"], ["altKey", "⌥"], ["shiftKey", "⇧"], ["metaKey", "⌘"]];
interface Chord { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }
const commanded = (e: Chord): boolean => e.ctrlKey || e.metaKey;
const modifierAlone = (e: Chord): boolean => ["Control", "Meta", "Alt", "Shift"].includes(e.key);
const acted = (e: Chord): boolean => commanded(e) || e.key.length > 1;
/* a chord or a named key (Tab, Enter) is an action; a letter typed is not,
   and leaves the last action standing */
export function chordName(e: Chord): string | null {
  if (modifierAlone(e) || !acted(e)) return null;
  return MODIFIERS.filter(([m]) => e[m]).map(([, sign]) => sign).join("") + (e.key.length === 1 ? e.key.toUpperCase() : e.key);
}

export function alertLog(port: LogPort, now: () => Date = () => new Date()) {
  return {
    add(e: Omit<AlertEntry, "time">): void {
      const at = now();
      port.write((log) => [...kept(log, at), { time: at.toISOString(), ...e }]);
    },
    entries: (): AlertEntry[] => port.read(),
  };
}
