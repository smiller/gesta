import { test, expect } from "vitest";
import { testsOf, changedUnderSameTitle, fingerprint } from "./testTitles.ts";

const FILE = `import x from "y";
const shared = 1;
test("a block-bodied test", () => {
  expect(shared).toBe(1);
});
test('a single-quoted test', async () => {
  expect(2).toBe(2);
});
test("a one-line test", () => expect(3).toBe(3));
describe("a group", () => {
  it("a nested test", () => {
    expect(4).toBe(4);
  });
  it("a test with a timeout", () => {
    expect(5).toBe(5);
  }, 9000);
});
`;
test("testsOf finds each test's description and its code, whatever its quotes, depth or body", () => {
  const found = testsOf(FILE);
  expect([...found.keys()]).toEqual(["a block-bodied test", "a single-quoted test", "a one-line test", "a nested test", "a test with a timeout"]);
  expect(found.get("a block-bodied test")).toContain("expect(shared)");
  expect(found.get("a block-bodied test")).not.toContain("expect(2)");
  expect(found.get("a one-line test")).toContain("expect(3)");
  expect(found.get("a test with a timeout")).toContain("expect(5)");
});
test("a test is listed when its code changed and its description did not", () => {
  expect(changedUnderSameTitle(FILE, FILE.replace("expect(4)", "expect(44)"))).toEqual(["a nested test"]);
});
test("a test is not listed when it is new, removed, renamed, unchanged, or changed only in spacing, nor for code outside any test", () => {
  expect(changedUnderSameTitle(FILE, FILE)).toEqual([]);
  expect(changedUnderSameTitle(FILE, FILE + 'test("a new one", () => {\n  expect(6).toBe(6);\n});\n')).toEqual([]);
  expect(changedUnderSameTitle(FILE, FILE.replace('it("a nested test"', 'it("a nested rule"').replace("expect(4)", "expect(44)"))).toEqual([]);
  expect(changedUnderSameTitle(FILE, FILE.replace(/test\("a one-line test".*\n/, ""))).toEqual([]);
  expect(changedUnderSameTitle(FILE, FILE.replace("expect(4).toBe(4);", "expect(4)  .toBe(4);\n"))).toEqual([]);
  expect(changedUnderSameTitle(FILE, FILE.replace("const shared = 1;", "const shared = 2;"))).toEqual([]);
});
test("the fingerprint changes when a listed test's code changes again, and when the list does", () => {
  const a = [{ file: "f.test.ts", title: "t", body: "one" }];
  expect(fingerprint(a)).toBe(fingerprint([{ ...a[0] }]));
  expect(fingerprint(a)).not.toBe(fingerprint([{ ...a[0], body: "two" }]));
  expect(fingerprint(a)).not.toBe(fingerprint([...a, { file: "f.test.ts", title: "u", body: "one" }]));
});
