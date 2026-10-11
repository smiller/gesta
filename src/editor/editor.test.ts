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
import { editorState, lockKey, landed } from "./editor.ts";
import { jumpTo } from "./highlight.ts";
import { codeTab } from "./codeKeys.ts";
const keymapTab = (s: EditorState, dispatch: (tr: Transaction) => void): boolean => codeTab(false)(s, dispatch);

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

test("a locked entry takes no change from anywhere — a command, an insert — and takes them again unlocked", () => {
  let s = editorState(parseMarkdown("some words"), 5);
  s = s.apply(s.tr.setMeta(lockKey, true));
  s = s.apply(s.tr.insertText("x", 1));
  expect(serializeMarkdown(s.doc)).toBe("some words");
  s = s.apply(s.tr.setMeta(lockKey, false));
  s = s.apply(s.tr.insertText("x", 1));
  expect(serializeMarkdown(s.doc)).toBe("xsome words");
});

test("a change refused by the lock is told as nothing that landed: no save is asked for", () => {
  let s = editorState(parseMarkdown("some words"), 5);
  s = s.apply(s.tr.setMeta(lockKey, true));
  const tr = s.tr.insertText("x", 1);
  expect(tr.docChanged).toBe(true);
  expect(landed(s, s.apply(tr))).toEqual({ changed: false, selected: false });
  const open = editorState(parseMarkdown("some words"), 5);
  expect(landed(open, open.apply(open.tr.insertText("x", 1)))).toEqual({ changed: true, selected: true });
});

/* a key with its modifiers, through the whole chain: whether a handler took it, and the state after */
function keyed(s: EditorState, key: string, o: { shift?: boolean; mod?: boolean; repeat?: boolean } = {}): { state: EditorState; taken: boolean } {
  let state = s;
  const view = { get state() { return state; }, dispatch: (tr: Transaction) => { state = state.apply(tr); }, composing: false } as unknown as EditorView;
  const mac = typeof navigator !== "undefined" && /Mac|iP(hone|[oa]d)/.test(navigator.platform);
  const event = { key, keyCode: 0, shiftKey: !!o.shift, altKey: false, ctrlKey: !!o.mod && !mac, metaKey: !!o.mod && mac, repeat: !!o.repeat, preventDefault() {} } as unknown as KeyboardEvent;
  let taken = false;
  for (const p of s.plugins) if (p.props.handleKeyDown?.call(p, view, event)) { taken = true; break; }
  return { state, taken };
}
/* the caret before `a`, or a selection from before `a` to after `b` */
function sel(md: string, said: string[], a: string, b?: string): EditorState {
  const s = editorState(parseMarkdown(md), 5, (why) => said.push(why));
  const find = (needle: string): number => { let pos = -1; s.doc.descendants((n, p) => { if (pos < 0 && n.isText && n.text!.includes(needle)) pos = p + n.text!.indexOf(needle); return pos < 0; }); if (pos < 0) throw new Error("needle not found: " + needle); return pos; };
  const from = find(a);
  return s.apply(s.tr.setSelection(TextSelection.create(s.doc, from, b ? find(b) + b.length : from)));
}

test("Tab in prose keeps the key: a bare caret says how the view toggles, a selection what Tab indents; Shift-Tab is left to the browser", () => {
  const said: string[] = [];
  const caret = keyed(sel("one\n\ntwo", said, "one"), "Tab");
  expect(caret.taken).toBe(true);
  expect(serializeMarkdown(caret.state.doc)).toBe("one\n\ntwo");
  const over = keyed(sel("one\n\ntwo", said, "one", "two"), "Tab");
  expect(over.taken).toBe(true);
  expect(said).toEqual(["⌃⌘M toggles markdown", "Tab indents one list, quote, or code block at a time"]);
  expect(keyed(sel("one\n\ntwo", said, "one"), "Tab", { shift: true }).taken).toBe(false);
});

test("Tab in a code block inserts two spaces; over lines, every line touched shifts and stays selected; Shift-Tab takes them back", () => {
  const said: string[] = [];
  const md = "```\nx = 1\ny = 2\n```";
  const one = keyed(sel(md, said, "x = 1"), "Tab");
  expect(serializeMarkdown(one.state.doc)).toBe("```\n  x = 1\ny = 2\n```");
  expect(one.state.selection.empty).toBe(true);
  const both = keyed(sel(md, said, "x = 1", "y = 2"), "Tab");
  expect(serializeMarkdown(both.state.doc)).toBe("```\n  x = 1\n  y = 2\n```");
  expect(both.state.doc.textBetween(both.state.selection.from, both.state.selection.to)).toBe("  x = 1\n  y = 2");
  const back = keyed(both.state, "Tab", { shift: true });
  expect(serializeMarkdown(back.state.doc)).toBe(md);
  expect(keyed(sel(md, said, "x = 1"), "Tab", { shift: true }).taken).toBe(false);
  expect(said).toEqual([]);
});

