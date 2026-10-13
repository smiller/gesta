/* A TWO-COLUMN PIPE TABLE IS A TEXT BESIDE ITS TRANSLATION, made a verse
   block of pairs: the divider dropped, an empty row a stanza break, a
   column of line numbers the block's first number. Rows apart only by
   blank lines are one table, so a table broken up on its way in is read
   whole (pin: pipeTables.test › versePipeTables: numbered rows of three
   columns). What is not plainly that is left as it stands, with its reason
   (pin: pipeTables.test › versePipeTables: left as they are) */
import { parseMarkdown } from "../src/model/parse.ts";
import { escapeCell } from "../src/model/grammar.ts";
import type { Quoted, Referred } from "./bookshelfQuotes.ts";

const PREFIX = /^(\s*(?:>\s?)*)([^]*)$/;
const DIVIDER = /^\|?\s*:?-{3,}:?\s*(?:[|+]\s*:?-{3,}:?\s*)*\|?\s*$/;
const NUMBERED = /^\s*\d+\s*\|/;
const FENCE = /^\s*(?:>\s*)*(```|~~~)/;

const quote = (prefix: string): string => prefix.trim() ? prefix.trim() + " " : "";
const tabular = (rest: string): boolean => DIVIDER.test(rest) || rest.trim().startsWith("|") || NUMBERED.test(rest);
const cells = (rest: string): string[] =>
  rest.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "").split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
const words = (s: string): string => s.replace(/\s+/g, "");

type Row = { num?: number; left: string; right?: string } | "break";
export interface Table { line: number; before: string[]; after?: string[]; why?: string; shelf?: string; intro?: { before: string; after: string } }
const LABEL = /^(?:\d+|<<[^>]*>>|\d+(?:-\d+)+)?$/;
const OLD_LINK = /\[\[[^\]\s]+\]\[([^\]]+)\]\]/g;
/* the reference a table's lines make when they quote the bookshelf, null when
   they do not, or why they are not one; `line`, the table's first */
export type Refer = (lines: Quoted[], line: number) => Referred | { why: string } | null;

/* the verse a run of table lines reads as, or why it is left */
function verse(lines: string[], prefix: string, refer: Refer, line: number): { out?: string[]; why?: string; shelf?: Referred } {
  const rows: Row[] = [];
  for (const l of lines.map((l) => PREFIX.exec(l)![2])) {
    /* a blank line only parts the pieces of one table; an empty row is the stanza break */
    if (DIVIDER.test(l) || !l.trim()) continue;
    const c = cells(l);
    if (c.every((x) => !x)) { if (rows.length && rows[rows.length - 1] !== "break") rows.push("break"); continue; }
    if (c.some((x) => /<img\b/i.test(x))) return { why: "a picture" };
    /* a third column first is the lines' labels: a number, an anchor, a
       numbered place, or nothing (pin: pipeTables.test › versePipeTables: a
       first column labelling the lines) */
    const labelled = c.length === 3 && LABEL.test(c[0]) || c.length === 2 && /^\d+$/.test(c[0]) && !/^\d+$/.test(c[1]);
    const rest = labelled ? c.slice(1) : c;
    if (rest.length > 2) return { why: "more than two columns" };
    rows.push({ num: labelled && /^\d+$/.test(c[0]) ? parseInt(c[0], 10) : undefined, left: rest[0], right: rest.length === 2 ? rest[1] : undefined });
  }
  while (rows[rows.length - 1] === "break") rows.pop();
  const lines2 = rows.filter((r): r is Exclude<Row, "break"> => r !== "break");
  if (lines2.length < 2) return { why: "a single row" };
  if (new Set(lines2.map((r) => r.right === undefined)).size > 1) return { why: "pairs and single lines mixed" };
  const starts = new Set(lines2.flatMap((r, i) => r.num === undefined ? [] : [r.num - i]));
  if (starts.size > 1) return { why: "its line numbers do not run on" };
  const start = starts.size ? [...starts][0] : 1;
  const q = quote(prefix);
  const shelved = refer(lines2.map((r) => ({ left: r.left, right: r.right })), line);
  if (shelved && "text" in shelved) return { out: shelved.text.split("\n").map((l) => l ? q + l : q.trimEnd()), shelf: shelved };
  const body = rows.map((r) => r === "break" ? q.trimEnd() : q + escapeCell(r.left) + (r.right === undefined ? "" : " | " + escapeCell(r.right)));
  const out = [q + "::: verse" + (start > 1 ? " " + start : ""), ...body, q + ":::"];
  /* the block must read back as the cells' own words */
  const read = parseMarkdown(out.map((l) => l.slice(q.length)).join("\n") + "\n").textContent;
  if (words(read) !== words(lines2.map((r) => r.left + (r.right ?? "")).join(""))) return { why: "the verse would read as other words" };
  return { out, why: shelved ? shelved.why : undefined };
}

export function versePipeTables(md: string, refer: Refer = () => null): { md: string; tables: Table[] } {
  const src = md.split("\n"), out: string[] = [], tables: Table[] = [];
  let fence = false;
  for (let i = 0; i < src.length; i++) {
    if (FENCE.test(src[i])) fence = !fence;
    const [, prefix, rest] = PREFIX.exec(src[i])!;
    if (fence || !tabular(rest)) { out.push(src[i]); continue; }
    /* the run: table lines, and blank lines between them, at one depth of quotation */
    let j = i + 1, last = i;
    while (j < src.length) {
      const [, p, r] = PREFIX.exec(src[j])!;
      if (quote(p) !== quote(prefix) || FENCE.test(src[j])) break;
      if (tabular(r)) last = j; else if (r.trim()) break;
      j++;
    }
    const before = src.slice(i, last + 1);
    const v = verse(before, prefix, refer, i + 1);
    let after = v.out;
    /* the old link introducing the quotation becomes the reference, its
       words kept, and the table the passage alone (pin: pipeTables.test ›
       versePipeTables: a table quoting the bookshelf after a line ending in
       an old link) */
    let k = out.length - 1;
    while (k >= 0 && !PREFIX.exec(out[k])![2].trim()) k--;
    const old = v.shelf && k >= 0 && /:\s*$/.test(out[k]) ? [...out[k].matchAll(OLD_LINK)].pop() : undefined;
    let intro: Table["intro"];
    if (v.shelf && old) {
      intro = { before: out[k], after: out[k].slice(0, old.index) + "[" + old[1] + "](" + v.shelf.url + ")" + out[k].slice(old.index! + old[0].length) };
      out[k] = intro.after;
      after = v.shelf.passage.split("\n").map((l) => l ? quote(prefix) + l : quote(prefix).trimEnd());
    }
    tables.push({ line: i + 1, before, after, why: v.why, shelf: v.shelf?.key, intro });
    out.push(...(after ?? before));
    i = last;
  }
  return { md: out.join("\n"), tables };
}
