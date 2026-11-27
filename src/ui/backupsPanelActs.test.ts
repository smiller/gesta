import { describe, it, expect } from "vitest";
import { backupsPanel, type BackupsPanel } from "./backupsPanelActs.ts";
import { screenState } from "./screen.svelte.ts";
import { memImageStore } from "../store/store.ts";

const settle = () => new Promise((r) => setTimeout(r, 0));
async function panel(cache: Record<string, string>, stored: string[], hold = false, flushes: (() => Promise<boolean>)[] = []) {
  const images = memImageStore();
  for (const k of stored) await images.set(k, new Uint8Array([1]));
  const bk = screenState(5).backups;
  const shown: string[] = [], released: string[] = [];
  let n = 0;
  const held: (() => void)[] = [];
  const p = backupsPanel({
    bk, canPick: () => true, reader: false,
    layer: { cache, warmed: true, storeReadFailed: false }, images, flushSave: () => (flushes.shift() ?? (() => Promise.resolve(true)))(), raise: (() => {}) as never, confirm: () => true,
    showPicture: (key) => { shown.push(key); const src = "blob:" + ++n; return hold ? new Promise((r) => held.push(() => r(src))) : Promise.resolve(src); }, releasePicture: (url) => { released.push(url); },
  });
  p.changed({ configured: true, trouble: "", folder: "gesta-backups" });
  return { p, bk, shown, released, held };
}
async function lateArrival(end: (p: BackupsPanel) => void) {
  const got = await panel({ "2026-10-30": "a day" }, ["journal/2026/2026-10-30-img-1.webp"], true);
  got.p.open();
  await settle(); await settle();
  end(got.p);
  await settle(); await settle();
  got.held[0]();
  await settle();
  return got;
}

describe("the backups panel's unused pictures", () => {
  it("each picture no entry names, kept by its store key, named by its own name, shown from the store", async () => {
    const { p, bk, shown } = await panel({ "2026-10-30": "a day ![](2026-10-30-img-2.webp)" }, ["journal/2026/2026-10-30-img-1.webp", "journal/2026/2026-10-30-img-2.webp"]);
    p.open();
    await settle(); await settle();
    expect(shown).toEqual(["journal/2026/2026-10-30-img-1.webp"]);
    expect(bk.unused).toEqual([{ key: "journal/2026/2026-10-30-img-1.webp", name: "2026-10-30-img-1.webp", src: "blob:1" }]);
  });
  it("a read again lets the pictures it showed before go", async () => {
    const { p, released } = await panel({ "2026-10-30": "a day" }, ["journal/2026/2026-10-30-img-1.webp"]);
    p.open();
    await settle(); await settle();
    p.reread();
    await settle(); await settle();
    expect(released).toEqual(["blob:1"]);
  });
  it("a picture arriving after the panel was read again is let go, not shown", async () => {
    const { bk, released } = await lateArrival((p) => p.reread());
    expect(released).toEqual(["blob:1"]);
    expect(bk.unused.map((x) => x.src)).toEqual([null]);
  });
  it("a picture arriving after the panel closed is let go, not shown", async () => {
    const { bk, released } = await lateArrival((p) => p.close());
    expect(released).toEqual(["blob:1"]);
    expect(bk.unused).toEqual([]);
  });
  it("two reads overlapping let the first list's pictures go when the second lands", async () => {
    let late = (): void => {};
    const second = () => new Promise<boolean>((r) => { late = () => r(true); });
    const { p, bk, released } = await panel({ "2026-10-30": "a day" }, ["journal/2026/2026-10-30-img-1.webp"], false, [() => Promise.resolve(true), second]);
    p.open();
    p.reread();
    await settle(); await settle();
    expect(bk.unused.map((x) => x.src)).toEqual(["blob:1"]);
    late();
    await settle(); await settle();
    expect(released).toEqual(["blob:1"]);
  });
});

describe("the backups panel, open and closed", () => {
  const ONE = ["journal/2026/2026-10-30-img-1.webp"];
  it("closing lets every picture go and holds none", async () => {
    const { p, bk, released } = await panel({ "2026-10-30": "a day" }, ONE);
    p.open();
    await settle(); await settle();
    p.close();
    expect(released).toEqual(["blob:1"]);
    expect(bk.unused).toEqual([]);
  });
  it("a change from the runner while open redraws the panel's lines and reads no picture", async () => {
    const { p, bk, shown } = await panel({ "2026-10-30": "a day" }, ONE);
    p.open();
    await settle(); await settle();
    p.changed({ configured: true, trouble: "backups paused — click to resume", folder: "gesta-backups" });
    await settle(); await settle();
    expect(shown.length).toBe(1);
    expect(bk.trouble).toBe("backups paused — click to resume");
    expect(bk.unused.map((x) => x.src)).toEqual(["blob:1"]);
  });
  it("a change while closed is there at the next open", async () => {
    const { p, bk } = await panel({ "2026-10-30": "a day" }, ONE);
    p.changed({ configured: true, trouble: "", folder: "elsewhere" });
    p.open();
    expect(bk.folder).toBe("elsewhere");
  });
  it("the journal's read ending while the panel is closed reads no picture", async () => {
    const { p, shown } = await panel({ "2026-10-30": "a day" }, ONE);
    p.reread();
    await settle(); await settle();
    expect(shown).toEqual([]);
  });
});
