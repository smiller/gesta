import { describe, it, expect } from "vitest";
import { subEntrySpec, takenText, subTreeHasContent, blankSubTree, subButtons, renamePrompt, movePrompt, moveConfirm, movedText, deleteConfirm, deleteLanding, hostKey } from "./subEntries.ts";

describe("subEntrySpec", () => {
  it("a day's tag is the typed text; a page's sub-entry takes the filename rule under the page's key", () => {
    expect(subEntrySpec("2026-09-07", null, "Ideas")).toEqual({ tag: "Ideas", full: "Ideas", listKey: "2026-09-07", href: "#2026-09-07/Ideas" });
    expect(subEntrySpec("commonplace", "Books", "A: B")).toEqual({ tag: "A — B", full: "Books/A — B", listKey: "commonplace/Books", href: "#commonplace/Books/A%20%E2%80%94%20B" });
    expect(subEntrySpec("bookshelf", "Dante/Inferno", "2")).toEqual({ tag: "2", full: "Dante/Inferno/2", listKey: "bookshelf/Dante/Inferno", href: "#bookshelf/Dante/Inferno/2" });
  });
  it("a day's tagged entry cannot host; a name the rule empties is refused", () => {
    expect(subEntrySpec("2026-09-07", "Ideas", "x")).toBeNull();
    expect(subEntrySpec("commonplace", "Books", "--")).toEqual({ refuse: "that name leaves nothing a filename can keep" });
  });
});
describe("takenText", () => {
  it("names the list by its first slot", () => {
    expect(takenText("2026-09-07", "Ideas")).toBe('A "Ideas" entry already exists for this day.');
    expect(takenText("commonplace", "Books")).toBe('A "Books" commonplace already exists.');
    expect(takenText("bookshelf/Dante", "Inferno")).toBe('A "Inferno" book already exists.');
  });
});
describe("the subtree", () => {
  const cache = { "commonplace/B": "b", "commonplace/B/1": "one", "commonplace/B/2": "", "commonplace/B/2/deep": "  ", "commonplace/C": "c", "commonplace/C/x": "" };
  const keys = Object.keys(cache);
  it("content-bearing descendants at any depth block; blanks never do", () => {
    expect(subTreeHasContent(keys, cache, "commonplace/B")).toBe(true);
    expect(subTreeHasContent(keys, cache, "commonplace/B/2")).toBe(false);
    expect(subTreeHasContent(keys, cache, "commonplace/C")).toBe(false);
  });
  it("the blank subtree lists every descendant, deepest first", () => {
    expect(blankSubTree(keys, "commonplace/B/2")).toEqual(["commonplace/B/2/deep"]);
    expect(blankSubTree(keys, "commonplace/B")).toEqual(["commonplace/B/1", "commonplace/B/2/deep", "commonplace/B/2"]);
  });
});
describe("the buttons and the dialogs", () => {
  it("wording per namespace; a commonplace both hosts and is a sub-entry; a day's tag is only a sub-entry", () => {
    expect(subButtons("2026-09-07", null)).toMatchObject({ create: "+ tagged entry", canCreate: true, canEdit: false });
    expect(subButtons("2026-09-07", "Ideas")).toMatchObject({ canCreate: false, canEdit: true, renameTitle: "Rename this entry’s tag" });
    expect(subButtons("commonplace", "Books")).toMatchObject({ create: "+ sub-entry", canCreate: true, canEdit: true, renameTitle: "Rename this commonplace", deleteTitle: "Delete this commonplace" });
    // the shelves hold no books; a page called Shelves is a page
    expect(subButtons("bookshelf", "Shelves")).toMatchObject({ canCreate: false, canEdit: true });
    expect(subButtons("commonplace", "Shelves")).toMatchObject({ canCreate: true });
    expect(subButtons("bookshelf", "Dante/Inferno")).toMatchObject({ create: "+ book", renameTitle: "Rename this book" });
  });
  it("the Tag button's title names what the selection moves to", () => {
    expect(subButtons("2026-09-07", null).tagTitle).toBe("Move selection to a new tagged entry");
    expect(subButtons("commonplace", "Books").tagTitle).toBe("Move selection to a new sub-entry");
    expect(subButtons("bookshelf", "Dante").tagTitle).toBe("Move selection to a new book");
  });
  it("the prompt and the confirm lead with the noun", () => {
    expect(renamePrompt("2026-09-07", "Ideas", "Ideas")).toBe('Rename the tag "Ideas" to:');
    expect(renamePrompt("bookshelf", "Dante/Inferno", "Inferno")).toBe('Rename the book "Inferno" to:');
    expect(renamePrompt("commonplace", "Books", "Books")).toBe('Rename the commonplace "Books" to:');
    expect(deleteConfirm("2026-09-07", "Ideas", "Ideas")).toBe('Delete the entry "Ideas" for this day?');
    expect(deleteConfirm("commonplace", "Books/E", "E")).toBe('Delete the sub-entry "E"?');
  });
  it("an author is re-filed: the prompt says it files and sorts", () => {
    expect(renamePrompt("bookshelf", "C. P. Cavafy", "C. P. Cavafy")).toBe("File and sort “C. P. Cavafy” under:");
    expect(renamePrompt("bookshelf", "Milton, John", "John Milton")).toBe("File and sort “John Milton” under:");
  });
  it("a delete lands on the day, the parent, or today; the host is the day or the parent", () => {
    expect(deleteLanding("2026-09-07", "Ideas")).toEqual({ date: "2026-09-07", tag: null });
    expect(deleteLanding("commonplace", "Books/E")).toEqual({ date: "commonplace", tag: "Books" });
    expect(deleteLanding("commonplace", "Books").tag).toBeNull();
    expect(hostKey("2026-09-07", "Ideas")).toBe("2026-09-07");
    expect(hostKey("commonplace", "Books/E")).toBe("commonplace/Books");
    expect(hostKey("commonplace", "Books")).toBeNull();
  });
});

