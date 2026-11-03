import { test, expect } from "vitest";
import { parseMarkdown } from "../model/parse.ts";
import { schema } from "../model/schema.ts";
import { lineUnits, blocksOf, blockUnits, whollyIn, drawsInk, paintsLines, countAt, ownNumbers } from "./numbering.ts";

const doc = parseMarkdown;
const kinds = (md: string, interval = 0): string =>
  lineUnits(doc(md), interval).map((u) => (u.skip ? "skip" : u.kind) + (u.line ? ":" + u.line : "")).join(" ");

test("prose is unnumbered, a verse block's rows are its lines from 1", () => {
  const d = doc("intro\n\n::: verse\na\nb\nc\n:::\n\nafter");
  const u = lineUnits(d, 0);
  expect(u.map((x) => x.kind + ":" + x.line)).toEqual(["line:1", "line:2", "line:3"]);
  expect(u.map((x) => d.nodeAt(x.pos))).toEqual(u.map((x) => x.node));
  expect(d.nodeAt(u[0].blockPos)!.type.name).toBe("verse");
});

test("each block counts from 1, and a stanza gap emits nothing", () => {
  expect(kinds("::: verse\na\nb\n:::\n\n::: verse\nc\n\nd\n:::")).toBe("line:1 line:2 line:1 line:2");
});

test("apparatus inside the fence is a unit but not a line", () => {
  expect(kinds("::: verse\n*Enter Orsino*\n**DUKE**\nIf music be the food of love\n:::")).toBe("stage speaker line:1");
  expect(kinds("::: verse\nplain *with* emphasis\n:::")).toBe("line:1");
});

test("a wholly bold-italic row is a speaker", () => {
  expect(kinds("::: verse\n***KING JOHN***\nDeath.\n:::")).toBe("speaker line:1");
});

test("a ⟨line⟩ row is a line whatever it is set in", () => {
  expect(kinds("::: verse\n*Exit*\n⟨line⟩*Flower o’ the broom,*\n⟨line⟩*Take away love, and our earth is a tomb!*\n**PIPPA**\n⟨line⟩**shouted**\n:::"))
    .toBe("stage line:1 line:2 speaker line:3");
  expect(kinds("::: verse\n⟨line⟩*a* | *b*\n:::")).toBe("line:1");
  /* a declared row drawing nothing is still no unit */
  expect(kinds("::: verse\n⟨line⟩\n:::")).toBe("");
});

test("a ⟨…⟩ row is the rest of the verse line above it, past the speakers between, and draws no number of its own", () => {
  const md = "::: verse 1561\nThe desolation of a hostile city.\n\n**Manoa**\nRelate by whom.\n\n**Messenger**\n⟨…⟩By Samson.\n\n**Manoa**\n⟨…⟩That still lessens\nThe sorrow, and converts it nigh to joy.\n:::";
  expect(kinds(md)).toBe("line:1561 speaker line:1562 speaker line:1562 speaker line:1562 line:1563");
  const u = lineUnits(doc(md), 1);
  expect(u.filter((x) => x.shown).map((x) => x.line)).toEqual([1561, 1562, 1563]);
  /* wholly italic, it is still the line's rest, never a direction */
  expect(kinds("::: verse\nWhat, Curio?\n⟨…⟩*The hart.*\n:::")).toBe("line:1 line:1");
  /* with no line above it in the block it begins one */
  expect(kinds("::: verse\n**Messenger**\n⟨…⟩By Samson.\nnext\n:::")).toBe("speaker line:1 line:2");
});

test("a passage quoted from the rest of a split line is numbered from the line it finishes", () => {
  const d = doc("::: verse 1562\nRelate by whom.\n**Messenger**\n⟨…⟩By Samson.\nThe sorrow\n:::");
  const block = d.firstChild!, rows = lineUnits(d, 0);
  expect(countAt(block, 0, rows[2].pos)).toBe(1562);
  expect(countAt(block, 0, rows[3].pos)).toBe(1563);
  /* from the speaker row or the gap before a rest, the same line */
  expect(countAt(block, 0, rows[1].pos)).toBe(1562);
  const gapped = doc("::: verse 1562\nRelate by whom.\n\n**Messenger**\n⟨…⟩By Samson.\n:::").firstChild!;
  expect(countAt(gapped, 0, 1 + gapped.child(0).nodeSize)).toBe(1562);
  expect(rows.map((u) => u.rest)).toEqual([false, false, true, false]);
});

// a stanza has no apparatus: a row set wholly in italics is an
// inscription or a song in the Faerie Queene, never a stage direction, and
// nine such rows in Books I–VI must each keep their line number
test("every inked row of a stanza is a line, whatever it is set in", () => {
  expect(kinds("::: stanza 55\nAnd sent to her his Nymphe to haue in charge,\n*Sad verse, giue death to him that death does giue,*\n**bold**\nlast\n:::"))
    .toBe("line:1 line:2 line:3 line:4");
  expect(kinds("::: stanza 1\na\n::: note\nfoot\n:::\nb\n:::")).toBe("line:1 line:2");
  /* a plain verse fence keeps its apparatus */
  expect(kinds("::: verse\n*Exit*\na\n:::")).toBe("stage line:1");
});

