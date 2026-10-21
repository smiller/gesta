import { test, expect } from "vitest";
import { scanLines, editionLines, findStart, witnessPoem, cutPoem, readLine, readAgainst, unstressed, words, ligatures, knows, vocabulary } from "./harvardMilton.ts";

// the scans' own lines, verbatim: scan A curls its marks and garbles small
// capitals; scan B spaces its punctuation and reads small capitals as capitals
const SCAN_A = `SONNETS 79


No anger find in thee, but pity and ruth.

ON THE DETRACTION WHICH FOLLOWED UPON
MY WRITING CERTAIN TREATISES
(1645-6)

A Book was writ of late called Tetrachordon,
Stand spelling false, while one might walk to Mile-
End Green. Why, is it harder, sirs, than Gordon,
- Both them I serve, and of their train am I.
Rescued from Death by force, though pale and faint. 4

80`;

test("a scan's lines lose the page's furniture: the running head, the title and date, a page number, a speck at the edge, a line number", () => {
  expect(scanLines(SCAN_A)).toEqual([
    "No anger find in thee, but pity and ruth.",
    "A Book was writ of late called Tetrachordon,",
    "Stand spelling false, while one might walk to Mile-",
    "End Green. Why, is it harder, sirs, than Gordon,",
    "Both them I serve, and of their train am I.",
    "Rescued from Death by force, though pale and faint.",
  ]);
  expect(editionLines("  Either man's work or his own gifts, who best                         10")).toEqual(["Either man's work or his own gifts, who best"]);
});

test("a poem is found by its first line with its first words aside, where the small capitals are misread; nothing near enough is no start", () => {
  const lines = ["So clear as in no face with more delight.", "Mertuoucnt I saw my late espouséd saint", "Brought to me like Alcestis from the grave,"];
  expect(findStart(lines, "Methought I saw my late espoused saint")).toBe(1);
  expect(findStart(lines, "When I consider how my light is spent")).toBe(null);
  expect(witnessPoem(["", "  Methought I saw my late espoused Saint", "", "  Brought to me like Alcestis from the grave,", "  Whom Joves great Son"], "Methought I saw my late espoused saint", 2))
    .toEqual(["  Methought I saw my late espoused Saint", "  Brought to me like Alcestis from the grave,"]);
});

test("a line the page ran over joins the line before it, the hyphen of a word broken across the turn kept; a line the poem breaks stays a line", () => {
  const witness = ["When thou taught'st Cambridge, and King Edward Greek.", "Next"];
  expect(cutPoem(["When thou taught’st Cambridge and King Edward", "Greek.", "Next"], 0, witness)).toEqual({ lines: ["When thou taught’st Cambridge and King Edward Greek.", "Next"], joins: 1 });
  // Mile-End: the sonnet's own line break, inside a name
  const mile = ["Stand spelling false, while one might walk to Mile-", "End Green. Why, is it harder Sirs then Gordon,"];
  expect(cutPoem(["Stand spelling false, while one might walk to Mile-", "End Green. Why, is it harder, sirs, than Gordon,"], 0, mile).lines).toHaveLength(2);
});

test("the OCR's straight marks curled, a mark spaced off its word put back, the specks dropped, an apostrophe inside a word kept with its letters", () => {
  expect(words("Cries  the  stall-reader,  \"  Bless  us !  what  a  word  on")).toEqual(["Cries", "the", "stall-reader,", "“Bless", "us!", "what", "a", "word", "on"]);
  expect(words("Whom  Jove's  great  son")).toEqual(["Whom", "Jove’s", "great", "son"]);
  expect(words("That murmur, soon replies, “God doth not need*")).toEqual(["That", "murmur,", "soon", "replies,", "“God", "doth", "not", "need"]);
});

const KNOWN = vocabulary("Phœbus Cæsar my nigh rescued", "lady");

test("both scans agreeing is the text; a mark one dropped is kept; a word is settled by the witness's line", () => {
  expect(readLine("Brought to me like Alcestis from the grave,", "Brought  to  me  like  Alcestis  from  the  grave,", "Brought to me like Alcestis from the grave,", KNOWN, 2)).toEqual({ text: "Brought to me like Alcestis from the grave,", decisions: [] });
  const faint = readLine("Rescued from Death by force, though pale and faint.", "Rescued  from  Death  by  force,  though  pale  and  faint", "Rescu'd from death by force though pale and faint.", KNOWN, 4);
  expect(faint.text).toBe("Rescued from Death by force, though pale and faint.");
  expect(faint.decisions).toEqual([{ line: 4, a: "faint.", b: "faint", chose: "faint.", why: "a mark the other scan dropped" }]);
  const ray = readLine("Foretell ray hopeless doom, in some grove nigh;", "Foretell  my  hopeless  doom,  in  some  grove  nighj", "Foretell my hopeless doom, in some grove nigh;", KNOWN, 10);
  expect(ray.text).toBe("Foretell my hopeless doom, in some grove nigh;");
  expect(ray.decisions.map((d) => d.why)).toEqual(["the witness's word", "the witness's word"]);
});

test("a mark the two read differently is settled by the witness's, else left for a hand", () => {
  expect(readLine("Who lived in both unstained with gold or fee,", "Who  lived  in  both  unstained  with  gold  or  fee.", "Who lived in both unstained with gold or fee,", KNOWN, 3).decisions[0].why).toBe("the witness's mark");
  expect(readLine("of fee,", "of fee.", "of fee;", KNOWN, 3).decisions[0]).toEqual({ line: 3, a: "fee,", b: "fee.", chose: "fee,", why: "UNSETTLED: the marks differ" });
});

