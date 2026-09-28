// A work's contents folding under its `##` headings (2026-09-28, the
// contents-folds plan): the sections, their counts, the decorations, and
// the plugin state that opens a section the selection lands in.
import { test, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import type { Decoration } from "prosemirror-view";
import { parseMarkdown } from "../model/parse.ts";
import { foldSections, foldDecorations, sectionAt, folds, foldsKey, toggleFold, setFolds } from "./folds.ts";

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
  const decos = (open: string[]) => foldDecorations(doc, new Set(open)).find() as Decoration[];
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
  expect(sectionAt(doc, inCanto)?.key).toBe("Book I: The Legende of the Knight");
  expect(sectionAt(doc, 3)).toBe(null);
});

function stateWith(opts: Parameters<typeof folds>[0]): EditorState {
  return EditorState.create({ doc, plugins: [folds(opts)] });
}
test("the plugin: off draws nothing; on starts from the open set it is given; a toggle opens and closes one section", () => {
  expect(foldsKey.getState(stateWith({ on: false, open: [] }))!.decorations.find().length).toBe(0);
  let s = stateWith({ on: true, open: ["Dedications"] });
  expect([...foldsKey.getState(s)!.open]).toEqual(["Dedications"]);
  toggleFold("Book VII: Two Cantos of Mutabilitie")(s, (tr) => { s = s.apply(tr); });
  expect([...foldsKey.getState(s)!.open].sort()).toEqual(["Book VII: Two Cantos of Mutabilitie", "Dedications"]);
  toggleFold("Dedications")(s, (tr) => { s = s.apply(tr); });
  expect([...foldsKey.getState(s)!.open]).toEqual(["Book VII: Two Cantos of Mutabilitie"]);
  setFolds(false, [])(s, (tr) => { s = s.apply(tr); });
  expect(foldsKey.getState(s)!.decorations.find().length).toBe(0);
});
test("a selection landing inside a closed section opens it (a search result, a highlight, a caret moved there)", () => {
  let s = stateWith({ on: true, open: [] });
  let pos = -1;
  doc.descendants((n, p) => { if (pos < 0 && n.isText && n.text === "Canto i") pos = p + 2; return pos < 0; });
  s = s.apply(s.tr.setSelection(TextSelection.create(s.doc, pos)));
  expect([...foldsKey.getState(s)!.open]).toEqual(["Book I: The Legende of the Knight"]);
});
