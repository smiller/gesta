import { describe, it, expect } from "vitest";
import type { Node } from "prosemirror-model";
import { parseMarkdown } from "../model/parse.ts";
import { ask, bar, type Standing, type Answer } from "./goto.ts";
import horace from "../../fixtures/horace-odes-1.1.md?raw";
import williams from "../../fixtures/williams-witchcraft-3.md?raw";

const LINES = { byBookChapterAndParagraph: false, scripture: false };
const PARAGRAPHS = { ...LINES, byBookChapterAndParagraph: true };
const VERSES = { ...LINES, scripture: true };
const FRESH: Standing = { pos: null, asked: 0 };
/* the text of the row an ask lands on, or what it says instead */
function lands(doc: Node, typed: string, c = LINES, box: "line" | "page" = "line"): string {
  const a = ask(doc, c, box === "page" ? { page: typed } : { line: typed }, FRESH, "bar");
  return "pos" in a ? doc.nodeAt(a.pos)!.textContent : a.said.text;
}
/* what an ask says, landing or not */
function says(doc: Node, typed: string, c = LINES, box: "line" | "page" = "line"): string | null {
  return ask(doc, c, box === "page" ? { page: typed } : { line: typed }, FRESH, "bar").said?.text ?? null;
}
/* Enter pressed again and again on the same ask: what each press says and where it lands */
function presses(doc: Node, typed: string, times: number, c = LINES): { at: string; said: string | null }[] {
  const out: { at: string; said: string | null }[] = [];
  let standing: Standing = FRESH;
  for (let i = 0; i < times; i++) {
    const a: Answer = ask(doc, c, { line: typed }, standing, "bar");
    if (!("pos" in a)) throw new Error(a.said.text);
    out.push({ at: doc.nodeAt(a.pos)!.textContent, said: a.said?.text ?? null });
    standing = { pos: a.pos, asked: a.asked };
  }
  return out;
}
const kindOf = (doc: Node, typed: string, c = LINES, box: "line" | "page" = "line"): string | null => ask(doc, c, box === "page" ? { page: typed } : { line: typed }, FRESH, "bar").said?.kind ?? null;

const two = parseMarkdown("::: verse\na\nb\nc\nd\n:::\n\nprose between\n\n::: verse 2\nx\ny\n:::");
const mixed = parseMarkdown("::: prose\nSentence one. | Un.\nSentence two. | Deux.\n:::\n\n::: verse\nline one\nline two\nline three\n:::");

describe("the noun a work asks by", () => {
  it("names an omitted line and a page with no numbers in that noun, and a block as a block", () => {
    const skips = parseMarkdown("::: verse\na\n⟨skipped line number⟩\nc\n:::\n\n::: verse\nx\ny\nz\n:::");
    expect(says(skips, "2", VERSES)).toMatch(/^verse 2 is omitted .* block 1 of 2$/);
    expect(says(parseMarkdown("plain"), "2", VERSES)).toMatch(/numbered verses/);
  });
});

