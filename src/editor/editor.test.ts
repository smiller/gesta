// A key through the editor's WHOLE plugin chain, in its real order, the way
// the view's someProp walks handleKeyDown: the first handler to return true
// takes the key: a bare URL at the end of a list item turned Enter into a
// paragraph split inside the item, the autolink's Enter arm running ahead of
// the list keymap and calling the base Enter itself.
import { test, expect } from "vitest";
import { TextSelection, type EditorState, type Transaction } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { editorState } from "./editor.ts";

function at(md: string, needle: string): EditorState {
  const s = editorState(parseMarkdown(md), 5);
  let pos = -1;
  s.doc.descendants((n, p) => { if (pos < 0 && n.isText && n.text!.includes(needle)) pos = p + n.text!.indexOf(needle) + needle.length; return pos < 0; });
  if (pos < 0) throw new Error("needle not found: " + needle);
  return s.apply(s.tr.setSelection(TextSelection.create(s.doc, pos)));
}
function press(s: EditorState, key: string): EditorState {
  let state = s;
  const view = { get state() { return state; }, dispatch: (tr: Transaction) => { state = state.apply(tr); }, composing: false } as unknown as EditorView;
  const event = { key, keyCode: key === "Enter" ? 13 : 0, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, preventDefault() {} } as unknown as KeyboardEvent;
  for (const p of s.plugins) if (p.props.handleKeyDown?.call(p, view, event)) break;
  return state;
}
const URL = "https://x.test/p";
const linked = (s: EditorState): boolean => s.doc.rangeHasMark(0, s.doc.content.size, s.schema.marks.link);

test("Enter after a bare URL links it, then does what Enter does there: a list item makes the next item", () => {
  const s = press(at("- see " + URL + "\n- next", URL), "Enter");
  expect(serializeMarkdown(s.doc)).toBe("- see " + URL + "\n- \n- next");
  expect(linked(s)).toBe(true);
});
test("Enter after a bare URL lands as Enter after a word does, in every context", () => {
  for (const shape of ["- see X\n- next", "1. see X\n2. next", "> see X", "see X", "- p\n  - see X"]) {
    const word = press(at(shape.replace("X", "word"), "word"), "Enter");
    const url = press(at(shape.replace("X", URL), URL), "Enter");
    expect(serializeMarkdown(url.doc), shape).toBe(serializeMarkdown(word.doc).replace("word", URL));
    expect(linked(url), shape).toBe(true);
  }
});
