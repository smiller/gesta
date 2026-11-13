import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { loadPatience } from "./loadPatience.ts";

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

function rig() {
  const pinned: string[] = [], released: number[] = [];
  const p = loadPatience(8000, { stick: (text) => { pinned.push(text); return pinned.length; }, releasePin: (gen) => { released.push(gen); } });
  return { p, pinned, released };
}

test("a load still out after its patience pins the words to reload, and its end lifts them", () => {
  const r = rig();
  r.p.start();
  vi.advanceTimersByTime(7999);
  expect(r.pinned).toEqual([]);
  vi.advanceTimersByTime(1);
  expect(r.pinned).toEqual(["couldn't load entries — reload"]);
  r.p.done();
  expect(r.released).toEqual([1]);
});

test("a load that ends in time says nothing, and a start after the end arms nothing", () => {
  const r = rig();
  r.p.start();
  r.p.done();
  r.p.start();
  vi.advanceTimersByTime(20000);
  expect(r.pinned).toEqual([]);
  expect(r.released).toEqual([]);
});