test("the small capitals that open a poem take the witness's case, or a capital first letter; inside the first line a word is lower case", () => {
  expect(readLine("Mertuoucnt I saw my late espouséd saint", "METHOUGHT  I  saw  my  late  espoused  saint", "Methought I saw my late espoused Saint", KNOWN, 1).text).toBe("Methought I saw my late espouséd saint");
  expect(readLine("I pip but prompt the age to quit their clogs", "I  DID  but  prompt  the  age  to  quit  their  clogs", "I did but prompt the age to quit their cloggs", KNOWN, 1).text).toBe("I did but prompt the age to quit their clogs");
  expect(readLine("AvENGE, O Lord", "AVENGE,  O  Lord", "Avenge O Lord", KNOWN, 1).text).toBe("Avenge, O Lord");
});

test("æ and œ, which neither scan reads: read two ways it is the ligature; read the same way, the ligature where the edition prints the word elsewhere", () => {
  expect(ligatures("Chaeronea")).toContain("Chæronea");
  expect(readLine("At Chzronea, fatal to liberty,", "At  Chaeronea,  fatal  to  liberty,", "At Chaeronea, fatal to liberty,", KNOWN, 7).text).toBe("At Chæronea, fatal to liberty,");
  expect(readLine("the priest of Pheebus’ quire,", "the  priest  of  Phoebus'  quire,", "the priest of Phoebus' quire,", KNOWN, 10).text).toBe("the priest of Phœbus’ quire,");
  expect(readLine("of Phcebus here", "of Phcebus here", "of Phoebus here", KNOWN, 5).decisions[0].why).toBe("the edition's ligature, a word it prints elsewhere");
});

test("a word both scans read alike but found nowhere else is named; a word known once an ending is off, or a compound of known words, is not", () => {
  expect(readLine("spirits indu’th.", "spirits indu'th.", "spirits endu'th.", vocabulary("spirits"), 8).decisions[0].why).toBe("UNCONFIRMED: both scans, a word printed nowhere else");
  expect(knows(vocabulary("lady"), "ladys")).toBe(true);
  expect(readLine("a lady-love", "a lady-love", "", vocabulary("lady love"), 2).decisions).toEqual([]);
});

test("a speck one scan reads is dropped; a word in one scan only stands when the witness has it, else is left out", () => {
  expect(readLine("| How soon hath Time", "How  soon  hath  Time", "How soon hath Time", KNOWN, 2).text).toBe("How soon hath Time");
  expect(readLine("form, and style;", "form,  and  style  J", "form, and style;", KNOWN, 2).text).toBe("form, and style;");
  expect(readLine("the lady wise", "the wise", "the lady wise", KNOWN, 2).text).toBe("the lady wise");
});

test("against a typed text of the edition: what the scans cannot read is the typed text's, the kind named; a word or a mark is the side read on the page", () => {
  const lig = readAgainst("“Princes, Heaven’s ancient Sons, /Ethereal Thrones—", "“Princes, Heaven’s ancient Sons, Æthereal Thrones—");
  expect(lig).toEqual({ text: "“Princes, Heaven’s ancient Sons, Æthereal Thrones—", diffs: [{ kind: "ligature", scans: "/Ethereal", typed: "Æthereal" }] });
  expect(readAgainst("And said to me apart, “High are thy thoughts,", "And said to me apart, ‘High are thy thoughts,").diffs[0].kind).toBe("nested quote");
  expect(readAgainst("» Recovered Paradise to all mankind,", "Recovered Paradise to all mankind,").diffs[0].kind).toBe("speck");
  // man for main: Gutenberg's slip, the scans' word on the page
  expect(readAgainst("And management of this main enterprise", "And management of this man enterprise", ["scans"]).text).toBe("And management of this main enterprise");
  // the dash after replied: the scans lose it
  expect(readAgainst("To whom our Saviour sternly thus replied:", "To whom our Saviour sternly thus replied:—", ["typed"]).text).toBe("To whom our Saviour sternly thus replied:—");
  // one word on the page, hyphened in the typed text: read there too
  const male = readAgainst("To whom thus answered Satan, malecontent:—", "To whom thus answered Satan, male-content:—", ["scans"]);
  expect(male.diffs[0].kind).toBe("turn's hyphen");
  expect(male.text).toBe("To whom thus answered Satan, malecontent:—");
  // a word in one side only, taken or not as the page has it
  expect(readAgainst("Refused on me baptism to confer,", "Refused on me his baptism to confer,", ["scans"]).text).toBe("Refused on me baptism to confer,");
});

test("a stress accent the scans read is left off unless kept; an accent the typed text has is the letter's own", () => {
  expect(readAgainst("Me his belovéd Son, in whom alone", "Me his beloved Son, in whom alone").text).toBe("Me his beloved Son, in whom alone");
  expect(readAgainst("Me his belovéd Son, in whom alone", "Me his beloved Son, in whom alone", [], true).text).toBe("Me his belovéd Son, in whom alone");
  expect(readAgainst("Meroé, Nilotic isle,", "Meroë, Nilotic isle,", [], true).text).toBe("Meroë, Nilotic isle,");
  expect(unstressed("Methought I saw my late espouséd saint, belovèd, Meroë")).toBe("Methought I saw my late espoused saint, beloved, Meroë");
});
