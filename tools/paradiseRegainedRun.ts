/* node tools/paradiseRegainedRun.ts — Paradise Regained: Gutenberg's #58
   read against the Harvard Classics' two scans (all cached under
   tools/out/harvard), every word or mark they differ on settled on the
   printed page; written under OUT (default
   ~/Desktop/gesta-imports/gesta-milton-regained) for an import, a review page
   beside it, the counts printed */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { scanLines, findStart, cutPoem, readLine, readAgainst, vocabulary, words, letters, similar } from "./harvardMilton.ts";
import { gutenbergBooks, regainedEntries, type Line } from "./paradiseRegained.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

const HOME = process.env.HOME!;
const BACKUP = join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.env.OUT ?? join(HOME, "Desktop/gesta-imports/gesta-milton-regained");
const CACHE = new URL("out/harvard/", import.meta.url).pathname;
const read = (f: string): string => readFileSync(CACHE + f, "utf8");
const A = scanLines(read("harvardclassicsv0004milt.txt"));
const B = scanLines(read("completepoems00miltuoft.txt"));
const KNOWN = vocabulary(read("pg26.txt"), read("pg58.txt"), readFileSync("/usr/share/dict/words", "utf8"));
const BEECHING = read("pg1745.txt").split("\n").map((l) => l.replace(/\s{2,}\d+\s*$/, "").trim());

/* every word, mark or run-over hyphen where the scans and Gutenberg differ,
   read on the Harvard Classics' page (scan A's image), the side that has it,
   in the line's order: the scans' agreement is the page but where they lose
   a ligature, the dash after "replied:", a nested quotation's mark, or read
   a speck; Gutenberg's text slips (man, heart, eye, pretending, Albracea)
   and in places follows another edition (his, spake, the) */
const SEEN: Record<string, ("scans" | "typed")[]> = {
  "1.1": ["typed"], "1.43": ["typed"], "1.67": ["scans"], "1.86": ["scans"], "1.112": ["scans"], "1.174": ["scans"], "1.199": ["typed"],
  "1.237": ["scans"], "1.242": ["scans"], "1.257": ["scans"], "1.259": ["scans"], "1.262": ["typed"], "1.278": ["scans"], "1.315": ["scans"],
  "1.323": ["scans"], "1.355": ["scans"], "1.357": ["typed"], "1.358": ["typed"], "1.363": ["typed"], "1.406": ["typed"], "1.410": ["scans"],
  "1.477": ["scans"], "1.497": ["scans"],
  "2.21": ["scans", "typed"], "2.24": ["typed"], "2.64": ["typed"], "2.104": ["scans"], "2.147": ["scans"], "2.210": ["scans"], "2.225": ["scans"],
  "2.315": ["scans"], "2.317": ["typed", "typed"], "2.319": ["typed"], "2.322": ["scans"], "2.323": ["typed"], "2.347": ["scans"],
  "2.392": ["scans"], "2.404": ["typed"], "2.419": ["typed"], "2.432": ["typed"], "2.449": ["scans"],
  "3.12": ["typed"], "3.36": ["typed"], "3.42": ["scans"], "3.43": ["typed"], "3.82": ["scans"], "3.108": ["typed"], "3.131": ["typed"],
  "3.133": ["scans"], "3.143": ["scans"], "3.172": ["typed"], "3.200": ["typed"], "3.203": ["typed"], "3.287": ["scans"],
  "3.307": ["scans", "scans"], "3.328": ["scans"], "3.339": ["scans"], "3.377": ["scans"], "3.411": ["scans"],
  "4.14": ["typed"], "4.40": ["typed"], "4.69": ["typed"], "4.134": ["scans"], "4.154": ["typed"], "4.161": ["scans"], "4.165": ["typed"],
  "4.177": ["scans"], "4.238": ["typed"], "4.241": ["scans"], "4.257": ["typed"], "4.261": ["typed"], "4.319": ["scans"], "4.402": ["scans"],
  "4.412": ["scans"], "4.419": ["scans"], "4.487": ["scans"], "4.522": ["scans"], "4.539": ["scans"], "4.559": ["typed"], "4.561": ["typed"],
  "4.611": ["typed", "scans"],
};
/* the edition's stress marks (belovèd, impor′tune) left off, as the
   bookshelf's Paradise Lost has them */
const STRESS = false;
/* a word where the edition departs from Milton's printed text, given his,
   read in the Oxford World's Classics edition (asked): by book and line */
