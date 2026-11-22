import { test, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { linkRefusal, headingRefusal, insertLinkAfter, linkMarkdown } from "./insertLink.ts";
import { schema } from "../model/schema.ts";
import { said } from "../model/alertText.ts";

function at(md: string, needle: string): EditorState {
  const doc = parseMarkdown(md);
  let pos = -1;
  doc.descendants((n, p) => { if (pos < 0 && n.text?.includes(needle)) pos = p + n.text!.indexOf(needle) + needle.length; return pos < 0; });
  return EditorState.create({ doc, selection: TextSelection.create(doc, pos) });
}
test("linkRefusal: a code block and a link refuse, prose does not", () => {
  expect(linkRefusal(at("plain text", "plain"))).toBeNull();
  expect(linkRefusal(at("```\ncode here\n```", "code"))).toEqual(said("noLinkInCode"));
  expect(linkRefusal(at("see [the link](#x) now", "the li"))).toEqual(said("noLinkInLink"));
});
test("headingRefusal: a caret in a heading refuses, at its start too; the line below does not", () => {
  expect(headingRefusal(at("# Test Author\n\nbelow", "Test"))).toEqual(said("noLinkInHeading"));
  expect(headingRefusal(at("# Test Author\n\nbelow", ""))).toEqual(said("noLinkInHeading"));
  expect(headingRefusal(at("# Test Author\n\nbelow", "below"))).toBeNull();
});
test("insertLinkAfter: the caret stands after the link it placed, outside it", () => {
  let s = at("some text here", "text");
  insertLinkAfter({ get state() { return s; }, dispatch: (tr) => { s = s.apply(tr); } }, "#commonplace/X", "X");
  expect(s.selection.empty).toBe(true);
  expect(s.doc.textBetween(0, s.selection.from)).toBe("some textX");
  expect(schema.marks.link.isInSet(s.selection.$from.marks())).toBeUndefined();
});
test("linkRefusal: inline code refuses as a code block does", () => {
  expect(linkRefusal(at("see `code here` now", "co"))).toEqual(said("noLinkInCode"));
});
test("linkMarkdown: the link as the rendered view's own link saves, escaped the same way", () => {
  for (const [label, href] of [["Notes\\", "#commonplace/Notes"], ["a*b_c", "#commonplace/A"], ["a)", "#2026-10-12/a)"], ["plain", "#commonplace/Plain"]]) {
    const doc = schema.nodes.doc.create(null, schema.nodes.paragraph.create(null, schema.text(label, [schema.marks.link.create({ href })])));
    expect(linkMarkdown(href, label)).toBe(serializeMarkdown(doc));
    expect(parseMarkdown(linkMarkdown(href, label)).eq(doc)).toBe(true);
  }
});
