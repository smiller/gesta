import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import Backups from "./Backups.svelte";
import { screenState } from "./screen.svelte.ts";

const none = (): void => {};
const draw = (patch: Partial<ReturnType<typeof screenState>["backups"]>): string => {
  const screen = screenState(5);
  Object.assign(screen.backups, patch);
  return render(Backups, { props: { backups: screen.backups, onSetup: none, onResume: none, onSweep: none, onOpen: none, onClose: none } }).body.replace(/<!--[^>]*-->/g, "");
};
const pic = (name: string, src: string | null, key = "journal/2026/" + name) => ({ key, name, src });

describe("Backups", () => {
  it("each line is drawn under its role: the buttons, the status with its change link, the folder with its own", () => {
    expect(draw({ warm: "ok" })).toMatch(/<button[^>]*data-role="setup"[^>]*>Set up automatic backups…<\/button>/);
    expect(draw({ configured: true, warm: "ok" })).toMatch(/<p class="backups-status[^"]*" data-role="status">Automatic backups are on\. <button[^>]*backups-change[^>]*>change folder…<\/button><\/p>/);
    const paused = draw({ configured: true, warm: "ok", folder: "gesta-backups", trouble: "paused" });
    expect(paused).toMatch(/<button[^>]*data-role="resume"[^>]*>Resume backups<\/button>/);
    expect(paused).toMatch(/<p class="backups-status[^"]*trouble[^"]*" data-role="status">backups paused — click to resume<\/p>/);
    expect(paused).toMatch(/<p class="backups-status[^"]*" data-role="folder">Folder: <strong[^>]*>gesta-backups<\/strong>\. <button[^>]*backups-change[^>]*>change folder…<\/button><\/p>/);
  });
  it("unused pictures: the heading under its role, each picture shown with its name, the button under its role; twins kept apart by key", () => {
    const three = draw({ warm: "ok", unused: [pic("2026-10-30-img-1.webp", "blob:a"), pic("2026-11-12-img-2.webp", "blob:b"), pic("x-img-1.webp", null)] });
    expect(three).toMatch(/data-role="unused"><strong[^>]*>3 unused pictures\.<\/strong> Pictures stored in Gesta/);
    expect(three).toMatch(/<img[^>]*src="blob:a"[^>]*>\s*<figcaption[^>]*>2026-10-30-img-1\.webp<\/figcaption>/);
    expect(three).toMatch(/<figcaption[^>]*>x-img-1\.webp<\/figcaption>/);
    expect(three.match(/<img/g)?.length).toBe(2);
    expect(three).toMatch(/<button[^>]*data-role="sweep"[^>]*>Remove these 3 pictures<\/button>/);
    const twins = draw({ warm: "ok", unused: [pic("Introduction-img-1.webp", "blob:a", "bookshelf/A/Introduction-img-1.webp"), pic("Introduction-img-1.webp", "blob:b", "bookshelf/B/Introduction-img-1.webp")] });
    expect(twins.match(/<figure/g)?.length).toBe(2);
  });
  it("more than half unused: what they are, and why none go as trouble, with no button", () => {
    const over = draw({ warm: "ok", overHalf: 40 });
    expect(over).toMatch(/data-role="unused">Pictures stored in Gesta that no entry shows/);
    expect(over).toMatch(/<p class="backups-status trouble[^"]*" data-role="over-half">40 such pictures/);
    expect(over).not.toContain("Remove");
  });
});
