import { test, expect } from "vitest";
import { chordName, flashLog, type FlashEntry } from "./flashLog.ts";

const entry = (time: string, text = "no line numbers here"): FlashEntry => ({ time, page: "commonplace/Horace", action: "⌃⌘L", kind: "refusal", text });

test("the log keeps three months by the calendar, an entry on the boundary kept", () => {
  let raw = [entry("2026-08-21T09:59:59"), entry("2026-08-22T10:00:00"), entry("2026-11-01T08:00:00")];
  const log = flashLog({ read: () => raw, write: (next) => { raw = next(raw); } }, () => new Date("2026-11-22T10:00:00"));
  log.add({ page: "commonplace/Horace", action: "⌃⌘L", kind: "refusal", text: "no line numbers here" });
  expect(log.entries().slice(0, 2).map((e) => e.time)).toEqual(["2026-08-22T10:00:00", "2026-11-01T08:00:00"]);
});

test("a chord is named by its modifiers and key, as the help spells it; a key without ⌃ or ⌘ is no chord", () => {
  const k = (key: string, mods: Partial<Record<"ctrlKey" | "metaKey" | "altKey" | "shiftKey", boolean>> = {}) => ({ key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods });
  expect(chordName(k("r", { ctrlKey: true, metaKey: true }))).toBe("⌃⌘R");
  expect(chordName(k(",", { ctrlKey: true, metaKey: true }))).toBe("⌃⌘,");
  expect(chordName(k("Z", { metaKey: true, shiftKey: true }))).toBe("⇧⌘Z");
  expect(chordName(k("a"))).toBe(null);
  expect(chordName(k("Control", { ctrlKey: true }))).toBe(null);
});

test("an entry added is kept with the rest, the older than three months dropped as it lands", () => {
  let raw: FlashEntry[] = [entry("2026-01-01T00:00:00", "old")];
  const log = flashLog({ read: () => raw, write: (next) => { raw = next(raw); } }, () => new Date("2026-11-22T10:00:00"));
  log.add({ page: "commonplace/Blocks", action: "⌃⌘R", kind: "refusal", text: "Those verse blocks aren’t numbered straight on — reference them one at a time" });
  expect(log.entries()).toEqual([{ time: new Date("2026-11-22T10:00:00").toISOString(), page: "commonplace/Blocks", action: "⌃⌘R", kind: "refusal", text: "Those verse blocks aren’t numbered straight on — reference them one at a time" }]);
});
