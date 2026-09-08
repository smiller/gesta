// The disk edge over fake directory handles — the same parameter seam the
// browser fills with real ones. Ported 2026-09-07 from ../writer/src/js/io.test.mjs.
import { test, expect } from "vitest";
import {
  yieldToTaskQueue, setYieldWatch, folderNames, writeFilesTo, zipBytes,
  ZIP_MAX_ENTRIES, writeBackup, lastRun, sweepFlatCopies, folderMemo, type Failure,
} from "./io.ts";
import { utf8, entryFile } from "./names.ts";
import { crc32 } from "./zip.ts";
import { MIRROR_DIR, ARCHIVE_DIR } from "./plans.ts";
import type { ExportFile } from "./files.ts";
import type { Dir } from "./fsa.ts";

type Tree = { [name: string]: string | Uint8Array | Tree };
type Refuse = Record<string, Error>;
const isDirNode = (v: unknown): v is Tree => typeof v === "object" && v !== null && !(v instanceof Uint8Array);
// A fake FSA directory over a plain nested object: a string or Uint8Array
// value is a file, a nested object a directory. Writes land back in the
// tree; `log` records "write <path>"; `refuse` maps a path to the error its
// handle rejects with.
function fakeDir(tree: Tree, log?: string[] | null, refuse?: Refuse | null, at = ""): Dir {
  return {
    kind: "directory", name: at,
    getDirectoryHandle(name: string) {
      const p = at + name;
      if (refuse && refuse[p]) return Promise.reject(refuse[p]);
      if (!(name in tree)) tree[name] = {};
      const v = tree[name];
      if (!isDirNode(v)) return Promise.reject(new Error("not a directory: " + p));
      return Promise.resolve(fakeDir(v, log, refuse, p + "/"));
    },
    getFileHandle(name: string) {
      const p = at + name;
      if (refuse && refuse[p]) return Promise.reject(refuse[p]);
      return Promise.resolve({
        createWritable: () => Promise.resolve({
          write(body: string | Uint8Array) { tree[name] = body; if (log) log.push("write " + p); return Promise.resolve(); },
          close: () => Promise.resolve(),
        }),
      });
    },
    values() {
      const names = Object.keys(tree);
      let i = 0;
      return { next: () => {
        if (i >= names.length) return Promise.resolve({ done: true, value: undefined });
        const name = names[i++], v = tree[name];
        if (isDirNode(v)) { const d = fakeDir(v, log, refuse, at + name + "/"); d.name = name; return Promise.resolve({ done: false, value: d }); }
        return Promise.resolve({ done: false, value: { kind: "file", name, getFile: () => Promise.resolve({ size: (typeof v === "string" ? utf8.encode(v) : v).length }) } });
      } };
    },
  } as unknown as Dir;
}
// an export-shaped record minted through entryFile, the helper the real
// export derives its targets from
function docFor(date: string, text: string): ExportFile {
  const t = entryFile(date, null);
  return { name: t.base + ".md", flat: t.flatBase + ".md", text, dir: t.dir, entry: t.flatBase, root: t.root };
}
const dirOf = (tree: Tree) => tree as Tree;

test("folderNames maps every file under a tier to its size, depth-first", async () => {
  const dir = fakeDir({ "a.md": "héllo", "café.md": "café", sub: { "b.png": new Uint8Array(3), deeper: { "c.md": "xy" } } });
  expect({ ...(await folderNames(dir)) }).toEqual({ "a.md": 6, "café.md": 5, "sub/b.png": 3, "sub/deeper/c.md": 2 });
});

test("writeFilesTo collects one refused file and still writes the rest", async () => {
  const tree: Tree = {};
  const bad = docFor("2026-01-02", "lost");
  const err = new Error("disk says no");
  const refuse: Refuse = { [bad.dir + bad.name]: err };
  const good = docFor("2026-01-01", "kept");
  const side: ExportFile = { name: "pic-img-1.png", bytes: new Uint8Array([1, 2]), dir: good.dir, entry: good.entry, root: good.root };
  const steps: string[] = [];
  const failures = await writeFilesTo(fakeDir(tree, null, refuse), [good, side, bad], (n, of) => steps.push(n + "/" + of));
  expect(failures).toEqual([{ name: bad.dir + bad.name, error: err, doc: true }]);
  expect((dirOf(tree.journal as Tree)["2026"] as Tree)[good.name]).toBe("kept");
  expect((dirOf(tree.journal as Tree)["2026"] as Tree)["pic-img-1.png"]).toEqual(new Uint8Array([1, 2]));
  expect(steps).toEqual(["1/2", "2/2"]);
});

test("writeFilesTo rethrows a session-fatal refusal instead of collecting it", async () => {
  const fatal = new Error("revoked"); fatal.name = "NotAllowedError";
  const doc = docFor("2026-01-01", "x");
  await expect(writeFilesTo(fakeDir({}, null, { [doc.dir + doc.name]: fatal }), [doc])).rejects.toBe(fatal);
});

