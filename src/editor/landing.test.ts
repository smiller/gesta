import { test, expect } from "vitest";
import { EditorState } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { endsLineMark, landing, landingKey, landingPos } from "./landing.ts";

test("the mark is set by meta, maps through an edit above it, and goes with a deleted row", () => {
  const doc = parseMarkdown("para\n\n::: verse\na\nb\n:::");
  let s = EditorState.create({ doc, plugins: [landing()] });
  expect(landingPos(s)).toBeNull();
  let rowB = 0;
  doc.descendants((n, p) => { if (n.type.name === "line" && n.textContent === "b") rowB = p; return true; });
  s = s.apply(s.tr.setMeta(landingKey, rowB));
  expect(landingPos(s)).toBe(rowB);
  s = s.apply(s.tr.insertText("xx", 1));
  expect(landingPos(s)).toBe(rowB + 2);
  const decos = landing().spec.props!.decorations!.call(landing(), s) as unknown as { find(): { from: number }[] };
  expect(decos.find()[0].from).toBe(rowB + 2);
  const row = s.doc.nodeAt(rowB + 2)!;
  s = s.apply(s.tr.delete(rowB + 2, rowB + 2 + row.nodeSize));
  expect(landingPos(s)).toBeNull();
  s = s.apply(s.tr.setMeta(landingKey, null));
  expect(landingPos(s)).toBeNull();
});

test("a key that moves or writes ends a link's mark; a bare modifier, a copy and leaving the window do not", () => {
  for (const key of ["ArrowDown", "a", "Enter", "Escape", "g"]) expect(endsLineMark(key, false)).toBe(true);
  for (const key of ["Control", "Meta", "Shift", "Alt"]) expect(endsLineMark(key, false)).toBe(false);
  expect(endsLineMark("c", true)).toBe(false);
  expect(endsLineMark("Tab", true)).toBe(false);
  expect(endsLineMark("c", false)).toBe(true);
  expect(endsLineMark("v", true)).toBe(true);
});
