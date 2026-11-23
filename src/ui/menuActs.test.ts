import { describe, it, expect } from "vitest";
import { menuActs, type MenuDeps } from "./menuActs.ts";
import type { MenuRow } from "./mastheadModel.ts";

const ROWS: Record<string, MenuRow[]> = {
  bookshelf: [{ text: "Latin", href: "", shelf: true }, { text: "Horace", href: "#bookshelf/Horace", shelved: true }, { text: "Ovid", href: "#bookshelf/Ovid", shelved: true }],
  commonplace: [{ text: "Books", href: "#commonplace/Books" }, { text: "Recipes", href: "#commonplace/Recipes" }],
};
const key = (k: string) => ({ key: k, shiftKey: false, metaKey: false, ctrlKey: false, altKey: false, isComposing: false });

function world(focusAt: string = "text") {
  const log: string[] = [];
  let focus = focusAt;
  const screen = { opened: null as string | null, menuRows: [] as MenuRow[], menuEmpty: "", menu: { sel: -1 } };
  const deps: MenuDeps = {
    screen: screen as MenuDeps["screen"],
    answer: (name) => ({ rows: ROWS[name], empty: "" }),
    readOnly: false,
    flush: () => log.push("flush"),
    overlay: () => log.push("rows closed"),
    focus: { here: () => focus as unknown as Element, back: (was) => { focus = String(was); log.push("focus back to " + String(was)); } },
    area: { open: (right) => log.push("menu area for " + right), close: () => log.push("menu area closed") },
    go: (href) => log.push("go " + href),
    act: (name, act) => log.push(act + " in " + name),
  };
  const menus = menuActs(deps);
  const takeFocus = (): void => { focus = "menu"; };
  return { menus, screen, log, takeFocus, focusNow: () => focus };
}

describe("a menu opened", () => {
  it("shows its rows, the first item selected, the text saved first and the masthead rows closed, the focus where it stood read before the menu takes it", () => {
    const w = world();
    w.menus.open("bookshelf");
    expect(w.screen).toMatchObject({ opened: "bookshelf", menuRows: ROWS.bookshelf, menu: { sel: 0 } });
    expect(w.log).toEqual(["rows closed", "flush"]);
    w.takeFocus();
    w.menus.close("escape");
    expect(w.focusNow()).toBe("text");
  });
  it("opens its menu area once it is drawn, and closes it on any close", () => {
    const w = world();
    w.menus.open("bookshelf");
    w.menus.mounted(272);
    w.menus.close("outside");
    expect(w.log.slice(2)).toEqual(["menu area for 272", "menu area closed"]);
  });
});

describe("keys and the pointer in an open menu", () => {
  it("walk the items, a shelf's heading passed over; letters go to a name; the pointer moves the one highlight", () => {
    const w = world();
    w.menus.open("bookshelf");
    expect(w.menus.key(key("ArrowDown"))).toBe(true);
    expect(w.screen.menu.sel).toBe(1);
    w.menus.key(key("End"));
    expect(w.screen.menu.sel).toBe(3);
    w.menus.key(key("h"));
    expect(w.screen.menu.sel).toBe(0);
    w.menus.hover(2);
    expect(w.screen.menu.sel).toBe(2);
    expect(w.menus.key(key("F5"))).toBe(false);
  });
  it("Enter on a row goes there and on an act does it, the menu closed and no focus given back", () => {
    const w = world();
    w.menus.open("bookshelf");
    w.takeFocus();
    w.menus.key(key("ArrowDown"));
    w.menus.key(key("Enter"));
    expect(w.log.slice(-2)).toEqual(["menu area closed", "go #bookshelf/Ovid"]);
    expect([w.screen.opened, w.focusNow()]).toEqual([null, "menu"]);
    w.menus.open("bookshelf");
    w.menus.key(key("End"));
    w.menus.key(key("Enter"));
    expect(w.log.at(-1)).toBe("shelves in bookshelf");
  });
  it("Escape and Tab close the menu, the focus back where it stood", () => {
    for (const k of ["Escape", "Tab"]) {
      const w = world();
      w.menus.open("commonplace");
      w.takeFocus();
      w.menus.key(key(k));
      expect([w.screen.opened, w.focusNow()]).toEqual([null, "text"]);
    }
  });
});

describe("closing", () => {
  it("gives the focus back or not by the reason: a key, the icon, a resize or something opened over it gives it back; a choice, a click, the focus leaving or a navigation does not", () => {
    const back = (reason: Parameters<ReturnType<typeof menuActs>["close"]>[0]): string => {
      const w = world();
      w.menus.open("bookshelf");
      w.takeFocus();
      w.menus.close(reason);
      return w.focusNow();
    };
    expect(["escape", "tab", "icon", "resize", "displaced"].map((r) => back(r as never))).toEqual(["text", "text", "text", "text", "text"]);
    expect(["chosen", "outside", "left", "navigated"].map((r) => back(r as never))).toEqual(["menu", "menu", "menu", "menu"]);
  });
  it("with no menu open does nothing, and never clears a slot a panel has taken", () => {
    const w = world();
    w.menus.close("left");
    expect(w.log).toEqual([]);
    w.menus.open("bookshelf");
    w.screen.opened = "help";
    w.menus.close("left");
    expect(w.screen.opened).toBe("help");
  });
});

describe("the other menu's icon over an open menu", () => {
  it("opens the other afresh, its first item selected, the focus to give back still the one before the first menu", () => {
    const w = world();
    w.menus.open("bookshelf");
    w.takeFocus();
    w.menus.key(key("End"));
    w.menus.key(key("r"));
    w.menus.open("commonplace");
    expect(w.screen).toMatchObject({ opened: "commonplace", menuRows: ROWS.commonplace, menu: { sel: 0 } });
    w.menus.key(key("r"));
    expect(w.screen.menu.sel).toBe(1);
    w.menus.close("escape");
    expect(w.focusNow()).toBe("text");
  });
});
