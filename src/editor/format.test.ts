import { test, expect } from "vitest";
import { EditorState, TextSelection, type Command } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { bold, heading, quote, codeBlock, codeBlockRefusal, curlQuotes, curlSelection, wordCount, cutMd, replaceWithLink, formatState } from "./format.ts";

function sel(md: string, a: string, b?: string): EditorState {
  const doc = parseMarkdown(md);
  const find = (n: string, end: boolean): number => {
    let pos = -1;
    doc.descendants((node, p) => { if (pos < 0 && node.isText && node.text!.indexOf(n) >= 0) pos = p + node.text!.indexOf(n) + (end ? n.length : 0); return pos < 0; });
    if (pos < 0) throw new Error("needle not found: " + n);
    return pos;
  };
  return EditorState.create({ doc, selection: TextSelection.create(doc, find(a, false), b === undefined ? find(a, true) : find(b, true)) });
}
const run = (cmd: Command, s: EditorState): EditorState => { let n = s; if (!cmd(s, (tr) => { n = s.apply(tr); })) throw new Error("refused"); return n; };
const md = (s: EditorState): string => serializeMarkdown(s.doc);

test("the marks toggle over the selection and light the bar", () => {
  const s = run(bold, sel("some words here", "words"));
  expect(md(s)).toBe("some **words** here");
  expect(formatState(s).bold).toBe(true);
  expect(md(run(bold, s))).toBe("some words here");
});
test("H makes a level-one heading of the block and takes it back; quote wraps and lifts; code toggles", () => {
  const s = run(heading, sel("a line", "line"));
  expect(md(s)).toBe("# a line");
  expect(formatState(s).heading).toBe(true);
  expect(md(run(heading, s))).toBe("a line");
  const q = run(quote, sel("a line", "line"));
  expect(md(q)).toBe("> a line");
  expect(formatState(q).quote).toBe(true);
  expect(md(run(quote, q))).toBe("a line");
  const c = run(codeBlock, sel("a line", "line"));
  expect(md(c)).toBe("```\na line\n```");
  expect(formatState(c).code).toBe(true);
  expect(md(run(codeBlock, c))).toBe("a line");
});
test("curlQuotes: dashes, quotes by what precedes them, the closed dash, the elision", () => {
  expect(curlQuotes('He said "stop--" and \'tis so', "")).toBe("He said “stop—” and ’tis so");
  expect(curlQuotes("'quoted' word", " ")).toBe("‘quoted’ word");
  expect(curlQuotes("s", "'")).toBe("s");
});
test("curlSelection curls what is selected, across nodes, leaving code alone, keeping the selection", () => {
  const s = run(curlSelection, sel('He said "yes" and `"no"` -- fine', "He", "fine"));
  expect(md(s)).toBe('He said “yes” and `"no"` — fine');
  expect(s.selection.from).toBe(1);
  expect(s.doc.textBetween(s.selection.from, s.selection.to)).toBe('He said “yes” and "no" — fine');
  expect(curlSelection(sel("plain", "plain", "plain"))).toBe(false);
});
test("the word count over the selection or the whole document, blocks kept apart", () => {
  const s = sel("one two\n\nthree four", "two", "three");
  expect(wordCount(s.doc, s.selection.from, s.selection.to)).toBe(2);
  expect(wordCount(s.doc, 0, 0)).toBe(4);
});
test("cutMd: a whole heading selected alone is cut as the heading; a phrase from it is a paragraph", () => {
  const whole = sel("links above\n\n# Testing with a heading 3", "Testing with a heading 3");
  expect(cutMd(whole.doc, whole.selection.from, whole.selection.to)).toBe("# Testing with a heading 3");
  const deep = sel("## Part two", "Part two");
  expect(cutMd(deep.doc, deep.selection.from, deep.selection.to)).toBe("## Part two");
  const phrase = sel("# Testing with a heading 3", "with a heading");
  expect(cutMd(phrase.doc, phrase.selection.from, phrase.selection.to)).toBe("with a heading");
  const para = sel("a whole paragraph", "a whole paragraph");
  expect(cutMd(para.doc, para.selection.from, para.selection.to)).toBe("a whole paragraph");
});
test("cutMd and replaceWithLink: mid-paragraph, whole blocks, and an emptied heading", () => {
  const mid = sel("before middle after", "middle");
  expect(cutMd(mid.doc, mid.selection.from, mid.selection.to)).toBe("middle");
  const t1 = mid.apply(replaceWithLink(mid, mid.selection.from, mid.selection.to, "#2026-09-07/Ideas", "Ideas"));
  expect(md(t1)).toBe("before [Ideas](#2026-09-07/Ideas) after");
  const line = sel("::: verse\nIf music be the food\nplay on\n:::", "music");
  expect(cutMd(line.doc, line.selection.from, line.selection.to)).toBe("music");
  const whole = sel("keep\n\n# Title\n\nbody text\n\nrest", "Title", "text");
  expect(cutMd(whole.doc, whole.selection.from, whole.selection.to)).toBe("# Title\n\nbody text");
  const t2 = whole.apply(replaceWithLink(whole, whole.selection.from, whole.selection.to, "#page/P/Title", "Title"));
  expect(md(t2)).toBe("keep\n\n[Title](#page/P/Title)\n\nrest");
});
test("code over lines broken by Enter keeps each line, and back again", () => {
  const c = run(codeBlock, sel("if matches.any?\n  matches[0][0]\nelse", "matches.any"));
  expect(md(c)).toBe("```\nif matches.any?\n  matches[0][0]\nelse\n```");
  expect(md(run(codeBlock, c))).toBe("if matches.any?\n  matches[0][0]\nelse");
});
test("code refuses a paragraph holding a picture or a page marker, and says so; the picture stays", () => {
  const s = sel("cap ![](x.png) tion", "cap", "tion");
  expect(codeBlock(s, () => {})).toBe(false);
  expect(codeBlockRefusal(s)).toBe("can't make a code block from that");
  expect(codeBlockRefusal(sel("in ⟨8⟩ her degree", "in", "degree"))).toBe("can't make a code block from that");
  expect(codeBlockRefusal(sel("plain words", "plain"))).toBeNull();
});
