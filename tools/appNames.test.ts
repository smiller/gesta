import { test, expect } from "vitest";
import { readFileSync } from "node:fs";

/* the successor's storage and channel names are spelled once, in src/; a
   tool's own copy goes stale when they change */
test("the headless tools spell no storage or channel name of the successor's", () => {
  for (const f of ["tools/helium-steps.mjs", "tools/adapters/successor.mjs"]) {
    const hits = readFileSync(f, "utf8").split("\n").map((l, i) => [i + 1, l] as const).filter(([, l]) => /["'`]gesta\.(v1\.|entries|images|backup)/.test(l));
    expect(hits.map(([n]) => f + ":" + n)).toEqual([]);
  }
});
