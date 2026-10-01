import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import Help from "./Help.svelte";

describe("Help", () => {
  it("hidden when closed; open, the help text with its key table", () => {
    expect(render(Help, { props: { open: false } }).body).toMatch(/<section class="helppanel[^"]*" hidden/);
    const html = render(Help, { props: { open: true } }).body;
    expect(html).not.toMatch(/<section class="helppanel[^"]*" hidden/);
    expect(html).toContain("Custom keys");
    expect(html).toContain("⌃⌘G");
  });
});
