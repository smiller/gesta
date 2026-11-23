import { test, expect } from "vitest";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compared, ledger, readOtherwise, READ_OTHERWISE } from "./heliumVerdict.ts";

const dirs = () => { const root = mkdtempSync(join(tmpdir(), "verdict-")); return { expected: join(root, "expected"), stamps: join(root, "stamps") }; };
const has = (d: { expected: string; stamps: string }) => (name: string) => ({
  received: existsSync(join(d.expected, name + ".received.txt")),
  stamp: existsSync(join(d.stamps, name + ".txt")) ? readFileSync(join(d.stamps, name + ".txt"), "utf8") : null,
  played: existsSync(join(d.stamps, name + ".played.txt")) ? readFileSync(join(d.stamps, name + ".played.txt"), "utf8") : null,
});
const RUN = "== a\nx: 1\n", FAILED = "== a\nSECTION FAILED (a): boom\n";

test("a run is reusable when a passing run's stamp holds its inputs, never one of some steps; asking clears nothing, and a run cleared to play loses its stamp and its played print", () => {
  const d = dirs(), l = ledger(d);
  expect(l.reusable("corner", "fp1", false)).toBe(false);
  l.after("corner", { received: RUN, fp: "fp1", steps: false, held: false }, { pass: true });
  expect([l.reusable("corner", "fp1", false), l.reusable("corner", "fp2", false), l.reusable("corner", "fp1", true)]).toEqual([true, false, false]);
  expect(has(d)("corner").stamp).toBe("fp1");
  l.clear("corner");
  expect(has(d)("corner")).toEqual({ received: false, stamp: null, played: null });
});

test("after a pass the received copy goes and a whole run is stamped; a run of some steps leaves no stamp", () => {
  const d = dirs(), l = ledger(d);
  l.after("corner", { received: RUN, fp: "fp1", steps: false, held: false }, { pass: false, differs: "changed" });
  l.clear("corner");
  l.after("corner", { received: RUN, fp: "fp1", steps: false, held: false }, { pass: true });
  expect(has(d)("corner")).toEqual({ received: false, stamp: "fp1", played: null });
  l.after("bridge", { received: RUN, fp: "fp2", steps: true, held: false }, { pass: true });
  expect(has(d)("bridge")).toEqual({ received: false, stamp: null, played: null });
});

test("after a fail the received copy is kept to read, and what it played is noted only for a whole run held to no other", () => {
  const d = dirs(), l = ledger(d);
  l.after("corner", { received: RUN, fp: "fp1", steps: false, held: false }, { pass: false, differs: "changed" });
  expect(has(d)("corner")).toEqual({ received: true, stamp: null, played: "fp1" });
  l.after("reader", { received: RUN, fp: "fp3", steps: true, held: false }, { pass: false, differs: "changed" });
  expect(has(d)("reader")).toEqual({ received: true, stamp: null, played: null });
  l.after("order", { received: FAILED, fp: "fp1", steps: false, held: true }, { pass: false, failed: "SECTION FAILED (a): boom" });
  expect(has(d)("order")).toEqual({ received: true, stamp: null, played: null });
});

test("a run is approved only when it was played whole, its inputs unchanged since and no section of it failed; approved, it is the approved copy, stamped with the inputs as they stand after it is written", () => {
  const d = dirs(), l = ledger(d);
  expect(l.refusal("corner", "fp1")).toMatch(/no run to approve/);
  l.after("reader", { received: RUN, fp: "fp3", steps: true, held: false }, { pass: false, differs: "changed" });
  expect(l.refusal("reader", "fp3")).toMatch(/not a whole run/);
  l.after("bridge", { received: FAILED, fp: "fp2", steps: false, held: false }, { pass: false, differs: "changed" });
  expect(l.refusal("bridge", "fp2")).toMatch(/failed/);
  l.after("corner", { received: RUN, fp: "fp1", steps: false, held: false }, { pass: false, differs: "new" });
  expect(l.refusal("corner", "fp9")).toMatch(/changed since it played/);
  expect(l.refusal("corner", "fp1")).toBeNull();
  expect(l.approve("corner", () => "after:" + readFileSync(join(d.expected, "corner.approved.txt"), "utf8"))).toBe(RUN);
  expect(readFileSync(join(d.expected, "corner.approved.txt"), "utf8")).toBe(RUN);
  expect(has(d)("corner")).toEqual({ received: false, stamp: "after:" + RUN, played: null });
  expect(l.baseline("corner")).toBe(RUN);
});

test("a run held to another fails on a failed run of its own, even one reading as the other did, else on a section reading otherwise; a run of its own passes only reading as its approved copy", () => {
  expect(compared(FAILED, FAILED, true)).toEqual({ pass: false, failed: "SECTION FAILED (a): boom" });
  expect(compared(RUN, null, true)).toEqual({ pass: false, order: ["(no approved copy)"] });
  expect(compared(RUN, RUN, true)).toEqual({ pass: true });
  expect(compared(RUN, RUN, false)).toEqual({ pass: true });
  expect(compared(RUN, null, false)).toEqual({ pass: false, differs: "new" });
  expect(compared(RUN + "y: 2\n", RUN, false)).toEqual({ pass: false, differs: "changed" });
});

test("a run that differs names each section it reads otherwise, one line each, for a watch to wake on", () => {
  const approved = "== a\na: 1\n== b\nb: 1\n== c\nc: 1\nconsole: (nothing)\n";
  const played = "== a\na: 1\n== b\nb: 2\n== c\nc: 2\nconsole: (nothing)\n";
  expect(readOtherwise("order", compared(played, approved, true), played, approved)).toEqual(["order: " + READ_OTHERWISE + "b", "order: " + READ_OTHERWISE + "c"]);
  expect(readOtherwise("corner", compared(played, approved, false), played, approved)).toEqual(["corner: " + READ_OTHERWISE + "b", "corner: " + READ_OTHERWISE + "c"]);
  expect(readOtherwise("corner", compared(approved, approved, false), approved, approved)).toEqual([]);
  expect(readOtherwise("corner", compared(played, null, false), played, null)).toEqual([]);
});