test("folderMemo caches a rejection by default and drops it under retry", async () => {
  function flakyRoot() {
    let asked = 0;
    return { asked: () => asked, getDirectoryHandle() { asked++; return asked === 1 ? Promise.reject(new Error("glitch")) : Promise.resolve({}); } };
  }
  const cache = flakyRoot();
  const cached = folderMemo(cache as unknown as Dir);
  await expect(cached("a")).rejects.toThrow(/glitch/);
  await expect(cached("a")).rejects.toThrow(/glitch/);
  expect(cache.asked()).toBe(1);
  const heal = flakyRoot();
  const retried = folderMemo(heal as unknown as Dir, { retry: true });
  await expect(retried("a")).rejects.toThrow(/glitch/);
  await retried("a");
  await retried("a");
  expect(heal.asked()).toBe(2);
});

test("folderMemo passes create through to the handle, and only under { create }", async () => {
  function strictRoot(): Dir {
    return { getDirectoryHandle(_name: string, o?: { create?: boolean }) { return o && o.create ? Promise.resolve(this) : Promise.reject(new Error("absent")); } } as unknown as Dir;
  }
  await expect(folderMemo(strictRoot())("x")).rejects.toThrow(/absent/);
  await folderMemo(strictRoot(), { create: true })("x/y");
});

test("sweepFlatCopies collects a listing that rejects with a FALSY reason", async () => {
  const dir = { values: () => ({ next: () => Promise.reject(undefined) }) } as unknown as Dir;
  const failures: Failure[] = [];
  await sweepFlatCopies(dir, [docFor("2026-01-01", "landed")], failures);
  expect(failures).toEqual([{ name: "(listing)", error: undefined, doc: false, blind: true }]);
});

test("zipBytes is byte-identical for the same files and day", async () => {
  const files: ExportFile[] = [docFor("2026-01-01", "corpus line one"), { name: "p-img-1.png", bytes: new Uint8Array([9, 9, 9]), dir: "journal/2026/" }];
  const a = await zipBytes(files, "2026-08-27");
  const b = await zipBytes(files, "2026-08-27");
  expect(a).toEqual(b);
  expect(a.length).toBeGreaterThan(22);
});

test("zipBytes refuses a member count past the classic-zip ceiling", async () => {
  const files = new Array(ZIP_MAX_ENTRIES + 1).fill(docFor("2026-01-01", "x"));
  await expect(zipBytes(files, "2026-08-27")).rejects.toThrow(/too many files/);
});

test("writeBackup, mirror only: files land under the tier, the manifest records clean writes, lastRun reports the run", async () => {
  const tree: Tree = {}, manifest = {};
  const good = docFor("2026-01-01", "kept");
  const bad = docFor("2026-01-02", "lost");
  const err = new Error("stuck");
  const failures = await writeBackup({ dir: fakeDir(tree, null, { [MIRROR_DIR + "/" + bad.dir + bad.name]: err }), files: [good, bad],
    plan: { writeMirror: true, reconcile: false, dated: null }, manifest, unread: [], roots: [] });
  expect(failures.length).toBe(1);
  expect(failures[0].name).toBe(bad.dir + bad.name);
  expect(((tree[MIRROR_DIR] as Tree).journal as Tree)["2026"]).toMatchObject({ [good.name]: "kept" });
  expect(manifest).toHaveProperty(good.dir + good.name);
  expect(manifest).not.toHaveProperty(bad.dir + bad.name);
  expect(lastRun!.tier).toBe(MIRROR_DIR);
  expect(lastRun!.of).toBe(2);
});

test("writeBackup, dated: the signature and the day's census commit on the clean write", async () => {
  const tree: Tree = {}, manifest = {}, archived = {};
  const doc = docFor("2026-01-01", "corpus");
  const failures = await writeBackup({ dir: fakeDir(tree), files: [doc], plan: { writeMirror: true, reconcile: false, dated: "2026-08-27" }, manifest, unread: [], archived, roots: [doc.root!] });
  expect(failures.length).toBe(0);
  const zipAt = ARCHIVE_DIR + "/" + doc.root + "/2026-08-27.zip";
  expect((((tree[ARCHIVE_DIR] as Tree).journal as Tree)["2026"] as Tree)["2026-08-27.zip"]).toBeInstanceOf(Uint8Array);
  expect((archived as Record<string, { at: string }>)[doc.root!].at).toBe(zipAt);
  expect(lastRun!.archives).toEqual([zipAt]);
  expect(((tree[ARCHIVE_DIR] as Tree).manifests as Tree)["2026-08-27.txt"]).toBeInstanceOf(Uint8Array);
});

