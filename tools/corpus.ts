/* The whole-corpus round trip: every .md file in an export folder parsed,
   serialized, parsed again. The questions per file, in order of weight:
     1. FIXED POINT — serialize(parse(out)) === out, byte for byte. A grammar
        whose output it cannot read back stably loses data at every save.
     2. ROUND TRIP — out ~ src under the normalization a round trip needs
        (measured: blank-line and trailing-newline counts, and a www. link
        target gaining https://).
     3. NO FILE MADE WORSE — the literal asterisks in the parsed text of out
        do not outnumber those in the parsed text of src (a text-stable loss
        is invisible to a byte diff).
   Usage: node tools/corpus.ts [dir] [--limit N] [--only substring] [--report file]
   The report lists every file that fails any question, with the first
   differing lines; the summary counts failures by question. Read-only. */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { parseMarkdown, visibleText } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
const dir = args.find((a, i) => !a.startsWith("--") && (i === 0 || !args[i - 1].startsWith("--")))
  ?? join(process.env.HOME!, "Library/CloudStorage/Dropbox/gesta-backups/current");
const limit = flag("--limit") ? +flag("--limit")! : Infinity;
const only = flag("--only");
const reportPath = flag("--report") ?? join(dirname(new URL(import.meta.url).pathname), "out", "corpus-report.txt");

function* walk(d: string): Generator<string> {
  for (const name of readdirSync(d).sort()) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (name.endsWith(".md")) yield p;
  }
}

function norm(s: string): string {
  return s.replace(/\r\n?/g, "\n").replace(/^\n+/, "").replace(/\n+$/, "").replace(/\n{3,}/g, "\n\n")
    .replace(/\]\(www\./g, "](https://www.");
}
const stars = (s: string): number => (s.match(/\*/g) || []).length;
const sameLine = (x: string | undefined, y: string | undefined): boolean => x !== undefined && x === y;
/* resync on the next line both share, so one insertion does not report every line after it */
function resynced(la: string[], lb: string[], i: number, j: number): [number, number] {
  for (let k = 1; k < 6; k++) {
    if (sameLine(la[i + k], lb[j])) return [i + k, j];
    if (sameLine(lb[j + k], la[i])) return [i, j + k];
    if (sameLine(la[i + k], lb[j + k])) return [i + k, j + k];
  }
  return [i + 1, j + 1];
}
/* the first few places two texts part, as "line N: a | b" */
function firstDiffs(a: string, b: string, max = 3): string[] {
  const la = a.split("\n"), lb = b.split("\n");
  const out: string[] = [];
  let i = 0, j = 0;
  const more = (): boolean => (i < la.length || j < lb.length) && out.length < max;
  while (more()) {
    if (la[i] === lb[j]) { i++; j++; continue; }
    out.push(`  line ${i + 1}: ${JSON.stringify(la[i] ?? "<end>")}\n  became: ${JSON.stringify(lb[j] ?? "<end>")}`);
    [i, j] = resynced(la, lb, i, j);
  }
  return out;
}
function commonPrefix(a: string, b: string): number {
  const same = (k: number): boolean => k < a.length && k < b.length && a[k] === b[k];
  let k = 0;
  while (same(k)) k++;
  return k;
}
function firstTextDiff(a: string, b: string): string {
  const k = commonPrefix(a, b);
  const from = Math.max(0, k - 30);
  return `  at ${k}: ${JSON.stringify(a.slice(from, k + 40))}\n  read as: ${JSON.stringify(b.slice(from, k + 40))}`;
}

const counts = { files: 0, ok: 0, fixedPoint: 0, docChanged: 0, roundTrip: 0, stars: 0, threw: 0 };
const lines: string[] = [];
const t0 = Date.now();
for (const path of walk(dir)) {
  const rel = relative(dir, path);
  if (only && !rel.includes(only)) continue;
  if (counts.files >= limit) break;
  counts.files++;
  if (counts.files % 1000 === 0) console.error(`${counts.files} files, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  const src = readFileSync(path, "utf8");
  const bad: string[] = [];
  try {
    const doc = parseMarkdown(src);
    const out = serializeMarkdown(doc);
    const reread = parseMarkdown(out);
    const again = serializeMarkdown(reread);
    if (again !== out) { counts.fixedPoint++; bad.push("NOT A FIXED POINT", ...firstDiffs(out, again)); }
    /* the byte fixed point is necessary, not sufficient: an image whose
       path the parser cannot read back is literal text that serializes as
       itself for ever. The DOCUMENT must come back too. */
    if (!doc.eq(reread)) {
      counts.docChanged++;
      let k = 0;
      while (k < doc.childCount && k < reread.childCount && doc.child(k).eq(reread.child(k))) k++;
      const a = doc.maybeChild(k), b = reread.maybeChild(k);
      bad.push("DOCUMENT CHANGED AFTER ONE PASS", `  block ${k}: ${JSON.stringify(a ? a.toJSON() : null).slice(0, 200)}\n  became: ${JSON.stringify(b ? b.toJSON() : null).slice(0, 200)}`);
    }
    if (norm(src) !== norm(out)) { counts.roundTrip++; bad.push("ROUND TRIP DIFFERS", ...firstDiffs(norm(src), norm(out))); }
    const t1 = visibleText(doc), t2 = visibleText(parseMarkdown(out));
    if (stars(t2) > stars(t1)) { counts.stars++; bad.push(`ASTERISKS GREW ${stars(t1)} -> ${stars(t2)}`, firstTextDiff(t1, t2)); }
  } catch (e) {
    counts.threw++;
    bad.push("THREW " + ((e as Error).stack ?? String(e)).split("\n").slice(0, 3).join(" | "));
  }
  if (bad.length) lines.push(rel, ...bad, "");
  else counts.ok++;
}
const summary = [
  `corpus: ${dir}`,
  `files ${counts.files}, clean ${counts.ok}, not a fixed point ${counts.fixedPoint}, document changed ${counts.docChanged}, round trip differs ${counts.roundTrip}, asterisks grew ${counts.stars}, threw ${counts.threw}`,
  `${((Date.now() - t0) / 1000).toFixed(1)}s`,
];
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, summary.concat("", lines).join("\n"));
console.log(summary.join("\n"));
console.log(`report: ${reportPath}`);
