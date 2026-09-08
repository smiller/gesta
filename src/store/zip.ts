/* The zip byte format: one member's checksum and header pair, and the
   deflate. Ported 2026-09-07 from ../writer/src/js/zip.mjs, and KEPT
   hand-rolled where the plan's inventory said fflate: it is 99 lines with
   two measured decisions (the host byte and the mode below) a library
   would have to be checked against, and the tests read the archive back
   through the engine's own DecompressionStream. */
import { utf8 } from "./names.ts";

/* the checksum every unpacker verifies. Table-driven and built once — the
   corpus runs to 180 MB, where the bit-at-a-time form is eight times the
   work. Int32Array because the shifts are signed; the result forced
   unsigned, a zip field being unsigned. */
let CRC_TABLE: Int32Array | null = null;
export function crc32(bytes: Uint8Array): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      CRC_TABLE[i] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < bytes.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ bytes[i]) & 0xFF];
  return (c ^ -1) >>> 0;
}
/* BIT 11 SAYS THE NAME IS UTF-8: most entries carry accents, and without it
   an unpacker reads those names in the DOS code page — a different entry
   KEY on the way back in */
export const ZIP_UTF8 = 0x800;
export const ZIP_VERSION = 20;
/* THE HOST BYTE DECIDES THE NAME'S CHARSET for the commonest extractor, and
   bit 11 does not override it. MEASURED 2026-08-18 against /usr/bin/unzip:
   host 0 (MS-DOS) dropped every non-ASCII member with "Illegal byte
   sequence" and EXITED 0. Host 3 is Unix — and then the high half of the
   external attributes is the file mode, which left zero extracts every
   file mode 000. */
export const ZIP_HOST_UNIX = 3;
export const ZIP_FILE_MODE = 0x81A40000;
/* one member's two headers, SPELLED TOGETHER because they must agree field
   for field. `stored` is the deflated bytes or `raw` ITSELF when deflating
   would have grown them, so identity says which and the two cannot
   disagree. */
export function emitZipEntry(path: string, raw: Uint8Array, stored: Uint8Array, day: number, at: number): { local: Uint8Array; central: Uint8Array } {
  const name = utf8.encode(path), crc = crc32(raw);
  const method = stored === raw ? 0 : 8;
  function head(size: number, extra: number): { bytes: Uint8Array; view: DataView } {
    const b = new Uint8Array(size + name.length), v = new DataView(b.buffer);
    v.setUint16(extra + 0, ZIP_VERSION, true);
    v.setUint16(extra + 2, ZIP_UTF8, true);
    v.setUint16(extra + 4, method, true);
    v.setUint16(extra + 6, 0, true);   /* the time half is always zero */
    v.setUint16(extra + 8, day, true);
    v.setUint32(extra + 10, crc, true);
    v.setUint32(extra + 14, stored.length, true);
    v.setUint32(extra + 18, raw.length, true);
    v.setUint16(extra + 22, name.length, true);
    b.set(name, size);
    return { bytes: b, view: v };
  }
  const local = head(30, 4);
  local.view.setUint32(0, 0x04034b50, true);
  const central = head(46, 6);
  central.view.setUint32(0, 0x02014b50, true);
  central.view.setUint16(4, (ZIP_HOST_UNIX << 8) | ZIP_VERSION, true);
  central.view.setUint32(38, ZIP_FILE_MODE, true);
  central.view.setUint32(42, at, true);
  return { local: local.bytes, central: central.bytes };
}
/* deflate through the engine's own CompressionStream, consumed WHOLE by
   Response: a hand-pumped reader left write() and close() unobserved, two
   unattributed rejections per file */
export function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  return new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream("deflate-raw")))
    .arrayBuffer().then((buf) => new Uint8Array(buf));
}
