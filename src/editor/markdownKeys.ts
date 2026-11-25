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
import type { Node } from "prosemirror-model";
import { parseMarkdown } from "../model/parse.ts";
import { FENCE_LINE } from "../model/grammar.ts";
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

export type MarkdownSpan = "fence" | "code" | "link" | "heading" | "picture" | "marker" | "unparsed";
const PROBE_HREF = "#gesta-probe", PROBE = "[probe](" + PROBE_HREF + ")";
type Linked = { text: string; href: string };
function linksIn(doc: Node): Linked[] {
  const out: Linked[] = [];
  doc.descendants((n) => { const l = n.isText ? n.marks.find((m) => m.type.name === "link") : undefined; if (l && l.attrs.href !== PROBE_HREF) out.push({ text: n.text!, href: l.attrs.href }); });
  return out;
}
/* where the probe link landed: as a link, by its parent; as a picture,
   where a "!" before it made it one; else as literal text, by the code it
   fell in or the link it broke; "lost" where no text holds it, a fence's
   own line having taken it for its language */
function landed(doc: Node): MarkdownSpan | "free" | "lost" {
  let at: MarkdownSpan | "free" | null = null;
  doc.descendants((n, _pos, parent) => {
    if (at !== null) return false;
    if (n.type.name === "image" && n.attrs.src === PROBE_HREF) { at = "picture"; return false; }
    if (!n.isText) return true;
    if (n.marks.some((m) => m.type.name === "link" && m.attrs.href === PROBE_HREF)) at = parent?.type.name === "heading" ? "heading" : "free";
    else if (n.text!.includes(PROBE)) at = parent?.type.name === "code_block" ? "fence" : n.marks.some((m) => m.type.name === "code") ? "code" : "link";
    return at === null;
  });
  return at ?? "lost";
}
const sameLinks = (a: Linked[], b: Linked[]): boolean => a.length === b.length && a.every((l, i) => l.text === b[i].text && l.href === b[i].href);
const lineAt = (text: string, pos: number): string => text.slice(text.lastIndexOf("\n", pos - 1) + 1).split("\n")[0];
const blocksIn = (doc: Node, type: string): string[] => {
  const out: string[] = [];
  doc.descendants((n) => { if (n.type.name === type) out.push(n.textContent + "\u0000" + String(n.attrs.language ?? n.attrs.level ?? "")); });
  return out;
};
const sameBlocks = (a: Node, b: Node, type: string): boolean => blocksIn(a, type).join("\n") === blocksIn(b, type).join("\n");
const kindsIn = (doc: Node): string => {
  const out: string[] = [];
  doc.descendants((n) => { if (n.isBlock && n.type.name !== "paragraph") out.push(n.type.name); });
  return out.join(" ");
};
/* a probe that broke a heading, a fence or any other block (typed at a
   heading's start, onto a fence's own line, before a list's or a quote's
   marker) is refused as that block */
function brokenBlock(before: Node, after: Node): MarkdownSpan | null {
  if (blocksIn(after, "heading").length < blocksIn(before, "heading").length) return "heading";
  if (!sameBlocks(before, after, "code_block")) return "fence";
  return kindsIn(before) === kindsIn(after) ? null : "marker";
}
/* what the caret at `pos` is inside, read as a link typed there would parse:
   asked of the parser, never spelled again here, so a fence, inline code,
   an address drawn as a link and a heading are what HTML mode draws (pin:
   markdownKeys.test › what the caret is inside, in markdown mode) */
export function markdownSpanAt(text: string, pos: number): MarkdownSpan | null {
  let before: Node, after: Node;
  try { before = parseMarkdown(text); } catch { return "unparsed"; }
  try { after = parseMarkdown(text.slice(0, pos) + PROBE + text.slice(pos)); } catch { return "link"; }
  const where = landed(after);
  if (where === "lost") return FENCE_LINE.test(lineAt(text, pos)) ? "fence" : "link";
  if (where !== "free" && where !== "link") return where;
  const broken = brokenBlock(before, after);
  if (broken) return broken;
  return where === "link" || !sameLinks(linksIn(before), linksIn(after)) ? "link" : null;
}
