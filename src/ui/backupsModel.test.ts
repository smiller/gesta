import { describe, it, expect } from "vitest";
import { backupsStatus } from "./backupsModel.ts";
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
  it("configured and in: the trouble's own words when there is one, else on", () => {
    expect(backupsStatus(with_({ configured: true, warm: "ok", trouble: "backups paused" }))).toEqual({ text: "backups paused", trouble: true });
    expect(backupsStatus(with_({ configured: true, warm: "ok" }))).toEqual({ text: "Automatic backups are on.", trouble: false });
  });
  it("not configured: nothing to say", () => {
    expect(backupsStatus(with_({ warm: "ok" }))).toBeNull();
    expect(backupsStatus(with_({ warm: "loading" }))).toBeNull();
  });
});
