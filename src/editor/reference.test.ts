// The selection half of a reference over parsed fixtures: which rows a
// range covers, the line and leaf ranges, the payload, the passage shapes.
import { test, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import type { Node } from "prosemirror-model";
import { parseMarkdown } from "../model/parse.ts";
import { referenceRange, stanzaRange, folioRange, selectionLink, passageMd, spansTwoBlocks, coversProse, referencePayload, entryLink, citationAnchorHTML } from "./reference.ts";
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

test("a single-column passage quotes whole rows with the stanza gap, apparatus and prose left out of the count", () => {
  const [a, b] = span(verse, "forbidden", "Brought death");
  expect(passageMd(verse, a, b)).toBe("> Of that forbidden tree, whose mortal taste\n> \n> Brought death into the World, and all our woe,");
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
  [a, b] = span(stray, "first", "second");
  expect(passageMd(stray, a, b)).toBe("> first line\n> \n> second line");
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
  expect(passageMd(satires, a, b)).toBe("> defensore tuo, pervincam");
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
  expect(passageMd(behind, a, b)).toBe("> alpha\n> beta");
  const noted = parseMarkdown("::: verse\nalpha\n::: margin-note\nthe note\n:::\nbeta\n:::");
  [a, b] = span(noted, "alpha", "beta");
  expect(coversProse(noted, a, b)).toBe(false);
  expect(passageMd(noted, a, b)).toBe("> alpha\n> beta");
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
  expect(passageMd(verse, a, b)).toBe("> alpha\n> \n> beta");
  const loose = parseMarkdown("Intro.\n\n::: verse\nalpha\n\n::: margin-note\nthe note\n:::\n\nbeta\n:::");
  [a, b] = span(loose, "Intro", "beta");
  expect(passageMd(loose, a, b)).toBe("> Intro.\n> ::: verse\n> alpha\n> \n> beta\n> :::");
  /* two gaps the text itself holds stay two */
  const twice = parseMarkdown("::: verse\nalpha\n\n\nbeta\n:::");
  [a, b] = span(twice, "alpha", "beta");
  expect(passageMd(twice, a, b)).toBe("> alpha\n> \n> \n> beta");
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
    "> Of that forbidden tree, whose mortal taste\n> \n> Brought death into the World, and all our woe," });
  /* the parts the rich flavour is built from ride beside the text */
  expect(out).toMatchObject({ label: "Milton, *Paradise Lost*, 1.2-3", url: "#bookshelf/Milton%2C%20John/Paradise%20Lost/Book%201?h=forbidden%20tree%2C%20whose%20mortal%20taste%20Brought%20death", passage: "> Of that forbidden tree, whose mortal taste\n> \n> Brought death into the World, and all our woe," });
  expect(referencePayload(state(verse, a, a), "bookshelf", "x", journal)).toEqual({ refused: "select" });
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
  expect(referencePayload(state(inVerse, a, b), "bookshelf", "x", journal)).toMatchObject({ passage: "> beta" });
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
  const [c, d] = span(canto, "deepe wounds", "dying Lord");
  const run = referencePayload(state(canto, c, d), "bookshelf", FQ1, fqJournal);
  expect("label" in run && run.label).toBe("Spenser, *The Faerie Queene*, I.i.1.3–2.2");
  expect("passage" in run && run.passage).toBe("> Wherein old dints of deepe wounds did remaine,\n> \n> But on his brest a bloudie Crosse he bore,\n> The deare remembrance of his dying Lord,");
  const [e, f] = span(canto, "A Gentle Knight", "Faerie lond,");
  const all = referencePayload(state(canto, e, f), "bookshelf", FQ1, fqJournal);
  expect("label" in all && all.label).toBe("Spenser, *The Faerie Queene*, I.i.1–3");
});
test("without the directive stanzas cite by line and a run across them is refused as before", () => {
  const [a, b] = span(canto, "bloudie Crosse");
  const plain = referencePayload(state(canto, a, b), "bookshelf", "Somebody/A Work/1.1", journalOf({}));
  expect("label" in plain && plain.label).toBe("Somebody, *A Work*, 1.1.1");
  const [c, d] = span(canto, "deepe wounds", "dying Lord");
  expect(referencePayload(state(canto, c, d), "bookshelf", "Somebody/A Work/1.1", journalOf({}))).toEqual({ refused: "two-blocks" });
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
  expect(passageMd(doc, a, b)).toBe("> line one\n> line two");
});
