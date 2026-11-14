import { describe, it, expect } from "vitest";
import { pointsInto, mayName, withHeading, linkingKeys } from "./refile.ts";

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

describe("mayName", () => {
  const may = mayName("bookshelf", "C. P. Cavafy");
  it("an address under the name in any spelling: encoded, an encoded slash, lowercase hex, a letter in hex, in angle brackets, in a full URL, with a payload, or a link's definition", () => {
    for (const md of [
      "[a](#bookshelf/C.%20P.%20Cavafy)", "[a](#bookshelf/C.%20P.%20Cavafy%2FWalls)",
      "[a](#bookshelf/C.%20P.%20Cav%61fy)", "[a](<#bookshelf/C. P. Cavafy/Candles>)", "[a](file:///g/index.html#bookshelf/C.%20P.%20Cavafy)",
      "[a](#bookshelf/C.%20P.%20Cavafy/Walls?line=3)", "[a][r]\n\n[r]: #bookshelf/C.%20P.%20Cavafy/Walls", "[a](#bookshelf/C.%20P.%20Cavafy%2fWalls)",
    ]) expect(may(md)).toBe(true);
  });
  it("a name with a straight apostrophe or brackets is read whole, the link's closing bracket not taken for its end", () => {
    expect(mayName("bookshelf", "O'Brien, Flann")("[x](#bookshelf/O'Brien%2C%20Flann) and more")).toBe(true);
    expect(mayName("commonplace", "Notes(2)")("see [x](#commonplace/Notes(2)) here")).toBe(true);
    expect(mayName("commonplace", "Notes(2)")("see [x](#commonplace/Notes%282%29/a) here")).toBe(true);
    expect(mayName("commonplace", "Notes")("see [x](#commonplace/Notes(2)) here")).toBe(false);
  });
  it("another author, a longer name, another namespace and no address are not", () => {
    for (const md of ["[a](#bookshelf/Carroll%2C%20Lewis)", "[a](#bookshelf/C.%20P.%20Cavafy%20Jr)", "[a](#commonplace/C.%20P.%20Cavafy)", "C. P. Cavafy wrote it"]) expect(may(md)).toBe(false);
  });
});

describe("withHeading", () => {
  it("a page with no level-one heading gets one, first; a headed page is left", () => {
    expect(withHeading("", "Sean Miller")).toBe("# Sean Miller\n");
    expect(withHeading("- [Book](#bookshelf/Sean%20Miller/Book)\n", "Sean Miller")).toBe("# Sean Miller\n\n- [Book](#bookshelf/Sean%20Miller/Book)\n");
    expect(withHeading("## Works\n", "Sean Miller")).toBe("# Sean Miller\n\n## Works\n");
    expect(withHeading("# C. P. Cavafy\n", "C. P. Cavafy")).toBeNull();
  });
});

describe("linkingKeys", () => {
  it("the entries outside the moved set and its copies holding an address under the name moved", () => {
    const cache = { "2026-09-14": "a [x](#bookshelf/C.%20P.%20Cavafy)", "2026-09-15": "plain bookshelf/ talk", "commonplace/Links": "[y](#bookshelf/Horace)", "bookshelf/C. P. Cavafy": "[z](#bookshelf/C.%20P.%20Cavafy/Walls)", "bookshelf/Cavafy, C. P": "[z](#bookshelf/C.%20P.%20Cavafy/Walls)" };
    expect(linkingKeys(cache, "bookshelf", "C. P. Cavafy", { "bookshelf/C. P. Cavafy": "bookshelf/Cavafy, C. P" })).toEqual(["2026-09-14"]);
  });
});
