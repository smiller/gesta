import { describe, it, expect } from "vitest";
import { movePlan, moveHref, moveLinks, joined, pictureNames, renamePictures, type MovePlan } from "./move.ts";

const ESSAY = "https://x.org/2022/07/31/essay/\n\n# On Growing Older\n\nText.\n";
const CACHE: Record<string, string> = {
  "commonplace/Essays": "2024/07/26: [Birds](#commonplace/Essays/2024-07-26-birds)\n",
  "commonplace/Essays/2024-07-26-birds": "# Birds\n\n![](commonplace--Essays--2024-07-26-birds-img-1.webp)\n",
  "commonplace/Essays/2024-07-26-birds/notes": "notes\n",
  "commonplace/Essays/2026-07-22-essay": "https://x.org/2026/07/22/essay/\n\n# On Growing Older\n\nShorter.\n",
  "commonplace/Essays Jr": "another page\n",
  "bookshelf/Miller, Sean": "# Sean Miller\n\n[Essays](#bookshelf/Miller%2C%20Sean/Essays)\n",
  "bookshelf/Miller, Sean/Essays": "# Essays\n\n## 2022-07-31\n\n[On Growing Older](#bookshelf/Miller%2C%20Sean/Essays/2022-07-31-essay)\n",
  "bookshelf/Miller, Sean/Essays/2022-07-31-essay": ESSAY,
  "2026-09-01": "See [birds](#commonplace/Essays/2024-07-26-birds?line=3).\n",
};
const TO = "bookshelf/Miller, Sean/Essays";
const plan = (cache = CACHE, from = "commonplace/Essays", to = TO): MovePlan => {
  const p = movePlan(cache, from, to);
  if ("refuse" in p) throw new Error(p.refuse);
  return p;
};

describe("movePlan", () => {
  it("every key under the entry moves to the same place under the new one; an entry sharing its name's start stays", () => {
    expect(plan().moves).toEqual({
      "commonplace/Essays": TO,
      "commonplace/Essays/2024-07-26-birds": TO + "/2024-07-26-birds",
      "commonplace/Essays/2024-07-26-birds/notes": TO + "/2024-07-26-birds/notes",
    });
    expect(plan().into).toBe(true);
  });
  it("a sub-entry the place holds already by its title is a twin, not moved, whatever its key", () => {
    expect(plan().twins).toEqual({ "commonplace/Essays/2026-07-22-essay": TO + "/2022-07-31-essay" });
  });
  it("a blank sub-entry whose name the place holds is a twin; one with text and another title refuses", () => {
    const blank = { ...CACHE, "commonplace/Essays/2022-07-31-essay": "" };
    expect(plan(blank).twins["commonplace/Essays/2022-07-31-essay"]).toBe(TO + "/2022-07-31-essay");
    const other = { ...CACHE, "commonplace/Essays/2022-07-31-essay": "# Something else\n" };
    expect(movePlan(other, "commonplace/Essays", TO)).toEqual({ refuse: TO + "/2022-07-31-essay is there already" });
  });
  it("a blank twin with sub-entries of its own refuses by its name", () => {
    const deep = { ...CACHE, "commonplace/Essays/2022-07-31-essay": "", "commonplace/Essays/2022-07-31-essay/more": "x\n" };
    expect(movePlan(deep, "commonplace/Essays", TO)).toEqual({ refuse: "“2022-07-31-essay” is there already and has sub-entries of its own" });
  });
  it("a twin with sub-entries of its own refuses", () => {
    const deep = { ...CACHE, "commonplace/Essays/2026-07-22-essay/more": "x\n" };
    expect(movePlan(deep, "commonplace/Essays", TO)).toEqual({ refuse: "“On Growing Older” is there already and has sub-entries of its own" });
  });
  it("into a place that is no entry yet: nothing is a twin and nothing is joined", () => {
    const p = plan(CACHE, "commonplace/Essays", "bookshelf/Miller, Sean/Letters");
    expect(p.into).toBe(false);
    expect(p.twins).toEqual({});
    expect(p.moves["commonplace/Essays/2026-07-22-essay"]).toBe("bookshelf/Miller, Sean/Letters/2026-07-22-essay");
  });
  it("refuses a place under itself and one whose parent is nothing", () => {
    expect(movePlan(CACHE, "commonplace/Essays", "commonplace/Essays/x")).toEqual({ refuse: "an entry can’t move under itself" });
    expect(movePlan(CACHE, "commonplace/Essays", "bookshelf/Nobody/Essays")).toEqual({ refuse: "nothing at bookshelf/Nobody to move it under" });
  });
});

