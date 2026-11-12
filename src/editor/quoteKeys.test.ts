import { test, expect } from "vitest";
import { EditorState, TextSelection, type Command } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { tabInQuote, shiftTabInQuote, enterInQuote, quoteRefusal, QUOTE_FLOOR } from "./quoteKeys.ts";

function at(md: string, needle: string, to?: string): EditorState {
  const doc = parseMarkdown(md);
  const find = (n: string): number => { let pos = -1; doc.descendants((node, p) => { if (pos < 0 && node.text?.includes(n)) pos = p + node.text!.indexOf(n) + n.length; return pos < 0; }); if (pos < 0) throw new Error(n); return pos; };
  const a = find(needle);
  return EditorState.create({ doc, selection: TextSelection.create(doc, a, to ? find(to) : a) });
}
const run = (cmd: Command, s: EditorState): EditorState => { let n = s; if (!cmd(s, (tr) => { n = s.apply(tr); })) throw new Error("refused"); return n; };
const refuses = (cmd: Command, s: EditorState): boolean => !cmd(s);
const md = (s: EditorState): string => serializeMarkdown(s.doc);

/* the written spellings: a nested quote as ">>", a quote's blocks with no
   blank quote line between; the round trip is what holds */
const roundTrips = (s: EditorState): boolean => parseMarkdown(md(s)).eq(s.doc);
test("Tab pushes the run one level deeper; Shift-Tab lifts it back; the other run stays", () => {
  const s = run(tabInQuote, at("> first\n>\n> second", "second"));
  expect(md(s)).toBe("> first\n>> second");
  expect(roundTrips(s)).toBe(true);
  expect(s.doc.firstChild!.childCount).toBe(2);
  const back = run(shiftTabInQuote, s);
  expect(back.doc.firstChild!.type.name).toBe("blockquote");
  expect(back.doc.firstChild!.textContent).toBe("firstsecond");
  expect(roundTrips(back)).toBe(true);
});
test("Shift-Tab at the outermost level refuses and says so; Tab outside a quote is not this command's", () => {
  const s = at("> only", "only");
  expect(refuses(shiftTabInQuote, s)).toBe(true);
  expect(quoteRefusal(s, true)).toBe(QUOTE_FLOOR);
  expect(refuses(tabInQuote, at("plain", "plain"))).toBe(true);
});
test("a selection reaching outside the quote has no single container and says so", () => {
  const s = at("> quoted\n\nafter", "quoted", "after");
  expect(refuses(tabInQuote, s)).toBe(true);
  expect(quoteRefusal(s, false)).toBe("Tab indents one list, quote, or code block at a time");
});
test("a selection across two runs of one quote moves both, the blank line between them kept", () => {
  const s = run(tabInQuote, at("> a\n>\n> b\n>\n> c", "a", "b"));
  expect(md(s)).toBe(">> a\n>> \n>> b\n> c");
  expect(roundTrips(s)).toBe(true);
});
test("a heading or a table in a quote nests alone with Tab, the caret where it was, and comes back with Shift-Tab", () => {
  const h = at("> ## Quoted head\n>\n> quoted text", "Quo");
  const s = run(tabInQuote, h);
  expect(s.doc.firstChild!.firstChild!.type.name).toBe("blockquote");
  expect(s.doc.firstChild!.firstChild!.firstChild!.type.name).toBe("heading");
  expect(s.doc.firstChild!.lastChild!.textContent).toBe("quoted text");
  expect(s.selection.$from.parent.textBetween(0, s.selection.$from.parentOffset)).toBe("Quo");
  expect(roundTrips(s)).toBe(true);
  expect(run(shiftTabInQuote, s).doc.eq(h.doc)).toBe(true);
  const t = at("> quoted text\n>\n> | a | b |\n> | - | - |\n> | 1 | 2 |", "1");
  const u = run(tabInQuote, t);
  expect(u.doc.firstChild!.lastChild!.type.name).toBe("blockquote");
  expect(u.doc.firstChild!.lastChild!.firstChild!.type.name).toBe("table");
  expect(u.doc.firstChild!.firstChild!.textContent).toBe("quoted text");
  expect(roundTrips(u)).toBe(true);
  expect(run(shiftTabInQuote, u).doc.eq(t.doc)).toBe(true);
});
test("Enter in a quote breaks the line; Enter on the empty last line leaves the quote", () => {
  const s = run(enterInQuote, at("> one\n> two", "one"));
  expect(md(s.apply(s.tr.insertText("new")))).toBe("> one\n> new\n> two");
  const end = run(enterInQuote, at("> one", "one"));
  expect(end.doc.childCount).toBe(1);
  const out = run(enterInQuote, end);
  expect(out.doc.childCount).toBe(2);
  expect(out.selection.$from.depth).toBe(1);
  expect(md(out.apply(out.tr.insertText("out")))).toBe("> one\n\nout");
  expect(refuses(enterInQuote, at("plain", "plain"))).toBe(true);
});
test("Shift-Tab on one run of a nested quote lifts that run alone, the runs around it staying nested", () => {
  const shape = (s: EditorState): string => { const out: string[] = []; s.doc.firstChild!.forEach((c) => out.push(c.type.name === "blockquote" ? "Q(" + c.textContent + ")" : c.textContent)); return out.join(" "); };
  const s = run(shiftTabInQuote, at("> intro\n>\n>> a\n>>\n>> b\n>>\n>> c", "b"));
  expect(shape(s)).toBe("intro Q(a) b Q(c)");
  expect(roundTrips(s)).toBe(true);
  expect(s.selection.$from.parent.textContent).toBe("b");
  /* the first run lifted joins the outer paragraph above it */
  expect(shape(run(shiftTabInQuote, at("> intro\n>\n>> a\n>>\n>> b", "a")))).toBe("introa Q(b)");
});
test("Shift-Tab on the blank line between two runs of a nested quote lifts nothing and refuses", () => {
  const s0 = at("> intro\n>\n>> a\n>>\n>> b", "a");
  const s = s0.apply(s0.tr.setSelection(TextSelection.create(s0.doc, s0.selection.from + 1)));
  expect(refuses(shiftTabInQuote, s)).toBe(true);
  expect(quoteRefusal(s, true)).toBe("⌃⌘M toggles markdown");
});
