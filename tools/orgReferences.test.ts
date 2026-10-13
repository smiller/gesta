import { test, expect } from "vitest";
import { referOrgLinks } from "./orgReferences.ts";

test("referOrgLinks: an old link resolved is a markdown link, its words kept; one not resolved is left with its reason", () => {
  const md = "See [[./2017.org::lunch][29 April 2017]] and [[Sue]] there.\n";
  const r = referOrgLinks(md, (l) => l.target.startsWith("./2017") ? { href: "#2017-04-29" } : { why: "a name" });
  expect(r.md).toBe("See [29 April 2017](#2017-04-29) and [[Sue]] there.\n");
  expect(r.links.map((l) => [l.target, l.label, "why" in l.res ? l.res.why : l.res.href])).toEqual([["./2017.org::lunch", "29 April 2017", "#2017-04-29"], ["Sue", "Sue", "a name"]]);
});
test("referOrgLinks: the quotation a link's line introduces with a colon is handed over, and replaced by the passage it is given", () => {
  const md = "From [[./autrui/doctor-who.org::daleks][*The Daleks*]]:\n> TEMMOSUS: Yes.\n> \n> DYONI: But.\n\nAfter.\n";
  const seen: string[][] = [];
  const r = referOrgLinks(md, (l) => { seen.push(l.quote); return { href: "#bookshelf/DW?h=x", passage: "> TEMMOSUS: Yes, but.\n> \n> DYONI: But the Daleks." }; });
  expect(seen).toEqual([["> TEMMOSUS: Yes.", "> ", "> DYONI: But."]]);
  expect(r.md).toBe("From [*The Daleks*](#bookshelf/DW?h=x):\n> TEMMOSUS: Yes, but.\n> \n> DYONI: But the Daleks.\n\nAfter.\n");
});
test("referOrgLinks: a link in a code span or a code block is left, and only the last link on a line ending in a colon introduces the quotation", () => {
  const md = "`[[./a.org::x][x]]` and [[./b.org][b]], then [[./c.org::y][c]]:\n\n> quoted\n\n```\n[[./d.org][d]]\n```\n";
  const seen: [string, string[]][] = [];
  referOrgLinks(md, (l) => { seen.push([l.target, l.quote]); return { why: "-" }; });
  expect(seen).toEqual([["./b.org", []], ["./c.org::y", ["> quoted"]]]);
});
test("referOrgLinks: a link introduces the quotation only when nothing but marks stands between it and the line's closing colon", () => {
  const seen: [string, number][] = [];
  const md = "the *kwei* of [[./tao.org::60][60]] are part of it, which refracts *Inferno* 30.130-2:\n> Ad ascoltarli\n\nFrom *A Good Man* ([[./dw.org::x][amazing]]):\n> RIVER: Amazing.\n";
  referOrgLinks(md, (l) => { seen.push([l.target, l.quote.length]); return { why: "-" }; });
  expect(seen).toEqual([["./tao.org::60", 0], ["./dw.org::x", 1]]);
});
