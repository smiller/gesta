import { describe, it, expect } from "vitest";
import { backupsLines } from "./backupsModel.ts";
import { screenState } from "./screen.svelte.ts";

const lines = (patch: Partial<ReturnType<typeof screenState>["backups"]>) => backupsLines({ ...screenState(5).backups, ...patch });
const SETUP = { role: "setup", text: "Set up automatic backups…" };
const RESUME = { role: "resume", text: "Resume backups" };
const pic = (name: string) => ({ key: "journal/2026/" + name, name, src: null });
const ABOUT = "Pictures stored in Gesta that no entry shows — most often one pasted and then deleted from the text. No backup holds them, so removing them is for good.";

describe("the backups panel's lines", () => {
  it("no folder set up: the setup button alone, the journal in or not", () => {
    expect(lines({ warm: "ok" })).toEqual({ top: [SETUP], unused: null, overHalf: null });
    expect(lines({ warm: "loading" }).top).toEqual([SETUP]);
  });
  it("on: the folder backed up to with its change link; before its name is known, on, with the link in that line", () => {
    expect(lines({ configured: true, warm: "ok", folder: "gesta-backups" }).top).toEqual([{ role: "folder", lead: "Backing up to", name: "gesta-backups" }]);
    expect(lines({ configured: true, warm: "ok" }).top).toEqual([{ role: "status", text: "Automatic backups are on.", trouble: false, change: true }]);
  });
  it("in trouble: Resume, the trouble's words, and the folder that stands", () => {
    expect(lines({ configured: true, warm: "ok", folder: "gesta-backups", trouble: "paused" }).top).toEqual([
      RESUME, { role: "status", text: "backups paused — click to resume", trouble: true, change: false }, { role: "folder", lead: "Folder:", name: "gesta-backups" },
    ]);
    expect(lines({ configured: true, warm: "ok", trouble: "blocked" }).top).toEqual([RESUME, { role: "status", text: "backup blocked — two entries share a filename", trouble: true, change: true }]);
  });
  it("a journal not in outranks the rest, the folder and its change link with it", () => {
    expect(lines({ configured: true, warm: "loading", folder: "gesta-backups", trouble: "failed" }).top).toEqual([RESUME, { role: "status", text: "Still loading — backups start once the journal is in.", trouble: true, change: false }]);
    expect(lines({ configured: true, warm: "failed" }).top).toEqual([{ role: "status", text: "Couldn’t load entries — backups are paused until you reload.", trouble: true, change: false }]);
  });
  it("no folder picker: says there is no way to write a copy, as no trouble, and offers nothing", () => {
    const said = { role: "status", text: "Automatic folder backups need a Chromium browser (Helium or Chrome). Export needs one too, so here there is no way to write a copy out.", trouble: false, change: false };
    expect(lines({ canPick: false, configured: true, warm: "ok", folder: "gesta-backups", trouble: "failed" }).top).toEqual([said]);
    expect(lines({ canPick: false, warm: "ok" }).top).toEqual([said]);
  });
  it("unused pictures: counted in the heading, said what they are, and the button names this one or these N", () => {
    expect(lines({ warm: "ok", unused: [pic("a-img-1.webp")] }).unused).toEqual({ heading: "1 unused picture.", about: ABOUT, button: "Remove this picture" });
    expect(lines({ warm: "ok", unused: [pic("a-img-1.webp"), pic("b-img-1.webp"), pic("c-img-1.webp")], overHalf: 4 })).toMatchObject({ unused: { heading: "3 unused pictures.", button: "Remove these 3 pictures" }, overHalf: null });
  });
  it("more than half of them unused at once: what they are, and why none are offered", () => {
    expect(lines({ warm: "ok", overHalf: 40 })).toMatchObject({ unused: null, overHalf: { about: ABOUT, text: "40 such pictures — more than half of all stored, which looks like a journal read short rather than a tidy-up, so none are offered for removal." } });
  });
});
