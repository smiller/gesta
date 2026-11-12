import { test, expect } from "vitest";
import { orderDifferences } from "./heliumOrder.ts";

const forward = "== one\na: 1\nb: 2\n== two\nc: 3\nconsole: error: x\nerror: y\n";

test("a run in another order with every section reading the same differs in nothing", () => {
  const reversed = "== two\nc: 3\n== one\na: 1\nb: 2\nconsole: error: y\nerror: x\n";
  expect(orderDifferences(forward, reversed)).toEqual([]);
});

test("a section reading otherwise is named", () => {
  const reversed = "== two\nc: 4\n== one\na: 1\nb: 2\nconsole: error: x\nerror: y\n";
  expect(orderDifferences(forward, reversed)).toEqual(["two"]);
});

test("a section missing from either run is named", () => {
  expect(orderDifferences(forward, "== one\na: 1\nb: 2\nconsole: error: x\nerror: y\n")).toEqual(["two"]);
  expect(orderDifferences("== one\na: 1\nb: 2\nconsole: (nothing)\n", "== three\n== one\na: 1\nb: 2\nconsole: (nothing)\n")).toEqual(["three"]);
});

test("the console is compared as a set of lines, its order the run's", () => {
  const reversed = "== two\nc: 3\n== one\na: 1\nb: 2\nconsole: error: x\nerror: z\n";
  expect(orderDifferences(forward, reversed)).toEqual(["(console)"]);
});

test("what a run prints after its console, a failed exit, is compared too", () => {
  expect(orderDifferences(forward, forward + "\nEXIT 1\nboom\n")).toEqual(["(console)"]);
});
