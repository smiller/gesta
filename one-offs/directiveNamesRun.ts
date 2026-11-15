/* node one-offs/directiveNamesRun.ts [backup-dir] [out-dir] — every entry
   in the backup read, its retired directive names given their new ones,
   the changed entries written under out-dir at their own paths for an
   import, a review page beside out-dir, the counts printed */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import { renamedDirectives, type Renamed } from "./directiveNames.ts";
import { referenceDirectives } from "../src/store/conventions.ts";

const HOME = process.env.HOME!;
const SRC = process.argv[2] ?? join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.argv[3] ?? join(HOME, "Desktop/gesta-imports/gesta-directive-names");
/* only a folder of this run's own naming is cleared before writing */
if (!/^gesta-directive-names/.test(basename(OUT))) throw new Error(`refusing to clear ${OUT}: name the folder gesta-directive-names…`);

const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : n.endsWith(".md") ? [p] : [];
});
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
/* the parser's reading of the new entry must hold every new name the text
   rename wrote, or the two disagree on where a top-level block is */
function checked(file: string, md: string, renamed: Renamed[]): void {
  const read = referenceDirectives(md).map((l) => l.trim());
  const missing = renamed.filter((r) => !read.includes(r.now));
  if (missing.length) throw new Error(`${file}: the parser reads no ${missing.map((r) => r.now).join(", ")}`);
}

rmSync(OUT, { recursive: true, force: true });
const changed: { file: string; renamed: Renamed[] }[] = [];
let entries = 0;
for (const path of walk(SRC).sort()) {
  entries++;
  const file = relative(SRC, path), r = renamedDirectives(readFileSync(path, "utf8"));
  if (!r.renamed.length) continue;
  checked(file, r.md, r.renamed);
  changed.push({ file, renamed: r.renamed });
  const to = join(OUT, file);
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, r.md);
}
const lines = changed.reduce((n, c) => n + c.renamed.length, 0);
const row = (c: { file: string; renamed: Renamed[] }): string =>
  `<tr><td>${esc(c.file)}</td><td>${c.renamed.map((r) => `${r.line}: <s>${esc(r.was)}</s> → <b>${esc(r.now)}</b>`).join("<br>")}</td></tr>`;
writeFileSync(OUT + "-review.html", `<!doctype html><meta charset="utf-8"><title>Directive names review</title><style>
body{font:15px/1.5 Georgia,serif;max-width:900px;margin:2em auto;padding:0 16px;background:#f4f7ec;color:#1a2418}
table{border-collapse:collapse;width:100%}td{padding:4px 8px;border-bottom:1px solid #cdd6c2;vertical-align:top}
td:first-child{font:13px ui-monospace,Menlo,monospace}s{color:#a33}b{color:#2f6b2f;font-weight:600}</style>
<h1>Directive names: ${lines} lines renamed in ${changed.length} entries</h1>
<p>${entries} entries read. Each line is a directive in an entry's top-level reference block, struck through as it stands and in bold as the import writes it; nothing else in the entry changes.</p>
<table>${changed.map(row).join("")}</table>`);
console.log(`${entries} entries read; ${lines} directive lines renamed in ${changed.length} entries, written to ${OUT}, the review beside it`);
