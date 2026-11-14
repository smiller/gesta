import { test, expect } from "vitest";
import type { Node } from "prosemirror-model";
import { parseMarkdown } from "../model/parse.ts";
import { passageAt, quotation } from "./passage.ts";

// The passage a selection makes, over parsed fixtures: the words and rows it
// takes, its quotation, and the block numbered on both sides it lies in.

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
/* the passage a selection makes, quoted whole, both columns, or the refusal */
function quote(doc: Node, a: number, b: number, how: { halves?: boolean; paragraphs?: boolean } = {}): string {
  const p = passageAt(doc, a, b);
  if ("refused" in p) return p.refused;
  const q = quotation(p, { ...how, all: true });
  return "refused" in q ? q.refused : q.text;
}
/* the words the passage a selection makes runs over */
function words(doc: Node, a: number, b: number): string {
  const p = passageAt(doc, a, b);
  return "refused" in p ? p.refused : doc.textBetween(p.from, p.to, "/");
}
const verse = parseMarkdown("# Book 1\n\n::: verse\n**SPEAKER**\nOf man's first disobedience, and the fruit\nOf that forbidden tree, whose mortal taste\n\nBrought death into the World, and all our woe,\nWith loss of Eden\n:::\n\nA closing paragraph.");

test("a single-column passage quotes whole rows as its own fence numbered from the first quoted line, the stanza gap kept, apparatus and prose left out of the count", () => {
  const [a, b] = span(verse, "Of that forbidden", "and all our woe,");
  expect(quote(verse, a, b)).toBe("> ::: verse 2\n> Of that forbidden tree, whose mortal taste\n> \n> Brought death into the World, and all our woe,\n> :::");
});

test("a passage quoted from a dual-language block is a dual-language fence numbered from its first line, each quoted row keeping its sentence", () => {
  const doc = parseMarkdown("::: dual-language 568\nEst nemus Haemoniae | There is a vale.\nsilva:\n⟨…⟩vocant Tempe; | Men call it Tempe.\n:::");
  const [a, b] = span(doc, "Est nemus", "silva:");
  expect(quote(doc, a, b)).toBe("> ::: dual-language 568\n> Est nemus Haemoniae | There is a vale.\n> silva:\n> :::");
});

const PISOS = parseMarkdown("# Ars Poetica\n\n::: dual-language\nHumano capiti cervicem pictor equinam | If a painter chose to join a human head to the neck of a horse, could you refrain from laughing?\nspectatum admissi risum teneatis, amici?\ncredite, Pisones, isti tabulae fore librum | Believe me, dear Pisos, quite like such pictures would be a book, so that neither head nor foot can be assigned to a single shape.\npersimilem, cuius, velut aegri somnia, vanae\nfingentur species, ut nec pes nec caput uni\nreddatur formae.\n⟨…⟩“pictoribus atque poetis | “Painters and poets,” you say, “have always had an equal right.”\nquidlibet audendi semper fuit aequa potestas.”\n:::");
test("a sentence's Latin runs on past a skipped line number to the line its English ends beside", () => {
  const doc = parseMarkdown("::: dual-language 542\nviribus absumptis | Now was her strength all gone, destroy this beauty.\nvicta labore fugae\n⟨skipped line number⟩\nqua nimium placui\nTellus, ait, hisce | Then Earth.\n:::");
  const [a, b] = span(doc, "strength all gone");
  expect(words(doc, a, b)).toContain("qua nimium placui");
});
test("sentenceRange: a selection's English widens over the Latin it stands beside; a selection in the Latin or outside a dual-language block stays as it is", () => {
  const [a, b] = span(PISOS, "quite like such pictures");
  const text = words(PISOS, a, b);
  for (const latin of ["credite, Pisones", "persimilem, cuius", "fingentur species", "reddatur formae."]) expect(text).toContain(latin);
  const [c, d] = span(PISOS, "persimilem", "nec caput uni");
  expect(words(PISOS, c, d)).toBe(PISOS.textBetween(c, d, "/"));
  const [e, f] = span(verse, "forbidden", "Brought death");
  expect(words(verse, e, f)).toBe(verse.textBetween(e, f, "/"));
});

