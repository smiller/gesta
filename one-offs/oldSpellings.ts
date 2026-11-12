/* THE OLD INLINE SPELLINGS IN AN ENTRY'S TEXT, respelled as markdown: an
   Emacs link `[[address][label]]` is `[label](address)`, one naming a day
   of this journal a link to it, and text between slashes is italic. Any
   other double-bracketed name stays, and code is left: a fenced block, a code span, an address,
   a link's own destination. A slash pair hugging a star is a comment's,
   not italics (pin: oldSpellings.test › respell) */
export const ORG = /\[\[([^\]\s]+)\](?:\[([^\]]+)\])?\]/g;
const ADDRESS = /^((?:https?|ftp|mailto):|www\.)/i;
const DAY = /(?:^|[#:/.])(\d{4})-?(\d{2})-?(\d{2})(?!\d)/;
/* where an Emacs link leads in this journal: an address itself, a day that
   exists for a target naming a date, else nowhere — and it is left */
export function orgTarget(target: string, days: (key: string) => boolean): string | null {
  if (ADDRESS.test(target)) return target;
  const d = DAY.exec(target), key = d && d[1] + "-" + d[2] + "-" + d[3];
  return key && days(key) ? "#" + key : null;
}
/* the Emacs links of a text respelled: `md` as markdown links, `plain` as
   the words they read as */
export function orgLinks(text: string, days: (key: string) => boolean, form: "md" | "plain"): string {
  return text.replace(ORG, (all: string, target: string, label?: string) => {
    const href = orgTarget(target, days);
    if (!href) return all;
    const words = label ?? (href.startsWith("#") ? href.slice(1) : href);
    return form === "plain" ? words : "[" + words + "](" + href + ")";
  });
}
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
/* the Emacs links of a run of lines between code blocks, read whole, so a
   label broken across a line is one link; a code span is left */
function linksIn(text: string, days: (key: string) => boolean): string {
  let out = "", at = 0;
  for (const m of text.matchAll(/`+[^`\n]*`+/g)) {
    out += orgLinks(text.slice(at, m.index), days, "md") + m[0];
    at = m.index! + m[0].length;
  }
  return out + orgLinks(text.slice(at), days, "md");
}
function italicsLine(line: string): string {
  let out = "", at = 0;
  for (const m of line.matchAll(/`+[^`]*`+/g)) {
    out += italics(line.slice(at, m.index)) + m[0];
    at = m.index! + m[0].length;
  }
  return out + italics(line.slice(at));
}

export interface Respelled { line: number; before: string; after: string }
/* `days`: whether a journal day exists, for a link naming a date */
export function respell(md: string, days: (key: string) => boolean = () => false): { md: string; changes: Respelled[] } {
  const lines = md.split("\n"), out: string[] = [];
  let fence: string | null = null, run: string[] = [];
  /* a run between code blocks: its links read whole, its italics a line at a time */
  const flush = (): void => { if (run.length) out.push(...linksIn(run.join("\n"), days).split("\n").map(italicsLine)); run = []; };
  for (const line of lines) {
    const bare = line.replace(/^(\s*>\s?)*/, "");
    const mark = /^\s*(```|~~~)/.exec(bare);
    if (fence) { if (mark && mark[1] === fence) fence = null; out.push(line); continue; }
    if (mark) { flush(); fence = mark[1]; out.push(line); continue; }
    run.push(line);
  }
  flush();
  const changes: Respelled[] = [];
  out.forEach((after, i) => { if (after !== lines[i]) changes.push({ line: i + 1, before: lines[i], after }); });
  return { md: out.join("\n"), changes };
}
