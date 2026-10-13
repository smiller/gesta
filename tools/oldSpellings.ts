/* THE OLD INLINE SPELLINGS IN AN ENTRY'S TEXT, respelled as markdown: an
   Emacs link `[[address][label]]` is `[label](address)`, and text between
   slashes is italic. Only an address makes a link — a double-bracketed
   name stays — and code is left: a fenced block, a code span, an address,
   a link's own destination. A slash pair hugging a star is a comment's,
   not italics (pin: oldSpellings.test › respell) */
const ORG = /\[\[((?:https?|ftp|mailto|file):[^\]\s]+|www\.[^\]\s]+)\](?:\[([^\]]+)\])?\]/g;
const ITALIC = /(^|[\s([“‘"'—–-])\/(?=[^\s/*])([^/\n]*?[^\s/*])\/(?=$|[\s.,;:!?)\]”’"'—–-])/g;
/* what italics may not reach into: a code span, a link's destination, an autolink, an address */
const KEEP = /`+[^`]*`+|\]\([^)]*\)|<[^>\s]+>|\b(?:https?|ftp|mailto|file):\/\/\S+|\bwww\.\S+/g;

function italics(text: string): string {
  let out = "", at = 0;
  for (const m of text.matchAll(KEEP)) {
    out += text.slice(at, m.index).replace(ITALIC, (_, lead: string, body: string) => lead + "*" + body + "*") + m[0];
    at = m.index! + m[0].length;
  }
  return out + text.slice(at).replace(ITALIC, (_, lead: string, body: string) => lead + "*" + body + "*");
}
function respellLine(line: string): string {
  /* code spans first: an Emacs link inside one is code */
  let out = "", at = 0;
  for (const m of line.matchAll(/`+[^`]*`+/g)) {
    out += italics(line.slice(at, m.index).replace(ORG, (_, href: string, label?: string) => "[" + (label ?? href) + "](" + href + ")")) + m[0];
    at = m.index! + m[0].length;
  }
  return out + italics(line.slice(at).replace(ORG, (_, href: string, label?: string) => "[" + (label ?? href) + "](" + href + ")"));
}

export interface Respelled { line: number; before: string; after: string }
export function respell(md: string): { md: string; changes: Respelled[] } {
  const lines = md.split("\n"), changes: Respelled[] = [];
  let fence: string | null = null;
  const out = lines.map((line, i) => {
    const bare = line.replace(/^(\s*>\s?)*/, "");
    const mark = /^\s*(```|~~~)/.exec(bare);
    if (fence) { if (mark && mark[1] === fence) fence = null; return line; }
    if (mark) { fence = mark[1]; return line; }
    const after = respellLine(line);
    if (after !== line) changes.push({ line: i + 1, before: line, after });
    return after;
  });
  return { md: out.join("\n"), changes };
}
