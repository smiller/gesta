/* node tools/miltonMasksRun.ts — Arcades and Comus: their outline from
   Thurber's edition, their words from the Harvard Classics' two scans read
   against each other (all cached under tools/out/harvard); written under
   OUT (default ~/Desktop/gesta-imports/gesta-milton-masks) for an import, a
   review page beside it, the counts printed; tools/miltonCapsRun.ts gives
   the pages Paradise Lost's capitals afterwards */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { scanLines, findStart, cutPoem, readLine, vocabulary, unstressed, letters, similar, words } from "./harvardMilton.ts";
import { hocrLines, stripSheets, findLine, type HocrLine } from "./harvardStrips.ts";
import { KEPT_FORMS, KEPT_NAMES, respell } from "./miltonSpellings.ts";
import { NUMERAL, runningHead, unspecked, elided, smallCaps, placeLines, indents, paragraphs } from "./miltonPoems.ts";
import { thurberItems, misnumbered, maskPage, type Item } from "./miltonMasks.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

const HOME = process.env.HOME!;
const BACKUP = process.env.BACKUP ?? join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.env.OUT ?? join(HOME, "Desktop/gesta-imports/gesta-milton-masks");
const CACHE = new URL("out/harvard/", import.meta.url).pathname;
const read = (f: string): string => readFileSync(CACHE + f, "utf8");
const THURBER = read("pg31706.txt").replace(/\r\n/g, "\n").split("\n");
const KNOWN = vocabulary(read("pg26.txt"), read("pg58.txt"), readFileSync("/usr/share/dict/words", "utf8"));
const PREFIX = /^(Comus|Lady|Eld\.\s*Bro|Sec\.\s*Bro|Spir|Sabr|Gen)\.\s+/;
const scan = (f: string): string[] => scanLines(read(f)).map(unspecked).filter((l) => !NUMERAL.test(l) && !runningHead(l)).map((l) => l.replace(PREFIX, ""));
const A = scan("harvardclassicsv0004milt.txt"), B = scan("completepoems00miltuoft.txt");
const BEECHING = read("pg1745.txt").replace(/\r\n/g, "\n").split("\n").map((l) => l.replace(/\s{2,}\d+\s*$/, "").trim());
const HOCR = hocrLines(read("harvardclassicsv0004milt_hocr.html")).filter((l) => /[a-z]/.test(l.text) && !NUMERAL.test(l.text) && !runningHead(l.text));

interface Mask { key: string; from: RegExp; to: RegExp; lines: number; directions: string[]; front: string;
  /* a verse paragraph the edition begins where Thurber does not, by its indent */
  opens?: number[] }
const MASKS: Mask[] = [
  {
    key: "Arcades", from: /^\s+I\. _Song\._$/, to: /^\s+AT A SOLEMN MUSIC\.$/, lines: 109,
    directions: ["As they come forward"],
    front: "Part of an Entertainment presented to the Countess Dowager of Derby at Harefield by some Noble Persons of her Family; who appear on the Scene in pastoral habit, moving toward the seat of state, with this song:",
  },
  {
    key: "Comus", from: /^\s+The first Scene discovers a wild wood\.$/, to: /^\s+LYCIDAS\.$/, lines: 1023,
    directions: ["The first Scene discovers", "The Attendant Spirit descends", "Comus enters, with a charming-rod", "The Lady enters.", "The Two Brothers.",
      "The Attendant Spirit, habited like a shepherd.", "The Scene changes to a stately palace", "The Brothers rush in", "Sabrina rises, attended",
      "Sabrina descends", "The Scene changes, presenting Ludlow", "This second Song presents", "The dances ended"],
    opens: [1018],
    front: "The Persons\n\nThe Attendant Spirit, afterwards in the habit of Thyrsis.\nComus, with his Crew.\nThe Lady.\nFirst Brother.\nSecond Brother.\nSabrina, the Nymph.\n\nPresented at Ludlow Castle, 1634, before the Earl of Bridgewater, then President of Wales.\n\nThe Chief Persons which presented were:— The Lord Brackley; Mr. Thomas Egerton, his Brother; The Lady Alice Egerton.",
  },
];
const NOTE = "Text: *The Complete Poems of John Milton*, The Harvard Classics, vol. 4 (New York, 1909), from two scans on the Internet Archive read against each other; the speakers and directions laid out after Thurber’s edition (1901).";

