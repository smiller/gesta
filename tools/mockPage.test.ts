import { describe, it, expect } from "vitest";
import { backupFile, mockPage, type Frame } from "./mockPage.ts";

describe("a mock's entries and its page", () => {
  it("finds a journal day under its year and any other entry at its key", () => {
    expect(backupFile("2026-06-25")).toBe("journal/2026/2026-06-25.md");
    expect(backupFile("bookshelf/Ovid/Metamorphoses/Book 4")).toBe("bookshelf/Ovid/Metamorphoses/Book 4.md");
  });
  it("lays the frames out a row a state, a column an option, the covered frame beside its own", () => {
    const f = (state: string, option: string, covered?: string): Frame => ({ state, option, png: "data:image/png;base64,AA", reading: { state, option }, ...(covered ? { covered: { png: "data:image/png;base64,BB", under: [covered] } } : {}) });
    const html = mockPage("Room", [f("closed", "now"), f("closed", "A"), f("open", "now", "Book 4 line 1"), f("open", "A")]);
    expect(html.match(/<tr>/g)).toHaveLength(3);
    expect(html.indexOf("<th>now</th>")).toBeLessThan(html.indexOf("<th>A</th>"));
    expect(html.indexOf(">closed<")).toBeLessThan(html.indexOf(">open<"));
    expect(html).toContain("Book 4 line 1");
    expect(html.match(/<img /g)).toHaveLength(5);
  });
  it("escapes what the readings say", () => {
    expect(mockPage("<T>", [{ state: "s", option: "o", png: "x", reading: { said: "a <b> & c" } }])).toContain("a &lt;b&gt; &amp; c");
  });
});
