// The gestures under a verse or prose fence, as commands over an editor
// state: Enter, Backspace, Delete, Tab and the typed pipe. Each case is
// markdown in, a caret placed by a needle, the command, and the markdown and
// caret out.
import { test, expect } from "vitest";
import { EditorState, TextSelection, NodeSelection, type Command } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { schema } from "../model/schema.ts";
import { baseKeymap } from "prosemirror-commands";
import { blankRowSelected, openBlankRow, caretNear, enterInRow, backspaceInRow, deleteInRow, tabInRow, shiftTabInRow, pipeInLine, toggleDeclaredLine, exitNoteRow } from "./rowKeys.ts";

/* a state with the caret placed `offset` characters into the first text
   holding `needle` (its end when omitted) */
function at(md: string, needle: string, offset = needle.length): EditorState {
  const doc = parseMarkdown(md);
  let pos = -1;
  doc.descendants((node, p) => {
    if (pos >= 0 || !node.isText) return pos < 0;
    const i = node.text!.indexOf(needle);
    if (i >= 0) pos = p + i + offset;
    return false;
  });
  if (pos < 0) throw new Error("needle not found: " + needle);
  return EditorState.create({ doc, selection: TextSelection.create(doc, pos) });
}
function run(cmd: Command, s: EditorState): EditorState {
  let next = s;
  const ok = cmd(s, (tr) => { next = s.apply(tr); });
  if (!ok) throw new Error("command refused");
  return next;
}
const refuses = (cmd: Command, s: EditorState): boolean => !cmd(s);
const md = (s: EditorState): string => serializeMarkdown(s.doc);
/* where the caret is: its textblock's type, the text before it, a bar, the text after */
function caret(s: EditorState): string {
  const $c = s.selection.$from, p = $c.parent;
  return p.type.name + ":" + p.textBetween(0, $c.parentOffset) + "|" + p.textBetween($c.parentOffset, p.content.size);
}
const type = (s: EditorState, text: string): EditorState => s.apply(s.tr.insertText(text));

test("Enter mid-line splits it into two lines, the caret before the text that moved", () => {
  const s = run(enterInRow, at("::: verse\nalpha\nbeta\ngamma\n:::", "be"));
  expect(md(s)).toBe("::: verse\nalpha\nbe\nta\ngamma\n:::");
  expect(caret(s)).toBe("line:|ta");
  expect(md(type(s, "X"))).toBe("::: verse\nalpha\nbe\nXta\ngamma\n:::");
  expect(s.doc.childCount).toBe(1);
});

test("Enter at the end of the last line makes an empty line; a second Enter takes it away and steps out to a paragraph", () => {
  const one = run(enterInRow, at("::: verse\nalpha\nbeta\n:::", "beta"));
  expect(one.doc.firstChild!.childCount).toBe(3);
  expect(caret(one)).toBe("line:|");
  const two = run(enterInRow, one);
  expect(two.doc.firstChild!.childCount).toBe(2);
  expect(two.doc.childCount).toBe(2);
  expect(two.doc.lastChild!.type.name).toBe("paragraph");
  expect(caret(two)).toBe("paragraph:|");
  expect(md(type(two, "after"))).toBe("::: verse\nalpha\nbeta\n:::\n\nafter");
});

test("Enter on an empty line mid-block makes a stanza break and a fresh line", () => {
  const s = run(enterInRow, run(enterInRow, at("::: verse\nalpha\nbeta\n:::", "alpha")));
  const kinds = (st: EditorState): string[] => { const k: string[] = []; st.doc.firstChild!.forEach((n) => { k.push(n.type.name); }); return k; };
  expect(kinds(s)).toEqual(["line", "gap", "line", "line"]);
  expect(caret(s)).toBe("line:|");
  expect(md(type(s, "new"))).toBe("::: verse\nalpha\n\nnew\nbeta\n:::");
});

