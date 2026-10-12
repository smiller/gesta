import { test, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { linkRefusal, insertLinkAfter } from "./insertLink.ts";
import { schema } from "../model/schema.ts";

function at(md: string, needle: string): EditorState {
  const doc = parseMarkdown(md);
  let pos = -1;
  doc.descendants((n, p) => { if (pos < 0 && n.isText && n.text!.indexOf(needle) >= 0) pos = p + n.text!.indexOf(needle) + needle.length; return pos < 0; });
  return EditorState.create({ doc, selection: TextSelection.create(doc, pos) });
}
test("linkRefusal: a code block and a link refuse, prose does not", () => {
  expect(linkRefusal(at("plain text", "plain"))).toBe("");
  expect(linkRefusal(at("```\ncode here\n```", "code"))).toBe("no link inside a code block");
  expect(linkRefusal(at("see [the link](#x) now", "the li"))).toBe("no link inside a link");
});
test("insertLinkAfter: the caret stands after the link it placed, outside it", () => {
  let s = at("some text here", "text");
  insertLinkAfter({ get state() { return s; }, dispatch: (tr) => { s = s.apply(tr); } }, "#page/X", "X");
  expect(s.selection.empty).toBe(true);
  expect(s.doc.textBetween(0, s.selection.from)).toBe("some textX");
  expect(schema.marks.link.isInSet(s.selection.$from.marks())).toBeUndefined();
});
test("linkRefusal: inline code refuses as a code block does", () => {
  expect(linkRefusal(at("see `code here` now", "co"))).toBe("no link inside a code block");
});
