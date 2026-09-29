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
export function fenceLineReason(l: string): string | null {
  const m = l.match(/^\s*:::\s*(\S.*?)\s*$/);
  if (!m || opensFence(l)) return null;
  const tok = m[1].match(/^(verse|prose)\s+(.+)$/);
  const tail = m[1].match(/^(note|margin-note|reference|card-[\w-]+)\s+\S/);
  const count = m[1].match(/^grid\s+(.+)$/);
  const stanza = m[1].match(/^stanza(?:\s+(.+))?$/);
  return tok ? tok[2] + " is not a starting " + (tok[1] === "verse" ? "line" : "sentence")
    : stanza ? (stanza[1] ? stanza[1] + " is not a stanza number" : "stanza needs its number, like ::: stanza 2")
    : tail ? tail[1] + " takes nothing after it"
    : count ? count[1] + " is not a count"
    : /^card(?:[\s-]|$)/.test(m[1]) ? "card blocks must include a colour, like card-light-green"
    : "not a block Gesta knows";
}
export function refusalsText(r: FenceRefusal[]): string {
  const lines = r.map((x) => x.line + " — " + x.reason);
  return r.length === 1 ? lines[0] + ", so it stayed a paragraph" : lines.join("\n") + "\n" + r.length + " fences stayed paragraphs";
}
