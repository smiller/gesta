import { test, expect } from "vitest";
import { hwaetStanzas, wholeLines, hwaetEntry } from "./hwaetTexts.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

const PAGE = `<div class="banner"><table><tr><td><h1>x</h1></td><td></td><td></td></tr></table></div>
<div class="main"><p><table width="100%"><tr><td width="10%"></td><td width="45%"></td><td width="45%"></td></tr><tr><td></td><td>Welund him be wurman <a name="line1.1"></a>[<a href="#note1.1">#</a>]</td><td>Weland himself, by means of worms (swords?),</td></tr><tr><td></td><td>wr&aelig;ces cunnade,</td><td>experienced agony,</td></tr><tr><td>2a</td><td> &thorn;&aelig;t heo  gearolice</td><td> she  had <i>in context</i></td></tr><tr><td></td><td></td><td></td></tr></table></p><p><table width="100%"><tr><td width="10%"></td><td width="45%"></td><td width="45%"></td></tr><tr><td></td><td>&THORN;&aelig;s ofereode,</td><td>That was overcome,</td></tr><tr><td></td><td>&thorn;isses swa m&aelig;g.</td><td>so may this be.</td></tr></table></p>
<p><a name="note1.1"><b>line 1a</b></a>: a note.</p></div>`;

test("the site's tables read as stanzas of half-lines: its width rows, note marks and spare spaces gone, its italics kept, an empty row a lost half-line", () => {
  expect(hwaetStanzas(PAGE)).toEqual([
    [
      { n: "", text: "Welund him be wurman", tr: "Weland himself, by means of worms (swords?)," },
      { n: "", text: "wræces cunnade,", tr: "experienced agony," },
      { n: "2a", text: "þæt heo gearolice", tr: "she had *in context*" },
      { n: "", text: "", tr: "" },
    ],
    [{ n: "", text: "Þæs ofereode,", tr: "That was overcome," }, { n: "", text: "þisses swa mæg.", tr: "so may this be." }],
  ]);
});

test("two half-lines a whole line, the text's two spaces apart, the translation's one; a line missing a half stands alone; the site's numbers where lines start", () => {
  const { stanzas, numbered, odd } = wholeLines(hwaetStanzas(PAGE));
  expect(stanzas).toEqual([
    ["Welund him be wurman  wræces cunnade, | Weland himself, by means of worms (swords?), experienced agony,", "þæt heo gearolice | she had *in context*"],
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
