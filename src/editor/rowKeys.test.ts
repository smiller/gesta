// The gestures under a verse or prose fence, as commands over an editor
// state: Enter, Backspace, Delete, Tab and the typed pipe. Each case is
// markdown in, a caret placed by a needle, the command, and the markdown and
// caret out. The behaviour list is tests.html's "Enter on a verse page"
// (2026-09-07) plus what the pipe and the pair's Backspace add.
import { test, expect } from "vitest";
import { EditorState, TextSelection, NodeSelection, type Command } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { schema } from "../model/schema.ts";
import { enterInRow, backspaceInRow, deleteInRow, tabInRow, shiftTabInRow, pipeInLine } from "./rowKeys.ts";

/* a state with the caret placed `offset` characters into the first text
   holding `needle` (its end when omitted) */
function at(md: string, needle: string, offset = needle.length): EditorState {
  const doc = parseMarkdown(md);
  let pos = -1;
  doc.descendants((node, p) => {
    if (pos >= 0 || !node.isText) return pos < 0;
    const i = node.text!.indexOf(needle);
    if (i >= 0) pos = p + i + offset;
    return false;
  });
  if (pos < 0) throw new Error("needle not found: " + needle);
  return EditorState.create({ doc, selection: TextSelection.create(doc, pos) });
}
function run(cmd: Command, s: EditorState): EditorState {
  let next = s;
  const ok = cmd(s, (tr) => { next = s.apply(tr); });
  if (!ok) throw new Error("command refused");
  return next;
}
const refuses = (cmd: Command, s: EditorState): boolean => !cmd(s);
const md = (s: EditorState): string => serializeMarkdown(s.doc);
/* where the caret is: its textblock's type, the text before it, a bar, the text after */
function caret(s: EditorState): string {
  const $c = s.selection.$from, p = $c.parent;
  return p.type.name + ":" + p.textBetween(0, $c.parentOffset) + "|" + p.textBetween($c.parentOffset, p.content.size);
}
const type = (s: EditorState, text: string): EditorState => s.apply(s.tr.insertText(text));

test("Enter mid-line splits it into two lines, the caret before the text that moved", () => {
  const s = run(enterInRow, at("::: verse\nalpha\nbeta\ngamma\n:::", "be"));
  expect(md(s)).toBe("::: verse\nalpha\nbe\nta\ngamma\n:::");
  expect(caret(s)).toBe("line:|ta");
  expect(md(type(s, "X"))).toBe("::: verse\nalpha\nbe\nXta\ngamma\n:::");
  expect(s.doc.childCount).toBe(1);
});

test("Enter at the end of the last line makes an empty line; a second Enter takes it away and steps out to a paragraph", () => {
  const one = run(enterInRow, at("::: verse\nalpha\nbeta\n:::", "beta"));
  expect(one.doc.firstChild!.childCount).toBe(3);
  expect(caret(one)).toBe("line:|");
  const two = run(enterInRow, one);
  expect(two.doc.firstChild!.childCount).toBe(2);
  expect(two.doc.childCount).toBe(2);
  expect(two.doc.lastChild!.type.name).toBe("paragraph");
  expect(caret(two)).toBe("paragraph:|");
  expect(md(type(two, "after"))).toBe("::: verse\nalpha\nbeta\n:::\n\nafter");
});

test("Enter on an empty line mid-block makes a stanza break and a fresh line", () => {
  const s = run(enterInRow, run(enterInRow, at("::: verse\nalpha\nbeta\n:::", "alpha")));
  const kinds = (st: EditorState): string[] => { const k: string[] = []; st.doc.firstChild!.forEach((n) => { k.push(n.type.name); }); return k; };
  expect(kinds(s)).toEqual(["line", "gap", "line", "line"]);
  expect(caret(s)).toBe("line:|");
  expect(md(type(s, "new"))).toBe("::: verse\nalpha\n\nnew\nbeta\n:::");
});

test("a ⟨line⟩ row keeps its kind on a mid-split and hands none to a line made at its end", () => {
  const mid = run(enterInRow, at("::: verse\n⟨line⟩*Flower o’ the broom,*\n:::", "Flower"));
  /* the cell trims its edges when written, as the grammar always has */
  expect(md(mid)).toBe("::: verse\n⟨line⟩*Flower*\n⟨line⟩*o’ the broom,*\n:::");
  const end = run(enterInRow, at("::: verse\n⟨line⟩*sung*\nx\n:::", "sung"));
  expect(end.doc.firstChild!.child(1).attrs.kind).toBe(null);
});

test("Enter in a paired row splits the caret's cell and carries the rest to a new row", () => {
  const a = run(enterInRow, at("::: verse\nalpha | one\nbeta | two\n:::", "al"));
  expect(md(a)).toBe("::: verse\nal | one\npha |\nbeta | two\n:::");
  expect(caret(a)).toBe("cell:|pha");
  const b = run(enterInRow, at("::: verse\nalpha | one\n:::", "o", 1));
  expect(md(b)).toBe("::: verse\nalpha | o\n | ne\n:::");
  expect(caret(b)).toBe("cell:|ne");
  const end = run(enterInRow, at("::: verse\nalpha | one\n:::", "one"));
  expect(md(end)).toBe("::: verse\nalpha | one\n |\n:::");
  expect(caret(end)).toBe("cell:|");
  expect(end.selection.$from.index(end.selection.$from.depth - 1)).toBe(0);
});

