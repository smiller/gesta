import { describe, it, expect } from "vitest";
import type { Node } from "prosemirror-model";
import { EditorState, TextSelection, type Transaction } from "prosemirror-state";
import { lifecycle, coldRefusal, refuseCold } from "./lifecycle.ts";
import { entryLayer } from "../store/entries.ts";
import { memEntryStore, type EntryStore } from "../store/store.ts";
import { journalOf } from "../store/headings.ts";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { entryKey } from "../store/keys.ts";

interface Opts {
  at: [string, string | null];
  entries?: Record<string, string>;
  md?: string;
  warm?: "no" | "failed";
  failSet?: string | string[];
  failDel?: string | string[];
  noView?: boolean;
}
async function world(o: Opts) {
  const log: string[] = [];
  const mem = memEntryStore();
  for (const [k, v] of Object.entries(o.entries ?? {})) await mem.set(k, v);
  let onSet: ((key: string) => void) | null = null;
  const store: EntryStore = {
    ...mem,
    set: (k, md) => { log.push("set " + k); onSet?.(k); return [o.failSet].flat().includes(k) ? Promise.reject(new Error("blocked")) : mem.set(k, md); },
    del: (k) => { log.push("del " + k); return [o.failDel].flat().includes(k) ? Promise.reject(new Error("blocked")) : mem.del(k); },
    all: () => o.warm === "failed" ? Promise.reject(new Error("blocked")) : mem.all(),
  };
  const layer = entryLayer(store, { landed() {}, removed() {}, stuck() {}, stuckIdle() {} });
  if (o.warm !== "no") await layer.warm();
  let current = { date: o.at[0], tag: o.at[1] };
  const here = (): string => entryKey(current.date, current.tag);
  let st = EditorState.create({ doc: parseMarkdown(o.md ?? (o.entries ?? {})[here()] ?? "") });
  const view = {
    get state() { return st; },
    dispatch: (tr: Transaction) => { log.push("edit"); st = st.apply(tr); },
  };
  const answers: (string | null | boolean)[] = [];
  const asked: string[] = [];
  let onFlush: (() => void) | null = null;
  let typed: string | null = null;
  let dropped = false;
  const life = lifecycle({
    layer,
    journal: journalOf(layer.cache),
    view: () => o.noView || dropped ? null : view,
    session: {
      get current() { return current; },
      flushSave: () => { log.push("flush"); onFlush?.(); return Promise.resolve(true); },
      suspendSaves: () => { log.push("suspend"); },
      surfaceMd: () => typed ?? serializeMarkdown(st.doc),
      open: (date, tag, how) => { log.push("open " + entryKey(date, tag) + (how ? " " + how : "")); current = { date, tag }; },
      movePlace: (from, to) => { log.push("move " + from + " → " + to); },
      movePlaces: (moves) => { log.push("places " + Object.entries(moves).map(([a, b]) => a + " → " + b).join(", ")); },
      refresh: () => { log.push("refresh"); return Promise.resolve(); },
      goto: (hash, same) => { log.push("goto " + hash + (same ? " | " + same : "")); },
      saveNow: () => { log.push("save"); return layer.setEntry(here(), serializeMarkdown(st.doc)); },
    },
    dialogs: {
      prompt: (text, value) => { asked.push(text + (value !== undefined ? " [" + value + "]" : "")); return answers.shift() as string | null; },
      confirm: (text) => { asked.push(text); return answers.shift() as boolean; },
      alert: (text) => { log.push("alert " + text); },
    },
    moveKept: (moves) => { log.push("kept " + Object.entries(moves).map(([a, b]) => a + " → " + b).join(", ")); },
    ui: {
      say: (text) => { log.push("say " + text); },
      pin: (text) => { log.push("pin " + text); },
      redraw: () => { log.push("redraw"); },
      replaceHash: (hash) => { log.push("hash " + hash); },
      hideBar: () => { log.push("hideBar"); },
      focus: () => { log.push("focus"); },
    },
  });
  return {
    life, layer, log, asked,
    foreign: (k: string, md: string) => mem.foreignSet(k, md),
    answer: (...a: (string | null | boolean)[]) => { answers.push(...a); },
    md: (k: string) => k in layer.cache ? layer.cache[k] : null,
    doc: () => st.doc,
    select: (from: number, to = from) => { st = st.apply(st.tr.setSelection(TextSelection.create(st.doc, from, to))); },
    typeMeanwhile: (md: string) => { typed = md; },
    onFlush: (f: () => void) => { onFlush = f; },
    onSet: (f: (key: string) => void) => { onSet = f; },
    edit: (f: (s: EditorState) => Transaction) => { st = st.apply(f(st)); },
    leave: (date: string, tag: string | null) => { current = { date, tag }; },
    dropView: () => { dropped = true; },
  };
}
/* the position just before the first occurrence of `text` in a textblock */
const pos = (doc: Node, text: string, after = false): number => {
  let at = -1;
  doc.descendants((n, p) => {
    if (at === -1 && n.isText && n.text!.includes(text)) at = p + n.text!.indexOf(text) + (after ? text.length : 0);
    return at === -1;
  });
  return at;
};
const LOADING = "still loading — try that again in a moment";
const before = (log: string[], a: string, b: string): boolean => log.indexOf(a) !== -1 && log.indexOf(a) < log.indexOf(b);

