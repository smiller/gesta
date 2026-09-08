// The export walk over the cache and the image store.
import { test, expect } from "vitest";
import { exportEntries, imageRefs, archiveRoots, splitKey } from "./exportEntries.ts";
import { memImageStore } from "./store.ts";
import { filePath } from "./files.ts";

test("imageRefs: relative refs, bare or <bracketed>, unwrapped and deduplicated; the rest is the browser's", () => {
  expect(imageRefs("no pictures")).toEqual([]);
  expect(imageRefs("![](a-img-1.webp) ![x](<Trip Log-img-2.webp>) ![](a-img-1.webp) ![](https://x/y.png) ![](data:image/png;base64,AA) ![](/abs.png)"))
    .toEqual(["a-img-1.webp", "Trip Log-img-2.webp"]);
});

test("splitKey and archiveRoots read the key alone", () => {
  expect(splitKey("2026-01-05")).toEqual(["2026-01-05", null]);
  expect(splitKey("page/A/B")).toEqual(["page", "A/B"]);
  expect(archiveRoots(["2026-01-05", "page/Recipes/Bread", "bookshelf/Dante/Inferno/1"])).toEqual(["journal/2026", "page/Recipes", "bookshelf/Dante"]);
});

test("exportEntries: a doc per non-blank entry under its path, sidecars beside it, blanks skipped", async () => {
  const images = memImageStore();
  await images.set("page/Trip Log-img-1.webp", new Uint8Array([1]));
  const cache = {
    "2026-01-05": "# A day\n", "2026-01-05/morning": "tagged", "2026-01-06": "   \n",
    /* a bare ref cannot hold a space (the export brackets such a name), so
       the missing one is spaceless */
    "page/Trip Log": "![](<Trip Log-img-1.webp>) and ![](missing-img-2.webp)",
    "bookshelf/Dante/Inferno/1": "canto",
  };
  const files = await exportEntries(cache, images);
  expect(files.map(filePath)).toEqual([
    "journal/2026/2026-01-05.md", "journal/2026/2026-01-05--morning.md",
    "bookshelf/Dante/Inferno/1.md",
    "page/Trip Log.md", "page/Trip Log-img-1.webp",
  ]);
  const doc = files[3];
  expect(doc.text).toBe(cache["page/Trip Log"]);
  expect(doc.flat).toBe("page--Trip Log.md");
  expect(doc.entry).toBe("page--Trip Log");
  expect(doc.root).toBe("page/Trip Log");
  expect(files[4]).toMatchObject({ bytes: new Uint8Array([1]), entry: "page--Trip Log", root: "page/Trip Log" });
  // the second ref had no bytes: the doc is marked, so the reconcile spares its files
  expect(doc.picsLost).toMatchObject({ dir: "page/", base: "Trip Log" });
  expect(doc.picsFaulted).toBeUndefined();
  expect(files[0]).toMatchObject({ root: "journal/2026", entry: "2026-01-05" });
  expect(files[0].picsLost).toBeUndefined();
});

test("exportEntries: a picture read that throws marks the doc faulted, and the run goes on", async () => {
  const images = memImageStore();
  const broken = { ...images, get: () => Promise.reject(new Error("db closed")) };
  const files = await exportEntries({ "page/A": "![](A-img-1.webp)" }, broken);
  expect(files.length).toBe(1);
  expect(files[0].picsFaulted).toBe(true);
  expect(files[0].picsLost).toBeTruthy();
});

test("exportEntries refuses two entries that would write one file", async () => {
  await expect(exportEntries({ "2024-01-02/a/b": "x", "2024-01-02/a:b": "y" }, memImageStore()))
    .rejects.toMatchObject({ collision: true, message: /two entries would write one file/ });
});
