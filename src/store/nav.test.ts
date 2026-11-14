import { test, expect } from "vitest";
import { hashParts, namesEntry, entryAt, internalHash, makeHref } from "./nav.ts";
import { todayKey, entryHash, asAddress } from "./keys.ts";

const today = todayKey();
const dt = (h: { date: string; tag: string | null }) => h.date + "|" + h.tag;

test("hashParts: a day, a tagged day, and the today fallback", () => {
  expect(dt(hashParts(asAddress("#2020-02-03")))).toBe("2020-02-03|null");
  expect(dt(hashParts(asAddress("#2020-02-03/My%20Tag")))).toBe("2020-02-03|My Tag");
  const g = hashParts(asAddress("#garbage"));
  expect(dt(g)).toBe(today + "|null");
  expect(g.hl).toBe(null);
  expect(dt(hashParts(asAddress("#2020-01-01/100%zz")))).toBe(today + "|null");
});

test("hashParts: the ?h=…&n=… highlight payload", () => {
  const h = hashParts(asAddress("#2020-02-03/My%20Tag?h=a%20b&n=2"));
  expect(dt(h)).toBe("2020-02-03|My Tag");
  expect(h.hl).toEqual({ q: "a b", nth: 2 });
  expect(hashParts(asAddress("#2020-02-03?h=x")).hl!.nth).toBe(0);
  expect(hashParts(asAddress("#2020-02-03")).hl).toBe(null);
  const m = hashParts(asAddress("#2020-01-05/notes?h=%zz"));
  expect(dt(m)).toBe("2020-01-05|notes");
  expect(m.hl).toBe(null);
});

test("hashParts: an address names a line as the line box takes it, one number, a lettered number, or stanza and line", () => {
  const h = hashParts(asAddress("#bookshelf/Silius/Book%201?line=672"));
  expect(dt(h)).toBe("bookshelf|Silius/Book 1");
  expect(h.hl).toEqual({ q: "", nth: 0, line: "672" });
  expect(hashParts(asAddress("#bookshelf/Spenser/1.1?line=2.1")).hl!.line).toBe("2.1");
  expect(hashParts(asAddress("#bookshelf/Silius/Book%208?line=157a")).hl!.line).toBe("157a");
  expect(hashParts(asAddress("#bookshelf/Silius/Book%2016?line=[378]")).hl!.line).toBe("[378]");
  for (const bad of ["0", "x", "6xy", "6X", "", "2.", ".1", "2.1a"]) expect(hashParts(asAddress("#bookshelf/Silius?line=" + bad)).hl).toBe(null);
});

test("entryHash writes the line an address names back as it was read", () => {
  const raw = asAddress("#bookshelf/Silius/Book%201?line=672");
  const h = hashParts(raw);
  expect(entryHash(h.date, h.tag, h.hl!)).toBe(raw);
});

test("hashParts: a commonplace routes; anything less falls back and drops the payload", () => {
  expect(dt(hashParts(asAddress("#commonplace/Making%20Verity%20Cards")))).toBe("commonplace|Making Verity Cards");
  const p = hashParts(asAddress("#commonplace/Notes?h=a%20b&n=2"));
  expect(dt(p)).toBe("commonplace|Notes");
  expect(p.hl).toEqual({ q: "a b", nth: 2 });
  expect(dt(hashParts(asAddress("#page")))).toBe(today + "|null");
  expect(dt(hashParts(asAddress("#commonplace/")))).toBe(today + "|null");
  const u = hashParts(asAddress("#commonplace/100%zz?h=x"));
  expect(dt(u)).toBe(today + "|null");
  expect(u.hl).toBe(null);
  expect(dt(hashParts(asAddress("#commonplace/a%3Fb")))).toBe("commonplace|a-b");
  expect(hashParts(asAddress("#commonplace/" + "a".repeat(299))).tag!.length).toBe(245);
  expect(dt(hashParts(asAddress("#commonplace/page")))).toBe("commonplace|page");
});

