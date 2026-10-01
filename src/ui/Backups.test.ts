import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import Backups from "./Backups.svelte";
import { screenState } from "./screen.svelte.ts";

const draw = (patch: Partial<ReturnType<typeof screenState>["backups"]>): string => {
  const screen = screenState(5);
  Object.assign(screen.backups, patch);
  return render(Backups, { props: { backups: screen.backups, onSetup: () => {}, onResume: () => {} } }).body;
};
describe("Backups", () => {
  it("unconfigured: the setup button and no status; configured and warm: on; trouble: Resume and the reason", () => {
    const none = draw({ warm: "ok" });
    expect(none).toContain("Set up automatic backups…");
    expect(none).not.toContain("backups-status");
    const on = draw({ configured: true, warm: "ok" });
    expect(on).toContain("Change backup folder…");
    expect(on).toMatch(/<p class="backups-status[^"]*">Automatic backups are on\./);
    expect(on).not.toContain("Resume backups");
    const paused = draw({ configured: true, warm: "ok", trouble: "backups paused — click to resume" });
    expect(paused).toContain("Resume backups");
    expect(paused).toMatch(/backups-status[^"]*trouble[^"]*">backups paused/);
  });
  it("an unloaded journal outranks the rest; no picker says so and offers nothing", () => {
    expect(draw({ configured: true, warm: "loading", trouble: "x" })).toContain("Still loading — backups start once the journal is in.");
    expect(draw({ configured: true, warm: "failed" })).toContain("Couldn’t load entries");
    const webkit = draw({ canPick: false, configured: true, warm: "ok" });
    expect(webkit).toContain("need a Chromium browser");
    expect(webkit).not.toContain("<button");
  });
});
