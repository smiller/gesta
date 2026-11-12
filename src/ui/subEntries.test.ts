import { describe, it, expect } from "vitest";
import { subEntrySpec, takenText, subTreeHasContent, blankSubTree, subButtons, renamePrompt, movePrompt, moveConfirm, movedText, deleteConfirm, deleteLanding, hostKey } from "./subEntries.ts";

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
    // the shelves hold no books; a page called Shelves is a page
    expect(subButtons("bookshelf", "Shelves")).toMatchObject({ canCreate: false, canEdit: true });
    expect(subButtons("page", "Shelves")).toMatchObject({ canCreate: true });
    expect(subButtons("bookshelf", "Dante/Inferno")).toMatchObject({ create: "+ book", renameTitle: "Rename this book" });
  });
  it("the Tag button's title names what the selection moves to", () => {
    expect(subButtons("2026-09-07", null).tagTitle).toBe("Move selection to a new tagged entry");
    expect(subButtons("page", "Books").tagTitle).toBe("Move selection to a new sub-page");
    expect(subButtons("bookshelf", "Dante").tagTitle).toBe("Move selection to a new book");
  });
  it("the prompt and the confirm lead with the noun", () => {
    expect(renamePrompt("2026-09-07", "Ideas", "Ideas")).toBe('Rename the tag "Ideas" to:');
    expect(renamePrompt("bookshelf", "Dante/Inferno", "Inferno")).toBe('Rename the book "Inferno" to:');
    expect(renamePrompt("page", "Books", "Books")).toBe('Rename the page "Books" to:');
    expect(deleteConfirm("2026-09-07", "Ideas", "Ideas")).toBe('Delete the entry "Ideas" for this day?');
    expect(deleteConfirm("page", "Books/E", "E")).toBe('Delete the sub-page "E"?');
  });
  it("an author is re-filed: the prompt says it files and sorts", () => {
    expect(renamePrompt("bookshelf", "C. P. Cavafy", "C. P. Cavafy")).toBe("File and sort “C. P. Cavafy” under:");
    expect(renamePrompt("bookshelf", "Milton, John", "John Milton")).toBe("File and sort “John Milton” under:");
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

describe("the move's texts", () => {
  it("the move asks a place, naming the entry and what goes with it", () => {
    expect(movePrompt("page", "Essays", "Essays")).toBe("Move the page “Essays” and its sub-pages to:");
    expect(movePrompt("bookshelf", "Dante/Inferno", "Inferno")).toBe("Move the book “Inferno” and its books to:");
  });
  it("the confirm counts what moves, says where the text goes, and names each twin deleted", () => {
    expect(moveConfirm({ date: "page", tag: "Essays", shown: "Essays" }, "bookshelf/Miller, Sean/Essays", { moved: 101, into: true, twins: ["On Growing Older"] }))
      .toBe("Move the page “Essays” and its 101 sub-pages to bookshelf/Miller, Sean/Essays? Its own text goes after the text there. 1 sub-page is there already by title and is deleted, its links going to the one there: “On Growing Older”.");
    expect(moveConfirm({ date: "page", tag: "A", shown: "A" }, "page/B", { moved: 1, into: false, twins: [] })).toBe("Move the page “A” and its 1 sub-page to page/B?");
    expect(moveConfirm({ date: "page", tag: "A", shown: "A" }, "page/B", { moved: 0, into: true, twins: ["X", "Y"] })).toBe("Move the page “A” to page/B? Its own text goes after the text there. 2 sub-pages are there already by title and are deleted, their links going to the one there: “X”, “Y”.");
  });
  it("the outcome counts the entries, the twins, the pictures not found and the links, as the re-file does", () => {
    expect(movedText("page/B", { moved: 3, twins: 1, lost: 2, updated: 4, left: [], stayed: [] })).toBe("moved to page/B — 3 entries, 1 there already deleted, 2 pictures not found, links updated in 4 others");
    expect(movedText("page/B", { moved: 1, twins: 0, lost: 0, updated: 0, left: ["page/C"], stayed: ["page/A"] })).toBe("moved to page/B — 1 entry; 1 link not updated: page/C; old copy kept: page/A");
  });
});
