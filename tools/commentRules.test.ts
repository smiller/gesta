import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { addedLines, commentBlocks, nameIndex, namesOther, pins, provenance, testTitles, touched, unresolved, type PinSources } from "./commentRules.ts";

const root = join(import.meta.dirname, "..");
const tree = new Map<string, string>();
const walk = (d: string): void => {
  for (const n of readdirSync(join(root, d))) {
    const p = d + "/" + n;
    if (statSync(join(root, p)).isDirectory()) walk(p);
    else if (/\.(ts|svelte|css|html)$/.test(n)) tree.set(p, readFileSync(join(root, p), "utf8"));
  }
};
walk("src");
const index = nameIndex(tree);
const named = (file: string, raw: string): string[] => namesOther(commentBlocks(file, raw)[0], index);

describe("the scanner", () => {
  test("a trailing comment after a URL in a string; a regex holding slashes is no comment", () => {
    const b = commentBlocks("a.ts", 'const u = "http://x.org"; // trailing\nconst re = /\\/\\/x\\/*y/g; /* real */\n');
    expect(b.map((x) => [x.start, x.body])).toEqual([[1, "trailing"], [2, "real"]]);
  });
  test("a template literal, its interpolation and a division", () => {
    const b = commentBlocks("a.ts", "const t = `a // no ${f(`b /* no */`) /* yes */} // no`; const q = a / b / c; // after\n");
    expect(b.map((x) => x.body)).toEqual(["yes", "after"]);
  });
  test("whole-line // comments on adjacent lines are one block; a trailing one stands alone", () => {
    const b = commentBlocks("a.ts", "// one\n// two\nx(); // three\n// four\n");
    expect(b.map((x) => [x.start, x.end, x.body])).toEqual([[1, 2, "one two"], [3, 3, "three"], [4, 4, "four"]]);
  });
  test("a block's markers stripped and its lines joined", () => {
    expect(commentBlocks("a.ts", "/** first\n *  second\n   third */\n")[0].body).toBe("first second third");
  });
  test("a component: the markup's, the script's and the style's comments, each at its line", () => {
    const b = commentBlocks("A.svelte", '<!-- m -->\n<script lang="ts">\n  // s\n  const u = "<!-- not -->";\n</script>\n<p>// text</p>\n<style>\n  /* c */\n</style>\n');
    expect(b.map((x) => [x.start, x.body])).toEqual([[1, "m"], [3, "s"], [8, "c"]]);
  });
  test("a stylesheet's comments, a string holding /* left alone", () => {
    expect(commentBlocks("a.css", 'a::before { content: "/*"; }\n/* real */\n').map((x) => x.body)).toEqual(["real"]);
  });
});

describe("the pins", () => {
  const sources: PinSources = {
    steps: 'const sections = [\n  ["walk", async () => {\n  await log("⌃⌘. from 3pr1 over an index", 1);\n  }],\n  ["source view", async () => {\n  await log("⌃⌘W rendered", 2);\n  await log("never run", 3);\n  }],\n];\n',
    corner: '⌃⌘. from 3pr1 over an index: {"entry":"x"}\n⌃⌘W rendered: {}\nconsole: error: cannot render page/Gridded a grid\nwarning: a later line\n',
    bridge: 'say("an unknown book is refused", o);\n',
    bridgeRun: 'an unknown book is refused         {"entry":"2026-09-12"}\n',
    tests: new Map([["nav.test", ['test("hashParts: a page routes; anything less falls back", () => {});\ndescribe.each(xs)("keyed store over %s", () => {});\n']]]),
  };
  const why = (body: string): (string | null)[] => pins(body).map((p) => unresolved(p, sources));
  test("a pin split across a block's lines is read whole; two groups are two pins", () => {
    const b = commentBlocks("a.ts", "/* x (pin: walk › ⌃⌘. from 3pr1 over\n   an index) (pin: source view › ⌃⌘W rendered) */")[0];
    expect(why(b.body)).toEqual([null, null]);
  });
  test("a Helium pin names its section and the whole reading label", () => {
    expect(why("(pin: walk › ⌃⌘. from 3pr1)")[0]).toBe('no reading "⌃⌘. from 3pr1" in the section "walk"');
    expect(why("(pin: source view › ⌃⌘. from 3pr1 over an index)")[0]).toBe('no reading "⌃⌘. from 3pr1 over an index" in the section "source view"');
    expect(why("(pin: stanza › ⌃⌘W rendered)")[0]).toBe('no section "stanza" in tools/helium-steps.mjs');
  });
  test("a reading in the steps but not in the approved run does not resolve", () => {
    expect(why("(pin: source view › never run)")[0]).toBe('no reading "never run" in tools/expected/corner.approved.txt');
  });
  test("a Vitest pin is a title prefix in the named test file", () => {
    expect(why("(pin: nav.test › hashParts: a page routes)")).toEqual([null]);
    expect(why("(pin: nav.test › keyed store over)")).toEqual([null]);
    expect(why("(pin: nav.test › makeHref)")[0]).toBe('no test in nav.test.ts titled "makeHref…"');
    expect(why("(pin: keys.test › anything)")[0]).toBe("no keys.test.ts under src/");
  });
  test("a console pin is a line prefix of the approved run's console, its level aside", () => {
    expect(why("(pin: console › cannot render page/Gridded) (pin: console › a later line)")).toEqual([null, null]);
    expect(why("(pin: console › cannot render page/Other)")[0]).toMatch(/^no console line/);
  });
  test("a bridge pin is a step of the bridge tool and a line of its approved run", () => {
    expect(why("(pin: bridge › an unknown book is refused)")).toEqual([null]);
    expect(why("(pin: bridge › an unknown page mints)")[0]).toMatch(/^no step/);
  });
  test("a pin with no › is not in the form", () => {
    expect(why("(pin: the grid step)")[0]).toMatch(/^not in the form/);
  });
  test("titles: it, test, describe, and describe.each's", () => {
    expect(testTitles('it("a \\"q\\" b", f); test(`t`, g); describe.each(a)("d %s", h);')).toEqual(['a "q" b', "t", "d %s"]);
  });
});

