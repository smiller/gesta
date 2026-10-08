export type Heading = { level: number; text: string };

const collapse = (s: string): string => s.replace(/\s+/g, " ").trim();

/* the old parser reads only `#` and `##` as headings; a `###`–`######`
   line is text there, its marker kept, where this app makes a heading */
export function deeperHeadings(cur: string, headings: Heading[]): { text: string; n: number } {
  let text = cur, from = 0, n = 0;
  for (const h of headings) {
    const words = collapse(h.text);
    const needle = "#".repeat(h.level) + " " + words;
    const at = text.indexOf(needle, from);
    if (at < 0) continue;
    text = text.slice(0, at) + words + text.slice(at + needle.length);
    from = at + words.length;
    n++;
  }
  return { text, n };
}

export type Run = { mark: "em" | "strong"; text: string };
const DELIMITERS: Record<Run["mark"], string[]> = { em: ["*", "_"], strong: ["**", "__"] };

/* the old parser matches emphasis within one line; a run this app reads
   across a line break keeps its delimiters there as text. `from` stays at
   the match less a strong delimiter, so a run both strong and emphasised
   peels from either side (pin: corpusRules.test › peels a run) */
export function spanningEmphasis(cur: string, runs: Run[]): { text: string; n: number } {
  let text = cur, from = 0, n = 0;
  for (const r of runs) {
    const words = collapse(r.text);
    for (const d of DELIMITERS[r.mark]) {
      const at = text.indexOf(d + words + d, from);
      if (at < 0) continue;
      text = text.slice(0, at) + words + text.slice(at + words.length + 2 * d.length);
      from = Math.max(0, at - 2);
      n++;
      break;
    }
  }
  return { text, n };
}
