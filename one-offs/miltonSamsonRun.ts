/* node one-offs/miltonSamsonRun.ts — Samson Agonistes: its outline from
   Beeching's text (who speaks, the lines split between speakers), its words
   from the Harvard Classics' two scans read against each other, its front
   matter from scan A (all cached under one-offs/out/harvard); written under OUT
   (default ~/Desktop/gesta-imports/gesta-milton-samson) for an import, a
   review page beside it, the counts printed; one-offs/miltonCapsRun.ts gives the
   page Paradise Lost's capitals afterwards */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { scanLines, findStart, cutPoem, readLine, vocabulary, unstressed, letters, similar, words } from "./harvardMilton.ts";
import { hocrLines, stripSheets, findLine, type HocrLine } from "./harvardStrips.ts";
import { KEPT_FORMS, KEPT_NAMES, respell } from "./miltonSpellings.ts";
import { NUMERAL, runningHead, unspecked, elided, smallCaps, placeLines } from "./miltonPoems.ts";
import { maskPage, type Item } from "./miltonMasks.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

const HOME = process.env.HOME!;
const BACKUP = process.env.BACKUP ?? join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.env.OUT ?? join(HOME, "Desktop/gesta-imports/gesta-milton-samson");
const CACHE = new URL("out/harvard/", import.meta.url).pathname;
const read = (f: string): string => readFileSync(CACHE + f, "utf8").replace(/\r\n/g, "\n");
const KNOWN = vocabulary(read("pg26.txt"), read("pg58.txt"), readFileSync("/usr/share/dict/words", "utf8"));
const BEECHING = read("pg1745.txt").split("\n");
const LINES = 1758;

/* a speaker's prefix in Beeching, given the name it abbreviates (asked) */
const SPEAKERS: Record<string, string> = {
  Sam: "Samson", Chor: "Chorus", Cho: "Chorus", Man: "Manoa", Dal: "Dalila", Har: "Harapha", Off: "Officer", Mess: "Messenger", Semichor: "Semichorus",
};
/* the rests of the four lines split between speakers, by their opening:
   where Beeching's rows run ahead of his margin's numbers (1563 twice, 1584, 1586) */
const RESTS = ["Mess: By Samson.", "Man: That still lessens", "Man: Self-violence?", "Mess: Inevitable cause"];
const PREFIX = /^(Sams?|Chor|Man|Dal|Har|Off|Mess|Messenger|Semichor|S?AMSON)\.\s+/;

function beechingRow(text: string): Item[] {
  const sp = /^(\w+):\s*(.*)$/.exec(text);
  const name = sp ? SPEAKERS[sp[1]] : undefined;
  const rest = RESTS.some((r) => text.replace(/\s+/g, " ").startsWith(r));
  const line: Item = { kind: "line", text: name ? sp![2] : text, rest, opens: false };
  return name ? [{ kind: "speaker", name }, line] : [line];
}
/* two lines Beeching sets in the other order (282–283), taken in Harvard's */
function harvardOrder(out: Item[]): void {
  const at = out.findIndex((i) => i.kind === "line" && i.text.startsWith("Not worse then by his shield"));
  if (at < 0 || (out[at + 1] as { text?: string }).text?.startsWith("Had dealt with Jephtha") !== true) throw new Error("Beeching's 282–283 not as expected");
  [out[at], out[at + 1]] = [out[at + 1], out[at]];
}
const unnumbered = (raw: string): string => (/^(.*?\S)\s{3,}(\d+)$/.exec(raw)?.[1] ?? raw).trim();
const numbered = (items: Item[]): boolean => !(items.at(-1) as { rest?: boolean }).rest;

/* Beeching's Samson from the Scene to the last line: a speaker's prefix a
   speaker, the rest of a split line marked */