describe("askKind", () => {
  it("line for verse, page for a book of leaves, both, none; sentences count as lines", () => {
    expect(bar(parseMarkdown(horace), LINES).kind).toBe("line");
    expect(bar(parseMarkdown(williams), LINES).kind).toBe("page");
    expect(bar(parseMarkdown("::: prose\nOne. | Un.\n:::"), LINES).kind).toBe("line");
    expect(bar(parseMarkdown("::: verse\nx\n:::\n\n⟨3⟩ text"), LINES).kind).toBe("both");
    expect(bar(parseMarkdown("plain"), LINES).kind).toBe("none");
  });
});
describe("the bar's words", () => {
  it("the Line box's label and what is said where nothing can be asked follow the work's conventions; with no document the bar asks nothing", () => {
    expect([LINES, VERSES, PARAGRAPHS].map((c) => bar(null, c))).toEqual([
      { kind: "none", label: "Line", none: "no line or page numbers here", inSource: "Switch to the rendered view to go to a line or a page" },
      { kind: "none", label: "Verse", none: "no verse numbers here", inSource: "Switch to the rendered view to go to a verse" },
      { kind: "none", label: "Paragraph", none: "no paragraph numbers here", inSource: "Switch to the rendered view to go to a paragraph" },
    ]);
  });
});
describe("lineHits and the cycle", () => {
  it("a split line is one hit, on its first half; a stanza counts it once", () => {
    const split = parseMarkdown("::: verse 1562\nRelate by whom.\n**Messenger**\n⟨…⟩By Samson.\nThe sorrow\n:::");
    expect(presses(split, "1562", 2).map((p) => p.at)).toEqual(["Relate by whom.", "Relate by whom."]);
    expect(says(parseMarkdown("::: stanza 1\na\n⟨…⟩b\nc\n:::"), "1.9")).toBe("no line 9 in stanza 1 — it has 2 lines");
  });
  it("a line in two blocks is two hits; Enter again cycles and wraps; an edit between presses keeps the standing row", () => {
    expect(presses(two, "3", 3).map((p) => p.said)).toEqual(["line 3 — verse block 1 of 2", "line 3 — verse block 2 of 2", "line 3 — verse block 1 of 2"]);
    const [first, second] = [ask(two, LINES, { line: "3" }, FRESH, "bar"), ask(two, LINES, { line: "3" }, { pos: null, asked: 3 }, "bar")];
    if (!("pos" in first) || !("pos" in second)) throw new Error("no landing");
    /* a different number asked, or a standing row that is no hit, starts again at the first */
    expect(ask(two, LINES, { line: "3" }, { pos: first.pos, asked: 2 }, "bar")).toMatchObject({ pos: first.pos });
    expect(ask(two, LINES, { line: "3" }, { pos: 9999, asked: 3 }, "bar")).toMatchObject({ pos: first.pos });
    expect(second).toMatchObject({ pos: first.pos });
  });
  it("says where it landed only where the number is in several blocks, form-neutral in a prosimetrum", () => {
    expect(presses(two, "3", 2)[1].said).toBe("line 3 — verse block 2 of 2");
    expect(says(parseMarkdown(horace), "2")).toBeNull();
    expect(says(mixed, "2")).toBe("sentence 2 — block 1 of 2");
  });
  it("says nothing of the blocks where the page has several and the number is in one", () => {
    expect(lands(two, "1")).toBe("a");
    expect(says(two, "1")).toBeNull();
  });
});
describe("a line a block opens part-way along", () => {
  const split = parseMarkdown("::: dual-language\na | A\nb\n:::\n\n::: dual-language 2\n⟨…⟩the rest | R\nc\n:::");
  it("names one place, where the line begins", () => {
    expect(lands(split, "2")).toBe("b");
    expect(says(split, "2")).toBeNull();
  });
  it("is not a number repeated", () => {
    expect(says(split, "9")).toBe("no line 9, the last line is 3");
  });
  it("is found in the rest where the page has no line it finishes, a passage opening part-way along one", () => {
    const passage = parseMarkdown("::: dual-language 5\n⟨…⟩per quae | Through\nnext\n:::");
    expect(lands(passage, "5")).toBe("per quaeThrough");
  });
});
describe("a bracketed line", () => {
  const page = parseMarkdown("::: dual-language 370\na\nb\n⟨line [378]⟩c\n⟨line [379]⟩d\n:::\n\n::: dual-language 375\ne\nf\ng\nh\n:::");
  it("is asked with its brackets, and the bare number names the plain line", () => {
    expect(lands(page, " [378] ")).toBe("c");
    expect(lands(page, "378")).toBe("h");
  });
  it("is no number repeated, and a number the edition does not print is refused", () => {
    expect(says(page, "372")).toBe("no line 372");
    expect(says(page, "400")).toBe("no line 400, the last line is 378");
  });
});
describe("a lettered line", () => {
  const page = parseMarkdown("::: dual-language 156\na\nb | B\n⟨line 157a⟩c\nd\n:::\n\n::: dual-language 159\ne\n:::");
  it("is asked by its label, and its number still names the line before it", () => {
    expect(lands(page, "157a")).toBe("c");
    expect(lands(page, "157")).toBe("bB");
    expect(lands(page, "158")).toBe("d");
  });
  it("a letter the page lacks is refused in the page's words", () => {
    expect(says(page, "157b")).toBe("no line 157b");
    expect(says(page, "159a")).toBe("no line 159a, the last line is 159");
  });
  it("does not read as a number repeated", () => {
    expect(says(page, "900")).toMatch(/the last line/);
    expect(says(parseMarkdown("::: verse 157\na\n:::\n\n::: verse 200\n⟨line 157a⟩b\n:::"), "900")).toMatch(/the last line/);
  });
  it("a refusal names it as the gutter does", () => {
    expect(says(parseMarkdown("::: verse 200\nplanus\n⟨line 200a⟩x\n:::"), "9")).toBe("the lines here are 200–200a");
    expect(says(parseMarkdown("::: verse 158\n⟨line 157a⟩c\nd\n:::"), "157")).toBe("the lines here are 157a–158");
    expect(says(parseMarkdown("::: verse\na\n:::\n\n::: verse 200\nb\n⟨line 200a⟩c\n:::"), "900")).toBe("no line 900, the last line is 200a");
    expect(presses(parseMarkdown("::: verse 157\n⟨line 157a⟩half\n⟨…⟩rest\n:::"), "157a", 2).map((p) => p.at)).toEqual(["half", "half"]);
  });
  it("a box takes a label only on a page that has one, in either case", () => {
    expect(lands(page, " 157a ")).toBe("c");
    expect(lands(page, "157A")).toBe("c");
    expect(lands(page, "157")).toBe("bB");
    expect(says(parseMarkdown("::: verse\na\n:::"), "50b")).toBe("50b is not a line number");
  });
});
describe("the refusals", () => {
  it("on a page of several blocks, a number past the last names the last line, and one short of it only itself", () => {
    const on = parseMarkdown("::: verse\na\nb\n:::\n\n::: verse 3\nc\nd\n:::");
    expect(says(on, "695")).toBe("no line 695, the last line is 4");
    expect(says(parseMarkdown("::: verse\na\nb\n:::\n\n::: verse 5\nc\n:::\n\n::: verse 3\nd\ne\n:::"), "9")).toBe("no line 9, the last line is 5");
    expect(says(on, "9", VERSES)).toBe("no verse 9, the last verse is 4");
    expect(says(parseMarkdown("::: prose\nOne. | Un.\n:::\n\n::: prose 2\nTwo. | Deux.\n:::"), "9")).toBe("no sentence 9, the last sentence is 2");
    expect(says(parseMarkdown("::: verse\na\n:::\n\n::: verse 5\nb\n:::"), "3")).toBe("no line 3");
  });
  it("keep the longest block where blocks repeat a number", () => {
    expect(says(two, "7")).toMatch(/the longest verse block/);
    expect(says(parseMarkdown("::: verse\na\nb\n:::\n\n::: verse 2\nc\nd\ne\n:::"), "7")).toBe("no line 7 — the longest verse block ends at 4");
    expect(says(parseMarkdown("::: verse\na\nb\nc\n:::\n\n::: verse\nd\n:::\n\n::: verse 5\ne\n:::"), "4")).toBe("no line 4");
  });
  it("name the range of one block, the longest of several, the number below the first, and nothing at all", () => {
    expect(says(two, "7")).toBe("no line 7 — the longest verse block has 4");
    expect(says(parseMarkdown("::: verse 2\nx\ny\n:::"), "9")).toBe("the lines here are 2–3");
    expect(says(parseMarkdown("::: verse\nonly\n:::"), "9")).toBe("the only line here is 1");
    expect(says(two, "0")).toBe("no line 0 here");
    expect(says(parseMarkdown("plain"), "3")).toBe("no numbered lines here");
    expect(says(parseMarkdown("::: verse 100\na\nb\n:::\n\n::: verse\nc\n:::"), "5")).toBe("no line 5");
  });
  it("a leaf is found case-blind and named back when missing", () => {
    const w = parseMarkdown(williams);
    expect(kindOf(w, "61", LINES, "page")).toBeNull();
    expect(ask(w, LINES, { page: "61" }, FRESH, "bar")).toHaveProperty("pos");
    expect(ask(parseMarkdown("⟨xiv⟩ text"), LINES, { page: "XIV" }, FRESH, "bar")).toHaveProperty("pos");
    expect(says(w, "999", LINES, "page")).toBe("no page 999 here");
    expect(says(parseMarkdown("plain"), "9", LINES, "page")).toBe("no page numbers here");
  });
  it("askCheck: empty, mixed numerals, and anything else named back as typed", () => {
    expect(says(two, "  ")).toBe("type a line number");
    expect(kindOf(two, "254")).not.toBe("typed");
    expect(kindOf(two, "xiv", LINES, "page")).not.toBe("typed");
    expect(says(two, "xiv")).toBe("xiv is not a line number");
    expect(says(two, "9z", LINES, "page")).toBe("9z is not a page number");
    expect(says(two, "x9", LINES, "page")).toBe("use roman or arabic characters, not both");
  });
});