test("writeBackup, dated: a failed archive withholds its signature and the day's census, and the mirror still writes", async () => {
  const tree: Tree = {}, manifest = {}, archived = {};
  const doc = docFor("2026-01-01", "corpus");
  const failures = await writeBackup({ dir: fakeDir(tree, null, { [ARCHIVE_DIR]: new Error("no archive dir") }), files: [doc],
    plan: { writeMirror: true, reconcile: false, dated: "2026-08-27" }, manifest, unread: [], archived, roots: [doc.root!] });
  expect(failures.length).toBeGreaterThanOrEqual(1);
  expect(archived).not.toHaveProperty(doc.root!);
  expect(tree[ARCHIVE_DIR]).toBe(undefined);
  expect(((tree[MIRROR_DIR] as Tree).journal as Tree)["2026"]).toMatchObject({ [doc.name]: "corpus" });
  expect(lastRun!.archives).toEqual([]);
});

test("yieldToTaskQueue drains the whole microtask queue before resolving", async () => {
  let chain = 0;
  const p = yieldToTaskQueue();
  let q = Promise.resolve();
  for (let i = 0; i < 1000; i++) q = q.then(() => { chain++; });
  await p;
  expect(chain).toBe(1000);
});

test("setYieldWatch arms the watch, and a remover removes only its own", async () => {
  let seen = 0;
  const remove = setYieldWatch(() => { seen++; });
  await yieldToTaskQueue();
  expect(seen).toBe(1);
  let other = 0;
  const removeOther = setYieldWatch(() => { other++; });
  remove();
  await yieldToTaskQueue();
  expect(other).toBe(1);
  expect(seen).toBe(1);
  removeOther();
  await yieldToTaskQueue();
  expect(other).toBe(1);
});

// ONE tier/folder of a fake backup directory: writes land in `sink` keyed
// by full path; it LISTS and REMOVES like a real handle. `failIf` rejects a
// write whose name it accepts; absence is modelled for a presence probe.
type Sink = Record<string, string | Uint8Array>;
function fakeSub(prefix: string, sink: Sink, failIf?: ((name: string) => boolean) | null, log?: string[] | null): Dir {
  const sub = {
    kind: "directory", name: prefix,
    getDirectoryHandle(dn: string) { return Promise.resolve(fakeSub(prefix + "/" + dn, sink, failIf, log)); },
    values() {
      const at = prefix + "/", seen: Record<string, 1> = {}, here: unknown[] = [];
      let i = 0;
      for (const k of Object.keys(sink)) {
        if (k.indexOf(at) !== 0) continue;
        const rest = k.slice(at.length), cut = rest.indexOf("/");
        if (cut === -1) {
          here.push({ kind: "file", name: rest, getFile() {
            const body = sink[k];
            return Promise.resolve({ size: typeof body === "string" ? utf8.encode(body).length : body.length });
          } });
        } else if (!seen[rest.slice(0, cut)]) {
          const dn = rest.slice(0, cut);
          seen[dn] = 1;
          const d = fakeSub(prefix + "/" + dn, sink, failIf, log);   /* named by its SEGMENT, as a real handle is */
          (d as { name: string }).name = dn;
          here.push(d);
        }
      }
      return { next: () => Promise.resolve(i < here.length ? { done: false, value: here[i++] } : { done: true, value: undefined }) };
    },
    removeEntry(n: string) {
      const k = prefix + "/" + n;
      if (!(k in sink)) { const e = new Error("gone"); e.name = "NotFoundError"; return Promise.reject(e); }
      delete sink[k];
      return Promise.resolve();
    },
    getFileHandle(name: string, opts?: { create?: boolean }) {
      if (failIf && failIf(name)) return Promise.reject(new Error("bad " + name));
      if (!(opts && opts.create) && !(prefix + "/" + name in sink)) { const gone = new Error("no such file"); gone.name = "NotFoundError"; return Promise.reject(gone); }
      return Promise.resolve({ createWritable: () => Promise.resolve({
        write(b: string | Uint8Array) { sink[prefix + "/" + name] = b; if (log) log.push(prefix + "/" + name); return Promise.resolve(); },
        close: () => Promise.resolve(),
      }) });
    },
  };
  return sub as unknown as Dir;
}
const tierRoot = (sink: Sink, failIf?: ((name: string) => boolean) | null, log?: string[] | null): Dir =>
  ({ getDirectoryHandle: (n: string) => Promise.resolve(fakeSub(n, sink, failIf, log)) }) as unknown as Dir;

test("writeFilesTo lands each file in its own folder, and a folderless one at the root", async () => {
  const sink: Sink = {};
  const clean = await writeFilesTo(fakeSub("root", sink), [
    { dir: "journal/1997/", name: "1997-03-14.md", text: "a" },
    { dir: "journal/1997/", name: "1997-08-02.md", text: "b" },
    { dir: "journal/2026/", name: "2026-08-01.md", text: "c" },
    { dir: "", name: "page--Top.md", text: "d" }]);
  expect(clean.length).toBe(0);
  expect(Object.keys(sink).sort().join("|")).toBe("root/journal/1997/1997-03-14.md|root/journal/1997/1997-08-02.md|root/journal/2026/2026-08-01.md|root/page--Top.md");
  expect(sink["root/journal/1997/1997-08-02.md"]).toBe("b");
});

