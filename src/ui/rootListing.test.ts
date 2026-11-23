import { describe, it, expect } from "vitest";
import { listing, shelvesText, LABEL_CAP } from "./rootListing.ts";
import { journalOf } from "../store/headings.ts";

const LONG = "A".repeat(LABEL_CAP + 20);
const cache: Record<string, string> = {
  "bookshelf/Horace": "# Horace\n",
  "bookshelf/Milton, John": "# John Milton\n",
  "bookshelf/Long": "# " + LONG + "\n",
  "bookshelf/Shelves": "## Latin\n- [Horace](#bookshelf/Horace)\n\n## " + "E".repeat(LABEL_CAP + 5) + "\n",
};
const world = { keys: Object.keys(cache), journal: journalOf(cache), shelvesMd: shelvesText(cache) };

describe("a namespace's listing", () => {
  it("groups its roots by shelf, each labelled by its own heading; a shelf named in full and capped for showing", () => {
    const [latin, rest] = listing("bookshelf", world, null, true);
    expect(latin).toEqual({ shelf: "Latin", shelfLabel: "Latin", roots: [{ name: "Horace", label: "Horace" }] });
    expect(rest.shelf).toBe("E".repeat(LABEL_CAP + 5));
    expect(rest.shelfLabel!.length).toBeLessThanOrEqual(LABEL_CAP);
    expect(rest.roots.map((r) => r.name)).toEqual(["Long", "Milton, John"]);
  });
  it("caps a root's label where it is asked to, and leaves it whole where it is not", () => {
    const label = (cap: boolean) => listing("bookshelf", world, null, cap)[1].roots[0].label;
    expect(label(true).length).toBeLessThanOrEqual(LABEL_CAP);
    expect(label(false)).toBe(LONG);
  });
  it("joins the open root when no key yet holds it", () => {
    expect(listing("commonplace", { ...world, keys: [] }, "New", true)).toEqual([{ shelf: null, shelfLabel: null, roots: [{ name: "New", label: "New" }] }]);
  });
  it("reads the Shelves entry's text from the cache, none where there is none", () => {
    expect(shelvesText(cache)).toBe(cache["bookshelf/Shelves"]);
    expect(shelvesText({})).toBe("");
  });
});
