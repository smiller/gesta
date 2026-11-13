import { test, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { pasted, pasteProps, sourcePasted, keepsSpaces, type Clipboard } from "./paste.ts";
import { COPY_MARK } from "./copy.ts";
import { Slice } from "prosemirror-model";
import { schema } from "../model/schema.ts";
import { referencePayload } from "./reference.ts";
import { journalOf } from "../store/headings.ts";

function at(md: string, needle: string): EditorState {
  const doc = parseMarkdown(md);
  let pos = -1;
  doc.descendants((n, p) => { if (pos < 0 && n.text?.includes(needle)) pos = p + n.text!.indexOf(needle) + needle.length; return pos < 0; });
  return EditorState.create({ doc, selection: TextSelection.create(doc, pos) });
}
const PAGE = "file:///Users/someone/gesta/dist/index.html";
const clip = (plain: string, html = ""): Clipboard => ({ plain, html, types: html ? ["text/plain", "text/html"] : ["text/plain"], file: null });
/* the state a paste leaves, or what it answers instead of a transaction */
function pastedState(s: EditorState, plain: string, html = ""): EditorState {
  const r = pasted(s, clip(plain, html), PAGE + "#2026-10-16");
  if (typeof r === "string" || "file" in r) throw new Error("no transaction: " + JSON.stringify(r));
  return s.apply(r.tr);
}
/* the document a paste leaves, as markdown, or what it answers instead */
function after(s: EditorState, plain: string, html = ""): string {
  const r = pasted(s, clip(plain, html), PAGE + "#2026-10-16");
  return typeof r === "string" ? r : "file" in r ? "file" : serializeMarkdown(s.apply(r.tr).doc);
}
const paste = (s: EditorState, text: string): string => after(s, text);
const linksIn = (doc: EditorState["doc"]): string[] => { const hrefs: string[] = []; doc.descendants((n) => { n.marks.forEach((m) => { if (m.type.name === "link") hrefs.push(m.attrs.href as string); }); return true; }); return hrefs; };

test("several lines render as the markdown they spell; a single line stays as typed", () => {
  expect(paste(at("start here", "here"), "\n\n# Title\n\n- one\n- two")).toBe("start here\n\n# Title\n\n- one\n- two");
  /* the characters as typed: what a literal asterisk becomes on save is not
     the paste's question */
  const one = at("start here", "start");
  expect(pastedState(one, " 2*3*4 and [x](y)").doc.textContent).toBe("start 2*3*4 and [x](y) here");
});
test("a pasted reference lands as its markdown: the link line and the quote", () => {
  const ref = "[*Gesta*, 7 September 2026](#2026-09-07?h=blind%20cord):\n\n> blind cord";
  const P = schema.nodes.paragraph, doc = schema.nodes.doc.create(null, [P.create(null, schema.text("note")), P.create()]);
  expect(paste(EditorState.create({ doc, selection: TextSelection.create(doc, 7) }), "\n\n" + ref)).toBe("note\n\n[*Gesta*, 7 September 2026](#2026-09-07?h=blind%20cord):\n\n> blind cord");
});
test("a single quote or heading line renders; a single entry link becomes a link in place", () => {
  expect(paste(at("a\n\nb", "a"), "\n> quoted")).toBe("a\n\n> quoted\n\nb");
  expect(paste(at("see  now", "see "), "[Ideas](#2026-09-07/Ideas)")).toBe("see [Ideas](#2026-09-07/Ideas) now");
});
test("inside a list item, a cell or a verse row the lines arrive as breaks; in a code block every character is literal", () => {
  /* plain lines: a continuation line that READS as a block is left for the
     save to make a block of */
  expect(paste(at("- item", "item"), " one\nplain two")).toBe("- item one\n    plain two");   /* the continuation indent as written */
  const row = at("::: verse\nline\n:::", "line");
  expect(pastedState(row, " a\nb").doc.firstChild!.firstChild!.childCount).toBe(3);
  expect(paste(at("```\ncode\n```", "code"), "\n# not a heading\n- nor a list")).toBe("```\ncode\n# not a heading\n- nor a list\n```");
});

test("a verse fence pasted as text is set down whole: mid-paragraph the paragraph splits, an empty paragraph is replaced", () => {
  const fence = "::: verse\nHeil! | Hail!\nErlösung | Salvation\n:::";
  const mid = at("start end", "start");
  expect(after(mid, fence)).toBe("start\n\n" + fence + "\n\n end");
  const empty = parseMarkdown("before\n\nafter");
  const s2 = EditorState.create({ doc: empty, selection: TextSelection.create(empty, 9) });
  expect(after(s2, "# Title\n\nbody")).toBe("before\n\n# Title\n\nbody\n\nafter");
  /* one line, or lines inside a list item, are not blocks */
  expect(after(mid, "one line")).toBe("startone line end");
  expect(after(at("- item", "item"), "a\nb")).toBe("- itema\n    b");
});


test("inside a reference block every character is literal, as in a code block: the directive is never split", () => {
  const s = at("::: reference\nfrom the last title\n:::\n\npara", "from ");
  expect(paste(s, "one\n\ntwo\n")).toBe("::: reference\nfrom one\n\ntwo\nthe last title\n:::\n\npara");
});


test("a paste of line breaks alone is nothing: it never replaces a selection; in code, or as the editor's own copy, it pastes", () => {
  const prose = over("some words", "words"), code = at("```\nx\n```", "x");
  for (const breaks of ["\n\n", "\r\n", "  \n "]) expect(after(prose, breaks)).toBe("nothing");
  expect(after(prose, "a\n")).toBe("some a");
  expect(after(prose, "")).toBe("editor's own");
  expect(after(prose, " ")).toBe("some  ");
  expect(after(code, "\n\n")).toBe("```\nx\n\n\n```");
  expect(after(prose, "\n\n", "<br><br>")).toBe("nothing");
  expect(after(prose, "\n\n", '<p data-pm-slice="1 1 []"></p><p></p>')).toBe("editor's own");
});

test("a one-line quote pasted inside a quote is its text; a one-line quote of a picture is a quote", () => {
  const q = at("> quoted line", "quoted");
  expect(paste(q, "> inner")).toBe("> quoted> inner line");
  const p = at("x", "x");
  expect(after(p, "> ![](a.png)")).toBe("x\n\n> ![](a.png)");
});
test("a pasted link to an address that names no entry stays as typed", () => {
  const s = at("x", "x");
  const near = pastedState(s, " [near](#pagex)").doc;
  expect(near.textContent).toBe("x [near](#pagex)");
  expect(linksIn(near)).toEqual([]);
  for (const miss of ["[a](#page/)", "[a](#shelf/A)"]) expect(linksIn(pastedState(s, miss).doc)).toEqual([]);
  expect(paste(at("see  now", "see "), "[Ideas](#2026-09-07/Ideas)")).toBe("see [Ideas](#2026-09-07/Ideas) now");
});
test("a pasted fence the model refuses is named with its reason; a clean paste names nothing", () => {
  const refusal = (text: string) => { const r = pasted(at("x", "x"), clip(text), PAGE); return typeof r === "object" && "tr" in r ? r.refused : "no transaction"; };
  expect(refusal("::: verse -1\nline one\n:::")).toBe("::: verse -1 — -1 is not a starting line, so it stayed a paragraph");
  expect(refusal("::: verse 2\nline one\n:::")).toBe(null);
});
test("a bare URL pasted alone is a link at once", () => {
  const s = at("see  now", "see ");
  const doc = pastedState(s, "https://example.org/x").doc;
  expect(linksIn(doc)).toEqual(["https://example.org/x"]);
  expect(doc.textContent).toBe("see https://example.org/x now");
  expect(linksIn(pastedState(s, "see https://example.org/x").doc)).toEqual([]);
});
test("a pasted link to this page by its full address keeps only its bare address; a link anywhere else keeps its own", () => {
  const page = PAGE;
  const link = (href: string) => schema.text("Horace", [schema.marks.link.create({ href })]);
  const html = new Slice(schema.node("doc", null, [schema.node("paragraph", null, [link(page + "#page/Horace?h=sunt%20quos"), schema.text(" and "), link("https://example.com/#x"), schema.text(" and "), link("file:///Users/someone/writer/index.html#2022-07-05")])]).content, 0, 0);
  const hrefs: string[] = [];
  const ownPaste = pasteProps({ file: () => {}, refused: () => {}, href: () => page + "#2026-10-16" });
  ownPaste.transformPasted!(html, null as never, false).content.descendants((n) => { n.marks.forEach((m) => hrefs.push(m.attrs.href as string)); });
  expect(hrefs).toEqual(["#page/Horace?h=sunt%20quos", "https://example.com/#x", "file:///Users/someone/writer/index.html#2022-07-05"]);
});
test("a link to this page in pasted markdown keeps only its bare address; one whose words are its address stays whole; a paste with nothing to change comes back as it was", () => {
  const page = PAGE;
  const s = at("start here", "here");
  expect(after(s, `[Horace](${page}#page/Horace)\n\nand [${page}#page/Ode](${page}#page/Ode)`)).toBe(`start here\n\n[Horace](#page/Horace)\n\nand ${page}#page/Ode`);
  const plain = new Slice(parseMarkdown("no links [here](https://example.com/)").content, 0, 0);
  expect(pasteProps({ file: () => {}, refused: () => {}, href: () => page }).transformPasted!(plain, null as never, false)).toBe(plain);
});

test("pasted HTML keeps its spaces only when every block in it is one this page marked", () => {
  const el = (name: string, marked = false) => ({ nodeType: 1, nodeName: name, textContent: "", hasAttribute: (a: string) => marked && a === COPY_MARK });
  const text = (t: string) => ({ nodeType: 3, nodeName: "#text", textContent: t, hasAttribute: () => false });
  const root = (...kids: object[]) => ({ childNodes: kids }) as unknown as globalThis.Node;
  expect(keepsSpaces(root(el("META"), el("P", true), el("BLOCKQUOTE", true)))).toBe(true);
  expect(keepsSpaces(root(el("P", true), text("\n"), el("BLOCKQUOTE", true)))).toBe(true);
  // a marked copy inside a message of its own: the message's HTML is not ours
  expect(keepsSpaces(root(el("P"), el("BLOCKQUOTE", true)))).toBe(false);
  expect(keepsSpaces(root(el("P", true), text("and more"))) ).toBe(false);
  expect(keepsSpaces(root(el("META")))).toBe(false);
});

function over(md: string, words: string): EditorState {
  const doc = parseMarkdown(md);
  let from = -1;
  doc.descendants((n, p) => {
    if (from >= 0) return false;
    if (n.isTextblock && n.textContent.includes(words)) from = p + 1 + n.textContent.indexOf(words);
    return from < 0;
  });
  return EditorState.create({ doc, selection: TextSelection.create(doc, from, from + words.length) });
}
const REF = "[*The Wanderer*, 78](#bookshelf/Wanderer?h=Woria%C3%B0):\n\n> ::: verse 78\n> Woriað þa winsalo | The halls decay\n> :::";
test("a reference pasted onto a selection in one line makes the selection a link to its address, the caret after it", () => {
  const s = over("pauses at 78 (woriað)", "78");
  const out = pastedState(s, REF);
  expect(serializeMarkdown(out.doc)).toBe("pauses at [78](#bookshelf/Wanderer?h=Woria%C3%B0) (woriað)");
  expect([out.selection.empty, out.selection.from]).toEqual([true, s.selection.to]);
  expect(after(over("see the Ideas page", "the Ideas"), "[Ideas](#2026-09-07/Ideas)")).toBe("see [the Ideas](#2026-09-07/Ideas) page");
  const part = over("see [the](#2026-09-01) Ideas page", "the");
  const wide = EditorState.create({ doc: part.doc, selection: TextSelection.create(part.doc, part.selection.from, part.selection.to + 6) });
  expect(after(wide, REF)).toBe("see [the Ideas](#bookshelf/Wanderer?h=Woria%C3%B0) page");
  expect(after(over("a *very* fine 78", "very fine"), REF)).toBe("a [*very* fine](#bookshelf/Wanderer?h=Woria%C3%B0) 78");
});
test("a paste onto a selection is a paste as before when it is no reference, the words span two blocks, they cannot carry a link or the address names no entry", () => {
  expect(after(over("pauses at 78", "78"), "plain words")).toBe("pauses at plain words");
  expect(after(over("pauses at 78", "78"), "[x](#2026-09-07):\n\n> one\n\nand more [y](#2026-09-08)")).toBe("pauses at \n\n[x](#2026-09-07):\n\n> one\n\nand more [y](#2026-09-08)");
  expect(after(over("pauses at 78", "78"), "[x](https://example.com/):\n\n> one")).toBe("pauses at \n\n[x](https://example.com/):\n\n> one");
  expect(after(over("pauses at 78", "78"), "[x](#not%20an%20entry):\n\n> one")).toBe("pauses at \n\n[x](#not%20an%20entry):\n\n> one");
  expect(after(over("pauses at 78", "78"), "[x](#2026-09-07) and more")).toBe("pauses at [x](#2026-09-07) and more");
  /* no selection: the label in the line, a paste of its own */
  expect(after(at("pauses at 78", "78"), REF)).toBe("pauses at 78[*The Wanderer*, 78](#bookshelf/Wanderer?h=Woria%C3%B0)");
  const two = parseMarkdown("one\n\ntwo");
  expect(after(EditorState.create({ doc: two, selection: TextSelection.create(two, 2, 8) }), REF)).toBe("o\n\n" + REF + "\n\no");
  expect(after(over("```\ncode 78\n```", "78"), REF)).toBe("```\ncode " + REF + "\n```");
  expect(after(over("::: reference\nfrom 78\n:::", "78"), REF)).toBe("::: reference\nfrom " + REF + "\n:::");
});
test("a reference pasted into a line with words in it arrives as its label alone, no colon, the caret after it", () => {
  const s = at("as the poem says,  and so on", "says, ");
  const out = pastedState(s, REF);
  expect(serializeMarkdown(out.doc)).toBe("as the poem says, [*The Wanderer*, 78](#bookshelf/Wanderer?h=Woria%C3%B0) and so on");
  expect(out.doc.textBetween(out.selection.from, out.doc.content.size - 1)).toBe(" and so on");
  expect(after(at("as the poem says ", "says "), REF)).toBe("as the poem says [*The Wanderer*, 78](#bookshelf/Wanderer?h=Woria%C3%B0)");
  expect(after(at("- see ", "see "), REF)).toBe("- see [*The Wanderer*, 78](#bookshelf/Wanderer?h=Woria%C3%B0)");
});
test("a reference pasted on an empty line, over a selection, where a link cannot stand, or naming no entry is not cut to its label", () => {
  const P = schema.nodes.paragraph;
  const empty = schema.nodes.doc.create(null, [P.create(null, schema.text("before")), P.create(), P.create(null, schema.text("after"))]);
  expect(after(EditorState.create({ doc: empty, selection: TextSelection.create(empty, 9) }), REF)).toBe("before\n\n" + REF + "\n\nafter");
  /* over a selection: the selection made a link instead */
  expect(after(over("pauses at 78", "78"), REF)).toBe("pauses at [78](#bookshelf/Wanderer?h=Woria%C3%B0)");
  expect(after(at("```\ncode 78\n```", "78"), REF)).toBe("```\ncode 78" + REF + "\n```");
  expect(after(at("pauses at 78", "78"), "[x](#not%20an%20entry):\n\n> one")).toBe("pauses at 78\n\n[x](#not%20an%20entry):\n\n> one");
  expect(after(at("pauses at 78", "78"), "[Ideas](#2026-09-07/Ideas)")).toBe("pauses at 78[Ideas](#2026-09-07/Ideas)");
  expect(after(at("pauses at 78", "78"), "plain words")).toBe("pauses at 78plain words");
});
test("text after a reference's first line that is no quoted passage, or a copy made in this page, is pasted as before", () => {
  const rest = "[Monday](#2026-09-07):\n\nfirst para\n\n- a list";
  expect(after(at("intro line", "line"), rest)).toBe("intro line\n\n" + rest);
  expect(after(over("intro line", "line"), rest)).toBe("intro \n\n" + rest);
  const cut = '<p data-pm-slice="1 1 []">x</p>';
  expect(after(at("as the poem says ", "says "), REF, cut)).toBe("editor's own");
  expect(after(over("pauses at 78", "78"), REF, cut)).toBe("editor's own");
  expect(after(at("as the poem says ", "says "), REF, "<p data-gesta-copy><a href=\"#x\">x</a>:</p>")).toBe("as the poem says [*The Wanderer*, 78](#bookshelf/Wanderer?h=Woria%C3%B0)");
});
test("the reference ⌃⌘R copies is the one a paste onto words or into a line reads", () => {
  const doc = parseMarkdown("::: verse\nOf man's first disobedience, and the fruit\n:::");
  const out = referencePayload(EditorState.create({ doc, selection: TextSelection.create(doc, 3, 20) }), { date: "bookshelf", tag: "Milton, John/Paradise Lost/Book 1" }, journalOf({ "bookshelf/Milton, John/Paradise Lost": "# Paradise Lost" }));
  if (!("text" in out)) throw new Error("refused");
  expect(after(at("as he says ", "says "), out.text)).toBe("as he says [" + out.label + "](" + out.url + ")");
  expect(after(over("as he says so", "so"), out.text)).toBe("as he says [so](" + out.url + ")");
});
test("spaces at a selection's edges stay outside the link; a selection of spaces alone is no link", () => {
  const s = over("pauses at 78 here", " 78 ");
  const out = pastedState(s, REF);
  expect(serializeMarkdown(out.doc)).toBe("pauses at [78](#bookshelf/Wanderer?h=Woria%C3%B0) here");
  expect(out.selection.from).toBe(s.selection.to);
  expect(after(over("pauses at  78", "  "), REF)).toBe("pauses at\n\n" + REF + "\n\n78");
});

const GHOSTTY = '<div style="font-family: monospace; white-space: pre;"><div style="display: inline;color: rgb(177, 185, 249);">git log</div> ran, and\n  <div style="display: inline;font-weight: bold;">bold</div> words.</div>';

const terminal = (s: EditorState, html: string, plain: string): string => after(s, plain, html);
test("a terminal's copy is styled preformatted text alone: one white-space: pre block of inline runs", () => {
  /* a terminal's copy is its text, its lines joined; any other HTML is the editor's own paste */
  const s = at("x", "x"), plain = "git log ran, and\n  bold words.", joined = "xgit log ran, and bold words.";
  expect(terminal(s, GHOSTTY, plain)).toBe(joined);
  expect(terminal(s, "<meta charset='utf-8'>" + GHOSTTY, plain)).toBe(joined);
  for (const html of ["<pre>let x = 1;</pre>", '<div style="white-space: pre-wrap;">a</div>', "<p>a</p><ul><li>b</li></ul>", "<blockquote " + COPY_MARK + '=""><p>a</p></blockquote>',
    '<div style="color: #ccc; white-space: pre;"><div><span>const</span> x = 1;</div><div>y</div></div>', GHOSTTY + "<p>after</p>", GHOSTTY.replace("display: inline;", "display: inline-block;")]) expect(terminal(s, html, plain)).toBe("editor's own");
  expect(terminal(s, GHOSTTY.replace("git log", '<a href="https://example.org/">git log</a>'), plain)).toBe(joined);
});
/* a terminal's copy as the markdown view takes it: its lines joined, nothing parsed */
const unwrapped = (text: string): string => {
  const r = sourcePasted(clip(text, GHOSTTY));
  if (!r || !("text" in r)) throw new Error("not a terminal's copy");
  return r.text;
};
test("a terminal's wrapped lines are joined: a line not ending a sentence runs on into the next, a list item or a new message always starts its own", () => {
  expect(unwrapped("Every one passed\n  npm run verify before it landed.")).toBe("Every one passed npm run verify before it landed.");
  expect(unwrapped("found nine things.\n    Eight were fixed")).toBe("found nine things.\n    Eight were fixed");
  expect(unwrapped("the string rules:\n  - Kept off\n  1. First")).toBe("the string rules:\n  - Kept off\n  1. First");
  expect(unwrapped("a paragraph\n\nanother")).toBe("a paragraph\n\nanother");
  expect(unwrapped("- outside text reaches the\n    decoder.")).toBe("- outside text reaches the decoder.");
  for (const end of ["Shall I commit?", "Done!", "Summary:", "And so…", "it said “stop.”", "(see above.)"]) expect(unwrapped(end + "\nNext line.")).toBe(end + "\nNext line.");
  expect(unwrapped("first\n• second\n1) third\n⏺ Next step")).toBe("first\n• second\n1) third\n⏺ Next step");
});

test("a terminal's copy of markdown keeps its structure: nothing in a fence is joined, nor a fence, heading, quote or table line", () => {
  expect(unwrapped("::: verse\na | one\nb | two\n:::")).toBe("::: verse\na | one\nb | two\n:::");
  expect(unwrapped("```\nnpm test\nnpm run verify\n```")).toBe("```\nnpm test\nnpm run verify\n```");
  expect(unwrapped("# A heading\nits text runs\non")).toBe("# A heading\nits text runs on");
  expect(unwrapped("> quoted\n> lines")).toBe("> quoted\n> lines");
  expect(unwrapped("| a | b |\n| c | d |")).toBe("| a | b |\n| c | d |");
  expect(unwrapped("words before\n```\ncode\n```")).toBe("words before\n```\ncode\n```");
});
test("a terminal's copy that is not blocks is pasted as plain text is: one node set in whole, the transaction marked as a paste", () => {
  const r = pasted(at("- item", "item"), clip(" one line", GHOSTTY), PAGE);
  if (typeof r !== "object" || !("tr" in r)) throw new Error(String(r));
  expect([r.tr.getMeta("paste"), r.tr.getMeta("uiEvent")]).toEqual([true, "paste"]);
  expect(serializeMarkdown(r.tr.doc)).toBe("- item one line");
});
test("a terminal's copy with no text is nothing: never the editor's paste of its HTML", () => {
  expect(after(over("some words", "words"), "", GHOSTTY)).toBe("nothing");
});