describe("the move's texts", () => {
  it("the move asks a place, naming the entry and what goes with it", () => {
    expect(movePrompt("commonplace", "Essays", "Essays")).toBe("Move the commonplace “Essays” and its sub-entries to:");
    expect(movePrompt("bookshelf", "Dante/Inferno", "Inferno")).toBe("Move the book “Inferno” and its books to:");
  });
  it("the confirm counts what moves, says where the text goes, and names each twin deleted", () => {
    expect(moveConfirm({ date: "commonplace", tag: "Essays", shown: "Essays" }, "bookshelf/Miller, Sean/Essays", { moved: 101, into: true, twins: ["On Growing Older"] }))
      .toBe("Move the commonplace “Essays” and its 101 sub-entries to bookshelf/Miller, Sean/Essays? Its own text goes after the text there. 1 sub-entry is there already by title and is deleted, its links going to the one there: “On Growing Older”.");
    expect(moveConfirm({ date: "commonplace", tag: "A", shown: "A" }, "commonplace/B", { moved: 1, into: false, twins: [] })).toBe("Move the commonplace “A” and its 1 sub-entry to commonplace/B?");
    expect(moveConfirm({ date: "commonplace", tag: "A", shown: "A" }, "commonplace/B", { moved: 0, into: true, twins: ["X", "Y"] })).toBe("Move the commonplace “A” to commonplace/B? Its own text goes after the text there. 2 sub-entries are there already by title and are deleted, their links going to the one there: “X”, “Y”.");
  });
  it("the outcome counts the entries, the twins, the pictures not found and the links, as the re-file does", () => {
    expect(movedText("commonplace/B", { moved: 3, twins: 1, lost: 2, updated: 4, left: [], stayed: [] })).toBe("moved to commonplace/B — 3 entries, 1 there already deleted, 2 pictures not found, links updated in 4 others");
    expect(movedText("commonplace/B", { moved: 1, twins: 0, lost: 0, updated: 0, left: ["commonplace/C"], stayed: ["commonplace/A"] })).toBe("moved to commonplace/B — 1 entry; 1 link not updated: commonplace/C; old copy kept: commonplace/A");
  });
});