/* the blocks the reviews found asserting another module, verbatim from
   the tree before each fix; `caught` is what this rule does with each,
   the rest being the review's to find */
const KNOWN_BAD: { at: string; file: string; caught: string[]; raw: string }[] = [
  { at: "cc22c7f^:113", file: "src/editor/paste.ts", caught: ["the clipboard's"], raw: `/* the blocks, AND their rows: a selection inside one block slices to
   its rows with the block itself left out (measured: a drag across two
   pairs slices to pairs, open two deep), and rows pasted as rows are
   wrapped back into their block by the schema. A card joined the set
   2026-09-22 for the grid: a drag across two cards slices to open cards
   with the grid left out, and closed they travel whole — the in-app paste
   re-wraps them in their grid from the clipboard's own context. */` },
  { at: "7a0f71a^:104", file: "src/editor/reference.ts", caught: [], raw: `/* the verse or prose block holding BOTH ends of the selection below the
   top level — a paired citation inside a quotation: the units walk numbers
   top-level blocks alone, and the loose-prose arm cut ONE cell out of a
   pair, which the serializer refused (the 2026-09-12 review) */` },
  { at: "e81e417^:1", file: "src/editor/folds.ts", caught: ["foldsContents", "store/contents.ts", "the session's"], raw: `/* A WORK'S CONTENTS FOLD under its \`##\` headings (2026-09-28, the
   contents-folds plan, its look settled over a mockup with the reader):
   the page closes to its headings, a closed one showing its count. Drawn
   as decorations — the text is never touched, the source view shows it
   whole. The section is the heading and everything under it down to the
   next heading of level 1 or 2; content before the first \`##\` never
   folds. Which entries fold is the session's to say (store/contents.ts,
   foldsContents); only the triangle in the margin toggles, so a heading's
   words stay editable; a selection landing in a closed section opens it. */` },
  { at: "e81e417^:1", file: "src/store/foldState.ts", caught: ["the session's"], raw: `/* What a folding contents page remembers between visits (2026-09-28, the
   contents-folds plan): its open sections, by heading text, and the link
   it was left from, so coming back shows the page as it was left and in
   view where it was left. ONE localStorage key (the session's, NS +
   "folds"), a JSON map from entry key to a page record — a per-browser
   convenience, never in the text or a backup. Parsing forgives anything:
   a damaged store is an empty one. */` },
  { at: "016c951^:102", file: "src/editor/folds.ts", caught: [], raw: `/* open the section a position is in: ⌃⌘G's landing, which sets no
   selection of its own */` },
  { at: "016c951^:542", file: "src/main.ts", caught: [], raw: `    /* a landing inside a closed contents section opens it first: the
       landing sets no selection, and a hidden row has no box to scroll to
       (the review at high, 2026-09-28) */` },
  { at: "420a712^:78", file: "src/editor/numbering.ts", caught: ["the gutter's"], raw: `/* the units of ONE block, wherever it stands: the gutter folds this over
   the top level; the reference folds it over every block it may quote
   from, a quotation's included (the 2026-09-12 confirmation pass: the
   reference had a copy of this walk beside it, and a quoted block's
   fence would have drifted from the gutter's count) */` },
  { at: "cb1b26c^:411", file: "src/session.ts", caught: [], raw: `  /* the window's place for an open, by its kind: arriving returns to where
     the entry was left, or the top on a first visit — and the top when a
     highlight is owed, whose own scroll then centres the hit */` },
  { at: "cb1b26c^:1", file: "src/store/foldState.ts", caught: ["placeState.ts"], raw: `/* What a folding contents page remembers between visits (2026-09-28, the
   contents-folds plan): its open sections, by heading text, so coming back
   shows the page as it was left (where the reading stood is placeState.ts's,
   for every entry: the link it was left from, kept here first, retired). ONE localStorage key, NS + "folds", a JSON
   map from entry key to a page record — a per-browser convenience, never
   in the text or a backup. Parsing forgives anything:
   a damaged store is an empty one. */` },
  { at: "fabb19b:25", file: "src/editor/renderedView.ts", caught: ["the source's"], raw: `    /* the first line whose top is at or below the masthead, as the source's
       twin reads it: a point in the gap between stanzas resolved to the end
       of the stanza above, one stanza early
       (pin: the switch carries the text › a long canto switched at its middle) */` },
  { at: "fabb19b:71", file: "src/editor/surface.ts", caught: ["the chrome's"], raw: "    /* the chrome's pill followed the forced view but not its release (pin: grid › the next entry after a refused switch) */" },
  { at: "fabb19b:6", file: "src/editor/placeKeeper.ts", caught: [], raw: `/* ARRIVING at an entry returns to where it was last left, or the top on a
   first visit; a highlight owed goes to the top, where the highlight
   scrolls itself; KEEP moves nothing
   (pin: places › Back again) (pin: placeKeeper.test › an arrival holds its stored place) */` },
  { at: "fabb19b:52", file: "src/editor/placeKeeper.ts", caught: [], raw: `  /* the restored place is HELD, and set again whenever the editor changes
     size, until a reader moves: a wheel, key, pointer or touch, or any
     scroll landing where this code did not put the window, the browser's
     find among them. Read back from the scroll instead, the place drifted
     up with every picture above it. While held, the browser's scroll
     anchoring is OFF: a masthead shrinking after the restore let anchoring
     move the window 27px (pin: places › 400px grown above the held place)
     (pin: places › a held place, then a scroll no hand made) (pin: places ›
     a held place, the masthead shrinking under it) (pin: places › a forced
     entry left scrolled, returned to) (pin: placeKeeper.test › is set again on every resize)
     (pin: placeKeeper.test › survives a scroll landing 1px) */` },
  { at: "fabb19b:28", file: "src/session.ts", caught: [], raw: `/* ARRIVING at an entry — a link, a walk, a pick, Back or Forward, a
   reload — returns to where it was last left, or the top on a first visit;
   KEEP (a refresh, a rename) moves nothing.
   (pin: places › Back again) (pin: entries left and renamed › a long entry renamed, scrolled) */` },
];

