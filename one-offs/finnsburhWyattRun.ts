/* node one-offs/finnsburhWyattRun.ts [out-dir] — the Finnsburh fragment from
   Wyatt's appendix on Wikisource (pages cached under one-offs/out/wyatt),
   written under out-dir/bookshelf/ for an import, a review page beside
   out-dir, the counts printed */
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { finnsburhLines, finnsburhEntry, plainSpelling } from "./beowulfWyatt.ts";
import { wyattPages } from "./wyattPages.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

const HOME = process.env.HOME!;
const BACKUP = join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.argv[2] ?? join(HOME, "Desktop/gesta-imports/gesta-finnsburh");
const FIRST = 162, LAST = 163, LINES = 48;

/* the transcription's slips, each read against the page's scan */
const SLIPS: { from: string; to: string; line: number }[] = [
  { from: "beratð", to: "berað", line: 5 },
  { from: "hiegeað", to: "hicgeað", line: 11 },
  { from: "hyue", to: "hyne", line: 33 },
  { from: "sealo-brün", to: "sealo-brūn", line: 35 },
  { from: "hū ðū wīgend", to: "hū ðā wīgend", line: 47 },
];
const NOTE = "Text: A. J. Wyatt, ed., *Beowulf* (Cambridge, 1894), its appendix “The Fight at Finnsburg”, from the transcription on Wikisource, its misreadings corrected against Wyatt’s printed page; the length marks, hyphens, square brackets and notes left out. The asterisks are Wyatt’s, where the fragment breaks off.";

/* the folder is emptied before it is written: only one inside gesta-imports */
const IMPORTS = join(HOME, "Desktop/gesta-imports") + "/";
if (!resolve(OUT).startsWith(IMPORTS)) throw new Error(`the folder is emptied before it is written, so it must be inside ${IMPORTS}: ${OUT}`);
if (existsSync(join(BACKUP, "bookshelf/Finnsburh")) || existsSync(join(BACKUP, "bookshelf/Finnsburh.md"))) throw new Error("the backup has a Finnsburh entry already: this folder would overwrite it");
let text = (await wyattPages(FIRST, LAST)).join("\u0000");
for (const s of SLIPS) {
  const n = text.split(s.from).length - 1;
  if (n !== 1) throw new Error(`slip "${s.from}" found ${n} times, not once`);
  text = text.split(s.from).join(s.to);
}
const { lines, numbered } = finnsburhLines(text.split("\u0000"));
const off = numbered.filter((x) => x.n !== x.at);
if (lines.length !== LINES || off.length) throw new Error(`${lines.length} lines; line numbers off: ${JSON.stringify(off.slice(0, 5))}`);
for (const s of SLIPS) if (!lines[s.line - 1].includes(s.to)) throw new Error(`slip "${s.to}" is not on line ${s.line}`);
const plain = lines.map(plainSpelling);
const entries = finnsburhEntry(plain, NOTE);
for (const md of Object.values(entries)) if (serializeMarkdown(parseMarkdown(md)) !== md) throw new Error("an entry does not survive its round trip");

rmSync(OUT, { recursive: true, force: true });
for (const [path, md] of Object.entries(entries)) {
  mkdirSync(dirname(join(OUT, path)), { recursive: true });
  writeFileSync(join(OUT, path), md);
}

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const rows = lines.map((line, i) => `<tr><td class="n">${(i + 1) % 5 ? "" : i + 1}</td><td>${esc(plain[i]).replace(/  /g, "&emsp;")}</td><td class="w">${esc(line).replace(/  /g, "&emsp;")}</td></tr>`).join("");
writeFileSync(join(dirname(OUT), basename(OUT) + ".html"), `<!doctype html><meta charset="utf-8"><title>Finnsburh import</title>
<style>body{font:16px/1.45 Georgia,serif;margin:2em auto;max-width:60em;padding:0 1em}td{padding:0 .8em 0 0;vertical-align:top}.n{color:#999;text-align:right;font-size:.8em}.w{color:#777}code{font-size:.9em}</style>
<h1>The Fight at Finnsburh, from Wyatt (1894)</h1>
<p>${lines.length} lines, every line number the transcription prints matching its place (${numbered.length} checked). One entry, <code>bookshelf/Finnsburh</code>, headed “The Fight at Finnsburh”, its reference setting <code>no author</code>, the fragment one verse block.</p>
<p>Corrected from the transcription, each against the scan: ${SLIPS.map((s) => `line ${s.line} <code>${esc(s.from)}</code> → <code>${esc(s.to)}</code>`).join(", ")}.</p>
<p>Left: the fragment as it will read; right, grey: Wyatt's spelling, his apparatus gone.</p>
<table>${rows}</table>`);
console.log(`${lines.length} lines, ${numbered.length} line numbers checked; written to ${OUT}`);
