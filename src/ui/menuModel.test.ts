import { describe, it, expect } from "vitest";
import { menuItems, menuKey, typedAhead, menuActs, isMenu, handsFocusBack, CLOSE_REASONS, reasonOpened, jRound } from "./menuModel.ts";
import type { MenuRow } from "./mastheadModel.ts";

const SHELVED: MenuRow[] = [
  { text: "Latin", href: "", shelf: true }, { text: "Horace", href: "#bookshelf/Horace", shelved: true }, { text: "Ovid", href: "#bookshelf/Ovid", shelved: true },
  { text: "English", href: "", shelf: true }, { text: "John Milton", href: "#bookshelf/Milton, John", shelved: true },
];
const ACTS = ["New author…", "Shelves…"];
const key = (k: string, mods: Partial<{ shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean; isComposing: boolean }> = {}) =>
  ({ key: k, shiftKey: false, metaKey: false, ctrlKey: false, altKey: false, isComposing: false, ...mods });

describe("a menu's items", () => {
  it("are its rows a reader can go to, in order, then its acts; a shelf's heading is none", () => {
    const items = menuItems(SHELVED, ACTS);
    expect(items.map((i) => i.text)).toEqual(["Horace", "Ovid", "John Milton", "New author…", "Shelves…"]);
    expect(items.map((i) => i.row)).toEqual([1, 2, 4, null, null]);
    expect(items.map((i) => i.act)).toEqual([null, null, null, 0, 1]);
  });
});

describe("a key in an open menu", () => {
  const n = menuItems(SHELVED, ACTS).length;
  it("↓ and ↑ walk the items and wrap at either end", () => {
    expect(menuKey(key("ArrowDown"), 0, n)).toEqual({ sel: 1 });
    expect(menuKey(key("ArrowDown"), n - 1, n)).toEqual({ sel: 0 });
    expect(menuKey(key("ArrowUp"), 0, n)).toEqual({ sel: n - 1 });
  });
  it("a key read from an event whose fields are its prototype's, as a browser's are, walks as a plain one does", () => {
    class Proto { get key() { return "End"; } get shiftKey() { return true; } get metaKey() { return false; } get ctrlKey() { return false; } get altKey() { return false; } get isComposing() { return false; } }
    expect(menuKey(new Proto(), 0, n)).toEqual({ sel: n - 1 });
  });
  it("a held Shift walks as the bare key does", () => {
    expect(menuKey(key("ArrowDown", { shiftKey: true }), 0, n)).toEqual({ sel: 1 });
    expect(menuKey(key("End", { shiftKey: true }), 0, n)).toEqual({ sel: n - 1 });
  });
  it("Home and End go to the first and the last item", () => {
    expect(menuKey(key("Home"), 3, n)).toEqual({ sel: 0 });
    expect(menuKey(key("End"), 0, n)).toEqual({ sel: n - 1 });
  });
  it("Enter chooses the selected item; Escape and Tab close the menu, each named as the reason", () => {
    expect(menuKey(key("Enter"), 2, n)).toEqual({ choose: 2 });
    expect(menuKey(key("Escape"), 2, n)).toEqual({ close: "escape" });
    expect(menuKey(key("Tab"), 2, n)).toEqual({ close: "tab" });
    expect(menuKey(key("Tab", { shiftKey: true }), 2, n)).toEqual({ close: "tab" });
  });
  it("a letter is typed toward an item; a chord, a composing key and any other key are not the menu's", () => {
    expect(menuKey(key("m"), 0, n)).toEqual({ typed: "m" });
    expect(menuKey(key("m", { metaKey: true }), 0, n)).toBeNull();
    expect(menuKey(key("ArrowDown", { ctrlKey: true, metaKey: true }), 0, n)).toBeNull();
    expect(menuKey(key("m", { isComposing: true }), 0, n)).toBeNull();
    expect(menuKey(key("F5"), 0, n)).toBeNull();
  });
});

