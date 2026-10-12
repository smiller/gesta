/* A collapsed Tab inserts two spaces; with text selected both work on
   WHOLE LINES — every line the
   selection touches shifts together and stays selected so the press can
   repeat; an end at a line's start does not touch that line (the shape a
   mouse produces); an empty line gains nothing, since spaces on a blank
   line are marks nobody typed. Shift-Tab at a collapsed caret takes up
   to two spaces back off — small, and honest about being small — and
   with none to take is LEFT ALONE rather than swallowed: there the press
   is plausibly "get me out of here", and focus moving is a real answer.
   A selection that moved nothing says why (pin: sourceKeys.test › a
   collapsed Tab inserts two spaces) (pin: sourceKeys.test › a selection
   shifts every line it touches) (pin: sourceKeys.test › an empty line gains
   nothing) */
import { curlChar } from "./typing.ts";

export interface Edit { value: string; start: number; end: number }
export type TabResult = Edit | { refuse: string } | null;
export function sourceTab(value: string, start: number, end: number, shift: boolean): TabResult {
  if (start === end) {
    if (!shift) return { value: value.slice(0, start) + "  " + value.slice(end), start: start + 2, end: start + 2 };
    const run = / {1,2}$/.exec(value.slice(0, start));
    if (!run) return null;
    const n = run[0].length;
    return { value: value.slice(0, start - n) + value.slice(start), start: start - n, end: start - n };
  }
  const open = value.lastIndexOf("\n", start - 1) + 1;
  let to = end;
  if (value.charAt(to - 1) === "\n") to--;
  let close = value.indexOf("\n", to);
  if (close < 0) close = value.length;
  const lines = value.slice(open, close).split("\n");
  let moved = 0;
  const out = lines.map((line) => {
    if (shift) {
      const lead = /^ {1,2}/.exec(line);
      if (!lead) return line;
      moved -= lead[0].length;
      return line.slice(lead[0].length);
    }
    if (!line) return line;
    moved += 2;
    return "  " + line;
  });
  if (!moved) return { refuse: shift ? "no spaces to remove" : "nothing to indent — those lines are empty" };
  return { value: value.slice(0, open) + out.join("\n") + value.slice(close), start: open, end: close + moved };
}
/* WHAT A CHARACTER JUST TYPED IN THE SOURCE BECOMES, as in the rendered
   view: a -- between spaces a dash, a straight quote curled, a second quote
   stepping the curl — never inside a fenced block or an inline code span,
   where the characters are the code (pin: sourceKeys.test › sourceTyped) */
export function sourceTyped(value: string, caret: number): { from: number; to: number; text: string } | null {
  const ch = value[caret - 1], before = value.slice(0, caret);
  const lineStart = before.lastIndexOf("\n") + 1;
  const fences = before.slice(0, lineStart).split("\n").filter((l) => /^\s*(```|~~~)/.test(l)).length;
  if (fences % 2 || (before.slice(lineStart).match(/`/g) || []).length % 2) return null;
  if (ch === " " && /\s--\s$/.test(before)) return { from: caret - 3, to: caret - 1, text: "—" };
  if (ch !== "\"" && ch !== "'") return null;
  const prev = value[caret - 2] ?? "";
  if (prev === "”" && ch === "\"") return { from: caret - 2, to: caret, text: "\"" };
  if (prev === "’" && ch === "'") return { from: caret - 2, to: caret, text: "'" };
  if (prev === "‘" && ch === "'") return { from: caret - 2, to: caret, text: "’" };
  return { from: caret - 1, to: caret, text: curlChar(ch, prev) };
}
