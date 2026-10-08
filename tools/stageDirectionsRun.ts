/* node tools/stageDirectionsRun.ts [out-dir] — the fourteen plays read from
   the backup, the changed entries written under out-dir/bookshelf/… for an
   import, a before-and-after page beside out-dir, the counts printed */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fixPlay, type Change, type Left } from "./stageDirections.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";
import { whollyIn } from "../src/editor/numbering.ts";
import { schema } from "../src/model/schema.ts";

const HOME = process.env.HOME!;
const SRC = join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current/bookshelf");
const OUT = process.argv[2] ?? join(HOME, "Desktop/gesta-stage-directions");
const PLAYS: { author: string; books: string[]; capitals: boolean; join: (book: string) => boolean }[] = [
  { author: "Tey, Josephine", capitals: true, join: () => false, books: ["Cornelia", "Dickon", "Lady Charing Is Cross", "Patria", "Reckoning", "Richard of Bordeaux", "Sweet Coz", "The Little Dry Thorn", "The Pomp of Mr Pomfret", "Valerius"] },
  { author: "Williams, Charles", capitals: false, join: (b) => b === "The House of the Octopus", books: ["A Myth of Shakespeare", "Judgement at Chelmsford", "The House of the Octopus", "Thomas Cranmer of Canterbury"] },
];

/* READ, each, in the review of the first run: words the source left
   roman by a slip, or a shout, or a stress, not a name — put back */
const CORRECT: { book: string; from: string; to: string }[] = [
  { book: "Dickon", from: "QUEEN COMES IN, FOLLOWED BY THE PRINCESS ELIZABETH", to: "QUEEN comes in, followed by the PRINCESS ELIZABETH" },
  { book: "The Little Dry Thorn", from: "“to ME”; nor even “ever SPOKEN”", to: "“to me”; nor even “ever spoken”" },
  { book: "Valerius", from: ": THE EAGLES!  THE EAGLES!]", to: ": The Eagles!  The Eagles!]" },
];
/* directions the rule leaves, each READ and decided: a title or a
   connective set roman inside the italics, a name in lower case — made
   one italic run all the same; a spoken row with its direction roman gets
   only its missing ] */
const FORCE: { book: string; starts: string; names?: string[]; close?: true }[] = [
  { book: "Judgement at Chelmsford", starts: "> [*He begins to sing* Onward, Christian Soldiers" },
  { book: "Judgement at Chelmsford", starts: "[*The* CHORUS *without begins the* Dies irae" },
  { book: "Thomas Cranmer of Canterbury", starts: "> [*They come between the* KING and CRANMER" },
  { book: "Thomas Cranmer of Canterbury", starts: "> [*They fetch* CRANMER *to the centre of the stage.  The* bishop", names: ["bishop"] },
  { book: "A Myth of Shakespeare", starts: "[Kisses him *Thy lips are warm!*", close: true },
];
function force(md: string, book: string): string {
  return md.split("\n").map((line) => {
    const f = FORCE.find((x) => x.book === book && line.startsWith(x.starts));
    if (!f) return line;
    if (f.close) return line.replace("[Kisses him *", "[Kisses him] *");
    const prefix = /^((?:>\s?)*)/.exec(line)![1];
    let plain = line.slice(prefix.length).replace(/\*/g, "").replace(/^\s*\[/, "").replace(/\]\s*$/, "").trim();
    for (const n of f.names ?? []) plain = plain.replace(new RegExp(`\\b${n}\\b`), n.toUpperCase());
    return prefix + "*[" + plain + "]*";
  }).join("\n");
}