function beechingItems(): Item[] {
  const a = BEECHING.findIndex((l) => /^\s+The Scene before the Prison in Gaza\.$/.test(l));
  const out: Item[] = [];
  let n = 0;
  for (let k = a + 1; n < LINES; k++) {
    const text = unnumbered(BEECHING[k]);
    if (!text) continue;
    const items = beechingRow(text);
    if (numbered(items)) n++;
    out.push(...items);
  }
  harvardOrder(out);
  return out;
}

const scan = (f: string): string[] => scanLines(read(f)).map(unspecked).filter((l) => !NUMERAL.test(l) && !runningHead(l)).map((l) => l.replace(PREFIX, ""));
const A = scan("harvardclassicsv0004milt.txt"), B = scan("completepoems00miltuoft.txt");
const HOCR = hocrLines(read("harvardclassicsv0004milt_hocr.html")).filter((l) => /[a-z]/.test(l.text) && !NUMERAL.test(l.text) && !runningHead(l.text)).map((l) => ({ ...l, text: l.text.replace(PREFIX, "") }));

/* a disputed line as the Oxford edition prints it (asked: its pages
   photographed), its word and mark taken where the two scans
   disagree; the Harvard page itself out of reach */
const SEEN: Record<string, string> = {
  "17": "This unfrequented place to find some ease,",
  "59": "How slight the gift was, hung it in my hair.",
  "64": "And proves the source of all my miseries;",
  "78": "In power of others, never in my own;",
  "113": "At my affliction, and perhaps to insult,",
  "148": "Up to the hill by Hebron, seat of giants old,",
  "149": "No journey of a sabbath-day, and loaded so;",
  "151": "Which shall I first bewail,",
  "177": "Dissolves unjointed ere it reach my ear.",
  "205": "Are come upon him his deserts”? yet why?",
  "225": "I might begin Israel’s deliverance,",
  "239": "Thou never wast remiss, I bear thee witness;",
  "248": "The deeds themselves, though mute, spoke loud the doer;",
  "252": "Entered Judea seeking me, who then",
  "253": "Safe to the rock of Etham was retired—",
  "270": "Than to love bondage more than liberty,",
  "271": "Bondage with ease than strenuous liberty;",
  "283": "Had dealt with Jephtha, who by argument,",
  "295": "Unless there be who think not God at all.",
  "326": "But see! here comes thy reverend sire,",
  "331": "With mention of that name, renews th’ assault.",
  "346": "Himself an army—now unequal match",
  "420": "I cannot praise thy marriage-choices, son—",
  "424": "I state not that; this I am sure, our foes",
  "429": "Deposited within thee; which to have kept",
  "451": "Among the Heathen round; to God have brought",
  "462": "’Twixt God and Dagon; Dagon hath presumed,",
  "472": "With cause this hope relieves thee; and these words",
  "494": "Contempt and scorn of all—to be excluded",
  "499": "Weakly at least and shamefully—a sin",
  "514": "Which argues over-just, and self-displeased",
  "531": "On hostile ground, none daring my affront.",
  "535": "At length to lay my head and hallowed pledge",
  "549": "With touch ethereal of Heaven’s fiery rod,",
  "563": "Now blind, disheartened, shamed, dishonoured, quelled,",
  "567": "A burdenous drone; to visitants a gaze,",
  "590": "All otherwise to me my thoughts portend—",
  "621": "Rankle, and fester, and gangrene,",
  "650": "No long petition—speedy death,",
  "668": "That thou towards him with hand so various,",
  "669": "Or might I say contrarious,",
  "681": "And people’s safety, which in part they effect:",
  "689": "But throw’st them lower than thou didst exalt them high;",
  "698": "With sickness and disease thou bow’st them down,",
  "710": "But who is this, what thing of sea or land?",
  "711": "Female of sex it seems,",
  "745": "Thy mind with what amends is in my power,",
  "748": "Out, out, hyæna! These are thy wonted arts,",
  "749": "And arts of every woman false like thee,",
  "753": "Confess, and promise wonders in her change;",
  "777": "To publish them, both common female faults;",
  "783": "Nor shouldst thou have trusted that to woman’s frailty:",
  "823": "I led the way—bitter reproach, but true;",
  "830": "And I believe it; weakness to resist",
  "854": "And of religion—pressed how just it was,",
  "871": "I thought where all thy circling wiles would end:",
  "883": "Didst thou at first receive me for thy husband?",
  "896": "To please thy gods thou didst it; gods unable",
  "899": "Of their own deity, gods cannot be:",
  "905": "For want of words, no doubt, or lack of breath!",
  "916": "Where other senses want not their delights,",
  "924": "With nursing diligence, to me glad office,",
  "927": "That what by me thou hast lost thou least shalt miss.",
  "946": "In perfect thraldom! how again betray me,",
  "951": "Let me approach at least, and touch thy hand.",
  "960": "I see thou art implacable, more deaf",
  "997": "She’s gone—a manifest serpent by her sting",
  "1000": "And aggravate my folly, who committed",
  "1023": "Their nuptials, nor this last so treacherously",
  "1030": "In choice, but oftest to affect the wrong?",
  "1037": "Once joined, the contrary she proves—a thorn",
  "1050": "But virtue which breaks through all opposition,",
  "1156": "Presume not on thy God; whate’er he be,",
  "1157": "Thee he regards not, owns not, hath cut off",
  "1227": "Cam’st thou for this, vain boaster, to survey me,",
  "1229": "Come nearer; part not hence so slight informed;",
  "1276": "The righteous, and all such as honour Truth!",
  "1298": "Labouring thy mind",
  "1306": "A public officer, and now at hand.",
  "1318": "To appear as fits before th’ illustrious lords.",
  "1319": "Thou know’st I am an Hebrew; therefore tell them",
  "1342": "Joined with extreme contempt? I will not come.",
  "1346": "I am sorry what this stoutness will produce.",
  "1356": "After my great transgression—so requite",
  "1364": "Idolatrous, uncircumcised, unclean.",
  "1369": "Where outward force constrains, the sentence holds:",
  "1375": "Set God behind; which, in his jealousy,",
  "1383": "To something extraordinary my thoughts.",
  "1384": "I with this messenger will go along,",
  "1413": "Brethren, farewell; your company along",
  "1437": "Be efficacious in thee now at need.",
  "1445": "Peace with you, brethren; my inducement hither",
  "1448": "To come and play before them at their feast.",
  "1474": "Their once great dread, captive and blind before them,",
  "1480": "And he in that calamitous prison left.",
  "1489": "Made older than thy age through eyesight lost.",
  "1499": "To use him further yet in some great service—",
  "1508": "I know your friendly minds, and—O, what noise!",
  "1520": "What shall we do—stay here, or run and see?",
  "1522": "We unawares run into danger’s mouth.",
  "1527": "What if his eyesight (for to Israel’s God",
  "1531": "That were a joy presumptuous to be thought.",
  "1539": "And to our wish I see one hither speeding—",
  "1586 ⟨…⟩": "Inevitable cause",
  "1622": "Who had made their dreadful enemy their thrall.",
  "1639": "At last, with head erect, thus cried aloud:—",
  "1640": "“Hitherto, Lords, what your commands imposed",
  "1653": "Lords, ladies, captains, counsellors, or priests,",
  "1660": "O dearly-bought revenge, yet glorious!",
  "1712": "Fully revenged—hath left them years of mourning,",
  "1752": "Bore witness gloriously; whence Gaza mourns,",
};
/* a word both scans read alike and wrongly, as the Oxford edition has it */
const FIXES: { at: string; from: string; to: string }[] = [
  { at: "815", from: "not a stere", to: "not austere" }, { at: "996", from: "leave him his lot", to: "leave him to his lot" },
  /* where Harvard departs from Milton's printing: the Oxford edition's reading (asked) */
  { at: "1378", from: "adolatrous", to: "idolatrous" }, { at: "1491", from: "in his house", to: "in the house" }, { at: "1495", from: "hath not permitted", to: "had not permitted" },
];

