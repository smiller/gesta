import type { Session } from "../session.ts";
import type { EntryLayer } from "../store/entries.ts";
import type { ImageStore } from "../store/store.ts";
import type { BackupState } from "../store/backup.ts";
import type { Screen } from "./screen.svelte.ts";
import { sweepPlan } from "../store/pictures.ts";
import { refuseCold, loadState } from "./journalLoad.ts";
import { counted } from "./counted.ts";
import { said, type Raise, type Said } from "../model/alertText.ts";

export interface BackupsPanelDeps {
  bk: Screen["backups"];
  canPick(): boolean;
  reader: boolean;
  layer: Pick<EntryLayer, "cache" | "warmed" | "storeReadFailed">;
  images: Pick<ImageStore, "keys" | "del">;
  flushSave: Session["save"]["flush"];
  raise: Raise;
  confirm(text: string): boolean;
  showPicture(key: string): Promise<string | null>;
  releasePicture(url: string): void;
}
export interface BackupsPanel {
  changed(state: BackupState): void;
  /* the pictures are held from open to close, and read again only on a reread
     (pin: backupsPanelActs.test › closing lets every picture go) (pin:
     backupsPanelActs.test › a change from the runner while open) */
  open(): void;
  close(): void;
  reread(): void;
  sweep(): void;
}

const sweptLine = (removed: number, n: number): Said => (removed === n ? said("picturesRemoved", { n }) : said("picturesPartlyRemoved", { removed, n }));

export function backupsPanel(d: BackupsPanelDeps): BackupsPanel {
  const { bk, layer, images, flushSave, raise } = d;
  const plannedSweep = (): Promise<ReturnType<typeof sweepPlan>> => flushSave().then(() => images.keys()).then((keys) => sweepPlan(keys, layer.cache));
  const warmth = (): Screen["backups"]["warm"] => {
    const state = loadState(layer);
    return state === "in" ? "ok" : state;
  };
  let opened = false;
  const letGo = (): void => { for (const p of bk.unused) if (p.src) d.releasePicture(p.src); };
  const shown = (keys: string[]): void => {
    letGo();
    bk.unused = keys.map((k) => ({ key: k, name: k.slice(k.lastIndexOf("/") + 1), src: null }));
    const list = bk.unused;
    /* a picture read after the panel was read again or closed belongs to no list it shows (pin: backupsPanelActs.test › a picture arriving after) */
    keys.forEach((k, i) => d.showPicture(k).then((src) => {
      if (!src) return;
      if (bk.unused === list) list[i].src = src; else d.releasePicture(src);
    }, () => {}));
  };
  const changed = (state: BackupState): void => { Object.assign(bk, state); };
  const read = (): void => {
    letGo();
    Object.assign(bk, { canPick: d.canPick(), warm: warmth(), unused: [], overHalf: 0 });
    if (d.reader || bk.warm !== "ok") return;
    plannedSweep().then((plan) => {
      if (!opened) return;
      shown(plan.drop);
      bk.overHalf = plan.refused;
    }, () => {});
  };
  const open = (): void => { opened = true; read(); };
  const close = (): void => { opened = false; letGo(); bk.unused = []; bk.overHalf = 0; };
  const reread = (): void => { if (opened) read(); };
  const swept = (removed: number, n: number): void => {
    raise(sweptLine(removed, n));
    reread();
  };
  const remove = (drop: string[]): Promise<void> =>
    Promise.all(drop.map((k) => images.del(k).then(() => true, () => false))).then((gone) => swept(gone.filter(Boolean).length, drop.length));
  /* counted again at the click, the journal having moved since the panel opened */
  const sweep = (): void => {
    if (refuseCold(layer, raise)) return;
    plannedSweep().then((plan) => {
      const n = plan.drop.length;
      if (!n) { reread(); return; }
      if (!d.confirm("Remove the " + counted(n, " picture", " pictures") + " no entry names? This can’t be undone.")) return;
      return remove(plan.drop);
    }, () => { raise("picturesUnreadable"); });
  };
  return { changed, open, close, reread, sweep };
}
