import { test, expect } from "vitest";
import { isTerminalCopy, terminalText } from "./terminalCopy.ts";
import { parseMarkdown } from "../model/parse.ts";

test("a terminal's wrapped lines are joined: a line not ending a sentence runs on into the next, a list item or a new message always starts its own", () => {
  expect(terminalText("Every one passed\n  npm run verify before it landed.")).toBe("Every one passed npm run verify before it landed.");
  expect(terminalText("found nine things.\n    Eight were fixed")).toBe("found nine things.\nEight were fixed");
  expect(terminalText("the string rules:\n  - Kept off\n  1. First")).toBe("the string rules:\n- Kept off\n1. First");
  expect(terminalText("a paragraph\n\nanother")).toBe("a paragraph\n\nanother");
  expect(terminalText("- outside text reaches the\n    decoder.")).toBe("- outside text reaches the decoder.");
  for (const end of ["Shall I commit?", "Done!", "Summary:", "And so…", "it said “stop.”", "(see above.)"]) expect(terminalText(end + "\nNext line.")).toBe(end + "\nNext line.");
  expect(terminalText("first\n• second\n1) third\n⏺ Next step")).toBe("first\n• second\n1) third\n⏺ Next step");
});
test("a command's output, opening on ⎿, starts its own line and stands outside the margin, as a message's ⏺ does", () => {
  const ran = ["! node tools/progress/page.ts 2026-11-16 --terminal", "  ⎿  Monday, 16 November 2026", "", "     Started with 5 (1 side list, 4 bigger questions)", "     -- unstarted 5"];
  expect(terminalText(ran.join("\n"))).toBe("! node tools/progress/page.ts 2026-11-16 --terminal\n⎿  Monday, 16 November 2026\n\nStarted with 5 (1 side list, 4 bigger questions)\n-- unstarted 5");
});
test("a terminal's line opening on -- starts its own, as a list item does, and a line wrapped from it runs back on; a bare -- stands alone", () => {
  const counts = ["  The day, as it prints it:", "  Started with 5 (1 side list, 4 bigger questions)", "  -- unstarted 5", "", "  Spawned or added since 17 (7 architecture queue)", "  -- done · spawned", "  open 1", "  -- dropped 1", "", "  This morning's session did S14."];
  expect(terminalText(counts.join("\n"))).toBe("The day, as it prints it:\nStarted with 5 (1 side list, 4 bigger questions)\n-- unstarted 5\n\nSpawned or added since 17 (7 architecture queue)\n-- done · spawned open 1\n-- dropped 1\n\nThis morning's session did S14.");
  expect(terminalText("Thanks,\n--\nSean")).toBe("Thanks,\n--\nSean");
  expect(terminalText("a line that -- mid-line\nruns on")).toBe("a line that -- mid-line runs on");
});
test("a terminal's margin is taken off: the indent every line shares, a message's ⏺ or a first line begun mid-line standing outside it; what is indented past it keeps the rest; one line alone has none", () => {
  expect(terminalText("⏺ I fixed it.\n\n  The cause: x.\n  - one\n    - nested\n\n  After.")).toBe("⏺ I fixed it.\n\nThe cause: x.\n- one\n  - nested\n\nAfter.");
  expect(terminalText("  ```\n  code\n    deeper\n  ```")).toBe("```\ncode\n  deeper\n```");
  expect(terminalText(" begun mid-line.\n  The next.")).toBe(" begun mid-line.\nThe next.");
  expect(terminalText("  - outer\n    - inner")).toBe("- outer\n  - inner");
  expect(terminalText("   one line alone")).toBe("   one line alone");
});

