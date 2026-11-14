import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { loadState, refuseCold, loadPins } from "./journalLoad.ts";

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

const LOADING = { warmed: false, storeReadFailed: false, storeReadError: null };
const FAILED = { warmed: false, storeReadFailed: true, storeReadError: new Error("blocked") };
const IN = { warmed: true, storeReadFailed: false, storeReadError: null };

test("the journal's load is loading, failed or in", () => {
  expect([LOADING, FAILED, IN].map(loadState)).toEqual(["loading", "failed", "in"]);
});

test("an act refused while the journal loads says so, and once the read has failed says to reload, never that it is still loading", () => {
  const said: string[] = [];
  const say = (t: string): void => { said.push(t); };
  expect(refuseCold(LOADING, say)).toBe(true);
  expect(refuseCold(FAILED, say)).toBe(true);
  expect(refuseCold(IN, say)).toBe(false);
  expect(said).toEqual(["still loading — try that again in a moment", "couldn’t load entries — reload first"]);
});

function rig() {
  const stuck: string[] = [], errs: unknown[] = [], released: number[] = [];
  const pins = loadPins(8000, {
    stick: (text) => { stuck.push(text); return stuck.length; },
    stickErr: (text, err) => { stuck.push(text); errs.push(err); return stuck.length; },
    releasePin: (gen) => { released.push(gen); },
  });
  return { pins, stuck, errs, released };
}

test("a load still out after its patience pins the words to reload, and its landing lifts them", () => {
  const r = rig();
  r.pins.start();
  vi.advanceTimersByTime(7999);
  expect(r.stuck).toEqual([]);
  vi.advanceTimersByTime(1);
  expect(r.stuck).toEqual(["couldn’t load entries — reload"]);
  r.pins.landed(IN);
  expect(r.released).toEqual([1]);
});

test("a load that lands in time says nothing, and a start after the landing arms nothing", () => {
  const r = rig();
  r.pins.start();
  r.pins.landed(IN);
  r.pins.start();
  vi.advanceTimersByTime(20000);
  expect(r.stuck).toEqual([]);
});

test("a read that failed pins that the store could not be read, with its error to copy", () => {
  const r = rig();
  r.pins.start();
  r.pins.landed(FAILED);
  expect(r.stuck).toEqual(["the store could not be read — reload"]);
  expect(r.errs).toEqual([FAILED.storeReadError]);
});
