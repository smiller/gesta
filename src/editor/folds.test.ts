// A work's contents folding under its `##` headings (2026-09-28, the
// contents-folds plan): the sections, their counts, the decorations, and
// the plugin state that opens a section the selection lands in.
import { test, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import type { Decoration } from "prosemirror-view";
import { parseMarkdown } from "../model/parse.ts";
import { foldSections, foldDecorations, sectionAt, folds, foldsKey, toggleFold, setFolds, openFoldAt, openKeys } from "./folds.ts";

const CONTENTS = "# The Faerie Queene\n\n*Disposed into twelue bookes*\n\n::: reference\nroman book and canto\n:::\n\n" +
  "## Dedications\n\nTo the most high, mightie and magnificent empresse\n\n- [Letter to Raleigh](#bookshelf/S/W/Letter)\n- [Commendatory Verses](#bookshelf/S/W/CV)\n\n" +
  "## Book I: The Legende of the Knight\n\n- [Proem](#bookshelf/S/W/1.pr)\n- [Canto i](#bookshelf/S/W/1.1)\n- [Canto ii](#bookshelf/S/W/1.2)\n\n" +
  "### a sub-heading inside Book I\n\ntext\n\n" +
  "## Book VII: Two Cantos of Mutabilitie\n\n- [Canto vi](#bookshelf/S/W/7.6)\n\n# a level-one heading ends a section\n\nafter";
const doc = parseMarkdown(CONTENTS);

test("a section is a ## heading and everything under it down to the next heading of level 1 or 2", () => {
  const s = foldSections(doc);
  expect(s.map((x) => x.key)).toEqual(["Dedications", "Book I: The Legende of the Knight", "Book VII: Two Cantos of Mutabilitie"]);
  const bodyText = (i: number) => doc.textBetween(s[i].from, s[i].to, "|");
  expect(bodyText(0)).toBe("To the most high, mightie and magnificent empresse|Letter to Raleigh|Commendatory Verses");
  expect(bodyText(1)).toContain("a sub-heading inside Book I");   /* a level-three heading stays inside */
  expect(bodyText(2)).toBe("Canto vi");                              /* a level-one heading ends it */
});
test("a section's count is its links: N entries, 1 entry", () => {
  expect(foldSections(doc).map((x) => x.count)).toEqual(["2 entries", "3 entries", "1 entry"]);
});
test("the decorations: every heading marked with its count and state, a closed section's blocks hidden", () => {
  const sections = foldSections(doc);
  const decos = (open: string[]) => foldDecorations(doc, sections, new Set(sections.filter((x) => open.includes(x.key)).map((x) => x.heading))).find() as Decoration[];
  const attrsAt = (open: string[], text: string) => {
    const d = decos(open).find((x) => doc.nodeAt(x.from)!.textContent.startsWith(text));
    return d ? (d as unknown as { type: { attrs: Record<string, string> } }).type.attrs : null;
  };
  expect(attrsAt([], "Book I")).toEqual({ class: "fold", "data-count": "3 entries", "aria-expanded": "false" });
  expect(attrsAt(["Book I: The Legende of the Knight"], "Book I")!["aria-expanded"]).toBe("true");
  const hidden = (open: string[]) => decos(open).filter((d) => (d as unknown as { type: { attrs: Record<string, string> } }).type.attrs.class === "folded").map((d) => doc.nodeAt(d.from)!.type.name);
  expect(hidden([])).toEqual(["paragraph", "bullet_list", "bullet_list", "heading", "paragraph", "bullet_list"]);
  expect(hidden(["Dedications", "Book I: The Legende of the Knight"])).toEqual(["bullet_list"]);
  /* nothing before the first ## folds */
  expect(decos([]).every((d) => d.from > doc.child(0).nodeSize)).toBe(true);
});
test("sectionAt: the section a position's body belongs to, null above the first heading or on a heading", () => {
  let inCanto = -1;
  doc.descendants((n, pos) => { if (inCanto < 0 && n.isText && n.text === "Canto ii") inCanto = pos + 1; return inCanto < 0; });
  expect(sectionAt(foldSections(doc), inCanto)?.key).toBe("Book I: The Legende of the Knight");
  expect(sectionAt(foldSections(doc), 3)).toBe(null);
});

function stateWith(opts: Parameters<typeof folds>[0]): EditorState {
  return EditorState.create({ doc, plugins: [folds(opts)] });
}
test("the plugin: off draws nothing; on starts from the open set it is given; a toggle opens and closes one section", () => {
  expect(foldsKey.getState(stateWith({ on: false, open: [] }))!.decorations.find().length).toBe(0);
  let s = stateWith({ on: true, open: ["Dedications"] });
  expect(openKeys(s)).toEqual(["Dedications"]);
  toggleFold("Book VII: Two Cantos of Mutabilitie")(s, (tr) => { s = s.apply(tr); });
  expect(openKeys(s).sort()).toEqual(["Book VII: Two Cantos of Mutabilitie", "Dedications"]);
  toggleFold("Dedications")(s, (tr) => { s = s.apply(tr); });
  expect(openKeys(s)).toEqual(["Book VII: Two Cantos of Mutabilitie"]);
  setFolds(false, [])(s, (tr) => { s = s.apply(tr); });
  expect(foldsKey.getState(s)!.decorations.find().length).toBe(0);
});
test("a selection landing inside a closed section opens it (a search result, a highlight, a caret moved there)", () => {
  let s = stateWith({ on: true, open: [] });
  let pos = -1;
  doc.descendants((n, p) => { if (pos < 0 && n.isText && n.text === "Canto i") pos = p + 2; return pos < 0; });
  s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, pos)));
  expect(openKeys(s)).toEqual(["Book I: The Legende of the Knight"]);
});