/* direction rows a verse block counts as lines */
function countedDirections(md: string): number {
  let n = 0;
  parseMarkdown(md).descendants((node) => {
    if (node.type.name !== "line") return true;
    if (/^\[/.test(node.textContent.trim()) && !whollyIn(node, schema.marks.em)) n++;
    return false;
  });
  return n;
}
/* the words of a line, case, marks, brackets and spacing aside */
const words = (s: string): string => s.replace(/[*[\]\s]/g, "").replace(/“s/g, "’s").toLowerCase();

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
rmSync(OUT, { recursive: true, force: true });
let html = "";
const totals = { files: 0, changed: 0, lines: 0, left: 0 };
for (const p of PLAYS) for (const book of p.books) {
  const dir = join(SRC, p.author, book);
  let changedFiles = 0, lines = 0, joined = 0, counted0 = 0, counted1 = 0;
  const lefts: { file: string; l: Left }[] = [], shown: { file: string; c: Change }[] = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".md")).sort()) {
    totals.files++;
    const md = readFileSync(join(dir, f), "utf8");
    const r = fixPlay(md, { capitals: p.capitals, join: p.join(book) });
    const forced = force(r.md, book);
    if (forced !== r.md) for (const [k, l] of forced.split("\n").entries()) if (l !== r.md.split("\n")[k]) { r.changes.push({ line: k + 1, before: md.split("\n")[k], after: l }); r.left = r.left.filter((x) => x.line !== k + 1); }
    r.md = forced;
    for (const c of CORRECT.filter((x) => x.book === book && r.md.includes(x.from))) {
      r.md = r.md.replace(c.from, c.to);
      for (const ch of r.changes) if (ch.after.includes(c.from)) ch.after = ch.after.replace(c.from, c.to);
    }
    for (const l of r.left) lefts.push({ file: f, l });
    if (r.md === md) continue;
    /* nothing but the directions' marks moved */
    const joinedRows = new Set(r.changes.filter((c) => c.after === "(joined to the line above)").map((c) => c.line));
    for (const c of r.changes) {
      if (joinedRows.has(c.line)) { joined++; continue; }
      const before = [c.before, ...[...joinedRows].filter((k) => k > c.line && k <= c.line + 4).map((k) => md.split("\n")[k - 1])].join(" ");
      if (words(before) !== words(c.after) && words(c.before) !== words(c.after)) throw new Error(`${book}/${f}:${c.line} words changed:\n  ${c.before}\n  ${c.after}`);
      lines++; shown.push({ file: f, c });
    }
    const doc = parseMarkdown(r.md);
    if (serializeMarkdown(parseMarkdown(serializeMarkdown(doc))) !== serializeMarkdown(doc)) throw new Error(`${book}/${f}: not a fixed point`);
    counted0 += countedDirections(md); counted1 += countedDirections(r.md);
    changedFiles++;
    const to = join(OUT, "bookshelf", p.author, book, f);
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, r.md);
  }
  totals.changed += changedFiles; totals.lines += lines; totals.left += lefts.length;
  console.log(`${book.padEnd(30)} entries changed ${String(changedFiles).padStart(3)}  directions rewritten ${String(lines).padStart(4)}  rows joined ${String(joined).padStart(3)}  left ${String(lefts.length).padStart(2)}  direction rows counted as lines ${counted0} → ${counted1}`);
  html += `<h2>${esc(p.author)} — ${esc(book)}</h2>`;
  if (lefts.length) html += `<h3>Left as they are (${lefts.length})</h3>` + lefts.map(({ file, l }) => `<p class="left"><span>${esc(file)}:${l.line} — ${esc(l.why)}</span><br>${esc(l.text)}</p>`).join("");
  html += shown.map(({ file, c }) => `<p><span>${esc(file)}:${c.line}</span><br><del>${esc(c.before)}</del><br><ins>${esc(c.after)}</ins></p>`).join("");
}
writeFileSync(OUT + "-review.html", `<!doctype html><meta charset="utf-8"><title>Stage directions review</title><style>
body{font:15px/1.5 Georgia,serif;max-width:900px;margin:2em auto;padding:0 16px;background:#f4f7ec;color:#1a2418}
h2{font-size:1.2em;margin-top:2em;border-bottom:1px solid #cdd6c2}h3{font-size:1em;color:#8a3b2a}
p{margin:.6em 0}span{font:12px ui-monospace,Menlo,monospace;color:#6b7568}del{color:#8a3b2a;text-decoration:none}ins{color:#1f5a2b;text-decoration:none;font-weight:600}
.left{background:#fbeee8;padding:4px 8px}</style><h1>Stage directions: ${totals.lines} rewritten, ${totals.left} left</h1>
<p>Red is the line as it stands; green is the line as the import would make it. The rows left as they are come first under each play.</p>${html}`);
console.log(`\n${totals.files} entries read, ${totals.changed} changed, ${totals.lines} directions rewritten, ${totals.left} left; written to ${OUT}, the review beside it`);