test("writeFilesTo keeps writing on both sides of a mid-list failure", async () => {
  const sink: Sink = {};
  const fails = await writeFilesTo(fakeSub("out", sink, (n) => n === "b.md"),
    [{ dir: "", name: "a.md", text: "AAA" }, { dir: "", name: "b.md", text: "BBB" }, { dir: "", name: "c.md", text: "CCC" }]);
  expect(fails.length).toBe(1);
  expect(sink["out/a.md"]).toBe("AAA");
  expect(sink["out/c.md"]).toBe("CCC");
  expect("out/b.md" in sink).toBe(false);
  const bf = await writeFilesTo(fakeSub("out", {}, (n) => n === "i.png"), [{ dir: "", name: "i.png", bytes: new Uint8Array([1]) }]);
  expect(bf[0].doc).toBe(false);
});

test("writeFilesTo removes nothing — the flat copy and the user's own files stand", async () => {
  const spareSink: Sink = { "current/2026-07-16.md": "THE ONLY COPY" };
  await writeFilesTo(fakeSub("current", spareSink, (n) => n === "2026-07-16.md"), [{ dir: "journal/2026/", name: "2026-07-16.md", text: "x" }]);
  expect(spareSink["current/2026-07-16.md"]).toBe("THE ONLY COPY");
  const vault: Sink = { "out/2019-03-04.md": "THE USER'S OWN DAILY NOTE" };
  await writeFilesTo(fakeSub("out", vault), [{ dir: "journal/2019/", name: "2019-03-04.md", text: "fresh" }]);
  expect(vault["out/2019-03-04.md"]).toBe("THE USER'S OWN DAILY NOTE");
  expect("out/journal/2019/2019-03-04.md" in vault).toBe(true);
});

test("writeBackup, dated: the archive is written before the mirror is LISTED, not merely before it writes", async () => {
  const seq: string[] = [], seqSink: Sink = {};
  function watch(sub: Dir, at: string): Dir {
    const list = sub.values, put = sub.getFileHandle, down = sub.getDirectoryHandle;
    sub.values = function () { seq.push("list " + at); return list.call(sub); };
    sub.getFileHandle = function (nm, o) { seq.push("write " + at); return put.call(sub, nm, o); };
    sub.getDirectoryHandle = function (dn) { return down.call(sub, dn).then((d) => watch(d, at + "/" + dn)); };
    return sub;
  }
  const seqDir = { getDirectoryHandle: (n: string) => Promise.resolve(watch(fakeSub(n, seqSink), n)) } as unknown as Dir;
  const failures = await writeBackup({ dir: seqDir, files: [{ name: "2026-07-16.md", dir: "journal/2026/", text: "hi", root: "journal/2026" }],
    plan: { writeMirror: true, dated: "2026-07-17", reconcile: true }, manifest: {}, archived: {}, roots: ["journal/2026"] });
  expect(failures).toEqual([]);
  expect(seqSink["current/journal/2026/2026-07-16.md"]).toBe("hi");
  const firstList = seq.indexOf("list current");
  const lastArchive = seq.lastIndexOf("write archive/journal/2026");
  expect(firstList !== -1 && lastArchive !== -1).toBe(true);
  expect(lastArchive).toBeLessThan(firstList);
  const manifestWrite = seq.lastIndexOf("write archive/manifests");
  expect(manifestWrite !== -1 && manifestWrite < firstList).toBe(true);
});

test("writeBackup: writeMirror lands files under current/, and a dated plan opens no folder of everything", async () => {
  const subWrites: Sink = {}, dirOrder: string[] = [];
  const dir = { getDirectoryHandle(name: string) { dirOrder.push(name); return Promise.resolve(fakeSub(name, subWrites)); } } as unknown as Dir;
  const quiet = console.error; console.error = () => {};
  await writeBackup({ dir, files: [{ dir: "", name: "2026-07-16.md", text: "hi" }], plan: { writeMirror: true, dated: "2026-07-17", reconcile: false } });
  console.error = quiet;
  expect(subWrites["current/2026-07-16.md"]).toBe("hi");
  expect(dirOrder.join(",")).toBe("current");
});

