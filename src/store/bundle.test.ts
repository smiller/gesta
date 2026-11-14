import { test, expect } from "vitest";
import { zipBytes, zipTo } from "./io.ts";
import { readBundle, bundleImages, zipDirectory, bundleKeeper, heldLabel, type BundleRow } from "./bundle.ts";
import { memKeyedStore } from "./store.ts";
import type { ExportFile } from "./files.ts";

const blob = (b: Uint8Array) => new Blob([b as BlobPart]);
const files: ExportFile[] = [
  { name: "2026-01-01.md", dir: "journal/2026/", text: "a day ".repeat(50) },
  { name: "2026-01-01-img-1.webp", dir: "journal/2026/", bytes: new Uint8Array([1, 2, 3]) },
  { name: "Emma.md", dir: "bookshelf/Austen, Jane/", text: "Emma Woodhouse, handsome, clever, and rich" },
  { name: "Trip Log.md", dir: "commonplace/", text: "![x](Trip Log-img-1.webp)" },
  { name: "Trip Log-img-1.webp", dir: "commonplace/", bytes: new Uint8Array(400).fill(7) },
];

test("readBundle keys every entry as the import does and keeps each picture by its path", async () => {
  const b = await readBundle(blob(await zipBytes(files, "2026-10-31")));
  expect(b.entries).toEqual({
    "2026-01-01": "a day ".repeat(50),
    "bookshelf/Austen, Jane/Emma": "Emma Woodhouse, handsome, clever, and rich",
    "commonplace/Trip Log": "![x](Trip Log-img-1.webp)",
  });
  expect(Object.keys(b.pictures).sort()).toEqual(["commonplace/Trip Log-img-1.webp", "journal/2026/2026-01-01-img-1.webp"]);
  expect(b.skipped).toBe(0);
  expect(b.written).toBeNull();
});

test("readBundle reads the time the bundle was written from the zip's comment", async () => {
  const parts: Uint8Array[] = [];
  await zipTo(files, "2026-10-31", (c) => { parts.push(c); }, "2026-11-01T11:57:03.000Z");
  const b = await readBundle(new Blob(parts as BlobPart[]));
  expect(b.written).toBe(Date.parse("2026-11-01T11:57:03.000Z"));
  expect(Object.keys(b.entries)).toHaveLength(3);
});

test("bundleImages reads a picture out of the file, stored or deflated, and has none it was not given", async () => {
  const zip = blob(await zipBytes(files, "2026-10-31"));
  const b = await readBundle(zip);
  const images = bundleImages(zip, b.pictures);
  expect(Array.from((await images.get("journal/2026/2026-01-01-img-1.webp"))!.bytes)).toEqual([1, 2, 3]);
  expect((await images.get("commonplace/Trip Log-img-1.webp"))!.bytes).toEqual(new Uint8Array(400).fill(7));
  expect(await images.get("commonplace/nothing.webp")).toBeNull();
  await expect(images.set("commonplace/x.webp", new Uint8Array(1))).rejects.toThrow();
});

test("readBundle counts its progress over the entries and refuses a file that is not a zip or is damaged", async () => {
  const steps: string[] = [];
  await readBundle(blob(await zipBytes(files, "2026-10-31")), (done, total) => steps.push(done + "/" + total));
  expect(steps).toEqual(["1/3", "3/3"]);
  await expect(readBundle(blob(new TextEncoder().encode("not a zip at all, only words")))).rejects.toThrow("not a zip file");
  const zip = await zipBytes(files, "2026-10-31");
  await expect(zipDirectory(blob(zip.subarray(40)))).rejects.toThrow(/damaged/);
  const torn = zip.slice();
  torn[0] = 0;
  await expect(readBundle(blob(torn))).rejects.toThrow("the zip’s member journal/2026/2026-01-01.md is damaged");
});

test("bundleKeeper keeps one picked file, a new pick replacing it; heldLabel says when it was written", async () => {
  const keeper = bundleKeeper(memKeyedStore<BundleRow>("k"));
  expect(await keeper.get()).toBeNull();
  const at = new Date(2026, 9, 31, 9, 5).getTime();
  await keeper.keep(new File(["one"], "gesta.zip", { lastModified: at }));
  await keeper.keep(new File(["two"], "gesta.zip", { lastModified: at + 60000 }));
  const row = (await keeper.get())!;
  expect([await row.file.text(), row.name, row.modified]).toEqual(["two", "gesta.zip", at + 60000]);
  expect(heldLabel(at)).toBe("backup of 31 Oct 2026, 09:05");
});
