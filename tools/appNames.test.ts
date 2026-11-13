import { test, expect } from "vitest";
import { readFileSync } from "node:fs";

/* the app's storage and channel names are spelled once, in src/; a
   tool's own copy goes stale when they change */
test("the headless tools spell no storage or channel name of the app's", () => {
  for (const f of ["tools/helium-steps.ts", "tools/adapters/app.ts"]) {
    const hits = readFileSync(f, "utf8").split("\n").map((l, i) => [i + 1, l] as const).filter(([, l]) => /["'`]gesta\.(v1\.|entries|images|backup)/.test(l));
    expect(hits.map(([n]) => f + ":" + n)).toEqual([]);
  }
});
