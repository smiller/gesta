import type { Screen } from "./screen.svelte.ts";

export function backupsStatus(b: Screen["backups"]): { text: string; trouble: boolean } | null {
  if (!b.canPick) return { text: "Automatic folder backups need a Chromium browser (Helium or Chrome). Export needs one too, so here there is no way to write a copy out.", trouble: false };
  if (b.configured && b.warm !== "ok") return { text: b.warm === "failed" ? "Couldn’t load entries — backups are paused until you reload." : "Still loading — backups start once the journal is in.", trouble: true };
  if (b.configured && b.trouble) return { text: b.trouble, trouble: true };
  if (b.configured) return { text: "Automatic backups are on.", trouble: false };
  return null;
}
