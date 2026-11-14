import { test, expect } from "vitest";
import { EditorState } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { pageGutter } from "./pageGutter.ts";

test("the root carries paged exactly then", () => {
  const attrs = (md: string) => {
    const s = EditorState.create({ doc: parseMarkdown(md), plugins: [pageGutter()] });
    const a = s.plugins[0].props.attributes;
    return typeof a === "function" ? a(s) : a;
  };
  expect(attrs("⟨15⟩ text")).toEqual({ class: "paged" });
  expect(attrs("::: note\n⟨15⟩\n:::")).toEqual({});
});
