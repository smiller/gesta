import { test, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { exitCodeBlock } from "./codeKeys.ts";

function atEnd(md: string): EditorState {
  const doc = parseMarkdown(md);
  let pos = 0;
  doc.descendants((n, p) => { if (n.type.name === "code_block") pos = p + 1 + n.content.size; return true; });
  return EditorState.create({ doc, selection: TextSelection.create(doc, pos) });
}
test("Enter on an empty last line steps out of the code block into a paragraph, taking the empty line", () => {
  const s = atEnd("```sh\nclaude --resume\n\n```\n");
  let next = s;
  expect(exitCodeBlock(s, (tr) => { next = s.apply(tr); })).toBe(true);
  expect(serializeMarkdown(next.doc)).toBe("```sh\nclaude --resume\n```");
  expect(next.selection.$from.parent.type.name).toBe("paragraph");
  expect(next.doc.lastChild!.type.name).toBe("paragraph");
});
test("Enter at the end of a filled last line is not the way out, nor mid-block, nor outside", () => {
  expect(exitCodeBlock(atEnd("```\ncode\n```"))).toBe(false);
  const mid = parseMarkdown("```\na\n\nb\n```");
  expect(exitCodeBlock(EditorState.create({ doc: mid, selection: TextSelection.create(mid, 3) }))).toBe(false);
  const plain = parseMarkdown("text");
  expect(exitCodeBlock(EditorState.create({ doc: plain, selection: TextSelection.create(plain, 5) }))).toBe(false);
});
