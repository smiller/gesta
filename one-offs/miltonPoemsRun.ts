/* node one-offs/miltonPoemsRun.ts — Milton's shorter English poems from the
   Harvard Classics' two scans read against each other (all cached under
   one-offs/out/harvard), a page each beside Lycidas; written under OUT
   (default ~/Desktop/gesta-imports/gesta-milton-poems) for an import, a
   review page beside it, the counts printed */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { scanLines, editionLines, findStart, cutPoem, readLine, vocabulary, unstressed, letters, similar } from "./harvardMilton.ts";
import { hocrLines, stripSheets, type HocrLine } from "./harvardStrips.ts";
import { KEPT_FORMS, KEPT_NAMES, respell } from "./miltonSpellings.ts";
import { NUMERAL, runningHead, unspecked, witnessGaps as gapsOf, placeLines, indents as indentsOf, paragraphs, elided, smallCaps, poemPage } from "./miltonPoems.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

const HOME = process.env.HOME!;
const BACKUP = process.env.BACKUP ?? join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.env.OUT ?? join(HOME, "Desktop/gesta-imports/gesta-milton-poems");
const CACHE = new URL("out/harvard/", import.meta.url).pathname;
const read = (f: string): string => readFileSync(CACHE + f, "utf8");
const THURBER = editionLines(read("pg31706.txt"));
const BEECHING = editionLines(read("pg1745.txt"));
const KNOWN = vocabulary(read("pg26.txt"), read("pg58.txt"), readFileSync("/usr/share/dict/words", "utf8"));
const HOCR = hocrLines(read("harvardclassicsv0004milt_hocr.html"));

interface Poem {
  key: string; first: string; lines: number;
  /* the edition whose lines settle the cut and the readings, its first line
     as it spells it; none for the two psalms, which neither has: scan A's
     lines stand in, a stanza every `stanza` lines */
  witness: "Thurber" | "Beeching" | null; witnessFirst?: string; stanza?: number;
  /* a refrain the edition abbreviates, given whole */
  refrain?: { at: RegExp; lines: string[] };
  /* lines of the edition's that are not verse: dropped from scans and witness alike */
  prose?: RegExp[];
}
const POEMS: Poem[] = [
  { key: "On the Morning of Christ’s Nativity", first: "This is the month, and this the happy morn,", lines: 244, witness: "Thurber" },
  { key: "A Paraphrase on Psalm CXIV", first: "When the blest seed of Terah’s faithful son", lines: 18, witness: null },
  { key: "Psalm CXXXVI", first: "Let us with a gladsome mind", lines: 96, witness: null, stanza: 4,
    refrain: { at: /^For his[,.]? &c\b/, lines: ["For his mercies aye endure,", "Ever faithful, ever sure."] } },
  { key: "On the Death of a Fair Infant Dying of a Cough", first: "O fairest flower, no sooner blown but blasted,", lines: 77, witness: "Beeching", witnessFirst: "O FAIREST flower no sooner blown but blasted," },
  { key: "At a Vacation Exercise in the College, Part Latin, Part English", first: "Hail, native Language, that by sinews weak", lines: 100, witness: "Beeching", witnessFirst: "HAIL native Language, that by sinews weak",
    prose: [/latin speeches ended/i, /^then ens is/i, /^(sons[;,] )?whereof the eldest/i, /^(which ens,? )?thus speaking/i, /^which ens/i, /^the$/i, /^(the )?next,? quantity/i, /^called by his name/i, /^was call/i, /^the rest was prose/i] },
  { key: "The Passion", first: "Erewhile of music, and ethereal mirth,", lines: 56, witness: "Beeching", witnessFirst: "ERE-while of Musick, and Ethereal mirth," },
  { key: "On Shakespeare", first: "What needs my Shakespeare for his honoured bones,", lines: 16, witness: "Thurber" },
  { key: "On the University Carrier", first: "Here lies old Hobson. Death hath broke his girt,", lines: 18, witness: "Beeching", witnessFirst: "HERE lies old Hobson, Death hath broke his girt," },
  { key: "Another on the Same", first: "Here lieth one who did most truly prove", lines: 34, witness: "Beeching", witnessFirst: "HERE lieth one who did most truly prove," },
  { key: "An Epitaph on the Marchioness of Winchester", first: "This rich marble doth inter", lines: 74, witness: "Beeching", witnessFirst: "THIS rich Marble doth enterr" },
  { key: "L’Allegro", first: "Hence, loathed Melancholy,", lines: 152, witness: "Thurber" },
  { key: "Il Penseroso", first: "Hence, vain deluding Joys,", lines: 176, witness: "Thurber" },
  { key: "Song on May Morning", first: "Now the bright morning-star, Day’s harbinger,", lines: 10, witness: "Beeching", witnessFirst: "Now the bright morning Star, Dayes harbinger," },
  { key: "On Time", first: "Fly, envious Time, till thou run out thy race:", lines: 22, witness: "Beeching", witnessFirst: "FLY envious Time, till thou run out thy race," },
  { key: "At a Solemn Music", first: "Blest pair of Sirens, pledges of Heaven’s joy,", lines: 28, witness: "Thurber" },
  { key: "Upon the Circumcision", first: "Ye flaming Powers, and winged Warriors bright", lines: 28, witness: "Beeching", witnessFirst: "YE flaming Powers, and winged Warriours bright," },
];

