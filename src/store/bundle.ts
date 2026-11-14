import { entryKey } from "./keys.ts";
import { importTarget } from "./names.ts";
import type { ImageStore, KeyedStore } from "./store.ts";

/* `at` is the member's local header, `end` where the next member starts */
export interface Member { path: string; method: number; at: number; end: number; size: number }
export interface Bundle {
  entries: Record<string, string>;
  pictures: Record<string, Member>;
  /* members that are neither an entry nor a picture an entry could name */
  skipped: number;
  /* when the bundle was written, from the zip's comment; null where it has none */
  written: number | null;
}
const EOCD = 0x06054b50, CENTRAL = 0x02014b50, LOCAL = 0x04034b50;
const decoder = new TextDecoder();
const bytesOf = (b: Blob): Promise<Uint8Array> => b.arrayBuffer().then((buf) => new Uint8Array(buf));
/* the end record and the central directory read from the file's tail alone,
   the members in file order */
const viewOf = (b: Uint8Array): DataView => new DataView(b.buffer, b.byteOffset, b.byteLength);
function endRecordAt(tail: Uint8Array): number {
  const dv = viewOf(tail);
  for (let i = tail.length - 22; i >= 0; i--) if (dv.getUint32(i, true) === EOCD) return i;
  throw new Error("not a zip file");
}
const directoryDamaged = (): Error => new Error("the zip’s directory is damaged");
function centralMembers(cd: Uint8Array, n: number, cdAt: number): Member[] {
  const cv = viewOf(cd), members: Member[] = [];
  let at = 0;
  for (let i = 0; i < n; i++) {
    if (at + 46 > cd.length) throw directoryDamaged();
    if (cv.getUint32(at, true) !== CENTRAL) throw directoryDamaged();
    const nameLen = cv.getUint16(at + 28, true);
    members.push({
      path: decoder.decode(cd.subarray(at + 46, at + 46 + nameLen)),
      method: cv.getUint16(at + 10, true), at: cv.getUint32(at + 42, true), end: cdAt,
      size: cv.getUint32(at + 20, true),
    });
    at += 46 + nameLen + cv.getUint16(at + 30, true) + cv.getUint16(at + 32, true);
  }
  members.sort((a, b) => a.at - b.at);
  for (let i = 0; i + 1 < members.length; i++) members[i].end = members[i + 1].at;
  return members;
}
export function zipDirectory(file: Blob): Promise<{ members: Member[]; comment: string }> {
  const from = Math.max(0, file.size - 22 - 0xFFFF);
  return bytesOf(file.slice(from)).then((tail) => {
    const end = endRecordAt(tail), dv = viewOf(tail);
    const n = dv.getUint16(end + 10, true), cdSize = dv.getUint32(end + 12, true), cdAt = dv.getUint32(end + 16, true);
    const comment = decoder.decode(tail.subarray(end + 22, end + 22 + dv.getUint16(end + 20, true)));
    if (cdAt + cdSize > file.size) throw directoryDamaged();
    return bytesOf(file.slice(cdAt, cdAt + cdSize)).then((cd) => ({ members: centralMembers(cd, n, cdAt), comment }));
  });
}
/* a member's packed bytes out of a chunk read from `base`: the local
   header's own name and extra lengths say where its data starts, an extra
   field there being free to differ from the directory's */
