import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { CHORDS, chordAct } from "./chords.ts";

const helpRows = (): [string, string][] => [...readFileSync(new URL("./help.html", import.meta.url), "utf8").matchAll(/<tr><td>(⌃⌘[^<]+)<\/td><td>([^<]+)<\/td><\/tr>/g)].map((m) => [m[1], m[2]]);

describe("the ⌃⌘ chords", () => {
  it("each key is one chord's", () => {
    const keys = CHORDS.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("help's table lists every chord, in the table's order, in the table's words", () => {
    expect(helpRows()).toEqual(CHORDS.map((c) => [c.label, c.help]));
  });
  it("a key names its chord's act in either case; the reader is refused the writing and panel chords; the editor's own keys name the editor; an unknown key names none", () => {
    expect([chordAct("j", false), chordAct("J", false), chordAct(",", false)]).toEqual(["round", "round", "previous"]);
    expect(["h", "b", "s", "n", "e"].map((k) => chordAct(k, true))).toEqual([null, null, null, null, null]);
    expect([chordAct("k", true), chordAct("m", true)]).toEqual(["search", "view"]);
    expect([chordAct("i", false), chordAct("enter", true), chordAct("q", false)]).toEqual(["editor", "editor", null]);
  });
});
