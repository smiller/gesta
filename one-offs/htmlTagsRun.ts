/* node one-offs/htmlTagsRun.ts [backup-dir] [out-dir] — the entries the HTML
   survey found typing HTML read, their tags and entities made markdown,
   the changed entries written under out-dir at their own paths for an
   import, a review page beside out-dir, the counts printed */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { untag, codeTags, quotedCode } from "./htmlTags.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";
import { importTarget } from "../src/store/names.ts";
import { entryHash } from "../src/store/keys.ts";

const HOME = process.env.HOME!;
const SRC = process.argv[2] ?? join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.argv[3] ?? join(HOME, "Desktop/gesta-imports/gesta-html-tags");
/* only a folder of this run's own naming is cleared before writing */
if (!/^gesta-html-tags/.test(basename(OUT))) throw new Error(`refusing to clear ${OUT}: name the folder gesta-html-tags…`);
const APP = "file:///Users/seanmiller/Library/CloudStorage/Dropbox/claude/gesta/dist/index.html";

/* each read: a <br/> ending a line, italics typed as tags, an entity pasted
   in; the entries writing about HTML are not here */
const BREAKS = ["1993/1993-09-23", "1996/1996-08-13", "1996/1996-09-28", "1996/1996-10-07", "1996/1996-10-11", "1997/1997-04-29", "1997/1997-06-29", "1997/1997-09-05", "1997/1997-09-24", "1997/1997-10-09", "1997/1997-10-10", "1998/1998-05-26", "1998/1998-07-07", "1998/1998-07-17", "1998/1998-08-31", "1998/1998-09-05", "2002/2002-11-15", "2006/2006-03-27", "2007/2007-02-25", "2010/2010-10-15"].map((f) => `journal/${f}.md`);
const ITALICS = ["2019/2019-12-29", "2020/2020-07-22", "2023/2023-02-22", "2023/2023-02-26", "2023/2023-04-29", "2023/2023-12-05", "2024/2024-01-21"].map((f) => `journal/${f}.md`);
const ENTITIES = ["journal/2023/2023-02-22.md", "journal/2023/2023-02-26.md", "bookshelf/Doctor Who/First Doctor/2-2 The Dalek Invasion of Earth.md", "bookshelf/Doctor Who/First Doctor/3-3 The Daleks’ Master Plan.md", "bookshelf/Doctor Who/First Doctor/3-7 The Gunfighters.md", "bookshelf/Spenser, Edmund/The Faerie Queene/4.11.md"];
/* code pasted as HTML or as a quotation, put back in a fenced block */
const CODE: Record<string, (md: string) => string> = {
  "journal/2020/2020-07-24.md": (md) => codeTags(md, "java"),
  "journal/2022/2022-10-30.md": (md) => quotedCode(md, "html"),
};
const FILES = [...new Set([...BREAKS, ...ITALICS, ...ENTITIES, ...Object.keys(CODE)])].sort();
/* only taken away: the text after, fence lines and spacing aside, is the text before with pieces left out, in order */
const onlyTaken = (before: string, after: string): boolean => {
  const b = before.replace(/\s+/g, ""), a = after.replace(/^```\w*$/gm, "").replace(/\s+/g, "");
  let i = 0;
  for (const c of a) { i = b.indexOf(c, i); if (i < 0) return false; i++; }
  return true;
};

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const href = (f: string): string => { const t = importTarget(f)!; return APP + entryHash(t.date, t.tag); };
/* the words alone: tags, marks and spacing aside, a blockquote's semicolon aside, an entity read as its letter, an apostrophe's curl aside */
const NAMED: Record<string, string> = { aelig: "æ", AElig: "Æ", utilde: "ũ" };
const plain = (md: string): string => md.replace(/```[\s\S]*?```/g, "").replace(/<\/blockquote>;/g, "</blockquote>").replace(/<\/?(?:i|em|br|blockquote)\s*\/?>/g, "").replace(/^\s*>\s?/gm, "")
  .replace(/&#x27;/g, "'").replace(/&([a-zA-Z]+);/g, (m, e: string) => NAMED[e] ?? m);
const words = (md: string): string => parseMarkdown(md).textContent.replace(/[‘’]/g, "'").replace(/\s+/g, "");
const code = (md: string): string => (md.match(/```[\s\S]*?```/g) ?? []).join("\n");

rmSync(OUT, { recursive: true, force: true });
const done: { file: string; lines: { n: number; b: string; a: string }[] }[] = [];
for (const file of FILES) {
  const md = readFileSync(join(SRC, file), "utf8"), out = CODE[file] ? CODE[file](md) : untag(md);
  if (out === md) throw new Error(`${file}: nothing changed`);
  if (CODE[file]) {
    if (!onlyTaken(md, out)) throw new Error(`${file}: something was added, not only taken away`);
    if (/<\/?(?:code|span)\b|^>+.*(?:<script|anychart|chart\.)/m.test(out.replace(/^```\w*\n[\s\S]*?\n```$/gm, ""))) throw new Error(`${file}: a tag or quoted code is left`);
  } else {
    if (words(plain(md)) !== words(plain(out))) throw new Error(`${file}: its words read differently`);
    if (code(md) !== code(out)) throw new Error(`${file}: its code changed`);
  }
  const left = out.replace(/```[\s\S]*?```/g, "").match(/<\/?(?:i|em|br|blockquote)\b[^>]*>|&(?:#x27|aelig|AElig|utilde);/g);
  if (left) throw new Error(`${file}: still holds ${left.join(" ")}`);
  const doc = parseMarkdown(out);
  if (serializeMarkdown(parseMarkdown(serializeMarkdown(doc))) !== serializeMarkdown(doc)) throw new Error(`${file}: not a fixed point`);
  const b = md.split("\n"), a = out.split("\n");
  if (CODE[file]) {
    /* the passage whole, before and after, the lines either side the same */
    let s0 = 0, e0 = 0;
    while (b[s0] === a[s0]) s0++;
    while (b[b.length - 1 - e0] === a[a.length - 1 - e0]) e0++;
    done.push({ file, lines: [{ n: s0 + 1, b: b.slice(s0, b.length - e0).join("\n"), a: a.slice(s0, a.length - e0).join("\n") }] });
  } else {
    if (a.length !== b.length) throw new Error(`${file}: the line count changed`);
    done.push({ file, lines: b.map((l, i) => ({ n: i + 1, b: l, a: a[i] })).filter((x) => x.b !== x.a) });
  }
  mkdirSync(dirname(join(OUT, file)), { recursive: true });
  writeFileSync(join(OUT, file), out);
}
const changed = done.reduce((s, d) => s + d.lines.length, 0);
const name = (f: string): string => f.replace(/^journal\/\d+\//, "").replace(/\.md$/, "");
writeFileSync(OUT + "-review.html", `<!doctype html><meta charset="utf-8"><title>HTML tags review</title><style>
:root{--bg:#f6f4ee;--fg:#1f1f1f;--mut:#777;--line:#dcd8cc;--card:#fff;--b:#8a3b2a;--a:#1f5a2b;--bb:#fbeee8;--ab:#e6f0dc}
@media (prefers-color-scheme:dark){:root{--bg:#1b1b1d;--fg:#e6e6e6;--mut:#999;--line:#3a3a3e;--card:#242427;--b:#e59a87;--a:#7fcf83;--bb:#3a2622;--ab:#22331f}}
body{font:15px/1.45 Georgia,serif;max-width:1100px;margin:2em auto;padding:0 16px;background:var(--bg);color:var(--fg)}a{color:var(--a)}
.c{background:var(--card);border:1px solid var(--line);border-radius:5px;padding:.4em .7em;margin:.6em 0}.h{font:13px ui-monospace,Menlo,monospace;margin-bottom:.3em}
.l{display:grid;grid-template-columns:3em 1fr;gap:0 .5em}.n{font:11px ui-monospace,Menlo,monospace;color:var(--mut);grid-row:span 2}
pre{margin:1px 0;white-space:pre-wrap;word-break:break-word;font:12px/1.4 ui-monospace,Menlo,monospace;padding:2px 6px}.b{background:var(--bb);color:var(--b)}.a{background:var(--ab);color:var(--a)}</style>
<h1>HTML made markdown: ${changed} lines in ${done.length} entries</h1>
<p>A &lt;br/&gt; ending a line dropped; &lt;i&gt; and &lt;em&gt; made italics a line at a time; a &lt;blockquote&gt; made a quotation, the semicolon after it dropped; an entity made its letter. Code is left, but for two pastes put back in a fenced block, shown whole. Every entry written reads the same words as before. Red is the line as it stands, green as it will read; each entry links to Gesta.</p>
${done.map((d) => `<div class="c"><div class="h"><a href="${esc(href(d.file))}">${esc(name(d.file))}</a> · ${d.lines.length} line(s)</div>${d.lines.map((x) => `<div class="l"><span class="n">${x.n}</span><pre class="b">${esc(x.b)}</pre><pre class="a">${esc(x.a)}</pre></div>`).join("")}</div>`).join("")}`);
console.log(`${FILES.length} entries read; ${changed} lines changed in ${done.length} entries; written to ${OUT}, the review beside it`);