// A page in stanzas (the Faerie Queene, Hávamál): the Line box
// takes `stanza.line` — `2` is stanza 2, `2.1` its first line. A stanza
// number names one place, so there is no cycle.
describe("stanza.line", () => {
  const canto = parseMarkdown("# Book I, Canto i\n\n::: note\nargument\n:::\n\n::: stanza 1\na1\na2\na3\n:::\n\n::: stanza 2\nb1\nb2\nb3\n:::\n\n::: stanza 3\nc1\n*c2 wholly italic*\nc3\n:::");
  it("a stanza lands on its first line; stanza.line on that line, an italic row counted", () => {
    expect(lands(canto, "2")).toBe("b1");
    expect(lands(canto, "2.3")).toBe("b3");
    expect(lands(canto, "3.2")).toBe("c2 wholly italic");
    expect(lands(canto, "1.1")).toBe("a1");
  });
  it("a stanza that is not there, or a line past a stanza's end, is refused in words", () => {
    expect(says(canto, "4")).toBe("no stanza 4 here — the last is 3");
    expect(says(canto, "2.9")).toBe("no line 9 in stanza 2 — it has 3 lines");
    expect(says(canto, "0")).toBe("no stanza 0 here — the last is 3");
  });
  it("the ask is a stanza or stanza.line, named back as typed when it is neither", () => {
    expect(kindOf(canto, "2")).toBeNull();
    expect(kindOf(canto, " 2.1 ")).toBeNull();
    expect(says(canto, "")).toBe("type a stanza, or stanza.line");
    expect(says(canto, "I.i.2")).toBe("I.i.2 is not a stanza or stanza.line, like 2.1");
    expect(says(canto, "2.")).toBe("2. is not a stanza or stanza.line, like 2.1");
  });
});

