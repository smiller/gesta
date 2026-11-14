import { describe, it, expect } from "vitest";
import type { Node } from "prosemirror-model";
import { EditorState, TextSelection, type Transaction } from "prosemirror-state";
import { lifecycle, coldRefusal, refuseCold, type Dialogs, type LifecycleDeps, type UiPort } from "./lifecycle.ts";
import { entryLayer } from "../store/entries.ts";
import { entrySave, type EntrySave } from "../store/entrySave.ts";
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
  noCaret?: boolean;
  source?: boolean;
  pics?: Record<string, string>;
  failPic?: string;
  failClash?: boolean;
  sourceHeading?: boolean;
}
type EntryLayerOf = ReturnType<typeof entryLayer>;
interface WorldState { current: { date: string; tag: string | null }; st: EditorState; typed: string | null; dropped: boolean; onFlush: (() => void) | null; onSet: ((key: string) => void) | null }
const failing = (which: string | string[] | undefined, k: string): boolean => [which].flat().includes(k);
function fakeStore(o: Opts, mem: ReturnType<typeof memEntryStore>, log: string[], s: WorldState): EntryStore {
  return {
    ...mem,
    set: (k, md) => { log.push("set " + k); s.onSet?.(k); return failing(o.failSet, k) ? Promise.reject(new Error("blocked")) : mem.set(k, md); },
    del: (k) => { log.push("del " + k); return failing(o.failDel, k) ? Promise.reject(new Error("blocked")) : mem.del(k); },
    all: () => (o.warm === "failed" ? Promise.reject(new Error("blocked")) : mem.all()),
  };
}
const here = (s: WorldState): string => entryKey(s.current.date, s.current.tag);
/* the real save over the world's store, its acts logged; a hand-over runs the world's flush hook first */
function loggedSave(log: string[], s: WorldState, layer: EntryLayerOf): EntrySave {
  const save = entrySave({ screen: () => ({ ekey: here(s), md: s.typed ?? serializeMarkdown(s.st.doc) }), layer, wrote: () => {}, refused: () => {} });
  return {
    ...save,
    flush: () => { log.push("flush"); return save.flush(); },
    now: () => { log.push("save"); return save.now(); },
    handOver: (ekey) => { log.push("hand over"); s.onFlush?.(); return save.handOver(ekey); },
  };
}
function fakeSession(log: string[], s: WorldState, layer: EntryLayerOf): LifecycleDeps["session"] {
  return {
    get current() { return s.current; },
    save: loggedSave(log, s, layer),
    open: (date, tag, how) => { log.push("open " + entryKey(date, tag) + (how ? " " + how : "")); s.current = { date, tag }; },
    movePlace: (from, to) => { log.push("move " + from + " → " + to); },
    movePlaces: (moves) => { log.push("places " + Object.entries(moves).map(([a, b]) => a + " → " + b).join(", ")); },
    refresh: () => { log.push("refresh"); return Promise.resolve(); },
    goto: (hash, same) => { log.push("goto " + hash + (same ? " | " + same : "")); },
  };
}
function fakeDialogs(log: string[], asked: string[], answers: (string | null | boolean)[]): Dialogs {
  return {
    prompt: (text, value) => { asked.push(text + (value !== undefined ? " [" + value + "]" : "")); return answers.shift() as string | null; },
    confirm: (text) => { asked.push(text); return answers.shift() as boolean; },
    alert: (text) => { log.push("alert " + text); },
  };
}
const otherPicture = (pics: Record<string, string>, from: string, to: string): boolean => to in pics && pics[to] !== pics[from];
function fakePictures(o: Opts, log: string[], pics: Record<string, string>): Pick<LifecycleDeps, "copyPicture" | "removePictures" | "pictureClash"> {
  return {
    copyPicture: (from, to) => {
      log.push("pic " + from + " → " + to);
      if (to === o.failPic) return Promise.reject(new Error("blocked"));
      if (!(from in pics)) return Promise.resolve(false);
      pics[to] = pics[from];
      return Promise.resolve(true);
    },
    removePictures: (keys) => { if (keys.length) log.push("unpic " + keys.join(", ")); for (const k of keys) delete pics[k]; return Promise.resolve(); },
    pictureClash: (from, to) => { log.push("clash? " + to); return o.failClash ? Promise.reject(new Error("blocked")) : Promise.resolve(otherPicture(pics, from, to)); },
  };
}
const shownMoves = (m: Record<string, string>): string => Object.entries(m).map(([a, b]) => a + " → " + b).join(", ");
const fakeKept = (log: string[]): LifecycleDeps["moveKept"] => (folds, marks) => {
  log.push("kept " + shownMoves(folds) + (shownMoves(marks) !== shownMoves(folds) ? " | marks " + shownMoves(marks) : ""));
};
function fakeUi(log: string[]): UiPort {
  return {
    say: (text) => { log.push("say " + text); },
    pin: (text) => { log.push("pin " + text); },
    redraw: () => { log.push("redraw"); },
    replaceHash: (hash) => { log.push("hash " + hash); },
    hideBar: () => { log.push("hideBar"); },
    focus: () => { log.push("focus"); },
  };
}
async function world(o: Opts) {
  const log: string[] = [], answers: (string | null | boolean)[] = [], asked: string[] = [];
  const mem = memEntryStore();
  for (const [k, v] of Object.entries(o.entries ?? {})) await mem.set(k, v);
  const s: WorldState = { current: { date: o.at[0], tag: o.at[1] }, st: EditorState.create({ doc: parseMarkdown("") }), typed: null, dropped: false, onFlush: null, onSet: null };
  const layer = entryLayer(fakeStore(o, mem, log, s), { landed() {}, removed() {}, stuck() {}, stuckIdle() {} });
  if (o.warm !== "no") await layer.warm();
  s.st = EditorState.create({ doc: parseMarkdown(o.md ?? (o.entries ?? {})[here(s)] ?? "") });
  const view = { get state() { return s.st; }, dispatch: (tr: Transaction) => { log.push("edit"); s.st = s.st.apply(tr); } };
  const source = { insertAfter: (text: string) => { log.push("type " + text); }, inHeading: () => !!o.sourceHeading };
  const pics: Record<string, string> = { ...(o.pics ?? {}) };
  const life = lifecycle({
    layer, journal: journalOf(layer.cache),
    view: () => (o.noView || s.dropped ? null : view),
    caretInEntry: () => !o.noCaret,
    source: () => (o.source && !s.dropped ? source : null),
    session: fakeSession(log, s, layer), dialogs: fakeDialogs(log, asked, answers),
    ...fakePictures(o, log, pics), moveKept: fakeKept(log), ui: fakeUi(log),
  });
  return {
    life, layer, log, asked, pics,
    foreign: (k: string, md: string) => mem.foreignSet(k, md),
    answer: (...a: (string | null | boolean)[]) => { answers.push(...a); },
    md: (k: string) => (k in layer.cache ? layer.cache[k] : null),
    doc: () => s.st.doc,
    select: (from: number, to = from) => { s.st = s.st.apply(s.st.tr.setSelection(TextSelection.create(s.st.doc, from, to))); },
    typeMeanwhile: (md: string) => { s.typed = md; },
    onFlush: (f: () => void) => { s.onFlush = f; },
    onSet: (f: (key: string) => void) => { s.onSet = f; },
    edit: (f: (st: EditorState) => Transaction) => { s.st = s.st.apply(f(s.st)); },
    leave: (date: string, tag: string | null) => { s.current = { date, tag }; },
    dropView: () => { s.dropped = true; },
  };
}
/* the position just before the first occurrence of `text` in a textblock */
const pos = (doc: Node, text: string, after = false): number => {
  let at = -1;
  doc.descendants((n, p) => {
    if (at === -1 && n.text?.includes(text)) at = p + n.text.indexOf(text) + (after ? text.length : 0);
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
  it("a new name with the caret outside the entry refuses before anything is minted; an existing one still opens", async () => {
    const w = await world({ at: ["page", "A"], entries: { "page/A": "hello\n", "page/A/C": "c\n" }, noCaret: true });
    w.answer("B");
    await w.life.create();
    expect(w.log).toEqual(["say place your cursor in the entry"]);
    expect(w.md("page/A/B")).toBeNull();
    w.answer("C");
    await w.life.create();
    expect(w.log.slice(1)).toEqual(["goto #page/A/C | already here"]);
  });
  it("in the markdown view the link is typed after the caret, inside code too", async () => {
    const w = await world({ at: ["page", "A"], entries: { "page/A": "hello\n" }, noView: true, source: true });
    w.answer("B");
    await w.life.create();
    expect(w.log).toEqual(["set page/A/B", "type [B](#page/A/B)", "save", "set page/A", "redraw", "goto #page/A/B"]);
    /* another entry shown in the markdown view while the write ran takes no link */
    const moved = await world({ at: ["page", "A"], entries: { "page/A": "hello\n", "page/C": "c\n" }, noView: true, source: true });
    moved.onSet((k) => { if (k === "page/A/B") moved.leave("page", "C"); });
    moved.answer("B");
    await moved.life.create();
    expect(moved.log).toEqual(["set page/A/B", "say the entry was made — the link was not placed"]);
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

describe("create in a heading", () => {
  it("in the markdown view, a caret on a heading's line refuses too", async () => {
    const w = await world({ at: ["bookshelf", "Author, Test"], entries: { "bookshelf/Author, Test": "# Test Author\n" }, noView: true, source: true, sourceHeading: true });
    w.answer("Pictures");
    await w.life.create();
    expect(w.log).toEqual(["say no link inside a heading — place your cursor below it"]);
  });
  it("the Tag button refuses a selection that cuts into a heading, and takes one that holds a whole heading", async () => {
    const part = await world({ at: ["page", "A"], entries: { "page/A": "# A Title\n\nbody\n" } });
    part.select(pos(part.doc(), "Title"), pos(part.doc(), "Title", true));
    part.answer("T");
    await part.life.extract();
    expect(part.log).toEqual(["say no link inside a heading — place your cursor below it"]);
    const whole = await world({ at: ["page", "A"], entries: { "page/A": "# A\n\n# Part\n\nbody text\n\nkeep" } });
    whole.select(pos(whole.doc(), "Part"), pos(whole.doc(), "text", true));
    whole.answer("P");
    await whole.life.extract();
    expect(whole.md("page/A/P")).toBe("# Part\n\nbody text");
  });
  it("a new sub-page's link refuses a caret in the heading, so the page's own name cannot change", async () => {
    const w = await world({ at: ["bookshelf", "Author, Test"], entries: { "bookshelf/Author, Test": "# Test Author\n" } });
    w.select(1);
    w.answer("Pictures");
    await w.life.create();
    expect(w.log).toEqual(["say no link inside a heading — place your cursor below it"]);
    expect(w.md("bookshelf/Author, Test/Pictures")).toBeNull();
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
  it("refuses with no tag, on the same name, and on a taken one", async () => {
    const root = await world({ at: ["page", null] });
    await root.life.rename();
    expect([...root.asked, ...root.log]).toEqual([]);
    const same = await world({ at: ["page", "A/B"], entries: { "page/A/B": "b\n", "page/A/C": "c\n" } });
    same.answer("B", "C");
    await same.life.rename();
    expect(same.asked).toEqual(['Rename the sub-page "B" to: [B]']);
    expect(same.log).toEqual([]);
    await same.life.rename();
    expect(same.log).toEqual(['alert A "C" sub-page already exists.']);
  });
  it("flushes, suspends, writes the new keys before clearing the old, its parent's link and every other following, carries what was typed meanwhile, then opens, moves the places and says so", async () => {
    const w = await world({ at: ["page", "A/B"], entries: { "page/A": "- [B](#page/A/B)\n", "page/A/B": "body\n", "page/A/B/x": "", "page/Q": "see [B](#page/A/B/x)\n" } });
    w.typeMeanwhile("body more\n");
    w.answer("C");
    await w.life.rename();
    const l = w.log;
    expect(l.slice(0, 1)).toEqual(["hand over"]);
    expect(before(l, "set page/A/C", "del page/A/B")).toBe(true);
    expect(before(l, "set page/A", "del page/A/B")).toBe(true);
    const moved = "page/A/B → page/A/C, page/A/B/x → page/A/C/x";
    expect(l.slice(l.indexOf("del page/A/B/x") + 1)).toEqual([
      "set page/A/C", "kept " + moved, "hash #page/A/C", "open page/A/C", "places " + moved, "redraw", "say renamed to page/A/C — 2 entries, links updated in 2 others",
    ]);
    expect(w.md("page/A/C")).toBe("body more\n");
    expect(w.md("page/A/C/x")).toBe("");
    expect(w.md("page/A/B")).toBeNull();
    expect(w.md("page/A")).toBe("- [C](#page/A/C)");
    expect(w.md("page/Q")).toBe("see [B](#page/A/C/x)");
  });
  it("a page's link to itself labelled with its old name takes the new one", async () => {
    const w = await world({ at: ["page", "A/B"], entries: { "page/A": "[B](#page/A/B)\n", "page/A/B": "see [B](#page/A/B) and [here](#page/A/B)\n" } });
    w.answer("C");
    await w.life.rename();
    expect(w.md("page/A/C")).toBe("see [C](#page/A/C) and [here](#page/A/C)");
  });
  it("a page's links to its own lines move with it, and the host's to them, what was typed meanwhile included", async () => {
    const own = "[3-4](#page/A/B?line=3)\n";
    const w = await world({ at: ["page", "A/B"], entries: { "page/A": "- [B](#page/A/B)\n- [line 3](#page/A/B?line=3)\n", "page/A/B": own } });
    w.typeMeanwhile("more [3-4](#page/A/B?line=3)\n");
    w.answer("C");
    await w.life.rename();
    expect(w.md("page/A/C")).toBe("more [3-4](#page/A/C?line=3)");
    expect(w.md("page/A")).toBe("- [C](#page/A/C)\n- [line 3](#page/A/C?line=3)");
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
    expect(w.log).toEqual(["hand over"]);
    expect(w.md("page/A/B")).toBe("b\n");
  });
});

const ESSAYS = {
  "page/Essays": "2024/07/26: [Birds](#page/Essays/2024-07-26-birds)",
  "page/Essays/2024-07-26-birds": "# Birds\n\n![](page--Essays--2024-07-26-birds-img-1.webp)\n\nSee [the essay](#page/Essays/2026-07-22-essay).\n",
  "page/Essays/2026-07-22-essay": "# On Growing Older\n\nShorter.\n",
  "bookshelf/Miller, Sean": "# Sean Miller\n\n[Essays](#bookshelf/Miller%2C%20Sean/Essays)\n",
  "bookshelf/Miller, Sean/Essays": "# Essays\n\n[On Growing Older](#bookshelf/Miller%2C%20Sean/Essays/2022-07-31-essay)\n",
  "bookshelf/Miller, Sean/Essays/2022-07-31-essay": "# On Growing Older\n\nLonger.\n",
  "2026-09-01": "See [birds](#page/Essays/2024-07-26-birds?line=3) and [it](#page/Essays/2026-07-22-essay).\n",
};
const PIC = "page/Essays/page--Essays--2024-07-26-birds-img-1.webp";
const PIC_THERE = "bookshelf/Miller, Sean/Essays/bookshelf--Miller, Sean--Essays--2024-07-26-birds-img-1.webp";
const TO = "bookshelf/Miller, Sean/Essays";
describe("the pictures left behind", () => {
  const ENTRIES = {
    "page/Essays": "![](shared.webp) ![](page--Essays-img-1.webp)",
    "page/Essays/A": "![](page--Essays--A-img-1.webp)\n",
    "page/Essays/Old": "# The Twin\n\n![](twin.webp)\n",
    "page/Other": "![](shared.webp)\n",
    "bookshelf/Miller, Sean": "# Sean Miller\n",
    "bookshelf/Miller, Sean/Letters": "# Letters\n",
    "bookshelf/Miller, Sean/Letters/New": "# The Twin\n",
  };
  const PICS = { "page/shared.webp": "s", "page/page--Essays-img-1.webp": "e", "page/Essays/page--Essays--A-img-1.webp": "a", "page/Essays/twin.webp": "t" };
  it("a move deletes the old copy of each picture it carried, and a twin's, but one an entry left behind still names", async () => {
    const w = await world({ at: ["page", "Essays"], entries: ENTRIES, pics: PICS });
    w.answer("bookshelf/Miller, Sean/Letters", true);
    await w.life.rename();
    expect(Object.keys(w.pics).sort()).toEqual([
      "bookshelf/Miller, Sean/Letters/bookshelf--Miller, Sean--Letters--A-img-1.webp",
      "bookshelf/Miller, Sean/bookshelf--Miller, Sean--Letters-img-1.webp",
      "bookshelf/Miller, Sean/shared.webp",
      "page/shared.webp",
    ]);
    expect(before(w.log, "del page/Essays", "unpic page/page--Essays-img-1.webp, page/Essays/page--Essays--A-img-1.webp, page/Essays/twin.webp")).toBe(true);
  });
  it("an old entry whose removal fails keeps its pictures, as does a copy a failed move could not take back", async () => {
    const w = await world({ at: ["page", "Essays"], entries: ENTRIES, pics: PICS, failDel: "page/Essays/A" });
    w.answer("bookshelf/Miller, Sean/Letters", true);
    await w.life.rename();
    expect(w.pics["page/Essays/page--Essays--A-img-1.webp"]).toBe("a");
    const back = await world({ at: ["page", "Essays"], entries: ENTRIES, pics: PICS, failSet: "page/Letters/A", failDel: "page/Letters" });
    back.answer("page/Letters", true);
    await back.life.rename();
    expect(back.log[back.log.length - 1]).toBe("pin couldn't move — copies left: page/Letters");
    expect(back.pics["page/page--Letters-img-1.webp"]).toBe("e");
  });
  it("each copy is checked, renamed or not, one at a time just before it is made; a clash takes back those made, keeps what was typed, and names it", async () => {
    const w = await world({ at: ["page", "Essays"], entries: ENTRIES, pics: { ...PICS, "bookshelf/Miller, Sean/Letters/bookshelf--Miller, Sean--Letters--A-img-1.webp": "other" } });
    w.typeMeanwhile("typed\n");
    w.answer("bookshelf/Miller, Sean/Letters", true);
    await w.life.rename();
    const pics = w.log.filter((x) => /^(clash\?|pic) /.test(x));
    expect(pics.slice(0, 4)).toEqual([
      "clash? bookshelf/Miller, Sean/shared.webp", "pic page/shared.webp → bookshelf/Miller, Sean/shared.webp",
      "clash? bookshelf/Miller, Sean/bookshelf--Miller, Sean--Letters-img-1.webp", "pic page/page--Essays-img-1.webp → bookshelf/Miller, Sean/bookshelf--Miller, Sean--Letters-img-1.webp",
    ]);
    expect(w.pics["bookshelf/Miller, Sean/shared.webp"]).toBeUndefined();
    expect(w.md("page/Essays")).toBe("typed\n");
    expect(w.log.slice(-2)).toEqual(["open page/Essays", "pin couldn't move — a picture named bookshelf--Miller, Sean--Letters--A-img-1.webp is there already in bookshelf/Miller, Sean/Letters"]);
  });
  it("a picture read that fails reopens the page, says so, and keeps what was typed", async () => {
    const w = await world({ at: ["page", "Essays"], entries: ENTRIES, pics: PICS, failClash: true });
    w.typeMeanwhile("typed\n");
    w.answer("bookshelf/Miller, Sean/Letters", true);
    await w.life.rename();
    expect(w.md("page/Essays")).toBe("typed\n");
    expect(w.log.slice(-2)).toEqual(["open page/Essays", "pin couldn't move — a picture could not be copied, nothing was moved"]);
  });
  it("one picture two pages name under different new names is copied to each", async () => {
    const w = await world({ at: ["page", "Essays"], entries: { "page/Essays": "e", "page/Essays/A": "![](page--Essays--A-img-1.webp)\n", "page/Essays/B": "![](page--Essays--A-img-1.webp)\n" }, pics: { "page/Essays/page--Essays--A-img-1.webp": "a" } });
    w.answer("page/Letters", true);
    await w.life.rename();
    expect(w.pics).toEqual({ "page/Letters/page--Letters--A-img-1.webp": "a", "page/Letters/page--Essays--A-img-1.webp": "a" });
  });
  it("a move that fails deletes the copies it made, the old ones kept", async () => {
    const w = await world({ at: ["page", "Essays"], entries: ENTRIES, pics: PICS, failSet: "bookshelf/Miller, Sean/Letters/A" });
    w.answer("bookshelf/Miller, Sean/Letters", true);
    await w.life.rename();
    expect(Object.keys(w.pics).sort()).toEqual(Object.keys(PICS).sort());
  });
  it("a re-file deletes the old copies of its books' pictures", async () => {
    const w = await world({ at: ["bookshelf", "C. P. Cavafy"], entries: { ...CAVAFY, "bookshelf/C. P. Cavafy/Walls": "![](map.png)\n" }, pics: { "bookshelf/C. P. Cavafy/map.png": "m" } });
    w.answer("Cavafy, C. P.");
    await w.life.rename();
    expect(w.pics).toEqual({ "bookshelf/Cavafy, C. P/map.png": "m" });
  });
  it("a delete whose removal fails keeps the entry's pictures", async () => {
    const w = await world({ at: ["page", "Other"], entries: { "page/Other": "![](own.webp)\n" }, pics: { "page/own.webp": "o" }, failDel: "page/Other" });
    w.answer(true);
    await w.life.remove();
    expect(w.pics).toEqual({ "page/own.webp": "o" });
  });
  it("a delete deletes the entry's pictures, but one another entry still names", async () => {
    const w = await world({ at: ["page", "Other"], entries: { "page/Other": "![](shared.webp) ![](own.webp)\n", "page/Essays": "![](shared.webp)" }, pics: { "page/shared.webp": "s", "page/own.webp": "o" } });
    w.answer(true);
    await w.life.remove();
    expect(w.pics).toEqual({ "page/shared.webp": "s" });
    expect(before(w.log, "del page/Other", "unpic page/own.webp")).toBe(true);
  });
});

describe("rename moves a page with its sub-pages", () => {
  it("Enter on the address it was filled with does nothing, whatever the name holds", async () => {
    const w = await world({ at: ["page", "Growth 50%"], entries: { "page/Growth 50%": "g\n", "page/Growth 50%/A": "a\n" } });
    w.answer("page/Growth 50%");
    await w.life.rename();
    expect(w.asked).toEqual(["Move the page “Growth 50%” and its sub-pages to: [page/Growth 50%]"]);
    expect(w.log).toEqual([]);
  });
  it("a picture whose name is kept, where the place already holds another under that name, refuses before anything is written", async () => {
    const w = await world({ at: ["page", "Essays"], entries: { "page/Essays": "e", "page/Essays/A": "![](photo.jpg)\n", "page/Other": "o", "page/Other/B": "![](photo.jpg)\n" }, pics: { "page/Essays/photo.jpg": "mine", "page/Other/photo.jpg": "theirs" } });
    w.answer("page/Other", true);
    await w.life.rename();
    expect(w.log.filter((x) => /^(set|del|pic) /.test(x))).toEqual([]);
    expect(w.log.slice(-2)).toEqual(["open page/Essays", "pin couldn't move — a picture named photo.jpg is there already in page/Other"]);
    expect(w.pics["page/Other/photo.jpg"]).toBe("theirs");
  });
  it("a picture two pages share is copied once, and one that stays where it is not at all", async () => {
    const w = await world({ at: ["page", "Essays"], entries: { "page/Essays": "e", "page/Essays/A": "![](shared.webp)\n", "page/Essays/B": "![](shared.webp)\n" }, pics: {} });
    w.answer("page/Letters", true);
    await w.life.rename();
    expect(w.log.filter((x) => x.startsWith("pic "))).toEqual(["pic page/Essays/shared.webp → page/Letters/shared.webp"]);
    expect(w.log[w.log.length - 1]).toBe("say moved to page/Letters — 3 entries, 1 picture not found");
    const same = await world({ at: ["page", "A/B"], entries: { "page/A": "[B](#page/A/B)\n", "page/A/B": "![](shared.webp)\n", "page/A/B/x": "x\n" }, pics: { "page/A/shared.webp": "p" } });
    same.answer("C", true);
    await same.life.rename();
    expect(same.log.filter((x) => x.startsWith("pic "))).toEqual([]);
  });
  it("renamed beside itself, the parent's link labelled with the old name takes the new one, as a plain rename's does", async () => {
    const w = await world({ at: ["page", "A/B"], entries: { "page/A": "- [B](#page/A/B)\n- [my B](#page/A/B/x)\n", "page/A/B": "b\n", "page/A/B/x": "x\n" } });
    w.answer("C", true);
    await w.life.rename();
    expect(w.md("page/A")).toBe("- [C](#page/A/C)\n- [my B](#page/A/C/x)");
  });
  it("an address with an empty part is refused, not read as another place or a name", async () => {
    const w = await world({ at: ["page", "Essays"], entries: { "page/Essays": "e", "page/Essays/A": "a\n", "bookshelf/Miller, Sean": "# Sean Miller\n" } });
    w.answer("bookshelf/Miller, Sean/", "page//Essays", "#page//Essays");
    await w.life.rename();
    await w.life.rename();
    await w.life.rename();
    expect(w.log).toEqual(Array(3).fill("say an address can’t have an empty part"));
  });
  it("a twin matched by its name while blank is named by its name in the confirm", async () => {
    const w = await world({ at: ["page", "Essays"], entries: { "page/Essays": "e", "page/Essays/Old": "", "page/Essays/New": "n\n", "page/Letters": "l", "page/Letters/Old": "# The old one\n" } });
    w.answer("page/Letters", false);
    await w.life.rename();
    expect(w.asked[1]).toContain("its links going to the one there: “Old”.");
  });

  it("asks where, filled with its own address; the same address or Escape does nothing; a taken name alerts", async () => {
    const w = await world({ at: ["page", "Essays"], entries: { ...ESSAYS, "page/Other": "o\n" } });
    w.answer(null, "page/Essays", "Other");
    await w.life.rename();
    await w.life.rename();
    await w.life.rename();
    expect(w.asked).toEqual(Array(3).fill("Move the page “Essays” and its sub-pages to: [page/Essays]"));
    expect(w.log).toEqual(['alert A "Other" page already exists.']);
  });
  it("into another namespace's page: the pictures copied under the new entry's name, its text joined after the text there, a twin deleted with its links and bookmarks going to the one there, the old removed after, the place opened", async () => {
    const w = await world({ at: ["page", "Essays"], entries: ESSAYS, pics: { [PIC]: "png" } });
    w.answer(TO, true);
    await w.life.rename();
    expect(w.asked[1]).toBe("Move the page “Essays” and its 1 sub-page to " + TO + "? Its own text goes after the text there. 1 sub-page is there already by title and is deleted, its links going to the one there: “On Growing Older”.");
    const l = w.log;
    expect(l.slice(0, 1)).toEqual(["hand over"]);
    expect(w.pics[PIC_THERE]).toBe("png");
    expect(before(l, "pic " + PIC + " → " + PIC_THERE, "set " + TO + "/2024-07-26-birds")).toBe(true);
    expect(w.md(TO)).toBe("# Essays\n\n[On Growing Older](#bookshelf/Miller%2C%20Sean/Essays/2022-07-31-essay)\n\n2024/07/26: [Birds](#bookshelf/Miller%2C%20Sean/Essays/2024-07-26-birds)");
    expect(w.md(TO + "/2024-07-26-birds")).toBe("# Birds\n\n![](<bookshelf--Miller, Sean--Essays--2024-07-26-birds-img-1.webp>)\n\nSee [the essay](#bookshelf/Miller%2C%20Sean/Essays/2022-07-31-essay).");
    expect(w.md(TO + "/2022-07-31-essay")).toBe("# On Growing Older\n\nLonger.\n");
    expect(w.md("2026-09-01")).toBe("See [birds](#bookshelf/Miller%2C%20Sean/Essays/2024-07-26-birds?line=3) and [it](#bookshelf/Miller%2C%20Sean/Essays/2022-07-31-essay).");
    for (const k of Object.keys(ESSAYS).filter((k) => k.startsWith("page/"))) {
      expect(w.md(k)).toBeNull();
      expect(before(l, "set 2026-09-01", "del " + k)).toBe(true);
    }
    const kept = "page/Essays/2024-07-26-birds → " + TO + "/2024-07-26-birds";
    const merged = "page/Essays/2026-07-22-essay → " + TO + "/2022-07-31-essay, page/Essays → " + TO;
    expect(l.slice(l.findIndex((x) => x.startsWith("kept ")))).toEqual([
      "kept " + kept + " | marks " + kept + ", " + merged, "hash #bookshelf/Miller%2C%20Sean/Essays", "open " + TO, "places " + kept,
      "move page/Essays/2026-07-22-essay → null", "move page/Essays → null", "redraw",
      "say moved to " + TO + " — 2 entries, 1 there already deleted, links updated in 1 other",
    ]);
  });
  it("a plain name moves it beside itself, as a rename, what was typed meanwhile carried", async () => {
    const w = await world({ at: ["page", "A"], entries: { "page/A": "- [B](#page/A/B)\n", "page/A/B": "b\n" } });
    w.typeMeanwhile("- [B](#page/A/B)\n\nmore\n");
    w.answer("C", true);
    await w.life.rename();
    expect(w.asked[1]).toBe("Move the page “A” and its 1 sub-page to page/C?");
    expect(w.md("page/C")).toBe("- [B](#page/C/B)\n\nmore");
    expect(w.md("page/C/B")).toBe("b\n");
    expect(w.md("page/A")).toBeNull();
    expect(w.log[w.log.length - 1]).toBe("say moved to page/C — 2 entries");
  });
  it("a cancelled confirm writes nothing; a refused place is said", async () => {
    const w = await world({ at: ["page", "Essays"], entries: ESSAYS });
    w.answer(TO, false, "bookshelf/Nobody/Essays", "page/Essays/2024-07-26-birds/x");
    await w.life.rename();
    await w.life.rename();
    await w.life.rename();
    expect(w.log).toEqual(["say nothing at bookshelf/Nobody to move it under", "say a page can’t move under itself"]);
  });
  it("a picture that cannot be copied stops it before any entry is written; one not found is counted", async () => {
    const w = await world({ at: ["page", "Essays"], entries: ESSAYS, pics: { [PIC]: "png" }, failPic: PIC_THERE });
    w.answer(TO, true);
    await w.life.rename();
    expect(w.log.filter((x) => x.startsWith("set ") || x.startsWith("del "))).toEqual([]);
    expect(w.log.slice(-2)).toEqual(["open page/Essays", "pin couldn't move — a picture could not be copied, nothing was moved"]);
    const lost = await world({ at: ["page", "Essays"], entries: ESSAYS });
    lost.answer(TO, true);
    await lost.life.rename();
    expect(lost.log[lost.log.length - 1]).toBe("say moved to " + TO + " — 2 entries, 1 there already deleted, 1 picture not found, links updated in 1 other");
  });
  it("a failed copy takes the others back and leaves the text there as it was, the old page opened again", async () => {
    const w = await world({ at: ["page", "Essays"], entries: ESSAYS, failSet: TO + "/2024-07-26-birds" });
    w.answer(TO, true);
    await w.life.rename();
    for (const [k, v] of Object.entries(ESSAYS)) expect(w.md(k)).toBe(v);
    expect(w.md(TO + "/2024-07-26-birds")).toBeNull();
    expect(w.log).not.toContain("del page/Essays");
    expect(w.log.slice(-2)).toEqual(["open page/Essays", "pin couldn't move — nothing was moved"]);
  });
});

describe("a day's tagged entry renamed", () => {
  it("a write under the new name that does not land keeps what was typed meanwhile under the old name", async () => {
    const w = await world({ at: ["2026-09-05", "draft"], entries: { "2026-09-05": "[draft](#2026-09-05/draft)\n", "2026-09-05/draft": "text\n" }, failSet: "2026-09-05/final" });
    w.typeMeanwhile("text and more\n");
    w.answer("final");
    await w.life.rename();
    expect(w.md("2026-09-05/draft")).toBe("text and more\n");
  });
  it("a write under the new name that does not land leaves the old entry standing, said in a pin", async () => {
    const w = await world({ at: ["2026-09-05", "draft"], entries: { "2026-09-05": "[draft](#2026-09-05/draft)\n", "2026-09-05/draft": "text" }, failSet: "2026-09-05/final" });
    w.answer("final");
    await w.life.rename();
    expect(w.md("2026-09-05/draft")).toBe("text");
    expect(w.log).not.toContain("del 2026-09-05/draft");
    expect(w.log.slice(-2)).toEqual(["open 2026-09-05/draft", "pin couldn't rename — nothing was moved"]);
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
    w.answer("Sean Miller", "Miller, Sean");
    await w.life.newRoot("bookshelf");
    expect(w.asked).toEqual(["Name for the new author:", "Sorted under: [Miller, Sean]"]);
    expect(w.md("bookshelf/Miller, Sean")).toBe("# Sean Miller\n");
    expect(w.log).toEqual(["set bookshelf/Miller, Sean", "goto #bookshelf/Miller%2C%20Sean | already on Sean Miller"]);
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
    w.answer("Miller, Sean", "Miller, Sean");
    await w.life.newRoot("bookshelf");
    expect(w.asked[1]).toBe("Sorted under: [Miller, Sean]");
    expect(w.md("bookshelf/Miller, Sean")).toBe("# Sean Miller\n");
  });
  it("escape on either box makes nothing", async () => {
    const w = await world({ at: ["bookshelf", null] });
    w.answer(null, "Sean Miller", null);
    await w.life.newRoot("bookshelf");
    await w.life.newRoot("bookshelf");
    expect(w.asked).toEqual(["Name for the new author:", "Name for the new author:", "Sorted under: [Miller, Sean]"]);
    expect(w.log).toEqual([]);
  });
  it("a filing name already on the shelf opens that author, writing nothing", async () => {
    const w = await world({ at: ["bookshelf", null], entries: { "bookshelf/Miller, Sean": "# S. Miller\n" } });
    w.answer("Sean Miller", "Miller, Sean");
    await w.life.newRoot("bookshelf");
    expect(w.log).toEqual(["goto #bookshelf/Miller%2C%20Sean | already on S. Miller"]);
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
    w.answer("Sean Miller");
    await w.life.newRoot("page");
    expect(w.asked).toEqual(["Name for the new page:"]);
    expect(w.md("page/Sean Miller")).toBe("");
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
    expect(l.slice(0, 1)).toEqual(["hand over"]);
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
    const w = await world({ at: ["bookshelf", "Sean Miller"], entries: { "bookshelf/Sean Miller": "- [Book](#bookshelf/Sean%20Miller/Book)\n", "bookshelf/Sean Miller/Book": "text\n" } });
    w.typeMeanwhile("- [Book](#bookshelf/Sean%20Miller/Book)\n\nmore\n");
    w.answer("Miller, Sean");
    await w.life.rename();
    expect(w.md("bookshelf/Miller, Sean")).toBe("# Sean Miller\n\n- [Book](#bookshelf/Miller%2C%20Sean/Book)\n\nmore");
    expect(w.log[w.log.length - 1]).toBe("say filed under Miller, Sean — 2 entries moved");
  });
  it("the books' pictures go with them, each named for its book renamed for its new place, the others kept", async () => {
    const books = { ...CAVAFY, "bookshelf/C. P. Cavafy/Walls": "![](<bookshelf--C. P. Cavafy--Walls-img-1.webp>)\n\n![](<Walls-img-2.webp>)\n\n![](map.png)\n" };
    const old = "bookshelf/C. P. Cavafy/";
    const w = await world({ at: ["bookshelf", "C. P. Cavafy"], entries: books, pics: { [old + "bookshelf--C. P. Cavafy--Walls-img-1.webp"]: "1", [old + "Walls-img-2.webp"]: "2", [old + "map.png"]: "m" } });
    w.answer("Cavafy, C. P.");
    await w.life.rename();
    const now = "bookshelf/Cavafy, C. P/";
    expect([w.pics[now + "bookshelf--Cavafy, C. P--Walls-img-1.webp"], w.pics[now + "Walls-img-2.webp"], w.pics[now + "map.png"]]).toEqual(["1", "2", "m"]);
    expect(w.md("bookshelf/Cavafy, C. P/Walls")).toBe("![](<bookshelf--Cavafy, C. P--Walls-img-1.webp>)\n\n![](<Walls-img-2.webp>)\n\n![](map.png)\n");
    expect(before(w.log, "pic " + old + "map.png → " + now + "map.png", "set bookshelf/Cavafy, C. P/Walls")).toBe(true);
  });
  it("a picture that cannot be copied stops the re-file before any entry is written", async () => {
    const books = { ...CAVAFY, "bookshelf/C. P. Cavafy/Walls": "![](map.png)\n" };
    const w = await world({ at: ["bookshelf", "C. P. Cavafy"], entries: books, pics: { "bookshelf/C. P. Cavafy/map.png": "m" }, failPic: "bookshelf/Cavafy, C. P/map.png" });
    w.answer("Cavafy, C. P.");
    await w.life.rename();
    expect(w.log.filter((x) => /^(set|del) /.test(x))).toEqual([]);
    expect(w.log.slice(-2)).toEqual(["open bookshelf/C. P. Cavafy", "pin couldn't re-file — a picture could not be copied, nothing was moved"]);
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
  it("a book with books under it asks where to move them, as a page does", async () => {
    const w = await world({ at: ["bookshelf", "C. P. Cavafy/Walls"], entries: { ...CAVAFY, "bookshelf/C. P. Cavafy/Walls/1": "one\n" } });
    w.answer(null);
    await w.life.rename();
    expect(w.asked).toEqual(["Move the book “Walls” and its books to: [bookshelf/C. P. Cavafy/Walls]"]);
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

describe("the shelves", () => {
  it("the shelves are no author: no book is made under them, they keep their name, and no author is filed under it", async () => {
    const on = await world({ at: ["bookshelf", "Shelves"], entries: { "bookshelf/Shelves": "# Shelves\n" } });
    await on.life.create();
    on.select(2, 5);
    await on.life.extract();
    await on.life.rename();
    expect(on.asked).toEqual([]);
    expect(on.log).toEqual(["say the shelves hold no books", "say the shelves hold no books", "say the shelves keep their name"]);
    const author = await world({ at: ["bookshelf", "Horace"], entries: { "bookshelf/Horace": "# Horace\n" } });
    author.answer("Shelves");
    await author.life.rename();
    expect(author.log).toEqual(["say “Shelves” is the shelves’ own name"]);
    expect(author.md("bookshelf/Horace")).toBe("# Horace\n");
    const fresh = await world({ at: ["bookshelf", null] });
    fresh.answer("Horace", "Shelves");
    await fresh.life.newRoot("bookshelf");
    expect(fresh.log).toEqual(["say “Shelves” is the shelves’ own name"]);
    expect(fresh.md("bookshelf/Shelves")).toBeNull();
  });
  it("the shelves opened: made with their heading when there are none, opened as they stand when there are", async () => {
    const none = await world({ at: ["2026-09-07", null] });
    await none.life.shelves();
    expect(none.log).toEqual(["set bookshelf/Shelves", "goto #bookshelf/Shelves | already here"]);
    expect(none.md("bookshelf/Shelves")).toBe("# Shelves\n");
    const there = await world({ at: ["2026-09-07", null], entries: { "bookshelf/Shelves": "# Shelves\n\n## Latin\n" } });
    await there.life.shelves();
    expect(there.log).toEqual(["goto #bookshelf/Shelves | already here"]);
    expect(there.md("bookshelf/Shelves")).toBe("# Shelves\n\n## Latin\n");
    const failed = await world({ at: ["2026-09-07", null], failSet: "bookshelf/Shelves" });
    await failed.life.shelves();
    expect(failed.log).toEqual(["set bookshelf/Shelves"]);
  });
});