const items = beechingItems();
const w = items.filter((i) => i.kind === "line").map((i) => (i as Extract<Item, { kind: "line" }>).text);
const sa = findStart(A, w[0]), sb = findStart(B, w[0]);
if (sa == null || sb == null) throw new Error(`not found in a scan (${sa}, ${sb})`);
const ca = cutPoem(A, sa, w), cb = cutPoem(B, sb, w);
const off = w.map((x, i) => [i, similar(letters(ca.lines[i] ?? ""), letters(x)), similar(letters(cb.lines[i] ?? ""), letters(x))] as const).filter(([, a, b]) => a < 0.55 || b < 0.55);
console.log("rows", w.length, "cut", ca.lines.length, cb.lines.length, "off", off.length, off.slice(0, 10).map(([i, a, b]) => `${i}:${a.toFixed(2)}/${b.toFixed(2)} ${w[i].slice(0, 30)} | ${ca.lines[i]?.slice(0, 30)} | ${cb.lines[i]?.slice(0, 30)}`));

/* where the Harvard Classics' words are not those of Milton's own printing,
   spelling aside, from the sweep against Beeching's text: each left as Harvard
   prints it until read in the Oxford edition */
const DEPARTURES: { at: string; harvard: string; milton: string }[] = [
  { at: "193", harvard: "Ye see, O friends", milton: "Beeching: Wee see, O friends; the Oxford edition: Ye see, as Harvard" },
  { at: "282–283", harvard: "Had dealt with Jephtha, who by argument, / Not worse than by his shield and spear,", milton: "Beeching: the two lines the other way round; the Oxford edition: as Harvard" },
  { at: "1491", harvard: "sitting in his house", milton: "Beeching: sitting in the house; the Oxford edition: the house, taken" },
  { at: "1495", harvard: "God hath not permitted", milton: "Beeching: God had not permitted; the Oxford edition: had, taken" },
  { at: "1378", harvard: "at adolatrous rites", milton: "Beeching: at Idolatrous rites; the Oxford edition: idolatrous, taken" },
];
const unprimed = (s: string): string => s.replace(/\b(\p{L}+)’(\p{L}+)\b/gu, (m, a, b) => (PRIMED.includes(m) ? a + b : m));
/* a stress the edition marks with a prime the scans read as an apostrophe,
   left off as the bookshelf's other stress marks are (asked); read on the page */
