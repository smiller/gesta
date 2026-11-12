/* node one-offs/orgReferencesRun.ts [backup-dir] [out-dir] — every entry in the
   backup read, its old `[[target][label]]` links made the links their
   targets now are, the changed entries written under out-dir at their own
   paths for an import, a review page beside out-dir, the counts printed */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import { referOrgLinks, anchoredParagraph, type OrgLink, type Resolved, type Referred } from "./orgReferences.ts";
import { shelfIndex, quotedFrom, quotedProse, referenceAt } from "./bookshelfQuotes.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";
import { importTarget } from "../src/store/names.ts";
import { entryKey } from "../src/store/keys.ts";
import { entryLinkUrl } from "../src/editor/reference.ts";

const HOME = process.env.HOME!;
const SRC = process.argv[2] ?? join(HOME, "Library/CloudStorage/Dropbox/gesta-backups/current");
const OUT = process.argv[3] ?? join(HOME, "Desktop/gesta-imports/gesta-org-links");
/* only a folder of this run's own naming is cleared before writing */
if (!/^gesta-org-links/.test(basename(OUT))) throw new Error(`refusing to clear ${OUT}: name the folder gesta-org-links…`);

const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : n.endsWith(".md") ? [p] : [];
});
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const cache: Record<string, string> = Object.create(null);
for (const path of walk(SRC)) { const t = importTarget(relative(SRC, path)); if (t) cache[entryKey(t.date, t.tag)] = readFileSync(path, "utf8"); }
const index = shelfIndex(cache);

/* the old files of texts, and where each text stands now */
const FILES: [RegExp, string][] = [
  [/doctor-who\.org$/, "bookshelf/Doctor Who"],
  [/robert-frost\.org$/, "bookshelf/Frost, Robert"],
  [/housman_shropshire-lad\.org$/, "bookshelf/Housman, A. E/A Shropshire Lad"],
  [/housman_last-poems\.org$/, "bookshelf/Housman, A. E/Last Poems"],
  [/dante\/commedia\.org$|dante_commedia\.org$/, "bookshelf/Dante/Commedia"],
  [/john-milton\/paradise-lost\.org$/, "bookshelf/Milton, John/Paradise Lost"],
  [/john-milton\.org$/, "bookshelf/Milton, John"],
  [/ordo-virtutum\.org$/, "bookshelf/Hildegard of Bingen/Ordo Virtutum"],
  [/tao-t[eo]-ching\.org$/, "page/Tao Te Ching"],
  [/charles-williams\.org$/, "bookshelf/Williams, Charles"],
  [/just_one_thing\.org$/, "bookshelf/Hanson, Rick/Just One Thing newsletter"],
];
const CANTICA: Record<string, string> = { inf: "Inferno", purg: "Purgatorio", par: "Paradiso" };
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const pad = (n: number): string => String(n).padStart(2, "0");
/* the day a label or an anchor names: 29 April 2017 */
function dayNamed(s: string): string | null {
  const m = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(s);
  const mo = m ? MONTHS.indexOf(m[2].toLowerCase()) : -1;
  return m && mo >= 0 ? `${m[3]}-${pad(mo + 1)}-${pad(+m[1])}` : null;
}
/* a range's end from a label, its elided digits restored: 1.254-5 → 255 */
function rangeEnd(label: string, from: number): number {
  const m = new RegExp(`\\b${from}\\s*[-–]\\s*(\\d+)`).exec(label);
  if (!m) return from;
  const tail = m[1], head = String(from);
  return tail.length >= head.length ? +tail : +(head.slice(0, head.length - tail.length) + tail);
}
const linkOf = (key: string): string => { const [d, ...t] = key.split("/"); return entryLinkUrl(d, t.join("/")); };
const squash = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{Nd}]+/gu, "");
/* the entries of a text, the one a label names first, then by their own
   number: a scene quoted again in a later episode is the earlier one's */
const under = (prefix: string, label = ""): string[] => Object.keys(index.texts).filter((k) => k === prefix || k.startsWith(prefix + "/"))
  .map((k) => ({ k, named: !!squash(label) && squash(k.split("/").pop()!).includes(squash(label)), n: (/^(\d+)-(\d+)/.exec(k.split("/").pop()!) ?? []).slice(1).map(Number) }))
  .sort((a, b) => +b.named - +a.named || (a.n[0] ?? 1e9) - (b.n[0] ?? 1e9) || (a.n[1] ?? 0) - (b.n[1] ?? 0) || a.k.localeCompare(b.k)).map((x) => x.k);