test("a paired row is one unit whichever column; a note row takes no number", () => {
  expect(kinds("::: verse\na | b\n::: note\nfoot\n:::\nc | d\n:::")).toBe("line:1 line:2");
});

test("a margin-note row takes no number, in verse, a stanza or prose", () => {
  expect(kinds("::: verse\na\n::: margin-note\nthe note\n:::\nb\n:::")).toBe("line:1 line:2");
  expect(kinds("::: stanza 1\na\n::: margin-note\nthe note\n:::\nb\n:::")).toBe("line:1 line:2");
  expect(kinds("::: prose\na | b\n::: margin-note\nthe note\n:::\nc | d\n:::")).toBe("sentence:1 sentence:2");
});

test("a prose block numbers its PAIRED rows as sentences, full-width rows not at all", () => {
  expect(kinds("::: prose\nHeading\nfirst | its translation\nsecond | second's\n:::")).toBe("sentence:1 sentence:2");
  expect(kinds("::: prose\n*all italic* | *tout en italique*\n:::")).toBe("sentence:1");
});

test("a block starting at a number counts its rows from it, by position", () => {
  expect(kinds("::: verse 2\na\nb\n:::\n\n::: verse\nc\n:::")).toBe("line:2 line:3 line:1");
  expect(kinds("::: verse 3\n**DUKE**\na\n\n*Exit*\n::: note\nn\n:::\nb\n:::")).toBe("speaker line:3 stage line:4");
  expect(kinds("::: prose 4\nHeading\na | b\nc | d\n:::")).toBe("sentence:4 sentence:5");
  expect(lineUnits(doc("::: verse 2\na\nb\nc\nd\ne\n:::"), 5).map((x) => x.shown)).toEqual([false, false, false, true, false]);
});

test("`shown` follows the interval for lines only", () => {
  const u = lineUnits(doc("::: verse\na\nb\nc\nd\n:::\n\n::: prose\ns | t\nu | v\n:::"), 2);
  expect(u.map((x) => x.shown)).toEqual([false, true, false, true, false, false]);
  expect(lineUnits(doc("::: verse\na\nb\n:::"), 0).map((x) => x.shown)).toEqual([false, false]);
});

test("only a top-level block is walked", () => {
  expect(kinds("::: note\n::: verse\na\n:::\n:::")).toBe("");
  expect(kinds("> ::: verse\n> a\n> :::")).toBe("");
  expect(kinds("::: card-red\n::: verse\na\n:::\n:::")).toBe("");
});

test("blocksOf: lines grouped by block, a block registering on its first NUMBERED line", () => {
  const groups = blocksOf(lineUnits(doc("::: verse\n*Exeunt*\n:::\n\n::: verse\na\nb\n:::\n\n::: verse\nc\n:::"), 0));
  expect(groups.map((g) => g.map((u) => u.line))).toEqual([[1, 2], [1]]);
  expect(blocksOf(lineUnits(doc("::: verse 2\na\n:::\n\n::: verse\nb\n:::"), 0)).map((b) => b[0].line)).toEqual([2, 1]);
});

test("whollyIn and drawsInk", () => {
  const row = (md: string) => doc("::: verse\n" + md + "\n:::").firstChild!.firstChild!;
  const em = schema.marks.em, strong = schema.marks.strong;
  expect(whollyIn(row("*Exeunt*"), em)).toBe(true);
  expect(whollyIn(row("*Exeunt* all"), em)).toBe(false);
  expect(whollyIn(row("*Exeunt* "), em)).toBe(true);
  expect(whollyIn(row("*![a](x.webp)*"), em)).toBe(true);
  expect(whollyIn(row("**A** | **B**"), strong)).toBe(true);
  expect(whollyIn(row("*a* | plain"), em)).toBe(false);
  expect(whollyIn(row("*a* |"), em)).toBe(true);
  expect(whollyIn(row("⟨8⟩*a*"), em)).toBe(true);
  expect(drawsInk(row("x"))).toBe(true);
  expect(drawsInk(row("![a](x.webp)"))).toBe(true);
  expect(drawsInk(row("⟨8⟩"))).toBe(false);
  expect(drawsInk(row(" |"))).toBe(false);
});

test("paintsLines: a top-level verse block, and nothing else", () => {
  expect(paintsLines(doc("::: verse\na\n:::"))).toBe(true);
  expect(paintsLines(doc("::: note\n::: verse\na\n:::\n:::"))).toBe(false);
  expect(paintsLines(doc("::: prose\na | b\n:::"))).toBe(false);
  expect(paintsLines(doc("text"))).toBe(false);
});

