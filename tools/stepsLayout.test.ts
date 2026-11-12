import { test, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";

const modules = readdirSync("tools/steps").filter((f) => f.endsWith(".ts") && f !== "kit.ts").map((f) => ({ f, text: readFileSync("tools/steps/" + f, "utf8") }));
const HEADER = /^section\((["'])(.*?)\1, /gm;

test("every section in tools/steps opens on a header of its own line, the form the pin resolver reads", () => {
  const calls = modules.flatMap(({ f, text }) => [...text.matchAll(/(?<![\w$.])section\(/g)].map((m) => f + ":" + text.slice(0, m.index).split("\n").length));
  const headers = modules.flatMap(({ f, text }) => [...text.matchAll(HEADER)].map((m) => f + ":" + text.slice(0, m.index).split("\n").length));
  expect(calls).toEqual(headers);
});
test("no two sections share a name", () => {
  const names = modules.flatMap(({ text }) => [...text.matchAll(HEADER)].map((m) => m[2]));
  expect(names.filter((n, i) => names.indexOf(n) !== i)).toEqual([]);
  expect(names.length).toBeGreaterThan(0);
});
