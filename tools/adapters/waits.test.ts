import { test, expect, vi, afterEach } from "vitest";
import { expected, nothingCame, ranOutLine, ranOutCounts } from "./waits.ts";

const timeout = (): Error => Object.assign(new Error("Timeout 5000ms exceeded."), { name: "TimeoutError" });
afterEach(() => { vi.restoreAllMocks(); });

test("a wait that ran out prints its one line, naming what it waited for and what stood, and answers that nothing came", async () => {
  const said = vi.spyOn(console, "log").mockImplementation(() => {});
  expect(await expected("entry", 5000, () => Promise.reject(timeout()), async () => ({ entry: "2026-09-06" }))).toBe(false);
  expect(await expected("save", 3000, () => Promise.resolve(1))).toBe(true);
  expect(said.mock.calls).toEqual([["an entry's wait ran out after 5000 ms: {\"entry\":\"2026-09-06\"}"]]);
});

test("a wait that failed otherwise than by running out fails its step", async () => {
  await expect(expected("entry", 5000, () => Promise.reject(new Error("Target closed")))).rejects.toThrow("Target closed");
});

test("a wait for what should not come answers whether it came, and prints nothing", async () => {
  const said = vi.spyOn(console, "log").mockImplementation(() => {});
  expect(await nothingCame(Promise.reject(timeout()))).toBe(true);
  expect(await nothingCame(Promise.resolve({}))).toBe(false);
  expect(said).not.toHaveBeenCalled();
});

test("a wait for what should not come fails its step on a failure other than running out", async () => {
  await expect(nothingCame(Promise.reject(new Error("Target closed")))).rejects.toThrow("Target closed");
});

test("a print's waits that ran out are counted by what each waited for", () => {
  const print = [ranOutLine("save", 3000), "corner: ok", ranOutLine("alert", 2000, "one still stood"), ranOutLine("save", 3000, { pending: "1" })].join("\n");
  expect(ranOutCounts(print)).toEqual({ save: 2, alert: 1 });
});
