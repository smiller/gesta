/* node tools/beowulfWyattRun.ts [out-dir] — Wyatt's Beowulf from Wikisource
   (pages cached under tools/out/wyatt), written under out-dir/bookshelf/…
   for an import, a review page beside out-dir, the counts printed */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { wyattFitts, plainSpelling, beowulfEntries } from "./beowulfWyatt.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

const HOME = process.env.HOME!;
const BACKUP = join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.argv[2] ?? join(HOME, "Desktop/gesta-imports/gesta-beowulf");
const CACHE = new URL("out/wyatt/", import.meta.url).pathname;
const FIRST = 25, LAST = 161, LINES = 3182;

/* the transcription's slips, each against the scan's plain reading */
const SLIPS: { from: string; to: string; times: number }[] = [
  { from: "w«s", to: "wæs", times: 2 },
  { from: "Hr¯wðel", to: "Hrēðel", times: 1 },
  { from: "Gewât", to: "Gewāt", times: 1 },
  { from: "wīgan.̦", to: "wīgan.", times: 1 },
  { from: "geweorces.̌", to: "geweorces.", times: 1 },
];
/* a line number misprinted in the transcription, its neighbours five lines apart: 2830, 2885, 2840 */
const MISNUMBERED = [{ n: 2885, at: 2835 }];
const NOTE = "Text: A. J. Wyatt, ed., *Beowulf* (Cambridge, 1894), as transcribed on Wikisource; the length marks, hyphens, square brackets and notes left out.";

async function pages(): Promise<string[]> {
  mkdirSync(CACHE, { recursive: true });
  const want = Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i).filter((n) => !existsSync(join(CACHE, n + ".txt")));
  for (let i = 0; i < want.length; i += 50) {
    const titles = want.slice(i, i + 50).map((n) => `Page:Beowulf (Wyatt).djvu/${n}`).join("|");
    const q = new URLSearchParams({ action: "query", prop: "revisions", rvprop: "content", rvslots: "main", format: "json", formatversion: "2", titles });
    const r = await (await fetch("https://en.wikisource.org/w/api.php?" + q, { headers: { "User-Agent": "GestaBeowulfImport/1.0 (a personal bookshelf import)" } })).json();
    for (const pg of r.query.pages) writeFileSync(join(CACHE, pg.title.split("/").pop() + ".txt"), pg.revisions[0].slots.main.content);
  }
  return Array.from({ length: LAST - FIRST + 1 }, (_, i) => readFileSync(join(CACHE, FIRST + i + ".txt"), "utf8"));
}

if (existsSync(join(BACKUP, "bookshelf/Old English")) || existsSync(join(BACKUP, "bookshelf/Old English.md"))) throw new Error("the backup has an Old English entry already: this folder would overwrite it");
let text = (await pages()).join("\u0000");
for (const s of SLIPS) {
  const n = text.split(s.from).length - 1;
  if (n !== s.times) throw new Error(`slip "${s.from}" found ${n} times, not ${s.times}`);
  text = text.split(s.from).join(s.to);
}
const { fitts, numbered } = wyattFitts(text.split("\u0000"));
const total = fitts.reduce((a, f) => a + f.length, 0);
const off = numbered.filter((x) => x.n !== x.at && !MISNUMBERED.some((m) => m.n === x.n && m.at === x.at));
if (total !== LINES || off.length) throw new Error(`${total} lines; line numbers off: ${JSON.stringify(off.slice(0, 5))}`);
const plain = fitts.map((f) => f.map(plainSpelling));
const entries = beowulfEntries(plain, NOTE);
for (const md of Object.values(entries)) if (serializeMarkdown(parseMarkdown(md)) !== md) throw new Error("an entry does not survive its round trip");

rmSync(OUT, { recursive: true, force: true });
for (const [path, md] of Object.entries(entries)) {
  mkdirSync(dirname(join(OUT, path)), { recursive: true });
  writeFileSync(join(OUT, path), md);
}

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
let n = 0;
const rows = fitts.map((f, i) => `<tr class="fitt"><td></td><td>${i ? "fitt " + i : "prelude"}</td><td></td></tr>` + f.map((line, j) => {
  n++;
  return `<tr><td class="n">${n % 5 ? "" : n}</td><td>${esc(plain[i][j]).replace(/  /g, "&emsp;")}</td><td class="w">${esc(line).replace(/  /g, "&emsp;")}</td></tr>`;
}).join("")).join("");
writeFileSync(join(dirname(OUT), basename(OUT) + ".html"), `<!doctype html><meta charset="utf-8"><title>Beowulf import</title>
<style>body{font:16px/1.45 Georgia,serif;margin:2em auto;max-width:60em;padding:0 1em}td{padding:0 .8em 0 0;vertical-align:top}.n{color:#999;text-align:right;font-size:.8em}.w{color:#777}.fitt td{padding-top:1em;color:#a50;font-size:.85em}code{font-size:.9em}</style>
<h1>Beowulf, from Wyatt (1894)</h1>
<p>${total} lines in ${fitts.length} parts (the prelude and the fitts), every line number the transcription prints matching its place (${numbered.length} checked; one misprinted, 2885 for 2835). Two entries: <code>bookshelf/Old English</code> (its reference setting <code>no author</code>, and a link to the poem) and <code>bookshelf/Old English/Beowulf</code>, one verse block, a gap between fitts.</p>
<p>Corrected from the transcription: ${SLIPS.map((s) => `<code>${esc(s.from)}</code> → <code>${esc(s.to)}</code>${s.times > 1 ? " (" + s.times + ")" : ""}`).join(", ")}.</p>
<p>Left: the poem as it will read; right, grey: Wyatt's spelling, his apparatus gone.</p>
<table>${rows}</table>`);
console.log(`${total} lines, ${fitts.length} parts, ${numbered.length} line numbers checked; written to ${OUT}`);
