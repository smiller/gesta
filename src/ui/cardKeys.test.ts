import { describe, it, expect } from "vitest";
import { listKey, enterKey, holdsFocus, focusLeaves } from "./cardKeys.ts";

const key = (k: string, mods: Partial<{ shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean; isComposing: boolean }> = {}) =>
  ({ key: k, shiftKey: false, metaKey: false, ctrlKey: false, altKey: false, isComposing: false, ...mods });

describe("a key in a list", () => {
  it("Enter picks, with or without a modifier", () => {
    expect(listKey(key("Enter"))).toBe("enter");
    expect(listKey(key("Enter", { shiftKey: true }))).toBe("enter");
  });
  it("Enter while a composition is open commits the composition and picks nothing", () => {
    expect(listKey(key("Enter", { isComposing: true }))).toBeNull();
  });
  it("the arrows walk down and up; with a modifier, or any other key, nothing", () => {
    expect(listKey(key("ArrowDown"))).toBe(1);
    expect(listKey(key("ArrowUp"))).toBe(-1);
    for (const m of ["shiftKey", "metaKey", "ctrlKey", "altKey"] as const) expect(listKey(key("ArrowDown", { [m]: true }))).toBeNull();
    expect(listKey(key("a"))).toBeNull();
  });
});

describe("a key in a bar's field", () => {
  it("Enter acts, but not while a composition is open", () => {
    expect(enterKey({ key: "Enter", isComposing: false })).toBe(true);
    expect(enterKey({ key: "Enter", isComposing: true })).toBe(false);
    expect(enterKey({ key: "a", isComposing: false })).toBe(false);
  });
  it("a press on the bar holds the focus where it is, but a field or its label takes it", () => {
    expect(holdsFocus("DIV")).toBe(true);
    expect(holdsFocus("BUTTON")).toBe(true);
    expect(holdsFocus("INPUT")).toBe(false);
    expect(holdsFocus("LABEL")).toBe(false);
  });
});

describe("focus leaving a card", () => {
  it("to somewhere outside it leaves; inside it stays", () => {
    expect(focusLeaves(false, true)).toBe(true);
    expect(focusLeaves(true, true)).toBe(false);
  });
  it("to nowhere leaves only where nowhere is a leaving", () => {
    expect(focusLeaves(null, true)).toBe(true);
    expect(focusLeaves(null, false)).toBe(false);
  });
});
