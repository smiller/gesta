// Markdown as you type, driven the way the view drives it: each character
// through the input-rules plugin's own text-input handler, so a rule fires
// exactly where it would under a keyboard. Cases from the README's
// "Markdown as you type" and 08-markdown-as-you-type.js (2026-09-07).
import { test, expect } from "vitest";
import { EditorState, TextSelection, type Command, type Transaction } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { undoInputRule } from "prosemirror-inputrules";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { typing, curlChar, fenceEnter, typingBindings } from "./typing.ts";

const plugin = typing();
/* a state whose caret sits at the end of the first text holding `needle`,
   or at the end of the document */
function state(md = "", needle?: string, offset = needle?.length ?? 0): EditorState {
  const doc = parseMarkdown(md);
  let pos = doc.content.size - 1;
  if (needle) doc.descendants((n, p) => { if (n.isText && n.text!.includes(needle) && pos === doc.content.size - 1) pos = p + n.text!.indexOf(needle) + offset; return true; });
  return EditorState.create({ doc, plugins: [plugin], selection: TextSelection.create(doc, pos) });
}
/* one character typed: the plugin's handler first, the plain insertion when no rule claims it */
function key(s: EditorState, ch: string): EditorState {
  let next: EditorState | null = null;
  const view = { state: s, composing: false, dispatch: (tr: Transaction) => { next = s.apply(tr); } } as unknown as EditorView;
  const { from, to } = s.selection;
  const handled = plugin.props.handleTextInput!.call(plugin, view, from, to, ch, () => s.tr.insertText(ch, from, to));
  return handled && next ? next : s.apply(s.tr.insertText(ch));
}
const type = (s: EditorState, text: string): EditorState => Array.from(text).reduce(key, s);
const md = (s: EditorState): string => serializeMarkdown(s.doc);
const typed = (text: string, from = "", needle?: string): string => md(type(state(from, needle), text));
function run(cmd: Command, s: EditorState): EditorState {
  let next = s;
  const view = { get state() { return next; }, dispatch: (tr: Transaction) => { next = next.apply(tr); } } as unknown as EditorView;
  if (!cmd(s, view.dispatch, view)) throw new Error("command refused");
  return next;
}

test("inline marks close on their closing marker, and typing goes on outside them", () => {
  expect(typed("**bold** on")).toBe("**bold** on");
  expect(typed("__bold__ on")).toBe("**bold** on");
  expect(typed("*em* on")).toBe("*em* on");
  expect(typed("_em_ on")).toBe("*em* on");
  expect(typed("~~gone~~ on")).toBe("~~gone~~ on");
  expect(typed("`x` on")).toBe("`x` on");
  expect(typed("say **a *b* c** on")).toBe("say **a *b* c** on");
});

test("a marker needs a boundary before it and a body that is not blank", () => {
  const s = type(state(), "not*a*");
  expect(s.doc.firstChild!.textContent).toBe("not*a*");
  expect(s.doc.rangeHasMark(0, s.doc.content.size, s.schema.marks.em)).toBe(false);
  expect(type(state(), "** **").doc.firstChild!.textContent).toBe("** **");
  expect(type(state("`code`", "code"), "*a*").doc.textContent).toBe("code*a*");
});

test("block markers open a block on the space, in a paragraph a block can open in", () => {
  expect(typed("# Title")).toBe("# Title");
  expect(typed("### Third")).toBe("### Third");
  expect(typed("> quoted")).toBe("> quoted");
  expect(typed(">> deep")).toBe(">> deep");
  expect(type(state(), ">> deep").doc.firstChild!.firstChild!.type.name).toBe("blockquote");
  expect(typed("- item")).toBe("- item");
  expect(typed("* item")).toBe("- item");
  expect(typed("3. third")).toBe("3. third");
  expect(typed("18) down")).toBe("18. down");
  /* a fresh line inside a quote: the marker peels its line into a list in the quote */
  const freshLine = (md: string, needle: string): EditorState => {
    const s = state(md, needle);   /* the caret stepped over the break after the needle */
    return s.apply(s.tr.setSelection(TextSelection.create(s.doc, s.selection.from + 1)));
  };
  const inQuote = type(freshLine("> a quote\n> ", "a quote"), "- inner");
  expect(md(inQuote)).toBe("> a quote\n> - inner");
  expect(inQuote.doc.firstChild!.childCount).toBe(2);
  expect(md(type(freshLine("> a quote\n> ", "a quote"), "## deeper"))).toBe("> a quote\n> ## deeper");
  /* a numbered item typed under a list joins it where the number continues, and opens its own list where it does not */
  const doc = (s: EditorState) => s.doc.toString();
  expect(md(type(state("3. a\n\nx", "x", 0), "4. "))).toBe("3. a\n4. x");
  expect(doc(type(state("3. a\n\nx", "x", 0), "7. "))).toContain("ordered_list(list_item(paragraph(\"a\"))), ordered_list(");
});

