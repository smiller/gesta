import { test, expect } from "vitest";
import { stored } from "./local.ts";

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
