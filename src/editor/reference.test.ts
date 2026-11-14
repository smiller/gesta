import { test, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import type { Node } from "prosemirror-model";
import { parseMarkdown } from "../model/parse.ts";
import { selectionLink, referencePayload, entryLinkParts, referenceAnchorHTML } from "./reference.ts";
import { passageAt, quotation } from "./passage.ts";
import { journalOf } from "../store/headings.ts";

// A reference over parsed fixtures: the label's line, stanza, paragraph and
// leaf ranges, the payload and its refusals, the link and the highlight.

interface Find { needle: string; end?: string; from: number; to: number }
function findStart(f: Find, n: Node, pos: number): void {
  const i = n.text!.indexOf(f.needle);
  if (i < 0) return;
  f.from = pos + i;
  if (!f.end) f.to = f.from + f.needle.length;
}
function findEnd(f: Find, n: Node, pos: number): void {
  const j = n.text!.indexOf(f.end!);
  if (j >= 0) f.to = pos + j + f.end!.length;
}
const seekingEnd = (f: Find): boolean => !!f.end && f.from >= 0 && f.to < 0;
/* the positions of a needle's first occurrence in the document's text */
function span(doc: Node, needle: string, end?: string): [number, number] {
  const f: Find = { needle, end, from: -1, to: -1 };
  doc.descendants((n, pos) => {
    if (!n.isText) return true;
    if (f.from < 0) findStart(f, n, pos);
    if (seekingEnd(f)) findEnd(f, n, pos);
    return true;
  });
  if (f.from < 0 || f.to < 0) throw new Error("not found: " + needle + " … " + end);
  return [f.from, f.to];
}
const state = (doc: Node, from: number, to: number) => EditorState.create({ doc, selection: TextSelection.create(doc, from, to) });
/* the passage a selection makes, quoted whole, both columns, or the refusal */
function quote(doc: Node, a: number, b: number, how: { halves?: boolean; paragraphs?: boolean } = {}): string {
  const p = passageAt(doc, a, b);
  if ("refused" in p) return p.refused;
  const q = quotation(p, { ...how, all: true });
  return "refused" in q ? q.refused : q.text;
}
function facingOf(doc: Node, a: number, b: number): { pos: number } | null {
  const p = passageAt(doc, a, b);
  return "refused" in p ? null : p.facing;
}
/* the range a plain work's reference label ends with */
function rangeOf(doc: Node, a: number, b: number): string {
  const out = referencePayload(state(doc, a, b), { date: "bookshelf", tag: "Somebody/A Work" }, journalOf({}));
  return "refused" in out ? out.refused : out.label.replace(/^Somebody, \*A Work\*(, )?/, "");
}
const journal = journalOf({ "bookshelf/Milton, John/Paradise Lost": "# Paradise Lost", "bookshelf/Williams, Charles/Witchcraft": "# Witchcraft" });

const verse = parseMarkdown("# Book 1\n\n::: verse\n**SPEAKER**\nOf man's first disobedience, and the fruit\nOf that forbidden tree, whose mortal taste\n\nBrought death into the World, and all our woe,\nWith loss of Eden\n:::\n\nA closing paragraph.");

test("referenceRange over covered lines; a speaker label takes the line under it", () => {
  const [a, b] = span(verse, "forbidden", "Brought death");
  expect(rangeOf(verse, a, b)).toBe("2-3");
  const [c, d] = span(verse, "SPEAKER", "disobedience");
  expect(rangeOf(verse, c, d)).toBe("1");
  const [e, f] = span(verse, "closing");
  expect(rangeOf(verse, e, f)).toBe("");
});

const PISOS = parseMarkdown("# Ars Poetica\n\n::: dual-language\nHumano capiti cervicem pictor equinam | If a painter chose to join a human head to the neck of a horse, could you refrain from laughing?\nspectatum admissi risum teneatis, amici?\ncredite, Pisones, isti tabulae fore librum | Believe me, dear Pisos, quite like such pictures would be a book, so that neither head nor foot can be assigned to a single shape.\npersimilem, cuius, velut aegri somnia, vanae\nfingentur species, ut nec pes nec caput uni\nreddatur formae.\n⟨…⟩“pictoribus atque poetis | “Painters and poets,” you say, “have always had an equal right.”\nquidlibet audendi semper fuit aequa potestas.”\n:::");
const pisos = journalOf({ "bookshelf/Horace": "# Horace" });

test("a selection in a sentence's English takes the Latin it stands beside, from its own row to the row before the next sentence, referred to and quoted whole", () => {
  const [a, b] = span(PISOS, "quite like such pictures");
  const out = referencePayload(state(PISOS, a, b), { date: "bookshelf", tag: "Horace/Ars Poetica" }, pisos);
  expect(out).toMatchObject({ label: "Horace, *Ars Poetica*, 3-6" });
  expect(out && "passage" in out ? out.passage : "").toBe("> ::: dual-language 3\n> credite, Pisones, isti tabulae fore librum | Believe me, dear Pisos, quite like such pictures would be a book, so that neither head nor foot can be assigned to a single shape.\n> persimilem, cuius, velut aegri somnia, vanae\n> fingentur species, ut nec pes nec caput uni\n> reddatur formae.\n> :::");
  // the whole sentence, from its first word to its last, takes the same
  const [c, d] = span(PISOS, "Believe me", "a single shape.");
  expect(referencePayload(state(PISOS, c, d), { date: "bookshelf", tag: "Horace/Ars Poetica" }, pisos)).toMatchObject({ label: "Horace, *Ars Poetica*, 3-6" });
  // across two sentences: from the first one's row to the second one's last Latin
  const [e, f] = span(PISOS, "could you refrain", "Painters and poets");
  expect(referencePayload(state(PISOS, e, f), { date: "bookshelf", tag: "Horace/Ars Poetica" }, pisos)).toMatchObject({ label: "Horace, *Ars Poetica*, 1-7" });
  // a selection in the Latin is the Latin it covers, as before
  const [g, h] = span(PISOS, "persimilem", "nec caput uni");
  expect(referencePayload(state(PISOS, g, h), { date: "bookshelf", tag: "Horace/Ars Poetica" }, pisos)).toMatchObject({ label: "Horace, *Ars Poetica*, 4-5" });
});

test("an end resting at an English cell's edge, none of the English selected, takes no sentence: rows 1-3, not 1-6; 2-4, not 1-4", () => {
  const a = span(PISOS, "Humano capiti")[0], b = span(PISOS, "Believe me")[0];
  expect(referencePayload(state(PISOS, a, b), { date: "bookshelf", tag: "Horace/Ars Poetica" }, pisos)).toMatchObject({ label: "Horace, *Ars Poetica*, 1-3" });
  const c = span(PISOS, "could you refrain from laughing?")[1], d = span(PISOS, "persimilem")[1];
  expect(referencePayload(state(PISOS, c, d), { date: "bookshelf", tag: "Horace/Ars Poetica" }, pisos)).toMatchObject({ label: "Horace, *Ars Poetica*, 2-4" });
});
test("a passage across a skipped line number keeps it, numbered as the edition numbers it", () => {
  const doc = parseMarkdown("::: dual-language 544\nvicta labore fugae | Overcome\nqua nimium placui | Destroy\n⟨skipped line number⟩\nvix prece finita | Scarce\n:::");
  const [a, b] = span(doc, "qua nimium", "vix prece");
  expect(quote(doc, a, b)).toBe("> ::: dual-language 545\n> qua nimium placui | Destroy\n> ⟨skipped line number⟩\n> vix prece finita | Scarce\n> :::");
  expect(rangeOf(doc, a, b)).toBe("545-47");
  const plain = parseMarkdown("::: verse 545\nqua nimium placui\n⟨skipped line number⟩\nvix prece finita\n:::");
  const [c, d] = span(plain, "qua nimium", "vix prece");
  expect(quote(plain, c, d)).toBe("> ::: verse 545\n> qua nimium placui\n> ⟨skipped line number⟩\n> vix prece\n> :::");
});

test("a passage starting or ending inside a line quotes from the word the selection starts in to the word it ends in, numbered as before", () => {
  const doc = parseMarkdown("::: verse\nWhat beast was’t, then,\nDoes unmake you. I have given suck, and know\nHow tender ’tis to love the babe that milks me:\nI would, while it was smiling in my face,\n:::");
  const [a, b] = span(doc, "I have given", "smiling");
  expect(quote(doc, a, b)).toBe("> ::: verse 2\n> I have given suck, and know\n> How tender ’tis to love the babe that milks me:\n> I would, while it was smiling\n> :::");
  const [c, d] = span(doc, "ave given", "smil");
  expect(quote(doc, c, d)).toBe("> ::: verse 2\n> have given suck, and know\n> How tender ’tis to love the babe that milks me:\n> I would, while it was smiling\n> :::");
  const [e, f] = span(doc, " I have", "and know");
  expect(quote(doc, e, f)).toBe("> ::: verse 2\n> I have given suck, and know\n> :::");
  expect(rangeOf(doc, a, b)).toBe(rangeOf(doc, span(doc, "Does")[0], span(doc, "face,")[1]));
});
test("a passage begun at the end of a line starts on the next, numbered from it", () => {
  const doc = parseMarkdown("::: verse\nWhat beast was’t, then,\nDoes unmake you. I have given suck, and know\n:::");
  const [a, b] = [span(doc, "then,")[1], span(doc, "and know")[1]];
  expect(quote(doc, a, b)).toBe("> ::: verse 2\n> Does unmake you. I have given suck, and know\n> :::");
  expect(rangeOf(doc, a, b)).toBe(rangeOf(doc, ...span(doc, "Does", "know")));
});
test("a passage begun at the end of one verse block's last line lies in the next block alone: no refusal", () => {
  const doc = parseMarkdown("::: verse\na line of the first\n:::\n\n::: verse\nthe second block's line\n:::");
  const out = referencePayload(state(doc, span(doc, "first")[1], span(doc, "second")[1]), { date: "bookshelf", tag: "Milton, John/Paradise Lost/Book 1" }, journal);
  expect("passage" in out && out.passage).toBe("> ::: verse\n> the second\n> :::");
});
test("a block inside a note, the label's top level, an end resting on a row, blanks, depth, the count before", () => {
  /* a verse block inside a note inside a verse block is walked whole (Satires 1.10's shape) */
  const satires = parseMarkdown("::: verse\nLucili, quam sis mendosus, teste Catone,\n::: note\n::: verse\nquam sis mendosus, teste Catone,\ndefensore tuo, pervincam\n:::\n:::\n:::");
  let [a, b] = span(satires, "defensore", "pervincam");
  expect(quote(satires, a, b)).toBe("> ::: verse 2\n> defensore tuo, pervincam\n> :::");
  /* the label counts the entry's own lines, never a pasted reference's */
  const host = parseMarkdown("::: verse\nline one\nline two\n:::\n\n> ::: verse 13\n> a | b\n> c | d\n> :::");
  [a, b] = span(host, "a", "d");
  expect(rangeOf(host, a, b)).toBe("");
  expect(quote(host, a, b)).toBe("> ::: verse 13\n> a | b\n> c | d\n> :::");
  [a, b] = span(host, "line one", "line two");
  expect(rangeOf(host, a, b)).toBe("1-2");
  /* an end resting at a row's edge with none of its ink selected takes none of the row */
  const q = parseMarkdown("[*Horace*](#commonplace/Horace?h=x):\n\n> ::: verse 13\n> alpha beta | one two\n> :::");
  [a] = span(q, "Horace", "Horace");
  let cellStart = 0; q.descendants((n, pos) => { if (n.type.name === "cell" && !cellStart) cellStart = pos + 1; });
  expect(quote(q, a, cellStart)).toBe("> [*Horace*](#commonplace/Horace?h=x):");
  /* a quote body's blank line stays one blank once lifted */
  const blanks = parseMarkdown("> The mind\n>\n> ::: verse 13\n> a | b\n> :::\n> \n> After.");
  [a, b] = span(blanks, "mind", "After");
  expect(quote(blanks, a, b)).toBe("> mind\n> ::: verse 13\n> a | b\n> :::\n> After");   /* no blank at a fence's edge: it painted an empty line */
  /* two quotations deep, or inside a note: one level out */
  const deep = parseMarkdown("> > ::: verse 13\n> > alpha beta | one two\n> > gamma delta | three four\n> > :::\n> >\n> > After the quote.");
  [a, b] = span(deep, "four", "After");
  expect(quote(deep, a, b)).toBe("> ::: verse 14\n> gamma delta | three four\n> :::\n> After");   /* both ends in the inner quotation: both levels off */
  const noted = parseMarkdown("::: note\nfootnote here\n:::");
  [a, b] = span(noted, "footnote", "footnote");
  expect(quote(noted, a, b)).toBe("> footnote");
  /* a direction alone carries the block's count at its row, as the last row too */
  const mid = parseMarkdown("::: verse 13\nalpha | one\n*exit* | *exit*\nbeta | two\n:::");
  [a, b] = span(mid, "exit", "exit");
  expect(quote(mid, a, b)).toBe("> ::: verse 14\n> *exit* | *exit*\n> :::");
  const last = parseMarkdown("::: verse 13\nalpha | one\n*exit* | *exit*\n:::");
  [a, b] = span(last, "exit", "exit");
  expect(quote(last, a, b)).toBe("> ::: verse 14\n> *exit* | *exit*\n> :::");
});
test("two verse blocks are a refusal", () => {
  const doc = parseMarkdown("::: verse\na\nb\n:::\n\n::: verse\nc\n:::");
  const [a, b] = span(doc, "b", "c");
  expect(quote(doc, a, b)).toBe("two-blocks");
  expect(referencePayload(state(doc, a, b), { date: "bookshelf", tag: "Milton, John/Paradise Lost/Book 1" }, journal)).toEqual({ refused: "two-blocks" });
});

test("the leaf range is read from the page the selection is on; a leaf inside a note turns no page", () => {
  const doc = parseMarkdown("⟨61⟩ Opening words of the leaf.\n\n::: note\n⟨99⟩ a note's own marker\n:::\n\nMore of it ⟨62⟩ and on it goes to the end.");
  const [a, b] = span(doc, "words", "More");
  expect(rangeOf(doc, a, b)).toBe("p. 61");
  const noted = parseMarkdown("⟨61⟩ Opening words.\n\n::: margin-note\n⟨99⟩ a margin-note's marker\n:::\n\nMore of it.");
  const [g, h] = span(noted, "words", "More");
  expect(rangeOf(noted, g, h)).toBe("p. 61");
  const [c, d] = span(doc, "words", "goes");
  expect(rangeOf(doc, c, d)).toBe("pp. 61-62");
  const [e, f] = span(doc, "and on");
  expect(rangeOf(doc, e, f)).toBe("p. 62");
});

test("selectionLink: the text and which occurrence it is", () => {
  const doc = parseMarkdown("the cat sat. the cat sat again.");
  const [a, b] = span(doc, "cat sat again");
  expect(selectionLink(doc, a - 4, b)).toEqual({ q: "the cat sat again", nth: 0 });
  const [c, d] = span(doc, "cat");
  expect(selectionLink(doc, c, d)).toEqual({ q: "cat", nth: 0 });
  expect(selectionLink(doc, c + 13, d + 13)).toEqual({ q: "cat", nth: 1 });
});

test("referencePayload: the link line with the range and the highlight, the passage under it", () => {
  const [a, b] = span(verse, "forbidden", "Brought death");
  const out = referencePayload(state(verse, a, b), { date: "bookshelf", tag: "Milton, John/Paradise Lost/Book 1" }, journal);
  expect(out).toMatchObject({ text:
    "[Milton, *Paradise Lost*, 1.2-3](#bookshelf/Milton%2C%20John/Paradise%20Lost/Book%201?h=forbidden%20tree%2C%20whose%20mortal%20taste%20Brought%20death):\n\n" +
    "> ::: verse 2\n> forbidden tree, whose mortal taste\n> \n> Brought death\n> :::" });
  /* the parts the rich flavour is built from ride beside the text */
  expect(out).toMatchObject({ label: "Milton, *Paradise Lost*, 1.2-3", url: "#bookshelf/Milton%2C%20John/Paradise%20Lost/Book%201?h=forbidden%20tree%2C%20whose%20mortal%20taste%20Brought%20death", passage: "> ::: verse 2\n> forbidden tree, whose mortal taste\n> \n> Brought death\n> :::" });
  expect(referencePayload(state(verse, a, a), { date: "bookshelf", tag: "x" }, journal)).toEqual({ refused: "select" });
  /* the highlight carries the words the passage quotes */
  const [c, d] = span(verse, "orbidden", "Brought de");
  expect(referencePayload(state(verse, c, d), { date: "bookshelf", tag: "Milton, John/Paradise Lost/Book 1" }, journal)).toMatchObject({ url: out && "url" in out ? out.url : "" });
});

test("a selection wholly inside a margin-note is refused, between paragraphs or in a verse block", () => {
  const between = parseMarkdown("First.\n\n::: margin-note\nthe note beside\n:::\n\nSecond.");
  let [a, b] = span(between, "the note", "beside");
  expect(referencePayload(state(between, a, b), { date: "bookshelf", tag: "x" }, journal)).toEqual({ refused: "margin-note" });
  const inVerse = parseMarkdown("::: verse\nalpha\n::: margin-note\nthe note beside\n:::\nbeta\n:::");
  [a, b] = span(inVerse, "the note", "beside");
  expect(referencePayload(state(inVerse, a, b), { date: "bookshelf", tag: "x" }, journal)).toEqual({ refused: "margin-note" });
  /* a selection reaching out of it quotes the text around it, the margin-note left out */
  [a, b] = span(inVerse, "beside", "beta");
  expect(referencePayload(state(inVerse, a, b), { date: "bookshelf", tag: "x" }, journal)).toMatchObject({ passage: "> ::: verse 2\n> beta\n> :::" });
});

test("a leaf stands in for a prose book's titled chapter; entryLinkParts names the entry the same way", () => {
  const doc = parseMarkdown("# 3. The Dark Ages\n\n⟨61⟩ The Church had a difficulty.\n\n⟨62⟩ It went on.");
  const [a, b] = span(doc, "difficulty", "went");
  const out = referencePayload(state(doc, a, b), { date: "bookshelf", tag: "Williams, Charles/Witchcraft/3. The Dark Ages" }, journal);
  expect((out as { text: string }).text.split("\n")[0]).toMatch(/^\[Williams, \*Witchcraft\*, pp\. 61-62\]/);
  const link = entryLinkParts("bookshelf", "Williams, Charles/Witchcraft/3. The Dark Ages", journal);
  expect("[" + link.label + "](" + link.url + ")").toBe("[Williams, *Witchcraft*, *3. The Dark Ages*](#bookshelf/Williams%2C%20Charles/Witchcraft/3.%20The%20Dark%20Ages)");
});

test("referenceAnchorHTML: the label's italics as em, everything else escaped, the url escaped", () => {
  expect(referenceAnchorHTML("#2026-09-07?h=a%20b", "*Gesta*, 7 September 2026")).toBe('<a href="#2026-09-07?h=a%20b"><em>Gesta</em>, 7 September 2026</a>');
  expect(referenceAnchorHTML('#x"y', "a <b> & *c*")).toBe('<a href="#x&quot;y">a &lt;b&gt; &amp; <em>c</em></a>');
});


const canto = parseMarkdown("# Book I, Canto i\n\n::: note\nThe Patron of true Holinesse,\n:::\n\n" +
  "::: stanza 1\nA Gentle Knight was pricking on the plaine,\nYcladd in mightie armes and siluer shielde,\nWherein old dints of deepe wounds did remaine,\n:::\n\n" +
  "::: stanza 2\nBut on his brest a bloudie Crosse he bore,\nThe deare remembrance of his dying Lord,\nFor whose sweete sake that glorious badge he wore,\n:::\n\n" +
  "::: stanza 3\nVpon a great aduenture he was bond,\nThat greatest Gloriana to him gaue,\nThat greatest Glorious Queene of Faerie lond,\n:::");
test("stanzaRange: a line, lines, a whole stanza, whole stanzas, a run across them", () => {
  const r = (a: string, b?: string) => { const [x, y] = span(canto, a, b); return rangeOf(canto, x, y); };
  expect(r("bloudie Crosse")).toBe("2.1");
  expect(r("bloudie Crosse", "dying Lord")).toBe("2.1-2");
  expect(r("But on his brest", "badge he wore,")).toBe("2");
  expect(r("A Gentle Knight", "badge he wore,")).toBe("1–2");
  expect(r("deepe wounds", "dying Lord")).toBe("1.3–2.2");
  expect(r("Patron")).toBe("");
});
test("stanzas refer by stanza under the canto's key, and a run across a stanza gap is allowed and quoted whole", () => {
  const [a, b] = span(canto, "bloudie Crosse");
  const plain = referencePayload(state(canto, a, b), { date: "bookshelf", tag: "Somebody/A Work/1.1" }, journalOf({}));
  expect("label" in plain && plain.label).toBe("Somebody, *A Work*, 1.1.2.1");
  const [c, d] = span(canto, "deepe wounds", "dying Lord");
  const run = referencePayload(state(canto, c, d), { date: "bookshelf", tag: "Somebody/A Work/1.1" }, journalOf({}));
  expect("label" in run && run.label).toBe("Somebody, *A Work*, 1.1.1.3–2.2");
  const [e, f] = span(canto, "Wherein old dints", "dying Lord,");
  const gap = referencePayload(state(canto, e, f), { date: "bookshelf", tag: "Somebody/A Work/1.1" }, journalOf({}));
  expect("passage" in gap && gap.passage).toBe("> Wherein old dints of deepe wounds did remaine,\n> \n> But on his brest a bloudie Crosse he bore,\n> The deare remembrance of his dying Lord,");
  const [g, h] = span(canto, "A Gentle Knight", "Faerie lond,");
  const all = referencePayload(state(canto, g, h), { date: "bookshelf", tag: "Somebody/A Work/1.1" }, journalOf({}));
  expect("label" in all && all.label).toBe("Somebody, *A Work*, 1.1.1–3");
});
// Any work whose verse is in stanza fences refers by stanza: Hávamál, a root
// with no author, its stanzas paired with a translation.
const HAV = parseMarkdown("# Hávamál\n\n::: reference\nno author\n:::\n\n::: stanza 76\nDeyr fé | Cattle die,\ndeyja frændr | kinsmen die,\ndeyr sjálfr it sama | the self dies likewise;\nen orðstírr | but the renown\ndeyr aldregi | for the one who gets good fame\nhveim er sér góðan getr | dies never.\n:::\n\n::: stanza 77\nDeyr fé | Cattle die,\ndeyja frændr | kinsmen die,\ndeyr sjálfr it sama | the self dies likewise;\nek veit einn | I know one thing\nat aldri deyr | that never dies:\ndómr um dauðan hvern | the repute of each of the dead.\n:::");
const havJournal = journalOf({ "bookshelf/Hávamál": "# Hávamál\n\n::: reference\nno author\n:::" });
const havLabel = (needle: string, end?: string): string | false => {
  const [a, b] = span(HAV, needle, end);
  const p = referencePayload(state(HAV, a, b), { date: "bookshelf", tag: "Hávamál" }, havJournal);
  return "label" in p && p.label;
};
test("a work in stanza fences refers by stanza with no directive: Hávamál, 76.1-3; a whole stanza 76; a run across stanzas 76.4–77.4", () => {
  expect(havLabel("Deyr fé", "it sama")).toBe("*Hávamál*, 76.1-3");
  expect(havLabel("Deyr fé", "getr")).toBe("*Hávamál*, 76");
  expect(havLabel("orðstírr", "ek veit einn")).toBe("*Hávamál*, 76.4–77.4");
});
// Old English verse refers to its half-lines: a work whose page says so, its
// lines two half-lines apart at a double space.
const BWF_PAGE = "# Beowulf\n\n::: reference\nno author\nOld English verse\n:::";
const BWF = parseMarkdown(BWF_PAGE + "\n\n::: verse 49\ngeafon on garsecg;  him wæs geomor sefa,\nmurnende mod.  Men ne cunnon\nsecgan to soðe,  selerædende,\nhæleð under heofenum,  hwa þæm hlæste onfeng.\n:::");
const oeLabel = (doc: Node, tag: string, page: Record<string, string>, [needle, end]: [string, string?]): string | false => {
  const [a, b] = span(doc, needle, end);
  const p = referencePayload(state(doc, a, b), { date: "bookshelf", tag: tag }, journalOf(page));
  return "label" in p && p.label;
};
test("a lettered line is referred to by its label, alone or at either end of a run; a run through it by its numbers", () => {
  const d = parseMarkdown("::: dual-language 155\nv\nvi\nrumor | Soon\n⟨line 157a⟩arma\ntum\ndevenio\n:::");
  const range = (a: string, b?: string): string => rangeOf(d, ...span(d, a, b));
  expect(range("arma")).toBe("157a");
  expect(range("rumor", "arma")).toBe("157-157a");
  expect(range("arma", "devenio")).toBe("157a-59");
  expect(range("v", "arma")).toBe("155-57a");
  expect(range("v", "devenio")).toBe("155-59");
  const two = parseMarkdown("::: verse 157\nplain\n⟨line 157a⟩first\n⟨…⟩rest\n⟨line 157b⟩second\nnext\n:::");
  expect(rangeOf(two, ...span(two, "first", "second"))).toBe("157a-157b");
  expect(rangeOf(two, ...span(two, "rest"))).toBe("157a");
  expect(rangeOf(two, ...span(two, "first", "rest"))).toBe("157a");
  const quoted = quote(d, ...span(d, "arma", "tum"));
  expect(quoted).toContain("::: dual-language 158\n> ⟨line 157a⟩arma\n> tum");
});
test("a bracketed line is referred to in its brackets, a run reaching one by both its ends whole", () => {
  const d = parseMarkdown("::: dual-language 370\nalpha\nbeta\n⟨line [378]⟩gamma\n⟨line [379]⟩delta\n⟨line [380]⟩epsilon\n:::");
  const range = (a: string, b?: string): string => rangeOf(d, ...span(d, a, b));
  expect(range("gamma")).toBe("[378]");
  expect(range("gamma", "epsilon")).toBe("[378]-[380]");
  expect(range("beta", "delta")).toBe("371-[379]");
});
test("Old English verse refers to a half-line as 50a or 50b, a run from a second half or to a first as 50b-52 or 49-50a, both halves as the line", () => {
  const page = { "bookshelf/Beowulf": BWF_PAGE };
  expect(oeLabel(BWF, "Beowulf", page, ["Men ne cunnon", "onfeng"])).toBe("*Beowulf*, 50b-52");
  expect(oeLabel(BWF, "Beowulf", page, ["Men ne cunnon"])).toBe("*Beowulf*, 50b");
  expect(oeLabel(BWF, "Beowulf", page, ["murnende mod"])).toBe("*Beowulf*, 50a");
  expect(oeLabel(BWF, "Beowulf", page, ["murnende", "cunnon"])).toBe("*Beowulf*, 50");
  expect(oeLabel(BWF, "Beowulf", page, ["geafon", "murnende mod"])).toBe("*Beowulf*, 49-50a");
  expect(oeLabel(BWF, "Beowulf", page, ["ne cunnon", "to soðe"])).toBe("*Beowulf*, 50b-51a");
  // a selection begun in the double space starts on the second half's first word
  const [a, b] = span(BWF, "  Men ne");
  const p = referencePayload(state(BWF, a, b), { date: "bookshelf", tag: "Beowulf" }, journalOf(page));
  expect("label" in p && p.label).toBe("*Beowulf*, 50b");
});
test("without the line on its page a work refers to whole lines, double space or not", () => {
  expect(oeLabel(BWF, "Beowulf", { "bookshelf/Beowulf": "# Beowulf\n\n::: reference\nno author\n:::" }, ["Men ne cunnon", "onfeng"])).toBe("*Beowulf*, 50-52");
  // the words inside a longer line are not the directive
  expect(oeLabel(BWF, "Beowulf", { "bookshelf/Beowulf": "# Beowulf\n\n::: reference\nno author\nnot Old English verse here\n:::" }, ["Men ne cunnon"])).toBe("*Beowulf*, 50");
});
test("Old English verse with its translation: the original's halves count, the translation's words refer to the line; a line with no double space is whole", () => {
  const page = "# Deor\n\n::: reference\nno author\nOld English verse\n:::";
  const deor = parseMarkdown(page + "\n\n::: verse\nWelund him be wurman  wræces cunnade, | Weland himself, by means of worms (swords?), experienced agony,\nanhydig eorl  earfoþa dreag, | the strong-minded noble endured troubles;\n* * * |\n:::");
  const j = { "bookshelf/Deor": page };
  expect(oeLabel(deor, "Deor", j, ["wræces cunnade"])).toBe("*Deor*, 1b");
  expect(oeLabel(deor, "Deor", j, ["wræces", "anhydig eorl"])).toBe("*Deor*, 1b-2a");
  expect(oeLabel(deor, "Deor", j, ["experienced agony"])).toBe("*Deor*, 1");
  expect(oeLabel(deor, "Deor", j, ["* * *"])).toBe("*Deor*, 3");
});
test("Old English verse with its translation quotes the original from the half the reference names, the translation whole", () => {
  const page = "# Seafarer\n\n::: reference\nno author\nOld English verse\n:::";
  const sf = parseMarkdown(page + "\n\n::: verse 80\ndream mid dugeþum.  Dagas sind gewitene, | joy with the Hosts. The days are gone\nealle onmedlan  eorþan rices; | of all the glory of the kingdoms of the earth;\nnearon nu cyningas  ne caseras | there are not now kings, nor Cæsars,\n:::");
  const j = journalOf({ "bookshelf/Seafarer": page });
  const run = referencePayload(state(sf, ...span(sf, "Dagas sind", "ealle onmedlan")), { date: "bookshelf", tag: "Seafarer" }, j);
  expect("label" in run && run.label).toBe("*Seafarer*, 80b-81a");
  expect("passage" in run && run.passage).toBe("> ::: verse 80\n> Dagas sind gewitene, | joy with the Hosts. The days are gone\n> ealle onmedlan | of all the glory of the kingdoms of the earth;\n> :::");
  const whole = referencePayload(state(sf, ...span(sf, "Dagas sind", "ne caseras")), { date: "bookshelf", tag: "Seafarer" }, j);
  expect("passage" in whole && whole.passage).toBe("> ::: verse 80\n> Dagas sind gewitene, | joy with the Hosts. The days are gone\n> ealle onmedlan  eorþan rices; | of all the glory of the kingdoms of the earth;\n> nearon nu cyningas  ne caseras | there are not now kings, nor Cæsars,\n> :::");
  // without the line on its page a paired row is quoted whole
  const plain = referencePayload(state(sf, ...span(sf, "Dagas sind", "ealle onmedlan")), { date: "bookshelf", tag: "Seafarer" }, journalOf({ "bookshelf/Seafarer": "# Seafarer" }));
  expect("passage" in plain && plain.passage).toMatch(/^> ::: verse 80\n> dream mid dugeþum\.  Dagas/);
});
test("Old English verse said on a work's page reaches the entries below it; the range keeps its elision, 1162b-68a", () => {
  const work = "# Elene\n\n::: reference\nOld English verse\n:::";
  const doc = parseMarkdown("::: verse 1162\na b  c d\ne\nf\ng\nh\ni\nj k  l m\n:::");
  const p = referencePayload(state(doc, ...span(doc, "c d", "j k")), { date: "bookshelf", tag: "Cynewulf/Elene/Fitt 1" }, journalOf({ "bookshelf/Cynewulf": "# Cynewulf", "bookshelf/Cynewulf/Elene": work }));
  expect("label" in p && p.label).toBe("Cynewulf, *Elene*, 1.1162b-68a");
  expect(rangeOf(doc, ...span(doc, "c d", "j k"))).toBe("1162-68");
});

test("a run from a stanza into a plain verse block is refused", () => {
  const mixed = parseMarkdown("::: stanza 1\na\nb\n:::\n\n::: verse\nc\n:::");
  const [a, b] = span(mixed, "b", "c");
  expect(referencePayload(state(mixed, a, b), { date: "bookshelf", tag: "Somebody/A Work/1.1" }, journalOf({}))).toEqual({ refused: "two-blocks" });
});

test("a passage starting on the line after a skipped line number is numbered from that line", () => {
  const doc = parseMarkdown("::: verse 545\nqua\n⟨skipped line number⟩\nvix\nnext\n:::");
  const [a, b] = span(doc, "vix", "next");
  expect(rangeOf(doc, a, b)).toBe("547-48");
  expect(quote(doc, a, b)).toBe("> ::: verse 547\n> vix\n> next\n> :::");
});

// A block numbered on both sides: Golding's lines beside the Latin.
const GOLDING_TAG = "Ovid/Metamorphoses (with Golding’s translation)/Book 7";
const goldingJournal = journalOf({ "bookshelf/Ovid/Metamorphoses (with Golding’s translation)": "# *Metamorphoses* (with Golding’s translation)", ["bookshelf/" + GOLDING_TAG]: "# Book 7" });
const GOLDING = parseMarkdown("# Book 7\n\n::: verse 196 263\nquaeque magos, Tellus, | Ye Charmes and Witchcrafts,\n | Of mightie working furnishest\nauraeque et venti | Ye Ayres and windes:\ndique omnes nemorum | Of standing Lakes,\nquorum ope, cum volui | Through helpe of whom\n | I have compelled streames\n:::");
const golding = (needle: string, end?: string, all = false) => {
  const [a, b] = span(GOLDING, needle, end);
  return referencePayload(state(GOLDING, a, b), { date: "bookshelf", tag: GOLDING_TAG }, goldingJournal, all);
};
test("a passage from a block numbered on both sides quotes the translation alone, numbered from its first line, and refers to both columns' lines", () => {
  const p = golding("Ye Ayres", "I have compelled streames");
  expect("label" in p && p.label).toBe("Ovid, *Metamorphoses*, 7.197-99 (Golding, 7.265-68)");
  expect("passage" in p && p.passage).toBe("> ::: verse 265\n> Ye Ayres and windes:\n> Of standing Lakes,\n> Through helpe of whom\n> I have compelled streames\n> :::");
  const part = golding("Of mightie working");
  expect("label" in part && part.label).toBe("Ovid, *Metamorphoses*, 7 (Golding, 7.264)");
  expect("passage" in part && part.passage).toBe("> ::: verse 264\n> Of mightie working\n> :::");
  const latinOnly = parseMarkdown("# Book 7\n\n::: verse 196 263\nquaeque magos\nauraeque | Ye Ayres\n:::");
  const [la, lb] = span(latinOnly, "quaeque magos");
  expect(referencePayload(state(latinOnly, la, lb), { date: "bookshelf", tag: GOLDING_TAG }, goldingJournal)).toEqual({ refused: "no-translation" });
});
test("Ref (all): a passage from a block numbered on both sides quotes both columns, numbered on both sides from where it opens", () => {
  const p = golding("Ye Ayres", "I have compelled", true);
  expect("label" in p && p.label).toBe("Ovid, *Metamorphoses*, 7.197-99 (Golding, 7.265-68)");
  expect("passage" in p && p.passage).toBe("> ::: verse 197 265\n> auraeque et venti | Ye Ayres and windes:\n> dique omnes nemorum | Of standing Lakes,\n> quorum ope, cum volui | Through helpe of whom\n>  | I have compelled streames\n> :::");
  const alone = golding("Of mightie working", undefined, true);
  expect("passage" in alone && alone.passage).toBe("> ::: verse 197 264\n>  | Of mightie working furnishest\n> :::");
  expect(golding("quaeque magos", undefined, true)).not.toHaveProperty("refused");
});
test("a block can be quoted by its translation alone only where the selection lies wholly inside one numbered on both sides", () => {
  const [a, b] = span(GOLDING, "Ye Ayres", "Of standing");
  expect(facingOf(GOLDING, a, b)?.pos).toBe(GOLDING.child(0).nodeSize);
  const [c, d] = span(GOLDING, "Book 7", "Ye Ayres");
  expect(facingOf(GOLDING, c, d)).toBeNull();
  const [e, f] = span(verse, "forbidden", "Brought death");
  expect(facingOf(verse, e, f)).toBeNull();
  /* a block quoted inside an entry is that entry's passage, and a note in the block is no translation's */
  const nested = parseMarkdown("> ::: verse 197 265\n> auraeque | Ye Ayres\n> dique | Of standing\n> :::");
  const [g, h] = span(nested, "Ye Ayres", "Of standing");
  expect(facingOf(nested, g, h)).toBeNull();
  const noted = parseMarkdown("::: verse 197 265\nauraeque | Ye Ayres\n::: note\n[1] An eclipse.\n:::\n:::");
  const [i, j] = span(noted, "An eclipse");
  expect(facingOf(noted, i, j)).toBeNull();
  expect(referencePayload(state(noted, i, j), { date: "bookshelf", tag: GOLDING_TAG }, goldingJournal)).not.toHaveProperty("refused");
});
test("the translation alone: every row the selection inks gives its line, cut only where the selection starts or ends inside it, so both buttons refer to the same lines", () => {
  const p = golding("auraeque", "quorum ope");
  const all = golding("auraeque", "quorum ope", true);
  expect("label" in p && p.label).toBe("Ovid, *Metamorphoses*, 7.197-99 (Golding, 7.265-67)");
  expect("label" in all && all.label).toBe("Ovid, *Metamorphoses*, 7.197-99 (Golding, 7.265-67)");
  expect("passage" in p && p.passage).toBe("> ::: verse 265\n> Ye Ayres and windes:\n> Of standing Lakes,\n> Through helpe of whom\n> :::");
});
test("the translation alone keeps its verse paragraphs' gaps and its apparatus, and a line drawn wholly in italics stays a line", () => {
  const doc = parseMarkdown("# Book 7\n\n::: verse 196 263\nquaeque | Ye Charmes\n\nauraeque | *Ye Ayres*\n*Medea* | *Medea*\ndique | Of standing\n:::");
  const [a, b] = span(doc, "Ye Charmes", "Of standing");
  const p = referencePayload(state(doc, a, b), { date: "bookshelf", tag: GOLDING_TAG }, goldingJournal);
  expect("passage" in p && p.passage).toBe("> ::: verse 263\n> Ye Charmes\n> \n> ⟨line⟩*Ye Ayres*\n> *Medea*\n> Of standing\n> :::");
  expect("label" in p && p.label).toBe("Ovid, *Metamorphoses*, 7.196-98 (Golding, 7.263-65)");
});
test("a passage running from one block numbered on both sides into the next is refused, though it starts on a row with nothing on the left", () => {
  const two = parseMarkdown("# Book 7\n\n::: verse 179 244\nTres | Before\n | Untill that Glaucus\n:::\n\n::: verse 180 246\nsidera | The starres\n:::");
  const [a, b] = span(two, "Untill", "The starres");
  expect(referencePayload(state(two, a, b), { date: "bookshelf", tag: GOLDING_TAG }, goldingJournal)).toEqual({ refused: "two-blocks" });
});

// The Vita Nuova: a chapter of prose numbered by Barbi's paragraphs and its
// poems, under the work's `prosimetrum` directive.
const vnJournal = journalOf({
  "bookshelf/Dante": "# Dante\n\n::: reference\nfrom the last title\n:::",
  "bookshelf/Dante/Vita Nuova": "# Vita Nuova\n\n::: reference\nprosimetrum\n:::",
});
const VN3 = parseMarkdown("# Vita Nuova, 3\n\n::: prose 8\nE mantenente cominciai a pensare. | And immediately having considered.\nE trovai che l'ora era la quarta. | I knew that it was the fourth hour.\n\nPensando io a ciò che m'era apparuto. | Then, musing on what I had seen.\n:::\n\n" +
  "::: verse\nA ciascun' alma presa e gentil core | To every heart which the sweet pain doth move,\nnel cui cospetto ven lo dir presente, | And unto which these words may now be brought\n:::\n\n" +
  "::: prose 13\nA questo sonetto fue risposto da molti. | To this sonnet I received many answers.\n:::");
const VN8 = parseMarkdown("# Vita Nuova, 8\n\n::: prose\nAppresso lo partire. | After the departure.\n:::\n\n" +
  "::: verse\nPiangete, amanti, poi che piange Amore, | Weep, Lovers, sith Love's very self doth weep,\nudendo qual cagion lui fa plorare. | And sith the cause for weeping is so great;\n:::\n\n" +
  "::: verse\nMorte villana, di pietà nemica, | Death, alway cruel, Pity's foe in chief,\ndi dolor madre antica, | Mother who brought forth grief,\n:::");
const vnLabel = (doc: Node, ch: string, [needle, end]: [string, string?], j = vnJournal): string | false => {
  const [a, b] = span(doc, needle, end);
  const p = referencePayload(state(doc, a, b), { date: "bookshelf", tag: "Dante/Vita Nuova/" + ch }, j);
  return "label" in p && p.label;
};
test("a prosimetrum's sentence quotes that sentence and its translation alone", () => {
  const [a, b] = span(VN3, "quarta");
  const p = referencePayload(state(VN3, a, b), { date: "bookshelf", tag: "Dante/Vita Nuova/3" }, vnJournal);
  expect("passage" in p && p.passage).toBe("> ::: prose 8\n> E trovai che l'ora era la quarta. | I knew that it was the fourth hour.\n> :::");
});
test("a prosimetrum refers to the prose by Barbi's paragraph, its sentences counted under it, and a poem by its lines: 3, prose, para 8; paras 8-9; para 13; verse 1-2", () => {
  expect(vnLabel(VN3, "3", ["cominciai"])).toBe("Dante, *Vita Nuova*, 3, prose, para 8");
  expect(vnLabel(VN3, "3", ["quarta"])).toBe("Dante, *Vita Nuova*, 3, prose, para 8");
  expect(vnLabel(VN3, "3", ["cominciai", "quarta"])).toBe("Dante, *Vita Nuova*, 3, prose, para 8");
  expect(vnLabel(VN3, "3", ["fourth hour"])).toBe("Dante, *Vita Nuova*, 3, prose, para 8");
  expect(vnLabel(VN3, "3", ["apparuto"])).toBe("Dante, *Vita Nuova*, 3, prose, para 9");
  expect(vnLabel(VN3, "3", ["cominciai", "apparuto"])).toBe("Dante, *Vita Nuova*, 3, prose, paras 8-9");
  expect(vnLabel(VN3, "3", ["risposto"])).toBe("Dante, *Vita Nuova*, 3, prose, para 13");
  expect(vnLabel(VN3, "3", ["ciascun", "presente"])).toBe("Dante, *Vita Nuova*, 3, verse 1-2");
  expect(vnLabel(VN3, "3", ["sweet pain"])).toBe("Dante, *Vita Nuova*, 3, verse 1");
});
test("a prosimetrum chapter with two poems names the poem: 8, verse 1.1-2, verse 2.2; its prose as ever", () => {
  expect(vnLabel(VN8, "8", ["Piangete", "plorare"])).toBe("Dante, *Vita Nuova*, 8, verse 1.1-2");
  expect(vnLabel(VN8, "8", ["dolor madre"])).toBe("Dante, *Vita Nuova*, 8, verse 2.2");
  expect(vnLabel(VN8, "8", ["partire"])).toBe("Dante, *Vita Nuova*, 8, prose, para 1");
});
// De Doctrina Christiana: a book of prose whose fences carry the edition's
// section numbers, under the work's `by book, chapter, and paragraph` directive.
const ddcJournal = journalOf({
  "bookshelf/Augustine/De Doctrina Christiana": "# De Doctrina Christiana\n\n::: reference\nby book, chapter, and paragraph\n:::",
  "bookshelf/Augustine/De Doctrina Christiana/Book 2": "# Book 2",
  "bookshelf/Augustine/De Doctrina Christiana/Preface": "# Preface",
});
const DDC2 = parseMarkdown("# Book 2\n\n## Chapter 40\n\n::: prose 60\n60. Philosophi autem. | 60. Moreover the philosophers.\nSicut enim Aegyptii. | For as the Egyptians.\n\n61. Nam quid aliud. | 61. And what else.\n:::\n\n" +
  "## Chapter 41\n\n::: prose 62\n62. Meminerint ergo. | 62. Let them remember.\n:::\n\n::: verse\nCanto una riga | I sing a line\n:::");
const ddcLabel = (needle: string, end?: string): string | false => {
  const [a, b] = span(DDC2, needle, end);
  const p = referencePayload(state(DDC2, a, b), { date: "bookshelf", tag: "Augustine/De Doctrina Christiana/Book 2" }, ddcJournal);
  return "label" in p && p.label;
};
test("a work by book, chapter, and paragraph refers to its prose by chapter and paragraph, either column, and to its lines as a dotted number", () => {
  expect(ddcLabel("Philosophi")).toBe("Augustine, *De Doctrina Christiana*, book 2, chapter 40 (para 60)");
  expect(ddcLabel("Egyptians")).toBe("Augustine, *De Doctrina Christiana*, book 2, chapter 40 (para 60)");
  expect(ddcLabel("Philosophi", "aliud")).toBe("Augustine, *De Doctrina Christiana*, book 2, chapter 40 (paras 60-61)");
  expect(ddcLabel("Meminerint")).toBe("Augustine, *De Doctrina Christiana*, book 2, chapter 41 (para 62)");
  expect(ddcLabel("Canto")).toBe("Augustine, *De Doctrina Christiana*, book 2.1");
});
test("a work by book, chapter, and paragraph quotes a sentence alone under its paragraph's number", () => {
  const [a, b] = span(DDC2, "Aegyptii");
  const p = referencePayload(state(DDC2, a, b), { date: "bookshelf", tag: "Augustine/De Doctrina Christiana/Book 2" }, ddcJournal);
  expect("passage" in p && p.passage).toBe("> ::: prose 60\n> Sicut enim Aegyptii. | For as the Egyptians.\n> :::");
});
test("a work by book, chapter, and paragraph refers to a page with no chapter headings by the paragraph alone, and to a chapter turning inside a section by the chapter it turned to", () => {
  const preface = parseMarkdown("# Preface\n\n::: prose\n1. Sunt praecepta. | 1. There are rules.\n\n2. Quidam vero. | 2. Others again.\n:::");
  const [a, b] = span(preface, "Quidam");
  const p = referencePayload(state(preface, a, b), { date: "bookshelf", tag: "Augustine/De Doctrina Christiana/Preface" }, ddcJournal);
  expect("label" in p && p.label).toBe("Augustine, *De Doctrina Christiana*, *Preface*, para 2");
  const turning = parseMarkdown("# Book 2\n\n## Chapter 25\n\n::: prose 40\n40. Prior. | 40. Before.\n:::\n\n## Chapter 26\n\n::: prose 40\nAdumbrata enim. | For certain.\n:::");
  const [c, d] = span(turning, "Adumbrata");
  const q = referencePayload(state(turning, c, d), { date: "bookshelf", tag: "Augustine/De Doctrina Christiana/Book 2" }, ddcJournal);
  expect("label" in q && q.label).toBe("Augustine, *De Doctrina Christiana*, book 2, chapter 26 (para 40)");
});
const DDC_NOTES = parseMarkdown("# Book 2\n\n## Chapter 40\n\nA loose paragraph.\n\n::: prose 60\nFirst one. | E one.\nFirst two. | E two.\nFirst three. | E three.\n::: note\n[1] A note of Shaw's.\n:::\n\nSecond one. | F one.\n:::\n\n::: note\nA note beside the block.\n:::\n\n## Concerning signs\n\n::: prose 62\nThird one. | G one.\n:::\n\n## Chapter XL\n\n::: prose 63\nFourth one. | H one.\n:::");
const ddcPayload = (needle: string, end?: string) => {
  const [a, b] = span(DDC_NOTES, needle, end);
  return referencePayload(state(DDC_NOTES, a, b), { date: "bookshelf", tag: "Augustine/De Doctrina Christiana/Book 2" }, ddcJournal);
};
test("by book, chapter, and paragraph: a drag from a sentence out of the block quotes it under its paragraph's number, as the label names it", () => {
  const p = ddcPayload("Second one", "beside the block");
  expect("label" in p && p.label).toBe("Augustine, *De Doctrina Christiana*, book 2, chapter 40 (para 61)");
  expect("passage" in p && p.passage).toMatch(/^> ::: prose 61\n/);
});
test("a prosimetrum: a drag out of the block quotes it under its paragraph's number too", () => {
  const doc = parseMarkdown("# Vita Nuova, 3\n\n::: prose 8\nUna. | One.\nDue. | Two.\n\nTre. | Three.\n:::\n\n::: note\nA note.\n:::");
  const [a, b] = span(doc, "Tre", "A note");
  const p = referencePayload(state(doc, a, b), { date: "bookshelf", tag: "Dante/Vita Nuova/3" }, vnJournal);
  expect("passage" in p && p.passage).toMatch(/^> ::: prose 9\n/);
});
test("by book, chapter, and paragraph: text under a chapter heading keeps its chapter, a note in a prose block its paragraph, its fence numbered by it", () => {
  const inNote = ddcPayload("note of Shaw");
  expect("label" in inNote && inNote.label).toBe("Augustine, *De Doctrina Christiana*, book 2, chapter 40 (para 60)");
  expect("passage" in inNote && inNote.passage).toMatch(/^> ::: prose 60\n> ::: note\n/);
  const loose = ddcPayload("loose paragraph");
  expect("label" in loose && loose.label).toBe("Augustine, *De Doctrina Christiana*, book 2, chapter 40");
  const beside = ddcPayload("beside the block");
  expect("label" in beside && beside.label).toBe("Augustine, *De Doctrina Christiana*, book 2, chapter 40");
});
test("by book, chapter, and paragraph: a selection running through a chapter heading names both chapters; a heading naming no chapter leaves the chapter standing; a roman chapter stands as written", () => {
  const through = ddcPayload("Third one", "Chapter XL");
  expect("label" in through && through.label).toBe("Augustine, *De Doctrina Christiana*, book 2, chapters 40-XL (para 62)");
  const signs = ddcPayload("Third one");
  expect("label" in signs && signs.label).toBe("Augustine, *De Doctrina Christiana*, book 2, chapter 40 (para 62)");
  const roman = ddcPayload("Fourth one");
  expect("label" in roman && roman.label).toBe("Augustine, *De Doctrina Christiana*, book 2, chapter XL (para 63)");
});
test("without the directive the same chapter refers as every book does: 3.8, 3.1-2", () => {
  const plain = journalOf({ "bookshelf/Dante": "# Dante\n\n::: reference\nfrom the last title\n:::" });
  expect(vnLabel(VN3, "3", ["cominciai"], plain)).toBe("Dante, *Vita Nuova*, 3.8");
  expect(vnLabel(VN3, "3", ["ciascun", "presente"], plain)).toBe("Dante, *Vita Nuova*, 3.1-2");
});