const READINGS: { at: string; from: string; to: string }[] = [
  { at: "1.67", from: "power", to: "flower" },
  { at: "3.328", from: "flight", to: "fight" },
  { at: "1.218", from: "Then", to: "Thence" }, { at: "1.278", from: "on me baptism", to: "on me his baptism" },
  { at: "2.147", from: "spoke", to: "spake" }, { at: "2.210", from: "voutsafed", to: "vouchsafe" },
  { at: "3.307", from: "flight they must", to: "fight they most" }, { at: "4.205", from: "most fatal", to: "so fatal" },
  { at: "4.419", from: "Ill was thou", to: "Ill wast thou" },
];
/* where the edition's word is not Milton's 1671 printing's, spelling aside,
   for a reading in the Oxford edition: found by a sweep against Beeching's
   text, the edition's word first */
const DEPARTURES: { at: string; harvard: string; milton: string; oxford?: string }[] = [
  { at: "1.218", harvard: "Then", milton: "Thence" }, { at: "1.278", harvard: "on me baptism", milton: "on me his Baptism" },
  { at: "1.333", harvard: "aught", milton: "ought" }, { at: "1.470", harvard: "wrested", milton: "rested" },
  { at: "2.147", harvard: "spoke", milton: "spake" }, { at: "2.210", harvard: "voutsafed", milton: "vouchsafe" },
  { at: "2.309", harvard: "found here relief", milton: "found he relief" }, { at: "3.307", harvard: "flight they must", milton: "fight they most" },
  { at: "4.205", harvard: "most fatal", milton: "so fatal" }, { at: "4.217", harvard: "wast", milton: "was" },
  { at: "4.288", harvard: "ought", milton: "aught" }, { at: "4.419", harvard: "Ill was thou", milton: "ill wast thou" },
  { at: "4.452", harvard: "the wrack", milton: "the rack" },
];
/* a name the edition leaves in Milton's spelling, given its modern one
   (asked); a name in a form of Milton's own (Delphos, Asmodai, Salmanassar,
   Falerne) is kept */
const NAMES: { from: string; to: string }[] = [
  { from: "Eliah", to: "Elijah" }, { from: "Genezaret", to: "Gennesaret" }, { from: "Calisto", to: "Callisto" }, { from: "Ganymed", to: "Ganymede" },
  { from: "Lyones", to: "Lyonesse" }, { from: "Pellenore", to: "Pellinore" }, { from: "Juda", to: "Judah" }, { from: "Jephtha", to: "Jephthah" },
  { from: "Machabeus", to: "Maccabeus" }, { from: "Charlemane", to: "Charlemagne" }, { from: "Chersoness", to: "Chersonese" },
  { from: "Thisbite", to: "Tishbite" }, { from: "Rabbies", to: "Rabbis" },
];
const KEPT_NAMES = ["Delphos", "Asmodai", "Salmanassar", "Falerne"];
/* a spelling the edition keeps old, given the one the bookshelf's Paradise
   Lost, Areopagitica and Lycidas have (asked: perfect, not perfet); sovran
   is theirs; a contraction the metre rests on (swoln, far-fet, unadventrous,
   scapes) is a form, not a spelling, and stays */
const SPELLINGS: { from: string; to: string }[] = [
  { from: "perfet", to: "perfect" }, { from: "highth", to: "height" }, { from: "shew", to: "show" }, { from: "shewn", to: "shown" },
  { from: "shews", to: "shows" }, { from: "shew’st", to: "show’st" }, { from: "sovraign", to: "sovran" }, { from: "harald", to: "herald" },
  { from: "rowl", to: "roll" }, { from: "rowls", to: "rolls" }, { from: "griesly", to: "grisly" }, { from: "inforced", to: "enforced" },
  { from: "impowered", to: "empowered" }, { from: "imbossed", to: "embossed" }, { from: "alablaster", to: "alabaster" },
  { from: "droughth", to: "drought" }, { from: "drouth", to: "drought" }, { from: "voutsafed", to: "vouchsafed" }, { from: "pioners", to: "pioneers" },
  { from: "chaunt", to: "chant" }, { from: "democraty", to: "democracy" }, { from: "hippogrif", to: "hippogriff" }, { from: "indorsed", to: "endorsed" },
  { from: "indamaged", to: "endamaged" }, { from: "topt", to: "topped" }, { from: "turbants", to: "turbans" }, { from: "epithetes", to: "epithets" },
  { from: "doat", to: "dote" }, { from: "doat’st", to: "dot’st" },
];
const KEPT_FORMS = ["swoln", "far-fet", "unadventrous", "scapes"];
const NOTE = "Text: *The Complete Poems of John Milton*, The Harvard Classics, vol. 4 (New York, 1909), from Gutenberg’s transcription (#58) read against two scans on the Internet Archive, each place they differ settled on the printed page.";

