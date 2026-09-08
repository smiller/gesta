import { test, expect } from "vitest";
import { parseShortcuts, filterShortcuts } from "./shortcuts.ts";

test("parseShortcuts: one row per line, split on the FIRST colon, comments and colon-less lines skipped", () => {
  expect(parseShortcuts("# a comment\n\nsig: Sean Miller \nurl:https://x.test/a:b\n :nocode\nnocolon\ndup: one\ndup: two\r\nlast:  two spaces")).toEqual([
    { code: "sig", expansion: "Sean Miller " },
    { code: "url", expansion: "https://x.test/a:b" },
    { code: "dup", expansion: "one" },
    { code: "dup", expansion: "two" },
    { code: "last", expansion: " two spaces" },
  ]);
  expect(parseShortcuts("")).toEqual([]);
  expect(parseShortcuts(null)).toEqual([]);
  expect(parseShortcuts("M: a\nm: b")).toEqual([{ code: "M", expansion: "a" }, { code: "m", expansion: "b" }]);
  expect(parseShortcuts(" M : x")[0].code).toBe("M");
});
test("filterShortcuts: a case-sensitive prefix on the code; an empty query is the whole list", () => {
  const list = parseShortcuts("ab: 1\nAb: 2\nabc: 3\nb: 4");
  expect(filterShortcuts(list, "")).toBe(list);
  expect(filterShortcuts(list, "ab").map((s) => s.expansion)).toEqual(["1", "3"]);
  expect(filterShortcuts(list, "A").map((s) => s.expansion)).toEqual(["2"]);
  const SC = parseShortcuts("M: a\nmd: b\nme: c\nka: d");
  expect(filterShortcuts(SC, "m").map((s) => s.code)).toEqual(["md", "me"]);
  expect(filterShortcuts(SC, "d").length).toBe(0);
});