test("wordEdges: a selection is widened to whole words, past the spaces and punctuation it starts on, an opening mark before its first word kept", () => {
  const doc = parseMarkdown("::: verse\nWhat beast was’t, then,\nDoes unmake you. I have given suck, and know\nHe said, “O soul, still in\n:::");
  expect(words(doc, ...span(doc, "ave given", "suc"))).toBe("have given suck");
  expect(words(doc, span(doc, "you")[1], span(doc, "and know")[1])).toBe("I have given suck, and know");
  expect(words(doc, span(doc, "O soul")[0], span(doc, "O soul")[1])).toBe("“O soul");
  expect(words(doc, span(doc, "then,")[1], span(doc, "Does unmake")[1])).toBe("Does unmake");
  expect(words(doc, span(doc, "ve given ")[0], span(doc, "ve given ")[1])).toBe("have given");
  /* nothing but punctuation and spaces selected: the selection as it was */
  expect(words(doc, span(doc, ". ")[0], span(doc, ". ")[1])).toBe(". ");
});
test("a passage begun at the end of a line ending in a letter starts on the next, never on that line's last word", () => {
  const doc = parseMarkdown("::: verse\nI would, while it was smiling\nHave pluck’d my nipple from his boneless gums\n:::");
  expect(words(doc, span(doc, "smiling")[1], span(doc, "boneless")[1])).toBe("Have pluck’d my nipple from his boneless");
});
test("a passage begun on an opening mark that ends its line starts on the next line; a mark before a word stays", () => {
  const doc = parseMarkdown("::: verse\nAnd then he cried, “\nO soul, still in\n:::");
  expect(words(doc, span(doc, "cried,")[1], span(doc, "O soul")[1])).toBe("O soul");
});
test("a paired block copies as its own fence inside the quotation, numbered from the first quoted line", () => {
  const doc = parseMarkdown("::: verse\nMaecenas atavis | Maecenas, descended\nedite regibus | of kings\no et praesidium | my bulwark\n:::");
  const [a, b] = span(doc, "regibus", "bulwark");
  expect(quote(doc, a, b)).toBe("> ::: verse 2\n> edite regibus | of kings\n> o et praesidium | my bulwark\n> :::");
  /* the quoted fence is the model's own shape: it parses back to a quotation holding the pair, the start kept, and a stanza gap survives the quote marks */
  const gapped = parseMarkdown("::: verse\na | b\nc | d\n\ne | f\n:::");
  const [c, d] = span(gapped, "c", "f");
  const md = quote(gapped, c, d);
  expect(md).toBe("> ::: verse 2\n> c | d\n> \n> e | f\n> :::");
  expect(parseMarkdown(md!).toString()).toBe("doc(blockquote(verse(pair(cell(\"c\"), cell(\"d\")), gap, pair(cell(\"e\"), cell(\"f\")))))");
});

