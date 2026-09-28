import { test, expect } from "vitest";
import { stored, readRaw, writeRaw } from "./local.ts";

const parse = (raw: string | null): string[] => { try { const v = JSON.parse(raw || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };

test("stored: a storage that throws reads as empty and writes nothing, without throwing", () => {
  const broken = () => ({ getItem: (): string | null => { throw new Error("SecurityError"); }, setItem: (): void => { throw new Error("QuotaExceeded"); } });
  const s = stored("k", parse, broken);
  expect(s.read()).toEqual([]);
  expect(() => s.write((v) => [...v, "x"])).not.toThrow();
  const unreachable = () => { throw new Error("no localStorage in this context"); };
  expect(stored("k", parse, unreachable).read()).toEqual([]);
  expect(() => stored("k", parse, unreachable).write((v) => v)).not.toThrow();
});
test("stored: a write is read, change and put back, over what the storage holds", () => {
  const box: Record<string, string> = { k: '["a"]' };
  const mem = () => ({ getItem: (k: string) => box[k] ?? null, setItem: (k: string, v: string) => { box[k] = v; } });
  const s = stored("k", parse, mem);
  s.write((v) => [...v, "b"]);
  expect(s.read()).toEqual(["a", "b"]);
  expect(box.k).toBe('["a","b"]');
});
test("readRaw: an absent key is null, a storage that throws is undefined — unreadable, not empty", () => {
  const box: Record<string, string> = { k: "v" };
  const mem = () => ({ getItem: (k: string) => box[k] ?? null, setItem: (k: string, v: string) => { box[k] = v; }, removeItem: (k: string) => { delete box[k]; } });
  expect(readRaw("k", mem)).toBe("v");
  expect(readRaw("absent", mem)).toBe(null);
  const broken = () => { throw new Error("SecurityError"); };
  expect(readRaw("k", broken)).toBe(undefined);
});
test("writeRaw: a value set, null removes, a storage that throws reports false without throwing", () => {
  const box: Record<string, string> = {};
  const mem = () => ({ getItem: (k: string) => box[k] ?? null, setItem: (k: string, v: string) => { box[k] = v; }, removeItem: (k: string) => { delete box[k]; } });
  expect(writeRaw("k", "1", mem)).toBe(true);
  expect(box.k).toBe("1");
  expect(writeRaw("k", null, mem)).toBe(true);
  expect("k" in box).toBe(false);
  expect(writeRaw("k", "1", () => { throw new Error("blocked"); })).toBe(false);
});
