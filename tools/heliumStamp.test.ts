import { test, expect } from "vitest";
import { fingerprint, mayReuse } from "./heliumStamp.ts";

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

test("a passing run is reused only for the same fingerprint, never when approving or running some steps", () => {
  const fp = fingerprint(inputs);
  expect(mayReuse(fp, fp, { approve: false, steps: false })).toBe(true);
  expect(mayReuse(null, fp, { approve: false, steps: false })).toBe(false);
  expect(mayReuse("other", fp, { approve: false, steps: false })).toBe(false);
  expect(mayReuse(fp, fp, { approve: true, steps: false })).toBe(false);
  expect(mayReuse(fp, fp, { approve: false, steps: true })).toBe(false);
});