test("a marker inside an item, a row or mid-line is text", () => {
  expect(typed("- ", "- item\n- x", "x")).toBe("- item\n- x- ");
  expect(type(state("::: verse\na\n:::", "a"), "# ").doc.textContent).toBe("a# ");
  expect(typed(" # not", "text", "text")).toBe("text # not");
});

test("two hyphens between spaces are an em-dash", () => {
  expect(typed("a -- b")).toBe("a — b");
  expect(typed("a--b")).toBe("a--b");
  expect(typed("--- ")).toBe("--- ");
});

test("quotes curl as typed, and a second quote steps the curl", () => {
  expect(typed("\"hello\" it's")).toBe("“hello” it’s");
  expect(typed("(\"a\")")).toBe("(“a”)");
  expect(typed("—\"a")).toBe("—“a");
  expect(typed("''tis")).toBe("’tis");
  expect(typed("\"a\"\"")).toBe("“a\"");
  expect(typed("it''")).toBe("it'");
  expect(curlChar("'", "￼")).toBe("‘");
  expect(type(state("`x`", "x"), "\"").doc.textContent).toBe("x\"");
});

test("a bare URL links on the space after it, its trailing punctuation left out", () => {
  const s = type(state(), "see https://x.test/p, and www.y.test/q. ");
  expect(md(s)).toBe("see https://x.test/p, and www.y.test/q. ");
  const links: string[] = [];
  s.doc.descendants((n) => { const l = n.marks.find((m) => m.type.name === "link"); if (l) links.push(n.text + "→" + l.attrs.href); return true; });
  expect(links).toEqual(["https://x.test/p→https://x.test/p", "www.y.test/q→https://www.y.test/q"]);
  expect(type(state(), "no.url here ").doc.rangeHasMark(0, 12, s.schema.marks.link)).toBe(false);
});

test("[title](url) links on its ), the label keeping its marks", () => {
  expect(typed("see [a *b*](https://x.test) on")).toBe("see [a *b*](https://x.test) on");
  const s = type(state(), "[t](www.x.test)");
  expect(s.doc.firstChild!.firstChild!.marks[0].attrs.href).toBe("https://www.x.test");
  expect(typed("[a](b c)")).toBe("[a](b c)");
});

test("a ``` line and Enter opens a code block, on the caret's own line", () => {
  /* a column-0 backslash keeps the fence line a paragraph in the fixture */
  const whole = run(fenceEnter, state("\\```js", "js"));
  expect(whole.doc.firstChild!.type.name).toBe("code_block");
  expect(whole.doc.firstChild!.attrs.lang).toBe("js");
  expect(whole.selection.$from.parent.type.name).toBe("code_block");
  const peeled = run(fenceEnter, state("above\n\\```", "```"));
  expect(peeled.doc.childCount).toBe(2);
  expect(peeled.doc.firstChild!.childCount).toBe(1);
  expect(peeled.doc.firstChild!.textContent).toBe("above");
  expect(peeled.doc.lastChild!.type.name).toBe("code_block");
  expect(() => run(fenceEnter, state("\\``` x y", "y"))).toThrow();
  expect(() => run(fenceEnter, state("\\```js after", "js"))).toThrow();
});

test("a URL finished with Enter links first, then Enter splits", () => {
  const s = run(typingBindings.Enter, type(state(), "see https://x.test/p"));
  expect(s.doc.childCount).toBe(2);
  expect(s.doc.firstChild!.lastChild!.marks[0]?.type.name).toBe("link");
  expect(md(s)).toBe("see https://x.test/p");
  expect(() => run(typingBindings.Enter, type(state(), "plain"))).toThrow();
});

test("Backspace straight after a rule undoes it", () => {
  const s = type(state(), "# ");
  expect(s.doc.firstChild!.type.name).toBe("heading");
  const back = run(undoInputRule, s);
  expect(back.doc.firstChild!.type.name).toBe("paragraph");
  expect(back.doc.textContent).toBe("# ");
});