describe("a page in stanzas: the Stanza and Line boxes", () => {
  const canto = parseMarkdown("# Book I, Canto i\n\n::: stanza 1\na1\na2\na3\n:::\n\n::: stanza 2\nb1\nb2\nb3\n:::\n\n::: stanza 3\nc1\nc2\nc3\n:::");
  const boxes = (stanza: string, line: string): string => { const a = ask(canto, LINES, { stanza, line }, FRESH, "bar"); return "pos" in a ? canto.nodeAt(a.pos)!.textContent : a.said.text; };
  it("the bar shows a Stanza box and a Line box", () => {
    expect(bar(canto, LINES).kind).toBe("stanza");
  });
  it("a stanza alone lands on its first line, a stanza and a line on that line; the stanza in arabic or roman", () => {
    expect(boxes("2", "")).toBe("b1");
    expect(boxes("2", "3")).toBe("b3");
    expect(boxes("ii", "3")).toBe("b3");
    expect(boxes(" III ", "")).toBe("c1");
  });
  it("a line with no stanza, a stanza that is not there and a line not in that stanza are each said", () => {
    expect(boxes("", "3")).toBe("type a stanza for line 3");
    expect(boxes("", "")).toBe("type a stanza number");
    expect(boxes("4", "")).toBe("no stanza 4 here — the last is 3");
    expect(boxes("2", "9")).toBe("no line 9 in stanza 2 — it has 3 lines");
  });
  it("each box takes its own kind of number, named back as typed when it is not one", () => {
    expect(boxes("5-az", "")).toBe("5-az is not a stanza number");
    expect(boxes("iiv", "1")).toBe("iiv is not a stanza number");
    expect(boxes("2", "2.1")).toBe("2.1 is not a line number");
    expect(boxes("2", "iii")).toBe("iii is not a line number");
    expect(ask(canto, LINES, { stanza: "5-az", line: "" }, FRESH, "bar").said?.kind).toBe("typed");
  });
});