describe("the cold cache", () => {
  it("refuses every operation, writing nothing; a new root asks before it refuses", async () => {
    const w = await world({ at: ["page", "A"], entries: { "page/A": "# A\n\nhello\n" }, warm: "no" });
    w.select(pos(w.doc(), "hello"), pos(w.doc(), "hello", true));
    await w.life.create();
    await w.life.extract();
    await w.life.rename();
    await w.life.remove();
    expect(w.asked).toEqual([]);
    w.answer("Z");
    await w.life.newRoot("page");
    expect(w.asked).toEqual(["Name for the new page:"]);
    expect(w.log).toEqual(Array(5).fill("say " + LOADING));
  });
  it("says loading while the warm runs, and that the read failed once it has", async () => {
    const cold = await world({ at: ["page", "A"], warm: "no" });
    expect(coldRefusal(cold.layer)).toBe(LOADING);
    const failed = await world({ at: ["page", "A"], warm: "failed" });
    expect(coldRefusal(failed.layer)).toBe("couldn’t load entries — reload first");
    const said: string[] = [];
    expect(refuseCold(failed.layer, (t) => { said.push(t); })).toBe(true);
    expect(refuseCold((await world({ at: ["page", "A"] })).layer, (t) => { said.push(t); })).toBe(false);
    expect(said).toEqual(["couldn’t load entries — reload first"]);
    const warm = await world({ at: ["page", "A"] });
    expect(coldRefusal(warm.layer)).toBeNull();
  });
});

describe("create", () => {
  it("refuses on a day's tagged entry without asking", async () => {
    const w = await world({ at: ["2026-09-30", "x"] });
    await w.life.create();
    expect(w.asked).toEqual([]);
    expect(w.log).toEqual(["say a tagged entry holds no entries of its own"]);
  });
  it("does nothing when the prompt is cancelled, and says a name the naming rule refuses", async () => {
    const w = await world({ at: ["page", "A"], entries: { "page/A": "hello\n" } });
    w.answer(null, "?");
    await w.life.create();
    await w.life.create();
    expect(w.asked).toEqual(["Name for the new sub-page:", "Name for the new sub-page:"]);
    expect(w.log).toEqual(["say that name leaves nothing a filename can keep"]);
  });
  it("goes to a name already there, writing nothing", async () => {
    const w = await world({ at: ["page", "A"], entries: { "page/A": "hello\n", "page/A/B": "b\n" } });
    w.answer("B");
    await w.life.create();
    expect(w.log).toEqual(["goto #page/A/B | already here"]);
  });
  it("refuses with no editor, or a caret where no link may go, before anything is minted", async () => {
    const none = await world({ at: ["page", "A"], entries: { "page/A": "hello\n" }, noView: true });
    none.answer("B");
    await none.life.create();
    expect(none.log).toEqual(["say place your cursor in the entry"]);
    const code = await world({ at: ["page", "A"], entries: { "page/A": "```\ncode\n```\n" } });
    code.select(pos(code.doc(), "code", true));
    code.answer("B");
    await code.life.create();
    expect(code.log).toEqual(["say no link inside a code block"]);
    expect(code.md("page/A/B")).toBeNull();
  });
  it("registers the name empty, then puts the link after the caret, saves, redraws, goes", async () => {
    const w = await world({ at: ["page", "A"], entries: { "page/A": "hello\n" } });
    w.select(pos(w.doc(), "hello", true));
    w.answer("B");
    await w.life.create();
    expect(w.log).toEqual(["set page/A/B", "edit", "save", "set page/A", "redraw", "goto #page/A/B"]);
    expect(w.md("page/A")).toBe("hello[B](#page/A/B)");
    expect(w.md("page/A/B")).toBe("");
  });
  it("says a registration that did not land, and places no link", async () => {
    const w = await world({ at: ["page", "A"], entries: { "page/A": "hello\n" }, failSet: "page/A/B" });
    w.select(pos(w.doc(), "hello", true));
    w.answer("B");
    await w.life.create();
    expect(w.log).toEqual(["set page/A/B", "say couldn't create the entry — see the corner"]);
    expect(serializeMarkdown(w.doc())).toBe("hello");
  });
  it("leaves the new entry standing and says so when the editor went away during the write", async () => {
    const w = await world({ at: ["page", "A"], entries: { "page/A": "hello\n" } });
    w.select(pos(w.doc(), "hello", true));
    w.onSet((k) => { if (k === "page/A/B") w.dropView(); });
    w.answer("B");
    await w.life.create();
    expect(w.log).toEqual(["set page/A/B", "say the entry was made — the link was not placed"]);
    expect(w.md("page/A/B")).toBe("");
  });
});