/* comments in today's tree that must stay quiet, verbatim */
const QUIET: { file: string; raw: string }[] = [
  { file: "src/store/nav.ts", raw: `/* The today fallback — an undecodable escape, a bare or empty #page/, an
   empty interior segment — drops the highlight payload with it, or it would
   select some innocent passage in today's entry. Trailing empties are the
   parent: #page/Name/ is the page itself.
   (pin: nav.test › hashParts: a page routes; anything less falls back)
   (pin: nav.test › hashParts: a page hierarchy at any depth) */` },
  { file: "src/store/nav.ts", raw: "    } catch { hl = null; }   /* a mangled payload loses only the highlight (pin: nav.test › hashParts: the ?h=…&n=… highlight payload) */" },
  { file: "src/store/names.ts", raw: `/* a picture's key: its relative src in its entry's own folder
   (pin: importFiles.test › a picture the import files is found where the entry looks) */` },
  { file: "src/session.ts", raw: `      /* the noun for what is MISSING: when the root is gone every segment
         under it reads unregistered too, so the depth asked for would call a
         vanished author a book (pin: bridge › an unknown book under a known author) */` },
  { file: "src/chrome/clipboard.ts", raw: "    catch { /* refused: ok stays false */ }" },
  { file: "src/editor/typing.test.ts", raw: '  expect(() => run(typingBindings.Enter, type(state(), "see https://x.test/p"))).toThrow();   /* fenceEnter alone now */' },
];