test("writeBackup: the relayout sweep drops only the flat copies this run just nested", async () => {
  const sweepSink: Sink = {};
  for (const k of ["current/2026-07-16.md", "current/2026-07-16-img-1.webp", "current/2019-01-01.md", "current/page--Keep.md",
    "current/page--Keep-img-1.webp", "current/page--Gone.md", "current/Keep-img-1.webp", "2026-07-17/2026-07-16.md", "2026-07-10/old.md"]) sweepSink[k] = "stale";
  await writeBackup({ dir: tierRoot(sweepSink), files: [
    { dir: "journal/2026/", name: "2026-07-16.md", text: "x", root: "journal/2026" },
    { dir: "journal/2026/", name: "2026-07-16-img-1.webp", bytes: new Uint8Array([1]), root: "journal/2026" },
    { dir: "page/", name: "Keep.md", flat: "page--Keep.md", text: "p", root: "page/Keep" },
    { dir: "page/", name: "page--Keep-img-1.webp", bytes: new Uint8Array([1]), root: "page/Keep" },
  ], plan: { writeMirror: true, dated: "2026-07-17", reconcile: false } });
  expect("current/2026-07-16.md" in sweepSink).toBe(false);
  expect("current/2026-07-16-img-1.webp" in sweepSink).toBe(false);
  expect("current/2019-01-01.md" in sweepSink).toBe(true);
  expect("current/page--Keep.md" in sweepSink).toBe(false);
  expect("current/page--Gone.md" in sweepSink).toBe(true);
  expect("current/page--Keep-img-1.webp" in sweepSink).toBe(false);
  expect("current/Keep-img-1.webp" in sweepSink).toBe(true);
  expect("2026-07-17/2026-07-16.md" in sweepSink).toBe(true);
  expect("2026-07-10/old.md" in sweepSink).toBe(true);
});

test("writeBackup: the sweep's unit of safety is the ENTRY, not the file", async () => {
  const partSink: Sink = { "current/page--Recipes.md": "the only complete copy", "current/page--Recipes-img-1.webp": "the only complete copy" };
  await writeBackup({ dir: tierRoot(partSink, (name) => name === "Recipes.md"), files: [
    { dir: "page/", name: "Recipes.md", flat: "page--Recipes.md", entry: "page--Recipes", text: "x" },
    { dir: "page/", name: "page--Recipes-img-1.webp", entry: "page--Recipes", bytes: new Uint8Array([1]) },
  ], plan: { writeMirror: true, dated: null, reconcile: false } });
  expect("current/page--Recipes.md" in partSink).toBe(true);
  expect("current/page--Recipes-img-1.webp" in partSink).toBe(true);
});

const oneTier = (sub: Dir): Dir => ({ getDirectoryHandle: () => Promise.resolve(sub) }) as unknown as Dir;

test("writeBackup: a sweep delete that genuinely fails is collected; a session-fatal one rejects", async () => {
  const stuckSink: Sink = { "current/2026-07-16.md": "locked" };
  const stuck = fakeSub("current", stuckSink);
  stuck.removeEntry = () => { const e = new Error("held open"); e.name = "NoModificationAllowedError"; return Promise.reject(e); };
  const swFails = await writeBackup({ dir: oneTier(stuck), files: [{ dir: "journal/2026/", name: "2026-07-16.md", text: "x" }], plan: { writeMirror: true, dated: null, reconcile: false } });
  expect(swFails.length).toBe(1);
  expect(swFails[0].name).toBe("2026-07-16.md");
  const fatalSink: Sink = { "current/2026-07-16.md": "locked" };
  const fatal = fakeSub("current", fatalSink);
  fatal.removeEntry = () => { const e = new Error("gone"); e.name = "NotAllowedError"; return Promise.reject(e); };
  await expect(writeBackup({ dir: oneTier(fatal), files: [{ dir: "journal/2026/", name: "2026-07-16.md", text: "x" }], plan: { writeMirror: true, dated: null, reconcile: false } })).rejects.toMatchObject({ name: "NotAllowedError" });
});

test("writeBackup: a non-fatal listing failure is collected and the landed writes stand", async () => {
  const listSink: Sink = {};
  const unlistable = fakeSub("out", listSink);
  unlistable.values = () => ({ next: () => { const e = new Error("mount dropped"); e.name = "NotFoundError"; return Promise.reject(e); } }) as unknown as AsyncIterator<never>;
  const listFails = await writeBackup({ dir: oneTier(unlistable), files: [{ dir: "journal/2026/", name: "2026-07-16.md", text: "x" }], plan: { writeMirror: true, dated: null, reconcile: false } });
  expect(listFails.length).toBe(1);
  expect(listSink["out/journal/2026/2026-07-16.md"]).toBeTruthy();
});

test("writeBackup: a no-op plan writes nothing; a mirror-only plan writes current/ and no history", async () => {
  const subWrites: Sink = {};
  const dir = tierRoot(subWrites);
  const files: ExportFile[] = [{ dir: "", name: "2026-07-16.md", text: "hi" }];
  await writeBackup({ dir, files, plan: { writeMirror: false, dated: null, reconcile: false } });
  expect(Object.keys(subWrites).length).toBe(0);
  await writeBackup({ dir, files, plan: { writeMirror: true, dated: null, reconcile: false } });
  expect(subWrites["current/2026-07-16.md"]).toBe("hi");
  expect(Object.keys(subWrites).filter((k) => /\.zip$/.test(k)).length).toBe(0);
});

test("writeBackup: one cumulative progress count spans the archives and the mirror", async () => {
  const wbProg: [number, number][] = [], subWrites: Sink = {};
  await writeBackup({ dir: tierRoot(subWrites), files: [{ name: "2026-07-16.md", dir: "journal/2026/", text: "hi", root: "journal/2026" }],
    plan: { writeMirror: true, dated: "2026-07-17", reconcile: false }, onProgress: (done, total) => wbProg.push([done, total]), archived: {} });
  expect(wbProg.length).toBe(2);
  expect(wbProg[1]).toEqual([2, 2]);
});

