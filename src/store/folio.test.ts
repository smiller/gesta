// The folio token grammar, ported 2026-09-07 from ../writer/src/js/folio.test.mjs.
import { test, expect } from "vitest";
import { FOLIO_CHARS_RE, FOLIO_TOKEN, FOLIO_ONE, FOLIO_ARABIC, folioToken } from "./folio.ts";

test("FOLIO_ONE: arabic or roman, either case, never a mix", () => {
  expect(FOLIO_ONE.test("8")).toBe(true);
  expect(FOLIO_ONE.test("0042")).toBe(true);
  expect(FOLIO_ONE.test("xxiv")).toBe(true);
  expect(FOLIO_ONE.test("XXIV")).toBe(true);
  expect(FOLIO_ONE.test("x8")).toBe(false);
  expect(FOLIO_ONE.test("8x")).toBe(false);
  expect(FOLIO_ONE.test("")).toBe(false);
  expect(FOLIO_ONE.test("p8")).toBe(false);
});

test("FOLIO_CHARS_RE: the alphabet without the grammar — what a MIX still passes", () => {
  expect(FOLIO_CHARS_RE.test("x8")).toBe(true);
  expect(FOLIO_ONE.test("x8")).toBe(false);
  expect(FOLIO_CHARS_RE.test("p8")).toBe(false);
  expect(FOLIO_CHARS_RE.test("")).toBe(false);
});

test("FOLIO_ARABIC: the arabic half alone", () => {
  expect(FOLIO_ARABIC.test("12")).toBe(true);
  expect(FOLIO_ARABIC.test("xii")).toBe(false);
  expect(FOLIO_ARABIC.test("1x")).toBe(false);
});

test("folioToken and FOLIO_TOKEN agree on the brackets, under .replace", () => {
  expect(folioToken("8")).toBe("⟨8⟩");
  const seen: string[] = [];
  const out = "a⟨8⟩b⟨xxiv⟩c".replace(FOLIO_TOKEN, (_m, tok: string) => { seen.push(tok); return "*"; });
  expect(out).toBe("a*b*c");
  expect(seen).toEqual(["8", "xxiv"]);
  expect("a⟨x8⟩b".replace(FOLIO_TOKEN, "*")).toBe("a⟨x8⟩b");
});
