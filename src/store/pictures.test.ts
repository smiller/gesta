import { describe, it, test, expect } from "vitest";
import { namedPictures, unnamed, sweepPlan, SWEEP_FLOOR, pictureMoves, pictureBlob, takenNames, nextPictureName, imageRefs, patternRefs } from "./pictures.ts";
import { entryFile } from "./names.ts";
import { memImageStore } from "./store.ts";

const CACHE: Record<string, string> = {
  "commonplace/Trip Log": "![](<Trip Log-img-1.webp>) and ![](https://x.org/a.png)\n",
  "bookshelf/Miller, Sean/Essays/A": "![](<bookshelf--Miller, Sean--Essays--A-img-1.webp>)\n\n![](shared.webp)\n",
  "2026-09-06": "![](2026-09-06-img-1.webp)\n",
  "commonplace/Blank": "",
};

describe("namedPictures", () => {
  it("every picture an entry's text names, at the key its entry's folder gives it; an outside address is none", () => {
    expect([...namedPictures(CACHE)].sort()).toEqual([
      "bookshelf/Miller, Sean/Essays/bookshelf--Miller, Sean--Essays--A-img-1.webp",
      "bookshelf/Miller, Sean/Essays/shared.webp",
      "commonplace/Trip Log-img-1.webp",
      "journal/2026/2026-09-06-img-1.webp",
    ]);
  });
});

describe("namedPictures, read twice", () => {
  it("a picture only the syntax reads is named too, as is one only the parser reads", () => {
    const named = namedPictures({ "commonplace/A": "```\n![](in-code.png)\n```\n\n![](Notes(2)-img-1.webp)\n" });
    expect(named.has("commonplace/in-code.png")).toBe(true);
    expect(named.has("commonplace/Notes(2)-img-1.webp")).toBe(true);
  });
});

describe("unnamed", () => {
  it("of the keys given, those no entry names, in their order", () => {
    expect(unnamed(["commonplace/old.webp", "bookshelf/Miller, Sean/Essays/shared.webp", "commonplace/gone.webp"], CACHE)).toEqual(["commonplace/old.webp", "commonplace/gone.webp"]);
  });
});

describe("sweepPlan", () => {
  const named = [...namedPictures(CACHE)];
  it("drops every stored picture no entry names", () => {
    expect(sweepPlan([...named, "commonplace/old.webp"], CACHE)).toEqual({ drop: ["commonplace/old.webp"], refused: 0 });
  });
  it("refuses, dropping nothing, when more than half the pictures would go and more than the floor", () => {
    const many = Array.from({ length: SWEEP_FLOOR + 1 }, (_, i) => "commonplace/old-" + i + ".webp");
    expect(sweepPlan([...named, ...many], CACHE)).toEqual({ drop: [], refused: SWEEP_FLOOR + 1 });
    const few = ["commonplace/a.webp", "commonplace/b.webp", "commonplace/c.webp", "commonplace/d.webp", "commonplace/e.webp"];
    expect(sweepPlan(few, CACHE).drop).toEqual(few);
  });
});

describe("the image store's list and delete", () => {
  it("lists the keys it holds and deletes one", async () => {
    const images = memImageStore();
    await images.set("commonplace/a.webp", new Uint8Array([1]));
    await images.set("commonplace/b.webp", new Uint8Array([2]));
    await images.del("commonplace/a.webp");
    expect(await images.keys()).toEqual(["commonplace/b.webp"]);
  });
});

describe("pictureMoves", () => {
  const stocked = async () => {
    const images = memImageStore();
    await images.set("a.webp", new Uint8Array([1, 2]));
    await images.set("same.webp", new Uint8Array([1, 2]));
    await images.set("other.webp", new Uint8Array([1, 3]));
    await images.set("longer.webp", new Uint8Array([1, 2, 3]));
    return images;
  };
  it("copies a picture under a new key, and answers false when there is none to copy", async () => {
    const images = await stocked();
    const moves = pictureMoves(images);
    expect(await moves.copyPicture("a.webp", "b.webp")).toBe(true);
    expect((await images.get("b.webp"))?.bytes).toEqual(new Uint8Array([1, 2]));
    expect(await moves.copyPicture("none.webp", "c.webp")).toBe(false);
    expect(await images.get("c.webp")).toBe(null);
  });
  it("a clash is a different picture already at the destination; an empty one or the same bytes is none", async () => {
    const moves = pictureMoves(await stocked());
    expect(await moves.pictureClash("a.webp", "empty.webp")).toBe(false);
    expect(await moves.pictureClash("a.webp", "same.webp")).toBe(false);
    expect(await moves.pictureClash("a.webp", "other.webp")).toBe(true);
    expect(await moves.pictureClash("a.webp", "longer.webp")).toBe(true);
    expect(await moves.pictureClash("none.webp", "same.webp")).toBe(true);
  });
  it("removes every picture named", async () => {
    const images = await stocked();
    await pictureMoves(images).removePictures(["a.webp", "other.webp"]);
    expect((await images.keys()).sort()).toEqual(["longer.webp", "same.webp"]);
  });
});

