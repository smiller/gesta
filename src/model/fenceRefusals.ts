/* Had the line opened, it would not be a paragraph's text, so every
   `:::`-shaped line found in a paragraph is a refusal by construction — a
   bare `:::`, a code block's line and a row are none of them (pin:
   fenceRefusals.test › a real fence, a bare closer, a code block's line and
   a row are none of them refusals). A word Gesta knows is told what it
   lacks or does not take: "unknown" would send the writer looking for a
   typo in a word they spelled right (pin: fenceRefusals.test › a
   fence-shaped line that opens nothing is named with its reason) */
import type { Node } from "prosemirror-model";
import { schema } from "./schema.ts";
import { opensFence } from "./grammar.ts";

export interface FenceRefusal { line: string; reason: string }
export function fenceRefusals(doc: Node): FenceRefusal[] {
  const out: FenceRefusal[] = [];
  doc.descendants((n) => {
    if (n.type === schema.nodes.code_block) return false;
    if (n.type !== schema.nodes.paragraph) return true;
    let line = "";
    const lines: string[] = [];
    n.forEach((c) => { if (c.type === schema.nodes.hard_break) { lines.push(line); line = ""; } else if (c.isText) line += c.text; });
    lines.push(line);
    for (const l of lines) {
      const reason = fenceLineReason(l);
      if (reason) out.push({ line: l.trim(), reason });
    }
    return false;
  });
  return out;
}
interface Spec { text: string; kind: string | null; rest: string; numbers: string }
function specOf(text: string): Spec {
  const raw = text.match(/^(verse|prose|dual-language)\s+(.+)$/);
  if (!raw) return { text, kind: null, rest: "", numbers: "" };
  /* the numbers alone: `numbered` read on either side of them is never part of one */
  return { text, kind: raw[1], rest: raw[2], numbers: raw[2].replace(/^numbered\s+|\s+numbered$/g, "") };
}
const numberedWord = (s: Spec): string | null =>
  /\bnumbered\b/.test(s.text) && /^(dual-language|stanza)\b/.test(s.text) ? s.text.split(/\s/)[0] + " takes no numbered: the word is verse’s and prose’s" : null;
const numberedFirst = (s: Spec): string | null =>
  s.kind && s.kind !== "dual-language" && /^numbered\s+[1-9]\d*$/.test(s.rest) ? "numbered goes after the number, like ::: " + s.kind + " " + s.numbers + " numbered" : null;
function twoNumbers(s: Spec): string | null {
  const two = s.kind && s.numbers.match(/^(\d+)\s+(\d+)$/);
  if (!two) return null;
  if (s.kind !== "verse") return s.kind + " takes one number; a second, for the right column, is verse’s alone";
  return +two[1] > 0 ? two[2] + " is not a starting line for the right column" : two[1] + " is not a starting line";
}
function startNumber(s: Spec): string | null {
  if (!s.kind) return null;
  if (s.kind === "verse" && /^\d+\s+\d+\s+\d/.test(s.numbers)) return "verse takes two numbers at most: its first line, and its right column’s";
  return s.numbers + " is not a starting " + (s.kind === "prose" ? "sentence" : "line");
}
const WORDS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^stanza(?:\s+(.+))?$/, (m) => (m[1] ? m[1] + " is not a stanza number" : "stanza needs its number, like ::: stanza 2")],
  [/^(note|margin-note|reference|card-[\w-]+)\s+\S/, (m) => m[1] + " takes nothing after it"],
  [/^grid\s+(.+)$/, (m) => m[1] + " is not a count"],
  [/^card(?:[\s-]|$)/, () => "card blocks must include a colour, like card-light-green"],
];
function wordTaken(s: Spec): string | null {
  for (const [re, why] of WORDS) {
    const m = s.text.match(re);
    if (m) return why(m);
  }
  return null;
}
const REASONS = [numberedWord, numberedFirst, twoNumbers, startNumber, wordTaken];
export function fenceLineReason(l: string): string | null {
  const m = l.match(/^\s*:::\s*(\S.*?)\s*$/);
  if (!m || opensFence(l)) return null;
  const spec = specOf(m[1]);
  for (const reason of REASONS) {
    const why = reason(spec);
    if (why) return why;
  }
  return "not a block Gesta knows";
}
export function refusalsText(r: FenceRefusal[]): string {
  const lines = r.map((x) => x.line + " — " + x.reason);
  return r.length === 1 ? lines[0] + ", so it stayed a paragraph" : lines.join("\n") + "\n" + r.length + " fences stayed paragraphs";
}
