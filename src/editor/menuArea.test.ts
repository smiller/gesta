import { describe, it, expect } from "vitest";
import { menuArea, menuAreaFor, MENU_AREA_FROM, type LayoutPort } from "./menuArea.ts";

function world(width = 1280, drawnLeft: number | null = 46) {
  const log: string[] = [];
  const layout: LayoutPort = { width: () => width, drawnLeft: () => drawnLeft, write: (px) => log.push("written " + px) };
  const area = menuArea(layout, { hold: () => log.push("place held") });
  area.onChange(() => log.push("told"));
  return { area, log };
}

describe("the menu area's width", () => {
  it("is the menu's right edge and a gap, where the menu would cover what is drawn and the window is wide enough; none otherwise", () => {
    expect(menuAreaFor({ menuRight: 269, textLeft: 46, width: 1280 })).toBe(285);
    expect(menuAreaFor({ menuRight: 269, textLeft: 284, width: 1280 })).toBe(0);
    expect(menuAreaFor({ menuRight: 269, textLeft: 24, width: MENU_AREA_FROM - 1 })).toBe(0);
    expect(menuAreaFor({ menuRight: 269, textLeft: 24, width: MENU_AREA_FROM })).toBe(285);
  });
});

describe("a menu area opened and closed", () => {
  it("holds the reading place, then writes the root, then tells the layout, once each", () => {
    const w = world();
    w.area.open(272);
    expect(w.log).toEqual(["place held", "written 288", "told"]);
    expect(w.area.width()).toBe(288);
    w.area.close();
    expect(w.log.slice(3)).toEqual(["place held", "written 0", "told"]);
    expect(w.area.width()).toBe(0);
  });
  it("where the menu covers nothing, or the window is narrow, or nothing is drawn, changes nothing and tells no one", () => {
    for (const w of [world(1280, 300), world(860, 24), world(1280, null)]) {
      w.area.open(272);
      w.area.close();
      expect(w.log).toEqual([]);
    }
  });
  it("a listener taken off is told no more", () => {
    const w = world(), heard: string[] = [];
    const off = w.area.onChange(() => heard.push("heard"));
    w.area.open(272);
    off();
    w.area.close();
    expect(heard).toEqual(["heard"]);
  });
});
