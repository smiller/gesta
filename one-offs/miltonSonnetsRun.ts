/* node tools/miltonSonnetsRun.ts — Milton's sonnets: the English from the
   Harvard Classics' two scans read against each other, the Italian from the
   1645 Poems on Italian Wikisource with Cowper's translations (all cached
   under one-offs/out/harvard); written under OUT (default
   ~/Desktop/gesta-imports/gesta-milton-sonnets) for an import, a review page
   beside it, the counts printed */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { scanLines, editionLines, findStart, witnessPoem, cutPoem, readLine, vocabulary, unstressed, type Decision } from "./harvardMilton.ts";
import { italianPoem, cowperItalian, sonnetEntries, type Sonnet } from "./miltonSonnets.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

const HOME = process.env.HOME!;
const BACKUP = join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.env.OUT ?? join(HOME, "Desktop/gesta-imports/gesta-milton-sonnets");
const CACHE = new URL("out/harvard/", import.meta.url).pathname;
const read = (f: string): string => readFileSync(CACHE + f, "utf8");
const A = scanLines(read("harvardclassicsv0004milt.txt"));
const B = scanLines(read("completepoems00miltuoft.txt"));
const THURBER = editionLines(read("pg31706.txt"));
const BEECHING = editionLines(read("pg1745.txt"));
const KNOWN = vocabulary(read("pg26.txt"), read("pg58.txt"), readFileSync("/usr/share/dict/words", "utf8"));
const ITALIAN = [61, 62, 63, 64].map((n) => read(`it/p${n}.txt`));
const COWPER = cowperItalian(read("pg6929.txt"));

/* the conventional number, the Harvard Classics' title, the first line as a
   modern edition gives it (to find it by), its count of lines */
const ENGLISH: { n: string; title: string; first: string; lines: number }[] = [
  { n: "1", title: "To the Nightingale", first: "O Nightingale that on yon bloomy spray", lines: 14 },
  { n: "7", title: "On His Being Arrived to the Age of Twenty-three", first: "How soon hath Time, the subtle thief of youth,", lines: 14 },
  { n: "8", title: "When the Assault Was Intended to the City", first: "Captain or Colonel, or Knight in Arms,", lines: 14 },
  { n: "9", title: "To a Virtuous Young Lady", first: "Lady that in the prime of earliest youth", lines: 14 },
  { n: "10", title: "To the Lady Margaret Ley", first: "Daughter to that good Earl, once President", lines: 14 },
  { n: "11", title: "On the Detraction Which Followed upon My Writing Certain Treatises", first: "A Book was writ of late called Tetrachordon,", lines: 14 },
  { n: "12", title: "On the Same", first: "I did but prompt the age to quit their clogs", lines: 14 },
  { n: "", title: "On the New Forcers of Conscience", first: "Because you have thrown off your Prelate Lord,", lines: 20 },
  { n: "13", title: "To Mr. H. Lawes on His Airs", first: "Harry, whose tuneful and well-measured song", lines: 14 },
  { n: "14", title: "On the Religious Memory of Mrs. Catherine Thomson, My Christian Friend, Deceased Dec. 16, 1646", first: "When Faith and Love, which parted from thee never,", lines: 14 },
  { n: "15", title: "On the Lord General Fairfax at the Siege of Colchester", first: "Fairfax, whose name in arms through Europe rings,", lines: 14 },
  { n: "16", title: "To the Lord General Cromwell, May 1652, on the Proposals of Certain Ministers at the Committee for the Propagation of the Gospel", first: "Cromwell, our chief of men, who through a cloud", lines: 14 },
  { n: "17", title: "To Sir Henry Vane the Younger", first: "Vane, young in years, but in sage counsel old,", lines: 14 },
  { n: "18", title: "On the Late Massacre in Piedmont", first: "Avenge, O Lord, thy slaughtered saints, whose bones", lines: 14 },
  { n: "19", title: "On His Blindness", first: "When I consider how my light is spent", lines: 14 },
  { n: "20", title: "To Mr. Lawrence", first: "Lawrence, of virtuous father virtuous son,", lines: 14 },
  { n: "21", title: "To Cyriack Skinner", first: "Cyriack, whose grandsire on the royal bench", lines: 14 },
  { n: "22", title: "To the Same", first: "Cyriack, this three years' day these eyes, though clear", lines: 14 },
  { n: "23", title: "On His Deceased Wife", first: "Methought I saw my late espoused saint", lines: 14 },
];
/* a name the edition leaves in Milton's spelling, given its modern one (asked) */
const NAMES: { from: RegExp; to: string }[] = [{ from: /\bPiemontese\b/g, to: "Piedmontese" }];
/* a word where the edition departs from Milton's printed text, given his,
   read in the Oxford World's Classics edition (asked): by poem and line */
