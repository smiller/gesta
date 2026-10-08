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
