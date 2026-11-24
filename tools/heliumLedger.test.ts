import { describe, it, expect } from "vitest";
import { ledgerLine, rateOf, type LedgerLine } from "./heliumLedger.ts";

const play = (o: Partial<LedgerLine>): LedgerLine => ({ at: "2026-11-23T22:29:00", head: "abc1234", committed: true, steps: false, windows: 5, secs: 90, load: 7, runs: { corner: "ok", order: "ok" }, readOtherwise: {}, saveRanOut: 0, ...o });

describe("a verdict play's line", () => {
  it("names each run's result and, once each, the sections each read otherwise, from the verdict's own print", () => {
    const print = ["corner: ok", "order: DIFFERS in another order — launch, menus, the corner, links", "order: section read otherwise — launch, menus, the corner, links", "order: this run kept at x", "order: section read otherwise — launch, menus, the corner, links", "bridge: ok — not replayed, its inputs those of a passing run", "a save's wait ran out after 3000 ms: {}"].join("\n");
    const l = ledgerLine(print, { at: "2026-11-23T22:33:00", head: "abc1234", committed: true, steps: false, windows: 5, secs: 87, load: 27.2 });
    expect([l.runs, l.readOtherwise, l.saveRanOut]).toEqual([{ corner: "ok", order: "differs", bridge: "not replayed" }, { order: ["launch, menus, the corner, links"] }, 1]);
  });
});

describe("the flake rate", () => {
  it("counts only whole plays of a committed tree, every run played, per window count and per section", () => {
    const lines = [play({}), play({ readOtherwise: { order: ["grid"] }, runs: { corner: "ok", order: "differs" } }), play({ windows: 3 }), play({ committed: false, readOtherwise: { corner: ["x"] } }), play({ steps: true, readOtherwise: { corner: ["y"] } }), play({ runs: { corner: "not replayed", order: "differs" }, readOtherwise: { order: ["z"] } })];
    expect(rateOf(lines)).toEqual({ plays: 3, flaky: 1, byWindows: { 5: { plays: 2, flaky: 1 }, 3: { plays: 1, flaky: 0 } }, bySection: { grid: 1 } });
  });
});