// The stanza ask was once taken on every entry of the Faerie Queene, so a plain verse page there — the commendatory
// verses — could not be reached by line. The page decides, not the key.
describe("hasStanzas", () => {
  it("a page holding a top-level stanza asks by stanza; plain verse, a stanza only inside a note, or prose does not", () => {
    const byLine = (doc: Node): boolean => says(doc, "2.1") === "2.1 is not a line number";
    expect(byLine(parseMarkdown("::: stanza 1\na\n:::"))).toBe(false);
    expect(byLine(parseMarkdown("::: verse\na\nb\n:::"))).toBe(true);
    expect(byLine(parseMarkdown("::: note\n::: stanza 43\na\n:::\n:::"))).toBe(true);
    expect(byLine(parseMarkdown("plain"))).toBe(true);
  });
});

describe("a skipped line number", () => {
  it("lands where the line would be, on the line after the gap, and says it is omitted; a run of them all land there", () => {
    const d = parseMarkdown("::: verse 595\na\nb\n⟨skipped line number⟩\n⟨skipped line number⟩\nc\n:::\n\n::: verse 700\nx\n:::");
    for (const n of ["597", "598"]) {
      expect(lands(d, n)).toBe("c");
      expect(says(d, n)).toBe("line " + n + " is omitted in this edition");
    }
    expect(lands(d, "599")).toBe("c");
    expect(says(d, "599")).toBeNull();
  });
  it("one ending its block lands on the line before it, and alone on the page says so plainly", () => {
    const d = parseMarkdown("::: verse 10\na\n⟨skipped line number⟩\n:::");
    expect(lands(d, "11")).toBe("a");
    expect(says(d, "11")).toBe("line 11 is omitted in this edition");
  });
  it("says so where the landing came from a link, which says no other landing word", () => {
    const d = parseMarkdown("::: verse 10\na\n⟨skipped line number⟩\n:::");
    expect(ask(d, LINES, { line: "11" }, FRESH, "link").said?.text).toBe("line 11 is omitted in this edition");
    expect(ask(two, LINES, { line: "3" }, FRESH, "link").said).toBeNull();
  });
});