describe("extract", () => {
  const HOST = "# A\n\n# Part\n\nbody text\n\nkeep";
  it("does nothing with no editor or nothing selected", async () => {
    const none = await world({ at: ["page", "A"], entries: { "page/A": HOST }, noView: true });
    await none.life.extract();
    const empty = await world({ at: ["page", "A"], entries: { "page/A": HOST } });
    await empty.life.extract();
    expect([...none.asked, ...empty.asked, ...none.log, ...empty.log]).toEqual([]);
  });
  it("alerts a name already taken, writing nothing", async () => {
    const w = await world({ at: ["page", "A"], entries: { "page/A": HOST, "page/A/P": "p\n" } });
    w.select(pos(w.doc(), "body"), pos(w.doc(), "text", true));
    w.answer("P");
    await w.life.extract();
    expect(w.log).toEqual(['alert A "P" sub-page already exists.']);
  });
  it("moves the selection into the new entry, leaves a link labelled by its heading, hides the bar, saves, goes", async () => {
    const w = await world({ at: ["page", "A"], entries: { "page/A": HOST } });
    w.select(pos(w.doc(), "Part"), pos(w.doc(), "body text", true));
    w.answer("P");
    await w.life.extract();
    expect(w.log).toEqual(["set page/A/P", "edit", "hideBar", "save", "set page/A", "redraw", "goto #page/A/P"]);
    expect(w.md("page/A/P")).toBe("# Part\n\nbody text");
    expect(w.md("page/A")).toBe("# A\n\n[Part](#page/A/P)\n\nkeep");
  });
  it("labels the link by its tag outside a namespace", async () => {
    const w = await world({ at: ["2026-09-30", null], entries: { "2026-09-30": "one two three\n" } });
    w.select(pos(w.doc(), "two"), pos(w.doc(), "two", true));
    w.answer("t");
    await w.life.extract();
    expect(w.md("2026-09-30")).toBe("one [t](#2026-09-30/t) three");
  });
  it("says a write that did not land, and leaves the text", async () => {
    const w = await world({ at: ["page", "A"], entries: { "page/A": HOST }, failSet: "page/A/P" });
    w.select(pos(w.doc(), "Part"), pos(w.doc(), "body text", true));
    w.answer("P");
    await w.life.extract();
    expect(w.log).toEqual(["set page/A/P", "say couldn't create the entry — see the corner"]);
    expect(serializeMarkdown(w.doc())).toBe(HOST);
  });
  it("places no link when the text moved during the write; the new entry stands", async () => {
    const w = await world({ at: ["page", "A"], entries: { "page/A": HOST } });
    w.select(pos(w.doc(), "Part"), pos(w.doc(), "body text", true));
    w.onSet((k) => { if (k === "page/A/P") w.edit((s) => s.tr.insertText("moved ", 1)); });
    w.answer("P");
    await w.life.extract();
    expect(w.log).toEqual(["set page/A/P", "say the text moved while the entry was made — the link was not placed"]);
    expect(w.md("page/A/P")).toBe("# Part\n\nbody text");
    expect(serializeMarkdown(w.doc())).not.toContain("#page/A/P");
  });
});

