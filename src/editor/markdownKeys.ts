/* A collapsed Tab inserts two spaces; with text selected both work on
   WHOLE LINES — every line the
   selection touches shifts together and stays selected so the press can
   repeat; an end at a line's start does not touch that line (the shape a
   mouse produces); an empty line gains nothing, since spaces on a blank
   line are marks nobody typed. Shift-Tab at a collapsed caret takes up
   to two spaces back off — small, and honest about being small — and
   with none to take is LEFT ALONE rather than swallowed: there the press
   is plausibly "get me out of here", and focus moving is a real answer.
   A selection that moved nothing says why (pin: markdownKeys.test › a
   collapsed Tab inserts two spaces) (pin: markdownKeys.test › a selection
   shifts every line it touches) (pin: markdownKeys.test › an empty line gains
   nothing) */
import { curlChar } from "./typing.ts";
import { FENCE_LINE, HEADING_LINE } from "../model/grammar.ts";
import { said, type Said } from "../model/alertText.ts";

export interface Edit { value: string; start: number; end: number }
export type TabResult = Edit | { refuse: Said } | null;
function caretTab(value: string, start: number, shift: boolean): TabResult {
  if (!shift) return { value: value.slice(0, start) + "  " + value.slice(start), start: start + 2, end: start + 2 };
  const run = / {1,2}$/.exec(value.slice(0, start));
  if (!run) return null;
  const n = run[0].length;
  return { value: value.slice(0, start - n) + value.slice(start), start: start - n, end: start - n };
}
function lineSpan(value: string, start: number, end: number): [number, number] {
  const open = value.lastIndexOf("\n", start - 1) + 1;
  const close = value.indexOf("\n", value.charAt(end - 1) === "\n" ? end - 1 : end);
  return [open, close < 0 ? value.length : close];
}
function stepLine(line: string, shift: boolean): [string, number] {
  if (!shift) return line ? ["  " + line, 2] : [line, 0];
  const lead = /^ {1,2}/.exec(line);
  return lead ? [line.slice(lead[0].length), -lead[0].length] : [line, 0];
}
export function markdownTab(value: string, start: number, end: number, shift: boolean): TabResult {
  if (start === end) return caretTab(value, start, shift);
  const [open, close] = lineSpan(value, start, end);
  const stepped = value.slice(open, close).split("\n").map((line) => stepLine(line, shift));
  const moved = stepped.reduce((n, [, d]) => n + d, 0);
  if (!moved) return { refuse: said(shift ? "noSpacesToRemove" : "nothingToIndent") };
  return { value: value.slice(0, open) + stepped.map(([line]) => line).join("\n") + value.slice(close), start: open, end: close + moved };
}
/* WHAT A CHARACTER JUST TYPED IN THE SOURCE BECOMES: a -- between spaces
   a dash, a straight quote curled, a second quote stepping the curl — never
   inside a fenced block or an inline code span, where the characters are
   the code, nor inside a link's address and title or a bare address, where
   a curl changes the target (pin: markdownKeys.test › markdownTyped) */
const URL_TOKEN = /(?:^|\s)(?:https?:\/\/|www\.)\S*$/i;
const openAngleAddress = (line: string, angle: number): boolean => line.indexOf(">", angle) < 0 && /^<(?:https?:\/\/|www\.|#)/i.test(line.slice(angle));
function inAddress(line: string): boolean {
  const open = line.lastIndexOf("](");
  if (open >= 0 && line.indexOf(")", open) < 0) return true;
  const angle = line.lastIndexOf("<");
  if (angle >= 0 && openAngleAddress(line, angle)) return true;
  return URL_TOKEN.test(line.slice(0, -1));
}
function inCode(before: string, lineStart: number): boolean {
  const fences = before.slice(0, lineStart).split("\n").filter((l) => /^\s*(```|~~~)/.test(l)).length;
  return fences % 2 === 1 || (before.slice(lineStart).match(/`/g) || []).length % 2 === 1;
}
const QUOTE_STEPS = new Map([["”\"", "\""], ["’'", "'"], ["‘'", "’"]]);
type Typed = { from: number; to: number; text: string };
function curled(value: string, caret: number, ch: string): Typed {
  const prev = value[caret - 2] ?? "";
  const step = QUOTE_STEPS.get(prev + ch);
  return step === undefined ? { from: caret - 1, to: caret, text: curlChar(ch, prev) } : { from: caret - 2, to: caret, text: step };
}
export function markdownTyped(value: string, caret: number): Typed | null {
  const ch = value[caret - 1], before = value.slice(0, caret);
  const lineStart = before.lastIndexOf("\n") + 1;
  if (inCode(before, lineStart) || inAddress(before.slice(lineStart))) return null;
  if (ch === " " && /\s--\s$/.test(before)) return { from: caret - 3, to: caret - 1, text: "—" };
  if (ch !== "\"" && ch !== "'") return null;
  return curled(value, caret, ch);
}

export type MarkdownSpan = "fence" | "code" | "link" | "heading";
/* a backtick run opens inline code only where a run as long closes it
   later on the line: a lone one typed for an apostrophe is prose (pin:
   markdownKeys.test › what the caret is inside, in markdown mode) */
function inCodeSpan(line: string, at: number): boolean {
  let open = 0;
  for (const m of line.slice(0, at).matchAll(/`+/g)) open = open === 0 ? m[0].length : m[0].length === open ? 0 : open;
  return open > 0 && line.slice(at).split(/[^`]+/).includes("`".repeat(open));
}
/* a bare address, http or www, is drawn as a link in HTML mode, so it is
   one here; one in <…> is drawn as text (pin: markdownKeys.test › what the
   caret is inside, in markdown mode) */
const LINK_SPAN = /!?\[[^\]\n]*\]\([^)\n]*\)|(?<![<\w])(?:https?:\/\/|www\.)[^\s<>]+/gi;
const inLink = (line: string, at: number): boolean => [...line.matchAll(LINK_SPAN)].some((m) => at > m.index && at < m.index + m[0].length);
/* what the caret at `pos` is inside, the fence first: a fence's lines are
   code, whatever they hold (pin: markdownKeys.test › what the caret is
   inside, in markdown mode) */
export function markdownSpanAt(text: string, pos: number): MarkdownSpan | null {
  const { start, line } = lineAround(text, pos), at = pos - start;
  if (fencedAt(text.slice(0, start), line)) return "fence";
  if (inCodeSpan(line, at)) return "code";
  if (inLink(line, at)) return "link";
  return HEADING_LINE.test(line) ? "heading" : null;
}
function lineAround(text: string, pos: number): { start: number; line: string } {
  const start = pos === 0 ? 0 : text.lastIndexOf("\n", pos - 1) + 1, end = text.indexOf("\n", start);
  return { start, line: text.slice(start, end === -1 ? text.length : end) };
}
const fencedAt = (before: string, line: string): boolean =>
  FENCE_LINE.test(line) || before.split("\n").filter((l) => FENCE_LINE.test(l)).length % 2 === 1;