// The review of 2026-09-28 (one /code-review at high, three of its findings
// also medium's): a section is followed by POSITION while the page is
// edited and remembered by its heading's text, twins numbered.
const at = (d: typeof doc, text: string, offset = 0): number => {
  let pos = -1;
  d.descendants((n, p) => { if (pos < 0 && n.isText && n.text!.includes(text)) pos = p + n.text!.indexOf(text) + offset; return pos < 0; });
  if (pos < 0) throw new Error("not found: " + text);
  return pos;
};
test("typing in an open heading keeps its section open, and the new text is what is remembered", () => {
  let s = stateWith({ on: true, open: ["Book I: The Legende of the Knight"] });
  s = s.apply(s.tr.insertText("!", at(s.doc, "the Knight", 10)));
  expect(openKeys(s)).toEqual(["Book I: The Legende of the Knight!"]);
  expect(foldsKey.getState(s)!.decorations.find().filter((d) => (d as unknown as { type: { attrs: Record<string, string> } }).type.attrs.class === "folded").length).toBe(3);   /* Dedications' two blocks and Book VII's list */
});
test("twin headings are two sections, toggled apart and remembered apart", () => {
  const twin = parseMarkdown("# W\n\n## Notes\n\n- [a](#a)\n\n## Notes\n\n- [b](#b)");
  const keys = foldSections(twin).map((x) => x.key);
  expect(keys[0]).toBe("Notes");
  expect(keys[1]).not.toBe("Notes");
  let s = EditorState.create({ doc: twin, plugins: [folds({ on: true, open: [] })] });
  toggleFold(keys[1])(s, (tr) => { s = s.apply(tr); });
  expect(openKeys(s)).toEqual([keys[1]]);
});
test("closing a section moves a caret out of it onto the heading's end", () => {
  let s = stateWith({ on: true, open: ["Dedications"] });
  s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, at(s.doc, "Letter to Raleigh", 3))));
  toggleFold("Dedications")(s, (tr) => { s = s.apply(tr); });
  expect(openKeys(s)).toEqual([]);
  expect(s.selection.$head.parent.textContent).toBe("Dedications");
  expect(s.selection.$head.parentOffset).toBe("Dedications".length);
});
test("an edit leaving the caret inside a closed section opens it", () => {
  let s = stateWith({ on: true, open: ["Book I: The Legende of the Knight"] });
  s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, at(s.doc, "Canto ii", 2))));
  toggleFold("Book I: The Legende of the Knight")(s, (tr) => { s = s.apply(tr); });   /* caret moved to the heading */
  /* an edit whose mapping carries the caret into the closed body */
  const inside = at(s.doc, "Canto ii", 2);
  s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, inside)).insertText("x"));
  expect(openKeys(s)).toEqual(["Book I: The Legende of the Knight"]);
});
test("switching folding on opens the section holding the selection (a highlight placed before the warm)", () => {
  let s = stateWith({ on: false, open: [] });
  s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, at(s.doc, "Canto vi"), at(s.doc, "Canto vi", 8))));
  setFolds(true, ["Dedications"])(s, (tr) => { s = s.apply(tr); });
  expect(openKeys(s).sort()).toEqual(["Book VII: Two Cantos of Mutabilitie", "Dedications"]);
});
test("openFoldAt opens the section a position is in (⌃⌘G's landing), and does nothing outside one", () => {
  let s = stateWith({ on: true, open: [] });
  openFoldAt(at(s.doc, "Canto ii"))(s, (tr) => { s = s.apply(tr); });
  expect(openKeys(s)).toEqual(["Book I: The Legende of the Knight"]);
  expect(openFoldAt(3)(s)).toBe(false);
});