describe("another module named", () => {
  test.each(KNOWN_BAD)("known bad, $file at $at", ({ file, raw, caught }) => {
    expect(named(file, raw).sort()).toEqual([...caught].sort());
  });
  test("seven of the fourteen caught", () => {
    expect(KNOWN_BAD.length).toBe(14);
    expect(KNOWN_BAD.filter((k) => k.caught.length).length).toBe(7);
  });
  test.each(QUIET)("quiet, $file", ({ file, raw }) => {
    expect(named(file, raw)).toEqual([]);
  });
  test("a module's own role noun is its own; the same noun elsewhere names it", () => {
    const raw = "/* the session's place wins */";
    expect(named("src/session.ts", raw)).toEqual([]);
    expect(named("src/main.ts", raw)).toEqual(["the session's"]);
  });
  test("a directory's role noun is every file's under it, and names it from outside", () => {
    const raw = "/* the chrome's pill follows */";
    expect(named("src/chrome/mastheadModel.ts", raw)).toEqual([]);
    expect(named("src/chrome/notices.svelte.ts", raw)).toEqual([]);
    expect(named("src/editor/surface.ts", raw)).toEqual(["the chrome's"]);
  });
  test("a name its own file declares, however deep, is its own", () => {
    expect(named("src/session.ts", "/* scrollToLeft reads foldsContents once */")).toEqual(["foldsContents"]);
    expect(named("src/store/contents.ts", "/* foldsContents reads the keys */")).toEqual([]);
  });
  test("a path: another file named, its own by a longer path not", () => {
    expect(named("src/store/nav.ts", "/* as store/nav.ts spells it, and ../writer/src/style.css */")).toEqual(["../writer/src/style.css"]);
  });
});

describe("provenance", () => {
  const prov = (raw: string): string[] => provenance(commentBlocks("a.ts", raw)[0]);
  test("a date, the reader, the review and a confirmation pass, verbatim from the tree", () => {
    expect(prov("/* recomputed only when the text changes (the review: per keystroke and per caret */")).toEqual(["the review"]);
    expect(prov("/* on the next heading and opened it (the confirmation pass at high) */")).toEqual(["confirmation pass"]);
    expect(prov("/* (the en dash the reader chose) */")).toEqual(["the reader"]);
    expect(prov("/* THE SLICE THE CLIPBOARD SEES (2026-09-22, the review's finding): a selection's */")).toEqual(["2026-09-22", "the review"]);
    expect(prov("/* the row the reader never selected — the two confirmation passes */")).toEqual(["the reader", "confirmation passes"]);
    expect(prov("/* the plan's table, MEASURED over the mockup at 18px */")).toEqual(["the plan's"]);
  });
  test("the app's user is a reader; a date inside quotes is an example", () => {
    expect(prov("/* a reader who scrolled away from the caret stays where they were */")).toEqual([]);
    expect(prov('/* A DATED SUB-PAGE NAME IS A NAME (the app mints "2023-11-12-the-article" from a URL) */')).toEqual([]);
    expect(prov("/* the day key, `2026-09-06`, is a date */")).toEqual([]);
  });
  test("a pin's text is not the comment's", () => {
    expect(prov("/* x (pin: places › the reader back on 2026-09-28) */")).toEqual([]);
  });
});

describe("the diff", () => {
  test("the new side's added lines, a deletion adding none", () => {
    const d = "diff --git a/src/a.ts b/src/a.ts\n--- a/src/a.ts\n+++ b/src/a.ts\n@@ -3,0 +4,2 @@\n+x\n+y\n@@ -9 +11 @@\n-z\n+w\n@@ -20,2 +22,0 @@\n-q\n-r\ndiff --git a/src/b.ts b/src/b.ts\n--- a/src/b.ts\n+++ /dev/null\n";
    expect([...addedLines(d).entries()].map(([f, s]) => [f, [...s]])).toEqual([["src/a.ts", [4, 5, 11]]]);
  });
  test("a block counts when any of its lines was added", () => {
    const bs = commentBlocks("a.ts", "/* a\n   b */\nx();\n// c\n");
    expect(touched(bs, new Set([2])).map((b) => b.body)).toEqual(["a b"]);
    expect(touched(bs, new Set([3]))).toEqual([]);
    expect(touched(bs, undefined)).toEqual([]);
  });
});
