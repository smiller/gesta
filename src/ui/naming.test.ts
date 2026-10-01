import { describe, it, expect } from "vitest";
import { typedName, REFUSE_URL, REFUSE_EMPTY } from "./naming.ts";

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
