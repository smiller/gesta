import { test, expect } from "vitest";
import { playEnv, windowNames } from "./heliumPlay.ts";

test("a play's pages run at the rate it is given, and at their own speed when given none, whatever the shell set", () => {
  expect(playEnv({ PATH: "/bin", THROTTLE: "8" }, {}, 1)).toEqual({ PATH: "/bin", NODE_OPTIONS: "" });
  expect(playEnv({ PATH: "/bin" }, { SHARD: "0/5" }, 4)).toEqual({ PATH: "/bin", NODE_OPTIONS: "", SHARD: "0/5", THROTTLE: "4" });
});

test("a play over several windows names one profile for each, and over one the run's own", () => {
  expect(windowNames("corner", 3)).toEqual(["corner-0", "corner-1", "corner-2"]);
  expect(windowNames("bridge", 1)).toEqual(["bridge"]);
});
