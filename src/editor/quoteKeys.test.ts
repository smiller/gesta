import { test, expect } from "vitest";
import { EditorState, TextSelection, type Command } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { tabInQuote, shiftTabInQuote, quoteRefusal, QUOTE_FLOOR } from "./quoteKeys.ts";

function at(md: string, needle: string, to?: string): EditorState {
  const doc = parseMarkdown(md);
  const find = (n: string): number => { let pos = -1; doc.descendants((node, p) => { if (pos < 0 && node.isText && node.text!.indexOf(n) >= 0) pos = p + node.text!.indexOf(n) + n.length; return pos < 0; }); if (pos < 0) throw new Error(n); return pos; };
  const a = find(needle);
  return EditorState.create({ doc, selection: TextSelection.create(doc, a, to ? find(to) : a) });
}
const run = (cmd: Command, s: EditorState): EditorState => { let n = s; if (!cmd(s, (tr) => { n = s.apply(tr); })) throw new Error("refused"); return n; };
const refuses = (cmd: Command, s: EditorState): boolean => !cmd(s);
const md = (s: EditorState): string => serializeMarkdown(s.doc);

/* the serializer's own spellings: a nested quote as ">>", a quote's
   blocks with no blank quote line between; the round trip is what holds */
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
