import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fingerprint, mayReuse, approvalRefusal, failedRun, readByDrivers, DRIVERS } from "./heliumStamp.ts";

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

test("what a run reads of the code is its drivers and every file they reach through their imports, dynamic ones too, src/ as well as tools/; a path no file stands at is passed over", () => {
  const files: Record<string, string> = {
    "tools/d.ts": 'import { a } from "./a.ts";\nimport "./steps/s.ts";',
    "tools/a.ts": 'import { b } from "../src/store/b.ts";',
    "tools/steps/s.ts": "",
    "src/store/b.ts": 'import { c } from "./c.ts";\nimport { x } from "prosemirror-model";',
    "src/store/c.ts": "",
    "tools/unreached.ts": "",
    "tools/later.ts": "",
  };
  files["tools/d.ts"] += '\n// an example: import { z } from "./gone.ts";\nconst later = await import("./later.ts");';
  expect(readByDrivers(["tools/d.ts"], (f) => files[f] ?? null)).toEqual(["src/store/b.ts", "src/store/c.ts", "tools/a.ts", "tools/d.ts", "tools/later.ts", "tools/steps/s.ts"]);
  const read = readByDrivers(DRIVERS, (f) => readFileSync(f, "utf8"));
  expect(["src/store/io.ts", "tools/steps/kit.ts", "tools/adapters/inPage.ts", "tools/helium-corner.ts"].filter((f) => !read.includes(f))).toEqual([]);
  expect(read.filter((f) => f === "tools/corpus.ts" || f.startsWith("tools/out/") || f.startsWith("tools/progress/"))).toEqual([]);
});

test("a type-only import is no code a run reads: the file it names is reached only by an import that runs", () => {
  const files: Record<string, string> = {
    "tools/d.ts": ["import type { R } from \"./types.ts\";", "import type {", "  S,", "} from \"./more.ts\";", "import { a } from \"./a.ts\";"].join("\n"),
    "tools/a.ts": 'export type { R } from "./types.ts";',
    "tools/types.ts": "", "tools/more.ts": "",
  };
  expect(readByDrivers(["tools/d.ts"], (f) => files[f] ?? null)).toEqual(["tools/a.ts", "tools/d.ts"]);
  expect(readByDrivers(DRIVERS, (f) => readFileSync(f, "utf8"))).not.toContain("tools/heliumLedger.ts");
});

test("a run failed where a section failed, its fresh start failed, or it exited badly; and such a run is not approved", () => {
  expect(failedRun("== a\nx: 1\nSECTION FAILED (a): boom\n")).toBe(true);
  expect(failedRun("== a\nFRESH START FAILED (a): no seed\n")).toBe(true);
  expect(failedRun("x: 1\n\nEXIT 1\nboom\n")).toBe(true);
  expect(failedRun("== a\nx: the words FRESH START FAILED in a reading\n")).toBe(false);
  expect(approvalRefusal("== a\nFRESH START FAILED (a): no seed\n", "print", "print")).toMatch(/failed/);
});
