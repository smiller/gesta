export interface FlashEntry {
  time: string;
  /* the entry on screen when it was raised */
  page: string;
  /* a reader's last chord, named key or control clicked before it was raised; "none" before any */
  action: string;
  kind: "failure" | "refusal";
  text: string;
}
export interface LogPort { read(): FlashEntry[]; write(next: (log: FlashEntry[]) => FlashEntry[]): void }

/* three months back by the calendar, a day the month lacks taken as its
   last: setMonth from May 31 rolled over to March 3 (pin: flashLog.test ›
   three months back from a month's last day) */
function threeMonthsBefore(now: Date): Date {
  const since = new Date(now);
  since.setDate(1);
  since.setMonth(since.getMonth() - 3);
  since.setDate(Math.min(now.getDate(), new Date(since.getFullYear(), since.getMonth() + 1, 0).getDate()));
  return since;
}
const kept = (log: FlashEntry[], now: Date): FlashEntry[] => log.filter((e) => new Date(e.time) >= threeMonthsBefore(now));
export function parseLog(raw: string | null): FlashEntry[] {
  try {
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch { return []; }
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

export function flashLog(port: LogPort, now: () => Date = () => new Date()) {
  return {
    add(e: Omit<FlashEntry, "time">): void {
      const at = now();
      port.write((log) => [...kept(log, at), { time: at.toISOString(), ...e }]);
    },
    entries: (): FlashEntry[] => port.read(),
  };
}
