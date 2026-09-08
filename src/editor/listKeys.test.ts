// The gestures in a list, as commands over an editor state, in the row
// tests' shape: markdown in, a caret placed by a needle, the command, the
// markdown and caret out. The behaviour list is the README's "Enter" and
// "Tab" sections for lists (2026-09-07).
import { test, expect } from "vitest";
import { EditorState, TextSelection, type Command } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { enterInList, tabInList, shiftTabInList, listRefusal } from "./listKeys.ts";

function at(md: string, needle: string, offset = needle.length, to?: string): EditorState {
  const doc = parseMarkdown(md);
  const find = (n: string, off: number): number => {
    let pos = -1;
    doc.descendants((node, p) => {
      if (pos >= 0 || !node.isText) return pos < 0;
      const i = node.text!.indexOf(n);
      if (i >= 0) pos = p + i + off;
      return false;
    });
    if (pos < 0) throw new Error("needle not found: " + n);
    return pos;
  };
  const a = find(needle, offset);
  return EditorState.create({ doc, selection: TextSelection.create(doc, a, to ? find(to, to.length) : a) });
}
function run(cmd: Command, s: EditorState): EditorState {
  let next = s;
  if (!cmd(s, (tr) => { next = s.apply(tr); })) throw new Error("command refused");
  return next;
}
const refuses = (cmd: Command, s: EditorState): boolean => !cmd(s);
const md = (s: EditorState): string => serializeMarkdown(s.doc);
function caret(s: EditorState): string {
  const $c = s.selection.$from, p = $c.parent;
  return p.type.name + ":" + p.textBetween(0, $c.parentOffset) + "|" + p.textBetween($c.parentOffset, p.content.size);
}

test("Enter at the end of a bullet makes the next bullet, parallel to it", () => {
  const s = run(enterInList, at("- one\n- two", "one"));
  expect(md(s)).toBe("- one\n- \n- two");
  expect(caret(s)).toBe("paragraph:|");
});
test("Enter mid-item carries the rest into the new item; a numbered list keeps counting", () => {
  const s = run(enterInList, at("1. alpha beta\n2. gamma", "alpha "));
  expect(md(s)).toBe("1. alpha \n2. beta\n3. gamma");
  expect(caret(s)).toBe("paragraph:|beta");
});
test("Enter twice at the end of the last item steps out of the list into a paragraph", () => {
  const s = run(enterInList, at("- one\n- two", "two"));
  expect(md(s)).toBe("- one\n- two\n- ");
  const t = run(enterInList, s);
  expect(md(t)).toBe("- one\n- two");   /* the serializer writes no trailing empty paragraph */
  expect(t.doc.lastChild!.type.name).toBe("paragraph");
  expect(caret(t)).toBe("paragraph:|");
});
test("Enter outside a list is not this command's", () => {
  expect(refuses(enterInList, at("plain\n\n- one", "plain"))).toBe(true);
  expect(refuses(enterInList, at("::: verse\nline\n:::", "line"))).toBe(true);
});
test("Tab nests the item under the one above; Shift-Tab lifts it back out", () => {
  const s = run(tabInList, at("- one\n- two\n- three", "two"));
  expect(md(s)).toBe("- one\n  - two\n- three");
  expect(caret(s)).toBe("paragraph:two|");
  const t = run(shiftTabInList, s);
  expect(md(t)).toBe("- one\n- two\n- three");
});
test("Tab on the first item, or one already nested under its neighbour, refuses and says why", () => {
  expect(refuses(tabInList, at("- one\n- two", "one"))).toBe(true);
  expect(listRefusal(at("- one\n- two", "one"), false)).toBe("can't indent the first item in a list");
  const nested = at("- one\n  - two\n- three", "two");
  expect(refuses(tabInList, nested)).toBe(true);
  expect(listRefusal(nested, false)).toBe("can't indent an item more than one deeper than its parent");
});
test("Shift-Tab at the outermost level does nothing and says so", () => {
  const s = at("- one\n- two", "two");
  expect(refuses(shiftTabInList, s)).toBe(true);
  expect(listRefusal(s, true)).toBe("at the outer level");
});
test("several selected items move together, and the ones below an outdented item follow it", () => {
  const s = run(tabInList, at("- one\n- two\n- three\n- four", "two", 0, "three"));
  expect(md(s)).toBe("- one\n  - two\n  - three\n- four");
  const t = run(shiftTabInList, at("- one\n  - two\n  - three\n- four", "two"));
  expect(md(t)).toBe("- one\n- two\n  - three\n- four");
});
