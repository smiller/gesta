import { describe, it, expect } from "vitest";
import { linkAction } from "./links.ts";

const DOC = "file:///Users/x/gesta/dist/index.html#2026-09-07";
describe("linkAction", () => {
  it("a plain click on a bare fragment routes in this tab", () => {
    expect(linkAction("#page/Horace", false, DOC)).toEqual({ kind: "route", frag: "#page/Horace" });
  });
  it("a full URL pointing at this document is internal in external clothing", () => {
    expect(linkAction("file:///Users/x/gesta/dist/index.html#bookshelf/Lewis%2C%20C.%20S./The%20Screwtape%20Letters", false, DOC))
      .toEqual({ kind: "route", frag: "#bookshelf/Lewis%2C%20C.%20S./The%20Screwtape%20Letters" });
  });
  it("a plain click on an external link does nothing: the caret lands", () => {
    expect(linkAction("https://example.org/a#b", false, DOC)).toBeNull();
    expect(linkAction(null, false, DOC)).toBeNull();
  });
  it("the modifier opens EVERY link in a new tab, internal ones included", () => {
    expect(linkAction("#page/Horace", true, DOC)).toEqual({ kind: "open", href: "#page/Horace" });
    expect(linkAction("https://example.org/", true, DOC)).toEqual({ kind: "open", href: "https://example.org/" });
  });
});
