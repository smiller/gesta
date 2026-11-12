/* node tools/miltonPsalmsRun.ts — Milton's Psalms I–VIII and LXXX–LXXXVIII
   as the Oxford edition prints them (tools/miltonPsalms.txt, set from its
   pages), a page a psalm under Milton, John/Psalms, each line checked
   against Beeching's text (cached under one-offs/out/harvard) for a slip in the
   setting; written under OUT (default ~/Desktop/gesta-imports/gesta-milton-psalms)
   for an import, a review page beside it */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { letters, similar } from "./harvardMilton.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";
import { lineUnits } from "../src/editor/numbering.ts";

const HOME = process.env.HOME!;
const BACKUP = join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.env.OUT ?? join(HOME, "Desktop/gesta-imports/gesta-milton-psalms");
const AUTHOR = "bookshelf/Milton, John";
const SOURCE = readFileSync(new URL("miltonPsalms.txt", import.meta.url), "utf8");
const BEECHING = readFileSync(new URL("out/harvard/pg1745.txt", import.meta.url), "utf8").replace(/\r\n/g, "\n").split("\n")
  .map((l) => l.replace(/^\s*\d+\s+/, "").trim().replace(/\s{4,}\S.*$/, "").replace(/\*/g, "").trim());
/* each psalm's count of lines, as Beeching's margin and the Oxford edition's run */
const LINES: Record<string, number> = { 1: 16, 2: 28, 3: 24, 4: 42, 5: 40, 6: 24, 7: 64, 8: 24, 80: 80, 81: 68, 82: 28, 83: 68, 84: 48, 85: 56, 86: 64, 87: 28, 88: 72 };
const HEADNOTE = "April, 1648.—J.M. Nine of the Psalms done into Metre; wherein all, but what is in a different character, are the very words of the Text, translated from the original.";
const NOTE = "Text: *The English Poems of John Milton*, from the edition of H. C. Beeching, The World’s Classics (London, 1960).";

interface Psalm { n: string; heading: string; front?: string; rows: string[]; notes: string[] }
const psalms: Psalm[] = [];
for (const block of SOURCE.split(/^= /m).slice(1)) {
  const [head, ...body] = block.replace(/\n+$/, "").split("\n");
  const [n, heading, front] = head.split(" | ").map((s) => s.trim());
  psalms.push({ n, heading, front, rows: body.filter((l) => !/^\[\d+\] /.test(l)), notes: body.filter((l) => /^\[\d+\] /.test(l)) });
}

/* a verse's number an italic row above it, a gap before (asked: the
   edition's numerals as italic rows); a number inside a line kept there */