describe("rename", () => {
  it("refuses with no tag, over sub-pages holding text, on the same name, and on a taken one", async () => {
    const root = await world({ at: ["page", null] });
    await root.life.rename();
    expect([...root.asked, ...root.log]).toEqual([]);
    const full = await world({ at: ["page", "A"], entries: { "page/A": "a\n", "page/A/B": "text\n" } });
    await full.life.rename();
    expect(full.log).toEqual(["say rename after the sub-pages are deleted"]);
    const same = await world({ at: ["page", "A/B"], entries: { "page/A/B": "b\n", "page/A/C": "c\n" } });
    same.answer("B", "C");
    await same.life.rename();
    expect(same.asked).toEqual(['Rename the sub-page "B" to: [B]']);
    expect(same.log).toEqual([]);
    await same.life.rename();
    expect(same.log).toEqual(['alert A "C" sub-page already exists.']);
  });
  it("flushes, suspends, writes the new key before clearing the old, retargets the host, carries what was typed meanwhile, then opens and moves the places", async () => {
    const w = await world({ at: ["page", "A/B"], entries: { "page/A": "- [B](#page/A/B)\n", "page/A/B": "body\n", "page/A/B/x": "" } });
    w.typeMeanwhile("body more\n");
    w.answer("C");
    await w.life.rename();
    const l = w.log;
    expect(l.slice(0, 2)).toEqual(["flush", "suspend"]);
    expect(before(l, "set page/A/C", "del page/A/B")).toBe(true);
    expect(l).toContain("del page/A/B/x");
    expect(l.slice(l.indexOf("del page/A/B") + 1)).toEqual([
      "set page/A", "set page/A/C", "kept page/A/B → page/A/C", "hash #page/A/C", "open page/A/C",
      "move page/A/B → page/A/C", "move page/A/B/x → null", "redraw",
    ]);
    expect(w.md("page/A/C")).toBe("body more\n");
    expect(w.md("page/A/B")).toBeNull();
    expect(w.md("page/A/B/x")).toBeNull();
    expect(w.md("page/A")).toBe("- [C](#page/A/C)");
  });
  it("ignores a second rename while one is in flight", async () => {
    const w = await world({ at: ["page", "A/B"], entries: { "page/A/B": "b\n" } });
    w.answer("C", "D");
    const first = w.life.rename();
    await w.life.rename();
    await first;
    expect(w.asked).toHaveLength(1);
  });
  it("writes nothing when the entry was left during the flush", async () => {
    const w = await world({ at: ["page", "A/B"], entries: { "page/A/B": "b\n", "page/Q": "q\n" } });
    w.onFlush(() => { w.leave("page", "Q"); });
    w.answer("C");
    await w.life.rename();
    expect(w.log).toEqual(["flush"]);
    expect(w.md("page/A/B")).toBe("b\n");
  });
});

describe("delete", () => {
  it("refuses over sub-pages holding text, and does nothing when the confirm is declined", async () => {
    const full = await world({ at: ["page", "A"], entries: { "page/A": "a\n", "page/A/B": "text\n" } });
    await full.life.remove();
    expect(full.log).toEqual(["say delete the sub-pages first"]);
    const no = await world({ at: ["page", "A/B"], entries: { "page/A/B": "b\n" } });
    no.answer(false);
    await no.life.remove();
    expect(no.asked).toEqual(['Delete the sub-page "B"?']);
    expect(no.log).toEqual([]);
  });
  it("opens the landing and drops the places BEFORE removing, then flushes, unlinks the host, refreshes, redraws, focuses", async () => {
    const w = await world({ at: ["page", "A/B"], entries: { "page/A": "- [B](#page/A/B)\n", "page/A/B": "body\n", "page/A/B/x": "" } });
    w.answer(true);
    await w.life.remove();
    const l = w.log;
    expect(l.slice(0, 4)).toEqual(["hash #page/A", "open page/A arrive", "move page/A/B → null", "move page/A/B/x → null"]);
    expect(l.slice(4, 6).sort()).toEqual(["del page/A/B", "del page/A/B/x"]);
    expect(l.slice(l.indexOf("flush"))).toEqual(["flush", "set page/A", "refresh", "redraw", "focus"]);
    expect(w.md("page/A/B")).toBeNull();
    expect(w.md("page/A/B/x")).toBeNull();
    expect(w.md("page/A")).not.toContain("#page/A/B");
  });
});

describe("a new root", () => {
  it("goes to a name already there; registers a new one empty, then goes; goes nowhere when the write did not land", async () => {
    const there = await world({ at: ["page", null], entries: { "page/Z": "z\n" } });
    there.answer("Z");
    await there.life.newRoot("page");
    expect(there.log).toEqual(["goto #page/Z | already on Z"]);
    const fresh = await world({ at: ["page", null] });
    fresh.answer("Y");
    await fresh.life.newRoot("page");
    expect(fresh.log).toEqual(["set page/Y", "goto #page/Y | already on Y"]);
    expect(fresh.md("page/Y")).toBe("");
    const failed = await world({ at: ["page", null], failSet: "page/Y" });
    failed.answer("Y");
    await failed.life.newRoot("page");
    expect(failed.log).toEqual(["set page/Y"]);
  });
});