test("writeBackup, dedup: a second run with nothing changed writes no file at all", async () => {
  const sink: Sink = {}, log: string[] = [];
  const dir = tierRoot(sink, null, log);
  const files: ExportFile[] = [{ name: "2026-07-16.md", dir: "journal/2026/", text: "hi" }];
  const plan = { writeMirror: true, dated: null, reconcile: true };
  const manifest = {};
  await writeBackup({ dir, files, plan, manifest });
  const first = log.length;
  log.length = 0;
  await writeBackup({ dir, files, plan, manifest });
  expect(first).toBeGreaterThanOrEqual(1);
  expect(log.length).toBe(0);
});

test("writeBackup, dedup: a file skipped as unchanged still sweeps its flat twin", async () => {
  const flat: Sink = {};
  const dir = tierRoot(flat);
  const files: ExportFile[] = [{ name: "2026-07-16.md", dir: "journal/2026/", text: "hi" }];
  const plan = { writeMirror: true, dated: null, reconcile: true };
  const kept = {};
  await writeBackup({ dir, files, plan, manifest: kept });
  flat["current/2026-07-16.md"] = "hi";
  await writeBackup({ dir, files, plan, manifest: kept });
  expect("current/2026-07-16.md" in flat).toBe(false);
  expect("current/journal/2026/2026-07-16.md" in flat).toBe(true);
});

test("writeBackup, dedup: a run names the ghosts, removes them, and reports itself", async () => {
  const ghosted: Sink = {};
  const files: ExportFile[] = [{ name: "2026-07-16.md", dir: "journal/2026/", text: "hi" }];
  const plan = { writeMirror: true, dated: null, reconcile: true };
  ghosted["current/journal/2026/2026-07-15.md"] = "an entry that was re-keyed away";
  ghosted["current/journal/2026/notes.txt"] = "the reader's own file";
  const quiet = console.error; console.error = () => {};
  await writeBackup({ dir: tierRoot(ghosted), files, plan, manifest: {} });
  console.error = quiet;
  expect(lastRun!.ghosts).toContain("journal/2026/2026-07-15.md");
  expect(lastRun!.wrote).toBe(lastRun!.of);
  expect("current/journal/2026/2026-07-15.md" in ghosted).toBe(false);
  expect("current/journal/2026/2026-07-16.md" in ghosted).toBe(true);
  expect("current/journal/2026/notes.txt" in ghosted).toBe(true);
  const rooted: Sink = { "current/2026-07-15.md": "a flat copy of an entry that is gone" };
  await writeBackup({ dir: tierRoot(rooted), files, plan, manifest: {} });
  expect("current/2026-07-15.md" in rooted).toBe(true);
});

test("writeBackup, dedup: a ghost that will not delete is reported under the sweep mark", async () => {
  const held: Sink = {};
  function holdBack(sub: Dir, target: string): Dir {
    const pass = sub.removeEntry, down = sub.getDirectoryHandle;
    sub.removeEntry = (name) => { if (name !== target) return pass(name); const e = new Error("held open"); e.name = "NoModificationAllowedError"; return Promise.reject(e); };
    sub.getDirectoryHandle = (n) => down(n).then((d) => holdBack(d, target));
    return sub;
  }
  const heldDir = { getDirectoryHandle: (n: string) => Promise.resolve(holdBack(fakeSub(n, held), "2026-07-15.md")) } as unknown as Dir;
  held["current/journal/2026/2026-07-15.md"] = "a ghost a sync client is holding";
  const quiet = console.error; console.error = () => {};
  const heldFails = await writeBackup({ dir: heldDir, files: [{ name: "2026-07-16.md", dir: "journal/2026/", text: "hi" }], plan: { writeMirror: true, dated: null, reconcile: true }, manifest: {} });
  console.error = quiet;
  expect(heldFails.some((f) => f.name === "journal/2026/2026-07-15.md")).toBe(true);
  expect(heldFails.every((f) => f.sweep)).toBe(true);
});

