import { test, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { linkRefusal } from "./insertLink.ts";

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
