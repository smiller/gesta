import { nsOf } from "./keys.ts";
import { imgHash, importTarget, type EntryFile } from "./names.ts";
import { fileBody, filePath, type ExportFile } from "./files.ts";

/* the MIRROR restores the journal as it stands; the ARCHIVES, one zip per
   moved root once a day, hold the earlier states it by design does not */
export const MIRROR_DIR = "current";
/* names only where the FILE lands: an archive's members still sit under
   <namespace>/<root>/… and import unchanged */
export const ARCHIVE_DIR = "archive";
export const MANIFESTS_DIR = ARCHIVE_DIR + "/manifests";
/* memoised on the per-run record. Its PAIR is the size in the listing: a
   hash alone cannot tell a file that is there from one deleted or truncated
   under us, the failure a recovery artifact must never have */
export function fileSig(f: ExportFile): string {
  return f.sig || (f.sig = imgHash(fileBody(f)));
}
/* the size AS THE FOLDER WILL REPORT IT — UTF-8 bytes for a doc. A
   character count agrees only for ASCII, and 6,749 of 7,634 files carried
   non-ASCII (MEASURED), so `.length` would let the dedup skip nothing.
   COUNTED, NOT ENCODED: a surrogate pair is one four-byte code point, a lone
   half a three-byte replacement (pin: plans.test › fileSize counts UTF-8
   bytes as the folder will report them) */
export function fileSize(f: ExportFile): number {
  const body = fileBody(f);
  if (typeof body !== "string") return body.length;
  let n = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xD800 && c < 0xDC00 && i + 1 < body.length &&
             body.charCodeAt(i + 1) >= 0xDC00 && body.charCodeAt(i + 1) < 0xE000) { n += 4; i++; }
    else n += 3;
  }
  return n;
}
/* a picture this app wrote beside an entry: <stem>-img-<n>.<ext>, where
   the STEM names an entry we have actually SEEN — one this export produced
   or one whose file sits in the folder — never merely a name that parses:
   a named entry may be called anything, so a reader's own holiday-img-1.jpg
   would read as ours and go. A stem per SHAPE of entry: a day's picture
   answers to the bare arm, a namespaced one to the flat, whose first
   segment must name a namespace (pin: plans.test › sidecarOfOurs: the stem
   must name an entry we have seen) */
export const SIDECAR = /^(.*)-img-\d+\.[A-Za-z0-9]+$/;
export function sidecarOfOurs(path: string, known: Record<string, true>): boolean {
  const cut = path.lastIndexOf("/"), dir = cut < 0 ? "" : path.slice(0, cut + 1);
  const hit = SIDECAR.exec(path.slice(cut + 1));
  if (!hit) return false;
  if (known[dir + hit[1] + ".md"]) return true;
  const parts = hit[1].split("--");
  return parts.length > 1 && !!nsOf(parts[0]) && !!known[dir + parts[parts.length - 1] + ".md"];
}
/* THE BELT on the reconcile: a stale set this large is a symptom, not a
   tidy-up. A count cannot work — the real first sweep was 2,039 of 14,631
   files, 13.9% (MEASURED) — so half, with a floor that keeps the fraction
   from switching itself off on a small folder (pin: plans.test ›
   reconcilePlan's floor). A refusal deletes nothing and reports the count
   (pin: plans.test › reconcilePlan refuses a sweep past the floor) */
export const RECONCILE_FLOOR = 20;
export interface Reconcile { drop: string[]; refused: number }
/* which files in the mirror the journal no longer contains — an unswept
   mirror imported into a fresh journal resurrects every re-keyed entry as
   a duplicate. Pure: names in, names out. THE TEST IS "WOULD THIS APP HAVE
   WRITTEN THIS NAME", never "is this name unfamiliar" — the folder is the
   user's own storage. An entry this tab cannot read is UNKNOWN, not gone,
   and its files under both stems are spared. The tier ROOT is not swept
   here: a flat copy there is under a stricter test (pin: plans.test ›
   reconcilePlan drops only nested ghosts of ours, and spares the unread) */
export function reconcilePlan(present: Record<string, number>, expected: ExportFile[], unread?: EntryFile[] | null): Reconcile {
  const here = Object.keys(present), keep: Record<string, true> = Object.create(null);
  for (const f of expected) keep[filePath(f)] = true;
  const spared: Record<string, true> = Object.create(null);
  for (const target of unread || []) {
    spared[target.dir + target.base + ".md"] = true;
    spared[target.dir + target.flatBase] = true;
    spared[target.dir + target.base] = true;
  }
  /* every .md we know of, live or ghost, by the import's own question: a
     foreign notes/page/Ideas.md is nobody's (pin: plans.test › reconcilePlan:
     a namespace word below the tier root is not ours) */
  const known: Record<string, true> = Object.create(null);
  for (const path of here) if (importTarget(path)) known[path] = true;
  for (const path of Object.keys(keep)) if (/\.md$/i.test(path)) known[path] = true;
  const drop = here.filter((path) => {
    if (keep[path]) return false;
    if (path.indexOf("/") === -1) return false;
    if (spared[path]) return false;
    const at = path.lastIndexOf("/"), stem = SIDECAR.exec(path.slice(at + 1));
    if (stem && spared[path.slice(0, at + 1) + stem[1]]) return false;
    return !!known[path] || sidecarOfOurs(path, known);
  });
  const over = drop.length > Math.max(RECONCILE_FLOOR, here.length / 2);
  return { drop: over ? [] : drop, refused: over ? drop.length : 0 };
}
export interface ManifestRow { sig: string; size: number }
export type Manifest = Record<string, ManifestRow>;
/* which of `files` a run must write: the answer to one edited sentence
   rewriting all 14,295 mirror files. Anything not positively known up to
   date is WRITTEN — a needless write costs one file, a wrong skip a hole
   nobody sees until they restore (pin: plans.test › dedupFiles: anything not
   positively known up to date is written) */
