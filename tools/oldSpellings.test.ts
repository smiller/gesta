import { test, expect } from "vitest";
import { respell } from "./oldSpellings.ts";

const one = (md: string): string => respell(md).md;

test("respell: an Emacs link to an address is a markdown link, its label's own marks kept", () => {
  expect(one("Went and looked up [[http://www.chakoteya.net/DoctorWho/31-2.htm][*The Beast Below*]] and now.\n"))
    .toBe("Went and looked up [*The Beast Below*](http://www.chakoteya.net/DoctorWho/31-2.htm) and now.\n");
  expect(one("See [[https://example.org/a]] there.\n")).toBe("See [https://example.org/a](https://example.org/a) there.\n");
});
test("respell: a double-bracketed name with no address is left", () => {
  expect(one("See [[project-notes]] and [[a name][label]].\n")).toBe("See [[project-notes]] and [[a name][label]].\n");
});
test("respell: text between slashes is italic, inside brackets and quotes too", () => {
  expect(one("debacle that was /The Timeless Children/ immediately, and [/Purg/ 31.44-5], “/unde agat/”.\n"))
    .toBe("debacle that was *The Timeless Children* immediately, and [*Purg* 31.44-5], “*unde agat*”.\n");
});
test("respell: a slash inside a word or an address, a fraction, a path and a comment's stars are not italics", () => {
  const md = "and/or, 1/2, see https://martinfowler.com/articles/x.html, /usr/local/bin and /* recognised, and REFUSED */.\n";
  expect(one(md)).toBe(md);
});
test("respell: code is left: a fenced block and a code span", () => {
  const md = "```\n/not italic/ [[https://a.org/][x]]\n```\n\nand `/not/ this` but /this/.\n";
  expect(one(md)).toBe("```\n/not italic/ [[https://a.org/][x]]\n```\n\nand `/not/ this` but *this*.\n");
});
test("respell: each change is reported with its line", () => {
  const r = respell("plain\n\nsee /this/ and [[https://a.org/][that]]\n");
  expect(r.changes).toEqual([{ line: 3, before: "see /this/ and [[https://a.org/][that]]", after: "see *this* and [that](https://a.org/)" }]);
});
test("respell: a span opened by one mark and closed by the other is italic; underscores both sides are markdown already; an address keeps its marks", () => {
  expect(one("_þa Eald-seaxe, þa Engle 7 þa Eotena/ and /How to Teach Programming (And Other Things)_ too.\n"))
    .toBe("*þa Eald-seaxe, þa Engle 7 þa Eotena* and *How to Teach Programming (And Other Things)* too.\n");
  expect(one("*úhreinn andi/ and /orgê* too.\n")).toBe("*úhreinn andi* and *orgê* too.\n");
  expect(one("_already italic_ stays, *and this* and **bold** too.\n")).toBe("_already italic_ stays, *and this* and **bold** too.\n");
  expect(one("watch https://youtu.be/a-_HbC/ now\n")).toBe("watch https://youtu.be/a-_HbC/ now\n");
});
