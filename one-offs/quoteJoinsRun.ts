/* node tools/quoteJoinsRun.ts [backup-dir] [out-dir] — every journal entry
   before 2026 read, its quotes a blank line apart joined, the changed
   entries written under out-dir at their own paths for an import, a review
   page beside out-dir, the counts printed */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import { joinQuotes, type Join } from "./quoteJoins.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

const HOME = process.env.HOME!;
const SRC = process.argv[2] ?? join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.argv[3] ?? join(HOME, "Desktop/gesta-imports/gesta-quote-joins");
/* only a folder of this run's own naming is cleared before writing */
if (!/^gesta-quote-joins/.test(basename(OUT))) throw new Error(`refusing to clear ${OUT}: name the folder gesta-quote-joins…`);
/* the gaps read as two quotations, by entry: the quoted line above each, its words */
const APART: Record<string, string[]> = JSON.parse(readFileSync(new URL("./quoteJoinsApart.json", import.meta.url), "utf8"));

const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : n.endsWith(".md") ? [p] : [];
});
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const cut = (s: string): string => s.length > 200 ? s.slice(0, 200) + " …" : s;
const depthOf = (l: string): number => /^((?:> ?)+)/.exec(l)?.[1].replace(/ /g, "").length ?? 0;
const kindOf = (j: Join): string => depthOf(j.above) === depthOf(j.below) ? "same" : depthOf(j.below) > depthOf(j.above) ? "deeper" : "shallower";
const blockquotes = (md: string): number => { let n = 0; parseMarkdown(md).descendants((node) => { if (node.type.name === "blockquote") n++; }); return n; };

rmSync(OUT, { recursive: true, force: true });
const counts = { entries: 0, changed: 0, joins: 0, apart: 0 };
const done: { file: string; joins: Join[] }[] = [], refused: { file: string; why: string }[] = [];
const journal = join(SRC, "journal");
for (const path of walk(journal).sort()) {
  if (Number(basename(dirname(path))) >= 2026) continue;
  const file = relative(SRC, path);
  counts.entries++;
  const md = readFileSync(path, "utf8");
  const apart = APART[file] ?? [];
  const { text, joins } = joinQuotes(md, apart);
  counts.apart += apart.length;
  if (!joins.length) continue;
  const doc = parseMarkdown(text);
  const why = serializeMarkdown(parseMarkdown(serializeMarkdown(doc))) !== serializeMarkdown(doc) ? "not a fixed point"
    : doc.textContent !== parseMarkdown(md).textContent ? "its words read differently"
    : blockquotes(text) >= blockquotes(md) ? "no quotation joined in the model" : "";
  if (why) { refused.push({ file, why }); continue; }
  counts.changed++; counts.joins += joins.length;
  done.push({ file, joins });
  const to = join(OUT, file);
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, text);
}
mkdirSync(OUT, { recursive: true });

const where = (f: string): string => f.replace(/^journal\/\d+\//, "").replace(/\.md$/, "");
const shown = (j: Join): string => `<div class="j"><span class="ln">line ${j.line + 1}</span><div class="q">${esc(cut(j.above))}</div><div class="gap">${esc(">".repeat(j.depth) + " ")}</div><div class="q">${esc(cut(j.below))}</div></div>`;
const changes = done.flatMap(({ file, joins }) => joins.filter((j) => kindOf(j) !== "same").map((j) => ({ file, j })));
const years = new Map<string, typeof done>();
for (const d of done) { const y = d.file.split("/")[1]; years.set(y, [...(years.get(y) ?? []), d]); }
writeFileSync(OUT + "-review.html", `<!doctype html><meta charset="utf-8"><title>Quote joins review</title><style>
:root{--bg:#f6f4ee;--fg:#1f1f1f;--mut:#777;--line:#dcd8cc;--q:#2b4a6f;--join:#2e7d32;--card:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#1b1b1d;--fg:#e6e6e6;--mut:#999;--line:#3a3a3e;--q:#9cc3ef;--join:#7fcf83;--card:#242427}}
body{font:15px/1.45 Georgia,serif;max-width:1100px;margin:2em auto;padding:0 16px;background:var(--bg);color:var(--fg)}
h2{font-size:1.2em;margin-top:2em;border-bottom:1px solid var(--line)}nav a{margin-right:.7em;white-space:nowrap}
details{margin:.15em 0}summary{font:13px ui-monospace,Menlo,monospace;cursor:pointer}
.j{background:var(--card);border:1px solid var(--line);border-radius:5px;padding:.3em .6em;margin:.35em 0 .35em 1em}
.q,.gap{font:13px/1.4 ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-word;color:var(--q)}
.gap{color:var(--join);background:color-mix(in srgb,var(--join) 14%,transparent)}.ln{font:11px ui-monospace,Menlo,monospace;color:var(--mut)}
h3{font:13px ui-monospace,Menlo,monospace;margin:1em 0 .2em}</style>
<h1>Quote joins: ${counts.joins} gaps joined in ${counts.changed} journal entries</h1>
<p>${counts.entries} journal entries before 2026 read. Each gap shown as the line above it, the empty quoted line that replaces the blank line (green), and the line below. Code left; ${counts.apart} gap${counts.apart === 1 ? "" : "s"} listed to stay apart.</p>
<nav><a href="#refused">Refused (${refused.length})</a><a href="#depth">Depth changes (${changes.length})</a><a href="#same">Same depth, by year (${counts.joins - changes.length})</a></nav>
<h2 id="refused">Refused: not written — ${refused.length}</h2>
${refused.map((r) => `<p>${esc(r.file)} — ${r.why}</p>`).join("") || "<p>None.</p>"}
<h2 id="depth">Into or out of a deeper quote — ${changes.length}, every one</h2>
${changes.map(({ file, j }, k) => (k === 0 || changes[k - 1].file !== file ? `<h3>${esc(file.replace(/^journal\//, "").replace(/\.md$/, ""))}</h3>` : "") + shown(j)).join("")}
<h2 id="same">Same depth — ${counts.joins - changes.length}, by year and entry</h2>
<nav>${[...years.keys()].map((y) => `<a href="#y${y}">${y}</a>`).join("")}</nav>
${[...years].map(([y, ds]) => `<h3 id="y${y}">${y} — ${ds.length} entries</h3>` + ds.map(({ file, joins }) => {
  const same = joins.filter((j) => kindOf(j) === "same");
  return same.length ? `<details><summary>${esc(where(file))} — ${same.length}</summary>${same.map(shown).join("")}</details>` : "";
}).join("")).join("")}`);
console.log(`${counts.entries} journal entries before 2026 read; ${counts.joins} gaps joined in ${counts.changed} entries (${changes.length} changing depth), ${refused.length} refused, ${counts.apart} kept apart; written to ${OUT}, the review beside it`);
for (const r of refused) console.log(`refused: ${r.file} — ${r.why}`);