export function memberData(chunk: Uint8Array, base: number, m: Member): Uint8Array {
  const o = m.at - base, dv = viewOf(chunk);
  const damaged = (): Error => new Error("the zip’s member " + m.path + " is damaged");
  if (o < 0 || o + 30 > chunk.length) throw damaged();
  if (dv.getUint32(o, true) !== LOCAL) throw damaged();
  const from = o + 30 + dv.getUint16(o + 26, true) + dv.getUint16(o + 28, true);
  if (from + m.size > chunk.length) throw damaged();
  return chunk.subarray(from, from + m.size);
}
export function inflated(m: Member, packed: Uint8Array): Promise<Uint8Array> {
  if (m.method === 0) return Promise.resolve(packed);
  if (m.method !== 8) return Promise.reject(new Error(m.path + " is packed in a way this page cannot read"));
  return new Response(new Blob([packed as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw")))
    .arrayBuffer().then((buf) => new Uint8Array(buf));
}
/* MEASURED in headless Helium over the whole backup (14,229 entries): 64
   at once opened it in 1.9 s, one at a time in 2.4 s */
const AT_ONCE = 64;
/* a run of entries next to each other in the file is read in one slice
   up to this size; the pictures between runs are never read here */
const RUN_BYTES = 1 << 20;
/* every entry's text by its key (pin: bundle.test › readBundle keys every
   entry); a picture is kept as its place in the file, read when an entry
   shows it */
type Run = { key: string; m: Member }[];
type Progress = (done: number, total: number) => void;
const notPicture = (path: string): boolean => /\.md$/i.test(path) || path.endsWith("/");
const runFull = (run: Run, m: Member): boolean => run.length >= AT_ONCE || m.end - run[0].m.at > RUN_BYTES;
function planRuns(members: Member[]): { runs: Run[]; pictures: Record<string, Member>; skipped: number } {
  const pictures: Record<string, Member> = Object.create(null), runs: Run[] = [];
  let run: Run = [], skipped = 0;
  const close = (): void => { if (run.length) runs.push(run); run = []; };
  for (const m of members) {
    const t = importTarget(m.path);
    if (!t) {
      close();
      if (notPicture(m.path)) skipped++;
      else pictures[m.path] = m;
      continue;
    }
    if (run.length && runFull(run, m)) close();
    run.push({ key: entryKey(t.date, t.tag), m });
  }
  close();
  return { runs, pictures, skipped };
}
function readRuns(file: Blob, runs: Run[], onProgress?: Progress): Promise<Record<string, string>> {
  const entries: Record<string, string> = Object.create(null);
  const total = runs.reduce((n, r) => n + r.length, 0);
  let done = 0;
  const next = (i: number): Promise<void> => {
    if (i >= runs.length) return Promise.resolve();
    const r = runs[i], base = r[0].m.at;
    return bytesOf(file.slice(base, r[r.length - 1].m.end)).then((chunk) =>
      Promise.all(r.map(({ key, m }) => inflated(m, memberData(chunk, base, m)).then((raw) => { entries[key] = decoder.decode(raw); }))))
      .then(() => { done += r.length; onProgress?.(done, total); return next(i + 1); });
  };
  return next(0).then(() => entries);
}
export function readBundle(file: Blob, onProgress?: Progress): Promise<Bundle> {
  return zipDirectory(file).then(({ members, comment }) => {
    const { runs, pictures, skipped } = planRuns(members);
    const written = Date.parse(comment);
    return readRuns(file, runs, onProgress).then((entries) => ({ entries, pictures, skipped, written: isNaN(written) ? null : written }));
  });
}
/* the pictures, read from the file as an entry asks for one; nothing is
   ever written here */
export function bundleImages(file: Blob, pictures: Record<string, Member>): ImageStore {
  return {
    get: (id) => {
      const m = pictures[id];
      if (!m) return Promise.resolve(null);
      return bytesOf(file.slice(m.at, m.end)).then((chunk) => inflated(m, memberData(chunk, m.at, m))).then((bytes) => ({ id, bytes }));
    },
    set: () => Promise.reject(new Error("the reader keeps no pictures of its own")),
    del: () => Promise.reject(new Error("the reader keeps no pictures of its own")),
    keys: () => Promise.resolve(Object.keys(pictures)),
    clear: () => Promise.resolve(),
  };
}
export const READER_DB = "gesta.reader";
export const READER_STORE = "bundle";
export interface BundleRow { k: string; file: Blob; name: string; modified: number }
/* the one picked file, kept whole in this browser until the next pick */
export function bundleKeeper(store: KeyedStore<BundleRow>): { get(): Promise<BundleRow | null>; keep(file: File): Promise<void> } {
  return {
    get: () => store.get("zip"),
    keep: (file) => store.put({ k: "zip", file, name: file.name, modified: file.lastModified }),
  };
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function heldLabel(modified: number): string {
  const d = new Date(modified), two = (n: number) => String(n).padStart(2, "0");
  return "backup of " + d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear() + ", " + two(d.getHours()) + ":" + two(d.getMinutes());
}
