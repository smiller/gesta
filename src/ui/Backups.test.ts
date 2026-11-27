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
  it("unused pictures are said, each shown with its name, then offered for removal; too many at once says why none go; none offers nothing", () => {
    const pic = (name: string, src: string | null, key = "journal/2026/" + name) => ({ key, name, src });
    const three = draw({ warm: "ok", unused: [pic("2026-10-30-img-1.webp", "blob:a"), pic("2026-11-12-img-2.webp", "blob:b"), pic("x-img-1.webp", null)] });
    expect(three).toContain("<strong>3 unused pictures.</strong> Pictures stored in Gesta that no entry shows — most often one pasted and then deleted from the text. No backup holds them, so removing them is for good.");
    expect(three).toMatch(/<img[^>]*src="blob:a"[^>]*>\s*<figcaption[^>]*>2026-10-30-img-1\.webp<\/figcaption>/);
    expect(three).toMatch(/<figcaption[^>]*>x-img-1\.webp<\/figcaption>/);
    expect(three.match(/<img/g)?.length).toBe(2);
    expect(three).toContain(">Remove these 3 pictures</button>");
    const one = draw({ warm: "ok", unused: [pic("a-img-1.webp", "blob:a")] });
    expect(one).toContain("<strong>1 unused picture.</strong>");
    expect(one).toContain(">Remove this picture</button>");
    const over = draw({ warm: "ok", overHalf: 40 });
    expect(over).toContain("Pictures stored in Gesta that no entry shows");
    expect(over).toContain("40 such pictures — more than half of all stored, which looks like a journal read short rather than a tidy-up, so none are offered for removal.");
    expect(over).not.toContain("Remove");
    expect(draw({ warm: "ok" })).not.toContain("picture");
    const twins = draw({ warm: "ok", unused: [pic("Introduction-img-1.webp", "blob:a", "bookshelf/A/Introduction-img-1.webp"), pic("Introduction-img-1.webp", "blob:b", "bookshelf/B/Introduction-img-1.webp")] });
    expect(twins.match(/<figure/g)?.length).toBe(2);
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