test("a ⟨line⟩ row keeps its kind on a mid-split and hands none to a line made at its end", () => {
  const mid = run(enterInRow, at("::: verse\n⟨line⟩*Flower o’ the broom,*\n:::", "Flower"));
  /* the cell trims its edges when written, as the grammar always has */
  expect(md(mid)).toBe("::: verse\n⟨line⟩*Flower*\n⟨line⟩*o’ the broom,*\n:::");
  const end = run(enterInRow, at("::: verse\n⟨line⟩*sung*\nx\n:::", "sung"));
  expect(end.doc.firstChild!.child(1).attrs.kind).toBe(null);
});

test("a ⟨…⟩ row split keeps the rest of the line on its first half; the text carried below begins a line of its own", () => {
  const mid = run(enterInRow, at("::: verse\nRelate by whom.\n⟨…⟩That still lessens the sorrow\n:::", "lessens "));
  expect(md(mid)).toBe("::: verse\nRelate by whom.\n⟨…⟩That still lessens\nthe sorrow\n:::");
  const end = run(enterInRow, at("::: verse\nRelate by whom.\n⟨…⟩By Samson.\n:::", "By Samson."));
  expect(end.doc.firstChild!.child(2).attrs.kind).toBe(null);
  /* at its start, the row opened above is a plain one and the rest stays the rest */
  const start = run(enterInRow, at("::: verse\nRelate by whom.\n⟨…⟩By Samson.\n:::", "By Samson.", 0));
  expect(md(start)).toBe("::: verse\nRelate by whom.\n\n⟨…⟩By Samson.\n:::");
  expect(start.doc.firstChild!.child(1).attrs.kind).toBe(null);
});

test("Enter in a paired row splits the caret's cell and carries the rest to a new row", () => {
  const a = run(enterInRow, at("::: verse\nalpha | one\nbeta | two\n:::", "al"));
  expect(md(a)).toBe("::: verse\nal | one\npha |\nbeta | two\n:::");
  expect(caret(a)).toBe("cell:|pha");
  const b = run(enterInRow, at("::: verse\nalpha | one\n:::", "o", 1));
  expect(md(b)).toBe("::: verse\nalpha | o\n | ne\n:::");
  expect(caret(b)).toBe("cell:|ne");
  const end = run(enterInRow, at("::: verse\nalpha | one\n:::", "one"));
  expect(md(end)).toBe("::: verse\nalpha | one\n |\n:::");
  expect(caret(end)).toBe("cell:|");
  expect(end.selection.$from.index(end.selection.$from.depth - 1)).toBe(0);
});

test("an empty paired row is no trap: a second Enter at the block's end steps out, mid-block it is a break", () => {
  const out = run(enterInRow, run(enterInRow, at("::: verse\na | b\nc | d\n:::", "d")));
  expect(md(out)).toBe("::: verse\na | b\nc | d\n:::");
  expect(out.doc.lastChild!.type.name).toBe("paragraph");
  const mid = run(enterInRow, run(enterInRow, at("::: prose\na | b\nc | d\n:::", "b")));
  expect(md(type(mid, "x"))).toBe("::: prose\na | b\n\nx |\nc | d\n:::");
});

test("Enter with a stanza gap selected makes a line after it", () => {
  const base = at("::: verse\na\n\nb\n:::", "a");
  const s0 = base.apply(base.tr.setSelection(NodeSelection.create(base.doc, 4)));
  expect(s0.selection instanceof NodeSelection && s0.selection.node.type.name).toBe("gap");
  const s = run(enterInRow, s0);
  expect(md(type(s, "x"))).toBe("::: verse\na\n\nx\nb\n:::");
});

test("Enter is not the row's outside a fence, or in a note's paragraph inside one", () => {
  expect(refuses(enterInRow, at("plain text", "plain"))).toBe(true);
  expect(refuses(enterInRow, at("::: verse\na\n::: note\ngloss\n:::\n:::", "gloss"))).toBe(true);
});

