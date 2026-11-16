import { test, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { enterDown } from "./tableKeys.ts";

/* the caret after the needle */
function caret(md: string, needle: string): EditorState {
  const doc = parseMarkdown(md);
  let pos = -1;
  doc.descendants((node, p) => { if (pos < 0 && node.text?.includes(needle)) pos = p + node.text!.indexOf(needle) + needle.length; return pos < 0; });
  if (pos < 0) throw new Error(needle);
  return EditorState.create({ doc, selection: TextSelection.create(doc, pos) });
}
const enter = (s: EditorState): EditorState => { let n = s; if (!enterDown(s, (tr) => { n = s.apply(tr); })) throw new Error("declined"); return n; };
const textAndOffset = (s: EditorState): [string, number] => [s.selection.$head.parent.textContent, s.selection.$head.parentOffset];
const TABLE = "| a | b |\n| --- | --- |\n| 1 | 2 |\n| 3 |  |";

test("Enter in a cell goes to the end of the cell below it, the table unchanged", () => {
  expect(textAndOffset(enter(caret(TABLE, "b")))).toEqual(["2", 1]);
  const down = enter(caret(TABLE, "1"));
  expect(textAndOffset(down)).toEqual(["3", 1]);
  expect(serializeMarkdown(down.doc)).toBe(TABLE);
  expect(down.selection.$head.parent.type.name).toBe("table_cell");
});
test("Enter in a last-row cell leaves the table: into the line after it, or a new empty one when what follows is not a line of text", () => {
  const out = enter(caret(TABLE + "\n\nafter", "3"));
  expect(textAndOffset(out)).toEqual(["after", 0]);
  expect(serializeMarkdown(out.doc)).toBe(TABLE + "\n\nafter");
  const made = enter(caret(TABLE + "\n\n- item", "3"));
  expect(textAndOffset(made)).toEqual(["", 0]);
  expect(made.selection.$head.parent.type.name).toBe("paragraph");
  expect(made.doc.childCount).toBe(3);
  const last = enter(caret(TABLE, "3"));
  expect(last.doc.lastChild!.type.name).toBe("paragraph");
  expect(textAndOffset(last)).toEqual(["", 0]);
});
test("Enter in a quoted table's last row leaves into the quote, not out of it", () => {
  const out = enter(caret("> | a |\n> | --- |\n> | 1 |", "1"));
  expect(out.selection.$head.node(1).type.name).toBe("blockquote");
  expect(textAndOffset(out)).toEqual(["", 0]);
});
test("Enter over a selection in a cell deletes it, then goes a cell down; a selection from outside the table is not this command's", () => {
  const s = caret(TABLE, "1"), sel = s.apply(s.tr.setSelection(TextSelection.create(s.doc, s.selection.head - 1, s.selection.head)));
  const down = enter(sel);
  expect(serializeMarkdown(down.doc)).toBe("| a | b |\n| --- | --- |\n|  | 2 |\n| 3 |  |");
  expect(textAndOffset(down)).toEqual(["3", 1]);
  const from = caret("before\n\n" + TABLE, "1"), across = from.apply(from.tr.setSelection(TextSelection.create(from.doc, 2, from.selection.head)));
  expect(enterDown(across)).toBe(false);
});
test("outside a table Enter is not this command's", () => {
  expect(enterDown(caret("a line", "line"))).toBe(false);
});
