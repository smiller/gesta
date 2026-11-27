import type { Screen } from "./screen.svelte.ts";
import { troubleWords } from "../model/alertText.ts";

type Panel = Screen["backups"];
export type TopLine =
  | { role: "setup" | "resume"; text: string }
  | { role: "status"; text: string; trouble: boolean; change: boolean }
  | { role: "folder"; lead: string; name: string };
export interface BackupsLines {
  top: TopLine[];
  unused: { heading: string; about: string; button: string } | null;
  overHalf: { about: string; text: string } | null;
}

const NO_PICKER = "Automatic folder backups need a Chromium browser (Helium or Chrome). Export needs one too, so here there is no way to write a copy out.";
const ABOUT_UNUSED = "Pictures stored in Gesta that no entry shows — most often one pasted and then deleted from the text. No backup holds them, so removing them is for good.";
const inTrouble = (b: Panel): boolean => b.trouble !== "none";
const changes = (b: Panel): boolean => b.canPick && b.configured && b.warm === "ok";

/* AN UNLOADED JOURNAL OUTRANKS EVERY OTHER STATUS: no backup runs until it
   is in, and "Automatic backups are on." would be false exactly when a reader
   most needs it true (pin: backupsModel.test › a journal not in outranks) */
function status(b: Panel): { text: string; trouble: boolean } | null {
  if (!b.canPick) return { text: NO_PICKER, trouble: false };
  if (!b.configured) return null;
  if (b.warm !== "ok") return { text: b.warm === "failed" ? "Couldn’t load entries — backups are paused until you reload." : "Still loading — backups start once the journal is in.", trouble: true };
  if (inTrouble(b)) return { text: troubleWords(b.trouble), trouble: true };
  return b.folder ? null : { text: "Automatic backups are on.", trouble: false };
}
function folder(b: Panel): TopLine | null {
  if (!changes(b) || !b.folder) return null;
  return { role: "folder", lead: inTrouble(b) ? "Folder:" : "Backing up to", name: b.folder };
}
function button(b: Panel): TopLine | null {
  if (!b.canPick) return null;
  if (!b.configured) return { role: "setup", text: "Set up automatic backups…" };
  return inTrouble(b) ? { role: "resume", text: "Resume backups" } : null;
}
function statusLine(b: Panel, named: TopLine | null): TopLine | null {
  const said = status(b);
  return said ? { role: "status", ...said, change: changes(b) && !named } : null;
}
function top(b: Panel): TopLine[] {
  const named = folder(b);
  return [button(b), statusLine(b, named), named].filter((l): l is TopLine => l !== null);
}
function unused(n: number): BackupsLines["unused"] {
  if (!n) return null;
  return { heading: n === 1 ? "1 unused picture." : n + " unused pictures.", about: ABOUT_UNUSED, button: n === 1 ? "Remove this picture" : "Remove these " + n + " pictures" };
}
function overHalf(b: Panel): BackupsLines["overHalf"] {
  if (b.unused.length || !b.overHalf) return null;
  return { about: ABOUT_UNUSED, text: b.overHalf + " such pictures — more than half of all stored, which looks like a journal read short rather than a tidy-up, so none are offered for removal." };
}
export const backupsLines = (b: Panel): BackupsLines => ({ top: top(b), unused: unused(b.unused.length), overHalf: overHalf(b) });
