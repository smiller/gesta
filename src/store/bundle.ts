import { entryKey } from "./keys.ts";
import { importTarget } from "./names.ts";
import type { ImageStore, KeyedStore } from "./store.ts";

export interface Member { path: string; method: number; at: number; size: number }
export interface Bundle {
  entries: Record<string, string>;
  pictures: Record<string, Member>;
  /* members that are neither an entry nor a picture an entry could name */
  skipped: number;
}
const EOCD = 0x06054b50, CENTRAL = 0x02014b50, LOCAL = 0x04034b50;
const decoder = new TextDecoder();
/* the central directory read for every member's place, the local header for
   where its data starts: an extra field there is the writer's to add */
export function zipMembers(bytes: Uint8Array): Member[] {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xFFFF); i--) if (dv.getUint32(i, true) === EOCD) { end = i; break; }
  if (end < 0) throw new Error("not a zip file");
  const n = dv.getUint16(end + 10, true), out: Member[] = [];
  let at = dv.getUint32(end + 16, true);
  for (let i = 0; i < n; i++) {
    if (at + 46 > bytes.length || dv.getUint32(at, true) !== CENTRAL) throw new Error("the zip's directory is damaged");
    const nameLen = dv.getUint16(at + 28, true), lho = dv.getUint32(at + 42, true);
    if (lho + 30 > bytes.length || dv.getUint32(lho, true) !== LOCAL) throw new Error("the zip's member " + (i + 1) + " is damaged");
    out.push({
      path: decoder.decode(bytes.subarray(at + 46, at + 46 + nameLen)),
      method: dv.getUint16(at + 10, true),
      at: lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true),
      size: dv.getUint32(at + 20, true),
    });
    at += 46 + nameLen + dv.getUint16(at + 30, true) + dv.getUint16(at + 32, true);
  }
  return out;
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
/* every entry's text, keyed as the import keys it; a picture is kept as
   its place in the file, read when an entry shows it */
export function readBundle(bytes: Uint8Array, onProgress?: (done: number, total: number) => void): Promise<Bundle> {
  let members: Member[];
  try { members = zipMembers(bytes); } catch (err) { return Promise.reject(err); }
  const entries: Record<string, string> = Object.create(null), pictures: Record<string, Member> = Object.create(null);
  const docs: { key: string; m: Member }[] = [];
  let skipped = 0;
  for (const m of members) {
    const t = importTarget(m.path);
    if (t) docs.push({ key: entryKey(t.date, t.tag), m });
    else if (/\.md$/i.test(m.path) || m.path.endsWith("/")) skipped++;
    else pictures[m.path] = m;
  }
  let done = 0;
  const batch = (from: number): Promise<void> => {
    if (from >= docs.length) return Promise.resolve();
    return Promise.all(docs.slice(from, from + AT_ONCE).map(({ key, m }) =>
      inflated(m, bytes.subarray(m.at, m.at + m.size)).then((raw) => { entries[key] = decoder.decode(raw); })))
      .then(() => { done = Math.min(docs.length, from + AT_ONCE); onProgress?.(done, docs.length); return batch(from + AT_ONCE); });
  };
  return batch(0).then(() => ({ entries, pictures, skipped }));
}
/* the pictures, read from the file as an entry asks for one; nothing is
   ever written here */
export function bundleImages(file: Blob, pictures: Record<string, Member>): ImageStore {
  return {
    get: (id) => {
      const m = pictures[id];
      if (!m) return Promise.resolve(null);
      return file.slice(m.at, m.at + m.size).arrayBuffer().then((buf) => inflated(m, new Uint8Array(buf))).then((bytes) => ({ id, bytes }));
    },
    set: () => Promise.reject(new Error("the reader keeps no pictures of its own")),
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
