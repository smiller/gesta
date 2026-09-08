/* What a name may be on DISK: the export-safe filename rules, the byte
   budgets, the content hash, the layout an entry's files take, and the
   read-back from a path to the entry it targets. Ported 2026-09-07 from
   ../writer/src/js/names.mjs, whose comments hold the measurements behind
   each rule; kept here are the rules and the failures that made them. */
import { nsOf, isDayKey, pageParts } from "./keys.ts";

export const utf8 = new TextEncoder();
/* a RELATIVE picture source — a sidecar's name as the markdown wrote it —
   as against a data:, http(s): or absolute one the browser resolves itself */
export const RELATIVE_SRC = /^(?!(?:[a-z][a-z0-9+.-]*:|\/\/|\/))/i;
/* the folder a DAY's files sit in, derived from its own key. Spelled ONCE:
   entryFile builds a day's path from this and importTarget checks a day's
   path against it, so the two agree by construction. Not a namespace: a
   day's key is its date, and this word never enters one. */
export function dayDir(date: string): string { return "journal/" + date.slice(0, 4); }
/* the export-unsafe filename characters, collapsed to "-" wherever a name
   becomes a filename — the filename IS the import key */
export const FILE_UNSAFE_RE = /[\\/:*?"<>|]+/g;
/* the filesystem's limit on ONE path component */
export const FILE_BYTES = 255;
/* the LOWER ceiling a name that will be WRITTEN has to clear: Chromium's
   createWritable() writes through a "<name>.crswap" sibling, and the sibling
   is what overflows. MEASURED on the book essays, whose filenames sat at
   exactly 255: InvalidStateError at write time, with text about state having
   changed since it was read from disk. */
export const WRITE_BYTES = FILE_BYTES - ".crswap".length;
/* the bytes ONE page name can carry: page/<Name>.md, so WRITE_BYTES less
   ".md". THIS SETTLES PAGES, NOT THE WHOLE KEY SPACE: a day's tag is budgeted
   nowhere, and journal/<year>/<date>--<tag>.md outgrows the ceiling at a tag
   of ~233 bytes — pre-existing and left open. */
export const NAME_BYTES = WRITE_BYTES - ".md".length;
/* the ONE spelling of "trim a string to a UTF-8 byte budget": pre-sliced to
   bound the loop (a pasted-paragraph name re-encoded quadratically and
   stalled the tab), and never leaving a lone high surrogate at the tail —
   encodeURIComponent throws on one, and a registered-but-unroutable name
   broke the pages dropdown on every open */
export function trimToBytes(s: string, budget: number): string {
  if (budget <= 0) return "";
  if (s.length > budget) s = s.slice(0, budget);
  while (utf8.encode(s).length > budget) s = s.slice(0, -1);
  const last = s.charCodeAt(s.length - 1);
  if (last >= 0xD800 && last <= 0xDBFF) s = s.slice(0, -1);
  return s;
}
/* FNV-1a over a string's char codes OR a byte array's values. An image's id
   IS this hash: the math moving re-keys every picture already stored. */
export function imgHash(v: string | Uint8Array): string {
  const text = typeof v === "string";
  let h = 2166136261;
  for (let i = 0; i < v.length; i++) {
    h ^= text ? v.charCodeAt(i) : v[i];
    h = (h * 16777619) >>> 0;
  }
  return h.toString(36);
}
/* a typed page name made export-safe and capped by bytes — the ONE rule
   every key-minting path runs a name through, a sub-page exactly as its
   parent. A title's ": " reads as the house " — " (a colon cannot live in a
   filename, and the bare "-" read wrong in a title; an unspaced colon keeps
   the plain collapse). "--" runs collapse to "-" and edge dashes are trimmed:
   the double dash is the sub-page filename delimiter. The edge trims run to
   a FIXED POINT — the round-trip rule is name === pageName(name).
   A TRAILING DOT GOES WITH THE DASHES: a name becomes a DIRECTORY under the
   nested layout, and a directory whose name ends in a dot is skipped whole by
   the import walk, silently (MEASURED 2026-08-05: two folders alike but for
   the dot, the plain one restored all three files, the dotted one none).
   NEVER TO NOTHING: an all-dot name keeps every dot — refusing it was tried
   and reverted, the export layout already carrying such a name. */
export function pageName(raw: string | null | undefined): string {
  let s = (raw || "").replace(/: /g, " — ")
    .replace(FILE_UNSAFE_RE, "-").replace(/-{2,}/g, "-");
  s = trimToBytes(s, NAME_BYTES);
  let prev: string;
  do {
    prev = s;
    s = s.trim().replace(/^-+|-+$/g, "");
    if (/[^.]/.test(s)) s = s.replace(/\.+$/, "");
  } while (s !== prev);
  return s;
}
/* a dated-article URL's /YYYY/MM/DD/slug path — hostname-agnostic, http or
   https, tolerating a missing trailing slash and a query or fragment */
export const ARTICLE_URL_RE =
  /^https?:\/\/[^/?#\s]+\/(\d{4})\/(\d{2})\/(\d{2})\/([^/?#]+)\/?(?:[?#].*)?$/;
/* a pasted dated-article URL as its YYYY-MM-DD-slug name, so a book of
   essays stays chronological under byName. THREE outcomes, the whitelist
   deliberately OUT of the regex: null — not a dated article; the name; or
   "" — a dated article whose slug fails the [\w.-] whitelist, which a caller
   refuses outright rather than mangling the URL into a plausible key. */
export function nameFromUrl(raw: string | null | undefined): string | null {
  const m = ARTICLE_URL_RE.exec((raw || "").trim());
  if (!m) return null;
  const name = m[1] + "-" + m[2] + "-" + m[3] + "-" + m[4];
  return /^[\w.-]+$/.test(name) ? name : "";
}
export interface Target { date: string; tag: string | null }
/* the page segments of a page file → its target, at ANY depth. An EMPTY
   segment is a malformed file, skipped rather than guessed at. No length
   gate: a foreign filesystem can hold a pair no one exported filename could,
   and a gate would refuse what the app itself mints. */
export function nsTarget(ns: string, names: string[]): Target | null {
  if (!names.length || names.indexOf("") !== -1) return null;
  return { date: ns, tag: names.join("/") };
}
/* an import file's PATH → the entry it targets, or null. The single answer
   to "which entry does this file overwrite": the import loop, the count and
   the confirm all reach it. THE TOP-LEVEL DIRECTORY IS THE WHOLE OF THE
   QUESTION: an entry sits under journal/, page/ or bookshelf/ at the top of
   the pick, or it is not an entry (MEASURED 2026-08-21: every member of all
   79 archives and every file in the mirror sits under one of the three).
   The backup sweep reads this too, to decide which listed file the journal
   no longer holds — a DELETE — so loosening it loosens the sweep's reach. */
export function importTarget(path: string): Target | null {
  /* a file that is not markdown overwrites no entry — a sidecar beside its
     .md would otherwise read as a page of its own */
  if (!/\.md$/i.test(path)) return null;
  const segs = path.split("/"), base = segs.pop()!.replace(/\.md$/i, "");
  /* a NAMESPACED entry is keyed by its PATH and tested FIRST: the day arm
     reads the basename, and a sub-entry named for a date would otherwise
     come back as that day's own entry, written over it and never mentioned */
  if (nsOf(segs[0]))
    return nsTarget(segs[0], segs.slice(1).concat(base).map(pageName));
  /* ONE FOLDER WRITTEN, ONE FOLDER READ: a day's folder disagreeing with its
     name is a file somebody moved. The basename is read raw, not through the
     writer's fold — a gap left open, since tightening it would refuse files
     already on disk. */
  const date = base.slice(0, 10);
  let tag: string | null = null;
  if (!isDayKey(date)) return null;
  if (segs.join("/") !== dayDir(date)) return null;
  const rest = base.slice(10);
  if (rest) {
    if (rest.slice(0, 2) !== "--") return null;
    tag = rest.slice(2);
    if (!tag) return null;
  }
  return { date, tag };
}
/* where an entry's files live — importTarget's inverse. `dir` the folder,
   `base` the bare stem the markdown's relative links want, `flatBase` the
   stem carrying the whole key (the sidecar's stem, and the collision check's),
   `root` which ARCHIVE the entry belongs to. */
export interface EntryFile { dir: string; base: string; flatBase: string; root: string }
export function entryFile(date: string, tag?: string | null): EntryFile {
  const safe = (s: string): string => s.replace(FILE_UNSAFE_RE, "-");
  /* the same fold plus the one thing a folder name cannot end in, for the
     archive alone: nothing reads an archive's folder name back as a key, so
     it may be normalised where an entry's own path may not */
  const dirSafe = (s: string): string => safe(s).replace(/\.+$/, "") || "-";
  if (nsOf(date) && tag) {
    const pp = pageParts(tag);
    const anc = pp.parent ? pp.parent.split("/").map(safe) : [];
    const leaf = safe(pp.leaf);
    /* EVERY separator becomes "--": a single String.replace substitutes only
       the first, which folded a deep key into one segment and let two keys
       mint one filename with nothing reported */
    const flat = date + "--" + anc.concat(leaf).join("--");
    const root = date + "/" + dirSafe(pp.name);
    /* AN ANCESTOR ENDING IN A DOT CANNOT BE A DIRECTORY ("." and ".." are
       refused by getDirectoryHandle; any other dot-suffixed name succeeds and
       the import walk then skips the folder whole), so the entry takes the
       flat spelling. It lands at the export's root and does NOT round-trip:
       the open gap a naming prompt is to close. */
    if (anc.some((s) => /\.$/.test(s)))
      return { dir: "", base: flat, flatBase: flat, root };
    return {
      dir: date + "/" + (anc.length ? anc.join("/") + "/" : ""),
      base: leaf, flatBase: flat, root,
    };
  }
  const base = safe(tag ? date + "--" + tag : date);
  /* a day's root is its year, which the layout already chose */
  const year = isDayKey(date) ? dayDir(date) : "";
  return { dir: year && year + "/", base, flatBase: base, root: year };
}
export interface FileJob { at: EntryFile; key: string }
export interface Collision { name: string; keys: [string, string] }
/* TWO ENTRIES, ONE FILENAME — the failure a folder cannot report: the
   second write overwrites the first and the run counts both. The fold maps a
   whole character class to "-", so "a/b" and "a:b" spell one name, and it
   bites a DAY's tag, stored as typed. Refusing the whole run is the loud
   direction: a run that never wrote commits no dedup flag. THE FLAT STEM IS
   THE ONE TO CHECK: it folds the separators the path keeps, so a path
   collision is always a flat collision and not the converse. */
export function collidingFile(jobs: FileJob[]): Collision | null {
  const seen: Record<string, { key: string; path: string }> = Object.create(null);
  let hit: Collision | null = null;
  for (const job of jobs) {
    const flat = job.at.flatBase + ".md", path = job.at.dir + job.at.base + ".md";
    let prev: { key: string; path: string } | null = seen[flat] || null;
    /* the SAME key twice is a drifted registry, not two entries claiming one
       file — taking every backup down over a duplicate row would be out of
       proportion to it */
    if (prev && prev.key === job.key) prev = null;
    /* detect on the flat stem, but report the name the user would go
       looking for: the path where the pair collides there, the stem only
       when the two paths differ */
    if (prev && !hit)
      hit = { name: prev.path === path ? path : flat, keys: [prev.key, job.key] };
    seen[flat] = { key: job.key, path };
  }
  return hit;
}
/* the name a PASTED picture is filed under beside its entry: the entry's
   base stem, "-img-", one past the highest number the text already
   names, ".webp" — the mirror's own spelling (MEASURED 2026-09-07: 297
   sidecars as `stem-img-N.webp`), so a paste here exports as the current
   app's did */
export function nextImageName(base: string, refs: string[]): string {
  let n = 0;
  const re = new RegExp("^" + base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "-img-(\\d+)\\.\\w+$");
  for (const r of refs) { const m = re.exec(r); if (m) n = Math.max(n, +m[1]); }
  return base + "-img-" + (n + 1) + ".webp";
}