const verse = (p: Poem) => (l: string): boolean => !NUMERAL.test(l.trim()) && !runningHead(l) && !(p.prose ?? []).some((re) => re.test(l.trim()));
const A = scanLines(read("harvardclassicsv0004milt.txt")).map(unspecked);
const B = scanLines(read("completepoems00miltuoft.txt")).map(unspecked);

const witnessGaps = (lines: string[], p: Poem) => gapsOf(lines, p.witnessFirst ?? p.first, p.lines, verse(p));

type Witnessed = { lines: string[]; gaps: boolean[] };
/* scan A's own lines, its stanzas every p.stanza lines, where the poem has no other witness */
function scanWitness(p: Poem, a: string[], sa: number): Witnessed {
  const lines = a.slice(sa, sa + p.lines);
  return { lines, gaps: lines.map((_, i) => !!p.stanza && i > 0 && i % p.stanza === 0) };
}
function witnessOf(p: Poem, a: string[], sa: number): Witnessed {
  if (!p.witness) return scanWitness(p, a, sa);
  const w = witnessGaps(p.witness === "Thurber" ? THURBER : BEECHING, p);
  if (!w) throw new Error(`${p.key}: not in ${p.witness}`);
  return w;
}
function starts(p: Poem, a: string[], b: string[]): [number, number] {
  const sa = findStart(a, p.first), sb = findStart(b, p.first);
  if (sa == null || sb == null) throw new Error(`${p.key}: first line not found (A ${sa}, B ${sb})`);
  return [sa, sb];
}
function counted(p: Poem, ...cuts: string[][]): void {
  if (cuts.some((c) => c.length !== p.lines)) throw new Error(`${p.key}: ${cuts[0].length}, ${cuts[1].length} and ${cuts[2].length} lines, not ${p.lines}`);
}
/* a poem cut from both scans, a line for each of its witness's */
function cut(p: Poem): { a: string[]; b: string[]; w: string[]; gaps: boolean[] } {
  const whole = (ls: string[]): string[] => ls.filter(verse(p)).flatMap((l) => (p.refrain?.at.test(l) ? p.refrain.lines : [l]));
  const a = whole(A), b = whole(B);
  const [sa, sb] = starts(p, a, b);
  const w = witnessOf(p, a, sa);
  const ca = cutPoem(a, sa, w.lines), cb = cutPoem(b, sb, w.lines);
  if (process.env.SHOW === p.key) ca.lines.forEach((l, i) => console.log(i + 1, "A:", l, "| B:", cb.lines[i], "| W:", w.lines[i]));
  counted(p, ca.lines, cb.lines, w.lines);
  return { a: ca.lines, b: cb.lines, w: w.lines, gaps: w.gaps };
}

function indents(p: Poem, lines: string[]): { ind: number[]; at: HocrLine[] } {
  const at = placeLines(HOCR.filter((l) => /[a-z]/.test(l.text) && verse(p)(l.text)), lines);
  return { ind: indentsOf(at), at };
}

