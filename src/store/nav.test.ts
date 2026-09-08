// The address grammar, ported 2026-09-07 from ../writer/src/js/nav.test.mjs.
import { test, expect } from "vitest";
import { hashParts, internalHash, makeHref } from "./nav.ts";
import { todayKey } from "./keys.ts";

const today = todayKey();
const dt = (h: { date: string; tag: string | null }) => h.date + "|" + h.tag;

test("hashParts: a day, a tagged day, and the today fallback", () => {
  expect(dt(hashParts("2020-02-03"))).toBe("2020-02-03|null");
  expect(dt(hashParts("2020-02-03/My%20Tag"))).toBe("2020-02-03|My Tag");
  const g = hashParts("garbage");
  expect(dt(g)).toBe(today + "|null");
  expect(g.hl).toBe(null);
  expect(dt(hashParts("2020-01-01/100%zz"))).toBe(today + "|null");
});

test("hashParts: the ?h=…&n=… highlight payload", () => {
  const h = hashParts("2020-02-03/My%20Tag?h=a%20b&n=2");
  expect(dt(h)).toBe("2020-02-03|My Tag");
  expect(h.hl).toEqual({ q: "a b", nth: 2 });
  expect(hashParts("2020-02-03?h=x").hl!.nth).toBe(0);
  expect(hashParts("2020-02-03").hl).toBe(null);
  const m = hashParts("2020-01-05/notes?h=%zz");
  expect(dt(m)).toBe("2020-01-05|notes");
  expect(m.hl).toBe(null);
});

test("hashParts: a page routes; anything less falls back and drops the payload", () => {
  expect(dt(hashParts("page/Making%20Verity%20Cards"))).toBe("page|Making Verity Cards");
  const p = hashParts("page/Notes?h=a%20b&n=2");
  expect(dt(p)).toBe("page|Notes");
  expect(p.hl).toEqual({ q: "a b", nth: 2 });
  expect(dt(hashParts("page"))).toBe(today + "|null");
  expect(dt(hashParts("page/"))).toBe(today + "|null");
  const u = hashParts("page/100%zz?h=x");
  expect(dt(u)).toBe(today + "|null");
  expect(u.hl).toBe(null);
  expect(dt(hashParts("page/a%3Fb"))).toBe("page|a-b");
  expect(hashParts("page/" + "a".repeat(299)).tag!.length).toBe(245);
  expect(dt(hashParts("page/page"))).toBe("page|page");
});

test("hashParts: a page hierarchy at any depth, per-segment rules", () => {
  expect(dt(hashParts("page/Kent%20Beck/TDD"))).toBe("page|Kent Beck/TDD");
  expect(dt(hashParts("page/Kent%20Beck%2FTDD"))).toBe("page|Kent Beck/TDD");
  expect(dt(hashParts("page/Kent%20Beck/"))).toBe("page|Kent Beck");
  expect(dt(hashParts("page/a%3Fb/c%3Fd"))).toBe("page|a-b/c-d");
  expect(hashParts("page/" + "a".repeat(299) + "/" + "b".repeat(299)).tag).toBe("a".repeat(245) + "/" + "b".repeat(245));
  const deep = hashParts("page/A/B/C?h=x");
  expect(dt(deep)).toBe("page|A/B/C");
  expect(deep.hl!.q).toBe("x");
  expect(dt(hashParts("page/A/B/C/"))).toBe("page|A/B/C");
  expect(dt(hashParts("page/A//C"))).toBe(today + "|null");
  expect(dt(hashParts("page//B"))).toBe(today + "|null");
  expect(dt(hashParts("page/A/100%zz"))).toBe(today + "|null");
  expect(dt(hashParts("page/My%20%28Notes%29/Sub"))).toBe("page|My (Notes)/Sub");
  expect(dt(hashParts("bookshelf/Book/Part"))).toBe("bookshelf|Book/Part");
});

const doc = "https://gesta.example/journal/index.html";

test("internalHash: same origin and path is this document, anything else is not", () => {
  expect(internalHash(doc + "#2026-01-02", doc)).toBe("#2026-01-02");
  expect(internalHash("#page/X", doc)).toBe("#page/X");
  expect(internalHash("index.html#2026-01-02", doc)).toBe("#2026-01-02");
  expect(internalHash(doc + "?x=1#a", doc)).toBe("#a");
  expect(internalHash("https://other.example/journal/index.html#a", doc)).toBe(null);
  expect(internalHash("https://gesta.example/other/index.html#a", doc)).toBe(null);
  expect(internalHash(doc, doc)).toBe(null);
  expect(internalHash("http://[bad", doc)).toBe(null);
  expect(internalHash(doc + "#page/Kent%20Beck", doc)).toBe("#page/Kent%20Beck");
});

test("makeHref: a same-document URL mints as its bare fragment; the rest keeps its address", () => {
  expect(makeHref(doc + "#page/Kent Beck/TDD", doc)).toBe("#page/Kent Beck/TDD");
  expect(makeHref("index.html#2026-01-02", doc)).toBe("#2026-01-02");
  expect(makeHref("https://example.com/index.html#page/X", doc)).toBe("https://example.com/index.html#page/X");
  expect(makeHref("www.foo.com", doc)).toBe("https://www.foo.com");
  expect(makeHref("https://foo.com", doc)).toBe("https://foo.com");
  expect(makeHref('https://f.com/"x"', doc)).toBe("https://f.com/%22x%22");
});

test("makeHref under file://, the deploy the app ships in", () => {
  const f = "file:///Users/x/writer/index.html";
  expect(makeHref(f + "#2026-01-02", f)).toBe("#2026-01-02");
  expect(makeHref("file:///Users/x/other/index.html#2026-01-02", f)).toBe("file:///Users/x/other/index.html#2026-01-02");
});