describe("a skipped line number in more than one block", () => {
  it("says which block, as every landing does where the number is in several", () => {
    const d = parseMarkdown("::: verse\na\n⟨skipped line number⟩\nb\n:::\n\n::: verse\nx\n⟨skipped line number⟩\ny\n:::");
    expect(presses(d, "2", 2)).toEqual([
      { at: "b", said: "line 2 is omitted in this edition — verse block 1 of 2" },
      { at: "y", said: "line 2 is omitted in this edition — verse block 2 of 2" },
    ]);
  });
});
describe("a page of blocks numbered on both sides", () => {
  it("goes by the right column's numbers, and names them in its refusal", () => {
    const d = parseMarkdown("::: verse 179 244\nTres | Before\n | So softly\nvivaque\n:::\n\n::: verse 182 246\nsidera | The starres\n:::");
    expect(lands(d, "245")).toBe("So softly");
    expect(lands(d, "246")).toBe("sideraThe starres");
    expect(kindOf(d, "180")).toBe("absent");
    expect(says(d, "300")).toBe("no line 300, the last line is 246");
  });
  it("asks a plain verse block on the same page by its own numbers", () => {
    const d = parseMarkdown("::: verse\nan epigraph\nits second line\n:::\n\n::: verse 179 244\nTres | Before\n | So softly\n:::");
    expect(lands(d, "2")).toBe("its second line");
    expect(lands(d, "245")).toBe("So softly");
    expect(kindOf(d, "180")).toBe("absent");
  });
});

describe("a work by book, chapter, and paragraph: the Line box asks for a paragraph", () => {
  const doc = parseMarkdown("# Book 2\n\n## Chapter 40\n\n::: prose 60\nFirst one. | E one.\nFirst two. | E two.\n::: note\n[1] A note.\n:::\n\nSecond one. | F one.\n:::\n\n## Chapter 41\n\n::: prose 61\nThird one. | G one.\n\nFourth one. | H one.\n:::");
  const at = (n: number): string => lands(doc, String(n), PARAGRAPHS);
  it("lands on the first sentence of the paragraph, the first place it stands where a chapter turns inside it", () => {
    expect(at(60)).toContain("First one.");
    expect(at(61)).toContain("Second one.");
    expect(at(62)).toContain("Fourth one.");
  });
  it("names the paragraphs there are", () => {
    expect(at(99)).toBe("no paragraph 99 — the paragraphs here are 60–62");
    expect(at(0)).toBe("no paragraph 0 — the paragraphs here are 60–62");
    expect(lands(parseMarkdown("# Book 2\n\nLoose."), "1", PARAGRAPHS)).toBe("no numbered paragraphs here");
  });
});

describe("the words of a box that asks for a paragraph", () => {
  it("say paragraph where they would say line, and page where they say page", () => {
    expect(says(two, "", PARAGRAPHS)).toBe("type a paragraph number");
    expect(says(two, "61x", PARAGRAPHS)).toBe("61x is not a paragraph number");
    expect(says(two, "", PARAGRAPHS, "page")).toBe("type a page number");
    expect(kindOf(two, "61", PARAGRAPHS)).not.toBe("typed");
    expect(says(two, "")).toBe("type a line number");
  });
});

describe("the words of a box that asks for a verse", () => {
  const prose = parseMarkdown("# Genesis 1\n\n::: prose numbered\nIn principio. | In the beginning.\nTerra autem. | And the earth.\n:::");
  const verse = parseMarkdown("# Genesis 1\n\n::: verse numbered\nIn the beginning.\nAnd the earth.\n:::");
  const two = parseMarkdown("# Psalm\n\n::: verse numbered\nOne.\n:::\n\n::: verse numbered\nTwo.\n:::");
  it("a refusal names verses, whichever block the chapter is set in", () => {
    for (const doc of [prose, verse]) expect(says(doc, "9", VERSES)).toMatch(/verses here/);
    expect(says(prose, "0", VERSES)).toMatch(/^no verse /);
  });
  it("on a page of several blocks the refusal, and the landing where the number is in several, say verse and block, not the form's own words", () => {
    expect(says(two, "9", VERSES)).toMatch(/^no verse 9 — the longest block /);
    expect(says(two, "1", VERSES)).toMatch(/^verse 1 — block 1 of 2$/);
  });
  it("a page with no noun given keeps its own words", () => {
    expect(says(prose, "9")).toMatch(/sentences here/);
    expect(says(verse, "9")).toMatch(/lines here/);
  });
});