test("a skipped line number is counted and draws no line: the lines after it keep the edition's numbers", () => {
  expect(kinds("::: verse 545\na\n⟨skipped line number⟩\nb\n⟨skipped line number⟩\n⟨skipped line number⟩\nc\n:::", 5)).toBe("line:545 skip:546 line:547 skip:548 skip:549 line:550");
  const d = doc("::: verse 545\na\n⟨skipped line number⟩\nb\n:::");
  const u = blockUnits(d.firstChild!, 0, 0);
  expect(u.map((x) => [x.line, d.nodeAt(x.pos)!.type.name, x.shown])).toEqual([[545, "line", false], [546, "skip", false], [547, "line", false]]);
  expect(lineUnits(doc("::: verse 545\na\n⟨skipped line number⟩\n:::"), 1).map((x) => x.shown)).toEqual([true, false]);
});

test("a block numbered on both sides: a row with nothing on the left takes no left number, and the right column counts from the second number", () => {
  const md = "::: verse 179 244\nTres | Before\nefficerent | Three\n | So softly\nvivaque\n\n::: note\nn\n:::\nsidera | The starres\n:::";
  expect(kinds(md)).toBe("line:179 line:180 line:181 line:182");
  const right = lineUnits(doc(md), 5, "right");
  expect(right.map((u) => [u.line, u.shown, u.node.textContent])).toEqual([[244, false, "TresBefore"], [245, true, "efficerentThree"], [246, false, "So softly"], [247, false, "sideraThe starres"]]);
  expect(lineUnits(doc("::: verse 179\na | b\n:::"), 0, "right")).toEqual([]);
});

test("a plain verse block counts a row with nothing on the left, as before: a card's two poems side by side keep their count", () => {
  expect(kinds("::: verse\na | b\n | c\n:::")).toBe("line:1 line:2");
  const card = doc("::: card-light-blue\n::: verse\na | b\n | c\nd |\n:::\n:::");
  let pos = -1;
  card.descendants((n, p) => { if (n.type === schema.nodes.verse) pos = p; return pos < 0; });
  expect(blockUnits(card.nodeAt(pos)!, pos, 0).map((u) => u.line)).toEqual([1, 2, 3]);
});

test("a cut from a block numbered on both sides is numbered on both sides from the row it opens on", () => {
  const block = doc("::: verse 179 244\nTres | Before\n | So softly\nvivaque\nsidera | The starres\n:::").firstChild!;
  const rows: number[] = [];
  block.forEach((_r, off) => rows.push(1 + off));
  expect(rows.map((p) => [countAt(block, 0, p), countAt(block, 0, p, "right")])).toEqual([[179, 244], [180, 245], [180, 246], [181, 246]]);
});

test("the right column counts as the left does: a speaker and a direction take no number, the rest of a split line the number of the line it finishes", () => {
  const md = "::: verse 1 10\n**Medea** | **Medea**\nTres | Before\n*Exit* | *Exit*\n⟨…⟩rest | rest\nquattuor | four\n:::";
  expect(kinds(md)).toBe("speaker line:1 stage line:1 line:2");
  expect(lineUnits(doc(md), 0, "right").map((u) => [u.line, u.rest])).toEqual([[10, false], [10, true], [11, false]]);
});

test("a numbered block draws every number, whatever the interval, and its page paints the gutter; a plain prose block's never", () => {
  const numbered = doc("::: prose numbered\nA. | a.\nB. | b.\nC. | c.\n:::");
  expect(lineUnits(numbered, 0).map((u) => u.shown)).toEqual([true, true, true]);
  expect(lineUnits(numbered, 5).map((u) => u.shown)).toEqual([true, true, true]);
  expect(paintsLines(numbered)).toBe(true);
  const verse = doc("::: verse numbered\n*A Psalm of David.*\nThe LORD is my shepherd.\nHe maketh me to lie down.\n:::");
  expect(lineUnits(verse, 5).map((u) => u.kind + ":" + u.shown)).toEqual(["stage:false", "line:true", "line:true"]);
  const plain = doc("::: prose\nA. | a.\nB. | b.\n:::");
  expect(lineUnits(plain, 1).map((u) => u.shown)).toEqual([false, false]);
  expect(paintsLines(plain)).toBe(false);
});
test("a page whose every numbered block draws its own numbers needs no interval; one with a plain verse block does", () => {
  expect(ownNumbers(doc("::: verse numbered\na\nb\n:::"))).toBe(true);
  expect(ownNumbers(doc("::: prose numbered\nA. | a.\n:::"))).toBe(true);
  expect(ownNumbers(doc("::: verse numbered\na\n:::\n\n::: verse\nb\n:::"))).toBe(false);
  expect(ownNumbers(doc("::: verse\na\n:::"))).toBe(false);
});

test("a numbered block numbered on both sides draws every number in both columns, whatever the interval", () => {
  const facing = doc("::: verse 179 244 numbered\nauraeque et venti | Ye Ayres and Windes\ndique omnes nemorum | ye Elves of Hills\n:::");
  expect(lineUnits(facing, 0).map((u) => u.shown)).toEqual([true, true]);
  expect(lineUnits(facing, 0, "right").map((u) => u.line + ":" + u.shown)).toEqual(["244:true", "245:true"]);
});