describe("a new root named as the dropdown shows an existing one", () => {
  it("goes to the author whose label was typed, case aside, writing nothing", async () => {
    const w = await world({ at: ["bookshelf", null], entries: { "bookshelf/Donne, John": "# John Donne\n" } });
    w.answer("John Donne", "john donne");
    await w.life.newRoot("bookshelf");
    await w.life.newRoot("bookshelf");
    expect(w.log).toEqual(Array(2).fill("goto #bookshelf/Donne%2C%20John | already on John Donne"));
    expect(w.md("bookshelf/John Donne")).toBeNull();
  });
  it("matches the label as typed, before the naming rule rewrites a trailing dot or a colon", async () => {
    const w = await world({ at: ["bookshelf", null], entries: { "bookshelf/Hopkins, Gerard Manley": "# Gerard Manley Hopkins, S.J.\n", "bookshelf/Pearl Poet": "# Anonymous: Pearl\n" } });
    w.answer("Gerard Manley Hopkins, S.J.", "Anonymous: Pearl");
    await w.life.newRoot("bookshelf");
    await w.life.newRoot("bookshelf");
    expect(w.log).toEqual(["goto #bookshelf/Hopkins%2C%20Gerard%20Manley | already on Gerard Manley Hopkins, …", "goto #bookshelf/Pearl%20Poet | already on Anonymous: Pearl"]);
  });
  it("still registers a name no root carries as key or label", async () => {
    const w = await world({ at: ["bookshelf", null], entries: { "bookshelf/Donne, John": "# John Donne\n" } });
    w.answer("Ann Donne", "Donne, Ann");
    await w.life.newRoot("bookshelf");
    expect(w.log).toEqual(["set bookshelf/Donne, Ann", "goto #bookshelf/Donne%2C%20Ann | already on Ann Donne"]);
  });
});

describe("a new author asks where it sorts", () => {
  it("asks the name, then where it sorts with the filing form filled in; files it there, headed by the name", async () => {
    const w = await world({ at: ["bookshelf", null] });
    w.answer("Harley Price", "Price, Harley");
    await w.life.newRoot("bookshelf");
    expect(w.asked).toEqual(["Name for the new author:", "Sorted under: [Price, Harley]"]);
    expect(w.md("bookshelf/Price, Harley")).toBe("# Harley Price\n");
    expect(w.log).toEqual(["set bookshelf/Price, Harley", "goto #bookshelf/Price%2C%20Harley | already on Harley Price"]);
  });
  it("files under what the second box holds, through the naming rule", async () => {
    const w = await world({ at: ["bookshelf", null] });
    w.answer("Doctor Who", "Doctor Who", "C. P. Cavafy", "Cavafy, C. P.");
    await w.life.newRoot("bookshelf");
    await w.life.newRoot("bookshelf");
    expect(w.asked).toEqual(["Name for the new author:", "Sorted under: [Who, Doctor]", "Name for the new author:", "Sorted under: [Cavafy, C. P.]"]);
    expect(w.md("bookshelf/Doctor Who")).toBe("# Doctor Who\n");
    expect(w.md("bookshelf/Cavafy, C. P")).toBe("# C. P. Cavafy\n");
  });
  it("a name typed with a comma is the filing form, the heading turned round", async () => {
    const w = await world({ at: ["bookshelf", null] });
    w.answer("Price, Harley", "Price, Harley");
    await w.life.newRoot("bookshelf");
    expect(w.asked[1]).toBe("Sorted under: [Price, Harley]");
    expect(w.md("bookshelf/Price, Harley")).toBe("# Harley Price\n");
  });
  it("escape on either box makes nothing", async () => {
    const w = await world({ at: ["bookshelf", null] });
    w.answer(null, "Harley Price", null);
    await w.life.newRoot("bookshelf");
    await w.life.newRoot("bookshelf");
    expect(w.asked).toEqual(["Name for the new author:", "Name for the new author:", "Sorted under: [Price, Harley]"]);
    expect(w.log).toEqual([]);
  });
  it("a filing name already on the shelf opens that author, writing nothing", async () => {
    const w = await world({ at: ["bookshelf", null], entries: { "bookshelf/Price, Harley": "# H. Price\n" } });
    w.answer("Harley Price", "Price, Harley");
    await w.life.newRoot("bookshelf");
    expect(w.log).toEqual(["goto #bookshelf/Price%2C%20Harley | already on H. Price"]);
  });
  it("two commas are kept as typed in the heading; a pasted article link heads the page with the name derived from it", async () => {
    const w = await world({ at: ["bookshelf", null] });
    w.answer("King, Martin Luther, Jr.", "King, Martin Luther, Jr.", "https://x.org/2023/11/12/the-title/", "2023-11-12-the-title");
    await w.life.newRoot("bookshelf");
    await w.life.newRoot("bookshelf");
    expect(w.asked[1]).toBe("Sorted under: [King, Martin Luther, Jr.]");
    expect(w.md("bookshelf/King, Martin Luther, Jr")).toBe("# King, Martin Luther, Jr.\n");
    expect(w.asked[3]).toBe("Sorted under: [2023-11-12-the-title]");
    expect(w.md("bookshelf/2023-11-12-the-title")).toBe("# 2023-11-12-the-title\n");
  });
  it("a new page still asks once", async () => {
    const w = await world({ at: ["page", null] });
    w.answer("Harley Price");
    await w.life.newRoot("page");
    expect(w.asked).toEqual(["Name for the new page:"]);
    expect(w.md("page/Harley Price")).toBe("");
  });
});