describe("moveHref", () => {
  it("an address into the entry moves with its payload; a twin's goes to the one there", () => {
    const p = plan();
    expect(moveHref("#commonplace/Essays/2024-07-26-birds?line=3", "commonplace/Essays", p)).toBe("#bookshelf/Miller%2C%20Sean/Essays/2024-07-26-birds?line=3");
    expect(moveHref("#commonplace/Essays?h=birds&n=2", "commonplace/Essays", p)).toBe("#bookshelf/Miller%2C%20Sean/Essays?h=birds&n=2");
    expect(moveHref("#commonplace/Essays/2026-07-22-essay", "commonplace/Essays", p)).toBe("#bookshelf/Miller%2C%20Sean/Essays/2022-07-31-essay");
  });
  it("matches by the key the address names, however it is spelled", () => {
    expect(moveHref("#commonplace/Essays%2F2024-07-26-birds", "commonplace/Essays", plan())).toBe("#bookshelf/Miller%2C%20Sean/Essays/2024-07-26-birds");
  });
  it("another entry, another namespace and an outside link are left", () => {
    for (const href of ["#commonplace/Essays%20Jr", "#bookshelf/Miller%2C%20Sean", "https://x.org/#commonplace/Essays", "#2026-09-01"])
      expect(moveHref(href, "commonplace/Essays", plan())).toBeNull();
  });
});

describe("moveHref under an author re-filed", () => {
  const AUTHOR: Record<string, string> = { "bookshelf/C. P. Cavafy": "# C. P. Cavafy\n", "bookshelf/C. P. Cavafy/Walls": "w\n", "bookshelf/C. P. Cavafy/Walls/1": "1\n", "bookshelf/C. P. Cavafy Jr": "j\n" };
  const cav = plan(AUTHOR, "bookshelf/C. P. Cavafy", "bookshelf/Cavafy, C. P");
  it("the root and every key under it move to the same place under the new name, a name sharing its start left", () => {
    expect(cav.moves).toEqual({ "bookshelf/C. P. Cavafy": "bookshelf/Cavafy, C. P", "bookshelf/C. P. Cavafy/Walls": "bookshelf/Cavafy, C. P/Walls", "bookshelf/C. P. Cavafy/Walls/1": "bookshelf/Cavafy, C. P/Walls/1" });
  });
  it("an encoded slash, a hand-spelled address, a highlight and a line all move by the key they name", () => {
    const from = "bookshelf/C. P. Cavafy";
    expect(moveHref("#bookshelf/C.%20P.%20Cavafy%2FWalls", from, cav)).toBe("#bookshelf/Cavafy%2C%20C.%20P/Walls");
    expect(moveHref("#bookshelf/C. P. Cavafy/Walls", from, cav)).toBe("#bookshelf/Cavafy%2C%20C.%20P/Walls");
    expect(moveHref("#bookshelf/C.%20P.%20Cavafy/Walls?h=the%20walls&n=2", from, cav)).toBe("#bookshelf/Cavafy%2C%20C.%20P/Walls?h=the%20walls&n=2");
    expect(moveHref("#bookshelf/C.%20P.%20Cavafy/Walls?line=7", from, cav)).toBe("#bookshelf/Cavafy%2C%20C.%20P/Walls?line=7");
  });
  it("another author, a longer name, another namespace and an outside link are left", () => {
    for (const href of ["#bookshelf/Carroll%2C%20Lewis", "#bookshelf/C.%20P.%20Cavafy%20Jr", "#commonplace/C.%20P.%20Cavafy", "https://x.org/#bookshelf/C.%20P.%20Cavafy", "#2026-09-14"])
      expect(moveHref(href, "bookshelf/C. P. Cavafy", cav)).toBeNull();
  });
});

describe("moveLinks", () => {
  it("rewrites each link into the entry, its label kept; null when there is none", () => {
    expect(moveLinks(CACHE["2026-09-01"], "commonplace/Essays", plan())).toBe("See [birds](#bookshelf/Miller%2C%20Sean/Essays/2024-07-26-birds?line=3).");
    expect(moveLinks("nothing here\n", "commonplace/Essays", plan())).toBeNull();
  });
});

