import { describe, it, expect } from "vitest";
import { subEntrySpec, takenText, subTreeHasContent, blankSubTree, subButtons, renamePrompt, deleteConfirm, deleteLanding, hostKey } from "./subEntries.ts";

describe("subEntrySpec", () => {
  it("a day's tag is the typed text; a page's sub-page takes the filename rule under the page's key", () => {
    expect(subEntrySpec("2026-09-07", null, "Ideas")).toEqual({ tag: "Ideas", full: "Ideas", listKey: "2026-09-07", href: "#2026-09-07/Ideas" });
    expect(subEntrySpec("page", "Books", "A: B")).toEqual({ tag: "A — B", full: "Books/A — B", listKey: "page/Books", href: "#page/Books/A%20%E2%80%94%20B" });
    expect(subEntrySpec("bookshelf", "Dante/Inferno", "2")).toEqual({ tag: "2", full: "Dante/Inferno/2", listKey: "bookshelf/Dante/Inferno", href: "#bookshelf/Dante/Inferno/2" });
  });
  it("a day's tagged entry cannot host; a name the rule empties is refused", () => {
    expect(subEntrySpec("2026-09-07", "Ideas", "x")).toBeNull();
    expect(subEntrySpec("page", "Books", "--")).toEqual({ refuse: "that name leaves nothing a filename can keep" });
  });
});
describe("takenText", () => {
  it("names the list by its first slot", () => {
    expect(takenText("2026-09-07", "Ideas")).toBe('A "Ideas" entry already exists for this day.');
    expect(takenText("page", "Books")).toBe('A "Books" page already exists.');
    expect(takenText("bookshelf/Dante", "Inferno")).toBe('A "Inferno" book already exists.');
  });
});
describe("the subtree", () => {
  const cache = { "page/B": "b", "page/B/1": "one", "page/B/2": "", "page/B/2/deep": "  ", "page/C": "c", "page/C/x": "" };
  const keys = Object.keys(cache);
  it("content-bearing descendants at any depth block; blanks never do", () => {
    expect(subTreeHasContent(keys, cache, "page/B")).toBe(true);
    expect(subTreeHasContent(keys, cache, "page/B/2")).toBe(false);
    expect(subTreeHasContent(keys, cache, "page/C")).toBe(false);
  });
  it("the blank subtree lists every descendant, deepest first", () => {
    expect(blankSubTree(keys, "page/B/2")).toEqual(["page/B/2/deep"]);
    expect(blankSubTree(keys, "page/B")).toEqual(["page/B/1", "page/B/2/deep", "page/B/2"]);
  });
});
describe("the buttons and the dialogs", () => {
  it("wording per namespace; a page both hosts and is a sub-entry; a day's tag is only a sub-entry", () => {
    expect(subButtons("2026-09-07", null)).toMatchObject({ create: "+ tagged entry", canCreate: true, canEdit: false });
    expect(subButtons("2026-09-07", "Ideas")).toMatchObject({ canCreate: false, canEdit: true, renameTitle: "Rename this entry's tag" });
    expect(subButtons("page", "Books")).toMatchObject({ create: "+ sub-page", canCreate: true, canEdit: true, renameTitle: "Rename this page", deleteTitle: "Delete this page" });
    expect(subButtons("bookshelf", "Dante/Inferno")).toMatchObject({ create: "+ book", renameTitle: "Rename this book" });
  });
  it("the prompt and the confirm lead with the noun", () => {
    expect(renamePrompt("2026-09-07", "Ideas", "Ideas")).toBe('Rename the tag "Ideas" to:');
    expect(renamePrompt("bookshelf", "Milton, John", "John Milton")).toBe('Rename the author "John Milton" to:');
    expect(deleteConfirm("2026-09-07", "Ideas", "Ideas")).toBe('Delete the entry "Ideas" for this day?');
    expect(deleteConfirm("page", "Books/E", "E")).toBe('Delete the sub-page "E"?');
  });
  it("a delete lands on the day, the parent, or today; the host is the day or the parent", () => {
    expect(deleteLanding("2026-09-07", "Ideas")).toEqual({ date: "2026-09-07", tag: null });
    expect(deleteLanding("page", "Books/E")).toEqual({ date: "page", tag: "Books" });
    expect(deleteLanding("page", "Books").tag).toBeNull();
    expect(hostKey("2026-09-07", "Ideas")).toBe("2026-09-07");
    expect(hostKey("page", "Books/E")).toBe("page/Books");
    expect(hostKey("page", "Books")).toBeNull();
  });
});