test("Tab over a code block's empty lines says so; a selection spilling into prose is refused as prose", () => {
  const said: string[] = [];
  const s = editorState(parseMarkdown("```\na\n\n\nb\n```"), 5, (why) => said.push(why));
  const at = (s.doc.firstChild!.textContent.indexOf("\n") + 2);
  const empty = keyed(s.apply(s.tr.setSelection(TextSelection.create(s.doc, at, at + 1))), "Tab");
  expect(empty.taken).toBe(true);
  expect(serializeMarkdown(empty.state.doc)).toBe("```\na\n\n\nb\n```");
  const spill = keyed(sel("```\nx = 1\n```\n\nafter", said, "x = 1", "after"), "Tab");
  expect(spill.taken).toBe(true);
  expect(serializeMarkdown(spill.state.doc)).toBe("```\nx = 1\n```\n\nafter");
  expect(said).toEqual(["nothing to indent — those lines are empty", "Tab indents one list, quote, or code block at a time"]);
});

test("⌘A in a code block selects the block; again, the page; in an empty block or prose it is the page's at once", () => {
  const said: string[] = [];
  const first = keyed(sel("before\n\n```\nx = 1\ny = 2\n```", said, "y = 2"), "a", { mod: true });
  expect(first.state.doc.textBetween(first.state.selection.from, first.state.selection.to)).toBe("x = 1\ny = 2");
  const second = keyed(first.state, "a", { mod: true });
  expect(second.state.selection.from).toBe(0);
  expect(second.state.selection.to).toBe(second.state.doc.content.size);
  const prose = keyed(sel("before\n\n```\nx\n```", said, "before"), "a", { mod: true });
  expect(prose.state.selection.to).toBe(prose.state.doc.content.size);
});

test("a held key acts once: a repeated Tab nests a quote no further and says nothing; a repeated Shift-Tab still unwinds", () => {
  const said: string[] = [];
  const once = keyed(sel("> quoted", said, "quoted"), "Tab");
  const held = keyed(once.state, "Tab", { repeat: true });
  expect(held.taken).toBe(true);
  expect(serializeMarkdown(held.state.doc)).toBe(serializeMarkdown(once.state.doc));
  const out = keyed(held.state, "Tab", { shift: true, repeat: true });
  expect(serializeMarkdown(out.state.doc)).toBe("> quoted");
  const floor = keyed(sel("- first", said, "first"), "Tab");
  const before = said.length;
  keyed(floor.state, "Tab", { repeat: true });
  keyed(sel("- first", said, "first"), "Tab", { repeat: true });
  expect(said.length).toBe(before);
});

test("Escape after a jump leaves the caret after the match; over a selection the reader made, or after another change, it is not the jump's", () => {
  const said: string[] = [];
  const s = sel("one two three", said, "one");
  const hit = { from: 5, to: 8 };
  const jumped = s.apply(jumpTo(s, hit.from, hit.to));
  const esc = keyed(jumped, "Escape");
  expect(esc.taken).toBe(true);
  expect(esc.state.selection.empty).toBe(true);
  expect(esc.state.selection.from).toBe(hit.to);
  const own = s.apply(s.tr.setSelection(TextSelection.create(s.doc, hit.from, hit.to)));
  expect(keyed(own, "Escape").state.selection.empty).toBe(false);
  const moved = jumped.apply(jumped.tr.setSelection(TextSelection.create(jumped.doc, 2, 4)));
  expect(keyed(moved, "Escape").state.selection.empty).toBe(false);
});

test("an entry ending in a table has an empty line below it, which saves as nothing and comes back when deleted", () => {
  const md = "| a | b |\n| --- | --- |\n| 1 | 2 |";
  const s = editorState(parseMarkdown(md), 5);
  expect(s.doc.lastChild!.type.name).toBe("paragraph");
  expect(serializeMarkdown(s.doc)).toBe(md);
  const cut = s.apply(s.tr.delete(s.doc.content.size - s.doc.lastChild!.nodeSize, s.doc.content.size));
  expect(cut.doc.lastChild!.type.name).toBe("paragraph");
  expect(editorState(parseMarkdown("just prose"), 5).doc.childCount).toBe(1);
});

test("a code block in a quote takes Tab and ⌘A as a code block: the innermost thing wins", () => {
  const said: string[] = [];
  for (const md of ["> ```\n> x = 1\n> ```"]) {
    const s = keyed(sel(md, said, "x = 1"), "Tab");
    expect(s.taken, md).toBe(true);
    expect(s.state.doc.textContent, md).toContain("  x = 1");
    const all = keyed(sel(md, said, "x = 1"), "a", { mod: true });
    expect(all.state.doc.textBetween(all.state.selection.from, all.state.selection.to), md).toBe("x = 1");
  }
  expect(said).toEqual([]);
});

test("Tab in a code block changes only the touched lines: a position on a line below maps along it, one above stays", () => {
  const said: string[] = [];
  const s = sel("```\na\nb\nc\nd\n```", said, "b", "c");
  let tr: Transaction | null = null;
  keymapTab(s, (t) => { tr = t; });
  const start = s.selection.$from.start();
  const onD = start + 6, onA = start;   /* "d" and "a" */
  expect(tr!.mapping.map(onD)).toBe(onD + 4);
  expect(tr!.mapping.map(onA)).toBe(onA);
});