describe("moveLinks relabelled", () => {
  it("a link labelled with the page's old name takes the new; another label, or a link to a sub-entry, is left", () => {
    const p = plan(CACHE, "commonplace/Essays", "commonplace/Letters");
    expect(moveLinks("[Essays](#commonplace/Essays) [mine](#commonplace/Essays) [Essays](#commonplace/Essays/2024-07-26-birds)\n", "commonplace/Essays", p, { old: "Essays", new: "Letters" }))
      .toBe("[Letters](#commonplace/Letters) [mine](#commonplace/Letters) [Essays](#commonplace/Letters/2024-07-26-birds)");
  });
});

describe("joined", () => {
  it("the moved text after the text there, a blank line between; either blank leaves the other", () => {
    expect(joined("# A\n\nx\n\n", "\ny\n")).toBe("# A\n\nx\n\ny\n");
    expect(joined("# A\n", "  \n")).toBe("# A\n");
    expect(joined("", "y\n")).toBe("y\n");
  });
});

describe("pictureNames", () => {
  const md = "![](commonplace--Essays--2024-07-26-birds-img-1.webp)\n\n![](<2024-07-26-birds-img-2.png>)\n\n![](shared.webp)\n\n![](https://x.org/a.jpg)\n";
  it("a picture named for its entry, by its whole path or its own name, is named for the new one in the same form; any other name is kept", () => {
    expect(pictureNames("commonplace/Essays/2024-07-26-birds", "bookshelf/Miller, Sean/Essays/2024-07-26-birds", md, [])).toEqual({
      "commonplace--Essays--2024-07-26-birds-img-1.webp": "bookshelf--Miller, Sean--Essays--2024-07-26-birds-img-1.webp",
      "2024-07-26-birds-img-2.png": "2024-07-26-birds-img-2.png",
      "shared.webp": "shared.webp",
    });
  });
  it("a page's own pictures are not taken for its sub-entry's, nor the other way", () => {
    expect(pictureNames("commonplace/A", "commonplace/C", "![](commonplace--A--B-img-1.webp) ![](A-img-1.webp) ![](commonplace--A-img-2.webp)", [])).toEqual({
      "commonplace--A--B-img-1.webp": "commonplace--A--B-img-1.webp", "A-img-1.webp": "C-img-1.webp", "commonplace--A-img-2.webp": "commonplace--C-img-2.webp",
    });
  });
  it("into an entry whose text names pictures already, the moved ones are numbered past its highest", () => {
    expect(pictureNames("commonplace/A", "commonplace/C", "![](A-img-1.webp) ![](A-img-3.webp)", ["C-img-1.webp", "C-img-4.webp"])).toEqual({
      "A-img-1.webp": "C-img-5.webp", "A-img-3.webp": "C-img-6.webp",
    });
  });
});

describe("renamePictures", () => {
  it("picture syntax shown in code is left as written", () => {
    expect(renamePictures("![a](x.png) and `![a](x.png)`\n\n```\n![a](x.png)\n```\n", { "x.png": "y.png" }))
      .toBe("![a](y.png) and `![a](x.png)`\n\n```\n![a](x.png)\n```\n");
  });
  it("a picture whose address cannot be found as written is renamed all the same, the text written anew", () => {
    expect(renamePictures("![a [b [c]]](x.png)\n", { "x.png": "y.png" })).toBe("![a [b [c]]](y.png)");
  });
  it("each picture renamed where its address is written — a title, brackets in its name or words kept, in angle brackets where the new name holds a space — the rest of the text as it was, a link of the same name left", () => {
    const md = "Before ![a](x-img-1.webp) mid ![](<x-img-2.webp>) and [a link](x-img-1.webp)\n";
    expect(renamePictures("![](Notes(2)-img-1.webp) and ![fig [1]](t.png \"title\")\n\n<b>kept</b>\n", { "Notes(2)-img-1.webp": "Notes(3)-img-1.webp", "t.png": "u u.png" }))
      .toBe("![](Notes(3)-img-1.webp) and ![fig [1]](<u u.png> \"title\")\n\n<b>kept</b>\n");
    expect(renamePictures(md, { "x-img-1.webp": "Miller, Sean--x-img-1.webp", "x-img-2.webp": "y-img-2.webp" }))
      .toBe("Before ![a](<Miller, Sean--x-img-1.webp>) mid ![](y-img-2.webp) and [a link](x-img-1.webp)\n");
  });
});
