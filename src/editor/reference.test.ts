// The selection half of a reference over parsed fixtures: which rows a
// range covers, the line and leaf ranges, the payload, the passage shapes.
import { test, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import type { Node } from "prosemirror-model";
import { parseMarkdown } from "../model/parse.ts";
import { referenceRange, stanzaRange, folioRange, selectionLink, passageMd, wordEdges, spansTwoBlocks, coversProse, referencePayload, entryLink, citationAnchorHTML, facingBlockOf, offersBoth } from "./reference.ts";
import { sentenceLatin } from "./dualLanguage.ts";
import { journalOf } from "../store/headings.ts";

/* the positions of a needle's first occurrence in the document's text */
function span(doc: Node, needle: string, end?: string): [number, number] {
  let from = -1, to = -1;
  doc.descendants((n, pos) => {
    if (!n.isText) return true;
    if (from < 0) { const i = n.text!.indexOf(needle); if (i >= 0) { from = pos + i; if (!end) to = from + needle.length; } }
    if (end && from >= 0 && to < 0) { const j = n.text!.indexOf(end); if (j >= 0) to = pos + j + end.length; }
    return true;
  });
  if (from < 0 || to < 0) throw new Error("not found: " + needle + " … " + end);
  return [from, to];
}
const state = (doc: Node, from: number, to: number) => EditorState.create({ doc, selection: TextSelection.create(doc, from, to) });
const journal = journalOf({ "bookshelf/Milton, John/Paradise Lost": "# Paradise Lost", "bookshelf/Williams, Charles/Witchcraft": "# Witchcraft" });

const verse = parseMarkdown("# Book 1\n\n::: verse\n**SPEAKER**\nOf man's first disobedience, and the fruit\nOf that forbidden tree, whose mortal taste\n\nBrought death into the World, and all our woe,\nWith loss of Eden\n:::\n\nA closing paragraph.");

test("referenceRange over covered lines; a speaker label takes the line under it", () => {
  const [a, b] = span(verse, "forbidden", "Brought death");
  expect(referenceRange(verse, a, b)).toBe("2-3");
  const [c, d] = span(verse, "SPEAKER", "disobedience");
  expect(referenceRange(verse, c, d)).toBe("1");
  const [e, f] = span(verse, "closing");
  expect(referenceRange(verse, e, f)).toBe("");
});

test("a single-column passage quotes whole rows as its own fence numbered from the first quoted line, the stanza gap kept, apparatus and prose left out of the count", () => {
  const [a, b] = span(verse, "Of that forbidden", "and all our woe,");
  expect(passageMd(verse, a, b)).toBe("> ::: verse 2\n> Of that forbidden tree, whose mortal taste\n> \n> Brought death into the World, and all our woe,\n> :::");
});

test("a passage quoted from a dual-language block is a dual-language fence numbered from its first line, each quoted row keeping its sentence", () => {
  const doc = parseMarkdown("::: dual-language 568\nEst nemus Haemoniae | There is a vale.\nsilva:\n⟨…⟩vocant Tempe; | Men call it Tempe.\n:::");
  const [a, b] = span(doc, "Est nemus", "silva:");
  expect(passageMd(doc, a, b)).toBe("> ::: dual-language 568\n> Est nemus Haemoniae | There is a vale.\n> silva:\n> :::");
});

const PISOS = parseMarkdown("# Ars Poetica\n\n::: dual-language\nHumano capiti cervicem pictor equinam | If a painter chose to join a human head to the neck of a horse, could you refrain from laughing?\nspectatum admissi risum teneatis, amici?\ncredite, Pisones, isti tabulae fore librum | Believe me, dear Pisos, quite like such pictures would be a book, so that neither head nor foot can be assigned to a single shape.\npersimilem, cuius, velut aegri somnia, vanae\nfingentur species, ut nec pes nec caput uni\nreddatur formae.\n⟨…⟩“pictoribus atque poetis | “Painters and poets,” you say, “have always had an equal right.”\nquidlibet audendi semper fuit aequa potestas.”\n:::");
const pisos = journalOf({ "bookshelf/Horace": "# Horace" });

test("a selection in a sentence's English takes the Latin it stands beside, from its own row to the row before the next sentence, cited and quoted whole", () => {
  const [a, b] = span(PISOS, "quite like such pictures");
  const out = referencePayload(state(PISOS, a, b), "bookshelf", "Horace/Ars Poetica", pisos);
  expect(out).toMatchObject({ label: "Horace, *Ars Poetica*, 3-6" });
  expect(out && "passage" in out ? out.passage : "").toBe("> ::: dual-language 3\n> credite, Pisones, isti tabulae fore librum | Believe me, dear Pisos, quite like such pictures would be a book, so that neither head nor foot can be assigned to a single shape.\n> persimilem, cuius, velut aegri somnia, vanae\n> fingentur species, ut nec pes nec caput uni\n> reddatur formae.\n> :::");
  // the whole sentence, from its first word to its last, takes the same
  const [c, d] = span(PISOS, "Believe me", "a single shape.");
  expect(referencePayload(state(PISOS, c, d), "bookshelf", "Horace/Ars Poetica", pisos)).toMatchObject({ label: "Horace, *Ars Poetica*, 3-6" });
  // across two sentences: from the first one's row to the second one's last Latin
  const [e, f] = span(PISOS, "could you refrain", "Painters and poets");
  expect(referencePayload(state(PISOS, e, f), "bookshelf", "Horace/Ars Poetica", pisos)).toMatchObject({ label: "Horace, *Ars Poetica*, 1-7" });
  // a selection in the Latin is the Latin it covers, as before
  const [g, h] = span(PISOS, "persimilem", "nec caput uni");
  expect(referencePayload(state(PISOS, g, h), "bookshelf", "Horace/Ars Poetica", pisos)).toMatchObject({ label: "Horace, *Ars Poetica*, 4-5" });
});

test("sentenceLatin: the Latin a selection's English stands beside, a range per row; none for a selection in the Latin or outside a dual-language block", () => {
  const [a, b] = span(PISOS, "quite like such pictures");
  const texts = sentenceLatin(PISOS, a, b).map(([x, y]) => PISOS.textBetween(x, y));
  expect(texts).toEqual(["credite, Pisones, isti tabulae fore librum", "persimilem, cuius, velut aegri somnia, vanae", "fingentur species, ut nec pes nec caput uni", "reddatur formae."]);
  const [c, d] = span(PISOS, "persimilem", "nec caput uni");
  expect(sentenceLatin(PISOS, c, d)).toEqual([]);
  const [e, f] = span(verse, "forbidden", "Brought death");
  expect(sentenceLatin(verse, e, f)).toEqual([]);
});

test("a passage across a skipped line number keeps it, numbered as the edition numbers it", () => {
  const doc = parseMarkdown("::: dual-language 544\nvicta labore fugae | Overcome\nqua nimium placui | Destroy\n⟨skipped line number⟩\nvix prece finita | Scarce\n:::");
  const [a, b] = span(doc, "qua nimium", "vix prece");
  expect(passageMd(doc, a, b)).toBe("> ::: dual-language 545\n> qua nimium placui | Destroy\n> ⟨skipped line number⟩\n> vix prece finita | Scarce\n> :::");
  expect(referenceRange(doc, a, b)).toBe("545-47");
  const plain = parseMarkdown("::: verse 545\nqua nimium placui\n⟨skipped line number⟩\nvix prece finita\n:::");
  const [c, d] = span(plain, "qua nimium", "vix prece");
  expect(passageMd(plain, c, d)).toBe("> ::: verse 545\n> qua nimium placui\n> ⟨skipped line number⟩\n> vix prece\n> :::");
});

test("a passage starting or ending inside a line quotes from the word the selection starts in to the word it ends in, numbered as before", () => {
  const doc = parseMarkdown("::: verse\nWhat beast was’t, then,\nDoes unmake you. I have given suck, and know\nHow tender ’tis to love the babe that milks me:\nI would, while it was smiling in my face,\n:::");
  const [a, b] = span(doc, "I have given", "smiling");
  expect(passageMd(doc, a, b)).toBe("> ::: verse 2\n> I have given suck, and know\n> How tender ’tis to love the babe that milks me:\n> I would, while it was smiling\n> :::");
  const [c, d] = span(doc, "ave given", "smil");
  expect(passageMd(doc, ...wordEdges(doc, c, d))).toBe("> ::: verse 2\n> have given suck, and know\n> How tender ’tis to love the babe that milks me:\n> I would, while it was smiling\n> :::");
  const [e, f] = span(doc, " I have", "and know");
  expect(passageMd(doc, ...wordEdges(doc, e, f))).toBe("> ::: verse 2\n> I have given suck, and know\n> :::");
  expect(referenceRange(doc, a, b)).toBe(referenceRange(doc, span(doc, "Does")[0], span(doc, "face,")[1]));
});
test("wordEdges: a selection is widened to whole words, past the spaces and punctuation it starts on, an opening mark before its first word kept", () => {
  const doc = parseMarkdown("::: verse\nWhat beast was’t, then,\nDoes unmake you. I have given suck, and know\nHe said, “O soul, still in\n:::");
  const words = (a: number, b: number): string => { const [x, y] = wordEdges(doc, a, b); return doc.textBetween(x, y, "/"); };
  expect(words(...span(doc, "ave given", "suc"))).toBe("have given suck");
  expect(words(span(doc, "you")[1], span(doc, "and know")[1])).toBe("I have given suck, and know");
  expect(words(span(doc, "O soul")[0], span(doc, "O soul")[1])).toBe("“O soul");
  expect(words(span(doc, "then,")[1], span(doc, "Does unmake")[1])).toBe("Does unmake");
  expect(words(span(doc, "ve given ")[0], span(doc, "ve given ")[1])).toBe("have given");
  /* nothing but punctuation and spaces selected: the selection as it was */
  expect(words(span(doc, ". ")[0], span(doc, ". ")[1])).toBe(". ");
});
test("a passage begun at the end of a line starts on the next, numbered from it", () => {
  const doc = parseMarkdown("::: verse\nWhat beast was’t, then,\nDoes unmake you. I have given suck, and know\n:::");
  const [a, b] = wordEdges(doc, span(doc, "then,")[1], span(doc, "and know")[1]);
  expect(passageMd(doc, a, b)).toBe("> ::: verse 2\n> Does unmake you. I have given suck, and know\n> :::");
  expect(referenceRange(doc, a, b)).toBe(referenceRange(doc, ...span(doc, "Does", "know")));
});
test("a passage begun at the end of a line ending in a letter starts on the next, never on that line's last word", () => {
  const doc = parseMarkdown("::: verse\nI would, while it was smiling\nHave pluck’d my nipple from his boneless gums\n:::");
  const [a, b] = wordEdges(doc, span(doc, "smiling")[1], span(doc, "boneless")[1]);
  expect(doc.textBetween(a, b, "/")).toBe("Have pluck’d my nipple from his boneless");
});
test("a passage begun on an opening mark that ends its line starts on the next line; a mark before a word stays", () => {
  const doc = parseMarkdown("::: verse\nAnd then he cried, “\nO soul, still in\n:::");
  const [a, b] = wordEdges(doc, span(doc, "cried,")[1], span(doc, "O soul")[1]);
  expect(doc.textBetween(a, b, "/")).toBe("O soul");
});
test("a passage begun at the end of one verse block's last line lies in the next block alone: no refusal", () => {
  const doc = parseMarkdown("::: verse\na line of the first\n:::\n\n::: verse\nthe second block's line\n:::");
  const out = referencePayload(state(doc, span(doc, "first")[1], span(doc, "second")[1]), "bookshelf", "Milton, John/Paradise Lost/Book 1", journal);
  expect("passage" in out && out.passage).toBe("> ::: verse\n> the second\n> :::");
});
test("a paired block copies as its own fence inside the quotation, numbered from the first quoted line", () => {
  const doc = parseMarkdown("::: verse\nMaecenas atavis | Maecenas, descended\nedite regibus | of kings\no et praesidium | my bulwark\n:::");
  const [a, b] = span(doc, "regibus", "bulwark");
  expect(passageMd(doc, a, b)).toBe("> ::: verse 2\n> edite regibus | of kings\n> o et praesidium | my bulwark\n> :::");
  /* the quoted fence is the model's own shape: it parses back to a quotation holding the pair, the start kept, and a stanza gap survives the quote marks */
  const gapped = parseMarkdown("::: verse\na | b\nc | d\n\ne | f\n:::");
  const [c, d] = span(gapped, "c", "f");
  const md = passageMd(gapped, c, d);
  expect(md).toBe("> ::: verse 2\n> c | d\n> \n> e | f\n> :::");
  expect(parseMarkdown(md).toString()).toBe("doc(blockquote(verse(pair(cell(\"c\"), cell(\"d\")), gap, pair(cell(\"e\"), cell(\"f\")))))");
});

test("a paired citation referenced again: the quoted block walked whole, the number from its own start", () => {
  /* a paired citation inside a quotation: a cut through one cell of the pair could not be written */
  const doc = parseMarkdown("[*Horace*](#page/Horace?h=x):\n\n> ::: verse 13\n> alpha beta | one two\n> gamma delta | three four\n> :::");
  const [a, b] = span(doc, "alph", "alph");
  expect(passageMd(doc, a, b + 4)).toBe("> ::: verse 13\n> alpha beta | one two\n> :::");
  const [c, d] = span(doc, "gamma", "four");
  expect(passageMd(doc, c, d)).toBe("> ::: verse 14\n> gamma delta | three four\n> :::");
});
test("no cut through a pair, one quote level, a note kept, the block's own count", () => {
  const q = parseMarkdown("[*Horace*](#page/Horace?h=x):\n\n> ::: verse 13\n> alpha beta | one two\n> gamma delta | three four\n> :::\n\nAfter the quote.");
  /* one end outside the quoted pair: whole rows, no throw, and the quotation holding only that end STAYS, as the source had it */
  let [a, b] = span(q, "four", "After");
  expect(passageMd(q, a, b)).toBe(">> ::: verse 14\n>> gamma delta | three four\n>> :::\n> After");   /* numbered from the row the cut opens on */
  [a, b] = span(q, "Horace", "alph");
  expect(passageMd(q, a, b)).toBe("> [*Horace*](#page/Horace?h=x):\n>> ::: verse 13\n>> alpha beta | one two\n>> :::");
  /* a note inside a quoted verse block: its text, as before */
  const noted = parseMarkdown("> ::: verse 13\n> alpha beta | one two\n> ::: note\n> a footnote here\n> :::\n> gamma delta | three four\n> :::");
  [a, b] = span(noted, "footnote", "footnote");
  expect(passageMd(noted, a, b)).toBe("> ::: verse 14\n> ::: note\n> footnote\n> :::\n> :::");   /* the block's count at the note's row, as a direction alone is numbered */
  /* two quoted fences are two blocks, refused as at the top level */
  const two = parseMarkdown("> ::: verse 13\n> alpha | one\n> beta | two\n> :::\n>\n> ::: verse 40\n> gamma | three\n> :::");
  [a, b] = span(two, "beta", "three");
  expect(spansTwoBlocks(two, a, b)).toBe(true);
  /* a speaker row alone keeps the block's own count */
  const spoken = parseMarkdown("> ::: verse 13\n> **Duke** | **Duke**\n> alpha | one\n> :::");
  [a, b] = span(spoken, "Duke", "Duke");
  expect(passageMd(spoken, a, b)).toBe("> ::: verse 13\n> **Duke** | **Duke**\n> :::");
  /* an ink-less pair row between plain lines does not make the passage paired */
  const stray = parseMarkdown("::: verse\nfirst line\n |\nsecond line\n:::");
  [a, b] = span(stray, "first", "second line");
  expect(passageMd(stray, a, b)).toBe("> ::: verse\n> first line\n> \n> second line\n> :::");
  /* a quoted paragraph cited again: one level */
  const para = parseMarkdown("[*M*](#x):\n\n> The mind is its own place\n\n[*H*](#y):\n\n> ::: verse 13\n> a | b\n> :::");
  [a, b] = span(para, "mind", "own");
  expect(passageMd(para, a, b)).toBe("> mind is its own");
  /* a top-level pair's cell into the paragraph after it: whole rows, no throw */
  const top = parseMarkdown("::: verse\nalpha | one\n:::\n\nAfter.");
  [a, b] = span(top, "one", "After");
  expect(passageMd(top, a, b)).toBe("> ::: verse\n> alpha | one\n> :::\n> After");
});
test("a block inside a note, the label's top level, an end resting on a row, blanks, depth, the count before", () => {
  /* a verse block inside a note inside a verse block is walked whole (Satires 1.10's shape) */
  const satires = parseMarkdown("::: verse\nLucili, quam sis mendosus, teste Catone,\n::: note\n::: verse\nquam sis mendosus, teste Catone,\ndefensore tuo, pervincam\n:::\n:::\n:::");
  let [a, b] = span(satires, "defensore", "pervincam");
  expect(passageMd(satires, a, b)).toBe("> ::: verse 2\n> defensore tuo, pervincam\n> :::");
  /* the label counts the entry's own lines, never a pasted citation's */
  const host = parseMarkdown("::: verse\nline one\nline two\n:::\n\n> ::: verse 13\n> a | b\n> c | d\n> :::");
  [a, b] = span(host, "a", "d");
  expect(referenceRange(host, a, b)).toBe("");
  expect(passageMd(host, a, b)).toBe("> ::: verse 13\n> a | b\n> c | d\n> :::");
  [a, b] = span(host, "line one", "line two");
  expect(referenceRange(host, a, b)).toBe("1-2");
  /* an end resting at a row's edge with none of its ink selected takes none of the row */
  const q = parseMarkdown("[*Horace*](#page/Horace?h=x):\n\n> ::: verse 13\n> alpha beta | one two\n> :::");
  [a] = span(q, "Horace", "Horace");
  let cellStart = 0; q.descendants((n, pos) => { if (n.type.name === "cell" && !cellStart) cellStart = pos + 1; });
  expect(passageMd(q, a, cellStart)).toBe("> [*Horace*](#page/Horace?h=x):");
  /* a quote body's blank line stays one blank once lifted */
  const blanks = parseMarkdown("> The mind\n>\n> ::: verse 13\n> a | b\n> :::\n> \n> After.");
  [a, b] = span(blanks, "mind", "After");
  expect(passageMd(blanks, a, b)).toBe("> mind\n> ::: verse 13\n> a | b\n> :::\n> After");   /* no blank at a fence's edge: it painted an empty line */
  /* two quotations deep, or inside a note: one level out */
  const deep = parseMarkdown("> > ::: verse 13\n> > alpha beta | one two\n> > gamma delta | three four\n> > :::\n> >\n> > After the quote.");
  [a, b] = span(deep, "four", "After");
  expect(passageMd(deep, a, b)).toBe("> ::: verse 14\n> gamma delta | three four\n> :::\n> After");   /* both ends in the inner quotation: both levels off */
  const noted = parseMarkdown("::: note\nfootnote here\n:::");
  [a, b] = span(noted, "footnote", "footnote");
  expect(passageMd(noted, a, b)).toBe("> footnote");
  /* a direction alone carries the block's count at its row, as the last row too */
  const mid = parseMarkdown("::: verse 13\nalpha | one\n*exit* | *exit*\nbeta | two\n:::");
  [a, b] = span(mid, "exit", "exit");
  expect(passageMd(mid, a, b)).toBe("> ::: verse 14\n> *exit* | *exit*\n> :::");
  const last = parseMarkdown("::: verse 13\nalpha | one\n*exit* | *exit*\n:::");
  [a, b] = span(last, "exit", "exit");
  expect(passageMd(last, a, b)).toBe("> ::: verse 14\n> *exit* | *exit*\n> :::");
});
test("the passage is a quotation node, serialized", () => {
  /* a stanza gap beside a note inside the fence is a row, kept through the cut arm */
  const gapped = parseMarkdown("Intro.\n\n::: verse\na | b\n\n::: note\nfoot\n:::\n\nc | d\n:::");
  let [a, b] = span(gapped, "Intro", "d");
  expect(passageMd(gapped, a, b)).toBe("> Intro.\n> ::: verse\n> a | b\n> \n> ::: note\n> foot\n> :::\n> \n> c | d\n> :::");
  /* a refused `:::` line is a text line, its paragraph breaks kept */
  const refused = parseMarkdown("First para.\n\n::: verse x\n\nLast para.");
  [a, b] = span(refused, "First", "Last");
  expect(passageMd(refused, a, b)).toBe("> First para.\n> \n> ::: verse x\n> \n> Last");
  /* a retained quotation's edge blank comes off inside the nested box */
  const edge = parseMarkdown("> The mind\n>\n\nAfter.");
  [a, b] = span(edge, "mind", "After");
  expect(passageMd(edge, a, b)).toBe(">> mind\n> After");
  const mirror = parseMarkdown("Before.\n\n>\n> The mind");
  [a, b] = span(mirror, "Before", "mind");
  expect(passageMd(mirror, a, b)).toBe("> Before.\n>> The mind");
  /* a top-level fence cut mid-way is numbered from the row the cut opens on */
  const top = parseMarkdown("::: verse 13\nalpha | one\ngamma | three\n:::\n\nAfter.");
  [a, b] = span(top, "three", "After");
  expect(passageMd(top, a, b)).toBe("> ::: verse 14\n> gamma | three\n> :::\n> After");
});
test("the number on the right block at every depth, the nested box trimmed, an edge gap off, a note's paragraph kept", () => {
  /* the count lands on the block the cut opens in, not on the next block once an ink-less remainder is dropped */
  const two = parseMarkdown("::: verse 13\nalpha | one\n:::\n\n::: verse 40\nbeta | two\n:::\n\nAfter.");
  let [a, b] = span(two, "one", "After");
  expect(passageMd(two, a + 3, b)).toBe("> ::: verse 40\n> beta | two\n> :::\n> After");
  /* a verse inside a note inside a verse: each block its own count at its own depth */
  const nested = parseMarkdown("::: verse 13\nline one\n::: note\n::: verse 5\nqa | qb\nqc | qd\n:::\n:::\n:::\n\nAfter.");
  [a, b] = span(nested, "qd", "After");
  expect(passageMd(nested, a, b)).toBe("> ::: verse 14\n> ::: note\n> ::: verse 6\n> qc | qd\n> :::\n> :::\n> :::\n> After");
  /* an empty paragraph inside a retained quotation goes, as at the top */
  const empty = parseMarkdown("Intro.\n\n> ::: verse 13\n> a | b\n> :::\n>\n> ::: note\n> foot\n> :::");
  [a, b] = span(empty, "Intro", "foot");
  expect(passageMd(empty, a, b)).toBe("> Intro.\n>> ::: verse 13\n>> a | b\n>> :::\n>> ::: note\n>> foot\n>> :::");
  /* a gap row at a cut block's edge goes, as the row arm never quoted one */
  const gap = parseMarkdown("::: verse\na | b\n\nc | d\n:::\n\nAfter.");
  [a, b] = span(gap, "b", "After");
  expect(passageMd(gap, a + 1, b)).toBe("> ::: verse 2\n> c | d\n> :::\n> After");
  /* every edge break comes off, not one */
  const twice = parseMarkdown("Before.\n\n>\n>\n> The mind");
  [a, b] = span(twice, "Before", "mind");
  expect(passageMd(twice, a, b)).toBe("> Before.\n>> The mind");
  /* a note's own paragraph outside the nested block is prose the cut arm keeps; a note passed over inside one block still stays behind */
  const notePara = parseMarkdown("::: verse 13\nline one\n::: note\n::: verse 5\nqa | qb\nqc | qd\n:::\n\nfoot text\n:::\nline two\n:::");
  [a, b] = span(notePara, "qd", "foot");
  expect(coversProse(notePara, a, b)).toBe(true);
  expect(passageMd(notePara, a, b)).toBe("> ::: verse 14\n> ::: note\n> ::: verse 6\n> qc | qd\n> :::\n> \n> foot\n> :::\n> :::");
  const behind = parseMarkdown("::: verse\nalpha\n::: note\nfoot\n:::\nbeta\n:::");
  [a, b] = span(behind, "alpha", "beta");
  expect(coversProse(behind, a, b)).toBe(false);
  expect(passageMd(behind, a, b)).toBe("> ::: verse\n> alpha\n> beta\n> :::");
  const noted = parseMarkdown("::: verse\nalpha\n::: margin-note\nthe note\n:::\nbeta\n:::");
  [a, b] = span(noted, "alpha", "beta");
  expect(coversProse(noted, a, b)).toBe(false);
  expect(passageMd(noted, a, b)).toBe("> ::: verse\n> alpha\n> beta\n> :::");
});
test("loose prose quotes the selection itself, paragraph breaks kept", () => {
  const doc = parseMarkdown("First paragraph here.\n\nSecond one follows.");
  const [a, b] = span(doc, "paragraph", "Second");
  expect(passageMd(doc, a, b)).toBe("> paragraph here.\n> \n> Second");
});

test("a margin-note is left out of a passage in loose prose too, between paragraphs or in a block it runs into", () => {
  const between = parseMarkdown("First paragraph here.\n\n::: margin-note\nthe note\n:::\n\nSecond one follows.");
  let [a, b] = span(between, "paragraph", "Second");
  expect(passageMd(between, a, b)).toBe("> paragraph here.\n> \n> Second");
  const into = parseMarkdown("Intro.\n\n::: verse\nalpha\n::: margin-note\nthe note\n:::\nbeta\n:::");
  [a, b] = span(into, "Intro", "beta");
  expect(passageMd(into, a, b)).toBe("> Intro.\n> ::: verse\n> alpha\n> beta\n> :::");
});

test("a margin-note left out between two stanza gaps leaves one gap, not two", () => {
  const verse = parseMarkdown("::: verse\nalpha\n\n::: margin-note\nthe note\n:::\n\nbeta\n:::");
  let [a, b] = span(verse, "alpha", "beta");
  expect(passageMd(verse, a, b)).toBe("> ::: verse\n> alpha\n> \n> beta\n> :::");
  const loose = parseMarkdown("Intro.\n\n::: verse\nalpha\n\n::: margin-note\nthe note\n:::\n\nbeta\n:::");
  [a, b] = span(loose, "Intro", "beta");
  expect(passageMd(loose, a, b)).toBe("> Intro.\n> ::: verse\n> alpha\n> \n> beta\n> :::");
  /* two gaps the text itself holds stay two */
  const twice = parseMarkdown("::: verse\nalpha\n\n\nbeta\n:::");
  [a, b] = span(twice, "alpha", "beta");
  expect(passageMd(twice, a, b)).toBe("> ::: verse\n> alpha\n> \n> \n> beta\n> :::");
});

test("two verse blocks are a refusal", () => {
  const doc = parseMarkdown("::: verse\na\nb\n:::\n\n::: verse\nc\n:::");
  const [a, b] = span(doc, "b", "c");
  expect(spansTwoBlocks(doc, a, b)).toBe(true);
  expect(referencePayload(state(doc, a, b), "bookshelf", "Milton, John/Paradise Lost/Book 1", journal)).toEqual({ refused: "two-blocks" });
});

test("the leaf range is read from the page the selection is on; a leaf inside a note turns no page", () => {
  const doc = parseMarkdown("⟨61⟩ Opening words of the leaf.\n\n::: note\n⟨99⟩ a note's own marker\n:::\n\nMore of it ⟨62⟩ and on it goes to the end.");
  const [a, b] = span(doc, "words", "More");
  expect(folioRange(doc, a, b)).toEqual({ from: "61", to: "61" });
  const noted = parseMarkdown("⟨61⟩ Opening words.\n\n::: margin-note\n⟨99⟩ a margin-note's marker\n:::\n\nMore of it.");
  const [g, h] = span(noted, "words", "More");
  expect(folioRange(noted, g, h)).toEqual({ from: "61", to: "61" });
  const [c, d] = span(doc, "words", "goes");
  expect(folioRange(doc, c, d)).toEqual({ from: "61", to: "62" });
  const [e, f] = span(doc, "and on");
  expect(folioRange(doc, e, f)).toEqual({ from: "62", to: "62" });
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
  const out = referencePayload(state(verse, a, b), "bookshelf", "Milton, John/Paradise Lost/Book 1", journal);
  expect(out).toMatchObject({ text:
    "[Milton, *Paradise Lost*, 1.2-3](#bookshelf/Milton%2C%20John/Paradise%20Lost/Book%201?h=forbidden%20tree%2C%20whose%20mortal%20taste%20Brought%20death):\n\n" +
    "> ::: verse 2\n> forbidden tree, whose mortal taste\n> \n> Brought death\n> :::" });
  /* the parts the rich flavour is built from ride beside the text */
  expect(out).toMatchObject({ label: "Milton, *Paradise Lost*, 1.2-3", url: "#bookshelf/Milton%2C%20John/Paradise%20Lost/Book%201?h=forbidden%20tree%2C%20whose%20mortal%20taste%20Brought%20death", passage: "> ::: verse 2\n> forbidden tree, whose mortal taste\n> \n> Brought death\n> :::" });
  expect(referencePayload(state(verse, a, a), "bookshelf", "x", journal)).toEqual({ refused: "select" });
  /* the highlight carries the words the passage quotes */
  const [c, d] = span(verse, "orbidden", "Brought de");
  expect(referencePayload(state(verse, c, d), "bookshelf", "Milton, John/Paradise Lost/Book 1", journal)).toMatchObject({ url: out && "url" in out ? out.url : "" });
});

test("a selection wholly inside a margin-note is refused, between paragraphs or in a verse block", () => {
  const between = parseMarkdown("First.\n\n::: margin-note\nthe note beside\n:::\n\nSecond.");
  let [a, b] = span(between, "the note", "beside");
  expect(referencePayload(state(between, a, b), "bookshelf", "x", journal)).toEqual({ refused: "margin-note" });
  const inVerse = parseMarkdown("::: verse\nalpha\n::: margin-note\nthe note beside\n:::\nbeta\n:::");
  [a, b] = span(inVerse, "the note", "beside");
  expect(referencePayload(state(inVerse, a, b), "bookshelf", "x", journal)).toEqual({ refused: "margin-note" });
  /* a selection reaching out of it quotes the text around it, the margin-note left out */
  [a, b] = span(inVerse, "beside", "beta");
  expect(referencePayload(state(inVerse, a, b), "bookshelf", "x", journal)).toMatchObject({ passage: "> ::: verse 2\n> beta\n> :::" });
});

test("a leaf stands in for a prose book's titled chapter; entryLink names the entry the same way", () => {
  const doc = parseMarkdown("# 3. The Dark Ages\n\n⟨61⟩ The Church had a difficulty.\n\n⟨62⟩ It went on.");
  const [a, b] = span(doc, "difficulty", "went");
  const out = referencePayload(state(doc, a, b), "bookshelf", "Williams, Charles/Witchcraft/3. The Dark Ages", journal);
  expect((out as { text: string }).text.split("\n")[0]).toMatch(/^\[Williams, \*Witchcraft\*, pp\. 61-62\]/);
  expect(entryLink("bookshelf", "Williams, Charles/Witchcraft/3. The Dark Ages", journal)).toBe("[Williams, *Witchcraft*, *3. The Dark Ages*](#bookshelf/Williams%2C%20Charles/Witchcraft/3.%20The%20Dark%20Ages)");
});

test("citationAnchorHTML: the label's italics as em, everything else escaped, the url escaped", () => {
  expect(citationAnchorHTML("#2026-09-07?h=a%20b", "*Gesta*, 7 September 2026")).toBe('<a href="#2026-09-07?h=a%20b"><em>Gesta</em>, 7 September 2026</a>');
  expect(citationAnchorHTML('#x"y', "a <b> & *c*")).toBe('<a href="#x&quot;y">a &lt;b&gt; &amp; <em>c</em></a>');
});


test("a passage in a grid's card cites as it does in a plain card: the grid is a container the trim looks through", () => {
  const plain = parseMarkdown("::: card-red\nsome words here\n:::");
  const grid = parseMarkdown("::: grid\n::: card-red\nsome words here\n:::\n\n::: card-pink\nother words\n:::\n:::");
  const [a, b] = span(plain, "words");
  const [c, d] = span(grid, "words");
  expect(passageMd(grid, c, d)).toBe(passageMd(plain, a, b));
  const [e, f] = span(grid, "words", "other");
  expect(passageMd(grid, e, f)).toBe("> ::: card-red\n> words here\n> :::\n> ::: card-pink\n> other\n> :::");
});

// The Faerie Queene: under the work's `roman book and canto`
// directive a citation names the stanza — I.i.2.1 — and a selection may run
// across stanzas, which a plain verse fence refuses.
const fqJournal = journalOf({
  "bookshelf/Spenser, Edmund/The Faerie Queene": "# The Faerie Queene\n\n::: reference\nroman book and canto\n:::",
  "bookshelf/Spenser, Edmund/The Faerie Queene/1.1": "# Book I, Canto i",
});
const FQ1 = "Spenser, Edmund/The Faerie Queene/1.1";
const canto = parseMarkdown("# Book I, Canto i\n\n::: note\nThe Patron of true Holinesse,\n:::\n\n" +
  "::: stanza 1\nA Gentle Knight was pricking on the plaine,\nYcladd in mightie armes and siluer shielde,\nWherein old dints of deepe wounds did remaine,\n:::\n\n" +
  "::: stanza 2\nBut on his brest a bloudie Crosse he bore,\nThe deare remembrance of his dying Lord,\nFor whose sweete sake that glorious badge he wore,\n:::\n\n" +
  "::: stanza 3\nVpon a great aduenture he was bond,\nThat greatest Gloriana to him gaue,\nThat greatest Glorious Queene of Faerie lond,\n:::");
test("stanzaRange: a line, lines, a whole stanza, whole stanzas, a run across them", () => {
  const r = (a: string, b?: string) => { const [x, y] = span(canto, a, b); return stanzaRange(canto, x, y); };
  expect(r("bloudie Crosse")).toBe("2.1");
  expect(r("bloudie Crosse", "dying Lord")).toBe("2.1-2");
  expect(r("But on his brest", "badge he wore,")).toBe("2");
  expect(r("A Gentle Knight", "badge he wore,")).toBe("1–2");
  expect(r("deepe wounds", "dying Lord")).toBe("1.3–2.2");
  expect(r("Patron")).toBe("");
});
test("referencePayload under the directive: I.i.2.1, a run across a stanza gap allowed and quoted whole", () => {
  const [a, b] = span(canto, "bloudie Crosse");
  const one = referencePayload(state(canto, a, b), "bookshelf", FQ1, fqJournal);
  expect("label" in one && one.label).toBe("Spenser, *The Faerie Queene*, I.i.2.1");
  const [c, d] = span(canto, "Wherein old dints", "dying Lord,");
  const run = referencePayload(state(canto, c, d), "bookshelf", FQ1, fqJournal);
  expect("label" in run && run.label).toBe("Spenser, *The Faerie Queene*, I.i.1.3–2.2");
  expect("passage" in run && run.passage).toBe("> Wherein old dints of deepe wounds did remaine,\n> \n> But on his brest a bloudie Crosse he bore,\n> The deare remembrance of his dying Lord,");
  const [e, f] = span(canto, "A Gentle Knight", "Faerie lond,");
  const all = referencePayload(state(canto, e, f), "bookshelf", FQ1, fqJournal);
  expect("label" in all && all.label).toBe("Spenser, *The Faerie Queene*, I.i.1–3");
});
test("without the directive stanzas still cite by stanza, the numbers as keyed, and a run across them is allowed", () => {
  const [a, b] = span(canto, "bloudie Crosse");
  const plain = referencePayload(state(canto, a, b), "bookshelf", "Somebody/A Work/1.1", journalOf({}));
  expect("label" in plain && plain.label).toBe("Somebody, *A Work*, 1.1.2.1");
  const [c, d] = span(canto, "deepe wounds", "dying Lord");
  const run = referencePayload(state(canto, c, d), "bookshelf", "Somebody/A Work/1.1", journalOf({}));
  expect("label" in run && run.label).toBe("Somebody, *A Work*, 1.1.1.3–2.2");
});
// Any work whose verse is in stanza fences cites by stanza: Hávamál, a root
// with no author, its stanzas paired with a translation.
const HAV = parseMarkdown("# Hávamál\n\n::: reference\nno author\n:::\n\n::: stanza 76\nDeyr fé | Cattle die,\ndeyja frændr | kinsmen die,\ndeyr sjálfr it sama | the self dies likewise;\nen orðstírr | but the renown\ndeyr aldregi | for the one who gets good fame\nhveim er sér góðan getr | dies never.\n:::\n\n::: stanza 77\nDeyr fé | Cattle die,\ndeyja frændr | kinsmen die,\ndeyr sjálfr it sama | the self dies likewise;\nek veit einn | I know one thing\nat aldri deyr | that never dies:\ndómr um dauðan hvern | the repute of each of the dead.\n:::");
const havJournal = journalOf({ "bookshelf/Hávamál": "# Hávamál\n\n::: reference\nno author\n:::" });
const havLabel = (needle: string, end?: string): string | false => {
  const [a, b] = span(HAV, needle, end);
  const p = referencePayload(state(HAV, a, b), "bookshelf", "Hávamál", havJournal);
  return "label" in p && p.label;
};
test("a work in stanza fences cites by stanza with no directive: Hávamál, 76.1-3; a whole stanza 76; a run across stanzas 76.4–77.4", () => {
  expect(havLabel("Deyr fé", "it sama")).toBe("*Hávamál*, 76.1-3");
  expect(havLabel("Deyr fé", "getr")).toBe("*Hávamál*, 76");
  expect(havLabel("orðstírr", "ek veit einn")).toBe("*Hávamál*, 76.4–77.4");
});
// Old English verse cites its half-lines: a work whose page says so, its
// lines two half-lines apart at a double space.
const BWF_PAGE = "# Beowulf\n\n::: reference\nno author\nOld English verse\n:::";
const BWF = parseMarkdown(BWF_PAGE + "\n\n::: verse 49\ngeafon on garsecg;  him wæs geomor sefa,\nmurnende mod.  Men ne cunnon\nsecgan to soðe,  selerædende,\nhæleð under heofenum,  hwa þæm hlæste onfeng.\n:::");
const oeLabel = (doc: Node, tag: string, page: Record<string, string>, needle: string, end?: string): string | false => {
  const [a, b] = span(doc, needle, end);
  const p = referencePayload(state(doc, a, b), "bookshelf", tag, journalOf(page));
  return "label" in p && p.label;
};
test("Old English verse cites a half-line as 50a or 50b, a run from a second half or to a first as 50b-52 or 49-50a, both halves as the line", () => {
  const page = { "bookshelf/Beowulf": BWF_PAGE };
  expect(oeLabel(BWF, "Beowulf", page, "Men ne cunnon", "onfeng")).toBe("*Beowulf*, 50b-52");
  expect(oeLabel(BWF, "Beowulf", page, "Men ne cunnon")).toBe("*Beowulf*, 50b");
  expect(oeLabel(BWF, "Beowulf", page, "murnende mod")).toBe("*Beowulf*, 50a");
  expect(oeLabel(BWF, "Beowulf", page, "murnende", "cunnon")).toBe("*Beowulf*, 50");
  expect(oeLabel(BWF, "Beowulf", page, "geafon", "murnende mod")).toBe("*Beowulf*, 49-50a");
  expect(oeLabel(BWF, "Beowulf", page, "ne cunnon", "to soðe")).toBe("*Beowulf*, 50b-51a");
  // a selection begun in the double space starts on the second half's first word
  const [a, b] = span(BWF, "  Men ne");
  const p = referencePayload(state(BWF, a, b), "bookshelf", "Beowulf", journalOf(page));
  expect("label" in p && p.label).toBe("*Beowulf*, 50b");
});
test("without the line on its page a work cites whole lines, double space or not", () => {
  expect(oeLabel(BWF, "Beowulf", { "bookshelf/Beowulf": "# Beowulf\n\n::: reference\nno author\n:::" }, "Men ne cunnon", "onfeng")).toBe("*Beowulf*, 50-52");
  // the words inside a longer line are not the directive
  expect(oeLabel(BWF, "Beowulf", { "bookshelf/Beowulf": "# Beowulf\n\n::: reference\nno author\nnot Old English verse here\n:::" }, "Men ne cunnon")).toBe("*Beowulf*, 50");
});
test("Old English verse with its translation: the original's halves count, the translation's words cite the line; a line with no double space is whole", () => {
  const page = "# Deor\n\n::: reference\nno author\nOld English verse\n:::";
  const deor = parseMarkdown(page + "\n\n::: verse\nWelund him be wurman  wræces cunnade, | Weland himself, by means of worms (swords?), experienced agony,\nanhydig eorl  earfoþa dreag, | the strong-minded noble endured troubles;\n* * * |\n:::");
  const j = { "bookshelf/Deor": page };
  expect(oeLabel(deor, "Deor", j, "wræces cunnade")).toBe("*Deor*, 1b");
  expect(oeLabel(deor, "Deor", j, "wræces", "anhydig eorl")).toBe("*Deor*, 1b-2a");
  expect(oeLabel(deor, "Deor", j, "experienced agony")).toBe("*Deor*, 1");
  expect(oeLabel(deor, "Deor", j, "* * *")).toBe("*Deor*, 3");
});
test("Old English verse with its translation quotes the original from the half the citation names, the translation whole", () => {
  const page = "# Seafarer\n\n::: reference\nno author\nOld English verse\n:::";
  const sf = parseMarkdown(page + "\n\n::: verse 80\ndream mid dugeþum.  Dagas sind gewitene, | joy with the Hosts. The days are gone\nealle onmedlan  eorþan rices; | of all the glory of the kingdoms of the earth;\nnearon nu cyningas  ne caseras | there are not now kings, nor Cæsars,\n:::");
  const j = journalOf({ "bookshelf/Seafarer": page });
  const run = referencePayload(state(sf, ...span(sf, "Dagas sind", "ealle onmedlan")), "bookshelf", "Seafarer", j);
  expect("label" in run && run.label).toBe("*Seafarer*, 80b-81a");
  expect("passage" in run && run.passage).toBe("> ::: verse 80\n> Dagas sind gewitene, | joy with the Hosts. The days are gone\n> ealle onmedlan | of all the glory of the kingdoms of the earth;\n> :::");
  const whole = referencePayload(state(sf, ...span(sf, "Dagas sind", "ne caseras")), "bookshelf", "Seafarer", j);
  expect("passage" in whole && whole.passage).toBe("> ::: verse 80\n> Dagas sind gewitene, | joy with the Hosts. The days are gone\n> ealle onmedlan  eorþan rices; | of all the glory of the kingdoms of the earth;\n> nearon nu cyningas  ne caseras | there are not now kings, nor Cæsars,\n> :::");
  // without the line on its page a paired row is quoted whole
  const plain = referencePayload(state(sf, ...span(sf, "Dagas sind", "ealle onmedlan")), "bookshelf", "Seafarer", journalOf({ "bookshelf/Seafarer": "# Seafarer" }));
  expect("passage" in plain && plain.passage).toMatch(/^> ::: verse 80\n> dream mid dugeþum\.  Dagas/);
});
test("Old English verse said on a work's page reaches the entries below it; the range keeps its elision, 1162b-68a", () => {
  const work = "# Elene\n\n::: reference\nOld English verse\n:::";
  const doc = parseMarkdown("::: verse 1162\na b  c d\ne\nf\ng\nh\ni\nj k  l m\n:::");
  const p = referencePayload(state(doc, ...span(doc, "c d", "j k")), "bookshelf", "Cynewulf/Elene/Fitt 1", journalOf({ "bookshelf/Cynewulf": "# Cynewulf", "bookshelf/Cynewulf/Elene": work }));
  expect("label" in p && p.label).toBe("Cynewulf, *Elene*, 1.1162b-68a");
  expect(referenceRange(doc, ...span(doc, "c d", "j k"), true)).toBe("1162b-68a");
  expect(referenceRange(doc, ...span(doc, "c d", "j k"))).toBe("1162-68");
});

test("under the directive a run reaching a plain verse block is still refused", () => {
  const mixed = parseMarkdown("::: stanza 1\na\nb\n:::\n\n::: verse\nc\n:::");
  const [a, b] = span(mixed, "b", "c");
  expect(referencePayload(state(mixed, a, b), "bookshelf", FQ1, fqJournal)).toEqual({ refused: "two-blocks" });
});

test("the quoted passage sheds its page markers and keeps its words", () => {
  const doc = parseMarkdown("::: prose\n⟨30⟩Beatrice ⟨31⟩was, in her degree ⟨32⟩ and on.\n:::");
  expect(passageMd(doc, 3, doc.content.size - 3)).not.toMatch(/⟨/);
  expect(passageMd(doc, 3, doc.content.size - 3)).toContain("Beatrice was, in her degree and on");
});
test("a page-turn row in a quoted run is left out, its marker with it, no blank line in its place", () => {
  const doc = parseMarkdown("::: verse\nline one\n⟨32⟩\nline two\n:::");
  const [a, b] = span(doc, "line one", "line two");
  expect(passageMd(doc, a, b)).toBe("> ::: verse\n> line one\n> line two\n> :::");
});
test("a page-turn row is left out of a quoted run that starts in prose too", () => {
  const doc = parseMarkdown("a paragraph\n\n::: verse\nline one\n⟨32⟩\nline two\n:::");
  const [a, b] = span(doc, "a paragraph", "line two");
  expect(passageMd(doc, a, b)).toContain("> line one\n> line two");
});

test("a passage starting on the line after a skipped line number is numbered from that line", () => {
  const doc = parseMarkdown("::: verse 545\nqua\n⟨skipped line number⟩\nvix\nnext\n:::");
  const [a, b] = span(doc, "vix", "next");
  expect(referenceRange(doc, a, b)).toBe("547-48");
  expect(passageMd(doc, a, b)).toBe("> ::: verse 547\n> vix\n> next\n> :::");
});

test("a stanza's quotation leaves a skipped line number out rather than drawing a gap that was never there", () => {
  const doc = parseMarkdown("::: stanza 2\na\nb\n⟨skipped line number⟩\nc\n:::");
  const [a, b] = span(doc, "b", "c");
  expect(passageMd(doc, a, b)).not.toContain("> \n");
});
// A block numbered on both sides: Golding's lines beside the Latin.
const GOLDING_TAG = "Ovid/Metamorphoses (with Golding’s translation)/Book 7";
const goldingJournal = journalOf({ "bookshelf/Ovid/Metamorphoses (with Golding’s translation)": "# *Metamorphoses* (with Golding’s translation)", ["bookshelf/" + GOLDING_TAG]: "# Book 7" });
const GOLDING = parseMarkdown("# Book 7\n\n::: verse 196 263\nquaeque magos, Tellus, | Ye Charmes and Witchcrafts,\n | Of mightie working furnishest\nauraeque et venti | Ye Ayres and windes:\ndique omnes nemorum | Of standing Lakes,\nquorum ope, cum volui | Through helpe of whom\n | I have compelled streames\n:::");
const golding = (needle: string, end?: string, all = false) => {
  const [a, b] = span(GOLDING, needle, end);
  return referencePayload(state(GOLDING, a, b), "bookshelf", GOLDING_TAG, goldingJournal, all);
};
test("a passage from a block numbered on both sides quotes the translation alone, numbered from its first line, and cites both columns' lines", () => {
  const p = golding("Ye Ayres", "I have compelled streames");
  expect("label" in p && p.label).toBe("Ovid, *Metamorphoses*, 7.197-99 (Golding, 7.265-68)");
  expect("passage" in p && p.passage).toBe("> ::: verse 265\n> Ye Ayres and windes:\n> Of standing Lakes,\n> Through helpe of whom\n> I have compelled streames\n> :::");
  const part = golding("Of mightie working");
  expect("label" in part && part.label).toBe("Ovid, *Metamorphoses*, 7 (Golding, 7.264)");
  expect("passage" in part && part.passage).toBe("> ::: verse 264\n> Of mightie working\n> :::");
  const latinOnly = parseMarkdown("# Book 7\n\n::: verse 196 263\nquaeque magos\nauraeque | Ye Ayres\n:::");
  const [la, lb] = span(latinOnly, "quaeque magos");
  expect(referencePayload(state(latinOnly, la, lb), "bookshelf", GOLDING_TAG, goldingJournal)).toEqual({ refused: "no-translation" });
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
  expect(facingBlockOf(GOLDING, a, b)?.pos).toBe(GOLDING.child(0).nodeSize);
  const [c, d] = span(GOLDING, "Book 7", "Ye Ayres");
  expect(facingBlockOf(GOLDING, c, d)).toBeNull();
  const [e, f] = span(verse, "forbidden", "Brought death");
  expect(facingBlockOf(verse, e, f)).toBeNull();
  /* a block quoted inside an entry is that entry's passage, and a note in the block is no translation's */
  const nested = parseMarkdown("> ::: verse 197 265\n> auraeque | Ye Ayres\n> dique | Of standing\n> :::");
  const [g, h] = span(nested, "Ye Ayres", "Of standing");
  expect(facingBlockOf(nested, g, h)).toBeNull();
  const noted = parseMarkdown("::: verse 197 265\nauraeque | Ye Ayres\n::: note\n[1] An eclipse.\n:::\n:::");
  const [i, j] = span(noted, "An eclipse");
  expect(facingBlockOf(noted, i, j)).toBeNull();
  expect(referencePayload(state(noted, i, j), "bookshelf", GOLDING_TAG, goldingJournal)).not.toHaveProperty("refused");
});
test("Ref (all) is offered for the selection ⌃⌘R reads, its ends drawn in to whole words", () => {
  const [a] = span(GOLDING, "Ye Ayres"), [, b] = span(GOLDING, "I have compelled streames"), [, end7] = span(GOLDING, "Book 7");
  /* begun at the end of the heading, the selection is read from the block's first word */
  expect(facingBlockOf(GOLDING, end7, b)).toBeNull();
  expect(offersBoth(state(GOLDING, end7, b))).toBe(true);
  expect(offersBoth(state(GOLDING, a, b))).toBe(true);
  expect(offersBoth(EditorState.create({ doc: GOLDING }))).toBe(false);
});
test("the translation alone: every row the selection inks gives its line, cut only where the selection starts or ends inside it, so both buttons cite the same lines", () => {
  const p = golding("auraeque", "quorum ope");
  const all = golding("auraeque", "quorum ope", true);
  expect("label" in p && p.label).toBe("Ovid, *Metamorphoses*, 7.197-99 (Golding, 7.265-67)");
  expect("label" in all && all.label).toBe("Ovid, *Metamorphoses*, 7.197-99 (Golding, 7.265-67)");
  expect("passage" in p && p.passage).toBe("> ::: verse 265\n> Ye Ayres and windes:\n> Of standing Lakes,\n> Through helpe of whom\n> :::");
});
test("the translation alone keeps its verse paragraphs' gaps and its apparatus, and a line drawn wholly in italics stays a line", () => {
  const doc = parseMarkdown("# Book 7\n\n::: verse 196 263\nquaeque | Ye Charmes\n\nauraeque | *Ye Ayres*\n*Medea* | *Medea*\ndique | Of standing\n:::");
  const [a, b] = span(doc, "Ye Charmes", "Of standing");
  const p = referencePayload(state(doc, a, b), "bookshelf", GOLDING_TAG, goldingJournal);
  expect("passage" in p && p.passage).toBe("> ::: verse 263\n> Ye Charmes\n> \n> ⟨line⟩*Ye Ayres*\n> *Medea*\n> Of standing\n> :::");
  expect("label" in p && p.label).toBe("Ovid, *Metamorphoses*, 7.196-98 (Golding, 7.263-65)");
});
test("a passage running from one block numbered on both sides into the next is refused, though it starts on a row with nothing on the left", () => {
  const two = parseMarkdown("# Book 7\n\n::: verse 179 244\nTres | Before\n | Untill that Glaucus\n:::\n\n::: verse 180 246\nsidera | The starres\n:::");
  const [a, b] = span(two, "Untill", "The starres");
  expect(referencePayload(state(two, a, b), "bookshelf", GOLDING_TAG, goldingJournal)).toEqual({ refused: "two-blocks" });
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
const vnLabel = (doc: Node, ch: string, needle: string, end?: string, j = vnJournal): string | false => {
  const [a, b] = span(doc, needle, end);
  const p = referencePayload(state(doc, a, b), "bookshelf", "Dante/Vita Nuova/" + ch, j);
  return "label" in p && p.label;
};
test("a prosimetrum's sentence quotes that sentence and its translation alone", () => {
  const [a, b] = span(VN3, "quarta");
  const p = referencePayload(state(VN3, a, b), "bookshelf", "Dante/Vita Nuova/3", vnJournal);
  expect("passage" in p && p.passage).toBe("> ::: prose 9\n> E trovai che l'ora era la quarta. | I knew that it was the fourth hour.\n> :::");
});
test("a prosimetrum cites the prose by Barbi's paragraph, its sentences counted under it, and a poem by its lines: 3, prose, para 8; paras 8-9; para 13; verse 1-2", () => {
  expect(vnLabel(VN3, "3", "cominciai")).toBe("Dante, *Vita Nuova*, 3, prose, para 8");
  expect(vnLabel(VN3, "3", "quarta")).toBe("Dante, *Vita Nuova*, 3, prose, para 8");
  expect(vnLabel(VN3, "3", "cominciai", "quarta")).toBe("Dante, *Vita Nuova*, 3, prose, para 8");
  expect(vnLabel(VN3, "3", "fourth hour")).toBe("Dante, *Vita Nuova*, 3, prose, para 8");
  expect(vnLabel(VN3, "3", "apparuto")).toBe("Dante, *Vita Nuova*, 3, prose, para 9");
  expect(vnLabel(VN3, "3", "cominciai", "apparuto")).toBe("Dante, *Vita Nuova*, 3, prose, paras 8-9");
  expect(vnLabel(VN3, "3", "risposto")).toBe("Dante, *Vita Nuova*, 3, prose, para 13");
  expect(vnLabel(VN3, "3", "ciascun", "presente")).toBe("Dante, *Vita Nuova*, 3, verse 1-2");
  expect(vnLabel(VN3, "3", "sweet pain")).toBe("Dante, *Vita Nuova*, 3, verse 1");
});
test("a prosimetrum chapter with two poems names the poem: 8, verse 1.1-2, verse 2.2; its prose as ever", () => {
  expect(vnLabel(VN8, "8", "Piangete", "plorare")).toBe("Dante, *Vita Nuova*, 8, verse 1.1-2");
  expect(vnLabel(VN8, "8", "dolor madre")).toBe("Dante, *Vita Nuova*, 8, verse 2.2");
  expect(vnLabel(VN8, "8", "partire")).toBe("Dante, *Vita Nuova*, 8, prose, para 1");
});
test("without the directive the same chapter cites as every book does: 3.8, 3.1-2", () => {
  const plain = journalOf({ "bookshelf/Dante": "# Dante\n\n::: reference\nfrom the last title\n:::" });
  expect(vnLabel(VN3, "3", "cominciai", undefined, plain)).toBe("Dante, *Vita Nuova*, 3.8");
  expect(vnLabel(VN3, "3", "ciascun", "presente", plain)).toBe("Dante, *Vita Nuova*, 3.1-2");
});