// read a zip back through its CENTRAL DIRECTORY, the structure unzip trusts
interface Member { name: string; madeBy: number; attrs: number; method: number; crc: number; size: number; utf8: boolean; data: Uint8Array }
function readZip(bytes: Uint8Array): Member[] {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= 0; i--) if (dv.getUint32(i, true) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error("no end-of-central-directory record");
  const n = dv.getUint16(end + 10, true), out: Member[] = [];
  let at = dv.getUint32(end + 16, true);
  if (dv.getUint32(end + 12, true) !== end - at) throw new Error("the central directory's size disagrees with its offset");
  for (let i = 0; i < n; i++) {
    if (dv.getUint32(at, true) !== 0x02014b50) throw new Error("central record " + i + " has no signature");
    const nameLen = dv.getUint16(at + 28, true), lho = dv.getUint32(at + 42, true);
    if (dv.getUint32(lho, true) !== 0x04034b50) throw new Error("local header " + i + " has no signature");
    const dataAt = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
    out.push({
      name: new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLen)),
      madeBy: dv.getUint16(at + 4, true), attrs: dv.getUint32(at + 38, true), method: dv.getUint16(at + 10, true),
      crc: dv.getUint32(at + 16, true), size: dv.getUint32(at + 24, true), utf8: !!(dv.getUint16(at + 8, true) & 0x800),
      data: bytes.subarray(dataAt, dataAt + dv.getUint32(at + 20, true)),
    });
    at += 46 + nameLen + dv.getUint16(at + 30, true) + dv.getUint16(at + 32, true);
  }
  return out;
}
async function unpackMember(m: Member): Promise<Uint8Array> {
  if (m.method === 0) return m.data;
  const inflated = new Blob([m.data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(inflated).arrayBuffer());
}

test("zipBytes mints members a real unpacker reads back whole", async () => {
  const day = "2026-08-18";
  const files: ExportFile[] = [
    { name: "Emma.md", dir: "bookshelf/Austen/", text: "call me Emma" },
    { name: "pic.webp", dir: "bookshelf/Austen/", bytes: new Uint8Array([0, 255, 13, 10, 26, 0]) },
  ];
  const members = readZip(await zipBytes(files, day));
  expect(members.map((m) => m.name).join("|")).toBe("bookshelf/Austen/Emma.md|bookshelf/Austen/pic.webp");
  expect(new TextDecoder().decode(await unpackMember(members[0]))).toBe("call me Emma");
  expect(Array.from(await unpackMember(members[1])).join(",")).toBe("0,255,13,10,26,0");
  expect(members[0].crc).toBe(crc32(new TextEncoder().encode("call me Emma")));
  expect(members[0].size).toBe(12);
  const one = readZip(await zipBytes([{ name: "café.md", dir: "page/", text: "x" }], day))[0];
  expect(one.name).toBe("page/café.md");
  expect(one.utf8).toBe(true);
  expect(one.madeBy >> 8).toBe(3);
  expect(one.attrs >>> 16).toBe(0x81A4);
  let deep = "page/";
  while (deep.length < 120) deep += "Averylongsegment/";
  const far = readZip(await zipBytes([{ name: "leaf.md", dir: deep, text: "deep" }], day))[0];
  expect(far.name.length > 100).toBe(true);
  expect(new TextDecoder().decode(await unpackMember(far))).toBe("deep");
  const empty = readZip(await zipBytes([{ name: "empty.bin", dir: "", bytes: new Uint8Array(0) }], day))[0];
  expect(empty.name).toBe("empty.bin");
  expect(empty.size).toBe(0);
  expect(empty.method).toBe(0);
});

test("writeBackup, dated: a changed root archives once a day; a quiet one is skipped without a listing", async () => {
  const sink: Sink = {};
  let dirOrder: string[] = [], listed: string[] = [];
  function dir(): Dir {
    dirOrder = []; listed = [];
    return { getDirectoryHandle(n: string) {
      dirOrder.push(n);
      const sub = fakeSub(n, sink), walk = sub.values;
      sub.values = function () { listed.push(n); return walk.call(sub); };
      return Promise.resolve(sub);
    } } as unknown as Dir;
  }
  const files: ExportFile[] = [
    { name: "2026-07-16.md", dir: "journal/2026/", text: "day", root: "journal/2026", entry: "2026-07-16" },
    { name: "Emma.md", dir: "bookshelf/Austen/", text: "book", root: "bookshelf/Austen", entry: "bookshelf--Austen--Emma" },
  ];
  const zips = () => Object.keys(sink).filter((k) => /\.zip$/.test(k)).sort();
  const archived: Record<string, { sig: string; at?: string }> = {};
  await writeBackup({ dir: dir(), files, plan: { writeMirror: true, dated: "2026-07-17", reconcile: false }, archived });
  expect(zips().join("|")).toBe("archive/bookshelf/Austen/2026-07-17.zip|archive/journal/2026/2026-07-17.zip");
  expect("2026-07-17/journal/2026/2026-07-16.md" in sink).toBe(false);
  expect(sink["current/journal/2026/2026-07-16.md"]).toBe("day");
  expect(dirOrder.indexOf("current") > dirOrder.indexOf("archive")).toBe(true);
  const members = readZip(sink["archive/bookshelf/Austen/2026-07-17.zip"] as Uint8Array);
  expect(members.map((m) => m.name).sort().join("|")).toBe("bookshelf/Austen/Emma.md");
  const lastArchives = lastRun!.archives.slice();
  await writeBackup({ dir: dir(), files, plan: { writeMirror: true, dated: "2026-07-18", reconcile: false }, archived });
  expect(zips().join("|")).toBe("archive/bookshelf/Austen/2026-07-17.zip|archive/journal/2026/2026-07-17.zip");
  expect(listed.filter((n) => n !== "current").join("|")).toBe("");
  const stuck: Sink = {}, fresh = {};
  const fussy = tierRoot(stuck, (name) => /\.zip$/.test(name));
  const failures = await writeBackup({ dir: fussy, files, plan: { writeMirror: true, dated: "2026-07-17", reconcile: false }, archived: fresh });
  expect(failures.length).toBe(2);
  expect(Object.keys(fresh).length).toBe(0);
  expect(archived["bookshelf/Austen"].at).toBe("archive/bookshelf/Austen/2026-07-17.zip");
  expect(lastArchives.sort().join("|")).toBe("archive/bookshelf/Austen/2026-07-17.zip|archive/journal/2026/2026-07-17.zip");
  expect(Object.keys(sink).map((k) => k.split("/")[0]).filter((n, i, a) => a.indexOf(n) === i).sort().join("|")).toBe("archive|current");
});

test("writeBackup, dated: the day's manifest records which roots existed, and only on a clean day", async () => {
  const sink: Sink = {};
  const dir = tierRoot(sink);
  const day: ExportFile = { name: "2026-07-16.md", dir: "journal/2026/", text: "day", root: "journal/2026", entry: "2026-07-16" };
  const book: ExportFile = { name: "Emma.md", dir: "bookshelf/Austen/", text: "book", root: "bookshelf/Austen", entry: "bookshelf--Austen--Emma" };
  const both = ["bookshelf/Austen", "journal/2026"];
  const archived = {};
  const manifestOn = (d: string) => { const raw = sink["archive/manifests/" + d + ".txt"]; return raw === undefined ? undefined : new TextDecoder().decode(raw as Uint8Array); };
  await writeBackup({ dir, files: [day, book], plan: { writeMirror: true, dated: "2026-07-17", reconcile: false }, archived, roots: both });
  expect(manifestOn("2026-07-17")).toBe("bookshelf/Austen\tarchive/bookshelf/Austen/2026-07-17.zip\njournal/2026\tarchive/journal/2026/2026-07-17.zip\n");
  await writeBackup({ dir, files: [day, book], plan: { writeMirror: true, dated: "2026-07-18", reconcile: false }, archived, roots: both });
  expect(manifestOn("2026-07-18")).toBe("bookshelf/Austen\tarchive/bookshelf/Austen/2026-07-17.zip\njournal/2026\tarchive/journal/2026/2026-07-17.zip\n");
  await writeBackup({ dir, files: [day], plan: { writeMirror: true, dated: "2026-07-19", reconcile: false }, archived, roots: ["journal/2026"] });
  expect(manifestOn("2026-07-19")).toBe("journal/2026\tarchive/journal/2026/2026-07-17.zip\n");
  expect("archive/bookshelf/Austen/2026-07-17.zip" in sink).toBe(true);
  await writeBackup({ dir, files: [day], plan: { writeMirror: true, dated: "2026-07-21", reconcile: false }, archived, roots: both });
  expect(manifestOn("2026-07-21")).toBe("bookshelf/Austen\tarchive/bookshelf/Austen/2026-07-17.zip\njournal/2026\tarchive/journal/2026/2026-07-17.zip\n");
  const bare: Sink = {};
  const quiet = console.error; console.error = () => {};
  await writeBackup({ dir: tierRoot(bare), files: [{ dir: "", name: "2026-07-16.md", text: "hi" }], plan: { writeMirror: true, dated: "2026-07-20", reconcile: false }, archived: {}, roots: [] });
  console.error = quiet;
  expect(Object.keys(bare).filter((k) => k.indexOf("archive/") === 0).join("|")).toBe("");
  const stuck: Sink = {};
  await writeBackup({ dir: tierRoot(stuck, (name) => /\.zip$/.test(name)), files: [day, book], plan: { writeMirror: true, dated: "2026-07-22", reconcile: false }, archived: {}, roots: both });
  expect("archive/manifests/2026-07-22.txt" in stuck).toBe(false);
  const noText: Sink = {};
  const mFails = await writeBackup({ dir: tierRoot(noText, (name) => /\.txt$/.test(name)), files: [day], plan: { writeMirror: true, dated: "2026-07-23", reconcile: false }, archived: {}, roots: ["journal/2026"] });
  expect(mFails.filter((x) => /\.txt$/.test(x.name)).map((x) => String(x.doc)).join("|")).toBe("false");
});

test("zipBytes yields to the task queue on a large root; a small one never pays for it", async () => {
  let beats = 0;
  const stop = setYieldWatch(() => { beats++; });
  try {
    await zipBytes([{ name: "part.md", dir: "bookshelf/Austen/", text: "the quick brown fox jumps over it ".repeat(16000) }], "2026-08-18");
    expect(beats).toBeGreaterThan(0);
  } finally { stop(); }
  let quiet = 0;
  const off = setYieldWatch(() => { quiet++; });
  try {
    await zipBytes([{ name: "a.md", dir: "page/", text: "short" }], "2026-08-18");
    expect(quiet).toBe(0);
  } finally { off(); }
});