test("a typed pipe in a line puts the translation beside it, caret in the new cell", () => {
  const s = run(pipeInLine, at("::: verse\nalpha beta\n:::", "alpha "));
  expect(md(s)).toBe("::: verse\nalpha | beta\n:::");
  expect(caret(s)).toBe("cell:|beta");
  expect(md(run(pipeInLine, at("::: verse\nalpha\n:::", "alpha")))).toBe("::: verse\nalpha |\n:::");
  expect(refuses(pipeInLine, at("::: verse\nalpha | beta\n:::", "beta"))).toBe(true);
  expect(refuses(pipeInLine, at("a | b in prose", "in"))).toBe(true);
  expect(md(type(at("::: verse\nalpha | beta\n:::", "beta"), "|"))).toBe("::: verse\nalpha | beta\\|\n:::");
});

test("Backspace at a translation's start takes the pipe out: the pair is a line again", () => {
  const s = run(backspaceInRow, at("::: verse\nalpha | beta\n:::", "beta", 0));
  expect(md(s)).toBe("::: verse\nalphabeta\n:::");
  expect(caret(s)).toBe("line:alpha|beta");
  expect(refuses(backspaceInRow, at("::: verse\nalpha | beta\n:::", "beta", 2))).toBe(true);
});

test("Backspace at a row's start: a gap above comes out, a line above joins, another shape only takes the caret", () => {
  expect(md(run(backspaceInRow, at("::: verse\na\n\nb\n:::", "b", 0)))).toBe("::: verse\na\nb\n:::");
  const joined = run(backspaceInRow, at("::: verse\nalpha\nbeta\n:::", "beta", 0));
  expect(md(joined)).toBe("::: verse\nalphabeta\n:::");
  expect(caret(joined)).toBe("line:alpha|beta");
  const moved = run(backspaceInRow, at("::: verse\na | b\nc\n:::", "c", 0));
  expect(md(moved)).toBe("::: verse\na | b\nc\n:::");
  expect(caret(moved)).toBe("cell:b|");
  const first = run(backspaceInRow, at("# Title\n\n::: verse\na\n:::", "a", 0));
  expect(md(first)).toBe("# Title\n\n::: verse\na\n:::");
  expect(caret(first)).toBe("line:|a");
});

test("Delete at a cell's end takes the pipe out; at a row's end it mirrors Backspace", () => {
  const un = run(deleteInRow, at("::: verse\nalpha | beta\n:::", "alpha"));
  expect(md(un)).toBe("::: verse\nalphabeta\n:::");
  expect(caret(un)).toBe("line:alpha|beta");
  expect(md(run(deleteInRow, at("::: verse\na\n\nb\n:::", "a")))).toBe("::: verse\na\nb\n:::");
  expect(md(run(deleteInRow, at("::: verse\nalpha\nbeta\n:::", "alpha")))).toBe("::: verse\nalphabeta\n:::");
  const last = run(deleteInRow, at("::: verse\na\n:::\n\nafter", "a"));
  expect(md(last)).toBe("::: verse\na\n:::\n\nafter");
  expect(refuses(deleteInRow, at("::: verse\nalpha\n:::", "al"))).toBe(true);
});

test("Tab moves from the original to its translation and Shift-Tab back; in a line both are consumed", () => {
  const b = run(tabInRow, at("::: verse\nalpha | beta\n:::", "al"));
  expect(caret(b)).toBe("cell:|beta");
  expect(caret(run(shiftTabInRow, b))).toBe("cell:alpha|");
  const line = at("::: verse\nalpha\n:::", "al");
  expect(run(tabInRow, line).doc).toBe(line.doc);
  expect(refuses(tabInRow, at("plain", "pl"))).toBe(true);
});

