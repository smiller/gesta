import { test, expect } from "vitest";
import { PAGE_CHARS_RE, PAGE_TOKEN, PAGE_ONE, PAGE_ARABIC, pageToken } from "./pageLabels.ts";

test("PAGE_ONE: arabic or roman, either case, never a mix", () => {
  expect(PAGE_ONE.test("8")).toBe(true);
  expect(PAGE_ONE.test("0042")).toBe(true);
  expect(PAGE_ONE.test("xxiv")).toBe(true);
  expect(PAGE_ONE.test("XXIV")).toBe(true);
  expect(PAGE_ONE.test("x8")).toBe(false);
  expect(PAGE_ONE.test("8x")).toBe(false);
  expect(PAGE_ONE.test("")).toBe(false);
  expect(PAGE_ONE.test("p8")).toBe(false);
});

test("PAGE_CHARS_RE: the alphabet without the grammar — what a MIX still passes", () => {
  expect(PAGE_CHARS_RE.test("x8")).toBe(true);
  expect(PAGE_ONE.test("x8")).toBe(false);
  expect(PAGE_CHARS_RE.test("p8")).toBe(false);
  expect(PAGE_CHARS_RE.test("")).toBe(false);
});

test("PAGE_ARABIC: the arabic half alone", () => {
  expect(PAGE_ARABIC.test("12")).toBe(true);
  expect(PAGE_ARABIC.test("xii")).toBe(false);
  expect(PAGE_ARABIC.test("1x")).toBe(false);
});

test("pageToken and PAGE_TOKEN agree on the brackets, under .replace", () => {
  expect(pageToken("8")).toBe("⟨8⟩");
  const seen: string[] = [];
  const out = "a⟨8⟩b⟨xxiv⟩c".replace(PAGE_TOKEN, (_m, tok: string) => { seen.push(tok); return "*"; });
  expect(out).toBe("a*b*c");
  expect(seen).toEqual(["8", "xxiv"]);
  expect("a⟨x8⟩b".replace(PAGE_TOKEN, "*")).toBe("a⟨x8⟩b");
});
