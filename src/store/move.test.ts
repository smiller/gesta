import { describe, it, expect } from "vitest";
import { movePlan, moveHref, moveLinks, joined, pictureNames, renamePictures, type MovePlan } from "./move.ts";

const ESSAY = "https://x.org/2022/07/31/essay/\n\n# On Growing Older\n\nText.\n";
const CACHE: Record<string, string> = {
  "page/Essays": "2024/07/26: [Birds](#page/Essays/2024-07-26-birds)\n",
  "page/Essays/2024-07-26-birds": "# Birds\n\n![](page--Essays--2024-07-26-birds-img-1.webp)\n",
  "page/Essays/2024-07-26-birds/notes": "notes\n",
  "page/Essays/2026-07-22-essay": "https://x.org/2026/07/22/essay/\n\n# On Growing Older\n\nShorter.\n",
  "page/Essays Jr": "another page\n",
  "bookshelf/Miller, Sean": "# Sean Miller\n\n[Essays](#bookshelf/Miller%2C%20Sean/Essays)\n",
  "bookshelf/Miller, Sean/Essays": "# Essays\n\n## 2022-07-31\n\n[On Growing Older](#bookshelf/Miller%2C%20Sean/Essays/2022-07-31-essay)\n",
  "bookshelf/Miller, Sean/Essays/2022-07-31-essay": ESSAY,
  "2026-09-01": "See [birds](#page/Essays/2024-07-26-birds?line=3).\n",
};
const TO = "bookshelf/Miller, Sean/Essays";
const plan = (cache = CACHE, from = "page/Essays", to = TO): MovePlan => {
  const p = movePlan(cache, from, to);
  if ("refuse" in p) throw new Error(p.refuse);
  return p;
};

describe("movePlan", () => {
  it("every key under the page moves to the same place under the new one; a page sharing its name's start stays", () => {
    expect(plan().moves).toEqual({
      "page/Essays": TO,
      "page/Essays/2024-07-26-birds": TO + "/2024-07-26-birds",
      "page/Essays/2024-07-26-birds/notes": TO + "/2024-07-26-birds/notes",
    });
    expect(plan().into).toBe(true);
  });
  it("a sub-page the place holds already by its title is a twin, not moved, whatever its key", () => {
    expect(plan().twins).toEqual({ "page/Essays/2026-07-22-essay": TO + "/2022-07-31-essay" });
  });
  it("a blank sub-page whose name the place holds is a twin; one with text and another title refuses", () => {
    const blank = { ...CACHE, "page/Essays/2022-07-31-essay": "" };
    expect(plan(blank).twins["page/Essays/2022-07-31-essay"]).toBe(TO + "/2022-07-31-essay");
    const other = { ...CACHE, "page/Essays/2022-07-31-essay": "# Something else\n" };
    expect(movePlan(other, "page/Essays", TO)).toEqual({ refuse: TO + "/2022-07-31-essay is there already" });
  });
  it("a blank twin with pages of its own refuses by its name", () => {
    const deep = { ...CACHE, "page/Essays/2022-07-31-essay": "", "page/Essays/2022-07-31-essay/more": "x\n" };
    expect(movePlan(deep, "page/Essays", TO)).toEqual({ refuse: "“2022-07-31-essay” is there already and has pages of its own" });
  });
  it("a twin with pages of its own refuses", () => {
    const deep = { ...CACHE, "page/Essays/2026-07-22-essay/more": "x\n" };
    expect(movePlan(deep, "page/Essays", TO)).toEqual({ refuse: "“On Growing Older” is there already and has pages of its own" });
  });
  it("into a place that is no entry yet: nothing is a twin and nothing is joined", () => {
    const p = plan(CACHE, "page/Essays", "bookshelf/Miller, Sean/Letters");
    expect(p.into).toBe(false);
    expect(p.twins).toEqual({});
    expect(p.moves["page/Essays/2026-07-22-essay"]).toBe("bookshelf/Miller, Sean/Letters/2026-07-22-essay");
  });
  it("refuses a place under itself and one whose parent is nothing", () => {
    expect(movePlan(CACHE, "page/Essays", "page/Essays/x")).toEqual({ refuse: "a page can’t move under itself" });
    expect(movePlan(CACHE, "page/Essays", "bookshelf/Nobody/Essays")).toEqual({ refuse: "nothing at bookshelf/Nobody to move it under" });
  });
});