test("a paired reference referenced again: the quoted block walked whole, the number from its own start", () => {
  /* a paired reference inside a quotation: a cut through one cell of the pair could not be written */
  const doc = parseMarkdown("[*Horace*](#commonplace/Horace?h=x):\n\n> ::: verse 13\n> alpha beta | one two\n> gamma delta | three four\n> :::");
  const [a, b] = span(doc, "alph", "alph");
  expect(quote(doc, a, b + 4)).toBe("> ::: verse 13\n> alpha beta | one two\n> :::");
  const [c, d] = span(doc, "gamma", "four");
  expect(quote(doc, c, d)).toBe("> ::: verse 14\n> gamma delta | three four\n> :::");
});
test("no cut through a pair, one quote level, a note kept, the block's own count", () => {
  const q = parseMarkdown("[*Horace*](#commonplace/Horace?h=x):\n\n> ::: verse 13\n> alpha beta | one two\n> gamma delta | three four\n> :::\n\nAfter the quote.");
  /* one end outside the quoted pair: whole rows, no throw, and the quotation holding only that end STAYS, as the source had it */
  let [a, b] = span(q, "four", "After");
  expect(quote(q, a, b)).toBe(">> ::: verse 14\n>> gamma delta | three four\n>> :::\n> After");   /* numbered from the row the cut opens on */
  [a, b] = span(q, "Horace", "alph");
  expect(quote(q, a, b)).toBe("> [*Horace*](#commonplace/Horace?h=x):\n>> ::: verse 13\n>> alpha beta | one two\n>> :::");
  /* a note inside a quoted verse block: its text, as before */
  const noted = parseMarkdown("> ::: verse 13\n> alpha beta | one two\n> ::: note\n> a footnote here\n> :::\n> gamma delta | three four\n> :::");
  [a, b] = span(noted, "footnote", "footnote");
  expect(quote(noted, a, b)).toBe("> ::: verse 14\n> ::: note\n> footnote\n> :::\n> :::");   /* the block's count at the note's row, as a direction alone is numbered */
  /* two quoted fences are two blocks, refused as at the top level */
  const two = parseMarkdown("> ::: verse 13\n> alpha | one\n> beta | two\n> :::\n>\n> ::: verse 40\n> gamma | three\n> :::");
  [a, b] = span(two, "beta", "three");
  expect(quote(two, a, b)).toBe("two-blocks");
  /* a speaker row alone keeps the block's own count */
  const spoken = parseMarkdown("> ::: verse 13\n> **Duke** | **Duke**\n> alpha | one\n> :::");
  [a, b] = span(spoken, "Duke", "Duke");
  expect(quote(spoken, a, b)).toBe("> ::: verse 13\n> **Duke** | **Duke**\n> :::");
  /* an ink-less pair row between plain lines does not make the passage paired */
  const stray = parseMarkdown("::: verse\nfirst line\n |\nsecond line\n:::");
  [a, b] = span(stray, "first", "second line");
  expect(quote(stray, a, b)).toBe("> ::: verse\n> first line\n> \n> second line\n> :::");
  /* a quoted paragraph referenced again: one level */
  const para = parseMarkdown("[*M*](#x):\n\n> The mind is its own place\n\n[*H*](#y):\n\n> ::: verse 13\n> a | b\n> :::");
  [a, b] = span(para, "mind", "own");
  expect(quote(para, a, b)).toBe("> mind is its own");
  /* a top-level pair's cell into the paragraph after it: whole rows, no throw */
  const top = parseMarkdown("::: verse\nalpha | one\n:::\n\nAfter.");
  [a, b] = span(top, "one", "After");
  expect(quote(top, a, b)).toBe("> ::: verse\n> alpha | one\n> :::\n> After");
});
test("the passage is a quotation node, serialized", () => {
  /* a stanza gap beside a note inside the fence is a row, kept through the cut arm */
  const gapped = parseMarkdown("Intro.\n\n::: verse\na | b\n\n::: note\nfoot\n:::\n\nc | d\n:::");
  let [a, b] = span(gapped, "Intro", "d");
  expect(quote(gapped, a, b)).toBe("> Intro.\n> ::: verse\n> a | b\n> \n> ::: note\n> foot\n> :::\n> \n> c | d\n> :::");
  /* a refused `:::` line is a text line, its paragraph breaks kept */
  const refused = parseMarkdown("First para.\n\n::: verse x\n\nLast para.");
  [a, b] = span(refused, "First", "Last");
  expect(quote(refused, a, b)).toBe("> First para.\n> \n> ::: verse x\n> \n> Last");
  /* a retained quotation's edge blank comes off inside the nested box */
  const edge = parseMarkdown("> The mind\n>\n\nAfter.");
  [a, b] = span(edge, "mind", "After");
  expect(quote(edge, a, b)).toBe(">> mind\n> After");
  const mirror = parseMarkdown("Before.\n\n>\n> The mind");
  [a, b] = span(mirror, "Before", "mind");
  expect(quote(mirror, a, b)).toBe("> Before.\n>> The mind");
  /* a top-level fence cut mid-way is numbered from the row the cut opens on */
  const top = parseMarkdown("::: verse 13\nalpha | one\ngamma | three\n:::\n\nAfter.");
  [a, b] = span(top, "three", "After");
  expect(quote(top, a, b)).toBe("> ::: verse 14\n> gamma | three\n> :::\n> After");
});
test("the number on the right block at every depth, the nested box trimmed, an edge gap off, a note's paragraph kept", () => {
  /* the count lands on the block the cut opens in, not on the next block once an ink-less remainder is dropped */
  const two = parseMarkdown("::: verse 13\nalpha | one\n:::\n\n::: verse 40\nbeta | two\n:::\n\nAfter.");
  let [a, b] = span(two, "one", "After");
  expect(quote(two, a + 3, b)).toBe("> ::: verse 40\n> beta | two\n> :::\n> After");
  /* a verse inside a note inside a verse: each block its own count at its own depth */
  const nested = parseMarkdown("::: verse 13\nline one\n::: note\n::: verse 5\nqa | qb\nqc | qd\n:::\n:::\n:::\n\nAfter.");
  [a, b] = span(nested, "qd", "After");
  expect(quote(nested, a, b)).toBe("> ::: verse 14\n> ::: note\n> ::: verse 6\n> qc | qd\n> :::\n> :::\n> :::\n> After");
  /* an empty paragraph inside a retained quotation goes, as at the top */
  const empty = parseMarkdown("Intro.\n\n> ::: verse 13\n> a | b\n> :::\n>\n> ::: note\n> foot\n> :::");
  [a, b] = span(empty, "Intro", "foot");
  expect(quote(empty, a, b)).toBe("> Intro.\n>> ::: verse 13\n>> a | b\n>> :::\n>> ::: note\n>> foot\n>> :::");
  /* a gap row at a cut block's edge goes, as the row arm never quoted one */
  const gap = parseMarkdown("::: verse\na | b\n\nc | d\n:::\n\nAfter.");
  [a, b] = span(gap, "b", "After");
  expect(quote(gap, a + 1, b)).toBe("> ::: verse 2\n> c | d\n> :::\n> After");
  /* every edge break comes off, not one */
  const twice = parseMarkdown("Before.\n\n>\n>\n> The mind");
  [a, b] = span(twice, "Before", "mind");
  expect(quote(twice, a, b)).toBe("> Before.\n>> The mind");
  /* a note's own paragraph outside the nested block is prose the cut arm keeps; a note passed over inside one block still stays behind */
  const notePara = parseMarkdown("::: verse 13\nline one\n::: note\n::: verse 5\nqa | qb\nqc | qd\n:::\n\nfoot text\n:::\nline two\n:::");
  [a, b] = span(notePara, "qd", "foot");
  expect(quote(notePara, a, b)).toBe("> ::: verse 14\n> ::: note\n> ::: verse 6\n> qc | qd\n> :::\n> \n> foot\n> :::\n> :::");
  const behind = parseMarkdown("::: verse\nalpha\n::: note\nfoot\n:::\nbeta\n:::");
  [a, b] = span(behind, "alpha", "beta");
  expect(quote(behind, a, b)).toBe("> ::: verse\n> alpha\n> beta\n> :::");
  const noted = parseMarkdown("::: verse\nalpha\n::: margin-note\nthe note\n:::\nbeta\n:::");
  [a, b] = span(noted, "alpha", "beta");
  expect(quote(noted, a, b)).toBe("> ::: verse\n> alpha\n> beta\n> :::");
});
test("loose prose quotes the selection itself, paragraph breaks kept", () => {
  const doc = parseMarkdown("First paragraph here.\n\nSecond one follows.");
  const [a, b] = span(doc, "paragraph", "Second");
  expect(quote(doc, a, b)).toBe("> paragraph here.\n> \n> Second");
});