/* a line as read on the printed page (scan A's image) where the two scans'
   reading of it is wrong: a speck taken for a mark (a., such”, up,, And.,
   stable,, regions., down., Throne,, doom?,), a word one scan ran into the next
   (Canaan Land), a word read twice (sure I I’ll), a capital misread (Ler), a ligature the scans' readings
   suggest but the page has not (lubbær); the other disputed lines read
   as the scans' reading has them */
const SEEN: Record<string, string> = {
  "On the Morning of Christ’s Nativity 87": "Sat simply chatting in a rustic row;",
  "On the Morning of Christ’s Nativity 101": "Nature, that heard such sound",
  "On the Morning of Christ’s Nativity 132": "Make up full consort to the angelic symphony.",
  "On the Morning of Christ’s Nativity 205": "And sullen Moloch, fled,",
  "On the Morning of Christ’s Nativity 243": "And all about the courtly stable",
  "A Paraphrase on Psalm CXIV 3": "And passed from Pharian fields to Canaan Land,",
  "Psalm CXXXVI 1": "Let us with a gladsome mind",
  "Psalm CXXXVI 54": "The tawny King with all his power;",
  "On the Death of a Fair Infant Dying of a Cough 33": "Could Heaven, for pity, thee so strictly doom?",
  "At a Vacation Exercise in the College, Part Latin, Part English 41": "And misty regions of wide air next under,",
  "At a Vacation Exercise in the College, Part Latin, Part English 73": "“Your Son,” said she, “(nor can you it prevent,)",
  "The Passion 16": "That dropt with odorous oil down his fair eyes,",
  "Another on the Same 18": "“If I may n’t carry, sure I’ll ne’er be fetched,",
  "L’Allegro 110": "Then lies him down, the lubber fiend,",
  "At a Solemn Music 7": "Aye sung before the sapphire-coloured Throne",
};
/* a line whose brackets the reading drops, as the edition prints it: an
   editor's word put in */
const PRINTED: Record<string, string> = {
  "On the Death of a Fair Infant Dying of a Cough 53": "Or wert thou [Mercy], that sweet smiling Youth?",
};
/* where the Harvard Classics' words are not those of Milton's own printing,
   spelling aside, from the sweep against Beeching's text read line by line:
   each read in the Oxford edition (asked) */
const DEPARTURES: { at: string; harvard: string; milton: string; owc?: boolean }[] = [
  { at: "On the Morning of Christ’s Nativity 141–144", harvard: "Yes, Truth and Justice then / … / The enamelled arras of the rainbow wearing; / And Mercy set between,", milton: "1673: Yea, Truth and Justice then / … / Orbed in a rainbow; and, like glories wearing, / Mercy will sit between, (Harvard’s is 1645’s)", owc: true },
  { at: "On the Morning of Christ’s Nativity 211", harvard: "The brutish gods of Nile", milton: "1645 and 1673: And brutish gods of Nile" },
  { at: "On the Death of a Fair Infant Dying of a Cough 53", harvard: "Or wert thou [Mercy], that sweet smiling Youth?", milton: "1673: Or wert thou that sweet smiling Youth! (a line short; Mercy is a later editor’s word)" },
  { at: "At a Vacation Exercise in the College, Part Latin, Part English 61", harvard: "The drowsy Nurse", milton: "1673: Thy drowsy Nurse", owc: true },
  { at: "The Passion 22", harvard: "These latest scenes", milton: "1645: These latter scenes (Harvard’s is 1673’s)" },
  { at: "The Passion 49", harvard: "That they would fitly fall", milton: "Beeching: They would fitly fall" },
  { at: "The Passion 50", harvard: "Or, should I thence, hurried on viewless wing,", milton: "Beeching: I thence hurried on viewless wing," },
  { at: "The Passion 55", harvard: "the infection of my sorrows loud", milton: "Beeching: the infection of my sorrows bound," },
  { at: "At a Solemn Music 21", harvard: "Broke the fair music", milton: "Beeching: The fair music" },
];