test("⌃⌘I declares the selection's rows lines, and returns them to the convention when all are", () => {
  const one = run(toggleDeclaredLine, at("::: verse\n*Exit*\n*Flower o’ the broom,*\n:::", "Flower"));
  expect(md(one)).toBe("::: verse\n*Exit*\n⟨line⟩*Flower o’ the broom,*\n:::");
  expect(md(run(toggleDeclaredLine, one))).toBe("::: verse\n*Exit*\n*Flower o’ the broom,*\n:::");
  /* a song of three lines, selected from its first word to its last */
  const song = at("::: verse\n*a*\n\n*b* | *c*\n*d*\n:::", "a");
  const sel = song.apply(song.tr.setSelection(TextSelection.create(song.doc, song.selection.from, song.doc.content.size - 3)));
  const all = run(toggleDeclaredLine, sel);
  expect(md(all)).toBe("::: verse\n⟨line⟩*a*\n\n⟨line⟩*b* | *c*\n⟨line⟩*d*\n:::");
  /* one already declared among plain ones: all become declared, not none */
  const mixed = at("::: verse\n⟨line⟩*a*\n*b*\n:::", "a");
  const sel2 = mixed.apply(mixed.tr.setSelection(TextSelection.create(mixed.doc, mixed.selection.from, mixed.doc.content.size - 3)));
  expect(md(run(toggleDeclaredLine, sel2))).toBe("::: verse\n⟨line⟩*a*\n⟨line⟩*b*\n:::");
  /* the rest of a split line is a line already, and stays the rest */
  const split = at("::: verse\nRelate by whom.\n**Messenger**\n⟨…⟩*By Samson.*\n:::", "Relate");
  const over = split.apply(split.tr.setSelection(TextSelection.create(split.doc, 2, split.doc.content.size - 3)));
  const declared = run(toggleDeclaredLine, over);
  expect(md(declared)).toBe("::: verse\n⟨line⟩Relate by whom.\n⟨line⟩**Messenger**\n⟨…⟩*By Samson.*\n:::");
  expect(md(run(toggleDeclaredLine, declared))).toBe("::: verse\nRelate by whom.\n**Messenger**\n⟨…⟩*By Samson.*\n:::");
  expect(md(run(toggleDeclaredLine, at("::: verse\nWhat, Curio?\n⟨…⟩*The hart.*\n:::", "hart")))).toBe("::: verse\nWhat, Curio?\n⟨…⟩*The hart.*\n:::");
  expect(refuses(toggleDeclaredLine, at("prose *here*", "here"))).toBe(true);
  expect(refuses(toggleDeclaredLine, at("::: verse\na\n::: note\ngloss\n:::\n:::", "gloss"))).toBe(true);
});

test("Enter inside a nested note is the note's; the second Enter on its empty last paragraph exits to a ROW", () => {
  const paired = at("::: verse\na | b\n::: note\ngloss\n:::\nc | d\n:::", "gloss");
  expect(refuses(enterInRow, paired)).toBe(true);
  expect(refuses(exitNoteRow, paired)).toBe(true);
  const split = run(baseKeymap.Enter, paired);
  expect(split.doc.firstChild!.child(1).childCount).toBe(2);
  expect(split.doc.firstChild!.childCount).toBe(3);
  const out = run(exitNoteRow, split);
  expect(md(out)).toBe("::: verse\na | b\n::: note\ngloss\n:::\n |\nc | d\n:::");
  expect(caret(out)).toBe("cell:|");
  /* the row it mints matches the block it lands in: pipe-less, a line */
  const plain = run(exitNoteRow, run(baseKeymap.Enter, at("::: verse\nalpha\n::: note\ngloss\n:::\nbeta\n:::", "gloss")));
  expect(md(plain)).toBe("::: verse\nalpha\n::: note\ngloss\n:::\n\nbeta\n:::");
  expect(caret(plain)).toBe("line:|");
  /* a note emptied by the exit goes with it */
  const only = at("::: prose\na | b\n::: note\nx\n:::\n:::", "x");
  const emptied = only.apply(only.tr.delete(only.selection.from - 1, only.selection.from));
  const gone = run(exitNoteRow, emptied);
  expect(md(gone)).toBe("::: prose\na | b\n |\n:::");
  /* not the last paragraph, not empty, not in a row fence: not this command's */
  expect(refuses(exitNoteRow, at("::: note\ngloss\n:::", "gloss"))).toBe(true);
});

