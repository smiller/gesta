import { readFileSync } from "node:fs";
import type { Page, BrowserContext } from "../heliumPage.ts";
import type { Dialog } from "playwright-core";
import type * as Successor from "../adapters/successor.ts";
import { inPageWith } from "../adapters/inPage.ts";

export type Adapter = typeof Successor & { pill?: boolean };
export type Tree = { name: string; text?: string; kids?: Tree[] };
export interface RunOptions { screenshot?: string; only?: string[] | null }
/* the day the drivers pin the page's clock to (context.clock.setFixedTime,
   Date only; the timers run): the day the reference run was made. A
   reading that spells today — the Go to row's Day select — was scrubbed by
   the day number until 2026-09-22, when a run on a day whose number a
   seeded day shares (the 5th, the 6th) would have read one option fewer
   and no scrub could say so. Never a seeded day. */
export const TODAY = "2026-09-12";
export const SEEDS = {
  "2026-09-06": "twelfth", "2026-09-05": "williams", "page/Horace": "horace", "page/Williams/Witchcraft 3": "williams",
  "bookshelf/Browning, Robert/Pippa Passes": "pippa",
  "page/Links": "A link to [Horace](#page/Horace), one to [itself](#page/Links), and one [outside](https://example.org/).\n",
  "bookshelf/Boethius/Consolatio": "# De consolatione philosophiae\n\n## Book 3\n\n- [3pr1](#bookshelf/Boethius/Consolatio/3pr1)\n- [3m1](#bookshelf/Boethius/Consolatio/3m1)\n- [3pr2](#bookshelf/Boethius/Consolatio/3pr2)\n",
  "bookshelf/Boethius/Consolatio/3pr1": "# 3pr1\n\nIam cantum illa finiuerat.\n", "bookshelf/Boethius/Consolatio/3m1": "# 3m1\n\nQui serere ingenuum uolet agrum.\n", "bookshelf/Boethius/Consolatio/3pr2": "# 3pr2\n\nTum defixo paululum uisu.\n",
};
/* the stanza step's seeds (2026-09-28): written by that step alone, so no
   earlier reading moves; src/main.ts's `?store=seed-stanza` holds the
   same text for the successor */
export const STANZA_SEEDS = {
    "bookshelf/Spenser, Edmund": "# Edmund Spenser\n\n- [The Faerie Queene](#bookshelf/Spenser%2C%20Edmund/The%20Faerie%20Queene)\n",
    "bookshelf/Spenser, Edmund/The Faerie Queene": "# The Faerie Queene\n\n::: reference\nroman book and canto\n:::\n\n## Book I: The Legende of the Knight of the Red Crosse, or of Holinesse\n\n- [Canto i](#bookshelf/Spenser%2C%20Edmund/The%20Faerie%20Queene/1.1)\n",
    "bookshelf/Spenser, Edmund/The Faerie Queene/1.1": "# Book I, Canto i\n\n::: note\nThe Patron of true Holinesse,\nFoule Errour doth defeate:\n:::\n\n::: stanza 1\nA Gentle Knight was pricking on the plaine,\nYcladd in mightie armes and siluer shielde,\nWherein old dints of deepe wounds did remaine,\n:::\n\n::: stanza 2\nBut on his brest a bloudie Crosse he bore,\nThe deare remembrance of his dying Lord,\nFor whose sweete sake that glorious badge he wore,\n:::\n\n::: stanza 3\nVpon a great aduenture he was bond,\nThat greatest Gloriana to him gaue,\nThat greatest Glorious Queene of Faerie lond,\n:::\n",
};
/* the margin-note step's seeds (2026-09-29): written by that step alone,
   from the same files src/main.ts's `?store=seed-margin` imports */
export const fixture = (name: string) => readFileSync(new URL("../../fixtures/" + name, import.meta.url), "utf8");
export const MARGIN_SEEDS = {
  "bookshelf/Donne, John/Anniversaries/The First Anniversarie": fixture("donne-anniversarie-margin-notes.md"),
  "page/Margins": fixture("margins-prose.md"),
};
/* a pause for the page to answer a gesture: two frames, ProseMirror and
   Svelte drawing within them, where a fixed sleep of up to 300 ms stood;
   a window not in front may have its frames slowed, so 100 ms at most */