test("a margin-note is left out of a passage in loose prose too, between paragraphs or in a block it runs into", () => {
  const between = parseMarkdown("First paragraph here.\n\n::: margin-note\nthe note\n:::\n\nSecond one follows.");
  let [a, b] = span(between, "paragraph", "Second");
  expect(quote(between, a, b)).toBe("> paragraph here.\n> \n> Second");
  const into = parseMarkdown("Intro.\n\n::: verse\nalpha\n::: margin-note\nthe note\n:::\nbeta\n:::");
  [a, b] = span(into, "Intro", "beta");
  expect(quote(into, a, b)).toBe("> Intro.\n> ::: verse\n> alpha\n> beta\n> :::");
});

test("a margin-note left out between two stanza gaps leaves one gap, not two", () => {
  const verse = parseMarkdown("::: verse\nalpha\n\n::: margin-note\nthe note\n:::\n\nbeta\n:::");
  let [a, b] = span(verse, "alpha", "beta");
  expect(quote(verse, a, b)).toBe("> ::: verse\n> alpha\n> \n> beta\n> :::");
  const loose = parseMarkdown("Intro.\n\n::: verse\nalpha\n\n::: margin-note\nthe note\n:::\n\nbeta\n:::");
  [a, b] = span(loose, "Intro", "beta");
  expect(quote(loose, a, b)).toBe("> Intro.\n> ::: verse\n> alpha\n> \n> beta\n> :::");
  /* two gaps the text itself holds stay two */
  const twice = parseMarkdown("::: verse\nalpha\n\n\nbeta\n:::");
  [a, b] = span(twice, "alpha", "beta");
  expect(quote(twice, a, b)).toBe("> ::: verse\n> alpha\n> \n> \n> beta\n> :::");
});

