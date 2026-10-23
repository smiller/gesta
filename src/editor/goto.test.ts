import { describe, it, expect } from "vitest";
import { parseMarkdown } from "../model/parse.ts";
import { askKind, lineHits, lineRefusal, nextHit, landingWord, folioHit, folioRefusal, askCheck, stanzaAskCheck, stanzaHit, hasStanzas } from "./goto.ts";
import horace from "../../fixtures/horace-odes-1.1.md?raw";
import williams from "../../fixtures/williams-witchcraft-3.md?raw";

const two = parseMarkdown("::: verse\na\nb\nc\nd\n:::\n\nprose between\n\n::: verse 2\nx\ny\n:::");
const mixed = parseMarkdown("::: prose\nSentence one. | Un.\nSentence two. | Deux.\n:::\n\n::: verse\nline one\nline two\nline three\n:::");

describe("askKind", () => {
  it("line for verse, page for a book of leaves, both, none; sentences count as lines", () => {
    expect(askKind(parseMarkdown(horace))).toBe("line");
    expect(askKind(parseMarkdown(williams))).toBe("page");
    expect(askKind(parseMarkdown("::: prose\nOne. | Un.\n:::"))).toBe("line");
    expect(askKind(parseMarkdown("::: verse\nx\n:::\n\n⟨3⟩ text"))).toBe("both");
    expect(askKind(parseMarkdown("plain"))).toBe("none");
  });
});
describe("lineHits and the cycle", () => {
  it("a split line is one hit, on its first half; a stanza counts it once", () => {
    const split = parseMarkdown("::: verse 1562\nRelate by whom.\n**Messenger**\n⟨…⟩By Samson.\nThe sorrow\n:::");
    const { hits } = lineHits(split, 1562);
    expect(hits.map((h) => split.nodeAt(h.pos)!.textContent)).toEqual(["Relate by whom."]);
    expect(stanzaHit(parseMarkdown("::: stanza 1\na\n⟨…⟩b\nc\n:::"), "1.9")).toBe("stanza 1 has 2 lines");
  });
  it("a line in two blocks is two hits; Enter again cycles and wraps; an edit between presses keeps the standing row", () => {
    const { hits, blocks } = lineHits(two, 3);
    expect(blocks.length).toBe(2);
    expect(hits.map((h) => h.nth)).toEqual([1, 2]);
    const first = nextHit(hits, null, false);
    expect(first.nth).toBe(1);
    expect(nextHit(hits, first.pos, true).nth).toBe(2);
    expect(nextHit(hits, hits[1].pos, true).nth).toBe(1);
    expect(nextHit(hits, hits[1].pos, false).nth).toBe(1);
    expect(nextHit(hits, 9999, true).nth).toBe(1);
  });
  it("says where it landed only with several blocks, form-neutral in a prosimetrum", () => {
    const { hits, blocks } = lineHits(two, 3);
    expect(landingWord(hits[1], blocks, 3)).toBe("line 3 — verse block 2 of 2");
    expect(landingWord(lineHits(parseMarkdown(horace), 2).hits[0], lineHits(parseMarkdown(horace), 2).blocks, 2)).toBeNull();
    const m = lineHits(mixed, 2);
    expect(landingWord(m.hits[0], m.blocks, 2)).toBe("sentence 2 — block 1 of 2");
  });
});
describe("the refusals", () => {
  it("name the range of one block, the longest of several, the number below the first, and nothing at all", () => {
    expect(lineRefusal(lineHits(two, 7).blocks, 7)).toBe("no line 7 — the longest verse block has 4");
    expect(lineRefusal(lineHits(parseMarkdown("::: verse 2\nx\ny\n:::"), 9).blocks, 9)).toBe("the lines here are 2–3");
    expect(lineRefusal(lineHits(parseMarkdown("::: verse\nonly\n:::"), 9).blocks, 9)).toBe("the only line here is 1");
    expect(lineRefusal(lineHits(two, 0).blocks, 0)).toBe("no line 0 here");
    expect(lineRefusal([], 3)).toBe("no numbered lines here");
    expect(lineRefusal(lineHits(parseMarkdown("::: verse 100\na\nb\n:::\n\n::: verse\nc\n:::"), 5).blocks, 5)).toBe("no line 5 — the longest verse block ends at 101");
  });
  it("a leaf is found case-blind and named back when missing", () => {
    const w = parseMarkdown(williams);
    expect(folioHit(w, "61")).not.toBeNull();
    expect(folioHit(w, "999")).toBeNull();
    expect(folioHit(parseMarkdown("⟨xiv⟩ text"), "XIV")).not.toBeNull();
    expect(folioRefusal(w, "999")).toBe("no page 999 here");
    expect(folioRefusal(parseMarkdown("plain"), "9")).toBe("no page numbers here");
  });
  it("askCheck: empty, mixed numerals, and anything else named back as typed", () => {
    expect(askCheck("  ", "line")).toBe("type a line number");
    expect(askCheck("254", "line")).toBeNull();
    expect(askCheck("xiv", "page")).toBeNull();
    expect(askCheck("xiv", "line")).toBe("xiv is not a line number");
    expect(askCheck("9z", "page")).toBe("9z is not a page number");
    expect(askCheck("x9", "page")).toBe("use roman or arabic characters, not both");
  });
});