/* the words a scan prints for each of Thurber's lines and directions, a
   heading the scans read as capitals (SONG) passed over */
const inScan = (i: Item): i is Extract<Item, { kind: "line" | "direction" }> | Extract<Item, { kind: "heading" }> => i.kind === "line" || i.kind === "direction" || (i.kind === "heading" && i.text === "The Measure");
const textOf = (i: Item): string => (i.kind === "speaker" ? i.name : i.text);

/* a line or direction as read on the printed page (scan A's image) where
   the two scans' reading of it is wrong: a speck taken for a mark (string:,
   mould,, “wood, strength”,, ear,;,, “(Though, crystal:), an apostrophe misread
   (°T, “T, Tis, tis), a false ligature (upœn), a word run on or broken
   (thicketside, delicious-ness, Attend-Ant, drivenin), a name misread
   (Broruers, Sabrinna); the other disputed lines read as the scans' reading
   has them */
const SEEN: Record<string, string> = {
  "Arcades 87": "And touch the warbled string.",
  "Comus direction before 1": "The first Scene discovers a wild wood.",
  "Comus 17": "With the rank vapours of this sin-worn mould.",
  "Comus 126": "’T is only daylight that makes sin,",
  "Comus 185": "Stepped, as they said, to the next thicket side",
  "Comus 220": "To keep my life and honour unassailed. . . .",
  "Comus 249": "How sweetly did they float upon the wings",
  "Comus 303": "It were a journey like the path to Heaven",
  "Comus direction before 331": "The Two Brothers",
  "Comus 385 ⟨…⟩": "’Tis most true",
  "Comus 416 ⟨…⟩": "What hidden strength,",
  "Comus 513": "I’ll tell ye, ’tis not vain or fabulous",
  "Comus 514": "(Though so esteemed by shallow ignorance)",
  "Comus 560": "Still to be so displaced. I was all ear,",
  "Comus direction before 659": "The Scene changes to a stately palace, set out with all manner of deliciousness: soft music, tables spread with all dainties. Comus appears with his rabble, and the Lady set in an inchanted chair; to whom he offers his glass; which she puts by, and goes about to rise.",
  "Comus 673": "That flames and dances in his crystal bounds,",
  "Comus 690 ⟨…⟩": "’T will not, false traitor!",
  "Comus 691": "’T will not restore the truth and honesty",
  "Comus 806": "And try her yet more strongly.—Come, no more!",
  "Comus direction before 814": "The Brothers rush in with swords drawn, wrest his glass out of his hand, and break it against the ground: his rout make sign of resistance, but are all driven in. The Attendant Spirit comes in.",
  "Comus direction before 890": "Sabrina rises, attended by Water-nymphs, and sings.",
  "Comus direction before 958": "The Scene changes, presenting Ludlow Town, and the President’s Castle: then come in Country Dancers; after them the Attendant Spirit, with the two Brothers and the Lady.",
};
/* a stress the edition marks with a prime the scans read as an apostrophe,
   left off as the bookshelf's other stress marks are (asked) */
const unprimed = (s: string): string => s.replace(/\b(com|con)’(plete|gealed)\b/g, "$1$2");
/* the edition's spaced points (. . .) an ellipsis, as the bookshelf's Milton writes it */
const ellipsis = (s: string): string => s.replace(/\.( ?\.){3}/g, "….").replace(/\.( ?\.){2}/g, "…");
/* the words of a direction set in small capitals (the GENIus OF THE Woop)
   given an ordinary word's case */
const plainCaps = (s: string): string => s.replace(/\b(\p{Lu})(\p{L}*\p{Lu}\p{L}*)\b/gu, (w, f, r) => (w.length > 1 ? f + r.toLowerCase() : w));
/* where the Harvard Classics' words are not those of Milton's own printing,
   spelling aside, from the sweep against Beeching's text read line by line:
   each left as Harvard prints it until read in the Oxford edition */
/* where the Oxford World's Classics edition reads otherwise than Harvard,
   its words (asked) */