test("a terminal's box-drawn table is a markdown table: its first row the header, a row's wrapped lines joined cell by cell between rules, each line a row where it draws none, a pipe kept in its cell", () => {
  const box = ["  Done:", "", "  ┌──────┬──────────────┐", "  │ Item │     What     │", "  ├──────┼──────────────┤",
    "  │      │ begin failed │", "  │ P1   │  its carries │", "  ├──────┼──────────────┤", "  │ S14  │ the paste    │", "  └──────┴──────────────┘", "", "  After."];
  expect(terminalText(box.join("\n"))).toBe("Done:\n\n| Item | What |\n| --- | --- |\n| P1 | begin failed its carries |\n| S14 | the paste |\n\nAfter.");
  expect(terminalText("  ┌───┐\n  │ a │\n  no bottom")).toBe("┌───┐\n│ a │\nno bottom");
  expect(terminalText("┌───┬───┐\n│ a │ b │\n├───┼───┤\n│ 1 │ 2 │\n│ 3 │ 4 │\n└───┴───┘")).toBe("| a | b |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |");
  const piped = parseMarkdown(terminalText("┌─────┐\n│ h   │\n├─────┤\n│ a|b │\n└─────┘")).firstChild!;
  expect([piped.childCount, piped.child(1).child(0).textContent]).toEqual([2, "a|b"]);
});
test("a box is a table only when every line between its top and its bottom is a row or a rule, outside a code fence; any other is left as it was", () => {
  for (const kept of ["┌──┐\n└──┘", "┌──┐\n├──┤\n└──┘", "┌──┐ a diagram\nThen the decoder runs.\n├── a.ts\n└── last.ts", "```\n┌───┐\n│ a │\n└───┘\n```"]) expect(terminalText(kept)).toBe(kept);
});

test("a terminal's copy of markdown keeps its structure: nothing in a fence is joined, nor a fence, heading, quote or table line", () => {
  expect(terminalText("::: verse\na | one\nb | two\n:::")).toBe("::: verse\na | one\nb | two\n:::");
  expect(terminalText("```\nnpm test\nnpm run verify\n```")).toBe("```\nnpm test\nnpm run verify\n```");
  expect(terminalText("# A heading\nits text runs\non")).toBe("# A heading\nits text runs on");
  expect(terminalText("> quoted\n> lines")).toBe("> quoted\n> lines");
  expect(terminalText("| a | b |\n| c | d |")).toBe("| a | b |\n| c | d |");
  expect(terminalText("words before\n```\ncode\n```")).toBe("words before\n```\ncode\n```");
});

const GHOSTTY = '<div style="font-family: monospace; white-space: pre;"><div style="display: inline;color: rgb(177, 185, 249);">git log</div> ran, and\n  <div style="display: inline;font-weight: bold;">bold</div> words.</div>';
test("a terminal's copy is styled preformatted text alone: white-space: pre blocks of inline runs, one after another, with space between them or none", () => {
  for (const html of [GHOSTTY, "<meta charset='utf-8'>" + GHOSTTY, GHOSTTY.replace("git log", '<a href="https://example.org/">git log</a>'), GHOSTTY + GHOSTTY, GHOSTTY + "\n" + GHOSTTY]) expect(isTerminalCopy(html)).toBe(true);
  for (const html of ["<pre>let x = 1;</pre>", '<div style="white-space: pre-wrap;">a</div>', "<p>a</p><ul><li>b</li></ul>",
    '<div style="color: #ccc; white-space: pre;"><div><span>const</span> x = 1;</div><div>y</div></div>', GHOSTTY + "<p>after</p>", GHOSTTY.replace("display: inline;", "display: inline-block;"),
    GHOSTTY + GHOSTTY.replace("display: inline;", "display: inline-block;"), GHOSTTY + '<div style="white-space: pre-wrap;">a</div>']) expect(isTerminalCopy(html)).toBe(false);
});
test("a command's output lines, from its ⎿ to a blank line, each stand as they are; a ⏺ or ⎿ deeper than the margin loses its spaces too", () => {
  const ran = ["⏺ Bash(git log --oneline -3)", "  ⎿  bfeecd2 docs: A8 added", "     a03bb5d docs: A7.1.2 done", "     ff11004 refactor: the verdict", "", "⏺ Done, and the", "  rest wraps."];
  expect(terminalText(ran.join("\n"))).toBe("⏺ Bash(git log --oneline -3)\n⎿  bfeecd2 docs: A8 added\na03bb5d docs: A7.1.2 done\nff11004 refactor: the verdict\n\n⏺ Done, and the rest wraps.");
  expect(terminalText("    ⎿  deep\n  prose here\n  more")).toBe("⎿  deep\nprose here\nmore");
});
