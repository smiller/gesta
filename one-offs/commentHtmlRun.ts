/* node one-offs/commentHtmlRun.ts [backup-dir] [out-dir] — the chapter comment
   pasted as HTML in 2024-04-01 made markdown, the entry written under
   out-dir for an import, a preview page beside out-dir */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { commentMarkdown } from "./commentHtml.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

const HOME = process.env.HOME!;
const SRC = process.argv[2] ?? join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.argv[3] ?? join(HOME, "Desktop/gesta-imports/gesta-comment-html");
/* only a folder of this run's own naming is cleared before writing */
if (!/^gesta-comment-html/.test(basename(OUT))) throw new Error(`refusing to clear ${OUT}: name the folder gesta-comment-html…`);
const FILE = "journal/2024/2024-04-01.md";

/* slips set right by hand, in the HTML before it is read */
const CORRECT: { from: string; to: string }[] = [{ from: "visitor was Matt&gt;<br />", to: "visitor was Matt<br />" }];
let md = readFileSync(join(SRC, FILE), "utf8");
for (const c of CORRECT) { if (!md.includes(c.from)) throw new Error(`no “${c.from}” to set right`); md = md.replace(c.from, c.to); }
const lines = md.split("\n");
const from = lines.findIndex((l) => l.startsWith("<p>"));
const { text, entries } = commentMarkdown(lines.slice(from).join("\n"));
/* a reply that quotes: the dash alone, the quotation beneath it */
const SHAPE: { from: RegExp; to: string }[] = [{
  from: /–\s+DOCTOR: I can explain\. Tell them why I had to\.\nAMY: You want to be forgiven\.\nDOCTOR: Don’t we all\?/u,
  to: "–\n\n> DOCTOR: I can explain. Tell them why I had to.\n> AMY: You want to be forgiven.\n> DOCTOR: Don’t we all?",
}];
let shaped = text;
for (const x of SHAPE) { if (!x.from.test(shaped)) throw new Error(`no “${x.from}” to shape`); shaped = shaped.replace(x.from, x.to); }
const out = [...lines.slice(0, from), shaped, ""].join("\n");

/* the words alone: tags, marks, quote marks' curl and spacing aside, the stray [I, and a reply's hyphen read as its dash */
const words = (s: string): string => s.replace(/[‘’]/g, "'").replace(/[“”]/g, "\"").replace(/\s+/g, "");
const before = lines.slice(0, from).join("\n") + "\n" + lines.slice(from).join("\n").replace(/<[^>]+>/g, "\n").replace(/^\s*>\s?/gm, "").replace(/\[I–/, "–").replace(/^(\s*)-(?=\s)/gm, "$1–")
  .replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&");
const was = words(parseMarkdown(before).textContent), now = words(parseMarkdown(out).textContent);
if (was !== now) { let i = 0; while (was[i] === now[i]) i++; throw new Error(`words differ at ${i}:\n  ${was.slice(i - 40, i + 40)}\n  ${now.slice(i - 40, i + 40)}`); }
const doc = parseMarkdown(out);
if (serializeMarkdown(parseMarkdown(serializeMarkdown(doc))) !== serializeMarkdown(doc)) throw new Error("not a fixed point");
if (/<\/?(?:p|i|br|blockquote)\b/.test(text)) throw new Error("a tag is left");

rmSync(OUT, { recursive: true, force: true });
mkdirSync(dirname(join(OUT, FILE)), { recursive: true });
writeFileSync(join(OUT, FILE), out);

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const inline = (l: string): string => esc(l).replace(/\*([^*]+)\*/g, "<em>$1</em>");
/* a paragraph's lines one under another; a run of quoted lines one quotation, as the editor draws it */
const render = (m: string): string => m.split("\n").every((l) => l.startsWith("> ")) ? `<blockquote>${m.split("\n").map((l) => inline(l.slice(2))).join("<br>")}</blockquote>` : m.split("\n").map(inline).join("<br>");
writeFileSync(OUT + "-preview.html", `<!doctype html><meta charset="utf-8"><title>Comment preview</title><style>
:root{--bg:#f6f4ee;--fg:#1f1f1f;--mut:#777;--line:#dcd8cc;--card:#fff;--src:#8a3b2a;--md:#1f5a2b}
@media (prefers-color-scheme:dark){:root{--bg:#1b1b1d;--fg:#e6e6e6;--mut:#999;--line:#3a3a3e;--card:#242427;--src:#e59a87;--md:#7fcf83}}
body{font:16px/1.5 Georgia,serif;max-width:1200px;margin:2em auto;padding:0 16px;background:var(--bg);color:var(--fg)}
.row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;border-top:1px solid var(--line);padding:.6em 0}
@media (max-width:800px){.row{grid-template-columns:1fr}}
pre{margin:0;white-space:pre-wrap;word-break:break-word;font:12px/1.45 ui-monospace,Menlo,monospace}.src{color:var(--src)}.md{color:var(--md)}
.head{font:12px ui-monospace,Menlo,monospace;color:var(--mut)}blockquote{margin:0 0 1em;border-left:3px solid var(--line);padding-left:.8em;color:var(--mut)}
.whole{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:1em 1.4em;margin:1em 0 2em}.whole p{margin:0 0 1em}</style>
<h1>2024-04-01: the chapter comment as markdown</h1>
<p>${entries.length} entries, from the HTML on line ${from + 1} to the end. Everything above it is unchanged. Every word reads the same as before, marks and the curl of quotes aside, but for the slips set right by hand: ${CORRECT.map((c) => esc(c.from) + " → " + esc(c.to)).join(", ")}. Read it whole first; each entry's HTML and markdown follow.</p>
<h2>As it will read</h2><div class="whole">${shaped.split("\n\n").map((p) => p.startsWith("> ") ? render(p) : `<p>${render(p)}</p>`).join("")}</div>
<h2>Entry by entry</h2><div class="row head"><div>the HTML as stored</div><div>the markdown that replaces it</div><div>as it will read</div></div>
${entries.map((e) => { const m = SHAPE.reduce((t, x) => t.replace(x.from, x.to), e.md); return `<div class="row"><pre class="src">${esc(e.html)}</pre><pre class="md">${esc(m)}</pre><div>${m.split("\n\n").map(render).join("")}</div></div>`; }).join("")}`);
console.log(`${entries.length} entries made markdown in ${FILE}, from line ${from + 1}; written to ${OUT}, the preview beside it`);