export function dedupFiles(files: ExportFile[], manifest: Manifest, present: Record<string, number>): ExportFile[] {
  return files.filter((f) => {
    const at = filePath(f), was = manifest[at];
    return !was || present[at] !== was.size || was.sig !== fileSig(f);
  });
}
export interface BackupPlan { writeMirror: boolean; dated: string | null; reconcile: boolean }
/* THE DEDUP MAY SKIP ON ITS OWN; THE RECONCILE MAY NOT DELETE ON ITS OWN.
   A tab overtaken elsewhere exports a journal short of entries another tab
   wrote, and every one reads as a ghost. A wrong skip heals next run; a
   wrong delete costs the entry. So the delete needs proof, and the shared
   signature is it: the folder's bookkeeping says what this tab last
   committed only if no one else has committed since (pin: plans.test ›
   backupPlan: the mirror on signature, the archives once per day, the
   reconcile only ours) */
export function backupPlan(today: string, lastDated: string | null, sig: string, lastSig: string | null, oursLast: boolean): BackupPlan {
  const writeMirror = sig !== lastSig;
  return { writeMirror, dated: today !== lastDated ? today : null, reconcile: writeMirror && !!oursLast };
}
/* the archive a file belongs to; a key that is neither a day nor a
   namespace with a tag takes none, and that is reported rather than only
   skipped — a silent exclusion from every archive is what nothing would
   surface (pin: plans.test › rootOf: a file answers with its archive, or
   with nothing) */
export function rootOf(f: ExportFile): string | null {
  if (f.root) return f.root;
  console.error("backup: no archive holds " + filePath(f) + " — its key is neither a day nor a namespace");
  return null;
}
/* a root's whole state in one string, over PATHS as well as contents so a
   deletion moves it; sorted, so ordering cannot; VERSIONED, the version
   being the only lever over an archive's format. The NUL delimiter is
   spelled as an escape, never a literal byte (pin: plans.test › rootSig: a
   deletion moves it, order does not, and it is versioned) */
export function rootSig(files: ExportFile[]): string {
  const parts = files.map((f) => filePath(f) + "\u0000" + fileSig(f));
  parts.sort();
  const joined = parts.join("\u0000");
  return "1." + imgHash(joined) + "." + joined.length;
}
export interface ArchiveRecord { sig: string; at?: string }
export type Archived = Record<string, ArchiveRecord | string>;
export interface ArchiveGroup { root: string; sig: string; files: ExportFile[] }
/* WHICH ROOTS OWE AN ARCHIVE. Per root every time, so a quiet root costs
   nothing and no declaration about change rate can rot (MEASURED: the
   bookshelf declared itself quiet and had grown 185% in six days). Two
   witnesses, as the mirror's dedup takes: what we last WROTE and what is
   THERE; anything not corroborated is archived (pin: plans.test ›
   archivePlan writes anything not positively corroborated) */
export function archivePlan(files: ExportFile[], archived: Archived, present: Record<string, unknown>): ArchiveGroup[] {
  const by: Record<string, ExportFile[]> = Object.create(null), out: ArchiveGroup[] = [];
  for (const f of files) {
    const at = rootOf(f);
    if (!at) continue;
    (by[at] || (by[at] = [])).push(f);
  }
  for (const at of Object.keys(by).sort()) {
    const sig = rootSig(by[at]), was = archived[at];
    if (was && typeof was === "object" && was.sig === sig && was.at && present[was.at] !== undefined) continue;
    out.push({ root: at, sig, files: by[at] });
  }
  return out;
}
/* WHICH ROOTS EXISTED THIS RUN, and where each one's state is kept — the
   archive folder cannot say, since nothing prunes an archive and a root
   deleted after its last one keeps a zip a restore would honour (seven
   author roots retired in one day). A POSITIVE RECORD. The roots arrive as
   their own argument, knowable from keys without a body read. EVERY LINE
   TERMINATED (MEASURED: a shell while-read loop drops an unterminated last
   line), the empty case EMPTY (pin: plans.test › rootManifest: every line
   terminated) */
export function rootManifest(roots: (string | null)[], archived: Archived): string {
  const seen: Record<string, true> = Object.create(null);
  for (const r of roots) if (r) seen[r] = true;
  const lines = Object.keys(seen).sort().map((r) => {
    const was = archived[r];
    return was && typeof was === "object" && was.at ? r + "\t" + was.at : r;
  });
  return lines.length ? lines.join("\n") + "\n" : "";
}
