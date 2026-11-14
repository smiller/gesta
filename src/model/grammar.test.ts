import { test, expect } from "vitest";
import { PAGE_CHARS_RE, PAGE_ONE, PAGE_ARABIC, PAGE_AT, pageToken } from "./grammar.ts";

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

test("what pageToken writes PAGE_AT reads back, at the start of the text, and a mixed label it does not", () => {
  expect(pageToken("8")).toBe("⟨8⟩");
  for (const label of ["8", "xxiv", "XXIV"]) expect(PAGE_AT.exec(pageToken(label) + " rest")?.[1]).toBe(label);
  expect(PAGE_AT.test(pageToken("x8"))).toBe(false);
  expect(PAGE_AT.test("a" + pageToken("8"))).toBe(false);
});
