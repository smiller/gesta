// The decoration plugin over an editor state, no DOM: the rows it marks,
// the numbers moving with an edit, the interval switching without a doc
// change, and the class the gutter hangs on.
import { test, expect } from "vitest";
import { EditorState } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { schema } from "../model/schema.ts";
import { lineNumbers, lineNumbersKey, setLineInterval } from "./lineNumbers.ts";

const state = (md: string, interval = 5) =>
  EditorState.create({ doc: parseMarkdown(md), plugins: [lineNumbers(interval)] });
/* the decorations as the row they sit on would see them: class and number */
const marks = (s: EditorState): string[] =>
  lineNumbersKey.getState(s)!.decorations.find().map((d) => {
    const spec = (d as unknown as { type: { attrs: Record<string, string> } }).type.attrs;
    return spec.class + (spec["data-line"] ? "=" + spec["data-line"] : "");
  });

test("every verse row that is a unit is marked; the number is an attribute, the interval a class", () => {
  const s = state("intro\n\n::: verse\n*Enter*\na\nb\nc\nd\ne\n:::", 5);
  expect(marks(s)).toEqual(["ln stage", "ln=1", "ln=2", "ln=3", "ln=4", "ln shown=5"]);
  expect(lineNumbersKey.getState(s)!.decorations.find(0, 6)).toEqual([]);
});

test("a prose block's sentences never paint; a gap and a note row carry nothing", () => {
  expect(marks(state("::: prose\na | b\n:::"))).toEqual([]);
  expect(marks(state("::: verse\na\n\n::: note\nn\n:::\nb\n:::", 1))).toEqual(["ln shown=1", "ln shown=2"]);
});

test("the numbers are computed from position: a row inserted above renumbers what follows", () => {
  const s = state("::: verse\na\nb\n:::", 1);
  const verse = s.doc.firstChild!;
  const tr = s.tr.insert(1, schema.nodes.line.create(null, schema.text("new")));
  const next = s.apply(tr);
  expect(next.doc.firstChild!.childCount).toBe(verse.childCount + 1);
  expect(marks(next)).toEqual(["ln shown=1", "ln shown=2", "ln shown=3"]);
  expect(next.doc.textBetween(0, next.doc.content.size, "|")).toBe("new|a|b");
});

test("setLineInterval repaints without touching the document; the same interval is a no-op", () => {
  const s = state("::: verse\na\nb\nc\nd\ne\nf\n:::", 5);
  expect(marks(s).filter((m) => m.includes("shown"))).toEqual(["ln shown=5"]);
  let next = s;
  expect(setLineInterval(2)(s, (tr) => { next = s.apply(tr); })).toBe(true);
  expect(next.doc).toBe(s.doc);
  expect(marks(next).filter((m) => m.includes("shown"))).toEqual(["ln shown=2", "ln shown=4", "ln shown=6"]);
  expect(setLineInterval(2)(next)).toBe(false);
  expect(setLineInterval(0)(next, (tr) => { next = next.apply(tr); })).toBe(true);
  expect(marks(next).some((m) => m.includes("shown"))).toBe(false);
  expect(marks(next)).toHaveLength(6);
});

test("the gutter class is set exactly where a top-level verse block is", () => {
  const attrs = (md: string) => {
    const s = state(md);
    const a = s.plugins[0].props.attributes;
    return typeof a === "function" ? a(s) : a;
  };
  expect(attrs("::: verse\na\n:::")).toEqual({ class: "versepage" });
  expect(attrs("prose only")).toEqual({});
  expect(attrs("> ::: verse\n> a\n> :::")).toEqual({});
});

test("a top-level prose block holding a pair marks the root prosepage: the text, not quoted matter", () => {
  const attrs = (md: string) => {
    const s = state(md);
    const a = s.plugins[0].props.attributes;
    return typeof a === "function" ? a(s) : a;
  };
  expect(attrs("::: prose\nIam cantum | When her song\n:::")).toEqual({ class: "prosepage" });
  expect(attrs("::: prose\nno pipe here\n:::")).toEqual({});
  expect(attrs("::: verse\na\n:::\n\n::: prose\nx | y\n:::")).toEqual({ class: "versepage prosepage" });
  expect(attrs("> ::: prose\n> x | y\n> :::")).toEqual({});
});
