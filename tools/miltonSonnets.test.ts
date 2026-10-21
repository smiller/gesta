import { test, expect } from "vitest";
import { italianPoem, cowperItalian, curl, sonnetEntries } from "./miltonSonnets.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

// the transcription's markup verbatim: a poem's section runs across a page turn
const PAGES = [
  `<noinclude><pagequality level="4" user="x" />{{RigaIntestazione||(45)|}}</noinclude><poem>
For my relief, yet hadst no reason why,
</poem>


<section begin="3" />{{Ct|t=1|v=1|III.}}
''<poem>
Qual in colle aspro, al imbrunir di sera
     L’avezza giovinetta pastorella
     {{R|4}}Che mal si spande a disusata spera
</poem><section end="3" />''`,
  `<noinclude>{{RigaIntestazione||(46)|}}</noinclude>''<section begin="3" /><poem>
Fuor di sua natía alma primavera,
</poem><section end="3" />''


<section begin="canzone" />{{Ct|t=1|v=1|Canzone.}}
''<poem>
{{Capolettera|R}}idonsi donne e giovani amorosi
Dinne, se la tua speme sia mai vana,{{R|5}}
</poem><section end="canzone" />''`,
];

test("a poem's lines from its section across the pages: the indent, the line numbers, the italics and the drop capital gone, another poem's lines left", () => {
  expect(italianPoem(PAGES, "3")).toEqual(["Qual in colle aspro, al imbrunir di sera", "L’avezza giovinetta pastorella", "Che mal si spande a disusata spera", "Fuor di sua natía alma primavera,"]);
  expect(italianPoem(PAGES, "canzone")).toEqual(["Ridonsi donne e giovani amorosi", "Dinne, se la tua speme sia mai vana,"]);
});

const POEMATA = `2. Poems in Various Metres.

3. TRANSLATIONS OF THE ITALIAN POEMS


                        I

Fair Lady, whose harmonious name the Rheno
   Through all his grassy vale delights to hear,
   Such strains as might the senseless forest move, 10
   Ah then--turn each his eyes and ears away,

                        III
                      Canzone.

They mock my toil--the nymphs and am'rous swains--
"This is the language in which Love delights."      15

                        VI.1

Enamour'd, artless, young, on foreign ground,

1 It has ever been thought difficult for an author to speak
gracefully of himself.

Appendix: To Christina, Queen of Sweden.`;

test("Cowper's translations by their numeral: the margin's numbers, a heading's title and its note mark gone, the note itself left out, the marks printed ones", () => {
  const c = cowperItalian(POEMATA);
  expect([...c.keys()]).toEqual(["I", "III", "VI"]);
  expect(c.get("I")).toEqual(["Fair Lady, whose harmonious name the Rheno", "Through all his grassy vale delights to hear,", "Such strains as might the senseless forest move,", "Ah then—turn each his eyes and ears away,"]);
  expect(c.get("III")).toEqual(["They mock my toil—the nymphs and am’rous swains—", "“This is the language in which Love delights.”"]);
  expect(c.get("VI")).toEqual(["Enamour’d, artless, young, on foreign ground,"]);
  expect(curl("'Till my Aurora comes")).toBe("‘Till my Aurora comes");
});

test("a sonnet a page under Sonnets, its contents carrying the note; the Italian lines paired with their translation; a poem with no number a work beside them, as stored", () => {
  const e = sonnetEntries(
    [{ n: "2", title: "", lines: ["Donna leggiadra", "L’herbosa val"], translation: ["Fair Lady", "Through all"] }, { n: "19", title: "On His Blindness", lines: ["When I consider how my light is spent"] }],
    [{ n: "", title: "Canzone", lines: ["Ridonsi donne"], translation: ["They mock my toil"], note: "Text: 1645." }],
    "Text: x.",
  );
  expect(e).toEqual({
    "bookshelf/Milton, John/Sonnets.md": "# Sonnets\n\n::: note\nText: x.\n:::\n\n- [Sonnet 2](#bookshelf/Milton%2C%20John/Sonnets/2)\n- [Sonnet 19: On His Blindness](#bookshelf/Milton%2C%20John/Sonnets/19)",
    "bookshelf/Milton, John/Sonnets/2.md": "# Sonnet 2\n\n::: verse\nDonna leggiadra | Fair Lady\nL’herbosa val | Through all\n:::",
    "bookshelf/Milton, John/Sonnets/19.md": "# Sonnet 19: On His Blindness\n\n::: verse\nWhen I consider how my light is spent\n:::",
    "bookshelf/Milton, John/Canzone.md": "# Canzone\n\n::: note\nText: 1645.\n:::\n\n::: verse\nRidonsi donne | They mock my toil\n:::",
  });
  for (const md of Object.values(e)) expect(serializeMarkdown(parseMarkdown(md))).toBe(md);
  expect(() => sonnetEntries([{ n: "3", title: "", lines: ["a", "b"], translation: ["A"] }], [], "")).toThrow("2 lines, 1 translated");
});
