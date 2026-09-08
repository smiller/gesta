// The import over a file list: which files target what, how a sidecar is
// filed, what is refused, what the tally says.
import { test, expect } from "vitest";
import { importFiles, importEntry, sidecarRefs, type ImportSink } from "./importFiles.ts";
import type { ImportFile } from "./files.ts";

function sink(landed = true) {
  const entries: Record<string, string> = {};
  const images: Record<string, Uint8Array> = {};
  const s: ImportSink = {
    setEntry: (k, md) => { entries[k] = md; return Promise.resolve(landed); },
    setImage: (p, b) => { images[p] = b; return Promise.resolve(); },
  };
  return { s, entries, images };
}
const bytes = (n: number) => new Uint8Array([n]);

test("a pick imports its entry docs, keyed by path, text stored as written", async () => {
  const { s, entries } = sink();
  const files: ImportFile[] = [
    { dir: "journal/2026/", name: "2026-01-05.md", text: "# A day\n\ntext\n" },
    { dir: "journal/2026/", name: "2026-01-05--morning.md", text: "tagged" },
    { dir: "page/Recipes/", name: "Bread.md", text: "# Bread" },
    { dir: "bookshelf/Milton, John/", name: "Paradise Lost.md", text: "::: verse\nOf man's first\n:::" },
    { dir: "", name: "README.md", text: "not an entry" },
    { dir: "", name: ".DS_Store", bytes: bytes(0) },
  ];
  const seen: [number, number][] = [];
  const tally = await importFiles(files, s, (d, t) => seen.push([d, t]));
  expect(tally).toEqual({ imported: 4, failed: 0, attempted: 4, failures: [] });
  expect(Object.keys(entries).sort()).toEqual(["2026-01-05", "2026-01-05/morning", "bookshelf/Milton, John/Paradise Lost", "page/Recipes/Bread"]);
  expect(entries["2026-01-05"]).toBe("# A day\n\ntext\n");
  expect(seen).toEqual([[1, 4], [2, 4], [3, 4], [4, 4]]);
});

test("a sidecar is filed under the path its ref resolves to, bare or <bracketed>, and the ref stays as written", async () => {
  const { s, entries, images } = sink();
  const files: ImportFile[] = [
    /* a childless page sits as page/<Name>.md with its sidecars beside it */
    { dir: "page/", name: "Trip Log.md", text: "![](<Trip Log-img-1.webp>) and ![x](Trip Log-img-2.webp)" },
    { dir: "page/", name: "Trip Log-img-1.webp", bytes: bytes(1) },
    { dir: "page/", name: "Trip Log-img-2.webp", bytes: bytes(2) },
    { dir: "page/", name: "Trip Log-img-3.webp", bytes: bytes(3) },   /* unreferenced */
    { dir: "page/Other/", name: "Trip Log-img-1.webp", bytes: bytes(9) },     /* another entry's */
  ];
  const tally = await importFiles(files, s);
  expect(tally.imported).toBe(1);
  expect(entries["page/Trip Log"]).toBe("![](<Trip Log-img-1.webp>) and ![x](Trip Log-img-2.webp)");
  expect(Object.keys(images).sort()).toEqual(["page/Trip Log-img-1.webp", "page/Trip Log-img-2.webp"]);
  expect(images["page/Trip Log-img-1.webp"]).toEqual(bytes(1));
});

test("sidecarRefs: an imageless text scans nothing; a deeper file is another entry's", () => {
  const sidecars = { "page/A/A-img-1.webp": bytes(1), "page/A/B/A-img-1.webp": bytes(2) };
  expect(sidecarRefs("page/A.md", "no pictures", sidecars)).toEqual({ refs: [], blocked: false });
  expect(sidecarRefs("page/A.md", "![](A-img-1.webp)", sidecars)).toEqual({ refs: [], blocked: false });
  expect(sidecarRefs("page/A/A.md", "![](A-img-1.webp)", sidecars)).toEqual({ refs: ["page/A/A-img-1.webp"], blocked: false });
});

test("an entry whose picture could not be read is refused and counted, with the reason", async () => {
  const { s, entries } = sink();
  const files: ImportFile[] = [
    { dir: "page/", name: "A.md", text: "![](A-img-1.webp)" },
    { dir: "page/", name: "A-img-1.webp", bytes: null, unread: true },
  ];
  const tally = await importFiles(files, s);
  expect(tally.imported).toBe(0);
  expect(tally.failures).toEqual([{ path: "page/A.md", error: "a picture this entry needs could not be read" }]);
  expect("page/A" in entries).toBe(false);
});

test("an unreadable .md is counted, never attempted; a form the schema refuses is counted with its error", async () => {
  const { s, entries } = sink();
  const files: ImportFile[] = [
    { dir: "journal/2026/", name: "2026-01-01.md", unread: true },
    { dir: "journal/2026/", name: "2026-01-02.md", text: "::: verse\nunclosed" },
    { dir: "journal/2026/", name: "2026-01-03.md", text: "fine" },
  ];
  const tally = await importFiles(files, s);
  expect(tally.imported + tally.failed).toBe(3);
  expect(tally.failures[0]).toEqual({ path: "journal/2026/2026-01-01.md", error: "could not be read" });
  expect(entries["2026-01-03"]).toBe("fine");
  expect("2026-01-01" in entries).toBe(false);
});

test("a write that does not land is a failure, not an import", async () => {
  const { s } = sink(false);
  expect(await importEntry("journal/2026/2026-01-01.md", "x", {}, s)).toBe("failed");
  expect(await importEntry("README.md", "x", {}, s)).toBe("skipped");
  const tally = await importFiles([{ dir: "journal/2026/", name: "2026-01-01.md", text: "x" }], s);
  expect(tally).toEqual({ imported: 0, failed: 1, attempted: 1, failures: [{ path: "journal/2026/2026-01-01.md", error: "the write did not land" }] });
});
