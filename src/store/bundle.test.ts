import { test, expect } from "vitest";
import { zipBytes } from "./io.ts";
import { readBundle, bundleImages, zipMembers, bundleKeeper, heldLabel, type BundleRow } from "./bundle.ts";
import { memKeyedStore } from "./store.ts";
import type { ExportFile } from "./files.ts";

const files: ExportFile[] = [
  { name: "2026-01-01.md", dir: "journal/2026/", text: "a day ".repeat(50) },
  { name: "2026-01-01-img-1.webp", dir: "journal/2026/", bytes: new Uint8Array([1, 2, 3]) },
  { name: "Emma.md", dir: "bookshelf/Austen, Jane/", text: "Emma Woodhouse, handsome, clever, and rich" },
  { name: "Trip Log.md", dir: "page/", text: "![x](Trip Log-img-1.webp)" },
  { name: "Trip Log-img-1.webp", dir: "page/", bytes: new Uint8Array(400).fill(7) },
];

test("readBundle keys every entry as the import does and keeps each picture by its path", async () => {
  const b = await readBundle(await zipBytes(files, "2026-10-31"));
  expect(b.entries).toEqual({
    "2026-01-01": "a day ".repeat(50),
    "bookshelf/Austen, Jane/Emma": "Emma Woodhouse, handsome, clever, and rich",
    "page/Trip Log": "![x](Trip Log-img-1.webp)",
  });
  expect(Object.keys(b.pictures).sort()).toEqual(["journal/2026/2026-01-01-img-1.webp", "page/Trip Log-img-1.webp"]);
  expect(b.skipped).toBe(0);
});

test("bundleImages reads a picture out of the file, stored or deflated, and has none it was not given", async () => {
  const zip = await zipBytes(files, "2026-10-31");
  const b = await readBundle(zip);
  const images = bundleImages(new Blob([zip as BlobPart]), b.pictures);
  expect(Array.from((await images.get("journal/2026/2026-01-01-img-1.webp"))!.bytes)).toEqual([1, 2, 3]);
  expect((await images.get("page/Trip Log-img-1.webp"))!.bytes).toEqual(new Uint8Array(400).fill(7));
  expect(await images.get("page/nothing.webp")).toBeNull();
  await expect(images.set("page/x.webp", new Uint8Array(1))).rejects.toThrow();
});

test("readBundle counts its progress over the entries and refuses a file that is not a zip", async () => {
  const steps: string[] = [];
  await readBundle(await zipBytes(files, "2026-10-31"), (done, total) => steps.push(done + "/" + total));
  expect(steps).toEqual(["3/3"]);
  await expect(readBundle(new TextEncoder().encode("not a zip at all, only words"))).rejects.toThrow("not a zip file");
  const zip = await zipBytes(files, "2026-10-31");
  expect(() => zipMembers(zip.subarray(40))).toThrow(/damaged/);
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
