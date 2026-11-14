import { describe, it, expect } from "vitest";
import { typedName, typedAddress, REFUSE_URL, REFUSE_EMPTY, filingForm, shownForm } from "./naming.ts";

describe("typedName", () => {
  it("a cancelled or blank prompt is nothing to say", () => {
    expect(typedName(null)).toBeNull();
    expect(typedName("   ")).toBeNull();
  });
  it("a plain name passes the filename rule; a slash becomes a dash", () => {
    expect(typedName("  Books ")).toEqual({ name: "Books" });
    expect(typedName("A/B")).toEqual({ name: "A-B" });
    expect(typedName("Title: Sub")).toEqual({ name: "Title — Sub" });
  });
  it("a dated article link names the entry by its date and slug", () => {
    expect(typedName("https://x.org/2023/11/12/the-title/")).toEqual({ name: "2023-11-12-the-title" });
    expect(typedName("https://x.org/2023/11/12/bad slug/")).toEqual({ refuse: REFUSE_URL });
  });
  it("a name the filename rule cleans away is refused with the reason", () => {
    expect(typedName("--")).toEqual({ refuse: REFUSE_EMPTY });
    expect(typedName("///")).toEqual({ refuse: REFUSE_EMPTY });
  });
});

describe("an author's two names", () => {
  it("the filing form puts the last word first; one word stays itself", () => {
    expect(filingForm("Sean Miller")).toBe("Miller, Sean");
    expect(filingForm("Hildegard of Bingen")).toBe("Bingen, Hildegard of");
    expect(filingForm("Dorothy L. Sayers")).toBe("Sayers, Dorothy L.");
    expect(filingForm("  Horace ")).toBe("Horace");
    expect(filingForm("Sean   Miller")).toBe("Miller, Sean");
  });
  it("a name typed with a comma is already the filing form", () => {
    expect(filingForm(" Miller,  Sean ")).toBe("Miller, Sean");
  });
  it("the shown form turns a comma round, and leaves a name without one", () => {
    expect(shownForm("Miller, Sean")).toBe("Sean Miller");
    expect(shownForm("Cavafy,C. P.")).toBe("C. P. Cavafy");
    expect(shownForm("  Sean   Miller ")).toBe("Sean Miller");
    expect(shownForm("Miller,")).toBe("Miller");
    expect(shownForm(", Sean")).toBe("Sean");
  });
  it("two commas or more are kept as typed; a pasted article link reads as the name derived from it", () => {
    expect(shownForm("King, Martin Luther, Jr.")).toBe("King, Martin Luther, Jr.");
    expect(shownForm("https://x.org/2023/11/12/the-title/")).toBe("2023-11-12-the-title");
  });
  it("an empty part is not a part: a stray comma is dropped before the count", () => {
    expect(shownForm("Miller, Sean,")).toBe("Sean Miller");
    expect(filingForm("Miller, Sean,")).toBe("Miller, Sean");
    expect(shownForm("King,, Martin Luther, Jr.")).toBe("King, Martin Luther, Jr.");
  });
});

describe("typedAddress", () => {
  it("a typed address names a commonplace or book, spelled from its namespace or as a link's hash", () => {
    expect(typedAddress(" bookshelf/Miller, Sean/Essays ")).toEqual({ date: "bookshelf", tag: "Miller, Sean/Essays" });
    expect(typedAddress("#bookshelf/Miller%2C%20Sean/Essays")).toEqual({ date: "bookshelf", tag: "Miller, Sean/Essays" });
    expect(typedAddress("commonplace/Essays")).toEqual({ date: "commonplace", tag: "Essays" });
    expect(typedAddress("commonplace/Growth 50%/A")).toEqual({ date: "commonplace", tag: "Growth 50%/A" });
  });
  it("an address with an empty part is refused", () => {
    for (const raw of ["bookshelf/Miller, Sean/", "commonplace//Essays", "#commonplace//Essays", "#bookshelf/Miller%2C%20Sean/"]) expect(typedAddress(raw)).toEqual({ refuse: "an address can’t have an empty part" });
  });
  it("a name, a day, a namespace alone and nothing are no address", () => {
    for (const raw of ["Essays", "#2026-09-01", "#page", "pages/x", "", null]) expect(typedAddress(raw)).toBeNull();
  });
});
