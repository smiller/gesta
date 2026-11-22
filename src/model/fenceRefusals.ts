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
import { PHRASES } from "./alertText.ts";

export type { FenceRefusal } from "./alertText.ts";
import type { FenceRefusal } from "./alertText.ts";
/* a line opening in inline code quotes a fence: read as its text, the
   quotation was told as a refused fence (pin: fenceRefusals.test › a line
   that opens in inline code) */
function plainLines(p: Node): string[] {
  let line = "", quoted = false;
  const lines: string[] = [];
  const end = (): void => { if (!quoted) lines.push(line); line = ""; quoted = false; };
  p.forEach((c) => {
    if (c.type === schema.nodes.hard_break) { end(); return; }
    if (!c.isText) return;
    if (!line.trim() && schema.marks.code.isInSet(c.marks)) quoted = true;
    line += c.text;
  });
  end();
  return lines;
}
export function fenceRefusals(doc: Node): FenceRefusal[] {
  const out: FenceRefusal[] = [];
  doc.descendants((n) => {
    if (n.type === schema.nodes.code_block) return false;
    if (n.type !== schema.nodes.paragraph) return true;
    for (const l of plainLines(n)) {
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
  /\bnumbered\b/.test(s.text) && /^(dual-language|stanza)\b/.test(s.text) ? PHRASES.noNumberedTaken({ word: s.text.split(/\s/)[0] }) : null;
const numberedFirst = (s: Spec): string | null =>
  s.kind && s.kind !== "dual-language" && /^numbered\s+[1-9]\d*$/.test(s.rest) ? PHRASES.numberedAfter({ kind: s.kind, numbers: s.numbers }) : null;
function twoNumbers(s: Spec): string | null {
  const two = s.kind && s.numbers.match(/^(\d+)\s+(\d+)$/);
  if (!two) return null;
  if (s.kind !== "verse") return PHRASES.oneNumberOnly({ kind: s.kind as string });
  return +two[1] > 0 ? PHRASES.notRightStart({ n: two[2] }) : PHRASES.notStarting({ n: two[1], unit: "line" });
}
function startNumber(s: Spec): string | null {
  if (!s.kind) return null;
  if (s.kind === "verse" && /^\d+\s+\d+\s+\d/.test(s.numbers)) return PHRASES.twoNumbersAtMost();
  return PHRASES.notStarting({ n: s.numbers, unit: s.kind === "prose" ? "sentence" : "line" });
}
const WORDS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^stanza(?:\s+(.+))?$/, (m) => (m[1] ? PHRASES.notANumber({ typed: m[1], noun: "stanza" }) : PHRASES.stanzaNeedsNumber())],
  [/^(note|margin-note|reference|card-[\w-]+)\s+\S/, (m) => PHRASES.takesNothing({ word: m[1] })],
  [/^grid\s+(.+)$/, (m) => PHRASES.notACount({ n: m[1] })],
  [/^card(?:[\s-]|$)/, () => PHRASES.cardNeedsColour()],
];
function wordTaken(s: Spec): string | null {
  return WORDS.map(([re, why]) => { const m = s.text.match(re); return m && why(m); }).find(Boolean) ?? null;
}
const REASONS = [numberedWord, numberedFirst, twoNumbers, startNumber, wordTaken];
export function fenceLineReason(l: string): string | null {
  const m = l.match(/^\s*:::\s*(\S.*?)\s*$/);
  if (!m || opensFence(l)) return null;
  const spec = specOf(m[1]);
  return REASONS.map((reason) => reason(spec)).find(Boolean) ?? PHRASES.unknownBlock();
}