describe("moveHref", () => {
  it("an address into the page moves with its payload; a twin's goes to the one there", () => {
    const p = plan();
    expect(moveHref("#page/Essays/2024-07-26-birds?line=3", "page/Essays", p)).toBe("#bookshelf/Miller%2C%20Sean/Essays/2024-07-26-birds?line=3");
    expect(moveHref("#page/Essays?h=birds&n=2", "page/Essays", p)).toBe("#bookshelf/Miller%2C%20Sean/Essays?h=birds&n=2");
    expect(moveHref("#page/Essays/2026-07-22-essay", "page/Essays", p)).toBe("#bookshelf/Miller%2C%20Sean/Essays/2022-07-31-essay");
  });
  it("matches by the key the address names, however it is spelled", () => {
    expect(moveHref("#page/Essays%2F2024-07-26-birds", "page/Essays", plan())).toBe("#bookshelf/Miller%2C%20Sean/Essays/2024-07-26-birds");
  });
  it("another page, another namespace and an outside link are left", () => {
    for (const href of ["#page/Essays%20Jr", "#bookshelf/Miller%2C%20Sean", "https://x.org/#page/Essays", "#2026-09-01"])
      expect(moveHref(href, "page/Essays", plan())).toBeNull();
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
    for (const href of ["#bookshelf/Carroll%2C%20Lewis", "#bookshelf/C.%20P.%20Cavafy%20Jr", "#page/C.%20P.%20Cavafy", "https://x.org/#bookshelf/C.%20P.%20Cavafy", "#2026-09-14"])
      expect(moveHref(href, "bookshelf/C. P. Cavafy", cav)).toBeNull();
  });
});

describe("moveLinks", () => {
  it("rewrites each link into the page, its label kept; null when there is none", () => {
    expect(moveLinks(CACHE["2026-09-01"], "page/Essays", plan())).toBe("See [birds](#bookshelf/Miller%2C%20Sean/Essays/2024-07-26-birds?line=3).");
    expect(moveLinks("nothing here\n", "page/Essays", plan())).toBeNull();
  });
});

describe("moveLinks relabelled", () => {
  it("a link labelled with the page's old name takes the new; another label, or a link to a sub-page, is left", () => {
    const p = plan(CACHE, "page/Essays", "page/Letters");
    expect(moveLinks("[Essays](#page/Essays) [mine](#page/Essays) [Essays](#page/Essays/2024-07-26-birds)\n", "page/Essays", p, { old: "Essays", new: "Letters" }))
      .toBe("[Letters](#page/Letters) [mine](#page/Letters) [Essays](#page/Letters/2024-07-26-birds)");
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
  const md = "![](page--Essays--2024-07-26-birds-img-1.webp)\n\n![](<2024-07-26-birds-img-2.png>)\n\n![](shared.webp)\n\n![](https://x.org/a.jpg)\n";
  it("a picture named for its entry, by its whole path or its own name, is named for the new one in the same form; any other name is kept", () => {
    expect(pictureNames("page/Essays/2024-07-26-birds", "bookshelf/Miller, Sean/Essays/2024-07-26-birds", md, [])).toEqual({
      "page--Essays--2024-07-26-birds-img-1.webp": "bookshelf--Miller, Sean--Essays--2024-07-26-birds-img-1.webp",
      "2024-07-26-birds-img-2.png": "2024-07-26-birds-img-2.png",
      "shared.webp": "shared.webp",
    });
  });
  it("a page's own pictures are not taken for its sub-page's, nor the other way", () => {
    expect(pictureNames("page/A", "page/C", "![](page--A--B-img-1.webp) ![](A-img-1.webp) ![](page--A-img-2.webp)", [])).toEqual({
      "page--A--B-img-1.webp": "page--A--B-img-1.webp", "A-img-1.webp": "C-img-1.webp", "page--A-img-2.webp": "page--C-img-2.webp",
    });
  });
  it("into an entry whose text names pictures already, the moved ones are numbered past its highest", () => {
    expect(pictureNames("page/A", "page/C", "![](A-img-1.webp) ![](A-img-3.webp)", ["C-img-1.webp", "C-img-4.webp"])).toEqual({
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
