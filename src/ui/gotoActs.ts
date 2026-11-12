import type { Session } from "../session.ts";
import type { EntryLayer } from "../store/entries.ts";
import type { Journal } from "../store/reference.ts";
import type { Screen } from "./screen.svelte.ts";
import { gotoLevels, gotoPick } from "./gotoModel.ts";

export interface GotoDeps {
  gt: Screen["goto"];
  session: Pick<Session, "current" | "flushSave" | "focusText" | "goto">;
  layer: Pick<EntryLayer, "cache">;
  journal: Journal;
  opened(): void;
  focusRow(): void;
}
export interface GotoRow { toggle(open: boolean): void; pick(level: number, value: string, ns?: string): void; reanswer(): void }
export function gotoActs(d: GotoDeps): GotoRow {
  const { gt, session, layer, journal, opened, focusRow } = d;
  /* THE GO TO ROW: built fresh on every open — the lazy fill that keeps
     the list walks off the navigation hot path — with the first select
     focused; emptied on close. A terminal pick closes the row BEFORE the
     hash write, since a pick of the open entry moves no hash. */
  const gotoWorld = () => ({ keys: Object.keys(layer.cache), cache: layer.cache, journal });
  let gotoPicked = false;
  const gotoRow = (open: boolean): void => {
    if (gt.open === open) return;
    gt.open = open;
    if (!open) { gt.levels = []; session.focusText(); return; }
    gotoPicked = false;
    opened();
    session.flushSave();
    const c = session.current;
    gt.levels = gotoLevels(gotoWorld(), c.date, c.tag);
    setTimeout(() => focusRow(), 0);
  };
  const toggleGoto = gotoRow;
  const pickGoto = (level: number, value: string, ns?: string): void => {
    const c = session.current;
    gotoPicked = true;
    const out = gotoPick(gotoWorld(), { date: c.date, tag: c.tag }, gt.levels, { level: level, value: value, ns: ns });
    if (!out) return;
    if ("jump" in out) { gotoRow(false); session.goto(out.jump, "already here"); return; }
    gt.levels = out.levels;
  };
  const reanswer = (): void => {
    if (!gt.open || gotoPicked) return;
    const held = !!document.activeElement?.closest(".page-goto"), c = session.current;
    gt.levels = gotoLevels(gotoWorld(), c.date, c.tag);
    if (held) setTimeout(() => focusRow(), 0);
  };
  return { toggle: toggleGoto, pick: pickGoto, reanswer };
}
