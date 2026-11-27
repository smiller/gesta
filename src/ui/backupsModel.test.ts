import { describe, it, expect } from "vitest";
import { backupsStatus, backupsFolder, offersChange } from "./backupsModel.ts";
import { screenState } from "./screen.svelte.ts";

const with_ = (patch: Partial<ReturnType<typeof screenState>["backups"]>) => ({ ...screenState(5).backups, ...patch });

describe("the backups status", () => {
  it("a browser with no folder picker says there is no way to write a copy, as no trouble", () => {
    expect(backupsStatus(with_({ canPick: false, configured: true, trouble: "x" }))).toEqual({ text: expect.stringContaining("need a Chromium browser"), trouble: false });
  });
  it("configured before the journal is in: still loading, or failed until a reload, as trouble", () => {
    expect(backupsStatus(with_({ configured: true, warm: "loading" }))).toEqual({ text: expect.stringContaining("Still loading"), trouble: true });
    expect(backupsStatus(with_({ configured: true, warm: "failed" }))).toEqual({ text: expect.stringContaining("paused until you reload"), trouble: true });
  });
  it("configured and in: the trouble's own words when there is one, else on, said by the folder's line once it is named", () => {
    expect(backupsStatus(with_({ configured: true, warm: "ok", trouble: "backups paused" }))).toEqual({ text: "backups paused", trouble: true });
    expect(backupsStatus(with_({ configured: true, warm: "ok", trouble: "backups paused", folder: "gesta-backups" }))).toEqual({ text: "backups paused", trouble: true });
    expect(backupsStatus(with_({ configured: true, warm: "ok" }))).toEqual({ text: "Automatic backups are on.", trouble: false });
    expect(backupsStatus(with_({ configured: true, warm: "ok", folder: "gesta-backups" }))).toBeNull();
  });
  it("not configured: nothing to say", () => {
    expect(backupsStatus(with_({ warm: "ok" }))).toBeNull();
    expect(backupsStatus(with_({ warm: "loading" }))).toBeNull();
  });
});

describe("the backup folder's line", () => {
  it("names the folder backed up to, or, in trouble, the folder that stands", () => {
    expect(backupsFolder(with_({ configured: true, warm: "ok", folder: "gesta-backups" }))).toEqual({ lead: "Backing up to", name: "gesta-backups" });
    expect(backupsFolder(with_({ configured: true, warm: "ok", folder: "gesta-backups", trouble: "backups paused" }))).toEqual({ lead: "Folder:", name: "gesta-backups" });
  });
  it("is not drawn with no name yet, no folder, a journal not in, or no picker", () => {
    expect(backupsFolder(with_({ configured: true, warm: "ok" }))).toBeNull();
    expect(backupsFolder(with_({ warm: "ok", folder: "gesta-backups" }))).toBeNull();
    expect(backupsFolder(with_({ configured: true, warm: "loading", folder: "gesta-backups" }))).toBeNull();
    expect(backupsFolder(with_({ canPick: false, configured: true, warm: "ok", folder: "gesta-backups" }))).toBeNull();
  });
});

describe("the change-folder link", () => {
  it("is offered once a folder is configured and the journal is in, where a picker exists", () => {
    expect(offersChange(with_({ configured: true, warm: "ok" }))).toBe(true);
    expect(offersChange(with_({ configured: true, warm: "loading" }))).toBe(false);
    expect(offersChange(with_({ warm: "ok" }))).toBe(false);
    expect(offersChange(with_({ canPick: false, configured: true, warm: "ok" }))).toBe(false);
  });
});
