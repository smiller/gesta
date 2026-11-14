/* node one-offs/archiveCommonplacesRun.ts [backup-dir] [--apply] — every
   archive read: a page's rewritten as its commonplace's under
   archive/commonplace/, another whose text links into a page rewritten in
   place, the manifests' page rows renamed, and the mirror's page/ checked
   against its commonplace/. Without --apply each is written under
   one-offs/out/archive-commonplace and read back; with it, into the backup,
   each read back before its original goes, then the page/ folders removed */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, renameSync, statSync, existsSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { commonplaceArchive, commonplaceArchivePath, commonplaceManifest, type Member } from "./archiveCommonplaces.ts";
import { zipDirectory, memberData, inflated } from "../src/store/bundle.ts";
import { zipBytes } from "../src/store/io.ts";

const args = process.argv.slice(2), APPLY = args.includes("--apply");
const BACKUP = args.find((a) => !a.startsWith("--")) ?? join(process.env.HOME!, "Library/CloudStorage/Dropbox/gesta-backups");
const OUT = join(import.meta.dirname, "out/archive-commonplace");
const TARGET = APPLY ? BACKUP : OUT;

const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const under = (dir: string, re: RegExp): string[] => walk(join(BACKUP, dir)).map((p) => relative(BACKUP, p)).filter((p) => re.test(p)).sort();

async function membersOf(bytes: Uint8Array): Promise<Member[]> {
  const { members } = await zipDirectory(new Blob([bytes as BlobPart]));
  return Promise.all(members.map(async (m) => ({ path: m.path, bytes: await inflated(m, memberData(bytes, 0, m)) })));
}
const packed = (members: Member[], day: string): Promise<Uint8Array> =>
  zipBytes(members.map((m) => ({ dir: "", name: m.path, bytes: m.bytes })), day);
const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((x, i) => x === b[i]);
const sameMembers = (a: Member[], b: Member[]): boolean =>
  a.length === b.length && a.every((m, i) => m.path === b[i].path && sameBytes(m.bytes, b[i].bytes));

/* written beside its place, read back whole by the app's reader and by
   /usr/bin/unzip, and only then put in its place */
async function landed(path: string, members: Member[], day: string): Promise<void> {
  const at = join(TARGET, path), next = at + ".rewrite";
  mkdirSync(dirname(at), { recursive: true });
  writeFileSync(next, await packed(members, day));
  if (!sameMembers(await membersOf(new Uint8Array(readFileSync(next))), members)) throw new Error(path + " does not read back as written");
  execFileSync("/usr/bin/unzip", ["-tqq", next]);
  renameSync(next, at);
}

interface Done { moved: number; rewritten: string[]; pictures: number }
const renamedPictures = (was: Member[], now: Member[]): number =>
  now.filter((m, i) => !m.path.endsWith(".md") && basename(m.path) !== basename(was[i].path)).length;
/* an archive that moved has its original removed once the new one is in place */
function settled(done: Done, from: string, to: string): void {
  if (to === from) { done.rewritten.push(from); return; }
  done.moved++;
  if (APPLY) rmSync(join(BACKUP, from));
}
async function archive(from: string, done: Done): Promise<void> {
  const was = await membersOf(new Uint8Array(readFileSync(join(BACKUP, from))));
  const to = commonplaceArchivePath(from), now = commonplaceArchive(was);
  if (to === from && !now) return;
  if (to !== from && existsSync(join(BACKUP, to))) throw new Error(to + " is already there");
  await landed(to, now ?? was, basename(from, ".zip"));
  done.pictures += renamedPictures(was, now ?? was);
  settled(done, from, to);
}
function manifests(): number {
  let changed = 0;
  for (const path of under("archive/manifests", /\.txt$/)) {
    const was = readFileSync(join(BACKUP, path), "utf8"), now = commonplaceManifest(was);
    if (now === was) continue;
    changed++;
    mkdirSync(dirname(join(TARGET, path)), { recursive: true });
    writeFileSync(join(TARGET, path) + ".rewrite", now);
    renameSync(join(TARGET, path) + ".rewrite", join(TARGET, path));
  }
  return changed;
}
/* the mirror's page/ as its commonplace/ would hold it, against what the
   app wrote there after it moved the pages */
function mirrored(): { files: number; absent: string[]; differ: string[] } {
  const files = under("current/page", /^(?!.*\/\.DS_Store$)/).map((p) => ({ path: p.slice("current/".length), bytes: new Uint8Array(readFileSync(join(BACKUP, p))) }));
  const now = commonplaceArchive(files) ?? files, absent: string[] = [], differ: string[] = [];
  for (const m of now) {
    const at = join(BACKUP, "current", m.path);
    if (!existsSync(at)) absent.push(m.path);
    else if (!sameBytes(m.bytes, new Uint8Array(readFileSync(at)))) differ.push(m.path);
  }
  return { files: files.length, absent, differ };
}

if (!APPLY) rmSync(OUT, { recursive: true, force: true });
const done: Done = { moved: 0, rewritten: [], pictures: 0 };
for (const from of under("archive", /\.zip$/)) await archive(from, done);
const mirror = mirrored();
console.log(`page archives rewritten as commonplaces': ${done.moved}, pictures renamed in them: ${done.pictures}`);
console.log(`other archives whose links into a page were followed: ${done.rewritten.length}`);
for (const r of done.rewritten) console.log("  " + r);
console.log(`manifests renamed: ${manifests()}`);
console.log(`mirror page/: ${mirror.files} files; absent from commonplace/: ${mirror.absent.length}; different there: ${mirror.differ.length}`);
for (const p of mirror.absent) console.log("  absent " + p);
for (const p of mirror.differ) console.log("  differs " + p);
if (APPLY) {
  const left = walk(join(BACKUP, "archive/page")).filter((p) => basename(p) !== ".DS_Store");
  if (left.length) throw new Error("archive/page still holds " + left.join(", "));
  rmSync(join(BACKUP, "archive/page"), { recursive: true });
  if (!mirror.absent.length) rmSync(join(BACKUP, "current/page"), { recursive: true });
  console.log("removed archive/page" + (mirror.absent.length ? "" : " and current/page"));
} else console.log("written under " + relative(process.cwd(), OUT) + "; nothing in the backup changed");