const READINGS: { poem: string; line: number; from: string; to: string }[] = [
  { poem: "1", line: 1, from: "blooming", to: "bloomy" },
  { poem: "9", line: 2, from: "hast", to: "hath" },
];
/* the conventional number, the transcription's section, Cowper's numeral, Cowper's title */
const ITALIAN_POEMS: { n: string; section: string; cowper: string; title: string; lines: number }[] = [
  { n: "2", section: "2", cowper: "I", title: "", lines: 14 },
  { n: "3", section: "3", cowper: "II", title: "", lines: 14 },
  { n: "", section: "canzone", cowper: "III", title: "Canzone", lines: 15 },
  { n: "4", section: "4", cowper: "IV", title: "To Charles Diodati", lines: 14 },
  { n: "5", section: "5", cowper: "V", title: "", lines: 14 },
  { n: "6", section: "6", cowper: "VI", title: "", lines: 14 },
];
const NOTE = "Text: *The Complete Poems of John Milton*, The Harvard Classics, vol. 4 (New York, 1909), from two scans on the Internet Archive read against each other. The Italian sonnets as printed in *Poems of Mr. John Milton* (1645), from the transcription on Italian Wikisource, beside William Cowper’s translations.";
const NOTE_ENGLISH = "Text: *The Complete Poems of John Milton*, The Harvard Classics, vol. 4 (New York, 1909), from two scans on the Internet Archive read against each other.";
const NOTE_CANZONE = "Text: *Poems of Mr. John Milton* (1645), from the transcription on Italian Wikisource, beside William Cowper’s translation.";

const IMPORTS = join(HOME, "Desktop/gesta-imports") + "/";
if (!resolve(OUT).startsWith(IMPORTS)) throw new Error(`the folder is emptied before it is written, so it must be inside ${IMPORTS}: ${OUT}`);
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const numbered: Sonnet[] = [], apart: Sonnet[] = [];
const report = new Map<string, string>();
const respelled: string[] = [], restored: string[] = [];
const counts = { lines: 0, agreed: 0, settled: 0, unsettled: 0, unconfirmed: 0 };

for (const s of ENGLISH) {
  const witness = witnessPoem(THURBER, s.first, s.lines) ?? witnessPoem(BEECHING, s.first, s.lines);
  const sa = findStart(A, s.first), sb = findStart(B, s.first);
  if (!witness || sa == null || sb == null) throw new Error(`${s.n || s.title}: not found (witness ${!!witness}, scan A ${sa}, scan B ${sb})`);
  const ca = cutPoem(A, sa, witness), cb = cutPoem(B, sb, witness);
  if (ca.lines.length !== s.lines || cb.lines.length !== s.lines) throw new Error(`${s.n || s.title}: ${ca.lines.length} and ${cb.lines.length} lines, not ${s.lines}`);
  const lines: string[] = [], decisions: Decision[] = [];
  ca.lines.forEach((la, i) => {
    const r = readLine(la, cb.lines[i], { witness: witness[i], known: KNOWN, n: i + 1 });
    /* the stress marks left off, as the bookshelf's Paradise Lost has them (asked) */
    let text = unstressed(r.text);
    for (const r of READINGS.filter((r) => r.poem === (s.n || s.title) && r.line === i + 1)) {
      const re = new RegExp(`\\b${r.from}\\b`);
      if (!re.test(text)) throw new Error(`${r.poem}.${r.line}: no "${r.from}" in ${text}`);
      text = text.replace(re, r.to);
      restored.push(`${r.poem}, line ${r.line}: ${r.from} → ${r.to}`);
    }
    for (const { from, to } of NAMES) text = text.replace(from, (old) => { respelled.push(`${s.n || s.title}, line ${i + 1}: ${old} → ${to}`); return to; });
    lines.push(text);
    decisions.push(...r.decisions);
    if (!r.decisions.length) counts.agreed++;
  });
  counts.lines += lines.length;
  for (const d of decisions) {
    if (d.why.startsWith("UNSETTLED")) counts.unsettled++;
    else if (d.why.startsWith("UNCONFIRMED")) counts.unconfirmed++;
    else counts.settled++;
  }
  (s.n ? numbered : apart).push({ n: s.n, title: s.title, lines, ...(s.n ? {} : { note: NOTE_ENGLISH }) });
  const witnessName = witnessPoem(THURBER, s.first, s.lines) ? "Thurber" : "Beeching";
  report.set(s.n || s.title, `<p class="src">Both scans; the witness ${witnessName}. Lines run over and joined: ${ca.joins} in one scan, ${cb.joins} in the other.</p>` +
    `<table>${lines.map((l, i) => `<tr><td class="n">${(i + 1) % 5 ? "" : i + 1}</td><td>${esc(l)}</td><td class="w">${esc(witness[i])}</td></tr>`).join("")}</table>` +
    (decisions.length ? `<ul>${decisions.map((d) => `<li class="${d.why.startsWith("UN") ? "flag" : ""}">line ${d.line}: one scan <code>${esc(d.a) || "—"}</code>, the other <code>${esc(d.b) || "—"}</code> → <code>${esc(d.chose) || "left out"}</code> (${esc(d.why)})</li>`).join("")}</ul>` : `<p class="src">The scans agree on every word and mark.</p>`));
}
for (const p of ITALIAN_POEMS) {
  const lines = italianPoem(ITALIAN, p.section), translation = COWPER.get(p.cowper);
  if (lines.length !== p.lines || translation?.length !== p.lines) throw new Error(`${p.title || p.n}: ${lines.length} lines, ${translation?.length} translated, not ${p.lines}`);
  counts.lines += lines.length;
  (p.n ? numbered : apart).push({ n: p.n, title: p.title, lines, translation, ...(p.n ? {} : { note: NOTE_CANZONE }) });
  report.set(p.n || p.title, `<p class="src">The 1645 text, validated on Italian Wikisource; Cowper's translation from Gutenberg's Poemata.</p><table>${lines.map((l, i) => `<tr><td class="n">${(i + 1) % 5 ? "" : i + 1}</td><td>${esc(l)}</td><td class="w">${esc(translation[i])}</td></tr>`).join("")}</table>`);
}
numbered.sort((x, y) => +x.n - +y.n);

