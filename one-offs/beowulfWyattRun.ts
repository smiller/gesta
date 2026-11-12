/* node one-offs/beowulfWyattRun.ts [out-dir] — Wyatt's Beowulf from Wikisource
   (pages cached under one-offs/out/wyatt), written under out-dir/bookshelf/…
   for an import, a review page beside out-dir, the counts printed */
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { wyattFitts, plainSpelling, beowulfEntries, misread, type Misreading } from "./beowulfWyatt.ts";
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
/* the transcription's misreadings, each word read against Wyatt's printed
   page (the Internet Archive's scan, beowulf00wyat): letters the OCR took
   for others (lm as hn, æ as se or ae, um as iim) that survived Wikisource's
   proofreading; found as the bookshelf's words that Gutenberg's text of
   Heyne (#9701) does not have, 248 read, 160 of them Wyatt's own */
const MISREAD: Misreading[] = [
  { line: 39, from: "heaðowæedum", to: "heaðowædum" },
  { line: 48, from: "hohn", to: "holm" },
  { line: 109, from: "þæere", to: "þære" },
  { line: 110, from: "mancynue", to: "mancynne" },
  { line: 122, from: "raeste", to: "ræste" },
  { line: 131, from: "ðryðswyðy", to: "ðryðswyð" },
  { line: 158, from: "fohnum", to: "folmum" },
  { line: 170, from: "wrsec", to: "wræc" },
  { line: 194, from: "Þaet", to: "Þæt" },
  { line: 261, from: "heoiðgeneatas", to: "heorðgeneatas" },
  { line: 286, from: "saet", to: "sæt" },
  { line: 287, from: "Æghwaþres", to: "Æghwæþres" },
  { line: 323, from: "furðam", to: "furðum" },
  { line: 377, from: "þæet", to: "þæt" },
  { line: 446, from: "hyclan", to: "hydan" },
  { line: 516, from: "wyhn", to: "wylm" },
  { line: 544, from: "æt somne", to: "ætsomne" },
  { line: 567, from: "aswefecle", to: "aswefede" },
  { line: 631, from: "Eegþeowes", to: "Ecgþeowes" },
  { line: 675, from: "Gesprsec", to: "Gespræc" },
  { line: 681, from: "hee", to: "he" },
  { line: 731, from: "æ", to: "ær" },
  { line: 790, from: "þæem", to: "þæm" },
  { line: 825, from: "iær", to: "ær" },
  { line: 876, from: "imcuþes", to: "uncuþes" },
  { line: 906, from: "æþelingnm", to: "æþelingum" },
  { line: 919, from: "switðhicgende", to: "swiðhicgende" },
  { line: 934, from: "fab", to: "fah" },
  { line: 936, from: "gebwylcne", to: "gehwylcne" },
  { line: 940, from: "þurb", to: "þurh" },
  { line: 941, from: "meabton", to: "meahton" },
  { line: 968, from: "astfealh", to: "ætfealh" },
  { line: 1046, from: "mæere", to: "mære" },
  { line: 1049, from: "ætter", to: "æfter" },
  { line: 1058, from: "cjnines", to: "cynnes" },
  { line: 1083, from: "wug", to: "wig" },
  { line: 1087, from: "healfie", to: "healfre" },
  { line: 1100, from: "bræpe", to: "bræce" },
  { line: 1133, from: "op", to: "oþ" },
  { line: 1186, from: "hwaet", to: "hwæt" },
  { line: 1204, from: "sine", to: "sinc" },
  { line: 1250, from: "þreod", to: "þeod" },
  { line: 1274, from: "ha", to: "he" },
  { line: 1281, from: "eorkim", to: "eorlum" },
  { line: 1315, from: "wtrpe", to: "wyrpe" },
  { line: 1367, from: "beama", to: "bearna" },
  { line: 1373, from: "ydgeblond", to: "yðgeblond" },
  { line: 1392, from: "hehn", to: "helm" },
  { line: 1435, from: "hohne", to: "holme" },
  { line: 1467, from: "ha", to: "he" },
  { line: 1676, from: "eorliim", to: "eorlum" },
  { line: 1744, from: "fyreniim", to: "fyrenum" },
  { line: 1745, from: "hehn", to: "helm" },
  { line: 1767, from: "forsvvorceð", to: "forsworceð" },
  { line: 1775, from: "æfber", to: "æfter" },
  { line: 1796, from: "beweotecde", to: "beweotede" },
  { line: 1799, from: "hliuade", to: "hlifade" },
  { line: 1804, from: "loodum", to: "leodum" },
  { line: 1811, from: "wordiim", to: "wordum" },
  { line: 1823, from: "þiinre", to: "þinre" },
  { line: 1850, from: "þet", to: "þæt" },
  { line: 1886, from: "æghwses", to: "æghwæs" },
  { line: 1916, from: "faroð", to: "faroðe" },
  { line: 1931, from: "maaþmgestreona", to: "maþmgestreona" },
  { line: 1978, from: "mandiyhten", to: "mandryhten" },
  { line: 2041, from: "aæt", to: "æt" },
  { line: 2112, from: "cwiðau", to: "cwiðan" },
  { line: 2188, from: "aeðeling", to: "æðeling" },
  { line: 2245, from: "hardfyrne", to: "hardfyrdne" },
  { line: 2326, from: "brynewyhnum", to: "brynewylmum" },
  { line: 2373, from: "dy", to: "ðy" },
  { line: 2380, from: "sehtan", to: "sohtan" },
  { line: 2591, from: "læendagas", to: "lændagas" },
  { line: 2604, from: "mondiyhten", to: "mondryhten" },
  { line: 2619, from: "broðr", to: "broðor" },
  { line: 2689, from: "gemymdig", to: "gemyndig" },
  { line: 2728, from: "deatð", to: "deað" },
  { line: 2759, from: "þaes", to: "þæs" },
  { line: 2803, from: "æfber", to: "æfter" },
  { line: 2876, from: "ehies", to: "elnes" },
  { line: 2885, from: "edelwyn", to: "eðelwyn" },
  { line: 2927, from: "Guðscilfiiigas", to: "Guðscilfingas" },
  { line: 2954, from: "sæmamium", to: "sæmannum" },
  { line: 2989, from: "Ha", to: "He" },
  { line: 3005, from: "hæleSa", to: "hæleða" },
  { line: 3140, from: "ha", to: "he" },
  { line: 3152, from: "sælSe", to: "sælðe" }
];
/* a line number misprinted in the transcription, its neighbours five lines apart: 2830, 2885, 2840 */
const MISNUMBERED = [{ n: 2885, at: 2835 }];
const NOTE = "Text: A. J. Wyatt, ed., *Beowulf* (Cambridge, 1894), from the transcription on Wikisource, its misreadings corrected against Wyatt’s printed page; the length marks, hyphens, square brackets and notes left out.";