/* a line wholly in Milton's italics declared a line, never a direction */
const rowsOf = (p: Psalm): string[] => p.rows.flatMap((r, i) => (/^#\d+$/.test(r) ? [...(i ? [""] : []), `*${r.slice(1)}*`] : /^\*[^*]+\*$/.test(r) ? [`⟨line⟩${r}`] : [r]));
const entries: Record<string, string> = {};
const report: string[] = [], slips: string[] = [];
for (const p of psalms) {
  const md = `# ${p.heading}\n\n` + [p.front, +p.n >= 80 ? HEADNOTE : undefined, NOTE].filter(Boolean).map((n) => `::: note\n${n}\n:::\n\n`).join("") +
    `::: verse\n${rowsOf(p).join("\n")}\n:::` + p.notes.map((n) => `\n\n::: note\n${n}\n:::`).join("");
  const doc = parseMarkdown(md);
  if (serializeMarkdown(doc) !== md) throw new Error(`${p.heading}: does not survive its round trip`);
  const lines = lineUnits(doc, 0).filter((u) => u.line && u.kind === "line");
  if (lines.length !== LINES[p.n]) throw new Error(`${p.heading}: ${lines.length} lines, not ${LINES[p.n]}`);
  const marks = [...new Set(md.match(/[¹²³⁴⁵⁶⁷⁸⁹]/g) ?? [])].length;
  if (marks !== p.notes.length) throw new Error(`${p.heading}: ${marks} note marks, ${p.notes.length} notes`);
  /* each line against the line in Beeching most like it near where the last was found */
  const text = lines.map((u) => u.node.textContent.replace(/[¹²³⁴⁵⁶⁷⁸⁹]/g, ""));
  let at = BEECHING.findIndex((l) => similar(letters(l), letters(text[0])) > 0.7);
  if (at < 0) throw new Error(`${p.heading}: not found in Beeching`);
  text.forEach((t, i) => {
    let best = 0, bi = at;
    for (let k = at; k < at + 6 && k < BEECHING.length; k++) { const s = similar(letters(BEECHING[k]), letters(t)); if (s > best) { best = s; bi = k; } }
    if (best < 0.8) slips.push(`${p.heading} ${i + 1}: ${t} | Beeching: ${BEECHING[bi]} (${best.toFixed(2)})`);
    if (best >= 0.5) at = bi + 1;
  });
  entries[`${AUTHOR}/Psalms/${p.n}.md`] = md;
  report.push(`<h2>${p.heading}</h2><pre>${md.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`);
}
const href = (path: string): string => "#" + path.split("/").map(encodeURIComponent).join("/");
entries[`${AUTHOR}/Psalms.md`] = `# Psalms\n\n::: note\n${NOTE}\n:::\n\n` + psalms.map((p) => `- [${p.heading}](${href(`${AUTHOR}/Psalms/${p.n}`)})`).join("\n") +
  /* the two psalms the bookshelf has already, among the shorter poems */
  ["A Paraphrase on Psalm CXIV", "Psalm CXXXVI"].map((t) => `\n- [${t}](${href(`${AUTHOR}/${t}`)})`).join("");

if (process.env.SLIPS) console.log(slips.join("\n"));
/* a page the backup has is replaced only as this folder last wrote it:
   one edited since in Gesta would be lost */
const had = Object.keys(entries).filter((f) => existsSync(join(BACKUP, f)));
const edited = had.filter((f) => !existsSync(join(OUT, f)) || readFileSync(join(BACKUP, f), "utf8") !== readFileSync(join(OUT, f), "utf8"));
if (edited.length) throw new Error("the backup has these, changed since this folder wrote them: " + edited.join(", "));
const IMPORTS = join(HOME, "Desktop/gesta-imports") + "/";
if (!resolve(OUT).startsWith(IMPORTS)) throw new Error(`the folder is emptied before it is written, so it must be inside ${IMPORTS}: ${OUT}`);
rmSync(OUT, { recursive: true, force: true });
for (const [path, md] of Object.entries(entries)) {
  mkdirSync(dirname(join(OUT, path)), { recursive: true });
  writeFileSync(join(OUT, path), md);
}
writeFileSync(join(dirname(OUT), basename(OUT) + ".html"), `<!doctype html><meta charset="utf-8"><title>Milton's Psalms</title>
<style>body{font:16px/1.45 Georgia,serif;margin:2em auto;max-width:64em;padding:0 1em}pre{white-space:pre-wrap;font:15px/1.4 Georgia,serif;background:#f6f6f0;padding:1em}</style>
<h1>Milton's Psalms</h1>
<p>Seventeen pages under <code>Milton, John/Psalms</code>, a contents page above them, each psalm referred to as <code>[Milton, *Psalms*, 80.1-8]</code>, set from the Oxford edition's pages: its words, marks and italics (in Psalms LXXX–LXXXVIII Milton's own: what is not in the Hebrew), its notes giving the Hebrew, numbered through each psalm; the verse numbers italic rows above their verses. Each line checked against Beeching's original-spelling text for a slip in the setting: ${slips.length} lines differ more than spelling would explain, listed below.</p>
<ul>${slips.map((s) => `<li>${s.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</li>`).join("")}</ul>
${report.join("\n")}`);
console.log(`${Object.keys(entries).length} pages; ${psalms.reduce((n, p) => n + LINES[p.n], 0)} lines; ${slips.length} lines unlike Beeching's`);
console.log(`written to ${OUT}`);
