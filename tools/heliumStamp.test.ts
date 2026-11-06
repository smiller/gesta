import { test, expect } from "vitest";
import { fingerprint, mayReuse, approvalRefusal } from "./heliumStamp.ts";

const inputs = [
  { name: "dist/index.html", bytes: "<html>page</html>" },
  { name: "tools/helium-steps.mjs", bytes: "steps" },
  { name: "helium", bytes: "0.14.8.1" },
];

test("a run's inputs fingerprint the same in any order, and differently for any changed byte or name", () => {
  const fp = fingerprint(inputs);
  expect(fingerprint([...inputs].reverse())).toBe(fp);
  expect(fingerprint([inputs[0], inputs[1], { name: "helium", bytes: "0.14.9.0" }])).not.toBe(fp);
  expect(fingerprint([{ name: "dist/index.html", bytes: "<html>page</html> " }, inputs[1], inputs[2]])).not.toBe(fp);
  expect(fingerprint([inputs[0], { name: "tools/helium-steps2.mjs", bytes: "steps" }, inputs[2]])).not.toBe(fp);
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