/* where the Oxford World's Classics edition reads otherwise than Harvard,
   its words (asked: Nativity 141–144 in 1673's version, Thurber's spelling) */
const READINGS: { at: string; from: string; to: string }[] = [
  { at: "On the Morning of Christ’s Nativity 141", from: "Yes, Truth", to: "Yea, Truth" },
  { at: "On the Morning of Christ’s Nativity 143", from: "The enamelled arras of the rainbow wearing;", to: "Orbed in a rainbow; and, like glories wearing," },
  { at: "On the Morning of Christ’s Nativity 144", from: "And Mercy set between,", to: "Mercy will sit between," },
  { at: "At a Vacation Exercise in the College, Part Latin, Part English 61", from: "The drowsy", to: "Thy drowsy" },
];


/* what the page holds besides the lines: Milton's own headnote (a note,
   asked), the headings, numerals and prose links inside the poem as italic
   rows, and the first line as Beeching spells it, for the sweep against
   Milton's printing */
const PAGE: Record<string, { front?: string; rows?: { before: number; text: string }[]; after?: string; beeching?: string; numerals?: boolean }> = {
  "On the Morning of Christ’s Nativity": { rows: [{ before: 29, text: "The Hymn" }], beeching: "This is the Month, and this the happy morn", numerals: true },
  "On the Death of a Fair Infant Dying of a Cough": { numerals: true },
  "The Passion": { numerals: true },
  "At a Vacation Exercise in the College, Part Latin, Part English": {
    rows: [
      { before: 1, text: "The Latin speeches ended, the English thus began:—" },
      { before: 59, text: "Then Ens is represented as Father of the Predicaments, his ten Sons; whereof the eldest stood for Substance with his Canons; which Ens, thus speaking, explains:—" },
      { before: 91, text: "The next, Quantity and Quality, spake in prose: then Relation was called by his name." },
    ],
    after: "The rest was prose.",
  },
  "On Shakespeare": { beeching: "WHAT needs my Shakespear for his honour'd Bones," },
  "On the University Carrier": { front: "Who sickened in the time of his Vacancy, being forbid to go to London by reason of the Plague." },
  "L’Allegro": { beeching: "HENCE loathed Melancholy" },
  "Il Penseroso": { beeching: "HENCE vain deluding joyes," },
  "At a Solemn Music": { beeching: "BLEST pair of Sirens, pledges of Heav'ns joy," },
};
const NOTE = "Text: *The Complete Poems of John Milton*, The Harvard Classics, vol. 4 (New York, 1909), from two scans on the Internet Archive read against each other.";
const NOTE_REFRAIN = " The refrain, which the edition gives in full only in the first and last stanzas (“For his, &c.”), is given whole in each.";

const AUTHOR = "bookshelf/Milton, John";
const IMPORTS = join(HOME, "Desktop/gesta-imports") + "/";
if (!resolve(OUT).startsWith(IMPORTS)) throw new Error(`the folder is emptied before it is written, so it must be inside ${IMPORTS}: ${OUT}`);
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const near = (k: string, ws: string[]): boolean => ws.some((v) => similar(k, v) >= 0.6);
const entries: Record<string, string> = {};
const report: string[] = [], spelt: string[] = [], respelled: string[] = [], seenRows: string[] = [], departures: string[] = [], unconfirmed: string[] = [];
const counts = { lines: 0, agreed: 0, settled: 0, read: 0 };
const unused = new Set(Object.keys(SEEN)), unread = new Set(READINGS.map((r) => r.at));
const why: Record<string, number> = {};
const disputed: { label: string; line: HocrLine }[] = [];

