import { test, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { replay, isOpen, type Event } from "./events.ts";

const DAYS = "docs/progress";
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === "out" || name === "progress") return [];
    return statSync(p).isDirectory() ? sources(p) : p.endsWith(".ts") ? [p] : [];
  });
}
test("an open item's watch is words some tool or an approved run can still print: a rename that moves them leaves no watch that can never wake", () => {
  const last = readdirSync(DAYS).filter((f) => /^\d{4}-\d\d-\d\d\.jsonl$/.test(f)).sort().at(-1)!;
  const events = readFileSync(join(DAYS, last), "utf8").trim().split("\n").map((l) => JSON.parse(l) as Event);
  const approved = readdirSync("tools/expected").filter((f) => f.endsWith(".approved.txt")).map((f) => join("tools/expected", f));
  const text = [...sources("tools"), ...approved].map((f) => readFileSync(f, "utf8")).join("\n");
  const orphaned = replay(events).filter((i) => isOpen(i.status) && i.watch && !text.includes(i.watch)).map((i) => i.id + ": " + i.watch);
  expect(orphaned).toEqual([]);
});
