import { test, expect, vi } from "vitest";
import { picturePaste } from "./picturePaste.ts";
import { memImageStore } from "../store/store.ts";
import { entryFile } from "../store/names.ts";

const BYTES = new Uint8Array([1]);
const file = {} as File;
const settle = () => new Promise((r) => setTimeout(r, 0));

function paste(md = "") {
  const images = memImageStore(), raised: string[] = [], inserted: string[] = [];
  const here = { ekey: "2026-11-27", md: false };
  const set = images.set.bind(images);
  const held: (() => void)[] = [];
  let holding = false;
  images.set = (id, b) => (holding ? new Promise<void>((r) => held.push(() => { void set(id, b).then(r); })) : set(id, b));
  const p = picturePaste({
    where: () => ({ ...here }), locked: () => false, decode: () => Promise.resolve(BYTES),
    place: () => ({ at: entryFile("2026-11-27"), md }), images,
    insert: (name) => { inserted.push(name); }, raise: ((k: string) => { raised.push(k); }) as never,
  });
  return { p, images, raised, inserted, here, hold: () => { holding = true; }, release: () => { holding = false; held.splice(0).forEach((go) => go()); } };
}

test("a picture pasted is stored under the next free name and put in the entry it was pasted into", async () => {
  const s = paste("![](2026-11-27-img-1.webp)\n");
  await s.images.set("journal/2026/2026-11-27-img-2.webp", BYTES);
  s.p(file);
  await settle();
  expect(s.inserted).toEqual(["2026-11-27-img-3.webp"]);
  expect(await s.images.keys()).toContain("journal/2026/2026-11-27-img-3.webp");
});

test("another entry opened while the picture is stored: it is not put there, and the paste says it had nowhere to land", async () => {
  const s = paste();
  s.hold();
  s.p(file);
  await settle();
  s.here.ekey = "commonplace/B";
  s.release();
  await settle();
  expect(s.inserted).toEqual([]);
  expect(s.raised).toEqual(["pictureNowhere"]);
});

test("a picture pasted while the last is still being stored is refused, and the last lands under its own name", async () => {
  const s = paste();
  s.hold();
  s.p(file);
  await settle();
  s.p(file);
  s.release();
  await settle();
  expect(s.raised).toEqual(["pictureOneAtATime"]);
  expect(s.inserted).toEqual(["2026-11-27-img-1.webp"]);
  s.p(file);
  await settle();
  expect(s.inserted).toEqual(["2026-11-27-img-1.webp", "2026-11-27-img-2.webp"]);
});

test("a picture that cannot be read says so, and the next paste is taken", async () => {
  const s = paste();
  vi.spyOn(console, "error").mockImplementation(() => {});
  const p = picturePaste({ where: () => s.here, locked: () => false, decode: () => Promise.reject(new Error("bad")), place: () => ({ at: entryFile("2026-11-27"), md: "" }), images: s.images, insert: () => {}, raise: ((k: string) => { s.raised.push(k); }) as never });
  p(file);
  await settle();
  p(file);
  await settle();
  expect(s.raised).toEqual(["pictureUnreadable", "pictureUnreadable"]);
});
