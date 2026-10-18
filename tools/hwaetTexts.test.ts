import { test, expect } from "vitest";
import { hwaetStanzas, hwaetNotes, wholeLines, hwaetEntry } from "./hwaetTexts.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

const PAGE = `<div class="banner"><table><tr><td><h1>x</h1></td><td></td><td></td></tr></table></div>
<div class="main"><p><table width="100%"><tr><td width="10%"></td><td width="45%"></td><td width="45%"></td></tr><tr><td></td><td>Welund him be wurman <a name="line1.1"></a>[<a href="#note1.1">#</a>]</td><td>Weland himself, by means of worms (swords?),</td></tr><tr><td></td><td>wr&aelig;ces cunnade,</td><td>experienced agony,</td></tr><tr><td>2a</td><td> &thorn;&aelig;t heo  gearolice</td><td> she  had <i>in context</i></td></tr><tr><td></td><td></td><td></td></tr></table></p><p><table width="100%"><tr><td width="10%"></td><td width="45%"></td><td width="45%"></td></tr><tr><td></td><td>&THORN;&aelig;s ofereode,</td><td>That was overcome,</td></tr><tr><td></td><td>&thorn;isses swa m&aelig;g.</td><td>so may this be.</td></tr></table></p>
<h3>Notes</h3><p><a name="note1.1"><b>line 1a</b></a>: Welund is  Wayland.</p><p>The Edda, <i>V&ouml;lundarkvi&eth;a</i>, tells more. [&nbsp;<a href="#line1.1">Back to text</a>&nbsp;]</p><p><a name="note2.2"><b>line 2b</b></a>: Is this <i>m&aelig;g</i>? [&nbsp;<a href="#line2.2">Back to text</a>&nbsp;]</p>

</div>`;

test("the site's tables read as stanzas of half-lines: its width rows, note marks and spare spaces gone, its italics kept, an empty row a lost half-line", () => {
  expect(hwaetStanzas(PAGE)).toEqual([
    [
      { n: "", text: "Welund him be wurman", tr: "Weland himself, by means of worms (swords?),", note: "1.1" },
      { n: "", text: "wræces cunnade,", tr: "experienced agony," },
      { n: "2a", text: "þæt heo gearolice", tr: "she had *in context*" },
      { n: "", text: "", tr: "" },
    ],
    [{ n: "", text: "Þæs ofereode,", tr: "That was overcome," }, { n: "", text: "þisses swa mæg.", tr: "so may this be." }],
  ]);
});

test("two half-lines a whole line, the text's two spaces apart, the translation's one; a line missing a half stands alone; the site's numbers where lines start", () => {
  const { stanzas, numbered, odd } = wholeLines(hwaetStanzas(PAGE), hwaetNotes(PAGE));
  expect(stanzas).toEqual([
    ["Welund him be wurman ¹  wræces cunnade, | Weland himself, by means of worms (swords?), experienced agony,", "þæt heo gearolice | she had *in context*", "::: note", "[1] Welund is Wayland.", "", "The Edda, *Völundarkviða*, tells more.", ":::"],
    ["Þæs ofereode,  þisses swa mæg. | That was overcome, so may this be."],
  ]);
  expect(numbered).toEqual([{ n: 2, at: 2 }]);
  expect(odd).toEqual([]);
  // a stanza of an odd count of rows is named, its last line standing alone
  expect(wholeLines([[{ n: "", text: "a", tr: "A" }]]).odd).toEqual([1]);
  // a number on a second half-line is out of step
  expect(wholeLines([[{ n: "", text: "a", tr: "A" }, { n: "1a", text: "b", tr: "B" }]]).numbered).toEqual([{ n: -1, at: 1 }]);
});

test("one page that names no author, the poem one verse block of pairs, a gap between stanzas, its text as stored", () => {
  const md = hwaetEntry("Deor", "Deor", [["Welund him be wurman  wræces cunnade, | Weland himself, experienced agony,"], ["Þæs ofereode,  þisses swa mæg. | That was overcome, so may this be."]], "Text: x.")["bookshelf/Deor.md"];
  expect(md).toBe("# Deor\n\n::: reference\nno author\n:::\n\n::: note\nText: x.\n:::\n\n::: verse\nWelund him be wurman  wræces cunnade, | Weland himself, experienced agony,\n\nÞæs ofereode,  þisses swa mæg. | That was overcome, so may this be.\n:::");
  expect(serializeMarkdown(parseMarkdown(md))).toBe(md);
});

test("the site's notes by their place, each paragraph kept, italics kept, its label and way back gone", () => {
  expect(hwaetNotes(PAGE)).toEqual({ "1.1": "Welund is Wayland.\n\nThe Edda, *Völundarkviða*, tells more.", "2.2": "Is this *mæg*?" });
});

test("a note's mark after its half-line in the text, numbered within its stanza, the notes after the stanza's last line inside the verse block", () => {
  const half = [[
    { n: "", text: "Welund him be wurman", tr: "Weland himself,", note: "1.1" },
    { n: "", text: "wræces cunnade,", tr: "experienced agony," },
    { n: "", text: "Þæs ofereode,", tr: "That was overcome," },
    { n: "", text: "þisses swa mæg.", tr: "so may this be.", note: "2.2" },
  ], [{ n: "", text: "a", tr: "A" }, { n: "", text: "b", tr: "B" }]];
  const { stanzas } = wholeLines(half, { "1.1": "Welund is Wayland.\n\nThe Edda tells more.", "2.2": "Is this *mæg*?" });
  expect(stanzas).toEqual([
    ["Welund him be wurman ¹  wræces cunnade, | Weland himself, experienced agony,", "Þæs ofereode,  þisses swa mæg. ² | That was overcome, so may this be.", "::: note", "[1] Welund is Wayland.", "", "The Edda tells more.", "", "[2] Is this *mæg*?", ":::"],
    ["a  b | A B"],
  ]);
  const md = hwaetEntry("Deor", "Deor", stanzas, "Text: x.")["bookshelf/Deor.md"];
  expect(serializeMarkdown(parseMarkdown(md))).toBe(md);
  const doc = parseMarkdown(md);
  const kinds: string[] = [];
  doc.descendants((n) => { if (n.type.name === "pair" || n.type.name === "note" || n.type.name === "gap") kinds.push(n.type.name); return n.type.name !== "note"; });
  expect(kinds).toEqual(["note", "pair", "pair", "note", "gap", "pair"]);
  // a note named by a mark the notes do not hold is an error, not a silent drop
  expect(() => wholeLines(half, {})).toThrow(/1\.1/);
});