/* a pause for the save after typing: 650 ms past the last edit and no
   store write open, where the page carries the watcher the corner driver
   installs; else the sleep it replaced */
export async function landed(p: Page, ms: number) {
  if (!(await p.evaluate(() => "__writes" in window).catch(() => false))) return p.waitForTimeout(ms);
  await p.waitForFunction(() => performance.now() - window.__lastEdit > 650 && !window.__writes, null, { timeout: ms + 2000, polling: 25 }).catch(() => {});
}
/* ⌃⌘K, then the words once the box holds the focus: typed at once, they
   went to the entry under it (pin: where the keys go › ⌃⌘T on today from Search) */
export async function searchFor(p: Page, words: string) {
  await p.keyboard.press("Control+Meta+k");
  await p.waitForFunction(() => document.activeElement?.classList.contains("search-input"), null, { timeout: 2000 }).catch(() => {});
  await p.keyboard.type(words);
}
export async function rest(p: Page) {
  await p.evaluate(() => new Promise((done) => { requestAnimationFrame(() => requestAnimationFrame(done)); setTimeout(done, 100); })).catch(() => {});
}
/* the page held still: the scroll and the layout's height the same over four
   frames, a measuring pass a frame after a change having run */
export async function still(p: Page) {
  await p.evaluate(() => new Promise<void>((done) => {
    let last = "", same = 0, frames = 0;
    const tick = () => { const now = scrollY + ":" + document.documentElement.scrollHeight; same = now === last ? same + 1 : 0; last = now; if (same >= 4 || ++frames > 120) done(); else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  })).catch(() => {});
}

/* the run's page, context and adapter, bound before the first section */
export let page: Page, ctx: BrowserContext, A: Adapter, R: Adapter["read"], S: Adapter["sel"], shot: string | undefined;
/* the section playing, which an arrival's line names */
export let current = "";
export const setSection = (name: string): void => { current = name; };
/* where the keys go: a caret by the
   kind of place it stands, "selected" and a length, "on" the element
   holding the focus outside the text, or "none". The screen's "sel none"
   is both a caret and no focus at all, and the compare leaves the screen
   out. The kind, not the text after it: an arrival's place is where the
   window last paused, which moves with the run's timing */
export const cursor = (): Promise<string> =>
  page.evaluate(inPageWith([S.editor, S.source], cursorKind, textareaFocused, textareaCaret, textRoot, focusOutside, caretAway, letterBox, aroundCaret, caretInLine));
/* the cursor's parts, run in the page as one script */
function textareaFocused(ta: Element | null, a: Element | null): boolean {
  return !!ta && ta.tagName === "TEXTAREA" && a === ta;
}
function textareaCaret(ta: HTMLTextAreaElement): string {
  const at = ta.selectionStart;
  if (at !== ta.selectionEnd) return "selected " + (ta.selectionEnd - at);
  if (at === 0 || ta.value[at - 1] === "\n") return "at a line's start";
  return at === ta.value.length ? "at the end" : "inside a line";
}
function textRoot(ed: string, ta: Element | null): Element | null {
  return document.querySelector(ed) || (ta && ta.tagName !== "TEXTAREA" ? ta : null);
}
function focusOutside(a: Element | null): string {
  return !a || a === document.body ? "none" : "on " + a.tagName.toLowerCase();
}
function caretAway(root: Element, s: Selection): boolean {
  return !s.rangeCount || !root.contains(s.anchorNode);
}
function letterBox(t: Node, i: number): DOMRect | null {
  const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1);
  const b = r.getClientRects()[0];
  return b && b.height ? b : null;
}
/* the boxes of the letters either side of the caret, the first after it ending the walk */
function aroundCaret(root: Element, caret: Range): { prev: DOMRect | null; next: DOMRect | null } {
  let prev = null, next = null;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let t = w.nextNode(); t && !next; t = w.nextNode()) for (let i = 0; i < t.data.length; i++) {
    if (t.data[i] === "\u200b" || t.data[i] === "\n") continue;
    const b = letterBox(t, i);
    if (!b) continue;
    if (caret.comparePoint(t, i) < 0) prev = b; else { next = b; break; }
  }
  return { prev, next };
}
function caretInLine(root: Element, s: Selection): string {
  const { prev, next } = aroundCaret(root, s.getRangeAt(0));
  if (!next) return prev ? "at the end" : "at a line's start";
  return !prev || prev.bottom - 2 <= next.top ? "at a line's start" : "inside a line";
}
function cursorKind([ed, src]: [string, string]): string {
  const a = document.activeElement, ta = document.querySelector(src);
  if (textareaFocused(ta, a)) return textareaCaret(ta as unknown as HTMLTextAreaElement);
  const root = textRoot(ed, ta);
  if (!root || !root.contains(a)) return focusOutside(a);
  const s = getSelection();
  if (caretAway(root, s)) return "focus, no caret";
  return s.isCollapsed ? caretInLine(root, s) : "selected " + s.toString().length;
}
export const log = async (label: string, x: unknown) => { const base = x !== null && typeof x === "object" && !Array.isArray(x) ? x : { value: x }; console.log(label + ":", JSON.stringify({ ...base, cursor: await cursor(), screen: await A.screen(page) })); };
/* an arrival is read before the step's own gestures, whose helpers focus
   the text themselves; a focus that never comes reads as "none" after
   the wait. No screen: the last section's bar may still be fading */
