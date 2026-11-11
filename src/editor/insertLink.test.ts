import { test, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { linkRefusal, headingRefusal, insertLinkAfter, linkMarkdown } from "./insertLink.ts";
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
test("headingRefusal: a caret in a heading refuses, at its start too; the line below does not", () => {
  expect(headingRefusal(at("# Test Author\n\nbelow", "Test"))).toBe("no link inside a heading — place your cursor below it");
  expect(headingRefusal(at("# Test Author\n\nbelow", ""))).toBe("no link inside a heading — place your cursor below it");
  expect(headingRefusal(at("# Test Author\n\nbelow", "below"))).toBe("");
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
test("linkMarkdown: the link as the rendered view's own link saves, escaped the same way", () => {
  for (const [label, href] of [["Notes\\", "#page/Notes"], ["a*b_c", "#page/A"], ["a)", "#2026-10-12/a)"], ["plain", "#page/Plain"]]) {
    const doc = schema.nodes.doc.create(null, schema.nodes.paragraph.create(null, schema.text(label, [schema.marks.link.create({ href })])));
    expect(linkMarkdown(href, label)).toBe(serializeMarkdown(doc));
    expect(parseMarkdown(linkMarkdown(href, label)).eq(doc)).toBe(true);
  }
});
