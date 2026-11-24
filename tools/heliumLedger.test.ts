import { describe, it, expect } from "vitest";
import { ledgerLine, rateOf, type LedgerLine } from "./heliumLedger.ts";

const play = (o: Partial<LedgerLine>): LedgerLine => ({ at: "2026-11-23T22:29:00", head: "abc1234", committed: true, steps: false, windows: 5, secs: 90, load: 7, runs: { corner: "ok", order: "ok" }, readOtherwise: {}, ranOut: {}, ...o });

describe("a verdict play's line", () => {
  it("carries the verdict's record of each run, a fifth run's as any other's, and counts each wait that ran out in its print by what it waited for", () => {
    const print = ["a save's wait ran out after 3000 ms: {}", "a search's wait ran out after 5000 ms: {}", "a save's wait ran out after 3000 ms: {}", "an alert's wait ran out after 2000 ms: one still stood"].join("\n");
    const l = ledgerLine({ runs: { corner: "ok", order: "differs", bridge: "not replayed", fifth: "failed" }, readOtherwise: { order: ["launch, menus, the corner, links"] }, windows: 5, steps: false, secs: 87, tree: { head: "abc1234", committed: true }, print }, "2026-11-23T22:33:00", 27.2);
    expect(l).toEqual({ at: "2026-11-23T22:33:00", head: "abc1234", committed: true, steps: false, windows: 5, secs: 87, load: 27.2, runs: { corner: "ok", order: "differs", bridge: "not replayed", fifth: "failed" }, readOtherwise: { order: ["launch, menus, the corner, links"] }, ranOut: { save: 2, search: 1, alert: 1 } });
  });
});

describe("the flake rate", () => {
  it("counts only whole plays of a committed tree, every run played, per window count and per section", () => {
    const lines = [play({}), play({ readOtherwise: { order: ["grid"] }, runs: { corner: "ok", order: "differs" } }), play({ windows: 3 }), play({ committed: false, readOtherwise: { corner: ["x"] } }), play({ steps: true, readOtherwise: { corner: ["y"] } }), play({ runs: { corner: "not replayed", order: "differs" }, readOtherwise: { order: ["z"] } })];
    expect(rateOf(lines)).toEqual({ plays: 3, flaky: 1, byWindows: { 5: { plays: 2, flaky: 1 }, 3: { plays: 1, flaky: 0 } }, bySection: { grid: 1 } });
  });
});