const READINGS: { at: string; from: string; to: string }[] = [
  { at: "Comus 278", from: "leavy", to: "leafy" },
  { at: "Comus 289", from: "Where they", to: "Were they" },
  { at: "Comus 553", from: "drowsy-flighted", to: "drowsy frighted" },
];
const DEPARTURES: { at: string; harvard: string; milton: string }[] = [
  { at: "Comus 43", harvard: "for I will tell you now", milton: "Beeching: for I will tell ye now" },
  { at: "Comus 278", harvard: "this leavy labyrinth", milton: "Beeching: this heavy Labyrinth" },
  { at: "Comus 282", harvard: "To seek i’ the valley", milton: "Beeching: To seek in vally" },
  { at: "Comus 289", harvard: "Where they of manly prime", milton: "Beeching: Were they of manly prime" },
  { at: "Comus 375", harvard: "Were in the flat sea sunk", milton: "Beeching: Were in the salt sea sunk" },
  { at: "Comus 380", harvard: "Were all to-ruffled", milton: "Beeching: Were all too ruffled" },
  { at: "Comus 493", harvard: "my father’s Shepherd", milton: "Beeching: my father Shepherd" },
  { at: "Comus 553", harvard: "the drowsy-flighted steeds", milton: "Beeching: the drowsie frighted steeds" },
  { at: "Comus 988", harvard: "There eternal Summer dwells", milton: "Beeching: That there eternal Summer dwels" },
];
const IMPORTS = join(HOME, "Desktop/gesta-imports") + "/";
if (!resolve(OUT).startsWith(IMPORTS)) throw new Error(`the folder is emptied before it is written, so it must be inside ${IMPORTS}: ${OUT}`);
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const near = (k: string, ws: string[]): boolean => ws.some((v) => similar(k, v) >= 0.6);
const entries: Record<string, string> = {};
const report: string[] = [], spelt: string[] = [], respelled: string[] = [], seenRows: string[] = [], departures: string[] = [], unconfirmed: string[] = [];
const disputed: { label: string; line: HocrLine }[] = [];
const unused = new Set(Object.keys(SEEN)), unread = new Set(READINGS.map((r) => r.at));
const counts = { items: 0, agreed: 0, read: 0 };