const IMPORTS = join(HOME, "Desktop/gesta-imports") + "/";
if (!resolve(OUT).startsWith(IMPORTS)) throw new Error(`the folder is emptied before it is written, so it must be inside ${IMPORTS}: ${OUT}`);
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const { books } = gutenbergBooks(read("pg58.txt"));
const out: Line[][] = [];
const seenRows: string[] = [], restored: string[] = [], respelled: string[] = [], spelt: string[] = [];
const kinds: Record<string, number> = {};
const unused = new Set(Object.keys(SEEN));

books.forEach((lines, bi) => {
  const w = lines.map((l) => l.text);
  const sa = findStart(A, w[0]), sb = findStart(B, w[0]);
  if (sa == null || sb == null) throw new Error(`book ${bi + 1}: its first line not found in a scan`);
  const ca = cutPoem(A, sa, w), cb = cutPoem(B, sb, w);
  if (ca.lines.length !== w.length || cb.lines.length !== w.length) throw new Error(`book ${bi + 1}: ${ca.lines.length} and ${cb.lines.length} lines, not ${w.length}`);
  out.push(lines.map((l, i) => {
    const at = `${bi + 1}.${i + 1}`;
    const scans = readLine(ca.lines[i], cb.lines[i], { witness: w[i], known: KNOWN, n: i + 1 }).text;
    const g = readAgainst(scans, w[i], SEEN[at], STRESS);
    const hard = g.diffs.filter((d) => d.kind === "WORD" || d.kind === "MARK" || d.kind === "turn's hyphen");
    if (hard.length !== (SEEN[at]?.length ?? 0)) throw new Error(`${at}: ${hard.length} places to read on the page, ${SEEN[at]?.length ?? 0} read: ${JSON.stringify(hard)}`);
    unused.delete(at);
    for (const d of g.diffs) kinds[d.kind] = (kinds[d.kind] ?? 0) + 1;
    if (hard.length) seenRows.push(`<tr><td class="n">${at}</td><td>${hard.map((d, k) => `<code>${esc(d.scans) || "—"}</code> / <code>${esc(d.typed) || "—"}</code> → ${SEEN[at][k] === "scans" ? "the scans’" : "Gutenberg’s"}`).join("; ")}</td></tr>`);
    let text = g.text;
    for (const r of READINGS.filter((r) => r.at === at)) {
      const re = new RegExp(`\\b${r.from}\\b`);
      if (!re.test(text)) throw new Error(`${at}: no "${r.from}" in ${text}`);
      text = text.replace(re, r.to);
      restored.push(`${at}: ${r.from} → ${r.to}`);
    }
    for (const n of SPELLINGS) text = text.replace(new RegExp(`(?<![\\p{L}’])${n.from}(?![\\p{L}’])`, "giu"), (old) => { const to = /^\p{Lu}/u.test(old) ? n.to[0].toUpperCase() + n.to.slice(1) : n.to; spelt.push(`${at}: ${old} → ${to}`); return to; });
    for (const n of NAMES) text = text.replace(new RegExp(`\\b${n.from}\\b`, "g"), () => { respelled.push(`${at}: ${n.from} → ${n.to}`); return n.to; });
    return { text, opens: l.opens };
  }));
});
if (unused.size) throw new Error("decisions for lines with nothing to decide: " + [...unused].join(", "));

/* where the text's words differ from Milton's 1671 printing, spelling
   aside: a word of one line with no near word in the other, for a reading
   in the Oxford edition */
