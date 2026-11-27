import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import Backups from "./Backups.svelte";
import { screenState } from "./screen.svelte.ts";

const draw = (patch: Partial<ReturnType<typeof screenState>["backups"]>): string => {
  const screen = screenState(5);
  Object.assign(screen.backups, patch);
  return render(Backups, { props: { backups: screen.backups, onSetup: () => {}, onResume: () => {}, onSweep: () => {} } }).body.replace(/<!--[^>]*-->/g, "");
};
describe("Backups", () => {
  it("unused pictures are offered for removal, counted; too many at once says why none go; none offers nothing", () => {
    expect(draw({ warm: "ok", unused: 3 })).toContain(">Remove 3 unused pictures</button>");
    expect(draw({ warm: "ok", unused: 1 })).toContain(">Remove 1 unused picture</button>");
    const over = draw({ warm: "ok", overHalf: 40 });
    expect(over).toContain("40 pictures no entry names — more than half of them, so none are removed.");
    expect(over).not.toContain("unused picture");
    expect(draw({ warm: "ok" })).not.toContain("picture");
  });
  it("unconfigured: the setup button and no status; configured and in: the folder backed up to and a change link; trouble: Resume, the reason and the folder", () => {
    const none = draw({ warm: "ok" });
    expect(none).toContain("Set up automatic backups…");
    expect(none).not.toContain("backups-status");
    const on = draw({ configured: true, warm: "ok", folder: "gesta-backups" });
    expect(on).toMatch(/<p class="backups-status[^"]*">Backing up to <strong>gesta-backups<\/strong>\. <button[^>]*backups-change[^>]*>change folder…<\/button><\/p>/);
    expect(on).not.toContain("Automatic backups are on.");
    expect(on).not.toContain("Resume backups");
    const unnamed = draw({ configured: true, warm: "ok" });
    expect(unnamed).toMatch(/<p class="backups-status[^"]*">Automatic backups are on\. <button[^>]*backups-change[^>]*>change folder…<\/button><\/p>/);
    const paused = draw({ configured: true, warm: "ok", folder: "gesta-backups", trouble: "backups paused — click to resume" });
    expect(paused).toContain("Resume backups");
    expect(paused).toMatch(/backups-status[^"]*trouble[^"]*">backups paused — click to resume<\/p>/);
    expect(paused).toMatch(/Folder: <strong>gesta-backups<\/strong>\. <button[^>]*>change folder…/);
  });
  it("an unloaded journal outranks the rest, the folder and its change link with it; no picker says so and offers nothing", () => {
    const loading = draw({ configured: true, warm: "loading", trouble: "x", folder: "gesta-backups" });
    expect(loading).toContain("Still loading — backups start once the journal is in.");
    expect(loading).not.toContain("change folder");
    expect(loading).not.toContain("gesta-backups");
    expect(draw({ configured: true, warm: "failed" })).toContain("Couldn’t load entries");
    const webkit = draw({ canPick: false, configured: true, warm: "ok" });
    expect(webkit).toContain("need a Chromium browser");
    expect(webkit).not.toContain("<button");
  });
});