describe("letters typed toward an item", () => {
  const items = menuItems(SHELVED, ACTS);
  it("go to the first item with a word starting so, case and accents aside, the letters a second apart at most making one string", () => {
    const m = typedAhead({ buf: "", at: 0 }, "m", 1000, items);
    expect(m).toEqual({ buf: "m", at: 1000, sel: 2 });
    expect(typedAhead(m, "i", 1500, items)).toEqual({ buf: "mi", at: 1500, sel: 2 });
    expect(typedAhead(m, "o", 2500, items)).toEqual({ buf: "o", at: 2500, sel: 1 });
    expect(typedAhead({ buf: "", at: 0 }, "S", 1000, items).sel).toBe(4);
    expect(typedAhead({ buf: "", at: 0 }, "e", 1000, menuItems([{ text: "Édouard", href: "#x" }], [])).sel).toBe(0);
  });
  it("pass over a small word inside a name, of, the, at and the like, but not one the name begins with", () => {
    const names = menuItems([{ text: "Hildegard of Bingen", href: "#h" }, { text: "Ovid", href: "#o" }, { text: "The Fight at Finnsburh", href: "#f" }, { text: "Alcuin", href: "#a" }], []);
    expect(typedAhead({ buf: "", at: 0 }, "o", 1000, names).sel).toBe(1);
    expect(typedAhead({ buf: "", at: 0 }, "t", 1000, names).sel).toBe(2);
    expect(typedAhead({ buf: "", at: 0 }, "a", 1000, names).sel).toBe(3);
  });
  it("matching nothing, keep the selection where it is", () => {
    expect(typedAhead({ buf: "", at: 0 }, "z", 1000, items).sel).toBeNull();
  });
});

describe("a menu's acts", () => {
  it("are named by what they do, so their order is the menu's alone; a read-only page has none", () => {
    expect(menuActs("bookshelf", false)).toEqual([{ text: "New author…", act: "new" }, { text: "Shelves…", act: "shelves" }]);
    expect(menuActs("commonplace", false)).toEqual([{ text: "New commonplace…", act: "new" }]);
    expect(menuActs("bookshelf", true)).toEqual([]);
  });
});

describe("what is a menu, and the focus it gives back", () => {
  it("the bookshelf and the commonplaces are menus; a panel or nothing is none", () => {
    expect(["bookshelf", "commonplace", "help", "backups", null].map(isMenu)).toEqual([true, true, false, false, false]);
  });
  it("a menu closed by a key, its icon, a resize, something opened over it, its focus going nowhere or a choice that goes nowhere gives the focus back; one closed by a choice that goes, a click into something, the focus taken or a navigation does not", () => {
    expect(CLOSE_REASONS.filter(handsFocusBack)).toEqual(["escape", "tab", "icon", "resize", "displaced", "lost", "stayed"]);
    expect(CLOSE_REASONS.filter((r) => !handsFocusBack(r))).toEqual(["chosen", "outside", "left", "navigated"]);
  });
});

describe("a menu closed by something opened", () => {
  it("is closed by Escape as Escape, by a navigation, a view switched or an arrival as a navigation, by anything else as displaced", () => {
    expect((["escape", "navigated", "view", "sourceView", "here", "search", "help", "gotoToolbar"] as const).map(reasonOpened)).toEqual(["escape", "navigated", "navigated", "navigated", "navigated", "displaced", "displaced", "displaced"]);
  });
});

describe("⌃⌘J's round", () => {
  it("goes from nothing open to the bookshelf menu, then the commonplace menu, then the Go to row, then nothing", () => {
    expect(jRound(null, false)).toBe("bookshelf");
    expect(jRound("bookshelf", false)).toBe("commonplace");
    expect(jRound("commonplace", false)).toBe("goto");
    expect(jRound(null, true)).toBe("none");
  });
  it("starts at the bookshelf menu from an open panel", () => {
    expect((["help", "bookmarks", "shortcuts", "backups"] as const).map((p) => jRound(p, false))).toEqual(["bookshelf", "bookshelf", "bookshelf", "bookshelf"]);
  });
});
