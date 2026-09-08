/* THE REFUSED FENCE NAMED. A line shaped like a `:::` opener that opens
   nothing stays a paragraph, which is right and SILENT: the writer sees
   their fence sitting as text and not why. Ported 2026-09-08 from
   md.mjs's noteRefusals, re-asked of the document: had the line opened,
   it would not be a paragraph's text, so every `:::`-shaped line found
   in a paragraph is a refusal by construction — a bare `:::`, a line in
   a code block and a row of a row fence are none of them (the first
   closes, the second is code, the third is a row). A word Gesta knows
   is told what it lacks or what it does not take; "unknown" would send
   the writer looking for a typo in a word they spelled right. */
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
      const m = l.match(/^\s*:::\s*(\S.*?)\s*$/);
      if (!m || opensFence(l)) continue;
      const tok = m[1].match(/^(verse|prose)\s+(.+)$/);
      const tail = m[1].match(/^(note|reference|card-[\w-]+)\s+\S/);
      out.push({ line: l.trim(), reason: tok ? tok[2] + " is not a starting " + (tok[1] === "verse" ? "line" : "sentence")
        : tail ? tail[1] + " takes nothing after it"
        : /^card(?:[\s-]|$)/.test(m[1]) ? "card blocks must include a colour, like card-light-green"
        : "not a block Gesta knows" });
    }
    return false;
  });
  return out;
}
/* the pin's text: every refusal on a line of its own, so a second is not
   hidden behind a count */
export function refusalsText(r: FenceRefusal[]): string {
  const lines = r.map((x) => x.line + " — " + x.reason);
  return r.length === 1 ? lines[0] + ", so it stayed a paragraph" : lines.join("\n") + "\n" + r.length + " fences stayed paragraphs";
}
