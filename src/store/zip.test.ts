// The zip byte format an unpacker sees, ported 2026-09-07 from ../writer/src/js/zip.test.mjs.
import { test, expect } from "vitest";
import { utf8 } from "./names.ts";
import { crc32, emitZipEntry, deflateRaw } from "./zip.ts";

test("crc32 matches the standard check vector, and empty input is zero", () => {
  expect(crc32(utf8.encode("123456789"))).toBe(0xCBF43926);
  expect(crc32(new Uint8Array(0))).toBe(0);
});

test("emitZipEntry: the header pair agrees, and identity says stored-vs-deflated", () => {
  const raw = utf8.encode("héllo.md content");
  const e = emitZipEntry("journal/2026/héllo.md", raw, raw, 0x5911, 1234);
  const name = utf8.encode("journal/2026/héllo.md");
  const lv = new DataView(e.local.buffer), cv = new DataView(e.central.buffer);
  expect(lv.getUint32(0, true)).toBe(0x04034b50);
  expect(cv.getUint32(0, true)).toBe(0x02014b50);
  expect(e.local.slice(4, 28)).toEqual(e.central.slice(6, 30));
  expect(lv.getUint16(8, true)).toBe(0);
  expect(lv.getUint16(6, true)).toBe(0x800);
  expect(lv.getUint16(10, true)).toBe(0);
  expect(lv.getUint16(12, true)).toBe(0x5911);
  expect(lv.getUint32(14, true)).toBe(crc32(raw));
  expect(lv.getUint32(18, true)).toBe(raw.length);
  expect(lv.getUint32(22, true)).toBe(raw.length);
  expect(lv.getUint16(26, true)).toBe(name.length);
  expect(e.local.slice(30)).toEqual(name);
  expect(e.central.slice(46)).toEqual(name);
  expect(cv.getUint16(4, true)).toBe((3 << 8) | 20);
  expect(cv.getUint32(38, true)).toBe(0x81A40000);
  expect(cv.getUint32(42, true)).toBe(1234);
});

test("emitZipEntry: a distinct stored buffer means method 8, deflated", () => {
  const raw = utf8.encode("aaaaaaaaaaaaaaaaaaaaaaaa");
  const packed = utf8.encode("shorter");
  const e = emitZipEntry("a.md", raw, packed, 0x5911, 0);
  const lv = new DataView(e.local.buffer);
  expect(lv.getUint16(8, true)).toBe(8);
  expect(lv.getUint32(14, true)).toBe(crc32(raw));
  expect(lv.getUint32(18, true)).toBe(packed.length);
  expect(lv.getUint32(22, true)).toBe(raw.length);
});

test("deflateRaw round-trips, and deflating nothing produces more than nothing", async () => {
  const raw = utf8.encode("the corpus line, twice: the corpus line, twice.");
  const packed = await deflateRaw(raw);
  const back = new Uint8Array(await new Response(new Blob([packed as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
  expect(back).toEqual(raw);
  expect((await deflateRaw(new Uint8Array(0))).length).toBeGreaterThan(0);
});
