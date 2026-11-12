/* A disputed line seen on the Harvard Classics' printed page: the line found
   in scan A's hOCR (harvardclassicsv0004milt), its page image fetched from
   the Internet Archive (cached under one-offs/out/harvard/pages), and the lines
   asked for cut from their pages onto one sheet, screenshot by headless
   Helium, to be read by eye */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { letters, similar } from "./harvardMilton.ts";

const CACHE = new URL("out/harvard/", import.meta.url).pathname;
const H = "/Applications/Helium.app/Contents/MacOS/Helium";

export interface HocrLine { page: number; box: [number, number, number, number]; text: string }

export function hocrLines(html: string): HocrLine[] {
  const out: HocrLine[] = [];
  for (const page of html.split('<div class="ocr_page"').slice(1)) {
    const n = +/id="page_(\d+)"/.exec(page)![1];
    for (const chunk of page.split('<span class="ocr_line"').slice(1)) {
      const b = /title="bbox (\d+) (\d+) (\d+) (\d+)/.exec(chunk)!.slice(1, 5).map(Number) as [number, number, number, number];
      const text = [...chunk.matchAll(/class="ocrx_word"[^>]*>([^<]*)</g)].map((m) => m[1]).join(" ").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").trim();
      if (text) out.push({ page: n, box: b, text });
    }
  }
  return out;
}

/* the hOCR line most like a line of the text, read with the line after
   it so a line repeated or near-repeated elsewhere is not taken, among
   pages first..last */
export function findLine(lines: HocrLine[], text: string, next = "", { first = 0, last = Infinity } = {}): HocrLine | null {
  let best = 0, at: HocrLine | null = null;
  const want = letters(text + " " + next);
  lines.forEach((l, i) => {
    if (l.page < first || l.page > last) return;
    const after = lines[i + 1]?.page === l.page && next ? " " + lines[i + 1].text : "";
    const s = similar(letters(l.text + after), want);
    if (s > best) { best = s; at = l; }
  });
  return best >= 0.6 ? at : null;
}

async function pageImage(page: number): Promise<string> {
  const dir = join(CACHE, "pages");
  mkdirSync(dir, { recursive: true });
  /* the archive's page image n is the hOCR's page n+1, the same pixels */
  const path = join(dir, `n${page - 1}.jpg`);
  if (!existsSync(path)) {
    const res = await fetch(`https://archive.org/download/harvardclassicsv0004milt/page/n${page - 1}.jpg`, { headers: { "User-Agent": "GestaMiltonImport/1.0 (a personal bookshelf import)" } });
    if (!res.ok) throw new Error(`the archive answered ${res.status} for page ${page - 1}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  }
  return path;
}

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/* each case's line with the one above and below, cut from its page, its
   label beside it; sheets of `per` cases written as PNGs */
export async function stripSheets(cases: { label: string; line: HocrLine }[], out: string, per = 16, around = 2): Promise<string[]> {
  const ctx = await chromium.launchPersistentContext(join(CACHE, "helium-profile"), { executablePath: H, headless: true, viewport: { width: 1400, height: 800 } });
  const files: string[] = [];
  try {
    for (let s = 0; s < cases.length; s += per) {
      const rows: string[] = [];
      for (const c of cases.slice(s, s + per)) {
        const img = await pageImage(c.line.page);
        /* printed lines round the match, two either side by default: a line's box can be a line off */
        const [x0, y0] = c.line.box, top = Math.max(0, y0 - 65 * around), height = 65 * (2 * around + 1);
        rows.push(`<div class="row"><div class="label">${esc(c.label)}</div><div class="cut" style="width:${(1780 - x0 + 80) * 0.6}px;height:${height * 0.6}px;background:url('file://${img}') -${(x0 - 80) * 0.6}px -${top * 0.6}px / ${1780 * 0.6}px auto no-repeat"></div></div>`);
      }
      const html = `<!doctype html><meta charset="utf-8"><style>body{margin:8px;font:13px/1.3 Menlo,monospace;background:#fff}.row{display:flex;gap:10px;align-items:center;border-bottom:1px solid #ccc;padding:2px 0}.label{width:380px;flex:none;white-space:pre-wrap}.cut{flex:none;border-left:3px solid #c00}</style>${rows.join("")}`;
      const htmlPath = join(CACHE, `sheet-${s / per}.html`);
      writeFileSync(htmlPath, html);
      const page = await ctx.newPage();
      await page.goto("file://" + htmlPath);
      await page.waitForLoadState("load");
      const file = `${out}-${s / per + 1}.png`;
      await page.screenshot({ path: file, fullPage: true });
      await page.close();
      files.push(file);
    }
  } finally { await ctx.close(); }
  return files;
}