const near = (k: string, ws: string[]): boolean => ws.some((v) => similar(k, v) >= 0.6);
const departures: string[] = [];
const bStart = BEECHING.findIndex((l) => /^I who e're while the happy Garden sung/i.test(l) || /erewhile the happy Garden/i.test(l));
let bAt = bStart;
out.forEach((lines, bi) => lines.forEach((l, i) => {
  let best = -1, bestAt = bAt;
  for (let k = bAt; k < bAt + 12 && k < BEECHING.length; k++) { const s = similar(letters(BEECHING[k]), letters(l.text)); if (s > best) { best = s; bestAt = k; } }
  if (best < 0.5) return;
  bAt = bestAt + 1;
  const ours = words(l.text).map(letters).filter(Boolean), theirs = words(BEECHING[bestAt]).map(letters).filter(Boolean);
  const a = ours.filter((k) => !near(k, theirs)), b = theirs.filter((k) => !near(k, ours));
  if (a.length || b.length) departures.push(`${bi + 1}.${i + 1}\t${l.text}\t${BEECHING[bestAt]}`);
}));

const entries = regainedEntries(out, NOTE);
const had = Object.keys(entries).filter((f) => existsSync(join(BACKUP, f)));
if (had.length) throw new Error("the backup has these already: " + had.join(", "));
for (const md of Object.values(entries)) if (serializeMarkdown(parseMarkdown(md)) !== md) throw new Error("an entry does not survive its round trip: " + md.slice(0, 80));
rmSync(OUT, { recursive: true, force: true });
for (const [path, md] of Object.entries(entries)) {
  mkdirSync(dirname(join(OUT, path)), { recursive: true });
  writeFileSync(join(OUT, path), md);
}
writeFileSync(join(CACHE, "regained-departures.tsv"), departures.join("\n"));
const lines = out.reduce((n, b) => n + b.length, 0);
writeFileSync(join(dirname(OUT), basename(OUT) + ".html"), `<!doctype html><meta charset="utf-8"><title>Paradise Regained</title>
<style>body{font:16px/1.45 Georgia,serif;margin:2em auto;max-width:64em;padding:0 1em}td{padding:0 1em 0 0;vertical-align:top}.n{color:#999;text-align:right;font-size:.85em;white-space:nowrap}code{font-size:.9em}</style>
<h1>Paradise Regained</h1>
<p>Four book pages under <code>Milton, John/Paradise Regained</code>, laid out as the bookshelf's Paradise Lost is: a book one verse block, a gap where a verse paragraph begins, referred to <code>[Milton, *Paradise Regained*, 1.67]</code>. ${lines} lines (${out.map((b) => b.length).join(", ")}).</p>
<p>The text is Gutenberg's transcription of the Harvard Classics, read against the edition's two scans. Where they differ only by what the scans cannot read — ${Object.entries(kinds).filter(([k]) => !["WORD", "MARK", "turn's hyphen"].includes(k)).map(([k, n]) => `${esc(k)} ${n}`).join(", ")} — Gutenberg's stands, the stress marks left off as on Paradise Lost. Each of the ${seenRows.length} lines below differs in a word, a mark or a hyphen; each was read on the printed page and the side it has taken.</p>
<p>Given Milton's word as the Oxford World's Classics edition reads: ${restored.map(esc).join("; ")}.</p>
<p>Names the edition leaves in Milton's spelling, given their modern one: ${respelled.map(esc).join("; ")}. Kept as Milton's own form of the name: ${KEPT_NAMES.join(", ")}.</p>
<p>Spellings the edition keeps old, given the bookshelf's Paradise Lost's: ${spelt.map(esc).join("; ")}. Kept as forms the metre rests on: ${KEPT_FORMS.join(", ")}.</p>
<h2>For a reading in the Oxford edition</h2>
<p>Where the Harvard Classics' word is not the one Milton's 1671 printing has, spelling aside (a sweep against Beeching's text of 1671), each as the edition prints it in both scans and Gutenberg alike; the text follows the Oxford edition where it differs from Harvard's.</p>
<table>${DEPARTURES.map((d) => `<tr><td class="n">${d.at}</td><td>Harvard <b>${esc(d.harvard)}</b></td><td>1671 <b>${esc(d.milton)}</b></td><td>${READINGS.some((r) => r.at === d.at) ? "the Oxford edition’s reading taken" : "Harvard’s kept, as the Oxford edition reads"}</td></tr>`).join("")}</table>
<h2>Read on the printed page</h2>
<table>${seenRows.join("")}</table>`);
console.log(`readings: ${restored.join("; ")}; names: ${respelled.length}; spellings: ${spelt.length}`);
console.log(`${Object.keys(entries).length} pages, ${lines} lines; read on the page ${seenRows.length} lines; kinds ${JSON.stringify(kinds)}; departures from 1671 ${departures.length}`);
console.log(`written to ${OUT}`);