/* links given their place by name, asked: the passage each was kept for */
const NAMED = new Map(Object.entries(JSON.parse(readFileSync(new URL("./orgReferencesNamed.json", import.meta.url), "utf8")) as Record<string, string>));
let current = "";
/* the paragraph after the property drawer the anchor stood in, highlighted */
function highlighted(drawn: string | undefined, anchor: string): ReturnType<typeof quotedProse> {
  const para = drawn ? anchoredParagraph(cache[drawn], anchor) : null;
  return drawn && para ? quotedProse(index, drawn, para, [drawn]) : null;
}
function dayLink(l: OrgLink, anchor: string): Resolved {
  const named = dayNamed(l.label) ?? dayNamed(anchor);
  const days = Object.keys(cache).filter((k) => /^\d{4}-\d{2}-\d{2}/.test(k));
  const drawn = anchor ? days.find((k) => cache[k].includes(`:CUSTOM_ID: ${anchor}`)) : undefined;
  const lit = highlighted(drawn, anchor);
  if (lit) return { href: lit.url };
  const held = anchor ? days.find((k) => cache[k].includes(`<<${anchor}>>`)) : undefined;
  const day = named && cache[named] !== undefined ? named : held ?? drawn;
  return day ? { href: linkOf(day) } : { why: "the day it names is not in its label, and its anchor is gone" };
}
interface Asked { l: OrgLink; anchor: string; shelf: string }
type Attempt = (a: Asked) => Resolved | null;
type Placed = ReturnType<typeof quotedFrom>;
const shelved = (verse: Placed, shelf: string): verse is Extract<NonNullable<Placed>, { url: string }> =>
  !!verse && "url" in verse && verse.key.startsWith(shelf);