test("a margin-note row is left the way a note row is: Enter is its own, the second Enter exits to a row", () => {
  const s = at("::: verse\nalpha\n::: margin-note\nthe note\n:::\nbeta\n:::", "the note");
  expect(refuses(enterInRow, s)).toBe(true);
  expect(refuses(toggleDeclaredLine, s)).toBe(true);
  const out = run(exitNoteRow, run(baseKeymap.Enter, s));
  expect(md(out)).toBe("::: verse\nalpha\n::: margin-note\nthe note\n:::\n\nbeta\n:::");
  expect(caret(out)).toBe("line:|");
  /* between paragraphs, the base keymap's lift */
  const lifted = run(baseKeymap.Enter, run(baseKeymap.Enter, at("::: margin-note\nthe note\n:::\n\nafter", "the note")));
  expect(lifted.doc.content.content.map((n) => n.type.name)).toEqual(["margin_note", "paragraph", "paragraph"]);
  expect(lifted.selection.$from.parent.type.name).toBe("paragraph");
  expect(lifted.selection.$from.depth).toBe(1);
});

test("blankRowSelected: a stanza gap selected whole is the blank row; a caret, a picture or a line's words are not", () => {
  const base = at("::: verse\na\n\nb\n:::", "a");
  expect(blankRowSelected(base.apply(base.tr.setSelection(NodeSelection.create(base.doc, 4))))).toBe(true);
  expect(blankRowSelected(base)).toBe(false);
  expect(blankRowSelected(base.apply(base.tr.setSelection(TextSelection.create(base.doc, 2, 3))))).toBe(false);
  const pic = EditorState.create({ doc: parseMarkdown("![](p.webp)") });
  expect(blankRowSelected(pic.apply(pic.tr.setSelection(NodeSelection.create(pic.doc, 1))))).toBe(false);
});

