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
/* a line as it will read: each mark turned green, each weighed and left
   red, every other opening mark amber, a long line cut to its marks */
function shown(out: string, from: number, to: number, kinds: Map<number, string>): string {
  const ats = [...kinds.keys()];
  const a = ats.length && to - from > 700 ? Math.max(from, Math.min(...ats) - 120) : from;
  const b = ats.length && to - from > 700 ? Math.min(to, Math.max(...ats) + 120) : to;
  let html = a > from ? "…" : "";
  for (let i = a; i < b; i++) html += kinds.has(i) ? `<b class="${kinds.get(i)}">${out[i]}</b>` : esc(out[i]);
  return html + (b < to ? "…" : "");
}

rmSync(OUT, { recursive: true, force: true });
const counts = { entries: 0, changed: 0, turned: 0, left: 0, lines: 0 };
const byFile: { file: string; lines: string[] }[] = [];
for (const path of walk(join(SRC, "bookshelf")).sort()) {
  const file = relative(SRC, path);
  counts.entries++;
  const md = readFileSync(path, "utf8");
  const found: Elision[] = elisions(md, dict);
  const turn = found.filter((e) => e.turn);
  counts.left += found.length - turn.length;
  const out = respell(md, turn);
  const kinds = new Map<number, string>();
  for (const m of out.matchAll(/‘/g)) kinds.set(m.index!, "other");
  for (const e of found) kinds.set(e.at, e.turn ? "turned" : "left");
  const lines: string[] = [];
  let from = 0;
  for (const l of out.split("\n")) {
    const to = from + l.length, mine = new Map([...kinds].filter(([at]) => at >= from && at < to));
    if ([...mine.values()].some((k) => k !== "other")) lines.push(shown(out, from, to, mine));
    from = to + 1;
  }
  if (lines.length) { byFile.push({ file, lines }); counts.lines += lines.length; }
  if (!turn.length) continue;
  counts.turned += turn.length;
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
const authors = new Map<string, number>();
for (const { file } of byFile) authors.set(where(file).split("/")[0], (authors.get(where(file).split("/")[0]) ?? 0) + 1);
writeFileSync(OUT + "-review.html", `<!doctype html><meta charset="utf-8"><title>Elisions review</title><style>
body{font:15px/1.5 Georgia,serif;max-width:1100px;margin:2em auto;padding:0 16px;background:#f4f7ec;color:#1a2418}
h2{font-size:1.2em;margin-top:2em;border-bottom:1px solid #cdd6c2}h3{font:12px ui-monospace,Menlo,monospace;color:#6b7568;margin:1.1em 0 .2em}
p.l{margin:.25em 0 .25em 1em}b{font-weight:normal;padding:0 3px;border-radius:2px}
.turned{background:#bfe0a8}.left{background:#f4c1b4}.other{background:#f6e3a1}nav a{margin-right:.7em}
.key b{margin:0 .2em}</style>
<h1>Elisions: ${counts.turned} apostrophes turned in ${counts.changed} bookshelf entries</h1>
<p>${counts.entries} bookshelf entries read. Every line holding a mark the pass weighed, as it will read:</p>
<p class="key"><b class="turned">’</b> turned from ‘ — <b class="left">‘</b> weighed and left, a closing mark following it in its paragraph — <b class="other">‘</b> every other opening mark in the line, for a missed one to show.</p>
<p>${counts.lines} lines in ${byFile.length} entries, ${counts.left} marks left. A clip that is no word of its own always turns (‘tis, ‘scape, ‘mongst); a clip that is also a word (‘is, ‘and, ‘old, ‘t) and a dropped h (‘orse) turn only where no closing mark follows in the paragraph.</p>
<nav>${[...authors].map(([a, n]) => `<a href="#${esc(a)}">${esc(a)} (${n})</a>`).join("")}</nav>
${byFile.map(({ file, lines }, k) => {
  const a = where(file).split("/")[0], first = k === 0 || where(byFile[k - 1].file).split("/")[0] !== a;
  return (first ? `<h2 id="${esc(a)}">${esc(a)}</h2>` : "") + `<h3>${esc(where(file))}</h3>` + lines.map((l) => `<p class="l">${l}</p>`).join("");
}).join("")}`);
console.log(`${counts.entries} bookshelf entries read; ${counts.turned} apostrophes turned in ${counts.changed} entries, ${counts.left} left; written to ${OUT}, the review beside it`);
