import { describe, it, expect } from "vitest";
import { listKey, stepped, enterKey, holdsFocus, focusLeaves } from "./pickKeys.ts";

const key = (k: string, mods: Partial<{ shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean; isComposing: boolean }> = {}) =>
  ({ key: k, shiftKey: false, metaKey: false, ctrlKey: false, altKey: false, isComposing: false, ...mods });

describe("a key in a list", () => {
  it("Enter picks, with or without a modifier", () => {
    expect(listKey(key("Enter"))).toBe("enter");
    expect(listKey(key("Enter", { shiftKey: true }))).toBe("enter");
  });
  it("while a composition is open no key acts on the list: Enter commits it, the arrows choose its candidates", () => {
    expect(listKey(key("Enter", { isComposing: true }))).toBeNull();
    expect(listKey(key("ArrowDown", { isComposing: true }))).toBeNull();
    expect(listKey(key("ArrowUp", { isComposing: true }))).toBeNull();
  });
  it("the arrows walk down and up; with a modifier, or any other key, nothing", () => {
    expect(listKey(key("ArrowDown"))).toBe(1);
    expect(listKey(key("ArrowUp"))).toBe(-1);
    for (const m of ["shiftKey", "metaKey", "ctrlKey", "altKey"] as const) expect(listKey(key("ArrowDown", { [m]: true }))).toBeNull();
    expect(listKey(key("a"))).toBeNull();
  });
});

describe("a key in a toolbar's field", () => {
  it("Enter acts, but not while a composition is open", () => {
    expect(enterKey({ key: "Enter", isComposing: false })).toBe(true);
    expect(enterKey({ key: "Enter", isComposing: true })).toBe(false);
    expect(enterKey({ key: "a", isComposing: false })).toBe(false);
  });
  it("a press on the toolbar holds the focus where it is, but a field or its label takes it", () => {
    expect(holdsFocus("DIV")).toBe(true);
    expect(holdsFocus("BUTTON")).toBe(true);
    expect(holdsFocus("INPUT")).toBe(false);
    expect(holdsFocus("LABEL")).toBe(false);
  });
});

describe("focus leaving a panel", () => {
  it("to somewhere outside it leaves; inside it stays", () => {
    expect(focusLeaves(false, true)).toBe(true);
    expect(focusLeaves(true, true)).toBe(false);
  });
  it("to nowhere leaves only where nowhere is a leaving", () => {
    expect(focusLeaves(null, true)).toBe(true);
    expect(focusLeaves(null, false)).toBe(false);
  });
});

describe("a list's walk", () => {
  it("Home and End go to a list's ends only where the list holds the focus itself; in a text box they are the box's", () => {
    expect(listKey(key("Home"), true)).toBe("home");
    expect(listKey(key("End"), true)).toBe("end");
    expect(listKey(key("Home"))).toBeNull();
    expect(listKey(key("End"))).toBeNull();
  });
  it("steps wrap at either end, go to the first or the last, and stay put in an empty list", () => {
    expect([stepped(4, 1, 5), stepped(0, -1, 5), stepped(2, "home", 5), stepped(2, "end", 5), stepped(0, 1, 0)]).toEqual([0, 4, 0, 4, 0]);
  });
});