describe("pictureBlob", () => {
  it("a stored picture's bytes as a blob typed by its name's extension, in either case; an unknown one untyped", () => {
    const bytes = new Uint8Array([1, 2, 3]);
    expect(pictureBlob("journal/2026/2026-10-30-img-1.webp", bytes).type).toBe("image/webp");
    expect(pictureBlob("2018-09-29-sunset-1.JPG", bytes).type).toBe("image/jpeg");
    expect(pictureBlob("a.png", bytes).type).toBe("image/png");
    expect(pictureBlob("a.tiff", bytes).type).toBe("application/octet-stream");
    expect(pictureBlob("a.webp", bytes).size).toBe(3);
  });
});

describe("the names a new picture may not take", () => {
  const at = entryFile("commonplace", "Unused Pictures");
  it("a picture stored under the entry's folder and named by no text still holds its name, so the next is past it", () => {
    expect(nextPictureName(at, "", ["commonplace/Unused Pictures-img-1.webp"])).toBe("Unused Pictures-img-2.webp");
    expect(nextPictureName(at, "![](<Unused Pictures-img-2.webp>)", ["commonplace/Unused Pictures-img-3.webp"])).toBe("Unused Pictures-img-4.webp");
  });
  it("what the text names by either reading counts, and what is stored for another entry or another folder does not", () => {
    expect(nextPictureName(at, "```\n![](<Unused Pictures-img-5.webp>)\n```\n", [])).toBe("Unused Pictures-img-6.webp");
    expect(nextPictureName(at, "", ["commonplace/Other-img-7.webp", "commonplace/Unused Pictures/Unused Pictures-img-8.webp", "journal/2026/Unused Pictures-img-9.webp"])).toBe("Unused Pictures-img-1.webp");
  });
  it("taken: the text's names and the stored names for either of the entry's stems, nothing else of the folder", () => {
    const sub = entryFile("commonplace", "Essays/A");
    expect(takenNames(sub, "![](x.png)", ["commonplace/Essays/commonplace--Essays--A-img-2.webp", "commonplace/Essays/A-img-1.webp", "commonplace/Essays/twin.webp", "commonplace/Essays/B-img-1.webp"]).sort())
      .toEqual(["A-img-1.webp", "commonplace--Essays--A-img-2.webp", "x.png"]);
  });
});

test("imageRefs: relative refs, bare or <bracketed>, unwrapped and deduplicated; the rest is the browser's", () => {
  expect(imageRefs("no pictures")).toEqual([]);
  expect(imageRefs("![](a-img-1.webp) ![x](<Trip Log-img-2.webp>) ![](a-img-1.webp) ![](https://x/y.png) ![](data:image/png;base64,AA) ![](/abs.png)"))
    .toEqual(["a-img-1.webp", "Trip Log-img-2.webp"]);
});

test("imageRefs: every picture the editor shows, read as the editor reads it — a name with brackets, a title, brackets in the words — and none in code", () => {
  expect(imageRefs("![](Notes(2)-img-1.webp) ![a](t.png \"title\") ![fig [1]](y.png)\n\n```\n![](code.png)\n```\n"))
    .toEqual(["Notes(2)-img-1.webp", "t.png", "y.png"]);
});

test("patternRefs: the picture syntax read whole — a title, brackets in the words, a name with brackets", () => {
  expect(patternRefs("![a](t.png \"title\") ![fig [1]](y.png) ![](Notes(2)-img-1.webp)")).toEqual(["t.png", "y.png", "Notes(2)-img-1.webp"]);
});

test("imageRefs: a text the editor cannot read is read by its picture syntax, so nothing it may hold is missed", () => {
  expect(imageRefs("::: verse\n![](kept.png)\n:::\n:::\n")).toContain("kept.png");
});
