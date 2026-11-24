import { describe, it, expect } from "vitest";
import { ledgerLine, rateOf, readTwoWays, type LedgerLine } from "./heliumLedger.ts";

const play = (o: Partial<LedgerLine>): LedgerLine => ({ at: "2026-11-23T22:29:00", head: "abc1234", committed: true, steps: false, windows: 5, secs: 90, load: 7, runs: { corner: "ok", order: "ok" }, readOtherwise: {}, ranOut: {}, inputs: {}, ...o });

describe("a verdict play's line", () => {
  it("carries the verdict's record of each run and the fingerprint of its inputs, a fifth run's as any other's, and counts each wait that ran out in its print by what it waited for", () => {
    const print = ["a save's wait ran out after 3000 ms: {}", "a search's wait ran out after 5000 ms: {}", "a save's wait ran out after 3000 ms: {}", "an alert's wait ran out after 2000 ms: one still stood"].join("\n");
    const l = ledgerLine({ runs: { corner: "ok", order: "differs", bridge: "not replayed", fifth: "failed" }, readOtherwise: { order: ["launch, menus, the corner, links"] }, windows: 5, steps: false, secs: 87, tree: { head: "abc1234", committed: true }, print, inputs: { corner: "c1", order: "o1", bridge: "b1", fifth: "f1" } }, "2026-11-23T22:33:00", 27.2);
    expect(l).toEqual({ at: "2026-11-23T22:33:00", head: "abc1234", committed: true, steps: false, windows: 5, secs: 87, load: 27.2, runs: { corner: "ok", order: "differs", bridge: "not replayed", fifth: "failed" }, readOtherwise: { order: ["launch, menus, the corner, links"] }, ranOut: { save: 2, search: 1, alert: 1 }, inputs: { corner: "c1", order: "o1", bridge: "b1", fifth: "f1" } });
  });
});

describe("the flake rate", () => {
  it("counts only whole plays of a committed tree, every run played, per window count and per section, a verdict's replay not a play of its own", () => {
    const lines = [play({}), play({ readOtherwise: { order: ["grid"] }, runs: { corner: "ok", order: "differs" } }), play({ windows: 3 }), play({ committed: false, readOtherwise: { corner: ["x"] } }), play({ steps: true, readOtherwise: { corner: ["y"] } }), play({ runs: { corner: "not replayed", order: "differs" }, readOtherwise: { order: ["z"] } }), play({ replay: true, runs: { corner: "differs", order: "differs" }, readOtherwise: { order: ["w"] } })];
    expect(rateOf(lines)).toEqual({ plays: 3, flaky: 1, byWindows: { 5: { plays: 2, flaky: 1 }, 3: { plays: 1, flaky: 0 } }, bySection: { grid: 1 } });
  });
});

describe("a run read two ways", () => {
  const at = (n: number): string => "2026-11-24T1" + n + ":00:00";
  it("is a run whose same inputs, played whole on any tree, a replay included, read more than one way: its result and the sections it read otherwise", () => {
    const lines = [
      play({ at: at(0), committed: false, inputs: { corner: "c1", order: "o1" }, runs: { corner: "differs", order: "differs" }, readOtherwise: { corner: ["menu area"], order: ["links"] } }),
      play({ at: at(1), committed: false, replay: true, inputs: { corner: "c1", order: "o1" }, runs: { corner: "differs", order: "ok" }, readOtherwise: { corner: ["menu area"] } }),
      play({ at: at(2), inputs: { corner: "c1", order: "o1" }, runs: { corner: "differs", order: "differs" }, readOtherwise: { corner: ["menu area"], order: ["grid"] } }),
    ];
    expect(readTwoWays(lines)).toEqual({
      playedAgain: 2,
      twoWays: [{ run: "order", inputs: "o1", ways: { "differs: links": 1, ok: 1, "differs: grid": 1 }, first: at(0), last: at(2) }],
    });
  });
  it("leaves out a run not replayed, a play of some sections, and a line from before fingerprints were kept", () => {
    const lines = [
      play({ inputs: { corner: "c1" }, runs: { corner: "differs" }, readOtherwise: { corner: ["x"] } }),
      play({ inputs: { corner: "c1" }, runs: { corner: "not replayed" } }),
      play({ inputs: { corner: "c1" }, steps: true, runs: { corner: "ok" } }),
      play({ runs: { corner: "ok" } }),
    ];
    expect(readTwoWays(lines)).toEqual({ playedAgain: 0, twoWays: [] });
  });
});
