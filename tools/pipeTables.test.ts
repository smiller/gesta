import { test, expect } from "vitest";
import { versePipeTables } from "./pipeTables.ts";

const one = (md: string): string => versePipeTables(md).md;

test("versePipeTables: a two-column table is a verse block of pairs, its divider dropped, an empty row a stanza break, empty rows at its ends gone", () => {
  const md = "Before.\n\n|  |  |\n| --- | --- |\n| Domum redit, | It’s coming home |\n| redit nunc | Coming home now |\n|  |  |\n| sic praeteritum | So the past |\n|  |  |\n\nAfter.\n";
  expect(one(md)).toBe("Before.\n\n::: verse\nDomum redit, | It’s coming home\nredit nunc | Coming home now\n\nsic praeteritum | So the past\n:::\n\nAfter.\n");
});
test("versePipeTables: a table in a quotation stays in it, a divider drawn with pluses dropped too", () => {
  const md = "> *Voluspá* 58:\n> \n> |------------------+----------------------------|\n> | Þar muno eptir   | There will once more       |\n> | undrsamligar     | the miraculous             |\n> \n> After Ragnarok.\n";
  expect(one(md)).toBe("> *Voluspá* 58:\n> \n> ::: verse\n> Þar muno eptir | There will once more\n> undrsamligar | the miraculous\n> :::\n> \n> After Ragnarok.\n");
});
test("versePipeTables: a table numbering its lines in its first column is verse starting at the first number, its lines the second column", () => {
  const md = "| 9 | O priestess, what you cry is clear |\n| --- | --- |\n| 10 | But let the screaming echoes rest |\n| 11 | ’Tis true there’s better boose than brine |\n";
  expect(one(md)).toBe("::: verse 9\nO priestess, what you cry is clear\nBut let the screaming echoes rest\n’Tis true there’s better boose than brine\n:::\n");
});
test("versePipeTables: numbered rows of three columns between tables, blank lines apart, are one verse block numbered from the first", () => {
  const md = "Messiah.\n\n|  |\n| --- |\n\n---|---|---\n 115 | Lo buon maestro disse    | “Son,” the kind master said\n\n| l’anime di color | The souls of those |\n| --- | --- |\n| e anche vo’ | Further, I’d have thee |\n|  |  |\n\n118 | che sotto l’acqua | That others lie\n\nThen on.\n";
  expect(one(md)).toBe("Messiah.\n\n::: verse 115\nLo buon maestro disse | “Son,” the kind master said\nl’anime di color | The souls of those\ne anche vo’ | Further, I’d have thee\n\nche sotto l’acqua | That others lie\n:::\n\nThen on.\n");
});
test("versePipeTables: a pipe inside a cell is escaped", () => {
  expect(one("| a | b |\n| --- | --- |\n| either\\|or | c |\n")).toBe("::: verse\na | b\neither\\|or | c\n:::\n");
});
test("versePipeTables: left as they are — a table in a code block, one holding a picture, one whose numbers do not run on, one of a single row", () => {
  const fenced = "```\n| a | b |\n| --- | --- |\n| c | d |\n```\n";
  expect(one(fenced)).toBe(fenced);
  const pictured = "| <img src=\"a.jpg\" /> | <img src=\"b.jpg\" /> |\n| --- | --- |\n| x | y |\n";
  expect(versePipeTables(pictured).tables.map((t) => t.why)).toEqual(["a picture"]);
  expect(one(pictured)).toBe(pictured);
  const jumping = "| 9 | one |\n| --- | --- |\n| 12 | two |\n";
  expect(versePipeTables(jumping).tables.map((t) => t.why)).toEqual(["its line numbers do not run on"]);
  const single = "| Waiting | Freedom |\n| --- | --- |\n";
  expect(versePipeTables(single).tables.map((t) => t.why)).toEqual(["a single row"]);
});
test("versePipeTables: a table quoting the bookshelf is the reference it is given, in the table's quotation; one given a reason is verse, the reason kept", () => {
  const refer = (lines: { left: string; right?: string }[]) => lines[0].left === "Lo buon" ? { text: "[Dante, *Inferno*, 7.115-16](#x):\n\n> ::: verse 115\n> Lo buon | Son\n> :::", key: "bookshelf/Dante/Commedia/Inferno/7", url: "#x", passage: "> ::: verse 115\n> Lo buon | Son\n> :::" } : { why: "another translation" };
  const md = "> | Lo buon | Son |\n> | --- | --- |\n> | l’anime | The souls |\n\n| Mes vers | My verses |\n| --- | --- |\n| Vers votre | To your |\n";
  const r = versePipeTables(md, refer);
  expect(r.md).toBe("> [Dante, *Inferno*, 7.115-16](#x):\n>\n> > ::: verse 115\n> > Lo buon | Son\n> > :::\n\n::: verse\nMes vers | My verses\nVers votre | To your\n:::\n");
  expect(r.tables.map((t) => [t.shelf, t.why])).toEqual([["bookshelf/Dante/Commedia/Inferno/7", undefined], [undefined, "another translation"]]);
});
test("versePipeTables: a table quoting the bookshelf after a line ending in an old link and a colon makes that link the reference, its words kept, and is the passage alone", () => {
  const refer = () => ({ text: "[Dante, *Paradiso*, 33.95-6](#u):\n\n> ::: verse 95\n> Un punto | One instant\n> :::", key: "k", url: "#u", passage: "> ::: verse 95\n> Un punto | One instant\n> :::" });
  const md = "Though [[./autrui/dante_commedia.org::par-33-95][*Paradiso*, 33.95-6]] also wants its tribute:\n\n| 95 | Un punto | One instant |\n| --- | --- | --- |\n| 96 | che volse | Turned |\n";
  expect(versePipeTables(md, refer).md).toBe("Though [*Paradiso*, 33.95-6](#u) also wants its tribute:\n\n> ::: verse 95\n> Un punto | One instant\n> :::\n");
});