test("an empty paired row is no trap: a second Enter at the block's end steps out, mid-block it is a break", () => {
  const out = run(enterInRow, run(enterInRow, at("::: verse\na | b\nc | d\n:::", "d")));
  expect(md(out)).toBe("::: verse\na | b\nc | d\n:::");
  expect(out.doc.lastChild!.type.name).toBe("paragraph");
  const mid = run(enterInRow, run(enterInRow, at("::: prose\na | b\nc | d\n:::", "b")));
  expect(md(type(mid, "x"))).toBe("::: prose\na | b\n\nx |\nc | d\n:::");
});

test("Enter with a stanza gap selected makes a line after it", () => {
  const base = at("::: verse\na\n\nb\n:::", "a");
  const s0 = base.apply(base.tr.setSelection(NodeSelection.create(base.doc, 4)));
  expect(s0.selection instanceof NodeSelection && s0.selection.node.type.name).toBe("gap");
  const s = run(enterInRow, s0);
  expect(md(type(s, "x"))).toBe("::: verse\na\n\nx\nb\n:::");
});

test("Enter is not the row's outside a fence, or in a note's paragraph inside one", () => {
  expect(refuses(enterInRow, at("plain text", "plain"))).toBe(true);
  expect(refuses(enterInRow, at("::: verse\na\n::: note\ngloss\n:::\n:::", "gloss"))).toBe(true);
});

test("a typed pipe in a line puts the translation beside it, caret in the new cell", () => {
  const s = run(pipeInLine, at("::: verse\nalpha beta\n:::", "alpha "));
  expect(md(s)).toBe("::: verse\nalpha | beta\n:::");
  expect(caret(s)).toBe("cell:|beta");
  expect(md(run(pipeInLine, at("::: verse\nalpha\n:::", "alpha")))).toBe("::: verse\nalpha |\n:::");
  expect(refuses(pipeInLine, at("::: verse\nalpha | beta\n:::", "beta"))).toBe(true);
  expect(refuses(pipeInLine, at("a | b in prose", "in"))).toBe(true);
  expect(md(type(at("::: verse\nalpha | beta\n:::", "beta"), "|"))).toBe("::: verse\nalpha | beta\\|\n:::");
});

test("Backspace at a translation's start takes the pipe out: the pair is a line again", () => {
  const s = run(backspaceInRow, at("::: verse\nalpha | beta\n:::", "beta", 0));
  expect(md(s)).toBe("::: verse\nalphabeta\n:::");
  expect(caret(s)).toBe("line:alpha|beta");
  expect(refuses(backspaceInRow, at("::: verse\nalpha | beta\n:::", "beta", 2))).toBe(true);
});

test("Backspace at a row's start: a gap above comes out, a line above joins, another shape only takes the caret", () => {
  expect(md(run(backspaceInRow, at("::: verse\na\n\nb\n:::", "b", 0)))).toBe("::: verse\na\nb\n:::");
  const joined = run(backspaceInRow, at("::: verse\nalpha\nbeta\n:::", "beta", 0));
  expect(md(joined)).toBe("::: verse\nalphabeta\n:::");
  expect(caret(joined)).toBe("line:alpha|beta");
  const moved = run(backspaceInRow, at("::: verse\na | b\nc\n:::", "c", 0));
  expect(md(moved)).toBe("::: verse\na | b\nc\n:::");
  expect(caret(moved)).toBe("cell:b|");
  const first = run(backspaceInRow, at("# Title\n\n::: verse\na\n:::", "a", 0));
  expect(md(first)).toBe("# Title\n\n::: verse\na\n:::");
  expect(caret(first)).toBe("line:|a");
});

test("Delete at a cell's end takes the pipe out; at a row's end it mirrors Backspace", () => {
  const un = run(deleteInRow, at("::: verse\nalpha | beta\n:::", "alpha"));
  expect(md(un)).toBe("::: verse\nalphabeta\n:::");
  expect(caret(un)).toBe("line:alpha|beta");
  expect(md(run(deleteInRow, at("::: verse\na\n\nb\n:::", "a")))).toBe("::: verse\na\nb\n:::");
  expect(md(run(deleteInRow, at("::: verse\nalpha\nbeta\n:::", "alpha")))).toBe("::: verse\nalphabeta\n:::");
  const last = run(deleteInRow, at("::: verse\na\n:::\n\nafter", "a"));
  expect(md(last)).toBe("::: verse\na\n:::\n\nafter");
  expect(refuses(deleteInRow, at("::: verse\nalpha\n:::", "al"))).toBe(true);
});

test("Tab moves from the original to its translation and Shift-Tab back; in a line both are consumed", () => {
  const b = run(tabInRow, at("::: verse\nalpha | beta\n:::", "al"));
  expect(caret(b)).toBe("cell:|beta");
  expect(caret(run(shiftTabInRow, b))).toBe("cell:alpha|");
  const line = at("::: verse\nalpha\n:::", "al");
  expect(run(tabInRow, line).doc).toBe(line.doc);
  expect(refuses(tabInRow, at("plain", "pl"))).toBe(true);
});
