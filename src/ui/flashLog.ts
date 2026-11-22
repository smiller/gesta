export interface FlashEntry {
  time: string;
  /* the entry on screen when it was raised */
  page: string;
  /* a reader's last key chord or control clicked before it was raised; "none" before any */
  action: string;
  kind: "failure" | "refusal";
  text: string;
}
export interface LogPort { read(): FlashEntry[]; write(next: (log: FlashEntry[]) => FlashEntry[]): void }

function kept(log: FlashEntry[], now: Date): FlashEntry[] {
  const since = new Date(now);
  since.setMonth(since.getMonth() - 3);
  return log.filter((e) => new Date(e.time) >= since);
}

const MODIFIERS: [keyof Chord, string][] = [["ctrlKey", "⌃"], ["altKey", "⌥"], ["shiftKey", "⇧"], ["metaKey", "⌘"]];
interface Chord { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }
const commanded = (e: Chord): boolean => e.ctrlKey || e.metaKey;
const modifierAlone = (e: Chord): boolean => ["Control", "Meta", "Alt", "Shift"].includes(e.key);
export function chordName(e: Chord): string | null {
  if (!commanded(e) || modifierAlone(e)) return null;
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
