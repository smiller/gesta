/* THE OLD INLINE SPELLINGS IN AN ENTRY'S TEXT, respelled as markdown: an
   Emacs link `[[address][label]]` is `[label](address)`, and text between
   slashes is italic. Only an address makes a link — a double-bracketed
   name stays — and code is left: a fenced block, a code span, an address,
   a link's own destination. A slash pair hugging a star is a comment's,
   not italics (pin: oldSpellings.test › respell) */
export const ORG = /\[\[((?:https?|ftp|mailto|file):[^\]\s]+|www\.[^\]\s]+)\](?:\[([^\]]+)\])?\]/g;
/* opened and closed by a slash, or by a slash and an underscore or a star
   either way round, the one half respelled long ago: a pair with no slash
   is markdown already */
export const ITALIC = /(^|[\s([“‘"'—–-])([/_*])(?=[^\s/_*])([^/_*\n]*?[^\s/_*])([/_*])(?=$|[\s.,;:!?)\]”’"'—–-])/g;
export const unslashed = (text: string, mark: (body: string) => string): string =>
  text.replace(ITALIC, (all: string, lead: string, open: string, body: string, close: string) => open !== "/" && close !== "/" ? all : lead + mark(body));
/* what italics may not reach into: a code span, a link's destination, an autolink, an address */
const KEEP = /`+[^`]*`+|\]\([^)]*\)|<[^>\s]+>|\b(?:https?|ftp|mailto|file):\/\/\S+|\bwww\.\S+/g;

function italics(text: string): string {
  let out = "", at = 0;
  for (const m of text.matchAll(KEEP)) {
    out += unslashed(text.slice(at, m.index), (b) => "*" + b + "*") + m[0];
    at = m.index! + m[0].length;
  }
  return out + unslashed(text.slice(at), (b) => "*" + b + "*");
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
