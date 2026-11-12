import { test, expect } from "vitest";
import { positions, usage, recasings, applied } from "./miltonCaps.ts";

test("a capital the line's or a sentence's own: the first word, after . ! ? : or a dash, after an opening mark", () => {
  const at = (l: string) => positions(l).filter((p) => p.opening).map((p) => p.word);
  expect(at("Of Man’s first disobedience, and the fruit")).toEqual(["Of"]);
  expect(at("To heaven. Their martyred blood and ashes sow")).toEqual(["To", "Their"]);
  expect(at("Thus Satan: Then he spake—And so “Peace,” (Who")).toEqual(["Thus", "Then", "And", "Peace", "Who"]);
});

const PL = usage([
  "And chiefly Thou, O Spirit, that dost prefer", "But what if he our Conqueror (whom I now",
  ...Array.from({ length: 12 }, () => "that he should go, and the shepherd too"),
  ...Array.from({ length: 10 }, () => "forth from Heaven came the Angel bright"),
  "and heaven once",
]);

test("Paradise Lost's mid-sentence usage, by the word's lower case; a sentence's first word and I and O not counted", () => {
  expect(PL.get("he")).toEqual({ cap: 0, low: 13 });
  expect(PL.get("heaven")).toEqual({ cap: 10, low: 1 });
  expect(PL.get("o")).toBeUndefined();
  /* "And chiefly" and "and heaven once" open their lines */
  expect(PL.get("and")).toEqual({ cap: 0, low: 12 });
});

test("a capital Paradise Lost writes lower nine times in ten made lower, a lower case it capitalises nine in ten and three times made capital; the rest, and words it lacks, left", () => {
  const line = "lest He returning chide, the Shepherd said: Shepherds from heaven, and Angel Jordan";
  const c = recasings(line, PL);
  expect(c.map((x) => `${x.from}→${x.to}`)).toEqual(["He→he", "Shepherd→shepherd", "heaven→Heaven"]);
  expect(applied(line, c)).toBe("lest he returning chide, the shepherd said: Shepherds from Heaven, and Angel Jordan");
  expect(recasings("Of Him that ever was", usage(["the him once", "and Him", "him", "him"]))).toEqual([]);
});