const PRIMED: string[] = ["crystal’lin"];
const ellipsis = (s: string): string => s.replace(/\.( ?\.){3}/g, "….").replace(/\.( ?\.){2}/g, "…");
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const near = (k: string, ws: string[]): boolean => ws.some((v) => similar(k, v) >= 0.6);
const spelt: string[] = [], respelled: string[] = [], seenRows: string[] = [], departures: string[] = [], unconfirmed: string[] = [], primes: string[] = [];
const disputed: { label: string; line: HocrLine }[] = [];
const unused = new Set(Object.keys(SEEN));
const counts = { lines: 0, agreed: 0, read: 0 };
const placed = placeLines(HOCR.slice(HOCR.indexOf(findLine(HOCR, w[0], w[1])!)), w);
const readText: string[] = [];
let n = 0, k = 0;
for (const it of items) {
  if (it.kind !== "line") continue;
  if (!it.rest) n++;
  const id = `${n}${it.rest ? " ⟨…⟩" : ""}`;
  const r = readLine(ca.lines[k], cb.lines[k], { witness: w[k], known: KNOWN, n: k + 1 });
  const seen = SEEN[id];
  if (seen && similar(letters(seen), letters(r.text)) < 0.75) throw new Error(`${id}: the line read on the page is not this one: ${r.text}`);
  unused.delete(id);
  let text = seen ?? (k ? r.text : smallCaps(r.text));
  for (const m of text.matchAll(/\b\p{L}+’\p{L}{3,}\b/gu)) if (!/^(o|ne|e|whate|where|th|t|wat|flow|ta|wond|sov)’/i.test(m[0])) primes.push(`${id}: ${m[0]}`);
  text = respell(ellipsis(unprimed(unstressed(elided(text)))), id, spelt, respelled);
  for (const f of FIXES.filter((f) => f.at === id)) { if (!text.includes(f.from)) throw new Error(`${id}: no "${f.from}"`); text = text.replace(f.from, f.to); }
  readText.push(text);
  counts.lines++;
  if (!r.decisions.length) counts.agreed++;
  for (const d of r.decisions.filter((d) => d.why.startsWith("UNCONFIRMED"))) unconfirmed.push(`${id}: ${d.chose}`);
  const hard = r.decisions.filter((d) => !/the witness's word|a speck|UNCONFIRMED/.test(d.why));
  if (hard.length) {
    counts.read++;
    disputed.push({ label: `${id}\n${text}\n${hard.map((d) => `${d.a || "—"} / ${d.b || "—"} → ${d.chose || "out"}`).join("; ")}`, line: placed[k] });
    seenRows.push(`<tr><td class="n">${esc(id)}</td><td>${esc(text)}</td><td class="w">${hard.map((d) => `scan A <code>${esc(d.a) || "—"}</code>, scan B <code>${esc(d.b) || "—"}</code> → <code>${esc(d.chose) || "left out"}</code>`).join("; ")}</td></tr>`);
  }
  const ours = words(text).map(letters).filter(Boolean), theirs = words(w[k]).map(letters).filter(Boolean);
  if (ours.some((x) => !near(x, theirs)) || theirs.some((x) => !near(x, ours))) departures.push(`<tr><td class="n">${esc(id)}</td><td>${esc(text)}</td><td class="w">${esc(w[k])}</td></tr>`);
  k++;
}
if (unused.size) throw new Error("page readings for lines with nothing disputed: " + [...unused].join(", "));
if (process.env.STRIPS) console.log(await stripSheets(disputed, join(CACHE, "samson-strips"), 16, 1));
if (process.env.PRIMES) console.log(primes.join("\n"));
if (process.env.DEPARTURES) console.log(departures.map((d) => d.replace(/<[^>]+>/g, " | ").replace(/\s*\|\s*\|\s*/g, " | ")).join("\n"));
if (process.env.WORDS) console.log("spelt:", spelt.join("; "), "\nunconfirmed:", unconfirmed.join("; "));
/* the front matter as the Oxford edition prints it (asked: its pages
   photographed), the titles and Milton's Greek terms in italics as there */
const PREFACE = [
  "Of That Sort of Dramatic Poem Which Is Called Tragedy",
  "Tragedy, as it was anciently composed, hath been ever held the gravest, moralest, and most profitable of all other poems; therefore said by Aristotle to be of power, by raising pity and fear, or terror, to purge the mind of those and such-like passions; that is, to temper and reduce them to just measure with a kind of delight, stirred up by reading or seeing those passions well imitated. Nor is Nature wanting in her own effects to make good his assertion; for so, in physic, things of melancholic hue and quality are used against melancholy, sour against sour, salt to remove salt humours. Hence philosophers and other gravest writers, as Cicero, Plutarch, and others, frequently cite out of tragic poets, both to adorn and illustrate their discourse. The Apostle Paul himself thought it not unworthy to insert a verse of Euripides into the text of Holy Scripture, 1 Cor. xv. 33; and Paræus, commenting on the *Revelation*, divides the whole book, as a tragedy, into acts, distinguished each by a Chorus of heavenly harpings and song between. Heretofore men in highest dignity have laboured not a little to be thought able to compose a tragedy. Of that honour Dionysius the elder was no less ambitious than before of his attaining to the tyranny. Augustus Cæsar also had begun his *Ajax*, but, unable to please his own judgement with what he had begun, left it unfinished. Seneca the philosopher is by some thought the author of those tragedies (at least the best of them) that go under that name. Gregory Nazianzen, a Father of the Church, thought it not unbeseeming the sanctity of his person to write a tragedy, which he entitled *Christ Suffering*. This is mentioned to vindicate Tragedy from the small esteem, or rather infamy, which in the account of many it undergoes at this day, with other common interludes; happening through the poet’s error of intermixing comic stuff with tragic sadness and gravity, or introducing trivial and vulgar persons: which by all judicious hath been counted absurd, and brought in without discretion, corruptly to gratify the people. And, though ancient Tragedy use no Prologue, yet using sometimes, in case of self-defence or explanation, that which Martial calls an Epistle; in behalf of this tragedy, coming forth after the ancient manner, much different from what among us passes for best, thus much beforehand may be *epistled*—that Chorus is here introduced after the Greek manner, not ancient only but modern, and still in use among the Italians. In the modelling therefore of this poem, with good reason, the Ancients and Italians are rather followed, as of much more authority and fame. The measure of verse used in the Chorus is of all sorts, called by the Greeks *Monostrophic*, or rather *Apolelymenon*, without regard had to Strophe, Antistrophe, or Epode; which were a kind of stanzas framed only for the music, then used with the Chorus that sung; not essential to the poem, and therefore not material; or, being divided into stanzas or pauses, they may be called *Allœostropha*. Division into act and scene, referring chiefly to the stage (to which this work never was intended), is here omitted.",
  "It suffices if the whole drama be found not produced beyond the fifth Act. Of the style and uniformity, and that commonly called the plot, whether intricate or explicit—which is nothing indeed but such economy, or disposition of the fable, as may stand best with verisimilitude and decorum—they only will best judge who are not unacquainted with Æschylus, Sophocles, and Euripides, the three tragic poets unequalled yet by any, and the best rule to all who endeavour to write Tragedy. The circumscription of time, wherein the whole drama begins and ends, is, according to ancient rule and best example, within the space of twenty-four hours.",
];
const ARGUMENT = "**The Argument.** Samson, made captive, blind, and now in the prison at Gaza, there to labour as in a common workhouse, on a festival day, in the general cessation from labour, comes forth into the open air to a place nigh, somewhat retired, there to sit a while and bemoan his condition: where he happens at length to be visited by certain friends and equals of his tribe, which make the Chorus, who seek to comfort him what they can; then by his old father, Manoa, who endeavours the like, and withal tells him his purpose to procure his liberty by ransom; lastly, that this feast was proclaimed by the Philistines as a day of thanksgiving for their deliverance from the hands of Samson—which yet more troubles him. Manoa then departs to prosecute his endeavour with the Philistian lords for Samson’s redemption: who, in the meanwhile, is visited by other persons, and, lastly, by a public officer to require his coming to the feast before the lords and people, to play or show his strength in their presence; he at first refuses, dismissing the public officer with absolute denial to come; at length, persuaded inwardly that this was from God, he yields to go along with him, who came now the second time with great threatenings to fetch him; the Chorus yet remaining on the place, Manoa returns full of joyful hope to procure ere long his son’s deliverance; in the midst of which discourse an Hebrew comes in haste, confusedly at first, and afterwards more distinctly, relating the catastrophe, what Samson had done to the Philistines, and by accident to himself; wherewith the Tragedy ends.";
const PERSONS = "The Persons\n\nSamson.\nManoa, the father of Samson.\nDalila, his wife.\nHarapha of Gath.\nPublic Officer.\nMessenger.\nChorus of Danites.";
const NOTE = "Text: *The Complete Poems of John Milton*, The Harvard Classics, vol. 4 (New York, 1909), from two scans on the Internet Archive read against each other, the speakers laid out after Beeching’s text (1900); the preface, the Argument and the Persons from *The English Poems of John Milton*, from the edition of H. C. Beeching, The World’s Classics (London, 1960).";
let r = 0;
const harvard: Item[] = [{ kind: "direction", text: "The Scene before the Prison in Gaza." }, ...items.map((it) => (it.kind === "line" ? { ...it, text: readText[r++] } : it))];
const md = maskPage("Samson Agonistes", [PREFACE.join("\n\n"), ARGUMENT, PERSONS, NOTE], harvard);
const KEY = "bookshelf/Milton, John/Samson Agonistes.md";
if (existsSync(join(BACKUP, KEY))) throw new Error("the backup has Samson Agonistes already");
if (serializeMarkdown(parseMarkdown(md)) !== md) throw new Error("the page does not survive its round trip");
const IMPORTS = join(HOME, "Desktop/gesta-imports") + "/";
if (!resolve(OUT).startsWith(IMPORTS)) throw new Error(`the folder is emptied before it is written, so it must be inside ${IMPORTS}: ${OUT}`);
rmSync(OUT, { recursive: true, force: true });
mkdirSync(dirname(join(OUT, KEY)), { recursive: true });
writeFileSync(join(OUT, KEY), md);
writeFileSync(join(dirname(OUT), basename(OUT) + ".html"), `<!doctype html><meta charset="utf-8"><title>Samson Agonistes</title>
<style>body{font:16px/1.45 Georgia,serif;margin:2em auto;max-width:64em;padding:0 1em}td{padding:0 1em 0 0;vertical-align:top}.n{color:#999;font-size:.8em;white-space:nowrap}.w{color:#777;font-size:.9em}code{font-size:.95em}pre{white-space:pre-wrap;font:15px/1.4 Georgia,serif;background:#f6f6f0;padding:1em}</style>
<h1>Samson Agonistes</h1>
<p>One page beside Lycidas, laid out as Comus is: a speaker a bold row, the name written out (Samson, Chorus, Manoa, Dalila, Harapha, Officer, Messenger, Semichorus), a line split between speakers one line, its rest marked ⟨…⟩ (four: 1563 twice, 1584, 1586, where Beeching's rows run ahead of his margin). Milton's preface, the Argument and the Persons are notes above, as the Oxford edition prints them. ${counts.lines} rows, ${counts.agreed} read the same in both scans, Beeching's text settling where they differ, ${counts.read} read on the printed page.</p>
<p>Spellings given the bookshelf's: ${spelt.map(esc).join("; ") || "none"}. Kept: ${KEPT_FORMS.join(", ")}. Names: ${respelled.map(esc).join("; ") || "none"}; kept ${KEPT_NAMES.join(", ")}.</p>
<p>Read alike in both scans but found in no dictionary or other Milton text: ${unconfirmed.map(esc).join("; ")}.</p>
<h2>For a reading in the Oxford edition</h2>
<table>${DEPARTURES.map((d) => `<tr><td class="n">${esc(d.at)}</td><td>Harvard <b>${esc(d.harvard)}</b></td><td>${esc(d.milton)}</td></tr>`).join("")}</table>
<details><summary>Every line the sweep against Beeching found (${departures.length})</summary><table>${departures.join("")}</table></details>
<h2>Disputed lines (${seenRows.length}), as the Oxford edition prints them</h2>
<p>Where the two scans differ in a mark, or one has a word the other lacks: the line as it now stands, and in grey what each scan read and what was taken.</p>
<table>${seenRows.join("")}</table>
<h2>The page</h2><pre>${esc(md)}</pre>`);
console.log(`written to ${OUT}`);
console.log(`${counts.lines} rows, ${counts.agreed} agreeing; read on the page ${counts.read}; spellings ${spelt.length}; names ${respelled.length}; departures ${departures.length}; apostrophes inside a word ${primes.length}`);