const CAVAFY = {
  "bookshelf/C. P. Cavafy": "# C. P. Cavafy\n\n- [Walls](#bookshelf/C.%20P.%20Cavafy/Walls)\n- [Candles](#bookshelf/C.%20P.%20Cavafy/Candles)",
  "bookshelf/C. P. Cavafy/Walls": "With no consideration, no pity. See [Candles](#bookshelf/C.%20P.%20Cavafy/Candles).\n",
  "bookshelf/C. P. Cavafy/Candles": "The days of our future.\n",
  "bookshelf/Carroll, Lewis": "# Lewis Carroll\n",
  "2026-09-14": "Read [the walls](#bookshelf/C.%20P.%20Cavafy/Walls?h=no%20pity) today; and [Carroll](#bookshelf/Carroll%2C%20Lewis).\n",
  "page/Poets": "[Cavafy](#bookshelf/C.%20P.%20Cavafy)\n",
};
describe("rename re-files an author with books", () => {
  it("asks where it files and sorts, filled with the filed name; same name or Escape does nothing; a taken one alerts", async () => {
    const w = await world({ at: ["bookshelf", "C. P. Cavafy"], entries: CAVAFY });
    w.answer(null, "C. P. Cavafy", "Carroll, Lewis");
    await w.life.rename();
    await w.life.rename();
    await w.life.rename();
    expect(w.asked).toEqual(Array(3).fill("File and sort “C. P. Cavafy” under: [C. P. Cavafy]"));
    expect(w.log).toEqual(['alert A "Carroll, Lewis" author already exists.']);
  });
  it("moves every entry, rewrites every link into it, removes the old only after, carries the places, folds and bookmarks, opens it, says so", async () => {
    const w = await world({ at: ["bookshelf", "C. P. Cavafy"], entries: CAVAFY });
    w.answer("Cavafy, C. P.");
    await w.life.rename();
    const l = w.log;
    expect(l.slice(0, 2)).toEqual(["flush", "suspend"]);
    for (const k of ["", "/Walls", "/Candles"]) {
      expect(w.md("bookshelf/C. P. Cavafy" + k)).toBeNull();
      expect(before(l, "set bookshelf/Cavafy, C. P" + k, "del bookshelf/C. P. Cavafy")).toBe(true);
    }
    expect(before(l, "set 2026-09-14", "del bookshelf/C. P. Cavafy")).toBe(true);
    expect(w.md("bookshelf/Cavafy, C. P")).toBe("# C. P. Cavafy\n\n- [Walls](#bookshelf/Cavafy%2C%20C.%20P/Walls)\n- [Candles](#bookshelf/Cavafy%2C%20C.%20P/Candles)");
    expect(w.md("bookshelf/Cavafy, C. P/Walls")).toBe("With no consideration, no pity. See [Candles](#bookshelf/Cavafy%2C%20C.%20P/Candles).");
    expect(w.md("bookshelf/Cavafy, C. P/Candles")).toBe("The days of our future.\n");
    expect(w.md("2026-09-14")).toBe("Read [the walls](#bookshelf/Cavafy%2C%20C.%20P/Walls?h=no%20pity) today; and [Carroll](#bookshelf/Carroll%2C%20Lewis).");
    expect(w.md("page/Poets")).toBe("[Cavafy](#bookshelf/Cavafy%2C%20C.%20P)");
    expect(w.md("bookshelf/Carroll, Lewis")).toBe("# Lewis Carroll\n");
    const moved = "bookshelf/C. P. Cavafy → bookshelf/Cavafy, C. P, bookshelf/C. P. Cavafy/Candles → bookshelf/Cavafy, C. P/Candles, bookshelf/C. P. Cavafy/Walls → bookshelf/Cavafy, C. P/Walls";
    expect(l.slice(l.indexOf("kept " + moved))).toEqual([
      "kept " + moved, "hash #bookshelf/Cavafy%2C%20C.%20P", "open bookshelf/Cavafy, C. P", "places " + moved,
      "redraw", "say filed under Cavafy, C. P — 3 entries moved, links updated in 2 others",
    ]);
  });
  it("writes the old name as the heading of a page that had none, and carries what was typed meanwhile", async () => {
    const w = await world({ at: ["bookshelf", "Harley Price"], entries: { "bookshelf/Harley Price": "- [Book](#bookshelf/Harley%20Price/Book)\n", "bookshelf/Harley Price/Book": "text\n" } });
    w.typeMeanwhile("- [Book](#bookshelf/Harley%20Price/Book)\n\nmore\n");
    w.answer("Price, Harley");
    await w.life.rename();
    expect(w.md("bookshelf/Price, Harley")).toBe("# Harley Price\n\n- [Book](#bookshelf/Price%2C%20Harley/Book)\n\nmore");
    expect(w.log[w.log.length - 1]).toBe("say filed under Price, Harley — 2 entries moved");
  });
  it("a failed move removes the copies made and leaves the old author whole, opened again", async () => {
    const w = await world({ at: ["bookshelf", "C. P. Cavafy"], entries: CAVAFY, failSet: "bookshelf/Cavafy, C. P/Candles" });
    w.answer("Cavafy, C. P.");
    await w.life.rename();
    for (const k of Object.keys(CAVAFY)) expect(w.md(k)).toBe(CAVAFY[k as keyof typeof CAVAFY]);
    for (const k of ["", "/Walls", "/Candles"]) expect(w.md("bookshelf/Cavafy, C. P" + k)).toBeNull();
    expect(w.log).not.toContain("del bookshelf/C. P. Cavafy");
    expect(w.log.slice(-2)).toEqual(["open bookshelf/C. P. Cavafy", "pin couldn't re-file — nothing was moved"]);
  });
  it("a link spelled with an encoded slash, lowercase hex or angle brackets moves too", async () => {
    const w = await world({ at: ["bookshelf", "C. P. Cavafy"], entries: { ...CAVAFY, "2026-09-16": "[a](#bookshelf/C.%20P.%20Cavafy%2FWalls)\n", "2026-09-17": "[b](<#bookshelf/C. P. Cavafy/Candles>)\n", "2026-09-18": "[c](#bookshelf/C.%20P.%20Cav%61fy)\n" } });
    w.answer("Cavafy, C. P.");
    await w.life.rename();
    expect(w.md("2026-09-16")).toBe("[a](#bookshelf/Cavafy%2C%20C.%20P/Walls)");
    expect(w.md("2026-09-17")).toBe("[b](#bookshelf/Cavafy%2C%20C.%20P/Candles)");
    expect(w.md("2026-09-18")).toBe("[c](#bookshelf/Cavafy%2C%20C.%20P)");
    expect(w.log[w.log.length - 1]).toBe("say filed under Cavafy, C. P — 3 entries moved, links updated in 5 others");
  });
  it("a failed move keeps what was typed meanwhile, under the old name", async () => {
    const w = await world({ at: ["bookshelf", "C. P. Cavafy"], entries: CAVAFY, failSet: "bookshelf/Cavafy, C. P/Candles" });
    w.typeMeanwhile("# C. P. Cavafy\n\nTyped while it ran.\n");
    w.answer("Cavafy, C. P.");
    await w.life.rename();
    expect(w.md("bookshelf/C. P. Cavafy")).toBe("# C. P. Cavafy\n\nTyped while it ran.\n");
    expect(before(w.log, "set bookshelf/C. P. Cavafy", "open bookshelf/C. P. Cavafy")).toBe(true);
  });
  it("a failed move whose copies cannot all be taken back names those left", async () => {
    const w = await world({ at: ["bookshelf", "C. P. Cavafy"], entries: CAVAFY, failSet: "bookshelf/Cavafy, C. P/Candles", failDel: "bookshelf/Cavafy, C. P/Walls" });
    w.answer("Cavafy, C. P.");
    await w.life.rename();
    expect(w.log[w.log.length - 1]).toBe("pin couldn't re-file — copies left: bookshelf/Cavafy, C. P/Walls");
  });
  it("an old entry whose removal is refused is named in a pin, the rest moved", async () => {
    const w = await world({ at: ["bookshelf", "C. P. Cavafy"], entries: CAVAFY, failDel: "bookshelf/C. P. Cavafy/Walls" });
    w.answer("Cavafy, C. P.");
    await w.life.rename();
    expect(w.md("bookshelf/C. P. Cavafy")).toBeNull();
    expect(w.log[w.log.length - 1]).toBe("pin filed under Cavafy, C. P — 3 entries moved, links updated in 2 others; old copy kept: bookshelf/C. P. Cavafy/Walls");
  });
  it("a link refused once as stale is rewritten on the retry; one whose write fails, or that the rewrite cannot reach, is named in a pin", async () => {
    const w = await world({ at: ["bookshelf", "C. P. Cavafy"], entries: { ...CAVAFY, "2026-09-15": "[x](file:///g/index.html#bookshelf/C.%20P.%20Cavafy)\n", "page/Broken": "[y](#bookshelf/C.%20P.%20Cavafy/Walls)\n" }, failSet: "page/Broken" });
    await w.foreign("2026-09-14", "Theirs: [the walls](#bookshelf/C.%20P.%20Cavafy/Walls)\n");
    w.answer("Cavafy, C. P.");
    await w.life.rename();
    expect(w.md("2026-09-14")).toBe("Theirs: [the walls](#bookshelf/Cavafy%2C%20C.%20P/Walls)");
    expect(w.log[w.log.length - 1]).toBe("pin filed under Cavafy, C. P — 3 entries moved, links updated in 2 others; links not updated in 2 entries: 2026-09-15, page/Broken");
  });
  it("an author with no page of its own is given one, headed by the old name, so it reads the same", async () => {
    const w = await world({ at: ["bookshelf", "Boethius"], entries: { "bookshelf/Boethius/Consolatio": "- [3pr1](#bookshelf/Boethius/Consolatio/3pr1)\n", "bookshelf/Boethius/Consolatio/3pr1": "Iam cantum.\n" }, md: "" });
    w.answer("Boethius, Anicius");
    await w.life.rename();
    expect(w.md("bookshelf/Boethius, Anicius")).toBe("# Boethius\n");
    expect(w.md("bookshelf/Boethius, Anicius/Consolatio")).toBe("- [3pr1](#bookshelf/Boethius%2C%20Anicius/Consolatio/3pr1)");
    expect(Object.keys(w.layer.cache).filter((k) => k.startsWith("bookshelf/Boethius/"))).toEqual([]);
    expect(w.log[w.log.length - 1]).toBe("say filed under Boethius, Anicius — 2 entries moved");
  });
  it("a book with books under it still refuses, as a page does", async () => {
    const w = await world({ at: ["bookshelf", "C. P. Cavafy/Walls"], entries: { ...CAVAFY, "bookshelf/C. P. Cavafy/Walls/1": "one\n" } });
    await w.life.rename();
    expect(w.log).toEqual(["say rename after the books are deleted"]);
  });
  it("ignores a second rename while a re-file is in flight", async () => {
    const w = await world({ at: ["bookshelf", "C. P. Cavafy"], entries: CAVAFY });
    w.answer("Cavafy, C. P.", "Other");
    const first = w.life.rename();
    await w.life.rename();
    await first;
    expect(w.asked).toHaveLength(1);
  });
});

describe("the parent's links follow a sub-page's heading", () => {
  it("remembers the heading at first sight, and relabels the parent's minted link when it changes", async () => {
    const w = await world({ at: ["page", "A/B"], entries: { "page/A": "- [B](#page/A/B)\n", "page/A/B": "# Bee\n" } });
    w.life.shown("page/A/B", "# Bee\n");
    expect(w.log).toEqual([]);
    await w.layer.setEntry("page/A/B", "# Bumble\n");
    w.log.length = 0;
    w.life.shown("page/A/B", "# Bumble\n");
    await new Promise((r) => setTimeout(r, 0));
    expect(w.log).toEqual(["set page/A"]);
    expect(w.md("page/A")).toBe("- [Bumble](#page/A/B)");
  });
  it("writes nothing for a day, a root, or an entry with nothing stored", async () => {
    const w = await world({ at: ["page", "A"], entries: { "page/A": "# A\n", "page/A/B": "", "2026-09-30/t": "# T\n" } });
    for (const [k, md] of [["2026-09-30/t", "# T\n"], ["page/A", "# A\n"], ["page/A/B", ""]]) { w.life.shown(k, md); w.life.shown(k, md + "x"); }
    expect(w.log).toEqual([]);
  });
});
