import { asAddress } from "../src/store/keys.ts";
/* node tools/speechMarksRun.ts [backup-dir] [out-dir] — the marks read in
   speechMarksRead.json set in their entries, the changed entries written
   under out-dir at their own paths for an import, a review page beside
   out-dir, the highlighted links into them checked, the counts printed */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import { speechMarks, type Reading } from "./speechMarks.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";
import { findHit } from "../src/editor/highlight.ts";
import { hashParts } from "../src/store/nav.ts";

const HOME = process.env.HOME!;
const SRC = process.argv[2] ?? join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.argv[3] ?? join(HOME, "Desktop/gesta-imports/gesta-speech-marks");
/* only a folder of this run's own naming is cleared before writing */
if (!/^gesta-speech-marks/.test(basename(OUT))) throw new Error(`refusing to clear ${OUT}: name the folder gesta-speech-marks…`);
const READ: Record<string, Reading[]> = JSON.parse(readFileSync(new URL("./speechMarksRead.json", import.meta.url), "utf8"));

const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : n.endsWith(".md") ? [p] : [];
});
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let marks = 0;
const byFile: { file: string; lines: string[] }[] = [];
for (const file of Object.keys(READ).sort()) {
  const md = readFileSync(join(SRC, file), "utf8");
  const set = speechMarks(md, READ[file]);
  marks += set.marks.length;
  const doc = parseMarkdown(set.out);
  if (serializeMarkdown(parseMarkdown(serializeMarkdown(doc))) !== serializeMarkdown(doc)) throw new Error(`${file}: not a fixed point`);
  mkdirSync(dirname(join(OUT, file)), { recursive: true });
  writeFileSync(join(OUT, file), set.out);
  /* each line holding a mark, as it will read, the marks coloured */
  const at = new Set(set.marks), lines: string[] = [];
  let from = 0;
  for (const l of set.out.split("\n")) {
    const to = from + l.length;
    if (set.marks.some((m) => m >= from && m < to)) {
      let html = "";
      for (let i = from; i < to; i++) html += at.has(i) ? `<b>${esc(set.out[i])}</b>` : esc(set.out[i]);
      lines.push(html);
    }
    from = to + 1;
  }
  byFile.push({ file, lines });
}

/* every highlighted link into a changed entry, found before, found after */
let found = 0, kept = 0;
const lost: string[] = [];
for (const f of walk(SRC)) {
  for (const m of readFileSync(f, "utf8").matchAll(/\]\((#bookshelf\/[^)\s]+\?h=[^)\s]+)\)/g)) {
    const h = hashParts(asAddress(m[1]));
    const key = h.date + "/" + h.tag + ".md";
    if (!h.hl?.q || !READ[key]) continue;
    if (!findHit(parseMarkdown(readFileSync(join(SRC, key), "utf8")), h.hl.q, h.hl.nth || 0, false)) continue;
    found++;
    if (findHit(parseMarkdown(readFileSync(join(OUT, key), "utf8")), h.hl.q, h.hl.nth || 0, false)) kept++;
    else lost.push(`${relative(SRC, f)} → ${h.tag}: “${h.hl.q}”`);
  }
}

writeFileSync(OUT + "-review.html", `<!doctype html><meta charset="utf-8"><title>Speech marks review</title><style>
body{font:15px/1.5 Georgia,serif;max-width:1100px;margin:2em auto;padding:0 16px;background:#f4f7ec;color:#1a2418}
h3{font:12px ui-monospace,Menlo,monospace;color:#6b7568;margin:1.4em 0 .2em}
p.l{margin:.25em 0 .25em 1em;white-space:pre-wrap}b{font-weight:normal;padding:0 3px;border-radius:2px;background:#b9d4f2}.lost{color:#a4321c}</style>
<h1>Speech marks: ${marks} marks set in ${byFile.length} bookshelf entries</h1>
<p>A speech in single marks where its book speaks in doubles, made double; Tarquin’s words inside Lucrece’s, made double; a mark doubled by a slip. Every line holding a mark set, as it will read, the marks coloured.</p>
<p>Highlighted links into the changed entries: ${found} found before, ${kept} found after.${lost.length ? " Lost:" : ""}</p>
${lost.map((l) => `<p class="lost">${esc(l)}</p>`).join("")}
${byFile.map(({ file, lines }) => `<h3>${esc(file.replace(/^bookshelf\//, "").replace(/\.md$/, ""))}</h3>` + lines.map((l) => `<p class="l">${l}</p>`).join("")).join("")}`);
console.log(`${marks} marks set in ${byFile.length} entries; written to ${OUT}, the review beside it`);
console.log(`links into changed entries: ${found} found before, ${kept} after${lost.length ? "; lost:\n" + lost.join("\n") : ""}`);