/* a page the backup has already is left out: an edit made there would be lost */
const entries = sonnetEntries(numbered, apart, NOTE);
const had = Object.keys(entries).filter((f) => existsSync(join(BACKUP, f)));
if (had.length) throw new Error("the backup has these already: " + had.join(", "));
for (const md of Object.values(entries)) if (serializeMarkdown(parseMarkdown(md)) !== md) throw new Error("an entry does not survive its round trip: " + md.slice(0, 80));

rmSync(OUT, { recursive: true, force: true });
for (const [path, md] of Object.entries(entries)) {
  mkdirSync(dirname(join(OUT, path)), { recursive: true });
  writeFileSync(join(OUT, path), md);
}
const order = [...numbered.map((s) => s.n), ...apart.map((s) => s.title)];
const head = (k: string): string => { const s = [...numbered, ...apart].find((x) => (x.n || x.title) === k)!; return s.n ? `Sonnet ${s.n}${s.title ? ": " + s.title : ""}` : s.title; };
writeFileSync(join(dirname(OUT), basename(OUT) + ".html"), `<!doctype html><meta charset="utf-8"><title>Milton's sonnets</title>
<style>body{font:16px/1.45 Georgia,serif;margin:2em auto;max-width:64em;padding:0 1em}td{padding:0 1em 0 0;vertical-align:top}.n{color:#999;text-align:right;font-size:.8em}.w{color:#777;font-size:.9em}.src{color:#555;font-size:.9em}li{font-size:.85em;color:#555}li.flag{color:#a00}code{font-size:.95em}</style>
<h1>Milton's sonnets</h1>
<p>A page a sonnet under <code>Milton, John/Sonnets</code>, keyed by its usual number and headed with the Harvard Classics' title, referred to <code>[Milton, *Sonnets*, 19.1-14]</code>; the Canzone and On the New Forcers of Conscience, which have no number, works of their own beside them. The English text is the Harvard Classics' (1909), read from two scans of it; in grey beside each line the witness that settled a disagreement, Thurber's school edition (1901) or Beeching's original-spelling one (1900), which differ from the Harvard text in places and were never followed where the two scans agree. Under each sonnet, every place the scans disagree and how it was settled; in red anything not settled by the scans or a witness. The Italian sonnets are as printed in 1645, each line paired with Cowper's translation.</p>
<p>Words where the Harvard Classics departs from Milton's printed text, given his as the Oxford World's Classics edition reads: ${restored.map(esc).join("; ")}.</p>
<p>Names the Harvard Classics leaves in Milton's spelling, given their modern one: ${respelled.map(esc).join("; ")}; and the title of 18, Piemont made Piedmont.</p>
<p>${counts.lines} lines; ${counts.agreed} of the English lines read the same in both scans; ${counts.settled} words or marks settled, ${counts.unsettled} unsettled, ${counts.unconfirmed} read alike in both scans but found in no dictionary or other Milton text.</p>
${order.map((k) => `<h2>${esc(head(k))}</h2>${report.get(k)}`).join("\n")}`);
console.log(`readings restored: ${restored.join("; ")}`);
console.log(`names respelled: ${respelled.join("; ")}`);
console.log(`${Object.keys(entries).length} pages, ${counts.lines} lines; English lines agreeing ${counts.agreed}; settled ${counts.settled}, unsettled ${counts.unsettled}, unconfirmed ${counts.unconfirmed}`);
console.log(`written to ${OUT}`);
