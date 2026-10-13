/* node tools/elisionsRun.ts [backup-dir] [out-dir] — every bookshelf entry
   read, its elisions' apostrophes turned, the changed entries written under
   out-dir at their own paths for an import, a review page beside out-dir,
   the counts printed */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import { elisions, respell, type Elision } from "./elisions.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

const HOME = process.env.HOME!;
const SRC = process.argv[2] ?? join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.argv[3] ?? join(HOME, "Desktop/gesta-imports/gesta-elisions");
/* only a folder of this run's own naming is cleared before writing */
if (!/^gesta-elisions/.test(basename(OUT))) throw new Error(`refusing to clear ${OUT}: name the folder gesta-elisions…`);
const dict = new Set(readFileSync("/usr/share/dict/words", "utf8").split("\n").map((w) => w.toLowerCase()));

const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : n.endsWith(".md") ? [p] : [];
});
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const around = (md: string, at: number): [string, string] => {
  const from = Math.max(md.lastIndexOf("\n", at - 1) + 1, at - 60), to = Math.min((md.indexOf("\n", at) + 1 || md.length + 1) - 1, at + 60);
  return [md.slice(from, at), md.slice(at + 1, to)];
};

rmSync(OUT, { recursive: true, force: true });
const counts = { entries: 0, changed: 0, turned: 0, left: 0 };
const turned: Record<string, { file: string; ctx: [string, string] }[]> = {}, left: { file: string; word: string; ctx: [string, string] }[] = [];
for (const path of walk(join(SRC, "bookshelf")).sort()) {
  const file = relative(SRC, path);
  counts.entries++;
  const md = readFileSync(path, "utf8");
  const found: Elision[] = elisions(md, dict);
  for (const e of found) {
    if (e.turn) (turned[e.word.toLowerCase()] ??= []).push({ file, ctx: around(md, e.at) });
    else { counts.left++; left.push({ file, word: e.word, ctx: around(md, e.at) }); }
  }
  const turn = found.filter((e) => e.turn);
  if (!turn.length) continue;
  counts.turned += turn.length;
  const out = respell(md, turn);
  const doc = parseMarkdown(out);
  if (serializeMarkdown(parseMarkdown(serializeMarkdown(doc))) !== serializeMarkdown(doc)) throw new Error(`${file}: not a fixed point`);
  counts.changed++;
  const to = join(OUT, file);
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, out);
}
/* a synced Desktop can leave an empty "bookshelf 2" beside a folder cleared
   and written again at once: empty folders are swept */
const sweep = (dir: string): boolean => {
  const kids = readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory() ? !sweep(join(dir, n)) : n !== ".DS_Store");
  if (kids.length || dir === OUT) return false;
  rmSync(dir, { recursive: true, force: true });
  return true;
};
mkdirSync(OUT, { recursive: true });
sweep(OUT);
const where = (f: string): string => f.replace(/^bookshelf\//, "").replace(/\.md$/, "");
const line = (file: string, [a, b]: [string, string], mark: string): string => `<li><span class="f">${esc(where(file))}</span> …${esc(a)}<b>${mark}</b>${esc(b)}…</li>`;
const words = Object.entries(turned).sort((a, b) => b[1].length - a[1].length);
writeFileSync(OUT + "-review.html", `<!doctype html><meta charset="utf-8"><title>Elisions review</title><style>
body{font:15px/1.5 Georgia,serif;max-width:1100px;margin:2em auto;padding:0 16px;background:#f4f7ec;color:#1a2418}
h2{font-size:1.2em;margin-top:2em;border-bottom:1px solid #cdd6c2}h3{font-size:1em;margin:1.2em 0 .2em}
ul{margin:.2em 0;padding-left:1.2em}li{margin:.15em 0}.f{font:12px ui-monospace,Menlo,monospace;color:#6b7568;margin-right:.4em}
b{background:#e6f0dc;padding:0 2px}.left b{background:#fbeee8}nav a{margin-right:.6em}</style>
<h1>Elisions: ${counts.turned} apostrophes turned in ${counts.changed} bookshelf entries</h1>
<p>${counts.entries} bookshelf entries read. An opening quotation mark standing for a dropped letter becomes an apostrophe: ‘tis → ’tis. A clip that is no word of its own always turns, and so does a dropped h where the word without it is none (‘orse); a clip that is also a word (‘is, ‘old, ‘course) turns only where no closing mark follows it in its paragraph. Green is the mark as it will read.</p>
<nav>${words.map(([w, l]) => `<a href="#w-${esc(w)}">${esc(w)} (${l.length})</a>`).join("")}<a href="#left">left (${left.length})</a></nav>
<h2>Turned</h2>
${words.map(([w, l]) => `<h3 id="w-${esc(w)}">’${esc(w)} — ${l.length}</h3><ul>${l.map((x) => line(x.file, x.ctx, "’")).join("")}</ul>`).join("")}
<h2 id="left">Left: a clip that is also a word, with a closing mark after it (${left.length})</h2>
<ul class="left">${left.map((x) => line(x.file, x.ctx, "‘")).join("")}</ul>`);
console.log(`${counts.entries} bookshelf entries read; ${counts.turned} apostrophes turned in ${counts.changed} entries, ${counts.left} left; written to ${OUT}, the review beside it`);