for (const p of POEMS) {
  const c = cut(p), page = PAGE[p.key] ?? {};
  const { ind, at } = indents(p, c.a);
  const opens = c.gaps.some(Boolean) ? c.gaps : paragraphs(ind);
  const milton = p.witness === "Beeching" ? c.w : p.witness ? witnessGaps(BEECHING, { ...p, witnessFirst: page.beeching })?.lines : null;
  const lines: string[] = [], decided: string[] = [];
  c.a.forEach((la, i) => {
    const id = `${p.key} ${i + 1}`;
    const r = readLine(la, c.b[i], { witness: p.witness ? c.w[i] : "", known: KNOWN, n: i + 1 });
    const seen = SEEN[id];
    if (seen && similar(letters(seen), letters(r.text)) < 0.85) throw new Error(`${id}: the line read on the page is not this one: ${r.text}`);
    unused.delete(id);
    /* the stress marks left off, as the bookshelf's Paradise Lost has them (asked) */
    let text = unstressed(elided(PRINTED[id] ?? seen ?? (i ? r.text : smallCaps(r.text))));
    text = respell(text, `${p.key} ${i + 1}`, spelt, respelled);
    for (const r of READINGS.filter((r) => r.at === id)) {
      if (!text.includes(r.from)) throw new Error(`${id}: no "${r.from}" in ${text}`);
      text = text.replace(r.from, r.to);
      unread.delete(r.at);
    }
    lines.push(text);
    const hard = r.decisions.filter((d) => !/the witness's word|a speck|UNCONFIRMED/.test(d.why));
    for (const d of r.decisions) why[d.why.replace(/:.*/, "")] = (why[d.why.replace(/:.*/, "")] ?? 0) + 1;
    for (const d of r.decisions.filter((d) => d.why.startsWith("UNCONFIRMED"))) unconfirmed.push(`${p.key} ${i + 1}: ${d.chose}`);
    if (!r.decisions.length) counts.agreed++;
    counts.settled += r.decisions.length;
    if (hard.length) {
      counts.read++;
      disputed.push({ label: `${id}\n${text}\n${hard.map((d) => `${d.a || "—"} / ${d.b || "—"} → ${d.chose || "out"}`).join("; ")}`, line: at[i] });
      seenRows.push(`<tr><td class="n">${esc(id)}</td><td>${hard.map((d) => `<code>${esc(d.a) || "—"}</code> / <code>${esc(d.b) || "—"}</code>`).join("; ")}</td><td>${seen ? `<b>${esc(seen)}</b>` : "as the scans’ reading has it"}</td></tr>`);
    }
    if (r.decisions.length) decided.push(`<li>line ${i + 1}: ${r.decisions.map((d) => `<code>${esc(d.a) || "—"}</code> / <code>${esc(d.b) || "—"}</code> → <code>${esc(d.chose) || "left out"}</code> (${esc(d.why)})`).join("; ")}</li>`);
    if (milton) {
      const ours = text.split(/[^\p{L}’]+/u).map(letters).filter(Boolean), theirs = milton[i].split(/[^\p{L}’']+/u).map(letters).filter(Boolean);
      if (ours.some((k) => !near(k, theirs)) || theirs.some((k) => !near(k, ours))) departures.push(`<tr><td class="n">${esc(id)}</td><td>${esc(text)}</td><td class="w">${esc(milton[i])}</td></tr>`);
    }
  });
  counts.lines += lines.length;
  /* the edition's stanza numerals kept as italic rows (asked) */
  const md = poemPage({ heading: p.key, lines, opens, notes: [...(page.front ? [page.front] : []), NOTE + (p.refrain ? NOTE_REFRAIN : "")], rows: page.rows, after: page.after, numerals: page.numerals });
  entries[`${AUTHOR}/${p.key}.md`] = md;
  const rows = md.slice(md.indexOf("::: verse\n") + 10, -4).split("\n");
  report.push(`<h2>${esc(p.key)}</h2><p class="src">${lines.length} lines; the witness ${p.witness ?? "none (neither edition has it): scan A’s lines settle the cut"}; ${c.gaps.some(Boolean) ? `${c.gaps.filter(Boolean).length} stanza gaps, as the witness has them` : `${opens.filter(Boolean).length} verse paragraphs, where the edition indents a line`}.</p>` +
    `<table>${rows.map((l) => `<tr><td>${esc(l) || "&nbsp;"}</td></tr>`).join("")}</table>` + (decided.length ? `<ul>${decided.join("")}</ul>` : ""));
}
if (unused.size) throw new Error("page readings for lines with nothing disputed: " + [...unused].join(", "));
if (unread.size) throw new Error("readings for lines not met: " + [...unread].join(", "));
if (process.env.STRIPS) console.log(await stripSheets(disputed, join(CACHE, "poems-strips"), 16, 1));

const had = Object.keys(entries).filter((f) => existsSync(join(BACKUP, f)));
if (had.length) throw new Error("the backup has these already: " + had.join(", "));
for (const md of Object.values(entries)) if (serializeMarkdown(parseMarkdown(md)) !== md) throw new Error("an entry does not survive its round trip: " + md.slice(0, 80));
rmSync(OUT, { recursive: true, force: true });
for (const [path, md] of Object.entries(entries)) {
  mkdirSync(dirname(join(OUT, path)), { recursive: true });
  writeFileSync(join(OUT, path), md);
}
writeFileSync(join(dirname(OUT), basename(OUT) + ".html"), `<!doctype html><meta charset="utf-8"><title>Milton's shorter poems</title>
<style>body{font:16px/1.45 Georgia,serif;margin:2em auto;max-width:64em;padding:0 1em}td{padding:0 1em 0 0;vertical-align:top}.n{color:#999;font-size:.8em;white-space:nowrap}.w{color:#777;font-size:.9em}.src{color:#555;font-size:.9em}li{font-size:.85em;color:#555}code{font-size:.95em}</style>
<h1>Milton's shorter poems</h1>
<p>${POEMS.length} pages beside Lycidas under <code>Milton, John</code>, each headed with the Harvard Classics' title and referred to by it, <code>[Milton, *L’Allegro*, 1-10]</code>. ${counts.lines} lines, read from the edition's two scans against each other; ${counts.agreed} read the same in both. Where they differ, the witness settled it — Thurber's modern-spelling edition (1901) for the poems he prints, Beeching's original-spelling one (1900) for the rest, neither for the two psalms — or the words the edition prints elsewhere; ${counts.read} lines were read on the printed page.</p>
<p>Stanzas are a gap apart, as the witness has them; in the other poems a gap stands where the edition indents a line to begin a verse paragraph. Italic rows, not numbered: the stanza numerals of the Nativity ode, the Fair Infant and The Passion, above their stanzas; the Hymn's heading; the Vacation Exercise's prose links.</p>
<p>Spellings the edition keeps old, given the bookshelf's Milton's or the modern one: ${spelt.map(esc).join("; ")}. Kept as forms the metre or a rhyme rests on, or as the bookshelf keeps them: ${KEPT_FORMS.join(", ")}.</p>
<p>Names given their modern spelling: ${respelled.map(esc).join("; ")}. Kept as Milton's own form of the name: ${KEPT_NAMES.join(", ")}.</p>
<p>Read alike in both scans but found in no dictionary or other Milton text: ${unconfirmed.map(esc).join("; ")}.</p>
<h2>For a reading in the Oxford edition</h2>
<p>Where the Harvard Classics' words are not those of Milton's own printing, spelling aside, each read in the Oxford edition: its reading taken where it differs from Harvard's. Found by a sweep against Beeching's text of 1645 and 1673, line by line (not made for the two psalms, which Beeching lacks); where only Beeching is named, his text may have lost the word.</p>
<table>${DEPARTURES.map((d) => `<tr><td class="n">${esc(d.at)}</td><td>Harvard <b>${esc(d.harvard)}</b></td><td>${esc(d.milton)}</td><td>${d.owc ? "the Oxford edition’s reading taken" : "Harvard’s kept, as the Oxford edition reads"}</td></tr>`).join("")}</table>
<details><summary>Every line the sweep found (${departures.length}), spelling and compounding among them</summary><table>${departures.join("")}</table></details>
<h2>Read on the printed page</h2>
<p>Each line where the scans differed in a mark, or one has a word the other lacks: the two readings, and the line as the page has it where the reading was wrong.</p>
<table>${seenRows.join("")}</table>
${report.join("\n")}`);
console.log(why);
console.log(`${Object.keys(entries).length} pages, ${counts.lines} lines; agreeing ${counts.agreed}; read on the page ${counts.read}; spellings ${spelt.length}; names ${respelled.length}; departures ${departures.length}`);
console.log(`written to ${OUT}`);