test("a passage in a grid's card refers as it does in a plain card: the grid is a container the trim looks through", () => {
  const plain = parseMarkdown("::: card-red\nsome words here\n:::");
  const grid = parseMarkdown("::: grid\n::: card-red\nsome words here\n:::\n\n::: card-pink\nother words\n:::\n:::");
  const [a, b] = span(plain, "words");
  const [c, d] = span(grid, "words");
  expect(quote(grid, c, d)).toBe(quote(plain, a, b));
  const [e, f] = span(grid, "words", "other");
  expect(quote(grid, e, f)).toBe("> ::: card-red\n> words here\n> :::\n> ::: card-pink\n> other\n> :::");
});

test("the quoted passage sheds its page markers and keeps its words", () => {
  const doc = parseMarkdown("::: prose\n⟨30⟩Beatrice ⟨31⟩was, in her degree ⟨32⟩ and on.\n:::");
  expect(quote(doc, 3, doc.content.size - 3)).not.toMatch(/⟨/);
  expect(quote(doc, 3, doc.content.size - 3)).toContain("Beatrice was, in her degree and on");
});
test("a page-turn row in a quoted run is left out, its marker with it, no blank line in its place", () => {
  const doc = parseMarkdown("::: verse\nline one\n⟨32⟩\nline two\n:::");
  const [a, b] = span(doc, "line one", "line two");
  expect(quote(doc, a, b)).toBe("> ::: verse\n> line one\n> line two\n> :::");
});
test("a page-turn row is left out of a quoted run that starts in prose too", () => {
  const doc = parseMarkdown("a paragraph\n\n::: verse\nline one\n⟨32⟩\nline two\n:::");
  const [a, b] = span(doc, "a paragraph", "line two");
  expect(quote(doc, a, b)).toContain("> line one\n> line two");
});

test("a stanza's quotation leaves a skipped line number out rather than drawing a gap that was never there", () => {
  const doc = parseMarkdown("::: stanza 2\na\nb\n⟨skipped line number⟩\nc\n:::");
  const [a, b] = span(doc, "b", "c");
  expect(quote(doc, a, b)).not.toContain("> \n");
});
// A block numbered on both sides: Golding's lines beside the Latin.
/* Ref (all) is offered where the passage lies in a block numbered on both sides */
const offered = (doc: Node, a: number, b: number): boolean => { const p = passageAt(doc, a, b); return !("refused" in p) && !!p.facing; };
const GOLDING = parseMarkdown("# Book 7\n\n::: verse 196 263\nquaeque magos, Tellus, | Ye Charmes and Witchcrafts,\n | Of mightie working furnishest\nauraeque et venti | Ye Ayres and windes:\ndique omnes nemorum | Of standing Lakes,\nquorum ope, cum volui | Through helpe of whom\n | I have compelled streames\n:::");
test("Ref (all) is offered for the selection ⌃⌘R reads, its ends drawn in to whole words", () => {
  const [a] = span(GOLDING, "Ye Ayres"), [, b] = span(GOLDING, "I have compelled streames"), [, end7] = span(GOLDING, "Book 7");
  /* begun at the end of the heading, the selection is read from the block's first word */
  expect(offered(GOLDING, end7, b)).toBe(true);
  expect(offered(GOLDING, a, b)).toBe(true);
  expect(offered(GOLDING, a, a)).toBe(false);
});
test("Ref (all) is not offered where ⌃⌘R refuses: a selection inside a margin-note of a block numbered on both sides", () => {
  const doc = parseMarkdown("::: verse 197 265\nauraeque | Ye Ayres\n::: margin-note\nthe eclipse\n:::\ndique | Of standing\n:::");
  const [a, b] = span(doc, "the eclipse");
  expect(passageAt(doc, a, b)).toEqual({ refused: "margin-note" });
  expect(offered(doc, a, b)).toBe(false);
});

