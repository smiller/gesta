import { test, expect } from "vitest";
import { quoteMarks, respellMarks } from "./quoteMarks.ts";

const run = (md: string) => respellMarks(md, quoteMarks(md)).out;
const kinds = (md: string) => quoteMarks(md).map((f) => f.kind);

test("quoteMarks: an opening mark after italics, a word or punctuation, before a space, punctuation or the line's end, is a closing mark turned", () => {
  expect(run("‘*Secure her!*‘ cried the devil: ‘*afterward*‘\n")).toBe("‘*Secure her!*’ cried the devil: ‘*afterward*’\n");
  expect(run("‘An active, well-disposed boy‘, he was\n")).toBe("‘An active, well-disposed boy’, he was\n");
  expect(run("Ha—’*Conciliator Differentiarum*‘—\n")).toBe("Ha—‘*Conciliator Differentiarum*’—\n");
});
test("quoteMarks: a closing mark after a space, a dash or the line's start, before italics, is an opening mark turned, an elision in italics left", () => {
  expect(run("’*Your uncle!* Holy Saint\n")).toBe("‘*Your uncle!* Holy Saint\n");
  expect(run("Badger-like,—’*Back to London*‘ was the word—\n")).toBe("Badger-like,—‘*Back to London*’ was the word—\n");
  expect(run("she said ’*Eh bien*,’ and went\n")).toBe("she said ‘*Eh bien*,’ and went\n");
  const clips = "more out of ’*im*. JOHN FORD: ’*Tis Pity She’s a Whore*. I ’*ave* been\n";
  expect(run(clips)).toBe(clips);
});
test("quoteMarks: an elision's mark, an opening mark before a word and a closing mark after one are left", () => {
  const md = "‘’Tis so,’ she said, ‘the e’er-living ’em.’ Th’ one, goin’ out.\n";
  expect(run(md)).toBe(md);
});
test("quoteMarks: a spaced opening mark closes up after “, a line's start or punctuation, or before a capital; inside a quotation a spaced mark is the closing one", () => {
  expect(run("“ ‘ Let there be light! ‘ said God; and forthwith light\n")).toBe("“‘Let there be light!’ said God; and forthwith light\n");
  expect(run("Submiss. He reared me, and, ‘ Whom thou sought’st I am, ‘\nSaid mildly, ‘ Author of all\n"))
    .toBe("Submiss. He reared me, and, ‘Whom thou sought’st I am,’\nSaid mildly, ‘Author of all\n");
  expect(run("Unless she said ‘ My mind is now turn’d whore.\n")).toBe("Unless she said ‘My mind is now turn’d whore.\n");
  expect(run("‘ Oh, it’s his wool robe\n")).toBe("‘Oh, it’s his wool robe\n");
});
test("quoteMarks: a quotation stays open across lines, and a blank line closes it", () => {
  expect(run("To punish endless? ‘ Wherefore cease we, then? ‘\nSay they who counsel war; ‘ we are decreed,\nWhat can we suffer worse? ‘ Is this, then, worst —\n"))
    .toBe("To punish endless? ‘Wherefore cease we, then?’\nSay they who counsel war; ‘we are decreed,\nWhat can we suffer worse?’ Is this, then, worst —\n");
  expect(run("‘O, speak, ‘ quoth she\n")).toBe("‘O, speak,’ quoth she\n");
  expect(run("“ ‘ Let th’ Earth bring forth! ‘ said God\n")).toBe("“‘Let th’ Earth bring forth!’ said God\n");
  expect(run("‘ Hear\n\nthus ‘ lips\n")).toBe("‘Hear\n\nthus ‘ lips\n");
  expect(run("‘ Open, ye Heavens! let in\nhis six days’ work, a World!\nOn errands of supernal grace. ‘ So sung\n"))
    .toBe("‘Open, ye Heavens! let in\nhis six days’ work, a World!\nOn errands of supernal grace.’ So sung\n");
});
test("quoteMarks: a spaced mark ending its line after punctuation is a closing one, its quotation opened before a blank line", () => {
  expect(run("Thy rebels, or be found the worst in Heaven. ‘\n\n“So spake the Son\n")).toBe("Thy rebels, or be found the worst in Heaven.’\n\n“So spake the Son\n");
});
test("quoteMarks: a spaced mark whose quotation closes later on its line is an opening one", () => {
  expect(run("So when you let yourself be called ‘ wise and faultless’, respond\n")).toBe("So when you let yourself be called ‘wise and faultless’, respond\n");
});
test("quoteMarks: a spaced mark after a word, before a small letter, outside a quotation, is left for a hand", () => {
  expect(run("O’er ladies ‘ lips, who straight\n")).toBe("O’er ladies ‘ lips, who straight\n");
  expect(kinds("O’er ladies ‘ lips, who straight\n")).toEqual(["left"]);
});
test("quoteMarks: a spaced closing mark after punctuation closes up", () => {
  expect(run("‘ To govern, not to serve! ’\n\n“Thus far\n")).toBe("‘To govern, not to serve!’\n\n“Thus far\n");
  expect(run("Augustus ’ stepson\n")).toBe("Augustus ’ stepson\n");
  expect(run("“ ‘ Thrones, Powers — not to serve! ’”")).toBe("“‘Thrones, Powers — not to serve!’”");
});
test("quoteMarks: a spaced mark beside another mark is left for a hand", () => {
  expect(kinds("‘ ‘For some hard-favour’d groom\n")).toEqual(["left"]);
});
test("quoteMarks: code is left", () => {
  expect(run("```\n‘*Secure her!*‘ and “ ‘ Let\n```\n")).toBe("```\n‘*Secure her!*‘ and “ ‘ Let\n```\n");
});
test("respellMarks: each fix's place in the text written, for the review", () => {
  const md = "“ ‘ Let there be light! ‘ said God\n";
  const { out, marks } = respellMarks(md, quoteMarks(md));
  expect(marks.map((m) => [out[m.at], m.kind])).toEqual([["‘", "spacedOpen"], ["’", "spacedClose"]]);
});
