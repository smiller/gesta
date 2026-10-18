import { test, expect } from "vitest";
import { wyattFitts, plainSpelling, beowulfEntries, finnsburhLines, finnsburhEntry } from "./beowulfWyatt.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

const PPOEM = `<noinclude><pagequality level="3" user="x" /></noinclude>{{c|{{x-larger|{{uc|Beowulf.}}<ref>Letters supplied…</ref>}}}}

{{lang block/s|ang|class=_saxon}}
{{ppoem|end=follow|
: Hwæt! wē Gār-Dena{{gap}}in gēar-dagum >>> {{sm|Fol. 129a.}}
þēod-cyninga{{gap}}þrym gefrūnon,
5 <<< hū ðā æþelingas{{gap}}ellen fremedon.<ref>5. MS. note.</ref>}}<noinclude><!-- -->
{{lang block/e}}
{{smallrefs}}</noinclude>`;
const BR = `<noinclude>{{rh|36|BEOWULF.|}}
{{block center/s}}</noinclude>fromum feoh-giftum{{gap}}on fæder *[wi]ne,<br>
{{pline|7|l}}þæt hine on ''y''lde{{cesura}}eft gewunigen{{pline|Fol 148b.|r}}<br>
<section end="§00" />
<section begin="§01" />{{block center/s}}
{{c|{{lang|ang|font=Junicode|text=I.}}}}
{{lang block/s|ang|class=_saxon}}
&#x2A;Ðā wæs on burgum{{ces}}Bēowulf Scyldinga, <br><noinclude>{{smallrefs}}</noinclude>`;

test("Wyatt's pages read as fitts of lines: notes, folios, line numbers, brackets and italics gone, the half-lines apart, a fitt's heading a break", () => {
  const { fitts, numbered } = wyattFitts([PPOEM, BR]);
  expect(fitts).toEqual([
    ["Hwæt! wē Gār-Dena  in gēar-dagum", "þēod-cyninga  þrym gefrūnon,", "hū ðā æþelingas  ellen fremedon.", "fromum feoh-giftum  on fæder wine,", "þæt hine on ylde  eft gewunigen"],
    ["Ðā wæs on burgum  Bēowulf Scyldinga,"],
  ]);
  // every printed line number is checked against the count
  expect(numbered).toEqual([{ n: 5, at: 3 }, { n: 7, at: 5 }]);
});

test("the spelling as he writes it: no length marks, a hyphen joined with the next part lower-cased", () => {
  expect(plainSpelling("Hwæt! wē Gār-Dena  in gēar-dagum")).toBe("Hwæt! we Gardena  in geardagum");
  expect(plainSpelling("Ǣghwæþres sceal  Ēast-Dena ȳða")).toBe("Æghwæþres sceal  Eastdena yða");
  expect(plainSpelling("ellen‐gǣst")).toBe("ellengæst");
});

test("one page under a heading that names no author, the poem one verse block with a gap between fitts, its text as stored", () => {
  const out = beowulfEntries([["Hwæt we Gardena  in geardagum", "þeodcyninga  þrym gefrunon,"], ["Ða wæs on burgum  Beowulf Scyldinga,"]], "Text: A. J. Wyatt.");
  expect(Object.keys(out)).toEqual(["bookshelf/Old English.md", "bookshelf/Old English/Beowulf.md"]);
  expect(out["bookshelf/Old English.md"]).toBe("# Old English\n\n::: reference\nno author\n:::\n\n- [Beowulf](#bookshelf/Old%20English/Beowulf)");
  const poem = out["bookshelf/Old English/Beowulf.md"];
  expect(poem).toBe("# Beowulf\n\n::: note\nText: A. J. Wyatt.\n:::\n\n::: verse\nHwæt we Gardena  in geardagum\nþeodcyninga  þrym gefrunon,\n\nÐa wæs on burgum  Beowulf Scyldinga,\n:::");
  expect(serializeMarkdown(parseMarkdown(poem))).toBe(poem);
});

const FINN = [`<noinclude><pagequality level="3" user="x" /></noinclude>{{c|{{larger|APPENDIX.}}

THE FIGHT AT FINNSBURG<ref>“Fragmenti poetici…” Hickes {{smaller|I}}.192.</ref>.

(See “Beowulf” ll. 1068 ff.)}}

{{block center/s}}
<!-- -->
{{lang|anf|font=Junicode|text=
*{{gap}}*{{gap}}*{{gap}}[hor]nas byrnað nǣfre?”<br>
Hlēoðrode þā {{gap}} heaðo-geong<ref>2. ‘hearo geong’ H.</ref> cyning:<br>}}<noinclude><!-- -->
{{block center/e}}
{{smallrefs}}</noinclude>`, `<noinclude><pagequality level="3" user="x" />{{rh||APPENDIX.|139}}
{{block center/s}}
<!-- --></noinclude>{{lang|ang|font=Junicode|text=
{{pline|3|l}}ōð [þæt] æt ðǣre gūðe {{gap}} Gārulf gecrang,<br>
oððe hwæþer ðǣra hyssa {{gap}}*{{gap}}*{{gap}}* }}
<!-- -->
{{block center/e}}<noinclude>{{smallrefs}}</noinclude>`];

test("the Finnsburh fragment's pages read as lines: its asterisks, the halves the fragment lost, kept apart from the words; brackets and notes gone", () => {
  const { lines, numbered } = finnsburhLines(FINN);
  expect(lines).toEqual(["* * *  hornas byrnað nǣfre?”", "Hlēoðrode þā  heaðo-geong cyning:", "ōð þæt æt ðǣre gūðe  Gārulf gecrang,", "oððe hwæþer ðǣra hyssa  * * *"]);
  expect(numbered).toEqual([{ n: 3, at: 3 }]);
});

test("one page that names no author, the fragment one verse block, its asterisks text, not emphasis, its text as stored", () => {
  const out = finnsburhEntry(["* * *  hornas byrnað næfre?”", "oððe hwæþer ðæra hyssa  * * *"], "Text: A. J. Wyatt.");
  expect(Object.keys(out)).toEqual(["bookshelf/Finnsburh.md"]);
  const md = out["bookshelf/Finnsburh.md"];
  expect(md).toBe("# The Fight at Finnsburh\n\n::: reference\nno author\n:::\n\n::: note\nText: A. J. Wyatt.\n:::\n\n::: verse\n* * *  hornas byrnað næfre?”\noððe hwæþer ðæra hyssa  * * *\n:::");
  expect(serializeMarkdown(parseMarkdown(md))).toBe(md);
  const doc = parseMarkdown(md);
  expect(doc.textContent).toContain("* * *  hornas");
  expect(doc.textContent).toContain("hyssa  * * *");
  let marked = 0;
  doc.descendants((n) => { if (n.isText && n.marks.length) marked++; });
  expect(marked).toBe(0);
});
