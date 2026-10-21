import { test, expect } from "vitest";
import { thurberItems, misnumbered, maskPage } from "./miltonMasks.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";
import { lineUnits } from "../src/editor/numbering.ts";

/* Comus 476–490 as Thurber sets it */
const THURBER = [
  "      _Sec. Bro._ How charming is divine Philosophy!",
  "    Where no crude surfeit reigns.",
  "",
  "      _Eld. Bro._               List! list! I hear                   480",
  "    Some far-off hallo break the silent air.",
  "",
  "      _Eld. Bro._                     I'll hallo.",
  "    If he be friendly, he comes well: if not,",
  "      Defence is a good cause, and Heaven be for us!",
  "",
  "             The Attendant Spirit, habited like a shepherd.",
  "",
  "    That hallo I should know. What are you? speak.                   490",
];

test("Thurber's outline: a speaker's prefix written out, a run of spaces after it a split line's rest, a direction by its opening, a line at six spaces a paragraph, the margin's numbers kept", () => {
  const items = thurberItems(THURBER, ["The Attendant Spirit, habited"]);
  expect(items.map((i) => i.kind === "speaker" ? `**${i.name}**` : i.kind === "line" ? `${i.rest ? "⟨…⟩" : ""}${i.opens ? "¶" : ""}${i.text}${i.n ? " " + i.n : ""}` : `*${i.text}*`)).toEqual([
    "**Second Brother**", "How charming is divine Philosophy!", "Where no crude surfeit reigns.",
    "**Elder Brother**", "⟨…⟩List! list! I hear 480", "Some far-off hallo break the silent air.",
    "**Elder Brother**", "⟨…⟩I'll hallo.", "If he be friendly, he comes well: if not,", "¶Defence is a good cause, and Heaven be for us!",
    "*The Attendant Spirit, habited like a shepherd.*", "That hallo I should know. What are you? speak. 490",
  ]);
  /* a rest takes its half's number: the fixture's lines cut, its 490 falls at 484 */
  expect(misnumbered(items, 479)).toEqual(["490 counted 484: That hallo I should know. What are you? speak."]);
  expect(misnumbered(items, 478)[0]).toBe("480 counted 479: List! list! I hear");
  expect(() => thurberItems(["      _Chor._ Who comes?"], [])).toThrow("a speaker not known: Chor.");
});

test("a song's heading an italic row, its stanzas a gap apart, and its measure's indent no paragraph", () => {
  const items = thurberItems(["                               I. _Song._", "", "    Look, Nymphs and Shepherds, look!", "      This, this is she", "", "    Mark what radiant state she spreads,"], []);
  expect(items.map((i) => (i.kind === "line" ? (i.opens ? "¶" : "") + i.text : i.kind === "heading" ? `*${i.text}*` : "?"))).toEqual(["*I. Song*", "Look, Nymphs and Shepherds, look!", "This, this is she", "¶Mark what radiant state she spreads,"]);
});

test("the page: a speaker a bold row after a gap, a direction an italic row with a gap either side, a rest marked, counted as one line with its half", () => {
  const md = maskPage("Comus", ["The Persons"], thurberItems(THURBER, ["The Attendant Spirit, habited"]));
  expect(md).toBe("# Comus\n\n::: note\nThe Persons\n:::\n\n::: verse\n**Second Brother**\nHow charming is divine Philosophy!\nWhere no crude surfeit reigns.\n\n**Elder Brother**\n⟨…⟩List! list! I hear\nSome far-off hallo break the silent air.\n\n**Elder Brother**\n⟨…⟩I'll hallo.\nIf he be friendly, he comes well: if not,\n\nDefence is a good cause, and Heaven be for us!\n\n*The Attendant Spirit, habited like a shepherd.*\n\nThat hallo I should know. What are you? speak.\n:::");
  const doc = parseMarkdown(md);
  expect(serializeMarkdown(doc)).toBe(md);
  expect(lineUnits(doc, 0).filter((u) => u.line).map((u) => u.line)).toEqual([1, 2, 2, 3, 3, 4, 5, 6]);
});
