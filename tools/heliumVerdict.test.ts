import { test, expect } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compared, runFiles, readOtherwise, replayed, verdict, READ_OTHERWISE, type VerdictPorts } from "./heliumVerdict.ts";
import type { PlayRecord } from "./heliumLedger.ts";

const dirs = () => { const root = mkdtempSync(join(tmpdir(), "verdict-")); return { expected: join(root, "expected"), stamps: join(root, "stamps"), failed: join(root, "failed") }; };
const has = (d: { expected: string; stamps: string }) => (name: string) => ({
  received: existsSync(join(d.expected, name + ".received.txt")),
  stamp: existsSync(join(d.stamps, name + ".txt")) ? readFileSync(join(d.stamps, name + ".txt"), "utf8") : null,
  played: existsSync(join(d.stamps, name + ".played.txt")) ? readFileSync(join(d.stamps, name + ".played.txt"), "utf8") : null,
});
const RUN = "== a\nx: 1\n", FAILED = "== a\nSECTION FAILED (a): boom\n";

test("a run is reusable when a passing run's stamp holds its inputs, never one of some steps; asking clears nothing, and a run cleared to play loses its stamp and its played print", () => {
  const d = dirs(), l = runFiles(d);
  expect(l.reusable("corner", "fp1", false)).toBe(false);
  l.after("corner", { received: RUN, fp: "fp1", steps: false, held: false }, { pass: true });
  expect([l.reusable("corner", "fp1", false), l.reusable("corner", "fp2", false), l.reusable("corner", "fp1", true)]).toEqual([true, false, false]);
  expect(has(d)("corner").stamp).toBe("fp1");
  l.clear("corner");
  expect(has(d)("corner")).toEqual({ received: false, stamp: null, played: null });
});

test("after a pass the received copy goes and a whole run is stamped; a run of some steps leaves no stamp", () => {
  const d = dirs(), l = runFiles(d);
  l.after("corner", { received: RUN, fp: "fp1", steps: false, held: false }, { pass: false, differs: "changed" });
  l.clear("corner");
  l.after("corner", { received: RUN, fp: "fp1", steps: false, held: false }, { pass: true });
  expect(has(d)("corner")).toEqual({ received: false, stamp: "fp1", played: null });
  l.after("bridge", { received: RUN, fp: "fp2", steps: true, held: false }, { pass: true });
  expect(has(d)("bridge")).toEqual({ received: false, stamp: null, played: null });
});

test("after a fail the received copy is kept to read, and what it played is noted only for a whole run held to no other", () => {
  const d = dirs(), l = runFiles(d);
  l.after("corner", { received: RUN, fp: "fp1", steps: false, held: false }, { pass: false, differs: "changed" });
  expect(has(d)("corner")).toEqual({ received: true, stamp: null, played: "fp1" });
  l.after("reader", { received: RUN, fp: "fp3", steps: true, held: false }, { pass: false, differs: "changed" });
  expect(has(d)("reader")).toEqual({ received: true, stamp: null, played: null });
  l.after("order", { received: FAILED, fp: "fp1", steps: false, held: true }, { pass: false, failed: "SECTION FAILED (a): boom" });
  expect(has(d)("order")).toEqual({ received: true, stamp: null, played: null });
});