// The confirmation pass at high, 2026-09-28.
test("a twin's key never collides with a heading that reads like one", () => {
  const d = parseMarkdown("# W\n\n## Notes\n\n- [a](#a)\n\n## Notes\n\n- [b](#b)\n\n## Notes (2)\n\n- [c](#c)");
  const keys = foldSections(d).map((x) => x.key);
  expect(new Set(keys).size).toBe(3);
  let s = EditorState.create({ doc: d, plugins: [folds({ on: true, open: [] })] });
  toggleFold("Notes (2)")(s, (tr) => { s = s.apply(tr); });
  expect(openKeys(s)).toEqual(["Notes (2)"]);
  const drawnOpen = foldsKey.getState(s)!.decorations.find().filter((x) => (x as unknown as { type: { attrs: Record<string, string> } }).type.attrs["aria-expanded"] === "true");
  expect(drawnOpen.map((x) => s.doc.nodeAt(x.from)!.textContent)).toEqual(["Notes (2)"]);
});
test("deleting an open section does not open the one after it", () => {
  let s = stateWith({ on: true, open: ["Dedications"] });
  const secs = foldSections(s.doc);
  s = s.apply(s.tr.delete(secs[0].heading, secs[1].heading));
  expect(openKeys(s)).toEqual([]);
});
test("closing a section collapses a selection that reaches into it from anywhere", () => {
  let s = stateWith({ on: true, open: ["Dedications"] });
  s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, at(s.doc, "Letter to Raleigh", 3), at(s.doc, "Dedications", 4))));
  toggleFold("Dedications")(s, (tr) => { s = s.apply(tr); });
  expect(openKeys(s)).toEqual([]);
  expect(s.selection.empty).toBe(true);
  expect(s.selection.$head.parent.textContent).toBe("Dedications");
});
test("with folding off an edit computes no sections; switching on computes them", () => {
  let s = stateWith({ on: false, open: [] });
  s = s.apply(s.tr.insertText("x", 3));
  expect(foldsKey.getState(s)!.sections).toEqual([]);
  setFolds(true, [])(s, (tr) => { s = s.apply(tr); });
  expect(foldsKey.getState(s)!.sections.length).toBe(3);
});