const byQuote: Attempt = ({ l, shelf }) => {
  if (!l.quote.length) return null;
  const verse = quotedFrom(index, l.quote.map((q) => q.replace(/^>\s?/, "")).filter((q) => q.trim()).map((left) => ({ left })));
  if (shelved(verse, shelf)) return { href: verse.url, passage: verse.passage };
  const prose = quotedProse(index, shelf, l.quote, under(shelf, l.label));
  return prose ? { href: prose.url, passage: prose.passage } : null;
};
const byLine: Attempt = ({ l, anchor, shelf }) => {
  const line = /^(?:(inf|purg|par)-)?(\d+)-(\d+)$/.exec(anchor);
  if (!line) return null;
  const [, cantica, part, from] = line;
  const key = cantica ? `${shelf}/${CANTICA[cantica]}/${part}`
    : under(shelf).find((k) => new RegExp(`/(?:Book |Scene )?${part}(?:\\.|$)`).test(k.slice(shelf.length)));
  const r = key ? referenceAt(index, key, { from: +from, to: rangeEnd(l.label, +from) }) : null;
  return r && "url" in r ? { href: r.url } : null;
};
/* a heading or a line named in the label, or in the anchor's own words */
const byWords: Attempt = ({ l, anchor, shelf }) => {
  for (const words of [l.label, anchor.replace(/-/g, " ")]) {
    const named = words ? quotedProse(index, shelf, [words]) : null;
    if (named) return { href: named.url };
  }
  return null;
};
/* an episode named by its number: 32-7 */
const byEpisode: Attempt = ({ anchor, shelf }) => {
  const numbered = /^(\d+-\d+)-/.exec(anchor);
  const episode = numbered ? under(shelf).find((k) => k.split("/").pop()!.startsWith(numbered[1] + " ")) : undefined;
  return episode ? { href: linkOf(episode) } : null;
};
const byTitle: Attempt = ({ l, anchor, shelf }) => {
  const titled = under(shelf).find((k) => squash(k.split("/").pop()!) === squash(anchor || l.label));
  return titled ? { href: linkOf(titled) } : null;
};
const byShelf: Attempt = ({ anchor, shelf }) => (anchor ? null : { href: linkOf(shelf) });
const ATTEMPTS = [byQuote, byLine, byWords, byEpisode, byTitle, byShelf];
function onShelf(a: Asked): Resolved {
  for (const attempt of ATTEMPTS) {
    const r = attempt(a);
    if (r) return r;
  }
  return { why: `not placed in ${a.shelf.replace(/^bookshelf\//, "")}` };
}
function resolve(l: OrgLink): Resolved {
  const given = NAMED.get(current + ":" + l.line);
  if (given) return { href: given };
  const [file, rawAnchor = ""] = l.target.replace(/^file:/, "").split("::");
  const anchor = decodeURIComponent(rawAnchor).replace(/^#/, "");
  if (!/\.org$/.test(file)) return { why: "not a link to a file" };
  if (/(?:^|\/)(\d{4})\.org$/.test(file)) return dayLink(l, anchor);
  const shelf = FILES.find(([re]) => re.test(file))?.[1];
  return shelf ? onShelf({ l, anchor, shelf }) : { why: "its text is not on the bookshelf" };
}

rmSync(OUT, { recursive: true, force: true });
const counts = { entries: 0, changed: 0, days: 0, passages: 0, links: 0, left: 0 };
const shown: { file: string; l: Referred }[] = [];
for (const path of walk(SRC).sort()) {
  counts.entries++;
  const md = readFileSync(path, "utf8"), file = relative(SRC, path);
  current = file;
  const r = referOrgLinks(md, resolve);
  if (!r.links.length) continue;
  for (const l of r.links) {
    shown.push({ file, l });
    if ("why" in l.res) counts.left++;
    else if (l.res.passage && l.quote.length) counts.passages++;
    else if (/^#\d{4}-/.test(l.res.href)) counts.days++;
    else counts.links++;
  }
  if (r.md === md) continue;
  const doc = parseMarkdown(r.md);
  if (serializeMarkdown(parseMarkdown(serializeMarkdown(doc))) !== serializeMarkdown(doc)) throw new Error(`${file}: not a fixed point`);
  counts.changed++;
  const to = join(OUT, file);
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, r.md);
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
const kind = (l: Referred): string => "why" in l.res ? "left" : l.res.passage && l.quote.length ? "passage" : /^#\d{4}-/.test(l.res.href) ? "day" : "link";
const section = (k: string, title: string): string => {
  const rows = shown.filter(({ l }) => kind(l) === k);
  return `<h2>${title} (${rows.length})</h2>` + rows.map(({ file, l }) => `<div class="e"><span>${esc(file)}:${l.line} — ${esc(l.target)}${"why" in l.res ? " — " + esc(l.res.why) : ""}</span><pre class="before">${esc(l.before.join("\n"))}</pre>${"why" in l.res ? "" : `<pre class="after">${esc(l.after.join("\n"))}</pre>`}</div>`).join("");
};
writeFileSync(OUT + "-review.html", `<!doctype html><meta charset="utf-8"><title>Old links review</title><style>
body{font:15px/1.5 Georgia,serif;max-width:1100px;margin:2em auto;padding:0 16px;background:#f4f7ec;color:#1a2418}
h2{font-size:1.2em;margin-top:2em;border-bottom:1px solid #cdd6c2}
.e{margin:1.4em 0}.e>span{font:12px ui-monospace,Menlo,monospace;color:#6b7568}
pre{white-space:pre-wrap;font:13px/1.45 ui-monospace,Menlo,monospace;margin:.3em 0;padding:6px 8px}
.before{background:#fbeee8}.after{background:#e6f0dc}</style>
<h1>Old links: ${counts.days + counts.passages + counts.links} made links in ${counts.changed} entries, ${counts.left} left</h1>
<p>${counts.entries} entries read. Each old <code>[[target][label]]</code> link keeps its words as the label and points where its target is now: the journal day its label names (or where its old anchor still stands), or the passage on the bookshelf, highlighted as ⌃⌘R highlights it. Where the link's line ends in a colon and a quotation follows, the quotation becomes the bookshelf's own passage, as ⌃⌘R quotes it. Red is the text as it stands, green what the import would make.</p>
${section("day", "Links to journal days")}
${section("passage", "References to the bookshelf, the quotation the bookshelf's passage")}
${section("link", "Links to the bookshelf")}
${section("left", "Left as they are")}`);
console.log(`${counts.entries} entries read; ${counts.days} day links, ${counts.passages} references with their passages, ${counts.links} bookshelf links, in ${counts.changed} entries; ${counts.left} left; written to ${OUT}, the review beside it`);
