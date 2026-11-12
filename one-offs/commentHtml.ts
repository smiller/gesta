/* A CHAPTER COMMENT PASTED AS HTML made markdown: each entry the chapter's
   words in italics, a line each, and the reply beneath it starting "– ";
   words of one's own plain but for their own italics, a blockquote a
   quotation, an italic wrapping a whole paragraph dropped, quotes curled
   on the plain text so a mark never decides them (pin: commentHtml.test ›
   commentHtml: a quotation in italics). */

import { curlQuotes } from "../src/editor/format.ts";

const TAG = /<\/?i>/g;
const ENTITIES: Record<string, string> = { gt: ">", lt: "<", amp: "&", quot: "\"", "#39": "'", nbsp: " " };
const decode = (s: string): string => s.replace(/&(gt|lt|amp|quot|#39|nbsp);/g, (_, e: string) => ENTITIES[e]);

/* the italic opened first closes only at the very end: a wrapper */
function unwrap(s: string): string {
  if (!s.startsWith("<i>") || !s.endsWith("</i>")) return s;
  let depth = 0;
  for (const m of s.matchAll(TAG)) {
    depth += m[0] === "<i>" ? 1 : -1;
    if (depth === 0) return m.index + 4 === s.length ? unwrap(s.slice(3, -4).trim()) : s;
  }
  return s;
}

/* curled on the text alone, the marks put back where they stood */
function curl(line: string, italic: (inner: string) => string): string {
  const plain = decode(line.replace(TAG, "")), curled = curlQuotes(plain, "");
  if (curled.length !== plain.length) throw new Error(`curling changed the length of: ${plain}`);
  let k = 0;
  const back = decode(line).replace(/<\/?i>|[^<]+|</g, (piece) => piece === "<i>" || piece === "</i>" ? piece : curled.slice(k, (k += piece.length)));
  return italic(back);
}
const marks = (s: string): string => s.replace(/<i>([^<]*)<\/i>/g, "*$1*").replace(TAG, "");
const wholly = (s: string): string => `*${s.replace(TAG, "")}*`;

type Entry = { lines: string[]; kind: "alone" | "reply" | "own" | "quotation" };

function entry(raw: string, quoted: boolean): Entry | null {
  const body = unwrap(raw.trim());
  const lines = body.split(/<br\s*\/?>|\n/).map((l) => l.trim()).filter((l) => l && l.replace(TAG, "").trim());
  if (!lines.length) return null;
  if (quoted) return { kind: "quotation", lines: lines.map((l) => "> " + curl(l, (s) => s.replace(TAG, ""))) };
  /* a chapter's words written as quoted lines with no reply */
  if (lines.every((l) => l.startsWith(">"))) return { kind: "alone", lines: lines.map((l) => curl(l.replace(/^>\s*/, ""), wholly)) };
  /* a reply typed with a hyphen is given the dash (pin: commentHtml.test › commentHtml: a reply typed with a hyphen) */
  const reply = lines.findIndex((l) => /^(?:\[I)?[–-]\s/.test(l.replace(TAG, "")));
  if (reply <= 0) return { kind: "own", lines: lines.map((l) => curl(l, marks)) };
  return { kind: "reply", lines: [...lines.slice(0, reply).map((l) => curl(l, wholly)), ...lines.slice(reply).map((l, k) => curl(k === 0 ? l.replace(/^((?:<\/?i>)*)\[I/, "$1").replace(/^((?:<\/?i>)*)-(?=\s)/, "$1–") : l, marks))] };
}

export function commentMarkdown(html: string): { text: string; entries: { html: string; md: string }[] } {
  const out: Entry[] = [], entries: { html: string; md: string }[] = [];
  const parts = html.split(/(<\/?(?:p|blockquote)>)/);
  let quoted = false;
  for (const part of parts) {
    if (part === "<blockquote>") { quoted = true; continue; }
    if (part === "</blockquote>") { quoted = false; continue; }
    if (part === "<p>" || part === "</p>") continue;
    const e = entry(part, quoted);
    if (!e) continue;
    const html = (quoted ? "<blockquote>" : "") + part.trim();
    /* a quotation with no reply goes with the chapter's words that follow it */
    const last = out[out.length - 1];
    if (last?.kind === "alone" && (e.kind === "alone" || e.kind === "reply")) {
      last.lines.push(...e.lines); last.kind = e.kind;
      const prev = entries[entries.length - 1];
      prev.html += "\n\n" + html; prev.md = last.lines.join("\n");
      continue;
    }
    out.push(e); entries.push({ html, md: e.lines.join("\n") });
  }
  return { text: out.map((e) => e.lines.join("\n")).join("\n\n"), entries };
}