export const go = async (hash: string, ms = 15000) => {
  await page.goto(A.url(hash)); await A.waitEntry(page, decodeURIComponent(hash).replace(/%20/g, " "), ms);
  await page.waitForFunction(([ed, src]) => [ed, src].some((q) => document.querySelector(q)?.contains(document.activeElement)), [S.editor, S.source], { timeout: 1000 }).catch(() => {});
  console.log(current + ": arrived at " + decodeURIComponent(hash) + ":", JSON.stringify({ cursor: await cursor() }));
};
/* whether a foreign write has landed in the store, read back for up to 30 rests: the reading says so when it has not */
export const seededIn = async (key: string) => { for (let i = 0; i < 30; i++) { if (await A.stored(page, key)) return true; await rest(page); } return false; };
/* the window, a paragraph by its first words, the corner's text */
export const winY = () => page.evaluate(() => Math.round(scrollY));
export const inView = (start: string) => page.evaluate(([s, t]) => { const p = [...document.querySelectorAll(s + " p")].find((x) => x.textContent.startsWith(t)); if (!p) return null; const r = p.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }, [S.editor, start]);
export const cornerText = () => page.evaluate((s) => document.querySelector(s)?.textContent || "", S.corner);
/* a scroll BY THE READER'S HAND, a wheel over the page: a script's
   scrollTo is no reader, and since 2026-09-28 an arrival holds the entry's
   remembered place until a wheel, key, pointer or touch — the toolbar
   step's scrollTo(0, 0) was undone by the held place and its double-click
   missed the word */
export const wheelTo = async (y: number) => {
  await page.mouse.move(500, 400);
  await page.mouse.wheel(0, y - (await page.evaluate(() => scrollY)));
  await page.waitForFunction((y) => Math.abs(scrollY - Math.min(y, document.documentElement.scrollHeight - innerHeight)) < 2, y, { timeout: 3000 }).catch(() => {});
};
/* the dialogs, answered by the harness: `answer` is what a prompt gets
   (a list: one per prompt, in turn), a confirm is accepted; `prompts`
   keeps each prompt's text and what it held */
let answer: string | (string | null)[] | null = null;
export const prompts: string[] = [], confirms: string[] = [];
export const setAnswer = (a: typeof answer): void => { answer = a; };
function answerDialog(d: Dialog): void {
  if (d.type() === "confirm") { confirms.push(d.message()); d.accept(); return; }
  prompts.push(d.message() + " [" + d.defaultValue() + "]");
  const a = Array.isArray(answer) ? (answer.length ? answer.shift() : null) : answer;
  if (a !== null) d.accept(a); else d.dismiss();
}

/* ONE SECTION PER FEATURE, each opening its own entry, run in order and
   each in its own try: a selector the app lacks fails that section's
   remaining steps as one line and the run goes on */
export const SECTIONS: [string, () => Promise<void>][] = [];
export const section = (name: string, fn: () => Promise<void>): void => { SECTIONS.push([name, fn]); };

export function bind(p: Page, c: BrowserContext, adapter: Adapter, opts: RunOptions): void {
  page = p; ctx = c; A = adapter; R = adapter.read; S = adapter.sel; shot = opts.screenshot;
  page.on("dialog", answerDialog);
}
