import { describe, it, expect } from "vitest";
import { heldKeys, plainChord } from "./heldKeys.ts";

const key = (code: string, more: Partial<KeyboardEvent> = {}) => ({ code, repeat: false, ctrlKey: false, metaKey: false, ...more });

describe("heldKeys", () => {
  it("a first press is never swallowed, and records where the keys were", () => {
    const held = heldKeys();
    expect(held.swallows(key("Enter"), "input")).toBe(false);
  });
  it("a repeat is swallowed once the keys have moved since its press", () => {
    const held = heldKeys();
    held.swallows(key("Enter"), "input");
    expect(held.swallows(key("Enter", { repeat: true }), "input")).toBe(false);
    expect(held.swallows(key("Enter", { repeat: true }), "editor")).toBe(true);
  });
  it("a repeated ⌃⌘ chord is always swallowed", () => {
    const held = heldKeys();
    held.swallows(key("Period", { ctrlKey: true, metaKey: true }), "editor");
    expect(held.swallows(key("Period", { repeat: true, ctrlKey: true, metaKey: true }), "editor")).toBe(true);
  });
  it("a repeat of a key released or forgotten is not swallowed", () => {
    const held = heldKeys();
    held.swallows(key("Digit1"), "card");
    held.release("Digit1");
    expect(held.swallows(key("Digit1", { repeat: true }), "editor")).toBe(false);
    held.swallows(key("Digit2"), "card");
    held.clear();
    expect(held.swallows(key("Digit2", { repeat: true }), "editor")).toBe(false);
  });
});

describe("plainChord", () => {
  it("is ⌃⌘ with neither Shift nor Option", () => {
    const chord = { ctrlKey: true, metaKey: true, shiftKey: false, altKey: false };
    expect(plainChord(chord)).toBe(true);
    expect(plainChord({ ...chord, shiftKey: true })).toBe(false);
    expect(plainChord({ ...chord, altKey: true })).toBe(false);
    expect(plainChord({ ...chord, metaKey: false })).toBe(false);
  });
});
