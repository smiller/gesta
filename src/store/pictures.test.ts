import { describe, it, expect } from "vitest";
import { namedPictures, unnamed, sweepPlan, SWEEP_FLOOR } from "./pictures.ts";
import { memImageStore } from "./store.ts";

const CACHE: Record<string, string> = {
  "page/Trip Log": "![](<Trip Log-img-1.webp>) and ![](https://x.org/a.png)\n",
  "bookshelf/Miller, Sean/Essays/A": "![](<bookshelf--Miller, Sean--Essays--A-img-1.webp>)\n\n![](shared.webp)\n",
  "2026-09-06": "![](2026-09-06-img-1.webp)\n",
  "page/Blank": "",
};

describe("namedPictures", () => {
  it("every picture an entry's text names, at the key its entry's folder gives it; an outside address is none", () => {
    expect([...namedPictures(CACHE)].sort()).toEqual([
      "bookshelf/Miller, Sean/Essays/bookshelf--Miller, Sean--Essays--A-img-1.webp",
      "bookshelf/Miller, Sean/Essays/shared.webp",
      "journal/2026/2026-09-06-img-1.webp",
      "page/Trip Log-img-1.webp",
    ]);
  });
});

describe("namedPictures, read twice", () => {
  it("a picture only the syntax reads is named too, as is one only the parser reads", () => {
    const named = namedPictures({ "page/A": "```\n![](in-code.png)\n```\n\n![](Notes(2)-img-1.webp)\n" });
    expect(named.has("page/in-code.png")).toBe(true);
    expect(named.has("page/Notes(2)-img-1.webp")).toBe(true);
  });
});

describe("unnamed", () => {
  it("of the keys given, those no entry names, in their order", () => {
    expect(unnamed(["page/old.webp", "bookshelf/Miller, Sean/Essays/shared.webp", "page/gone.webp"], CACHE)).toEqual(["page/old.webp", "page/gone.webp"]);
  });
});

describe("sweepPlan", () => {
  const named = [...namedPictures(CACHE)];
  it("drops every stored picture no entry names", () => {
    expect(sweepPlan([...named, "page/old.webp"], CACHE)).toEqual({ drop: ["page/old.webp"], refused: 0 });
  });
  it("refuses, dropping nothing, when more than half the pictures would go and more than the floor", () => {
    const many = Array.from({ length: SWEEP_FLOOR + 1 }, (_, i) => "page/old-" + i + ".webp");
    expect(sweepPlan([...named, ...many], CACHE)).toEqual({ drop: [], refused: SWEEP_FLOOR + 1 });
    const few = ["page/a.webp", "page/b.webp", "page/c.webp", "page/d.webp", "page/e.webp"];
    expect(sweepPlan(few, CACHE).drop).toEqual(few);
  });
});

describe("the image store's list and delete", () => {
  it("lists the keys it holds and deletes one", async () => {
    const images = memImageStore();
    await images.set("page/a.webp", new Uint8Array([1]));
    await images.set("page/b.webp", new Uint8Array([2]));
    await images.del("page/a.webp");
    expect(await images.keys()).toEqual(["page/b.webp"]);
  });
});
