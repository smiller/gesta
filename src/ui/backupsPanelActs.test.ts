import { describe, it, expect } from "vitest";
import { backupsPanel } from "./backupsPanelActs.ts";
import { screenState } from "./screen.svelte.ts";
import { memImageStore } from "../store/store.ts";

const settle = () => new Promise((r) => setTimeout(r, 0));
async function panel(cache: Record<string, string>, stored: string[], hold = false) {
  const images = memImageStore();
  for (const k of stored) await images.set(k, new Uint8Array([1]));
  const bk = screenState(5).backups;
  const shown: string[] = [], released: string[] = [];
  let n = 0;
  const held: (() => void)[] = [];
  const p = backupsPanel({
    bk, canPick: () => true, reader: false, backup: () => ({ configured: true, trouble: "", folder: "gesta-backups" }),
    layer: { cache, warmed: true, storeReadFailed: false }, images, flushSave: () => Promise.resolve(true), raise: (() => {}) as never, confirm: () => true,
    showPicture: (key) => { shown.push(key); const src = "blob:" + ++n; return hold ? new Promise((r) => held.push(() => r(src))) : Promise.resolve(src); }, releasePicture: (url) => { released.push(url); },
  });
  return { p, bk, shown, released, held };
}

describe("the backups panel's unused pictures", () => {
  it("each picture no entry names, by its own name, shown from the store", async () => {
    const { p, bk, shown } = await panel({ "2026-10-30": "a day ![](2026-10-30-img-2.webp)" }, ["journal/2026/2026-10-30-img-1.webp", "journal/2026/2026-10-30-img-2.webp"]);
    p.read();
    await settle(); await settle();
    expect(shown).toEqual(["journal/2026/2026-10-30-img-1.webp"]);
    expect(bk.unused).toEqual([{ name: "2026-10-30-img-1.webp", src: "blob:1" }]);
  });
  it("a read again lets the pictures it showed before go", async () => {
    const { p, released } = await panel({ "2026-10-30": "a day" }, ["journal/2026/2026-10-30-img-1.webp"]);
    p.read();
    await settle(); await settle();
    p.read();
    await settle(); await settle();
    expect(released).toEqual(["blob:1"]);
  });
  it("a picture arriving after the panel was read again is let go, not shown", async () => {
    const { p, bk, released, held } = await panel({ "2026-10-30": "a day" }, ["journal/2026/2026-10-30-img-1.webp"], true);
    p.read();
    await settle(); await settle();
    p.read();
    await settle(); await settle();
    held[0]();
    await settle();
    expect(released).toEqual(["blob:1"]);
    expect(bk.unused.map((x) => x.src)).toEqual([null]);
  });
});
