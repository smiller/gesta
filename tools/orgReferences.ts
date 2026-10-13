/* THE OLD LINKS LEFT IN THE TEXT, `[[target][label]]`, each made the link
   its target now is, its label kept: a journal day, or a passage of the
   bookshelf. A link on a line ending in a colon introduces the quotation
   under it, which a reference replaces with the passage it quotes (pin:
   orgReferences.test › referOrgLinks: the quotation a link's line
   introduces). Code is left, and so is any link nothing resolves, with its
   reason (pin: orgReferences.test › referOrgLinks: an old link resolved) */
const ORG = /\[\[([^\]\s]+)\](?:\[([^\]]+)\])?\]/g;
const FENCE = /^\s*(?:>\s*)*(```|~~~)/;
const CODE = /`+[^`\n]*`+/g;

export interface OrgLink { line: number; target: string; label: string; quote: string[] }
export type Resolved = { href: string; passage?: string } | { why: string };
export interface Referred extends OrgLink { res: Resolved; before: string[]; after: string[] }

export function referOrgLinks(md: string, resolve: (link: OrgLink) => Resolved): { md: string; links: Referred[] } {
  const src = md.split("\n"), out: string[] = [], links: Referred[] = [];
  let fence = false;
  for (let i = 0; i < src.length; i++) {
    const line = src[i];
    if (FENCE.test(line)) { fence = !fence; out.push(line); continue; }
    const spans = [...line.matchAll(CODE)].map((m) => [m.index!, m.index! + m[0].length]);
    const found = fence ? [] : [...line.matchAll(ORG)].filter((m) => !spans.some(([a, b]) => m.index! >= a && m.index! < b));
    if (!found.length) { out.push(line); continue; }
    /* the quotation under a line ending in a colon, blank lines before it allowed */
    let q = i + 1;
    while (q < src.length && !src[q].trim()) q++;
    let end = q;
    while (end < src.length && /^>/.test(src[end])) end++;
    const introduces = /:\s*$/.test(line) && end > q;
    let text = line, passage: string[] | undefined;
    const here: Referred[] = found.map((m, k) => {
      /* nothing but marks between the link and the line's closing colon: a
         quotation named after the link is that name's, not the link's
         (pin: orgReferences.test › referOrgLinks: a link introduces the
         quotation only when) */
      const leads = introduces && k === found.length - 1 && /^[^\p{L}\p{Nd}]*$/u.test(line.slice(m.index! + m[0].length));
      const link: OrgLink = { line: i + 1, target: m[1], label: m[2] ?? m[1], quote: leads ? src.slice(q, end) : [] };
      return { ...link, res: resolve(link), before: [line, ...(link.quote.length ? ["", ...link.quote] : [])], after: [] };
    });
    /* edited from the line's end, so each earlier link's place still holds */
    for (const [k, m] of [...found.entries()].reverse()) {
      const res = here[k].res;
      if ("why" in res) continue;
      text = text.slice(0, m.index) + "[" + here[k].label + "](" + res.href + ")" + text.slice(m.index! + m[0].length);
      if (res.passage && here[k].quote.length) passage = res.passage.split("\n");
    }
    for (const l of here) l.after = "why" in l.res ? l.before : [text, ...(l.quote.length ? ["", ...(passage ?? l.quote)] : [])];
    links.push(...here);
    out.push(text);
    if (passage) { out.push(...src.slice(i + 1, q), ...passage); i = end - 1; }
  }
  return { md: out.join("\n"), links };
}