for (const m of MASKS) {
  const t0 = THURBER.findIndex((l) => m.from.test(l)), t1 = THURBER.findIndex((l, i) => i > t0 && m.to.test(l));
  const items = thurberItems(THURBER.slice(t0, t1), m.directions);
  let count = 0;
  for (const it of items) if (it.kind === "line" && !it.rest && m.opens?.includes(++count)) it.opens = true;
  const lines = items.filter((i) => i.kind === "line" && !i.rest).length, rests = items.filter((i) => i.kind === "line" && i.rest).length;
  const bad = misnumbered(items);
  console.log(m.key, "lines", lines, "rests", rests, "speakers", items.filter((i) => i.kind === "speaker").length, "directions", items.filter((i) => i.kind === "direction").length, "headings", items.filter((i) => i.kind === "heading").map(textOf).join("/"), "paragraphs", items.filter((i) => i.kind === "line" && i.opens).length);
  if (bad.length) console.log("  misnumbered:", bad.slice(0, 5));
  if (lines !== m.lines) throw new Error(`${m.key}: ${lines} lines, not ${m.lines}`);
  const w = items.filter(inScan).map(textOf);
  const first = w[0];
  const sa = findStart(A, first), sb = findStart(B, first);
  if (sa == null || sb == null) throw new Error(`${m.key}: not found in a scan (${sa}, ${sb})`);
  const ca = cutPoem(A, sa, w), cb = cutPoem(B, sb, w);
  const off = w.map((x, i) => [i, similar(letters(ca.lines[i] ?? ""), letters(x)), similar(letters(cb.lines[i] ?? ""), letters(x))] as const).filter(([, a, b]) => a < 0.6 || b < 0.6);
  console.log("  cut", ca.lines.length, cb.lines.length, "of", w.length, "off", off.slice(0, 8).map(([i, a, b]) => `${i}:${a.toFixed(2)}/${b.toFixed(2)} ${w[i].slice(0, 30)} | ${ca.lines[i]?.slice(0, 30)} | ${cb.lines[i]?.slice(0, 30)}`));
  /* the masque's own pages, from its first line or direction found whole */
  const h = HOCR.map((l) => ({ ...l, text: l.text.replace(PREFIX, "") }));
  const placed = placeLines(h.slice(h.indexOf(findLine(h, w[0], w[1])!)), w);
  if (process.env.INDENTS) {
    const ind = indents(placed), its = items.filter(inScan);
    let n2 = 0;
    its.forEach((it, k) => {
      if (it.kind === "line" && !it.rest) n2++;
      const prev = items[items.indexOf(it) - 1];
      if (it.kind === "line" && !it.rest && prev?.kind === "line" && (paragraphs(ind)[k] || it.opens)) console.log(`  ${m.key} ${n2} harvard ${paragraphs(ind)[k] ? ind[k] : "—"} thurber ${it.opens ? "yes" : "—"} ${it.text.slice(0, 50)}`);
    });
  }
  const read: string[] = [];
  const ids = new Map<string, number>();
  let n = 0, bAt = BEECHING.findIndex((l) => similar(letters(l), letters(w.find((_, k) => items.filter(inScan)[k].kind === "line")!)) > 0.6);
  items.filter(inScan).forEach((it, k) => {
    if (it.kind === "line" && !it.rest) n++;
    const base = `${m.key} ${it.kind === "line" ? n + (it.rest ? " ⟨…⟩" : "") : it.kind === "direction" ? "direction before " + (n + 1) : it.text}`;
    ids.set(base, (ids.get(base) ?? 0) + 1);
    const id = ids.get(base)! > 1 ? `${base} (${ids.get(base)})` : base;
    const r = readLine(ca.lines[k], cb.lines[k], { witness: w[k], known: KNOWN, n: k ? 2 : 1 });
    const seen = SEEN[id];
    if (seen && similar(letters(seen), letters(r.text)) < 0.85) throw new Error(`${id}: the line read on the page is not this one: ${r.text}`);
    unused.delete(id);
    let text = seen ?? (it.kind === "line" ? (/^\P{L}*\p{Lu}\p{L}*\p{Lu}/u.test(r.text) ? smallCaps(r.text) : r.text) : plainCaps(r.text));
    text = respell(ellipsis(unprimed(unstressed(elided(text)))), id, spelt, respelled);
    for (const rd of READINGS.filter((rd) => rd.at === id)) {
      if (!text.includes(rd.from)) throw new Error(`${id}: no "${rd.from}" in ${text}`);
      text = text.replace(rd.from, rd.to);
      unread.delete(rd.at);
    }
    read.push(text);
    counts.items++;
    if (!r.decisions.length) counts.agreed++;
    for (const d of r.decisions.filter((d) => d.why.startsWith("UNCONFIRMED"))) unconfirmed.push(`${id}: ${d.chose}`);
    const hard = r.decisions.filter((d) => !/the witness's word|a speck|UNCONFIRMED/.test(d.why));
    if (hard.length) {
      counts.read++;
      disputed.push({ label: `${id}\n${text}\n${hard.map((d) => `${d.a || "—"} / ${d.b || "—"} → ${d.chose || "out"}`).join("; ")}`, line: placed[k] });
      seenRows.push(`<tr><td class="n">${esc(id)}</td><td>${hard.map((d) => `<code>${esc(d.a) || "—"}</code> / <code>${esc(d.b) || "—"}</code>`).join("; ")}</td><td>${seen ? `<b>${esc(seen)}</b>` : "as the scans’ reading has it"}</td></tr>`);
    }
    if (it.kind === "line" && bAt >= 0) {
      let best = -1, bestAt = bAt;
      for (let j = bAt; j < bAt + 8 && j < BEECHING.length; j++) { const s = similar(letters(BEECHING[j]), letters(text)); if (s > best) { best = s; bestAt = j; } }
      if (best >= 0.5) {
        bAt = bestAt + 1;
        const ours = words(text).map(letters).filter(Boolean), theirs = words(BEECHING[bestAt]).map(letters).filter(Boolean);
        if (ours.some((x) => !near(x, theirs)) || theirs.some((x) => !near(x, ours))) departures.push(`<tr><td class="n">${esc(id)}</td><td>${esc(text)}</td><td class="w">${esc(BEECHING[bestAt])}</td></tr>`);
      }
    }
  });
  let r = 0;
  const harvard = items.map((it) => (inScan(it) ? { ...it, text: read[r++] } : it));
  const md = maskPage(m.key, [m.front, NOTE], harvard);
  entries[`bookshelf/Milton, John/${m.key}.md`] = md;
  report.push(`<h2>${esc(m.key)}</h2><pre>${esc(md)}</pre>`);
}
if (unused.size) throw new Error("page readings for lines with nothing disputed: " + [...unused].join(", "));
if (unread.size) throw new Error("readings for lines not met: " + [...unread].join(", "));
if (process.env.STRIPS) console.log(await stripSheets(disputed, join(CACHE, "masks-strips"), 16, 1));
const had = Object.keys(entries).filter((f) => existsSync(join(BACKUP, f)));
if (had.length) throw new Error("the backup has these already: " + had.join(", "));
for (const md of Object.values(entries)) if (serializeMarkdown(parseMarkdown(md)) !== md) throw new Error("an entry does not survive its round trip: " + md.slice(0, 80));
rmSync(OUT, { recursive: true, force: true });
for (const [path, md] of Object.entries(entries)) {
  mkdirSync(dirname(join(OUT, path)), { recursive: true });
  writeFileSync(join(OUT, path), md);
}
writeFileSync(join(dirname(OUT), basename(OUT) + ".html"), `<!doctype html><meta charset="utf-8"><title>Arcades and Comus</title>
<style>body{font:16px/1.45 Georgia,serif;margin:2em auto;max-width:64em;padding:0 1em}td{padding:0 1em 0 0;vertical-align:top}.n{color:#999;font-size:.8em;white-space:nowrap}.w{color:#777;font-size:.9em}code{font-size:.95em}pre{white-space:pre-wrap;font:15px/1.4 Georgia,serif;background:#f6f6f0;padding:1em}</style>
<h1>Arcades and Comus</h1>
<p>Two pages beside Lycidas, laid out as the bookshelf's plays are: a speaker a bold row, its name written out (Elder Brother for Eld. Bro.), a stage direction or a song's heading an italic row, a line split between speakers one line, its rest marked ⟨…⟩ (16 in Comus). The outline — who speaks, the directions, the headings, the splits, the verse paragraphs — is Thurber's edition's; the words are the Harvard Classics', read from its two scans against each other (${counts.items} lines and directions, ${counts.agreed} read the same in both), Thurber's settling where they differ, ${counts.read} read on the printed page.</p>
<p>Names given their modern spelling in the Persons: Bracly → Brackley. Stress primes left off: com′plete, con′gealed. The edition's spaced points an ellipsis (…), as the bookshelf's Milton writes it.</p>
<p>Spellings given the bookshelf's: ${spelt.map(esc).join("; ") || "none"}. Kept: ${KEPT_FORMS.join(", ")}. Names given their modern spelling: ${respelled.map(esc).join("; ") || "none"}. Kept: ${KEPT_NAMES.join(", ")}.</p>
<p>Read alike in both scans but found in no dictionary or other Milton text: ${unconfirmed.map(esc).join("; ")}.</p>
<h2>For a reading in the Oxford edition</h2>
<p>Where the Harvard Classics' words are not those of Milton's own printing, spelling aside, each read in the Oxford edition: its reading taken where it differs from Harvard's. Found by a sweep against Beeching's text line by line.</p>
<table>${DEPARTURES.map((d) => `<tr><td class="n">${esc(d.at)}</td><td>Harvard <b>${esc(d.harvard)}</b></td><td>${esc(d.milton)}</td><td>${READINGS.some((r) => r.at === d.at) ? "the Oxford edition’s reading taken" : "Harvard’s kept, as the Oxford edition reads"}</td></tr>`).join("")}</table>
<details><summary>Every line the sweep found (${departures.length}), spelling, speakers' prefixes and compounding among them</summary><table>${departures.join("")}</table></details>
<h2>Read on the printed page</h2>
<table>${seenRows.join("")}</table>
${report.join("\n")}`);
console.log(`${Object.keys(entries).length} pages; ${counts.items} lines and directions, ${counts.agreed} agreeing; read on the page ${counts.read}; spellings ${spelt.length}; names ${respelled.length}; departures ${departures.length}`);
console.log(`written to ${OUT}`);
