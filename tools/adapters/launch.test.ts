import { test, expect } from "vitest";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { freshProfile } from "./launch.ts";

test("a fresh profile is an empty directory, whatever the last run left in it", () => {
  const dir = join(tmpdir(), "gesta-launch-test-profile");
  mkdirSync(join(dir, "Default"), { recursive: true });
  writeFileSync(join(dir, "Default", "left"), "x");
  freshProfile(dir);
  expect([existsSync(dir), readdirSync(dir)]).toEqual([true, []]);
});