test("hashParts: a commonplace hierarchy at any depth, per-segment rules", () => {
  expect(dt(hashParts(asAddress("#commonplace/Kent%20Beck/TDD")))).toBe("commonplace|Kent Beck/TDD");
  expect(dt(hashParts(asAddress("#commonplace/Kent%20Beck%2FTDD")))).toBe("commonplace|Kent Beck/TDD");
  expect(dt(hashParts(asAddress("#commonplace/Kent%20Beck/")))).toBe("commonplace|Kent Beck");
  expect(dt(hashParts(asAddress("#commonplace/a%3Fb/c%3Fd")))).toBe("commonplace|a-b/c-d");
  expect(hashParts(asAddress("#commonplace/" + "a".repeat(299) + "/" + "b".repeat(299))).tag).toBe("a".repeat(245) + "/" + "b".repeat(245));
  const deep = hashParts(asAddress("#commonplace/A/B/C?h=x"));
  expect(dt(deep)).toBe("commonplace|A/B/C");
  expect(deep.hl!.q).toBe("x");
  expect(dt(hashParts(asAddress("#commonplace/A/B/C/")))).toBe("commonplace|A/B/C");
  expect(dt(hashParts(asAddress("#commonplace/A//C")))).toBe(today + "|null");
  expect(dt(hashParts(asAddress("#commonplace//B")))).toBe(today + "|null");
  expect(dt(hashParts(asAddress("#commonplace/A/100%zz")))).toBe(today + "|null");
  expect(dt(hashParts(asAddress("#commonplace/My%20%28Notes%29/Sub")))).toBe("commonplace|My (Notes)/Sub");
  expect(dt(hashParts(asAddress("#bookshelf/Book/Part")))).toBe("bookshelf|Book/Part");
});

const doc = "https://gesta.example/journal/index.html";

test("internalHash: same origin and path is this document, anything else is not", () => {
  expect(internalHash(doc + "#2026-01-02", doc)).toBe("#2026-01-02");
  expect(internalHash("#commonplace/X", doc)).toBe("#commonplace/X");
  expect(internalHash("index.html#2026-01-02", doc)).toBe("#2026-01-02");
  expect(internalHash(doc + "?x=1#a", doc)).toBe("#a");
  expect(internalHash("https://other.example/journal/index.html#a", doc)).toBe(null);
  expect(internalHash("https://gesta.example/other/index.html#a", doc)).toBe(null);
  expect(internalHash(doc, doc)).toBe(null);
  expect(internalHash("http://[bad", doc)).toBe(null);
  expect(internalHash(doc + "#commonplace/Kent%20Beck", doc)).toBe("#commonplace/Kent%20Beck");
});

test("makeHref: a same-document URL mints as its bare fragment; the rest keeps its address", () => {
  expect(makeHref(doc + "#commonplace/Kent Beck/TDD", doc)).toBe("#commonplace/Kent Beck/TDD");
  expect(makeHref("index.html#2026-01-02", doc)).toBe("#2026-01-02");
  expect(makeHref("https://example.com/index.html#commonplace/X", doc)).toBe("https://example.com/index.html#commonplace/X");
  expect(makeHref("www.foo.com", doc)).toBe("https://www.foo.com");
  expect(makeHref("https://foo.com", doc)).toBe("https://foo.com");
  expect(makeHref('https://f.com/"x"', doc)).toBe("https://f.com/%22x%22");
});

test("makeHref under file://, the deploy the app ships in", () => {
  const f = "file:///Users/x/writer/index.html";
  expect(makeHref(f + "#2026-01-02", f)).toBe("#2026-01-02");
  expect(makeHref("file:///Users/x/other/index.html#2026-01-02", f)).toBe("file:///Users/x/other/index.html#2026-01-02");
});

test("an address is read with its #, and one entryHash mints reads back as that entry", () => {
  expect(dt(hashParts(asAddress("#commonplace/Books/Essay")))).toBe("commonplace|Books/Essay");
  expect(dt(hashParts(entryHash("bookshelf", "Milton, John/Paradise Lost")))).toBe("bookshelf|Milton, John/Paradise Lost");
  expect(namesEntry(asAddress("#2020-02-03/My%20Tag"))).toBe(true);
  expect(namesEntry(asAddress("#garbage"))).toBe(false);
  expect(namesEntry(asAddress(""))).toBe(false);
});

test("text without the # is no address: it names no entry, and hashParts falls back to today", () => {
  expect(namesEntry(asAddress("2020-02-03/My%20Tag"))).toBe(false);
  expect(namesEntry(asAddress("commonplace/Books"))).toBe(false);
  expect(dt(hashParts(asAddress("commonplace/Books")))).toBe(today + "|null");
});

test("entryAt reads an address once: the entry it names, or null where hashParts would fall back", () => {
  expect(entryAt(asAddress("#commonplace/Books/Essay?h=x"))).toEqual({ date: "commonplace", tag: "Books/Essay", hl: { q: "x", nth: 0 } });
  expect(entryAt(asAddress("#garbage"))).toBeNull();
  expect(entryAt(asAddress("commonplace/Books"))).toBeNull();
});
