import type { Session } from "../session.ts";
import type { EntryLayer } from "../store/entries.ts";
import type { ImageStore } from "../store/store.ts";
import type { Backup } from "../store/backup.ts";
import type { Screen } from "./screen.svelte.ts";
import { sweepPlan } from "../store/pictures.ts";
import { refuseCold } from "./lifecycle.ts";

export interface BackupsPanelDeps {
  bk: Screen["backups"];
  canPick(): boolean;
  reader: boolean;
  backup: () => Pick<Backup, "configured" | "trouble">;
  layer: Pick<EntryLayer, "cache" | "warmed" | "storeReadFailed">;
  images: Pick<ImageStore, "keys" | "del">;
  flushSave: Session["flushSave"];
  say(text: string, ms?: number): void;
  confirm(text: string): boolean;
}
export interface BackupsPanel { read(): void; sweep(): void }

const plural = (n: number): string => (n === 1 ? "" : "s");
const sweptLine = (removed: number, n: number): string =>
  removed === n ? "removed " + n + " unused picture" + plural(n) : "removed " + removed + " of " + n + " unused pictures — the rest would not go";

export function backupsPanel(d: BackupsPanelDeps): BackupsPanel {
  const { bk, layer, images, flushSave, say } = d;
  const plannedSweep = (): Promise<ReturnType<typeof sweepPlan>> => flushSave().then(() => images.keys()).then((keys) => sweepPlan(keys, layer.cache));
  const warmth = (): Screen["backups"]["warm"] => {
    if (layer.storeReadFailed) return "failed";
    return layer.warmed ? "ok" : "loading";
  };
  const read = (): void => {
    const b = d.backup();
    Object.assign(bk, { canPick: d.canPick(), configured: b.configured, trouble: b.trouble, warm: warmth(), unused: 0, overHalf: 0 });
    if (d.reader || bk.warm !== "ok") return;
    plannedSweep().then((plan) => {
      bk.unused = plan.drop.length;
      bk.overHalf = plan.refused;
    }, () => {});
  };
  const swept = (removed: number, n: number): void => {
    say(sweptLine(removed, n), 3000);
    read();
  };
  const remove = (drop: string[]): Promise<void> =>
    Promise.all(drop.map((k) => images.del(k).then(() => true, () => false))).then((gone) => swept(gone.filter(Boolean).length, drop.length));
  /* counted again at the click, the journal having moved since the panel opened */
  const sweep = (): void => {
    if (refuseCold(layer, say)) return;
    plannedSweep().then((plan) => {
      const n = plan.drop.length;
      if (!n) { read(); return; }
      if (!d.confirm("Remove the " + n + " picture" + plural(n) + " no entry names? This can’t be undone.")) return;
      return remove(plan.drop);
    }, () => { say("couldn’t read the pictures", 3000); });
  };
  return { read, sweep };
}