/* a state with the stanza gap after `n` other gaps selected whole */
function onGap(doc: ReturnType<typeof parseMarkdown>, n = 0): EditorState {
  const gaps: number[] = [];
  doc.descendants((node, p) => { if (node.type.name === "gap") gaps.push(p); });
  return EditorState.create({ doc, selection: NodeSelection.create(doc, gaps[n]) });
}
test("a blank row selected in a paired block: Enter makes a pair after it, and opened for typing it is a pair, the caret in its first half", () => {
  const paired = parseMarkdown("::: verse\na | b\n\nc | d\n:::");
  const entered = run(enterInRow, onGap(paired));
  expect(md(type(entered, "x"))).toBe("::: verse\na | b\n\nx |\nc | d\n:::");
  expect(md(type(run(openBlankRow, onGap(paired)), "x"))).toBe("::: verse\na | b\nx |\nc | d\n:::");
  const opened = run(openBlankRow, onGap(parseMarkdown("::: verse\na\n\nc\n:::")));
  expect(caret(opened)).toBe("line:|");
  expect(md(type(opened, "x"))).toBe("::: verse\na\nx\nc\n:::");
  expect(refuses(openBlankRow, at("::: verse\na\n\nc\n:::", "a"))).toBe(true);
});
test("a blank row selected with no line above it: Backspace takes it out to the start of the line below", () => {
  const N = schema.nodes;
  const first = N.doc.create(null, [N.paragraph.create(null, schema.text("Title")), N.verse.create(null, [N.gap.create(), N.line.create(null, schema.text("a"))])]);
  const s = run(backspaceInRow, onGap(first));
  expect(md(s)).toBe("Title\n\n::: verse\na\n:::");
  expect(caret(s)).toBe("line:|a");
  const noted = run(backspaceInRow, onGap(parseMarkdown("::: verse\na\n::: note\ngloss\n:::\n\nb\n:::")));
  expect(md(noted)).toBe("::: verse\na\n::: note\ngloss\n:::\nb\n:::");
  expect(caret(noted)).toBe("line:|b");
  const above = run(backspaceInRow, onGap(parseMarkdown("::: verse\na | b\n\nc | d\n:::")));
  expect(caret(above)).toBe("cell:b|");
});
test("two blank rows together: Backspace on the second goes up past the first, Delete on the first goes down past the second", () => {
  const two = parseMarkdown("::: verse\na\n\n\nc\n:::");
  expect(caret(run(backspaceInRow, onGap(two, 1)))).toBe("line:a|");
  expect(caret(run(deleteInRow, onGap(two, 0)))).toBe("line:|c");
});
test("a blank row taken out with no text in the block either side: the caret goes to the nearest text, never a blank row selected whole", () => {
  const N = schema.nodes;
  const gaps = N.doc.create(null, [N.verse.create(null, [N.gap.create(), N.gap.create()]), N.paragraph.create(null, schema.text("After"))]);
  const s = run(backspaceInRow, onGap(gaps, 1));
  expect(s.selection).toBeInstanceOf(TextSelection);
  expect(caret(s)).toBe("paragraph:|After");
});
test("Enter on an empty line in a block of pairs makes the new row a pair", () => {
  const N = schema.nodes, cell = (t: string) => N.cell.create(null, t ? schema.text(t) : null);
  const doc = N.doc.create(null, [N.verse.create(null, [N.pair.create(null, [cell("a"), cell("b")]), N.line.create(), N.pair.create(null, [cell("c"), cell("d")])])]);
  let line = -1;
  doc.descendants((n, p) => { if (n.type === N.line) line = p; });
  const s = run(enterInRow, EditorState.create({ doc, selection: TextSelection.create(doc, line + 1) }));
  expect(s.doc.child(0).content.content.map((n) => n.type.name)).toEqual(["pair", "gap", "pair", "pair"]);
  expect(caret(s)).toBe("cell:|");
});
test("caretNear: a position before a stanza gap gives the caret at the next line's start, never the gap selected whole; asked the other way, the line before's end", () => {
  const d = parseMarkdown("::: verse\nOne line\n\nTwo line\n:::\n");
  let gap = -1;
  d.descendants((n, p) => { if (n.type.name === "gap") gap = p; });
  const s = caretNear(d, gap);
  expect(s).toBeInstanceOf(TextSelection);
  expect(d.textBetween(s.from, s.from + 8)).toBe("Two line");
  expect(d.textBetween(caretNear(d, gap, -1).from - 8, caretNear(d, gap, -1).from)).toBe("One line");
  expect(caretNear(d, 0).from).toBe(2);
  expect(caretNear(d, d.content.size).from).toBe(d.content.size - 2);
});
test("a blank row selected with no line below it: Delete takes it out to the end of the line above", () => {
  const N = schema.nodes;
  const last = N.doc.create(null, [N.verse.create(null, [N.line.create(null, schema.text("a")), N.gap.create()]), N.paragraph.create(null, schema.text("After"))]);
  const s = run(deleteInRow, onGap(last));
  expect(md(s)).toBe("::: verse\na\n:::\n\nAfter");
  expect(caret(s)).toBe("line:a|");
});

test("a skipped line number between two lines: Backspace and Delete join the lines across it, the skip kept after them", () => {
  const back = run(backspaceInRow, at("::: verse 545\nalpha\n⟨skipped line number⟩\nbeta\n:::", "beta", 0));
  expect(md(back)).toBe("::: verse 545\nalphabeta\n⟨skipped line number⟩\n:::");
  expect(caret(back)).toBe("line:alpha|beta");
  const del = run(deleteInRow, at("::: verse 545\nalpha\n⟨skipped line number⟩\nbeta\n:::", "alpha"));
  expect(md(del)).toBe("::: verse 545\nalphabeta\n⟨skipped line number⟩\n:::");
  expect(caret(del)).toBe("line:alpha|beta");
});

test("an empty last line before a trailing skipped line number is still the way out", () => {
  const one = run(enterInRow, at("::: verse 10\nalpha\n⟨skipped line number⟩\n:::", "alpha"));
  const two = run(enterInRow, one);
  expect(two.doc.lastChild!.type.name).toBe("paragraph");
  expect(md(type(two, "after"))).toBe("::: verse 10\nalpha\n⟨skipped line number⟩\n:::\n\nafter");
});
