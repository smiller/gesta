import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/* a ?raw import of a stylesheet reads "" under Vitest */
const css = readFileSync(new URL("./editor.css", import.meta.url), "utf8");

const COLOURS = ["bright-yellow", "brighter-yellow", "light-yellow", "light-green", "bright-green", "light-blue", "bright-blue", "red", "pink", "light-purple", "orange"];

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`).exec(css)![1];
const rule = (colour: string) => {
  const m = new RegExp(`\\.page div\\.card-${colour} \\{ background: (#[0-9a-f]{6}); border-color: (#[0-9a-f]{6}); \\}`).exec(css);
  if (!m) throw new Error(`no fill and edge for card-${colour}`);
  return { fill: m[1], edge: m[2] };
};

describe("card fills", () => {
  it("every colour is a pale fill edged in its full colour, the ink at 4.5:1 or better", () => {
    const ink = token("ink");
    for (const colour of COLOURS) {
      const { fill } = rule(colour);
      expect(contrast(fill, ink), colour).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("the fill is the edge's colour at 35% over the page's ground", () => {
    const bg = rgb(token("bg"));
    for (const colour of COLOURS) {
      const { fill, edge } = rule(colour);
      const mixed = rgb(edge).map((c, i) => Math.round(0.35 * c + 0.65 * bg[i]));
      expect(rgb(fill), colour).toEqual(mixed);
    }
  });

  it("the edge is the band, 8px all round", () => {
    expect(css).toMatch(/\.page div\[class\^="card-"\] \{[^}]*border: 8px solid;/);
  });
});
