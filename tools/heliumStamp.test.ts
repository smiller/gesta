import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { fingerprint, mayReuse, approvalRefusal, stamped, failedRun } from "./heliumStamp.ts";

const inputs = [
  { name: "dist/index.html", bytes: "<html>page</html>" },
  { name: "tools/helium-steps.ts", bytes: "steps" },
  { name: "helium", bytes: "0.14.8.1" },
];

test("a run's inputs fingerprint the same in any order, and differently for any changed byte or name", () => {
  const fp = fingerprint(inputs);
  expect(fingerprint([...inputs].reverse())).toBe(fp);
  expect(fingerprint([inputs[0], inputs[1], { name: "helium", bytes: "0.14.9.0" }])).not.toBe(fp);
  expect(fingerprint([{ name: "dist/index.html", bytes: "<html>page</html> " }, inputs[1], inputs[2]])).not.toBe(fp);
  expect(fingerprint([inputs[0], { name: "tools/helium-steps2.ts", bytes: "steps" }, inputs[2]])).not.toBe(fp);
  // a byte moved between two inputs is a change
  expect(fingerprint([{ name: "a", bytes: "xy" }, { name: "b", bytes: "z" }])).not.toBe(fingerprint([{ name: "a", bytes: "x" }, { name: "b", bytes: "yz" }]));
});

test("a passing run is reused only for the same fingerprint, never for a run of some steps", () => {
  const fp = fingerprint(inputs);
  expect(mayReuse(fp, fp, { steps: false })).toBe(true);
  expect(mayReuse(null, fp, { steps: false })).toBe(false);
  expect(mayReuse("other", fp, { steps: false })).toBe(false);
  expect(mayReuse(fp, fp, { steps: true })).toBe(false);
});

test("approving takes the whole run that was played and read, over the inputs it played", () => {
  expect(approvalRefusal("a good run\n", "print", "print")).toBe(null);
});
test("approving refuses when no run is there, it was a run of some steps, or what it read has changed", () => {
  expect(approvalRefusal(null, null, "print")).toMatch(/no run/);
  expect(approvalRefusal("a run\n", null, "print")).toMatch(/whole run/);
  expect(approvalRefusal("a run\n", "older", "print")).toMatch(/changed/);
});
test("approving refuses a run in which a section failed or the tool died", () => {
  expect(approvalRefusal("x\nSECTION FAILED (toolbar): TimeoutError\ny\n", "print", "print")).toMatch(/failed/);
  expect(approvalRefusal("x\n\nEXIT 1\n", "print", "print")).toMatch(/failed/);
});

/* the tools/ files one file imports */
const toolImports = (f: string): string[] =>
  [...readFileSync(f, "utf8").matchAll(/(?:from|import)\s+"(\.{1,2}\/[^"]+\.ts)"/g)].map((m) => normalize(join(dirname(f), m[1]))).filter((p) => p.startsWith("tools/"));
/* the tools/ files a driver imports, followed through their own imports */
function importsOf(start: string): Set<string> {
  const seen = new Set<string>(), todo = [start];
  for (let f = todo.pop(); f !== undefined; f = todo.pop()) {
    if (!seen.has(f)) { seen.add(f); todo.push(...toolImports(f)); }
  }
  return seen;
}
test("every tools/ file a Helium run's driver reads, through its imports, is in the run's fingerprint", () => {
  const read = ["tools/helium-corner.ts", "tools/helium-bridge.ts", "tools/helium-reader.ts", "tools/helium-approve.ts"].flatMap((d) => [...importsOf(d)]);
  expect(read.filter((f) => !stamped(f))).toEqual([]);
  expect(["tools/steps/kit.ts", "tools/heliumDom.d.ts", "tools/adapters/inPage.ts"].every(stamped)).toBe(true);
  expect(["tools/corpus.ts", "tools/out/x.ts", "tools/expected/corner.approved.txt"].some(stamped)).toBe(false);
});

test("a run failed where a section failed, its fresh start failed, or it exited badly; and such a run is not approved", () => {
  expect(failedRun("== a\nx: 1\nSECTION FAILED (a): boom\n")).toBe(true);
  expect(failedRun("== a\nFRESH START FAILED (a): no seed\n")).toBe(true);
  expect(failedRun("x: 1\n\nEXIT 1\nboom\n")).toBe(true);
  expect(failedRun("== a\nx: the words FRESH START FAILED in a reading\n")).toBe(false);
  expect(approvalRefusal("== a\nFRESH START FAILED (a): no seed\n", "print", "print")).toMatch(/failed/);
});
