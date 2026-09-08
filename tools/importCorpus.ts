/* The import run over an export folder under node, into memory: every
   file read as the browser pick would read it, then importFiles over the
   memory layer and image store. Prints the tally and names every failure
   with its reason. The cutover criterion's first half, measurable without
   a hand on the picker. Usage: node tools/importCorpus.ts [dir] */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { importFiles } from "../src/store/importFiles.ts";
import { entryLayer } from "../src/store/entries.ts";
import { memEntryStore, memImageStore } from "../src/store/store.ts";
import type { ImportFile } from "../src/store/files.ts";

const dir = process.argv[2] ?? join(process.env.HOME!, "Library/CloudStorage/Dropbox/gesta-snapshots/current");
const files: ImportFile[] = [];
function walk(d: string): void {
  for (const name of readdirSync(d).sort()) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    const at = relative(dir, d);
    const rec = { dir: at ? at + "/" : "", name };
    files.push(/\.md$/i.test(name) ? { ...rec, text: readFileSync(p, "utf8") } : { ...rec, bytes: new Uint8Array(readFileSync(p)) });
  }
}
walk(dir);
const stuck: string[] = [];
const layer = entryLayer(memEntryStore(), {
  landed: () => {}, removed: () => {},
  stuck: (text, _err, ekey) => stuck.push(text + " " + ekey),
  stuckIdle: (text) => stuck.push(text),
});
const images = memImageStore();
let filed = 0;
const t0 = Date.now();
const tally = await importFiles(files, { setEntry: layer.setEntry, setImage: (p, b) => { filed++; return images.set(p, b); } });
console.log(`files read: ${files.length}; entry docs attempted: ${tally.attempted}; imported: ${tally.imported}; failed: ${tally.failed}; pictures filed: ${filed}; stored entries: ${Object.keys(layer.cache).length}; ${((Date.now() - t0) / 1000).toFixed(1)} s`);
for (const f of tally.failures) console.log("FAILED " + f.path + " — " + f.error);
for (const s of stuck) console.log("STUCK " + s);
