/* `node tools/readerBundle.ts [dir] [out]`: the reader's bundle made from a
   backup folder as the app's backup makes it, timed, and read back */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { zipTo } from "../src/store/io.ts";
import { readBundle } from "../src/store/bundle.ts";
import type { ExportFile } from "../src/store/files.ts";

const dir = process.argv[2] || join(homedir(), "Library/CloudStorage/Dropbox/gesta-backups/current");
const out = process.argv[3] || "tools/out/gesta.zip";
const files: ExportFile[] = [];
const walk = (at: string): void => {
  for (const name of readdirSync(join(dir, at)).sort()) {
    if (name.startsWith(".")) continue;
    const rel = at ? at + "/" + name : name;
    if (statSync(join(dir, rel)).isDirectory()) { walk(rel); continue; }
    const f: ExportFile = { dir: at ? at + "/" : "", name };
    if (/\.md$/i.test(name)) f.text = readFileSync(join(dir, rel), "utf8"); else f.bytes = new Uint8Array(readFileSync(join(dir, rel)));
    files.push(f);
  }
};
walk("");
let t = performance.now();
const parts: Uint8Array[] = [], now = new Date().toISOString();
await zipTo(files, now.slice(0, 10), (c) => { parts.push(c); }, now);
const zip = new Uint8Array(await new Blob(parts as BlobPart[]).arrayBuffer());
console.log("zipped " + files.length + " files, " + (zip.length / 1e6).toFixed(1) + " MB, " + Math.round(performance.now() - t) + " ms");
writeFileSync(out, zip);
t = performance.now();
const b = await readBundle(new Blob([zip]));
console.log("read " + Object.keys(b.entries).length + " entries, " + Object.keys(b.pictures).length + " pictures, " + b.skipped + " skipped, " + Math.round(performance.now() - t) + " ms");
