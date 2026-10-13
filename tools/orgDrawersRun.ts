/* node tools/orgDrawersRun.ts [backup-dir] [out-dir] — every entry in the
   backup read, an old `[[#anchor][label]]` link made a link to the place
   its anchor's property drawer marks, then every property drawer cleared;
   the changed entries written under out-dir at their own paths for an
   import, a review page beside out-dir, the counts printed */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import { referOrgLinks, anchoredParagraph, clearDrawers, type OrgLink, type Resolved, type Referred } from "./orgReferences.ts";
import { shelfIndex, quotedProse } from "./bookshelfQuotes.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";
import { importTarget } from "../src/store/names.ts";
import { entryKey } from "../src/store/keys.ts";
import { entryLinkUrl } from "../src/editor/reference.ts";

const HOME = process.env.HOME!;
const SRC = process.argv[2] ?? join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.argv[3] ?? join(HOME, "Desktop/gesta-imports/gesta-org-drawers");
/* only a folder of this run's own naming is cleared before writing */
if (!/^gesta-org-drawers/.test(basename(OUT))) throw new Error(`refusing to clear ${OUT}: name the folder gesta-org-drawers…`);

const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : n.endsWith(".md") ? [p] : [];
});
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const words = (md: string): string => parseMarkdown(md).textContent.replace(/\s+/g, "");
const cache: Record<string, string> = Object.create(null);
for (const path of walk(SRC)) { const t = importTarget(relative(SRC, path)); if (t) cache[entryKey(t.date, t.tag)] = readFileSync(path, "utf8"); }
/* a markdown line as the words it reads as: a link its label */
const plain = (l: string): string => l.replace(/\[\[[^\]]*\]\[([^\]]*)\]\]/g, "$1").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
/* an anchor link pointed at the place its drawer marks, in the texts given */
const resolver = (texts: Record<string, string>) => {
  const index = shelfIndex(texts);
  const holder = (anchor: string): string | undefined =>
    Object.keys(texts).find((k) => texts[k].split("\n").some((l) => l.replace(/^\s*(?:>\s*)*/, "").trim() === `:CUSTOM_ID: ${anchor}`));
  return (l: OrgLink): Resolved => {
    const anchor = /^#(.+)$/.exec(l.target)?.[1];
    const k = anchor ? holder(anchor) : undefined;
    if (!k) return { why: "-" };
    const para = anchoredParagraph(texts[k], anchor!);
    const lit = para && para.length ? quotedProse(index, k, para.map(plain), [k]) : null;
    const [d, ...t] = k.split("/");
    return { href: lit ? lit.url : entryLinkUrl(d, t.join("/")) };
  };
};
/* highlights read against the entries as this run leaves them: a paragraph
   holding an old link reads differently once the link is made */
const first = resolver(cache);
const linkedTexts = Object.fromEntries(Object.entries(cache).map(([k, md]) => [k, referOrgLinks(md, first).md]));
const resolve = resolver(linkedTexts);

rmSync(OUT, { recursive: true, force: true });
const counts = { entries: 0, changed: 0, links: 0, drawers: 0 };
const linked: { file: string; l: Referred }[] = [], cleared: { file: string; before: string[]; after: string[] }[] = [];
for (const path of walk(SRC).sort()) {
  counts.entries++;
  const md = readFileSync(path, "utf8"), file = relative(SRC, path);
  const r = referOrgLinks(md, resolve);
  for (const l of r.links) if (!("why" in l.res)) { counts.links++; linked.push({ file, l }); }
  const c = clearDrawers(r.md);
  if (c.md === md) continue;
  /* nothing but the drawers' own words may go */
  const gone = c.anchors.map((a) => ":PROPERTIES::CUSTOM_ID:" + a + ":END:").join("");
  if (words(c.md).length + gone.replace(/\s+/g, "").length !== words(r.md).length) throw new Error(`${file}: more than the drawers would go`);
  const doc = parseMarkdown(c.md);
  if (serializeMarkdown(parseMarkdown(serializeMarkdown(doc))) !== serializeMarkdown(doc)) throw new Error(`${file}: not a fixed point`);
  /* each drawer shown with the lines around it, before and after */
  const src = r.md.split("\n");
  src.forEach((line, i) => {
    if (line.replace(/^\s*(?:>\s*)*/, "").trim() !== ":PROPERTIES:") return;
    const before = src.slice(Math.max(0, i - 2), i + 6);
    cleared.push({ file: `${file}:${i + 1}`, before, after: clearDrawers(before.join("\n")).md.split("\n") });
    counts.drawers++;
  });
  counts.changed++;
  const to = join(OUT, file);
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, c.md);
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
const pair = (b: string[], a: string[]): string => `<pre class="before">${esc(b.join("\n"))}</pre><pre class="after">${esc(a.join("\n"))}</pre>`;
writeFileSync(OUT + "-review.html", `<!doctype html><meta charset="utf-8"><title>Org drawers review</title><style>
body{font:15px/1.5 Georgia,serif;max-width:1100px;margin:2em auto;padding:0 16px;background:#f4f7ec;color:#1a2418}
h2{font-size:1.2em;margin-top:2em;border-bottom:1px solid #cdd6c2}
.e{margin:1.4em 0}.e>span{font:12px ui-monospace,Menlo,monospace;color:#6b7568}
pre{white-space:pre-wrap;font:13px/1.45 ui-monospace,Menlo,monospace;margin:.3em 0;padding:6px 8px}
.before{background:#fbeee8}.after{background:#e6f0dc}</style>
<h1>Org drawers: ${counts.drawers} cleared and ${counts.links} links to them made links, in ${counts.changed} entries</h1>
<p>${counts.entries} entries read. An old <code>[[#anchor][label]]</code> link points where its anchor's property drawer stood: under a <code>##</code> section, its first quotation highlighted (else its first paragraph); with no section above, the entry itself. Then every <code>:PROPERTIES:</code> … <code>:END:</code> drawer is cleared, with the blank line after it. Red is the text as it stands, green what the import would make.</p>
<h2>Links to an anchor's place (${linked.length})</h2>
${linked.map(({ file, l }) => `<div class="e"><span>${esc(file)}:${l.line} — ${esc(l.target)}</span>${pair(l.before, l.after)}</div>`).join("")}
<h2>Drawers cleared (${cleared.length})</h2>
${cleared.map(({ file, before, after }) => `<div class="e"><span>${esc(file)}</span>${pair(before, after)}</div>`).join("")}`);
console.log(`${counts.entries} entries read; ${counts.links} links made, ${counts.drawers} drawers cleared, in ${counts.changed} entries; written to ${OUT}, the review beside it`);
