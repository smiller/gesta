import { test, expect, beforeEach } from "vitest";
import { publish, current, decoded } from "./published.ts";

beforeEach(() => {
  const dataset: Record<string, string> = {};
  (globalThis as { document?: unknown }).document = { documentElement: { dataset } };
  return () => { delete (globalThis as { document?: unknown }).document; };
});

test("each value read back as it was published, in its own shape", () => {
  publish("alerts", { error: "no link inside a heading", latest: "info" });
  publish("savesPending", 2);
  publish("search", { open: true, answered: "outside", rows: 1, empty: "" });
  publish("entry", "commonplace/Horace");
  expect([current("alerts"), current("savesPending"), current("search"), current("entry")]).toEqual([{ error: "no link inside a heading", latest: "info" }, 2, { open: true, answered: "outside", rows: 1, empty: "" }, "commonplace/Horace"]);
});

test("the decoder runs from its own source alone, naming nothing outside itself", () => {
  const alone = new Function("return (" + decoded.toString() + ")")() as typeof decoded;
  expect([alone("savesPending", "3"), alone("search", undefined), alone("alerts", '{"error":"x"}')]).toEqual([3, null, { error: "x" }]);
});

test("a value not yet published, or withdrawn, reads as its none: no alerts, nothing pending, no search, no entry", () => {
  expect([decoded("alerts", undefined), decoded("savesPending", undefined), decoded("search", undefined), decoded("entry", undefined), decoded("saidLog", undefined), decoded("menuArea", undefined)]).toEqual([{}, 0, null, null, { n: 0, recent: [] }, 0]);
  publish("menuSel", "Horace");
  publish("menuSel", null);
  expect(current("menuSel")).toBe(null);
});
