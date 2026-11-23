import { dayDir } from "../src/store/names.ts";

export interface Frame {
  state: string; option: string; png: string; reading: Record<string, unknown>;
  /* the frame again with every floating bar hidden and outlined, and the
     text each one stood over */
  covered?: { png: string; under: string[] };
}

export const backupFile = (key: string): string => (/^\d{4}-\d\d-\d\d$/.test(key) ? dayDir(key) + "/" + key + ".md" : key + ".md");

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const inOrder = (xs: string[]): string[] => [...new Set(xs)];

function cell(f: Frame | undefined): string {
  if (!f) return "<td></td>";
  const covered = f.covered ? `<figure><img src="${f.covered.png}" alt="${esc(f.state + ", " + f.option + ", the bars lifted")}"><figcaption>under the bars: ${esc(f.covered.under.join(" · ") || "nothing")}</figcaption></figure>` : "";
  return `<td><figure><img src="${f.png}" alt="${esc(f.state + ", " + f.option)}"></figure>${covered}<pre>${esc(JSON.stringify(f.reading, null, 1))}</pre></td>`;
}

export function mockPage(title: string, frames: Frame[]): string {
  const states = inOrder(frames.map((f) => f.state)), options = inOrder(frames.map((f) => f.option));
  const at = (s: string, o: string) => frames.find((f) => f.state === s && f.option === o);
  const head = `<tr><th></th>${options.map((o) => `<th>${esc(o)}</th>`).join("")}</tr>`;
  const rows = states.map((s) => `<tr><th scope="row">${esc(s)}</th>${options.map((o) => cell(at(s, o))).join("")}</tr>`).join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
:root { --bg: #f6f6f2; --ink: #22241f; --muted: #6b6e64; --rule: #d6d8cf; --card: #ffffff; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #1b1c19; --ink: #e6e7e0; --muted: #a2a59a; --rule: #3a3c35; --card: #24251f; } }
:root[data-theme="dark"] { --bg: #1b1c19; --ink: #e6e7e0; --muted: #a2a59a; --rule: #3a3c35; --card: #24251f; }
body { margin: 0; padding: 16px; background: var(--bg); color: var(--ink); font: 14px/1.45 system-ui, sans-serif; }
h1 { font-size: 18px; margin: 0 0 12px; }
.wrap { overflow-x: auto; }
table { border-collapse: collapse; }
th, td { border: 1px solid var(--rule); padding: 8px; vertical-align: top; text-align: left; }
th { background: var(--card); }
td { background: var(--card); min-width: 320px; max-width: 640px; }
figure { margin: 0 0 8px; }
img { display: block; max-width: 100%; height: auto; border: 1px solid var(--rule); }
figcaption, pre { color: var(--muted); font-size: 12px; white-space: pre-wrap; margin: 4px 0 0; }
</style></head><body>
<h1>${esc(title)}</h1>
<div class="wrap"><table>
${head}
${rows}
</table></div>
</body></html>
`;
}
