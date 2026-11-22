import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { loadState, refuseCold, loadErrors } from "./journalLoad.ts";
import { asSaid, alertWords, type ErrorOwner, type Raise } from "../model/alertText.ts";

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
  const raise = ((a, b, c) => { said.push(alertWords(asSaid(a, b, c)[0])); }) as Raise;
  expect(refuseCold(LOADING, raise)).toBe(true);
  expect(refuseCold(FAILED, raise)).toBe(true);
  expect(refuseCold(IN, raise)).toBe(false);
  expect(said).toEqual(["still loading — try that again in a moment", "couldn’t load entries — reload first"]);
});

function rig() {
  const stuck: string[] = [], errs: unknown[] = [], released: number[] = [];
  const watch = loadErrors(8000, {
    raise: ((a, b, c) => { const [s, from] = asSaid(a, b, c); stuck.push(alertWords(s)); if ("caught" in from) errs.push(from.caught); }) as ErrorOwner["raise"],
    resolve: () => { if (stuck.length > released.length) released.push(stuck.length); },
  });
  return { watch, stuck, errs, released };
}

test("a load still out after its patience raises an error saying to reload, and its landing lifts them", () => {
  const r = rig();
  r.watch.start();
  vi.advanceTimersByTime(7999);
  expect(r.stuck).toEqual([]);
  vi.advanceTimersByTime(1);
  expect(r.stuck).toEqual(["couldn’t load entries — reload"]);
  r.watch.landed(IN);
  expect(r.released).toEqual([1]);
});

test("a load that lands in time says nothing, and a start after the landing arms nothing", () => {
  const r = rig();
  r.watch.start();
  r.watch.landed(IN);
  r.watch.start();
  vi.advanceTimersByTime(20000);
  expect(r.stuck).toEqual([]);
});

test("a read that failed raises an error that the store could not be read, with its error to copy", () => {
  const r = rig();
  r.watch.start();
  r.watch.landed(FAILED);
  expect(r.stuck).toEqual(["the store could not be read — reload"]);
  expect(r.errs).toEqual([FAILED.storeReadError]);
});
