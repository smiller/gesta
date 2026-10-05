import { describe, it, expect } from "vitest";
import { refileKeys, refileHref, refileLinks, pointsInto, withHeading, linkingKeys } from "./refile.ts";

describe("refileKeys", () => {
  it("the root and every key under it, each to the same place under the new name; nothing else", () => {
    const keys = ["bookshelf/C. P. Cavafy", "bookshelf/C. P. Cavafy/Walls", "bookshelf/C. P. Cavafy/Walls/1", "bookshelf/C. P. Cavafy Jr", "bookshelf/Carroll, Lewis", "2026-09-14"];
    expect(refileKeys(keys, "bookshelf", "C. P. Cavafy", "Cavafy, C. P")).toEqual({
      "bookshelf/C. P. Cavafy": "bookshelf/Cavafy, C. P",
      "bookshelf/C. P. Cavafy/Walls": "bookshelf/Cavafy, C. P/Walls",
      "bookshelf/C. P. Cavafy/Walls/1": "bookshelf/Cavafy, C. P/Walls/1",
    });
  });
});

describe("refileHref", () => {
  it("an encoded slash is a slash", () => {
    expect(refileHref("#bookshelf/C.%20P.%20Cavafy%2FWalls", "bookshelf", "C. P. Cavafy", "Cavafy, C. P")).toBe("#bookshelf/Cavafy%2C%20C.%20P/Walls");
  });
  it("an address into the old name moves, its highlight payload kept", () => {
    expect(refileHref("#bookshelf/C.%20P.%20Cavafy", "bookshelf", "C. P. Cavafy", "Cavafy, C. P")).toBe("#bookshelf/Cavafy%2C%20C.%20P");
    expect(refileHref("#bookshelf/C.%20P.%20Cavafy/Walls?h=the%20walls&n=2", "bookshelf", "C. P. Cavafy", "Cavafy, C. P")).toBe("#bookshelf/Cavafy%2C%20C.%20P/Walls?h=the%20walls&n=2");
  });
  it("a hand-spelled address matches by the key it names", () => {
    expect(refileHref("#bookshelf/C. P. Cavafy/Walls", "bookshelf", "C. P. Cavafy", "Cavafy, C. P")).toBe("#bookshelf/Cavafy%2C%20C.%20P/Walls");
  });
  it("another author, a longer name, another namespace and an outside link are left", () => {
    for (const href of ["#bookshelf/Carroll%2C%20Lewis", "#bookshelf/C.%20P.%20Cavafy%20Jr", "#page/C.%20P.%20Cavafy", "https://x.org/#bookshelf/C.%20P.%20Cavafy", "#2026-09-14"]) {
      expect(refileHref(href, "bookshelf", "C. P. Cavafy", "Cavafy, C. P")).toBeNull();
    }
  });
});

describe("refileLinks", () => {
  it("moves every link into the old name, labels untouched, the rest byte for byte; null when none", () => {
    const md = "Read [Walls](#bookshelf/C.%20P.%20Cavafy/Walls) and [C. P. Cavafy](#bookshelf/C.%20P.%20Cavafy), not [Carroll](#bookshelf/Carroll%2C%20Lewis).\n\n- *kept*\n";
    expect(refileLinks(md, "bookshelf", "C. P. Cavafy", "Cavafy, C. P"))
      .toBe("Read [Walls](#bookshelf/Cavafy%2C%20C.%20P/Walls) and [C. P. Cavafy](#bookshelf/Cavafy%2C%20C.%20P), not [Carroll](#bookshelf/Carroll%2C%20Lewis).\n\n- *kept*");
    expect(refileLinks("No links.\n", "bookshelf", "C. P. Cavafy", "Cavafy, C. P")).toBeNull();
  });
});

describe("pointsInto", () => {
  const into = pointsInto("bookshelf", "C. P. Cavafy");
  it("finds an address into the old name in any spelling, and not a longer name's", () => {
    expect(into("[x](#bookshelf/C.%20P.%20Cavafy/Walls)")).toBe(true);
    expect(into("[x](#bookshelf/C.%20P.%20Cavafy)")).toBe(true);
    expect(into("<a href=\"file:///g/index.html#bookshelf/C. P. Cavafy\">")).toBe(true);
    expect(into("[x](#bookshelf/C.%20P.%20Cavafy%20Jr)")).toBe(false);
    expect(into("C. P. Cavafy wrote it")).toBe(false);
  });
  it("reads a link by the key it names, whatever its escapes: an encoded slash, lowercase hex, an angle-bracketed destination", () => {
    expect(into("[w](#bookshelf/C.%20P.%20Cavafy%2FWalls)")).toBe(true);
    expect(into("[w](#bookshelf/C.%20P.%20Cav%61fy)")).toBe(true);
    expect(into("[w](<#bookshelf/C. P. Cavafy>)")).toBe(true);
    expect(pointsInto("bookshelf", "Cavafy, C. P")("[w](#bookshelf/Cavafy%2c%20C.%20P)")).toBe(true);
  });
});

describe("withHeading", () => {
  it("a page with no level-one heading gets one, first; a headed page is left", () => {
    expect(withHeading("", "Harley Price")).toBe("# Harley Price\n");
    expect(withHeading("- [Book](#bookshelf/Harley%20Price/Book)\n", "Harley Price")).toBe("# Harley Price\n\n- [Book](#bookshelf/Harley%20Price/Book)\n");
    expect(withHeading("## Works\n", "Harley Price")).toBe("# Harley Price\n\n## Works\n");
    expect(withHeading("# C. P. Cavafy\n", "C. P. Cavafy")).toBeNull();
  });
});

describe("linkingKeys", () => {
  it("the entries outside the moved set and its copies holding an address in the namespace at all", () => {
    const cache = { "2026-09-14": "a [x](#bookshelf/C.%20P.%20Cavafy)", "2026-09-15": "plain bookshelf/ talk", "page/Links": "[y](#bookshelf/Horace)", "bookshelf/C. P. Cavafy": "[z](#bookshelf/C.%20P.%20Cavafy/Walls)", "bookshelf/Cavafy, C. P": "[z](#bookshelf/C.%20P.%20Cavafy/Walls)" };
    expect(linkingKeys(cache, "bookshelf", { "bookshelf/C. P. Cavafy": "bookshelf/Cavafy, C. P" })).toEqual(["2026-09-14", "page/Links"]);
  });
});