test("a run is approved only when it was played whole, its inputs unchanged since and no section of it failed; approved, it is the approved copy, stamped with the inputs as they stand after it is written", () => {
  const d = dirs(), l = runFiles(d);
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

test("a whole play is replayed, both orders together, only where the two orders read the same steps otherwise and both were asked for", () => {
  const both = ["corner", "order", "bridge", "reader"];
  expect(replayed({ corner: "ok", order: "differs", bridge: "ok", reader: "ok" }, false, both)).toEqual(["corner", "order"]);
  expect(replayed({ corner: "differs", order: "differs" }, false, both)).toEqual(["corner", "order"]);
  expect(replayed({ corner: "differs", order: "ok", bridge: "differs", reader: "differs" }, false, both)).toEqual([]);
  expect(replayed({ corner: "ok", order: "failed" }, false, both)).toEqual([]);
  expect(replayed({ corner: "ok", order: "differs" }, true, both)).toEqual([]);
  expect(replayed({ bridge: "differs" }, false, both)).toEqual([]);
  expect(replayed({ order: "differs" }, false, ["order"])).toEqual([]);
});

function fakes(prints: Record<string, string[]>, approved: Record<string, string>) {
  const d = dirs(), files = runFiles(d), played: string[] = [], lines: string[] = [], records: PlayRecord[] = [];
  mkdirSync(d.expected, { recursive: true });
  for (const [n, text] of Object.entries(approved)) writeFileSync(files.approvedPath(n), text);
  const ports: VerdictPorts = {
    player: { play: async (n) => { played.push(n); return prints[n].shift()!; }, clear: () => {} },
    fingerprint: (n) => "inputs of " + n,
    files, tree: () => JSON.stringify({ head: "abc1234", committed: true }),
    record: (r) => { records.push(r); return null; }, wake: () => {}, print: (l) => { lines.push(l); }, clock: () => 0,
  };
  return { d, files, ports, played, lines, records };
}
const asked = (runs: string[]) => ({ asked: runs, together: [["corner", "order", "bridge", "reader"]], heldTo: { order: "corner" }, steps: false, windows: 5 });
const SAME = "== s\nx\n", OTHER = "== s\ny\n";

test("order reading otherwise beside corner replays both, corner too though its first play left a passing stamp", async () => {
  const f = fakes({ corner: [SAME, SAME], order: [OTHER, SAME] }, { corner: SAME });
  expect(await verdict(asked(["corner", "order"]), f.ports)).toBe(1);
  expect(f.played).toEqual(["corner", "order", "corner", "order"]);
});

test("the replay's record is marked a replay, the first play's not", async () => {
  const f = fakes({ corner: [SAME, SAME], order: [OTHER, OTHER] }, { corner: SAME });
  await verdict(asked(["corner", "order"]), f.ports);
  expect(f.records.map((r) => !!r.replay)).toEqual([false, true]);
  expect(f.records[1].runs).toEqual({ corner: "ok", order: "differs" });
});

test("with only order asked for, nothing is replayed", async () => {
  const f = fakes({ order: [OTHER] }, { corner: SAME });
  expect(await verdict(asked(["order"]), f.ports)).toBe(1);
  expect(f.played).toEqual(["order"]);
});

test("a run whose inputs a passing run's stamp holds is not played again", async () => {
  const f = fakes({ corner: [SAME], order: [SAME] }, { corner: SAME });
  expect(await verdict(asked(["corner", "order"]), f.ports)).toBe(0);
  expect(await verdict(asked(["corner", "order"]), f.ports)).toBe(0);
  expect(f.played).toEqual(["corner", "order"]);
  expect(f.lines.slice(-2)).toEqual(["corner: ok — not replayed, its inputs those of a passing run", "order: ok — not replayed, its inputs those of a passing run"]);
  expect(f.records).toHaveLength(1);
});

test("order is held to corner played beside it: a reading changed on purpose differs in corner alone and is not replayed", async () => {
  const f = fakes({ corner: [OTHER], order: [OTHER] }, { corner: SAME });
  expect(await verdict(asked(["corner", "order"]), f.ports)).toBe(1);
  expect(f.records.map((r) => r.runs)).toEqual([{ corner: "differs", order: "ok" }]);
  expect(f.played).toEqual(["corner", "order"]);
});

test("a run that differs has its print kept under the failed runs and its received copy written", async () => {
  const f = fakes({ bridge: ["== b\nSECTION FAILED (b): boom\n"] }, { bridge: "== b\n1\n" });
  await verdict(asked(["bridge"]), f.ports);
  expect(f.files.received("bridge")).toBe("== b\nSECTION FAILED (b): boom\n");
  expect(readdirSync(f.d.failed).filter((n) => n.startsWith("bridge-"))).toHaveLength(1);
});

test("bridge differing asks for an unchanged replay and replays nothing", async () => {
  const f = fakes({ bridge: ["== b\n2\n"] }, { bridge: "== b\n1\n" });
  expect(await verdict(asked(["bridge"]), f.ports)).toBe(1);
  expect(f.played).toEqual(["bridge"]);
  expect(f.lines.at(-1)).toBe("replay it unchanged before any edit: a run its same inputs read another way is a flake (node tools/heliumRate.ts)");
});
