/* node one-offs/pipeTablesRun.ts [backup-dir] [out-dir] — every entry in the
   backup read, its two-column pipe tables made verse blocks of pairs, the
   changed entries written under out-dir at their own paths for an import,
   a review page beside out-dir, the counts printed */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import { versePipeTables, type Table } from "./pipeTables.ts";
import { shelfIndex, quotedFrom, referenceAt } from "./bookshelfQuotes.ts";
import { importTarget } from "../src/store/names.ts";
import { entryKey } from "../src/store/keys.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

const HOME = process.env.HOME!;
const SRC = process.argv[2] ?? join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.argv[3] ?? join(HOME, "Desktop/gesta-imports/gesta-pipe-tables");
/* only a folder of this run's own naming is cleared before writing */
if (!/^gesta-pipe-tables/.test(basename(OUT))) throw new Error(`refusing to clear ${OUT}: name the folder gesta-pipe-tables…`);

/* tables read and left */
const LEAVE_TABLE = new Map([
  ["journal/1997/1997-10-24.md:43", "a signature set in a table"],
  ["journal/2024/2024-08-27.md:35", "a grid of words, not a text and its translation"],
  ["journal/2026/2026-06-26.md:72", "a table of key bindings"],
  ["journal/2026/2026-07-16--gesta wrangling.md:156", "a table of language codes"],
]);
/* tables made the reference to a passage named, asked, where the
   bookshelf's edition differs from the one quoted in more lines than a
   match allows */
const REFER = new Map([
  ["journal/2017/2017-11-15.md:100", { key: "bookshelf/Horace/Odes/3.29", from: 29, to: 48 }],
  /* the translation alone quoted, numbered from the line before the bookshelf's */
  ["journal/2023/2023-04-08.md:45", { key: "bookshelf/Cavafy, C. P/The First Step", from: 17, to: 24 }],
  ["journal/2023/2023-03-22.md:33", { key: "bookshelf/Housman, A. E/Last Poems/25. The Oracles", from: 9, to: 12 }],
]);
const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : n.endsWith(".md") ? [p] : [];
});
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/* the bookshelf read whole, for the tables that quote it */
const cache: Record<string, string> = Object.create(null);
for (const path of walk(SRC)) { const t = importTarget(relative(SRC, path)); if (t) cache[entryKey(t.date, t.tag)] = readFileSync(path, "utf8"); }
/* a page this run makes verse is quoted as it will stand */
const index = shelfIndex(Object.fromEntries(Object.entries(cache).map(([k, md]) => [k, /^(bookshelf|page)\//.test(k) ? versePipeTables(md).md : md])));

rmSync(OUT, { recursive: true, force: true });
const counts = { entries: 0, changed: 0, made: 0, referred: 0, left: 0 };
const made: { file: string; t: Table }[] = [], referred: { file: string; t: Table }[] = [], left: { file: string; t: Table }[] = [];
for (const path of walk(SRC).sort()) {
  counts.entries++;
  const md = readFileSync(path, "utf8"), file = relative(SRC, path);
  const self = importTarget(file);
  const r = versePipeTables(md, (lines, line) => {
    const named = REFER.get(file + ":" + line);
    return named ? referenceAt(index, named.key, { from: named.from, to: named.to }) : quotedFrom(index, lines, self ? entryKey(self.date, self.tag) : undefined);
  });
  let out = md, changed = false;
  for (const t of r.tables) {
    const leave = LEAVE_TABLE.get(file + ":" + t.line);
    if (leave || !t.after) { counts.left++; left.push({ file, t: { ...t, why: leave ?? t.why, after: undefined } }); continue; }
    changed = true;
    if (t.shelf) {
      /* a reference carries its link: on its own line, or in the sentence introducing it */
      if (!t.intro && !/^(> )*\[[^\]]+\]\(#/.test(t.after[0])) throw new Error(`${file}:${t.line}: a reference without its link`);
      counts.referred++; referred.push({ file, t });
    } else { counts.made++; made.push({ file, t }); }
  }
  if (!changed) continue;
  /* the tables left by name are put back as they stood */
  out = r.tables.reduce((text, t) => LEAVE_TABLE.has(file + ":" + t.line) ? text.replace(t.after!.join("\n"), t.before.join("\n")) : text, r.md);
  const doc = parseMarkdown(out);
  if (serializeMarkdown(parseMarkdown(serializeMarkdown(doc))) !== serializeMarkdown(doc)) throw new Error(`${file}: not a fixed point`);
  counts.changed++;
  const to = join(OUT, file);
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, out);
}
/* a synced Desktop can leave an empty "journal 2" beside a folder cleared
   and written again at once: empty folders are swept */
const sweep = (dir: string): boolean => {
  const kids = readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory() ? !sweep(join(dir, n)) : n !== ".DS_Store");
  if (kids.length || dir === OUT) return false;
  rmSync(dir, { recursive: true, force: true });
  return true;
};
mkdirSync(OUT, { recursive: true });
sweep(OUT);
writeFileSync(OUT + "-review.html", `<!doctype html><meta charset="utf-8"><title>Pipe tables review</title><style>
body{font:15px/1.5 Georgia,serif;max-width:1100px;margin:2em auto;padding:0 16px;background:#f4f7ec;color:#1a2418}
h2{font-size:1.2em;margin-top:2em;border-bottom:1px solid #cdd6c2}
.e{margin:1.4em 0}.e>span{font:12px ui-monospace,Menlo,monospace;color:#6b7568}
pre{white-space:pre-wrap;font:13px/1.45 ui-monospace,Menlo,monospace;margin:.3em 0;padding:6px 8px}
.before{background:#fbeee8}.after{background:#e6f0dc}.kept{background:#eef1f6}</style>
<h1>Pipe tables: ${counts.referred} made references to the bookshelf, ${counts.made} made verse, in ${counts.changed} entries</h1>
<p>${counts.entries} entries read. A two-column table becomes a <code>::: verse</code> block, each row a pair <code>left | right</code>; its divider row goes, an empty row is a stanza break, and a column of line numbers becomes the block's first number. A table quoting verse on the bookshelf becomes the reference a copy of that passage makes (⌃⌘C): its label and link, then the bookshelf's own lines. Red is the table as it stands, green what the import would make. ${counts.left} tables are left as they are, listed last with the reason.</p>
<h2>Made references to the bookshelf (${referred.length})</h2>
${referred.map(({ file, t }) => `<div class="e"><span>${esc(file)}:${t.line} — ${esc(t.shelf!)}${t.intro ? ", its link in the sentence before" : ""}</span><pre class="before">${esc([...(t.intro ? [t.intro.before, ""] : []), ...t.before].join("\n"))}</pre><pre class="after">${esc([...(t.intro ? [t.intro.after, ""] : []), ...t.after!].join("\n"))}</pre></div>`).join("")}
<h2>Made verse (${made.length})</h2>
${made.map(({ file, t }) => `<div class="e"><span>${esc(file)}:${t.line}${t.why ? " — " + esc(t.why) : ""}</span><pre class="before">${esc(t.before.join("\n"))}</pre><pre class="after">${esc(t.after!.join("\n"))}</pre></div>`).join("")}
<h2>Left as they are (${left.length})</h2>
${left.map(({ file, t }) => `<div class="e"><span>${esc(file)}:${t.line} — ${esc(t.why!)}</span><pre class="kept">${esc(t.before.join("\n"))}</pre></div>`).join("")}`);
console.log(`${counts.entries} entries read; ${counts.referred} tables made references, ${counts.made} made verse, in ${counts.changed} entries, ${counts.left} left; written to ${OUT}, the review beside it`);
