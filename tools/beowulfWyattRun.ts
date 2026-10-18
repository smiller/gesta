/* node tools/beowulfWyattRun.ts [out-dir] — Wyatt's Beowulf from Wikisource
   (pages cached under tools/out/wyatt), written under out-dir/bookshelf/…
   for an import, a review page beside out-dir, the counts printed */
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { wyattFitts, plainSpelling, beowulfEntries } from "./beowulfWyatt.ts";
import { wyattPages } from "./wyattPages.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

const HOME = process.env.HOME!;
const BACKUP = join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.argv[2] ?? join(HOME, "Desktop/gesta-imports/gesta-beowulf");
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


/* the folder is emptied before it is written: only one inside gesta-imports */
const IMPORTS = join(HOME, "Desktop/gesta-imports") + "/";
if (!resolve(OUT).startsWith(IMPORTS)) throw new Error(`the folder is emptied before it is written, so it must be inside ${IMPORTS}: ${OUT}`);
if (existsSync(join(BACKUP, "bookshelf/Old English")) || existsSync(join(BACKUP, "bookshelf/Old English.md"))) throw new Error("the backup has an Old English entry already: this folder would overwrite it");
let text = (await wyattPages(FIRST, LAST)).join("\u0000");
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