/* the folder is emptied before it is written: only one inside gesta-imports */
const IMPORTS = join(HOME, "Desktop/gesta-imports") + "/";
if (!resolve(OUT).startsWith(IMPORTS)) throw new Error(`the folder is emptied before it is written, so it must be inside ${IMPORTS}: ${OUT}`);
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
const read = fitts.map((f) => f.map(plainSpelling));
const plain = misread(read, MISREAD);
/* the backup's page may be replaced only as this run writes it, with its misreadings or without: an edit made in Gesta would be lost */
const was = beowulfEntries(read, NOTE)["bookshelf/Beowulf.md"];
const entries = beowulfEntries(plain, NOTE);
const backup = join(BACKUP, "bookshelf/Beowulf.md");
if (existsSync(backup) && ![was, entries["bookshelf/Beowulf.md"]].includes(readFileSync(backup, "utf8"))) {
  const a = readFileSync(backup, "utf8").split("\n"), b = was.split("\n");
  const at = a.findIndex((l, i) => l !== b[i]);
  throw new Error(`the backup's Beowulf has been edited (its line ${at + 1}: ${JSON.stringify(a[at])}): this folder would overwrite it`);
}
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
<p>${total} lines in ${fitts.length} parts (the prelude and the fitts), every line number the transcription prints matching its place (${numbered.length} checked; one misprinted, 2885 for 2835). One entry, <code>bookshelf/Beowulf</code>, its reference setting <code>no author</code> and <code>Old English verse</code>, one verse block, a gap between fitts.</p>
<p>${MISREAD.length} misreadings set right, each read against Wyatt's printed page: ${MISREAD.map((m) => `${m.line} <code>${esc(m.from)}</code> → <code>${esc(m.to)}</code>`).join(", ")}.</p>
<p>Corrected from the transcription: ${SLIPS.map((s) => `<code>${esc(s.from)}</code> → <code>${esc(s.to)}</code>${s.times > 1 ? " (" + s.times + ")" : ""}`).join(", ")}.</p>
<p>Left: the poem as it will read; right, grey: Wyatt's spelling, his apparatus gone.</p>
<table>${rows}</table>`);
console.log(`${total} lines, ${fitts.length} parts, ${numbered.length} line numbers checked; written to ${OUT}`);