// A page in stanzas (the Faerie Queene, Hávamál): the Line box
// takes `stanza.line` — `2` is stanza 2, `2.1` its first line. A stanza
// number names one place, so there is no cycle.
describe("stanza.line", () => {
  const canto = parseMarkdown("# Book I, Canto i\n\n::: note\nargument\n:::\n\n::: stanza 1\na1\na2\na3\n:::\n\n::: stanza 2\nb1\nb2\nb3\n:::\n\n::: stanza 3\nc1\n*c2 wholly italic*\nc3\n:::");
  const text = (r: { pos: number } | string): string => typeof r === "string" ? r : canto.nodeAt(r.pos)!.textContent;
  it("a stanza lands on its first line; stanza.line on that line, an italic row counted", () => {
    expect(text(stanzaHit(canto, "2"))).toBe("b1");
    expect(text(stanzaHit(canto, "2.3"))).toBe("b3");
    expect(text(stanzaHit(canto, "3.2"))).toBe("c2 wholly italic");
    expect(text(stanzaHit(canto, "1.1"))).toBe("a1");
  });
  it("a stanza that is not there, or a line past a stanza's end, is refused in words", () => {
    expect(stanzaHit(canto, "4")).toBe("no stanza 4 here — the last is 3");
    expect(stanzaHit(canto, "2.9")).toBe("stanza 2 has 3 lines");
    expect(stanzaHit(canto, "0")).toBe("no stanza 0 here — the last is 3");
    expect(stanzaHit(parseMarkdown("::: verse\na\n:::"), "1")).toBe("no stanzas here");
  });
  it("the ask is a stanza or stanza.line, named back as typed when it is neither", () => {
    expect(stanzaAskCheck("2")).toBe(null);
    expect(stanzaAskCheck(" 2.1 ")).toBe(null);
    expect(stanzaAskCheck("")).toBe("type a stanza, or stanza.line");
    expect(stanzaAskCheck("I.i.2")).toBe("I.i.2 is not a stanza or stanza.line, like 2.1");
    expect(stanzaAskCheck("2.")).toBe("2. is not a stanza or stanza.line, like 2.1");
  });
});

// The stanza ask was once taken on every entry of the Faerie Queene, so a plain verse page there — the commendatory
// verses — could not be reached by line. The page decides, not the key.
describe("hasStanzas", () => {
  it("a page holding a top-level stanza asks by stanza; plain verse, a stanza only inside a note, or prose does not", () => {
    expect(hasStanzas(parseMarkdown("::: stanza 1\na\n:::"))).toBe(true);
    expect(hasStanzas(parseMarkdown("::: verse\na\nb\n:::"))).toBe(false);
    expect(hasStanzas(parseMarkdown("::: note\n::: stanza 43\na\n:::\n:::"))).toBe(false);
    expect(hasStanzas(parseMarkdown("plain"))).toBe(false);
  });
});

describe("a skipped line number", () => {
  it("lands where the line would be, on the line after the gap, and says it is omitted; a run of them all land there", () => {
    const d = parseMarkdown("::: verse 595\na\nb\n⟨skipped line number⟩\n⟨skipped line number⟩\nc\n:::\n\n::: verse 700\nx\n:::");
    for (const n of [597, 598]) {
      const { hits, blocks } = lineHits(d, n);
      expect(hits.map((h) => d.nodeAt(h.pos)!.textContent)).toEqual(["c"]);
      expect(landingWord(hits[0], blocks, n)).toBe("line " + n + " is omitted in this edition — verse block 1 of 2");
    }
    const { hits, blocks } = lineHits(d, 599);
    expect(hits.map((h) => d.nodeAt(h.pos)!.textContent)).toEqual(["c"]);
    expect(landingWord(hits[0], blocks, 599)).toBe("line 599 — verse block 1 of 2");
  });
  it("one ending its block lands on the line before it, and alone on the page says so plainly", () => {
    const d = parseMarkdown("::: verse 10\na\n⟨skipped line number⟩\n:::");
    const { hits, blocks } = lineHits(d, 11);
    expect(hits.map((h) => d.nodeAt(h.pos)!.textContent)).toEqual(["a"]);
    expect(landingWord(hits[0], blocks, 11)).toBe("line 11 is omitted in this edition");
  });
});

describe("a skipped line number in more than one block", () => {
  it("says which block, as every landing does where there are several", () => {
    const d = parseMarkdown("::: verse\na\n⟨skipped line number⟩\nb\n:::\n\n::: verse\nx\n⟨skipped line number⟩\ny\n:::");
    const { hits, blocks } = lineHits(d, 2);
    expect(hits.map((h) => d.nodeAt(h.pos)!.textContent)).toEqual(["b", "y"]);
    expect(landingWord(hits[1], blocks, 2)).toBe("line 2 is omitted in this edition — verse block 2 of 2");
  });
});
