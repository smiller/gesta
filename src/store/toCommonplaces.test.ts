import { test, expect } from "vitest";
import { toCommonplaces, afterLoad } from "./toCommonplaces.ts";
import { memImageStore } from "./store.ts";
import { pictureMoves } from "./pictures.ts";

function rig(cache: Record<string, string>, failing: string[] = []) {
  const kept: Record<string, string>[] = [];
  const layer = {
    cache,
    setEntry: (k: string, md: string) => { if (failing.includes(k)) return Promise.resolve(false); cache[k] = md; return Promise.resolve(true); },
    removeEntry: (k: string) => { delete cache[k]; return Promise.resolve(true); },
    storeReadFailed: false,
  };
  const images = memImageStore();
  const move = () => toCommonplaces({ layer, pictures: pictureMoves(images), kept: [(m) => kept.push(m)] });
  return { cache, images, kept, move };
}

test("every page becomes a commonplace under the same name, its sub-entries with it", async () => {
  const r = rig({ "page/Books": "# Books", "page/Books/Essay": "# The essay", "2026-09-06": "a day" });
  expect(await r.move()).toBe(true);
  expect(Object.keys(r.cache).sort()).toEqual(["2026-09-06", "commonplace/Books", "commonplace/Books/Essay"]);
  expect(r.cache["commonplace/Books/Essay"]).toBe("# The essay");
  expect(r.kept).toEqual([{ "page/Books": "commonplace/Books", "page/Books/Essay": "commonplace/Books/Essay" }]);
});

test("every link into a page, from any entry, follows it, its payload kept", async () => {
  const r = rig({
    "page/Books": "# Books\n\n[the essay](#page/Books/Essay)\n",
    "page/Books/Essay": "# The essay",
    "2026-09-06": "[Books](#page/Books) and [a line](#page/Books/Essay?h=x) and [Horace](#bookshelf/Horace)\n",
  });
  await r.move();
  expect(r.cache["commonplace/Books"]).toContain("(#commonplace/Books/Essay)");
  expect(r.cache["2026-09-06"]).toContain("(#commonplace/Books)");
  expect(r.cache["2026-09-06"]).toContain("(#commonplace/Books/Essay?h=x)");
  expect(r.cache["2026-09-06"]).toContain("(#bookshelf/Horace)");
});

test("a page's pictures move with it, renamed where its text names them", async () => {
  const r = rig({ "page/Verdour": "# Verdour\n\n![](page--Verdour-img-1.webp)\n" });
  await r.images.set("page/page--Verdour-img-1.webp", new Uint8Array([1, 2, 3]));
  await r.move();
  expect(r.cache["commonplace/Verdour"]).toContain("](commonplace--Verdour-img-1.webp)");
  expect((await r.images.get("commonplace/commonplace--Verdour-img-1.webp"))?.bytes).toEqual(new Uint8Array([1, 2, 3]));
  expect(await r.images.get("page/page--Verdour-img-1.webp")).toBeFalsy();
});

test("with no page left nothing moves; a write that does not land leaves every page standing, to move at the next start", async () => {
  expect(await rig({ "2026-09-06": "a day" }).move()).toBe(false);
  const r = rig({ "page/A": "a", "page/B": "b" }, ["commonplace/B"]);
  expect(await r.move()).toBe(false);
  expect(r.cache["page/A"]).toBe("a");
  expect(r.cache["page/B"]).toBe("b");
  expect(r.kept).toEqual([]);
});

test("a picture that cannot be copied leaves every page and its pictures standing", async () => {
  const r = rig({ "page/Verdour": "![](page--Verdour-img-1.webp)\n" });
  await r.images.set("page/page--Verdour-img-1.webp", new Uint8Array([1]));
  const kept: Record<string, string>[] = [];
  const failing = { copyPicture: () => Promise.reject(new Error("blocked")), removePictures: () => Promise.resolve() };
  expect(await toCommonplaces({ layer: { cache: r.cache, setEntry: () => Promise.resolve(true), removeEntry: () => Promise.resolve(true), storeReadFailed: false }, pictures: failing, kept: [(m) => kept.push(m)] })).toBe(false);
  expect(r.cache["page/Verdour"]).toBeDefined();
  expect(kept).toEqual([]);
});

test("after the load nothing moves in the read-only reader or over a store that could not be read", async () => {
  const layer = { cache: { "page/A": "a" } as Record<string, string>, setEntry: () => Promise.resolve(true), removeEntry: () => Promise.resolve(true), storeReadFailed: false };
  const parts = { pictures: { copyPicture: () => Promise.resolve(true), removePictures: () => Promise.resolve() }, kept: [] };
  expect(await afterLoad({ ...parts, layer, readOnly: true })()).toBe(false);
  expect(await afterLoad({ ...parts, layer: { ...layer, storeReadFailed: true }, readOnly: false })()).toBe(false);
  expect(await afterLoad({ ...parts, layer, readOnly: false })()).toBe(true);
});
