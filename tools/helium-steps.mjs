// THE STEPS, shared: one list of gestures and readings played over an
// ADAPTER (tools/adapters/*.mjs) that knows where the app is and how its
// screen reads, so the successor and the current app answer the same
// questions in the same order and their outputs diff line by line. Split
// out of helium-corner.mjs 2026-09-12, asked: the approved output should
// be what the current app does, not what the successor did on the day.
// Every step logs its label, its own reading and the screen after it.
/* the day both drivers pin the page's clock to (context.clock.setFixedTime,
   Date only; the timers run): the day the reference run was made. A
   reading that spells today — the Go to row's Day select — was scrubbed by
   the day number until 2026-09-22, when a run on a day whose number a
   seeded day shares (the 5th, the 6th) would have read one option fewer
   and no scrub could say so. Never a seeded day. */
import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
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
const fixture = (name) => readFileSync(new URL("../fixtures/" + name, import.meta.url), "utf8");
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
async function landed(p, ms) {
  if (!(await p.evaluate(() => "__writes" in window).catch(() => false))) return p.waitForTimeout(ms);
  await p.waitForFunction(() => performance.now() - window.__lastEdit > 650 && !window.__writes, null, { timeout: ms + 2000, polling: 25 }).catch(() => {});
}
/* ⌃⌘K, then the words once the box holds the focus: typed at once, they
   went to the entry under it (pin: where the keys go › ⌃⌘T on today from Search) */
async function searchFor(p, words) {
  await p.keyboard.press("Control+Meta+k");
  await p.waitForFunction(() => document.activeElement?.classList.contains("search-input"), null, { timeout: 2000 }).catch(() => {});
  await p.keyboard.type(words);
}
async function rest(p) {
  await p.evaluate(() => new Promise((done) => { requestAnimationFrame(() => requestAnimationFrame(done)); setTimeout(done, 100); })).catch(() => {});
}

export async function runSteps(page, ctx, A, opts = {}) {
  const shot = opts.screenshot;
  const R = A.read, S = A.sel;
  /* where the keys go, read the same way over both apps: a caret by the
     kind of place it stands, "selected" and a length, "on" the element
     holding the focus outside the text, or "none". The screen's "sel none"
     is both a caret and no focus at all, and the compare leaves the screen
     out. The kind, not the text after it: an arrival's place is where the
     window last paused, which moves with the run's timing */
  const cursor = () => page.evaluate(([ed, src]) => {
    const a = document.activeElement, ta = document.querySelector(src);
    if (ta && ta.tagName === "TEXTAREA" && a === ta) {
      const at = ta.selectionStart;
      if (at !== ta.selectionEnd) return "selected " + (ta.selectionEnd - at);
      return at === 0 || ta.value[at - 1] === "\n" ? "at a line's start" : at === ta.value.length ? "at the end" : "inside a line";
    }
    const root = document.querySelector(ed) || (ta && ta.tagName !== "TEXTAREA" ? ta : null);
    if (!root || !root.contains(a)) return !a || a === document.body ? "none" : "on " + a.tagName.toLowerCase();
    const s = getSelection();
    if (!s.rangeCount || !root.contains(s.anchorNode)) return "focus, no caret";
    if (!s.isCollapsed) return "selected " + s.toString().length;
    const caret = s.getRangeAt(0);
    const box = (t, i) => { const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1); const b = r.getClientRects()[0]; return b && b.height ? b : null; };
    let prev = null, next = null;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let t = w.nextNode(); t && !next; t = w.nextNode()) for (let i = 0; i < t.data.length; i++) {
      if (t.data[i] === "\u200b" || t.data[i] === "\n") continue;
      const b = box(t, i);
      if (!b) continue;
      if (caret.comparePoint(t, i) < 0) prev = b; else { next = b; break; }
    }
    if (!next) return prev ? "at the end" : "at a line's start";
    return !prev || prev.bottom - 2 <= next.top ? "at a line's start" : "inside a line";
  }, [S.editor, S.source]);
  const log = async (label, x) => { const base = x !== null && typeof x === "object" && !Array.isArray(x) ? x : { value: x }; console.log(label + ":", JSON.stringify({ ...base, cursor: await cursor(), screen: await A.screen(page) })); };
  /* an arrival is read before the step's own gestures, whose helpers focus
     the text themselves; a focus that never comes reads as "none" after
     the wait. No screen: the last section's bar may still be fading */
  let section = "";
  const go = async (hash, ms = 15000) => {
    await page.goto(A.url(hash)); await A.waitEntry(page, decodeURIComponent(hash).replace(/%20/g, " "), ms);
    await page.waitForFunction(([ed, src]) => [ed, src].some((q) => document.querySelector(q)?.contains(document.activeElement)), [S.editor, S.source], { timeout: 1000 }).catch(() => {});
    console.log(section + ": arrived at " + decodeURIComponent(hash) + ":", JSON.stringify({ cursor: await cursor() }));
  };
  /* whether a foreign write has landed in the store, read back for up to 30 rests: the reading says so when it has not */
  const seededIn = async (key) => { for (let i = 0; i < 30; i++) { if (await A.stored(page, key)) return true; await rest(page); } return false; };
  /* the window, a paragraph by its first words, the corner's text */
  const winY = () => page.evaluate(() => Math.round(scrollY));
  const inView = (start) => page.evaluate(([s, t]) => { const p = [...document.querySelectorAll(s + " p")].find((x) => x.textContent.startsWith(t)); if (!p) return null; const r = p.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }, [S.editor, start]);
  const cornerText = () => page.evaluate((s) => document.querySelector(s)?.textContent || "", S.corner);
  /* a scroll BY THE READER'S HAND, a wheel over the page: a script's
     scrollTo is no reader, and since 2026-09-28 an arrival holds the entry's
     remembered place until a wheel, key, pointer or touch — the toolbar
     step's scrollTo(0, 0) was undone by the held place and its double-click
     missed the word */
  const wheelTo = async (y) => {
    await page.mouse.move(500, 400);
    await page.mouse.wheel(0, y - (await page.evaluate(() => scrollY)));
    await page.waitForFunction((y) => Math.abs(scrollY - Math.min(y, document.documentElement.scrollHeight - innerHeight)) < 2, y, { timeout: 3000 }).catch(() => {});
  };
  /* the dialogs, answered by the harness: `answer` is what a prompt gets
     (a list: one per prompt, in turn), a confirm is accepted; `prompts`
     keeps each prompt's text and what it held */
  let answer = null;
  const prompts = [], confirms = [];
  page.on("dialog", (d) => {
    if (d.type() === "confirm") { confirms.push(d.message()); d.accept(); return; }
    prompts.push(d.message() + " [" + d.defaultValue() + "]");
    const a = Array.isArray(answer) ? (answer.length ? answer.shift() : null) : answer;
    if (a !== null) d.accept(a); else d.dismiss();
  });
  /* ONE SECTION PER FEATURE, each opening its own entry, run in order and
     each in its own try: a selector the app lacks fails that section's
     remaining steps as one line and the run goes on, so a whole
     comparison comes out of one run */
  const sections = [
    ["launch, panels, the corner, links", async () => {
  const stages = await A.launch(page, SEEDS);
  console.log("the launch's stages:", JSON.stringify(stages));
  await log("after warm", await R.corner(page));
  await log("masthead over Horace", await R.masthead(page));
  if (shot) await page.screenshot({ path: shot.replace(/\.png$/, "-masthead.png"), clip: { x: 0, y: 0, width: 1000, height: 130 } });
  await page.click(S.pagesOpener);
  await log("pages panel", await R.panel(page));
  if (shot) await page.screenshot({ path: shot.replace(/\.png$/, "-panel.png"), clip: { x: 0, y: 0, width: 600, height: 260 } });
  await page.click(S.booksOpener);
  await log("books panel, displacing it", await R.panel(page));
  await page.click(S.booksOpener);
  await log("its own opener again", await R.panel(page));
  await page.click(S.pagesOpener);
  await page.keyboard.press("Escape");
  await log("after Escape", await R.panel(page));
  await page.click(S.pagesOpener);
  await page.mouse.click(500, 400);
  await log("after a click outside", await R.panel(page));
  await page.click(S.pagesOpener);
  await page.click(S.panelRow("Williams"));
  await A.waitEntry(page, "page/Williams", 5000);
  await log("after a row click", { entry: await A.entry(page), panel: await R.panel(page) });
  await page.waitForTimeout(3200);
  await log("3.2 s later", await R.corner(page));
  await page.click(S.editor);
  await page.keyboard.press("End");
  await page.keyboard.type(" corner");
  await R.waitCorner(page, "saved");
  await log("after typing", await R.corner(page));
  if (shot) await page.screenshot({ path: shot, clip: { x: 0, y: 500, width: 500, height: 100 } });
  await page.click(S.corner);
  await log("after the click", await R.corner(page));
  await page.keyboard.press("Control+Meta+,");
  await rest(page);
  await log("after ⌃⌘, on the first entry", await R.corner(page));
  await go("page/Links");
  await page.click(S.editorLink("#page/Links"));
  await rest(page);
  await log("a link to itself", { entry: await A.entry(page), ...(await R.corner(page)) });
  await page.click(S.editorLink("https://example.org/"));
  await rest(page);
  await log("a plain click on an external link", { entry: await A.entry(page), url: page.url().split("#")[1] });
  const popup = ctx.waitForEvent("page", { timeout: 5000 }).then((p) => p.url(), () => "(no new tab)");
  await page.click(S.editorLink("#page/Horace"), { modifiers: ["Meta"] });
  await rest(page);
  await log("⌘-click on an internal link", { newTab: (await popup).split("#")[1], ...(await R.afterModClick(page)) });
  const popup2 = ctx.waitForEvent("page", { timeout: 5000 }).then((p) => p.url(), () => "(no new tab)");
  await page.click(S.editorLink("https://example.org/"), { modifiers: ["Meta"] });
  await rest(page);
  await log("⌘-click on an external link", { newTab: (await popup2) !== "(no new tab)", ...(await R.afterModClick(page)) });   /* headless has no network: whether a tab opened, not where it got */
  await page.click(S.editorLink("#page/Horace"));
  await A.waitEntry(page, "page/Horace", 5000);
  await log("a plain click on an internal link", { entry: await A.entry(page) });
    }],
    ["fence", async () => {
  /* a verse fence pasted as TEXT mid-paragraph is set down between the halves, its first line inside */
  await go("page/Pasted%20Fence");
  await page.click(S.editor);
  await page.keyboard.type("start end");
  /* THE CARET PLACED THROUGH THE DOM SELECTION, not the keys: Home and the
     arrows moved it on some runs and not others (measured 2026-09-12, three
     runs), and the paste then landed at the paragraph's end */
  await rest(page);
  await R.caretAfter(page, "start end", 5);
  await rest(page);
  await R.pasteText(page, "::: verse\nHeil! Heil! | Hail! Hail!\nErlösung | Salvation\n:::");
  await rest(page);
  await log("a fence pasted as text mid-paragraph", { md: await A.stored(page) });
    }],
    ["verse copy", async () => {
  /* a verse block copied inside the rendered view with ⌘C and pasted into a fresh page with ⌘V comes back as the block */
  await go("page/Horace");
  await R.selectAll(page, S.editorVerse);
  await rest(page);
  await page.keyboard.press("Meta+c");
  await go("page/Pasted%20Verse");
  await page.click(S.editor);
  await page.keyboard.press("Meta+v");
  await rest(page);
  { const md = await A.stored(page); console.log("a verse block copied and pasted:", JSON.stringify({ fence: md.startsWith("::: verse"), pairs: await R.pairs(page), head: md.split("\n").slice(0, 3) })); }
    }],
    ["refused fence", async () => {
  /* a refused fence named on the switch back: "::: versey" typed in the source stays a paragraph and the corner says why; a clean switch releases it */
  await go("page/Fenced");
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source);
  await page.keyboard.type("::: versey\nline\n:::");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor);
  await rest(page);
  await log("a refused fence", await R.refusedFence(page));
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source);
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("::: verse\nline\n:::");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor);
  await rest(page);
  await log("a clean switch", await R.cleanSwitch(page));
    }],
    ["quote tab", async () => {
  /* Tab in a quote nests, Shift-Tab lifts, again at the floor says so; ⌃⌘L opens the Line numbering row over verse */
  await go("page/Quoted");
  await page.click(S.editor);
  await page.keyboard.type("> quoted words");
  await page.keyboard.press("Tab");
  await rest(page);
  await log("Tab in a quote", { md: await A.stored(page) });
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await rest(page);
  await log("Shift-Tab twice", { md: await A.stored(page), corner: await R.cornerText(page) });
  await go("page/Horace");
  await page.keyboard.press("Control+Meta+l");
  await rest(page);
  await log("⌃⌘L over Horace", await R.linesRow(page));
  await page.keyboard.press("Escape");
  await log("Escape", await R.linesRowOpen(page));
    }],
    ["reference copy", async () => {
  /* the rich flavour: ⌃⌘R over a selection in a paired verse block writes markdown and HTML, the HTML carrying the reference anchor and the pair's grid inline */
  await go("page/Horace");
  await R.selectAll(page, S.editorCell);
  /* the bar, not 100ms: it shows after the selectionchange the editor takes the selection on */
  /* the bar has missed about 1 full run in 15 and never in this step's
     replays: its cause unknown, a miss is selected again once and appended
     to tools/out/flakes.log, outside the verdict; a second miss reads as
     itself */
  const barMiss = () => R.waitBar(page).then(() => null, (e) => e.message);
  let barMissed = await barMiss();
  if (barMissed) {
    mkdirSync(new URL("out/", import.meta.url), { recursive: true });
    appendFileSync(new URL("out/flakes.log", import.meta.url), new Date().toISOString() + " " + A.name + " reference copy: " + barMissed + "\n");
    await R.selectAll(page, S.editorCell);
    barMissed = await barMiss();
  }
  const said = await R.cornerAfter(page, () => page.keyboard.press("Control+Meta+r"), /copied|copy/);
  await log("⌃⌘R", { ...(barMissed ? { barMissed } : {}), said, ...await R.clipboardReference(page) });
    }],
    ["a reference pasted", async () => {
  /* ⌃⌘R's reference pasted with ⌘V into another entry: the link stored by its bare address (#page/…), never the page's full file address */
  await go("page/Horace");
  await R.selectAll(page, S.editorCell);
  const barMissed = await R.waitBar(page).then(() => null, (e) => e.message);
  const said = await R.cornerAfter(page, () => page.keyboard.press("Control+Meta+r"), /copied|copy/);
  /* the HTML flavour is the paste's source and carries the full address, so a bare link stored is the paste's own doing; the old app's copy was still landing at the first read ("Clipboard data has changed") */
  const copied = await page.evaluate(async () => { let last = ""; for (let i = 0; i < 10; i++) { try { const item = (await navigator.clipboard.read())[0]; if (!item.types.includes("text/html")) return "no html"; const href = (/<a href="([^"]*)"/.exec(await (await item.getType("text/html")).text()) ?? [])[1] ?? ""; return href.startsWith("#") ? "bare" : href.startsWith("file:") ? "file address" : href ? "other" : "no link"; } catch (e) { last = String(e); await new Promise((r) => setTimeout(r, 50)); } } return last; });
  await go("page/Referred");
  await page.click(S.editor);
  await page.keyboard.press("Meta+v");
  await rest(page);
  { const md = await A.stored(page); const href = (md.match(/\]\(([^)]*)\)/) ?? [])[1] ?? ""; await log("the reference pasted", { ...(barMissed ? { barMissed } : {}), said, copied, link: href.startsWith("#") ? "bare" : href.startsWith("file:") ? "file address" : href ? "other" : "none", head: href.replace(/\?h=.*$/, "").replace(/^file:.*#/, "file:…#") }); }
  /* prose with two spaces after a full stop: the paste keeps them as the entry has them */
  await go("page/Williams/Witchcraft 3");
  const spanned = await R.selectBetween(page, "though they were not vampires", "could take again");
  const barMissedProse = await R.waitBar(page).then(() => null, (e) => e.message);
  const saidProse = await R.cornerAfter(page, () => page.keyboard.press("Control+Meta+r"), /copied|copy/);
  await go("page/Referred");
  /* over the whole page: a paste at a paragraph's start joins its last line to that paragraph */
  await page.click(S.editor);
  await page.keyboard.press("Meta+a");
  await page.keyboard.press("Meta+v");
  await rest(page);
  { const md = await A.stored(page); await log("prose with two spaces pasted", { ...(barMissedProse ? { barMissed: barMissedProse } : {}), joined: /again\[/.test(md), spanned, said: saidProse, spaces: md.includes("greater.  The") ? "kept" : md.includes("greater. The") ? "folded" : "not found" }); }
  /* the same reference pasted onto a selected word: the word made a link to its address, the passage not pasted again */
  const chosen = await R.selectBetween(page, "vampires", "vampires");
  await page.keyboard.press("Meta+v");
  await rest(page);
  { const md = await A.stored(page); const screen = await page.evaluate(() => { const a = [...document.querySelectorAll("#editor .ProseMirror a")].find((x) => x.textContent === "vampires"); const s = getSelection(); return { link: a ? (a.getAttribute("href") ?? "").replace(/\?h=.*$/, "") : "none", collapsed: s.isCollapsed, caretAfter: s.anchorNode?.textContent.slice(Math.max(0, s.anchorOffset - 8), s.anchorOffset) }; }); await log("a reference pasted onto a word", { chosen, ...screen, references: md.split("):\n").length - 1, stored: /\[vampires\]\(#page\/Williams/.test(md) }); }
  /* the same reference pasted mid-sentence: its label alone, no colon, the caret after it */
  await R.caretAfter(page, "greater.", 8);
  await page.keyboard.press("Meta+v");
  await rest(page);
  /* the paste may not have landed in two frames, and no edit is then there to wait on: the reading says what stood when the wait ran out */
  const landedAfter = async (done) => { let md = await A.stored(page); for (let i = 0; i < 60 && !done(md); i++) { await page.waitForTimeout(50); md = await A.stored(page); } return md; };
  { const md = await landedAfter((m) => /greater\.\[\*Williams/.test(m)); const screen = await page.evaluate(() => { const s = getSelection(); return { caretAfter: s.anchorNode?.textContent.slice(Math.max(0, s.anchorOffset - 8), s.anchorOffset), caretBefore: s.anchorNode?.textContent.slice(s.anchorOffset, s.anchorOffset + 6) }; }); await log("a reference pasted mid-sentence", { ...screen, references: md.split("):\n").length - 1, referred: /greater\.\[\*Williams\*[^\]]*\]\(#page\/Williams\/Witchcraft%203\?h=[^)]*\) *The/.test(md), colon: /greater\.\[[^\]]*\]\([^)]*\):/.test(md) }); }
  /* the page's reference copied with ⌘C, then pasted mid-sentence: a copy made in the page pastes whole */
  await page.click(S.editor);
  await page.keyboard.press("Meta+a");
  await page.keyboard.press("Meta+c");
  const copiedHere = await page.evaluate(async () => { for (let i = 0; i < 40; i++) { try { const it = (await navigator.clipboard.read())[0]; if (it.types.includes("text/html") && (await (await it.getType("text/html")).text()).includes("data-pm-slice")) return "in-page"; } catch { /* read again */ } await new Promise((r) => setTimeout(r, 50)); } return "not landed"; });
  await R.caretAfter(page, "greater.", 8);
  await page.keyboard.press("Meta+v");
  await rest(page);
  { const md = await landedAfter((m) => m.split("):\n").length >= 3 && /greater\.\[\*Williams/.test(m)); await log("the page's own reference pasted mid-sentence", { copied: copiedHere, references: md.split("):\n").length - 1, labelAlone: (md.match(/greater\.\[\*Williams/g) ?? []).length }); }
    }],
    ["code block", async () => {
  /* code: a fence with a language typed, its tokens coloured, the label in the corner, the copy button on hover */
  await go("page/Coded");
  await page.click(S.editor);
  await page.keyboard.type("```js");
  await page.keyboard.press("Enter");
  await page.keyboard.type("const n = 42 // answer");
  await rest(page);
  await log("a js block typed", await R.codeBlock(page));
  await page.hover(S.editorPre);
  await rest(page);
  await log("hovered", await R.copyHover(page));
  await page.click(S.copybtn);
  await rest(page);
  await log("clicked", await R.copyLabel(page));
    }],
    ["card copy", async () => {
  /* a card copied both ways carries its colour: the hover copy's HTML and ⌘C's HTML both spell the background inline, and ⌘V on a fresh page brings the card back */
  await go("page/Carded");
  await page.click(S.editor);
  await R.pasteText(page, "::: card-light-blue\n*Purgatorio* 19.26\n\n::: verse\nquand’ una donna apparve | When a lady appeared\n:::\n:::");
  await rest(page);
  await page.hover(S.editorCard);
  await rest(page);
  await page.click(S.copybtn);
  await rest(page);
  await log("a card hover-copied", { label: await R.copyLabel(page), live: await R.cardLive(page), ...(await R.clipboardCard(page)) });
  await R.selectAll(page, S.editorCard);
  await rest(page);
  await page.keyboard.press("Meta+c");
  await rest(page);
  await log("a card ⌘C'd", await R.clipboardCard(page));
  await go("page/Pasted%20Card");
  await page.click(S.editor);
  await page.keyboard.press("Meta+v");
  await rest(page);
  { const md = await A.stored(page); console.log("pasted on a fresh page:", JSON.stringify({ fence: md.startsWith("::: card-light-blue"), lines: md.split("\n").length, ...(await R.cardsAndPairs(page)) })); }
    }],
    ["grid", async () => {
  /* a grid of cards (2026-09-22, successor-only): drawn N across past the measure, hover-copied whole from the band above its top-right corner, ⌘C across two cards carrying the columns, and a stray line inside refused on the switch back with its reason pinned */
  await go("page/Gridded");
  await page.click(S.editor);
  await R.pasteText(page, "::: card-light-green\nabove\n:::\n\n::: grid 2\n::: card-light-blue\nalpha\n:::\n\n::: card-red\nbeta\n:::\n:::");   /* a card directly above: the band over its foot still finds the grid (the 2026-09-22 review) */
  await rest(page);
  await log("a grid pasted", await R.gridLayout(page));
  const hover = await R.gridHover(page);
  await log("hovered above its corner", hover);
  if (hover.show) { await page.click(S.copybtn); await rest(page); }
  await log("the grid copied", { label: await R.copyLabel(page), text: await R.clipboardText(page) });
  await R.selectCards(page);
  await rest(page);
  await page.keyboard.press("Meta+c");
  await rest(page);
  await log("two cards ⌘C'd", await R.clipboardCard(page));
  await go("page/Pasted%20Grid");
  await page.click(S.editor);
  await page.keyboard.type("prose first ");
  await page.keyboard.press("Meta+v");
  await rest(page);
  await log("two cards pasted mid-paragraph", await R.gridLayout(page));
  await go("page/Gridded");
  await page.keyboard.press("Control+Meta+m");
  await rest(page);
  await R.setSource(page, "::: grid\n::: card-light-blue\nalpha\n:::\nloose\n:::");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForTimeout(400);
  await log("a stray line in a grid, switched back", { corner: await R.gridCorner(page) });
  /* the open path forces source over the stored fault (away and back, once the save has landed — a reload ended the old app's run); a refused ⌃⌘M leaves it forced, so the next entry opens rendered (the 2026-09-22 review) */
  for (let i = 0; i < 12 && !(await A.stored(page) || "").includes("loose"); i++);   /* the store holds the stray line before the navigation, or the open path has nothing to refuse (the confirmation pass) */
  await go("page/Carded");
  await page.keyboard.press("Control+Meta+m");   /* back to the rendered view on a sound entry, so the faulty one is opened from it */
  await rest(page);
  await go("page/Gridded");
  await rest(page);
  await log("the faulty entry opened", { source: await R.inSource(page), corner: await R.gridCorner(page) });
  await page.keyboard.press("Control+Meta+m");
  await rest(page);
  await go("page/Carded");
  await log("the next entry after a refused switch", { source: await R.inSource(page) });
  await go("page/Gridded");
  await rest(page);
  /* the line fixed and the view restored: the pin released, the grid drawn */
  if (!(await R.inSource(page))) { await page.keyboard.press("Control+Meta+m"); await rest(page); }   /* the current app rendered the stray line as a paragraph and came back */
  await R.setSource(page, "::: grid\n::: card-light-blue\nalpha\n:::\n\n::: card-red\nloose\n:::\n:::");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForTimeout(400);
  await R.waitCorner(page, "saved");   /* read after the switch's save: at 400ms alone it was there one run in two */
  await log("the line made a card, switched back", { corner: await R.gridCorner(page), ...(await R.gridLayout(page)) });
    }],
    ["paired card", async () => {
  /* a card's and a note's paired verse split by their own widest lines: equal halves wrapped four lines of a card whose translation needed a third of it */
  await go("page/Paired%20Card");
  await page.click(S.editor);
  const pairs = "::: verse\n*This is what was bequeathed us* | Death of the body —\n | How many poems\nNo other shore, only this bank | In the Book\nOn which the living gather. | Urge us\n\nNo meaning but what we find here. |\nNo purpose but what we make. | Death of the heart —\n\nThat, and the beloved’s clear instructions: | Insisting\nTurn me into song; sing me awake. | We'd better not.\n:::";
  await R.pasteText(page, "::: card-light-blue\n" + pairs + "\n:::\n\n::: note\n" + pairs + "\n:::");
  await page.waitForTimeout(700);
  const split = () => page.evaluate((ed) => [...document.querySelectorAll(ed + " :is(div.note, div[class^='card-']) :is(.verse, .prose)")].map((b) => {
    const rows = [...b.querySelectorAll(":scope > .vpair")];
    let wrapped = 0;
    for (const r of rows) for (const c of r.children) {
      const rg = document.createRange(); rg.selectNodeContents(c);
      const tops = [...rg.getClientRects()].filter((x) => x.width > 0).map((x) => x.top).sort((p, q) => p - q);
      if (tops.some((t, k) => k && t - tops[k - 1] > 5)) wrapped++;
    }
    const [w1, w2] = rows.length ? getComputedStyle(rows[0]).gridTemplateColumns.split(" ").map(parseFloat) : [0, 0];
    return { box: b.parentElement.className.split(" ")[0], rows: rows.length, wrapped, wider: w1 > w2 };
  }), S.editor);
  await log("a card and a note of paired verse", { blocks: await split() });
  await page.keyboard.press("End");
  await page.keyboard.type(" and on, and on, and on");
  await landed(page, 900);
  await log("typed on in the note's last row", { blocks: await split() });
    }],
    ["picture", async () => {
  /* a pasted picture: a PNG drawn on a canvas, pasted as a file, filed beside the entry and placed */
  await go("page/Pictured");
  await page.click(S.editor);
  await page.keyboard.type("A picture: ");
  await R.pastePng(page);
  await R.waitImg(page);
  await R.waitCorner(page, "saved");
  await log("a picture pasted", { md: await A.stored(page), ...(await R.picture(page)) });
  await go("page/Pictured%20End");
  await page.click(S.editor);
  await page.keyboard.type("Last line");
  await page.keyboard.press("Enter");
  await R.pastePng(page);
  await R.waitImg(page);
  await R.waitCorner(page, "saved");
  await log("a picture pasted at the entry's end", { md: await A.stored(page), lineBelowPicture: await page.evaluate((s) => { const last = document.querySelector(s)?.lastElementChild; const prev = last?.previousElementSibling; return !!last && !last.textContent.trim() && !last.querySelector("img") && !!prev?.querySelector("img"); }, S.editor), caretBelowPicture: await page.evaluate((s) => { const n = getSelection().anchorNode; const el = n && (n.nodeType === 1 ? n : n.parentElement); const root = document.querySelector(s); let b = el; while (b && b.parentElement !== root) b = b.parentElement; return !!b && b === root.lastElementChild && !!b.previousElementSibling?.querySelector("img"); }, S.editor) });
  await go("page/Pictured%20Away");
  await page.click(S.editor);
  await page.keyboard.type("Aimed here");
  await R.pastePng(page);
  await page.evaluate(() => { location.hash = "#page/Horace"; });
  await A.waitEntry(page, "page/Horace", 5000).catch(() => {});
  await page.waitForTimeout(1500);
  await log("a picture pasted, then another entry at once", { entry: await A.entry(page), picturesHere: await page.evaluate((s) => document.querySelectorAll(s).length, S.editorImg), corner: await cornerText(), aimedAtHasOne: /!\[/.test((await A.stored(page, "page/Pictured Away")) || "") });
  await page.click(S.corner).catch(() => {});   /* the pin read, dismissed as a reader does: a whisper yields to it */
    }],
    ["shortcuts", async () => {
  /* shortcuts: ⌃⌘S with an empty table opens the editor; a table saved; a code typed and Enter inserts at the caret */
  await go("page/Expanded");
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+s");
  await rest(page);
  await log("⌃⌘S, no table yet", await R.shortcuts(page));
  await page.fill(S.shortcutsEditor, "sig: Sean Miller\nmd: markdown");
  await page.click(S.shortcutsSave);
  await rest(page);
  await log("saved", { ...(await R.shortcuts(page)), corner: await R.cornerText(page) });
  await page.click(S.shortcutsInput);
  await page.keyboard.type("m");
  await rest(page);
  await log("m typed", (await R.shortcuts(page)).rows);
  await page.keyboard.press("Enter");
  await rest(page);
  await log("Enter", { card: await R.shortcuts(page), text: await R.editorTextHead(page) });
    }],
    ["bookmarks", async () => {
  /* bookmarks: ⌃⌘B on a day, A adds it, 1 jumps to it from elsewhere, a key given and typed, × deletes */
  await go("2026-09-06");
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await log("⌃⌘B on a day", await R.bookmarks(page));
  await page.keyboard.press("a");
  await rest(page);
  await log("A pressed", await R.bookmarks(page));
  await page.keyboard.press("Escape");
  await go("page/Horace", 5000);
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await page.keyboard.press("1");
  await A.waitEntry(page, "2026-09-06", 5000);
  await log("1 from Horace", { entry: await A.entry(page), card: await R.bookmarks(page) });
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await page.click(S.bookmarkKey);
  await rest(page);
  await page.keyboard.type("fb");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("keyed fb", await R.bookmarks(page));
  await page.keyboard.press("f");
  await rest(page);
  await log("f typed", { lit: await R.bookmarksLit(page) });
  await page.keyboard.press("b");
  await rest(page);
  await log("b typed, already here", { card: await R.bookmarks(page), corner: await R.cornerText(page) });
  /* the same press over a selection: the focus back, the selection as it stood */
  await R.selectBetween(page, "food", "love");
  await rest(page);
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await page.keyboard.type("fb");
  await rest(page);
  await log("fb over a selection, already here", { corner: await R.cornerText(page) });
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await page.click(S.bookmarkDel);
  await rest(page);
  await log("× pressed", await R.bookmarks(page));
  await page.keyboard.press("Escape");
    }],
    ["bookmarks damaged", async () => {
  /* a damaged list (2026-10-01): ⌃⌘B says so and A is refused with its pin; repaired by hand, the next ⌃⌘B shows its rows without a reload — the current app keeps the latch until one — and A lands, releasing the pin; a reload ends the step so neither app carries the pin on, back on the day the next step reads */
  await go("page/Horace", 5000);
  await page.evaluate((k) => localStorage.setItem(k, "not json"), A.bookmarksKey);
  await page.reload();
  await A.waitEntry(page, "page/Horace").catch(() => {});
  await A.waitWarm(page).catch(() => {});
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await log("⌃⌘B over a damaged list", await R.bookmarks(page));
  await page.keyboard.press("a");
  await rest(page);
  await log("A over a damaged list", { card: await R.bookmarks(page), corner: await R.cornerText(page), stored: await page.evaluate((k) => localStorage.getItem(k), A.bookmarksKey) });
  await page.keyboard.press("Escape");
  await page.evaluate((k) => localStorage.setItem(k, '["2026-09-06"]'), A.bookmarksKey);
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await log("⌃⌘B over the list repaired", await R.bookmarks(page));
  await page.keyboard.press("a");
  await rest(page);
  await log("A over the list repaired", { card: await R.bookmarks(page), corner: await R.cornerText(page) });
  await page.keyboard.press("Escape");
  await page.reload();
  await A.waitEntry(page, "page/Horace").catch(() => {});
  await A.waitWarm(page).catch(() => {});
  await go("2026-09-06");
    }],
    ["backups", async () => {
  /* the backups panel: the button opens the card; unconfigured, the setup button alone; Escape closes */
  await page.click(S.backupsButton);
  await rest(page);
  await log("backups", await R.backups(page));
  await page.keyboard.press("Escape");
  await log("Escape", { card: await R.backupsOpen(page) });
    }],
    ["help", async () => {
  /* help: ⌃⌘H opens the card over the entry and closes the pages panel; Escape closes it */
  await page.click(S.pagesOpener);
  await page.keyboard.press("Control+Meta+h");
  await rest(page);
  await log("⌃⌘H over an open pages panel", await R.help(page));
  await page.keyboard.press("Escape");
  await log("Escape", await R.helpOpen(page));
    }],
    ["line bar", async () => {
  /* ⌃⌘G: the bar over verse takes a line, cycles nothing on one block, marks and centres; Escape hands the caret to the row; over a book of leaves the Page box */
  await go("page/Horace");
  await R.settle(page);
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  await log("⌃⌘G over Horace", await R.linebar(page));
  await page.keyboard.type("3");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("3, Enter", await R.linebar(page));
  await page.keyboard.press("Enter");
  await rest(page);
  await log("Enter again on one block", await R.linebar(page));
  await page.keyboard.press("Escape");
  await rest(page);
  await log("Escape", { ...(await R.linebar(page)), caretRow: await R.caretRow(page) });
  await go("page/Williams/Witchcraft%203");
  await R.settle(page);
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  await log("⌃⌘G over Witchcraft", await R.linebar(page));
  await page.keyboard.type("9z");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("9z, Enter", await R.linebar(page));
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("61");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("61, Enter", await R.linebar(page));
  await page.keyboard.press("Escape");
    }],
    ["reference paste", async () => {
  /* a reference pasted as plain text into the rendered view renders as its markdown */
  await go("page/Pasted");
  await page.click(S.editor);
  await R.pasteText(page, "[*Gesta*, 7 September 2026](#2026-09-07?h=blind%20cord):\n\n> blind cord");
  await rest(page);
  await log("a reference pasted", { md: await A.stored(page), ...(await R.pastedReference(page)) });
  await R.pasteText(page, "[*Gesta*](#2026-09-06?h=food%20of%20love)");
  await rest(page);
  await page.click(S.editorLink("#2026-09-06?h=food%20of%20love"));
  await R.waitEntryAndSelection(page, "2026-09-06", "food of love");
  await rest(page);
  await log("the reference link followed", await R.highlightFollowed(page));
  /* the link's passage is deep in a long entry: the jump must SCROLL to it,
     not only select it — the one-line case above never needed a scroll,
     and the jump landed at the top of Paradise Lost (found by hand
     2026-09-12); the bar stays off, the passage is to be read in context */
  await go("page/Pasted");
  await page.click(S.editor);
  await R.pasteText(page, "[*Pippa*](#bookshelf/Browning%2C%20Robert/Pippa%20Passes?h=Power%20shall%20fall%20short%20in%20or%20exceed)");
  await rest(page);
  await page.click(S.editorLink("#bookshelf/Browning%2C%20Robert/Pippa%20Passes?h=Power%20shall%20fall%20short%20in%20or%20exceed"));
  await R.waitEntryAndSelection(page, "bookshelf/Browning, Robert/Pippa Passes", "Power shall fall short in or exceed");
  await rest(page);
  await log("a link deep into a long entry followed", await R.highlightFollowed(page));
  /* a paired reference is a fence inside the quotation (2026-09-12): its
     pair stands where a quoted paragraph's text does, its cells unwrapped */
  await go("page/Pasted Pair");
  await page.click(S.editor);
  await R.pasteText(page, "[*Milton*](#2026-09-07?h=mind):\n\n> The mind is its own place\n\n[*Horace*](#page/Horace?h=intemptata):\n\n> ::: verse 13\n> intemptata nites. Me tabula sacer | you shine untested. As for me, a holy\n> votiva paries indicat uvida | wall with a votive table shows that I\n> suspendisse potenti | have hung up my still dripping clothes\n> vestimenta maris deo. | to the deity who rules the sea.\n> :::");
  await page.waitForTimeout(700);
  await log("a paired reference pasted", await R.quotedPair(page));
  /* the grow side: a longer English half typed into the quoted pair widens the entry under the caret rather than wrapping (short of the 1000px window's cap, where a wrap is the cap's — measured 2026-09-12 with a longer phrase). READ WITHIN 400ms OF THE KEYS: a reading at 700ms proved nothing about the grow (the 2026-09-12 confirmation pass); the settled reading follows it */
  const pasted = await R.quotedPair(page);
  await R.caretAfter(page, "rules the sea.", 14);
  await page.keyboard.type(" and every creature in it");
  const grew = await R.waitPairGrew(page, pasted.cols, 400, "every creature in it");   /* the whole phrase present, the row grown AND unwrapped: the first column change is an early keystroke's, and a read then caught the row mid-fit, twice (verify, 2026-09-12) */
  await log("typed into the quoted pair", { grew, ...(await R.quotedPair(page)) });
  await page.waitForTimeout(600);
  await log("typed into the quoted pair, settled", await R.quotedPair(page));
    }],
    ["toolbar", async () => {
  /* the toolbar: a double-click selects a word and floats the bar; B bolds it; Tag moves it out */
  await go("2026-09-06");
  await wheelTo(0);
  const word = await R.wordAt(page, "music", 5);
  await page.mouse.dblclick(word.x, word.y);
  await R.waitBar(page);
  await rest(page);   /* the editor's own selection lands a beat after the DOM's */
  await log("a word double-clicked", await R.bar(page));
  await page.click(S.fmtB);
  await rest(page);
  await log("B clicked", { ...(await R.bar(page)), md: (await A.stored(page)).includes("**music**") });
  answer = "Music";
  await page.click(S.fmtTag);
  await A.waitEntry(page, "2026-09-06/Music", 5000);
  await log("Tag with Music answered", { entry: await A.entry(page), body: await A.stored(page) });
  await go("2026-09-06", 5000);
  await log("the day's text around the link", await R.textAroundLink(page, "#2026-09-06/Music"));
  answer = null;
    }],
    ["source view", async () => {
  /* the source view: ⌃⌘M over the day, the caret carried across by its count, an edit in the source landing */
  await go("2026-09-06");
  /* the editor reads the DOM selection when the browser's selectionchange
     reaches it: waited for, not a fixed beat — a 100 ms beat left the caret
     at the top on one run in three, and again under a busy machine */
  /* and only while the editor holds focus, and not in the beat after it set
     the selection itself, when it puts its own back: under a busy machine
     the caret was carried from the top with "food of love" selected on
     screen, so it is placed until it stays */
  await page.waitForFunction((ed) => document.querySelector(ed)?.contains(document.activeElement), S.editor, { timeout: 2000 }).catch(() => {});
  for (let tries = 0; tries < 3; tries++) {
    await page.evaluate(() => { window.__selSeen = false; document.addEventListener("selectionchange", () => { window.__selSeen = true; }, { once: true }); });
    await R.caretBefore(page, "food of love");
    await page.waitForFunction(() => window.__selSeen, null, { timeout: 2000 }).catch(() => {});
    await rest(page);
    await rest(page);
    if (await page.evaluate(() => { const s = document.getSelection(); return !!s.anchorNode?.textContent.slice(s.anchorOffset).startsWith("food of love"); })) break;
  }
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 });
  await log("⌃⌘M", await R.sourceView(page, await A.stored(page)));
  await page.keyboard.type("FOOD ");
  await page.keyboard.press("Tab");
  await R.waitCorner(page, "saved");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 });
  await log("⌃⌘M back", await R.sourceBack(page));
  /* the caret moved in the source without an edit: back, it stands where it was moved to, not where it came from */
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await R.sourceCaretTo(page, "play on");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await rest(page);
  await log("the caret moved in the source, ⌃⌘M back", await R.sourceBack(page));
  await wheelTo(0);
  await page.click(S.editorFirst);
  await rest(page);   /* the click's caret is read a beat later, as the section's first caret is: a chord at once switched with the caret before the click */
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await rest(page);
  await log("⌃⌘M from the top", { y: await winY() });
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await page.click(S.editorFirst);
  await wheelTo(600);
  const away = await winY();
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await rest(page);
  /* within two lines, not to the top or to the caret: the switch carries the text at the window's top, and the pixel offset follows the other view's layout */
  await log("⌃⌘M scrolled away from the caret", { stayed: Math.abs((await winY()) - away) < 60 });
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await rest(page);
  await log("⌃⌘M back, still scrolled away", { stayed: Math.abs((await winY()) - away) < 60 });
  await page.keyboard.press("Control+Meta+w");
  await rest(page);
  await log("⌃⌘W rendered", { corner: await cornerText() });
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await page.keyboard.press("Control+Meta+w");
  await rest(page);
  await log("⌃⌘W in the source view", { corner: await cornerText() });
  /* the search row closed in the source view: the keys go back to the text */
  await page.keyboard.press("Control+Meta+k");
  await rest(page);
  await page.keyboard.press("Escape");
  await rest(page);
  await log("⌃⌘K, then Escape, in the source view", {});
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
    }],
    ["go to", async () => {
  /* the Go to row: ⌃⌘J on a day, a year pick refilling the months, a day pick navigating; on a book, the chain and the sentinel */
  await go("2026-09-06");
  await page.keyboard.press("Control+Meta+j");
  await rest(page);
  await log("⌃⌘J on a day", await R.goto(page));
  await page.selectOption(S.gotoDay, "05");
  await A.waitEntry(page, "2026-09-05", 5000);
  await log("a day picked", { entry: await A.entry(page), open: await R.gotoOpen(page) });
  await go("bookshelf/Browning,%20Robert/Pippa%20Passes");
  await page.keyboard.press("Control+Meta+j");
  await rest(page);
  await log("⌃⌘J on a book", await R.goto(page));
  await page.selectOption(S.gotoDestination, "");
  await rest(page);
  await log("Journal picked from the book", (await R.goto(page)).selects);
  await page.keyboard.press("Escape");
  await log("Escape", await R.goto(page));
    }],
    ["sub-entries", async () => {
  /* the sub-entries: the dialogs answered by the harness (declared above) */
  await go("2026-09-06");
  await log("the masthead over the day after the rows closed", await R.rowsClosed(page));
  /* the link goes in at the caret: the click's caret is the editor's only
     once its selectionchange has reached it. ⌘↓ takes it to the body's end;
     End moves no caret on a Mac, and the click alone left it mid-heading,
     the link splitting a word, once the heading ran past the click's point */
  await page.evaluate(() => { window.__selSeen = false; document.addEventListener("selectionchange", () => { window.__selSeen = true; }, { once: true }); });
  await page.click(S.editorFirst);
  await page.waitForFunction(() => window.__selSeen, null, { timeout: 2000 }).catch(() => {});
  await page.keyboard.press("Meta+ArrowDown");
  await rest(page);
  await log("a day's tools", await R.tools(page));
  answer = "Ideas";
  await A.act.create(page);
  await A.waitEntry(page, "2026-09-06/Ideas", 5000);
  const onLeaf = await A.act.createOnLeaf(page);
  await log("⌃⌘N on the tagged entry", onLeaf || await R.corner(page));
  await log("⌃⌘N, Ideas typed", { entry: await A.entry(page), crumb: await R.crumb(page), tools: await R.tools(page) });
  await go("2026-09-06", 5000);
  await log("the day's body ends with the link, its tag bar lists it", { link: await R.lastLink(page), tags: await R.tags(page) });
  await page.click(S.tagbarLink("#2026-09-06/Ideas"));
  await A.waitEntry(page, "2026-09-06/Ideas", 5000);
  answer = "Plans";
  await page.click(S.renameButton);
  await A.waitEntry(page, "2026-09-06/Plans", 5000);
  await rest(page);
  await log("renamed to Plans", { entry: await A.entry(page), hash: page.url().split("#")[1], hostLink: /\[Plans\]\(#2026-09-06\/Plans\)/.test(await A.stored(page, "2026-09-06")) });
  await page.goto(A.url("2026-09-06"));
  await R.waitLink(page, "#2026-09-06/Plans");
  await log("the host's link followed", await R.lastLink(page));
  await page.click(S.tagbarLink("#2026-09-06/Plans"));
  await A.waitEntry(page, "2026-09-06/Plans", 5000);
  await page.click(S.deleteButton);
  await R.waitLinkGone(page, "#2026-09-06/Plans");
  await log("deleted: back on the day, its link gone, the other tag left", { entry: await A.entry(page), links: await R.links(page), tags: await R.tags(page) });
  answer = null;
    }],
    ["list", async () => {
  await go("page/Brand%20New");
  await page.click(S.editor);
  await page.keyboard.type("- one");
  await page.keyboard.press("Enter");
  await page.keyboard.type("two");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await page.keyboard.type("three");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await rest(page);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("```");
  await page.keyboard.press("Enter");
  await page.keyboard.type("code line");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("after the block");
  await rest(page);
  await log("a code block typed, Enter twice out of it", { md: await A.stored(page) });
  await log("a list typed: bullet, Enter, Tab, Enter, Shift-Tab twice", { md: await A.stored(page), ...(await R.corner(page)) });
  await log("the gap between the two outer items, and a line's height", await R.listGaps(page));
    }],
    ["search", async () => {
  await go("page/Links");
  await page.keyboard.press("Control+Meta+k");
  await rest(page);
  await log("⌃⌘K", await R.search(page));
  await page.selectOption(S.searchScope, { label: "Everything" });
  await page.keyboard.type("sister");
  await R.waitSearchRows(page);
  await log("typed sister", await R.search(page));
  await page.keyboard.press("ArrowDown");
  await log("after ↓", (await R.search(page)).rows.filter((r) => r.includes("active")));
  await page.keyboard.press("Enter");
  await R.waitSelection(page, "sister");
  await log("Enter", { entry: await A.entry(page), selected: await R.selectionText(page), open: await R.searchOpen(page) });
  await page.keyboard.press("Control+Meta+k");
  await rest(page);
  await page.selectOption(S.searchScope, { label: "Journal" });
  await page.keyboard.type("blackamoor");
  await R.waitSearchRows(page);
  await page.keyboard.press("Enter");
  await R.waitSelection(page, "blackamoor");
  await log("a jump to a hit in the entry already open", { entry: await A.entry(page), selected: await R.selectionText(page), open: await R.searchOpen(page) });
    }],
    ["walk", async () => {
  /* the walk over a book whose index alternates prose and verse follows the index, not the alphabet */
  await go("bookshelf/Boethius/Consolatio/3pr1");
  await page.keyboard.press("Control+Meta+.");
  await R.waitEntryNot(page, "bookshelf/Boethius/Consolatio/3pr1");
  await rest(page);   /* a selection left on the last entry keeps the bar up one frame into this one (MEASURED, 10 ms) */
  await log("⌃⌘. from 3pr1 over an index of 3pr1, 3m1, 3pr2", { entry: await A.entry(page) });
  await page.keyboard.press("Control+Meta+.");
  await A.waitEntry(page, "bookshelf/Boethius/Consolatio/3pr2", 5000).catch(() => {});
  await log("⌃⌘. again", { entry: await A.entry(page) });
  await page.keyboard.press("Control+Meta+,");
  await A.waitEntry(page, "bookshelf/Boethius/Consolatio/3m1", 5000).catch(() => {});
  await log("⌃⌘, back", { entry: await A.entry(page) });
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await page.keyboard.press("Control+Meta+.");
  await A.waitEntry(page, "bookshelf/Boethius/Consolatio/3pr2", 5000).catch(() => {});
  await rest(page);
  await log("⌃⌘M, then ⌃⌘.", { entry: await A.entry(page), source: await R.inSource(page) });
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
    }],
    ["stanza", async () => {
  /* the Faerie Queene's stanzas (2026-09-28, successor-only): a work whose page says `roman book and canto`, each stanza a `::: stanza N` fence — the number drawn in its own column at every interval, the crumb respelled, ⌃⌘R across a stanza gap referring to I.i.1.3–2.1 and quoting both, ⌃⌘G taking stanza.line */
  await A.seedStanza(page, STANZA_SEEDS);
  await go("bookshelf/Spenser%2C%20Edmund/The%20Faerie%20Queene/1.1");
  await R.settle(page);
  await log("a canto opened", { ...(await R.stanzas(page)), crumb: (await R.masthead(page)).crumb, title: (await R.masthead(page)).title });
  await R.selectBetween(page, "bloudie Crosse", "bloudie Crosse");
  await R.waitBar(page);
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
  await log("⌃⌘R on a line", { lines: await R.clipboardLines(page) });
  await R.selectBetween(page, "deepe wounds", "bloudie Crosse");
  await R.waitBar(page);
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
  await log("⌃⌘R across a stanza gap", { lines: await R.clipboardLines(page) });
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  await page.keyboard.type("2.1");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("⌃⌘G 2.1", { ...(await R.linebar(page)), landedText: await R.landedText(page) });
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("2.9");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("⌃⌘G 2.9", await R.linebar(page));
  await page.keyboard.press("Escape");
    }],
    ["a blank row", async () => {
  /* a blank row between stanzas is an empty line (2026-10-16): clicked, the caret drawn on it, no box and no bar, and not drawn once the search row has the focus; typed into, it becomes the line typed, a quotation mark curled as in any line; Backspace takes it out, the caret at the end of the line above */
  await go("2026-09-06");
  await R.settle(page);
  /* the locator's click, which waits for the row to stop moving: an arrival's
     restored place scrolled it between a position read and a click */
  const clickBlank = async () => { const g = page.locator(S.editor + " .vgap").first(); const b = await g.boundingBox(); await g.click({ position: { x: 60, y: b.height / 2 } }); await rest(page); };
  await clickBlank();
  await log("a blank row clicked", await R.blankRow(page));
  await searchFor(page, "");
  await rest(page);
  await log("the search row opened over it", await R.blankRow(page));
  await page.keyboard.press("Escape");
  await rest(page);
  await clickBlank();
  await page.keyboard.press("Backspace");
  await rest(page);
  await log("Backspace on the blank row", await R.blankRow(page));
  await page.keyboard.press("Meta+z");
  await rest(page);
  await clickBlank();
  await page.keyboard.type("x");
  await rest(page);
  await log("x typed on the blank row", await R.blankRow(page));
  await page.keyboard.press("Meta+z");
  await rest(page);
  await clickBlank();
  await page.keyboard.type("\"");
  await rest(page);
  await log("a quotation mark typed on the blank row", await R.blankRow(page));
  await page.keyboard.press("Meta+z");
  await rest(page);
    }],
    ["the switch carries the text", async () => {
  /* ⌃⌘M carries the TEXT at the window's top across the switch, not its pixel offset: a long canto switched at its middle and at its end */
  const canto = Array.from({ length: 40 }, (_, k) => "::: stanza " + (k + 1) + "\n" + Array.from({ length: 9 }, (_, j) => "Stanza " + (k + 1) + ", line " + (j + 1) + ", set down to fill the measure").join("\n") + "\n:::").join("\n\n") + "\n";
  await go("page/Long%20Canto");
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await R.setSource(page, canto);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(600);
  await wheelTo(0);
  await page.click(S.editorFirst);
  for (const [label, where] of [["a long canto switched at its middle", 0.5], ["a long canto switched at its end", 1]]) {
    await wheelTo(Math.round((await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)) * where));
    const rendered = await R.topStanza(page), renderedEnd = await R.lastStanzaShowing(page);
    await page.keyboard.press("Control+Meta+m");
    await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
    await rest(page);
    const source = await R.topStanza(page), sourceEnd = await R.lastStanzaShowing(page);
    await page.keyboard.press("Control+Meta+m");
    await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
    await rest(page);
    /* at the end the source, the shorter, stops at its own foot: the last stanza showing in both, not one stanza at both tops */
    await log(label, where < 1 ? { rendered, source, back: await R.topStanza(page) } : { rendered: renderedEnd, source: sourceEnd, back: await R.lastStanzaShowing(page) });
    if (where < 1) {
      await log("the switch's place remembered", { matches: await page.evaluate((k) => { try { const r = JSON.parse(localStorage.getItem(k) || "[]").find((x) => x.key === "page/Long Canto"); return !!r && Math.abs(r.y - scrollY) < 3; } catch { return null; } }, A.ns + "places") });
      /* the page grows above the text just set, as a picture resolving does: the switch's place is held like an arrival's */
      await page.evaluate((s) => { document.querySelector(s).style.paddingTop = "400px"; }, S.editor);
      await rest(page);
      await log("⌃⌘M back, then 400px grown above", { top: await R.topStanza(page) });
      await page.evaluate((s) => { document.querySelector(s).style.paddingTop = ""; }, S.editor);
      await rest(page);
    }
  }
  await wheelTo(20);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await rest(page);
  const nearTop = await winY();
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await rest(page);
  await log("⌃⌘M from 20px down", { source: nearTop, back: await winY() });
  /* a caret placed low in the source's window, then back: it is still in view */
  await wheelTo(Math.round((await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)) / 2));
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await rest(page);
  await page.mouse.click(400, (await page.evaluate(() => innerHeight)) - 30);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);
  await log("a caret seen in the source, ⌃⌘M back", { caretInView: await page.evaluate(() => { const s = getSelection(); if (!s.rangeCount) return null; const r = s.getRangeAt(0).getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }) });
    }],
    ["contents folds", async () => {
  /* a work's contents folding under its headings (2026-09-28, successor-only): the stanza step's Faerie Queene seeds its contents page with a `##` Book heading over a canto link — closed on arrival with its count, opened by the triangle in the margin, remembered with the link followed from it on the way back */
  await go("bookshelf/Spenser%2C%20Edmund/The%20Faerie%20Queene");
  await R.settle(page);
  await log("a contents page opened", await R.folds(page));
  await R.clickFoldTriangle(page, "Book I");
  await log("the triangle clicked", await R.folds(page));
  await page.click(S.editorLink("#bookshelf/Spenser%2C%20Edmund/The%20Faerie%20Queene/1.1")).catch(() => {});
  await A.waitEntry(page, "bookshelf/Spenser, Edmund/The Faerie Queene/1.1", 5000).catch(() => {});
  await log("its canto followed", { entry: await A.entry(page) });
  await wheelTo(0);
  await go("bookshelf/Spenser%2C%20Edmund/The%20Faerie%20Queene");
  await rest(page);
  await log("back on the contents", await R.folds(page));
    }],
    ["places", async () => {
  /* every entry returns to where it was left (2026-09-28, successor-only): Pippa scrolled down and left to settle, Horace followed, then Back, Forward, Back and a reload — the browser's own restore on Back and Forward ran against the entry being left and saved the other's offset for it (the review at high, 2026-09-28) */
  const pippa = "bookshelf/Browning, Robert/Pippa Passes";
  await go("bookshelf/Browning%2C%20Robert/Pippa%20Passes");
  await wheelTo(1200);
  await page.waitForTimeout(700);
  await log("Pippa scrolled down", await R.place(page));
  await go("page/Horace");
  await rest(page);
  await log("Horace followed", await R.place(page));
  await page.goBack();
  await A.waitEntry(page, pippa, 5000).catch(() => {});
  await rest(page);
  await log("Back", await R.place(page));
  await page.goForward();
  await A.waitEntry(page, "page/Horace", 5000).catch(() => {});
  await rest(page);
  await log("Forward", await R.place(page));
  await page.goBack();
  await A.waitEntry(page, pippa, 5000).catch(() => {});
  await rest(page);
  await log("Back again", await R.place(page));
  await page.reload();
  await A.waitEntry(page, pippa).catch(() => {});
  await A.waitWarm(page).catch(() => {});
  await rest(page);
  await log("reloaded", await R.place(page));
  await page.evaluate((s) => { document.querySelector(s).style.paddingTop = "400px"; }, S.editor);   /* the page grows above the held place, as a picture resolving does */
  await rest(page);
  await log("400px grown above the held place", await R.place(page));
  await page.waitForTimeout(500);
  await go("page/Horace");
  await go("bookshelf/Browning%2C%20Robert/Pippa%20Passes");
  await rest(page);
  await log("Pippa after the growth", await R.place(page));
  /* a place inside a section closed on the way back: Consolatio grown to six Books, left in Book 5, its fold state forgotten, returned to */
  let consolatio = "# De consolatione philosophiae\n\n";
  for (let b = 1; b <= 6; b++) { consolatio += "## Book " + b + "\n\n- [3pr1](#bookshelf/Boethius/Consolatio/3pr1)\n\n"; for (let i = 1; i <= 6; i++) consolatio += "Filler " + b + "." + i + " " + "words to fill a line of the page out ".repeat(6) + "\n\n"; }
  await go("bookshelf/Boethius/Consolatio");
  await page.click(S.editor);
  await page.keyboard.press("Meta+a");
  await R.pasteText(page, consolatio);
  await page.waitForTimeout(900);
  for (let b = 1; b <= 6; b++) await R.clickFoldTriangle(page, "Book " + b);
  const toFiller = await page.evaluate((s) => { const p = [...document.querySelectorAll(s + " p")].find((x) => x.textContent.startsWith("Filler 5.4")); return p ? Math.round(p.getBoundingClientRect().top - (document.querySelector(".site-head")?.getBoundingClientRect().bottom || 0) - 4) : 0; }, S.editor);
  await page.mouse.move(500, 400);
  await page.mouse.wheel(0, toFiller);
  await page.waitForTimeout(700);
  await go("page/Horace");
  await page.evaluate((k) => { try { localStorage.removeItem(k); } catch { /* none */ } }, A.ns + "folds");
  await go("bookshelf/Boethius/Consolatio");
  await rest(page);
  await log("back to a place in a closed section", { open: (await R.folds(page)).open, fillerInView: await inView("Filler 5.4") });
  /* the same page reloaded with the warm held back: drawn unfolded from its one row, then folded when the warm lands, the place set again */
  await page.goto(A.url("bookshelf/Boethius/Consolatio", "warm=slow"));
  await A.waitEntry(page, "bookshelf/Boethius/Consolatio", 5000).catch(() => {});
  await rest(page);
  await log("before the warm", { folds: (await R.folds(page)).folds, fillerInView: await inView("Filler 5.4") });
  await A.waitWarm(page).catch(() => {});
  await rest(page);
  await log("the warm landed", { folds: (await R.folds(page)).folds, open: (await R.folds(page)).open, fillerInView: await inView("Filler 5.4") });
  await page.goto(A.url("bookshelf/Boethius/Consolatio", "warm=slow"));
  await A.waitEntry(page, "bookshelf/Boethius/Consolatio", 5000).catch(() => {});
  /* Book 5's link, beside the held place: Book 1's lies far above it, and the held place moved the page under the click */
  await page.locator(S.editorLink("#bookshelf/Boethius/Consolatio/3pr1")).nth(4).click().catch(() => {});
  await A.waitEntry(page, "bookshelf/Boethius/Consolatio/3pr1", 5000).catch(() => {});
  await log("a contents link clicked before the warm", { entry: await A.entry(page), refused: /no such/.test(await cornerText()) });
  await A.waitWarm(page).catch(() => {});
  /* the source read down to text a closed section hides, then back to the rendered view: the section opens */
  await go("bookshelf/Boethius/Consolatio");
  await rest(page);
  for (const b of (await R.folds(page)).open) await R.clickFoldTriangle(page, b.trim().split(":")[0]);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await R.sourceScrollTo(page, "Filler 3.4");
  await rest(page);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);
  await log("a closed section's text switched to", { open: (await R.folds(page)).open, fillerInView: await inView("Filler 3.4") });
  /* a forced entry: refused on the open path, scrolled, left and returned to */
  await go("page/Forced%20Long");
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await R.setSource(page, Array.from({ length: 90 }, (_, i) => "Line " + (i + 1) + " of a long refused entry.").join("\n\n") + "\n\n::: grid\n::: card-light-blue\nalpha\n:::\nloose\n:::\n");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForTimeout(400);
  for (let i = 0; i < 12 && !((await A.stored(page, "page/Forced Long")) || "").includes("loose"); i++);
  await go("page/Horace");
  if (await R.inSource(page)) { await page.keyboard.press("Control+Meta+m"); await rest(page); }
  await go("page/Forced%20Long");
  await rest(page);
  await wheelTo(900);
  const leftAt = await winY();
  await page.waitForTimeout(700);
  await go("page/Horace");
  await go("page/Forced%20Long");
  await rest(page);
  await log("a forced entry left scrolled, returned to", { source: await R.inSource(page), stayed: Math.abs((await winY()) - leftAt) < 3 });
  /* the masthead changing height under a held place, as it does when the
     entry arrived from had a taller one: the place is set again, in the
     source view by its offset and in the rendered one by its text */
  const shrunk = async (fn) => {
    await page.evaluate(() => { const h = document.querySelector(".site-head"); h.style.maxHeight = "50px"; h.style.overflow = "hidden"; });
    try { await rest(page); return await fn(); }
    finally { await page.evaluate(() => { const h = document.querySelector(".site-head"); h.style.maxHeight = ""; h.style.overflow = ""; }); await rest(page); }
  };
  await log("a held place, the masthead shrinking under it", await shrunk(async () => ({ stayed: Math.abs((await winY()) - leftAt) < 3 })));
  await go("page/Horace");
  if (await R.inSource(page)) { await page.keyboard.press("Control+Meta+m"); await rest(page); }
  await go("bookshelf/Browning%2C%20Robert/Pippa%20Passes");
  await rest(page);
  await wheelTo(2600);
  await page.waitForTimeout(700);
  await go("page/Horace");
  await go("bookshelf/Browning%2C%20Robert/Pippa%20Passes");
  await rest(page);
  /* the row under the masthead, read mid-column: 40px in is the gutter */
  const rowUnderHead = () => page.evaluate(() => { const top = (document.querySelector(".site-head")?.getBoundingClientRect().bottom || 0) + 6; const box = document.querySelector("#editor .ProseMirror").getBoundingClientRect(); const el = document.elementFromPoint(box.left + box.width / 2, top); return (el?.closest(".vrow, p, li, h1, h2, h3") || el)?.textContent.trim().slice(0, 32) || null; });
  const heldLine = await rowUnderHead();
  await log("a held place in the rendered view, the masthead shrinking under it", await shrunk(async () => { const line = await rowUnderHead(); return { sameText: line === heldLine, line }; }));
  /* a scroll the page did not make and no hand did — the browser's find —
     is the reader moving: the hold lets go */
  await page.evaluate(() => window.scrollTo(0, window.scrollY + 400));
  await page.waitForTimeout(500);
  const foundLine = await rowUnderHead();
  /* then the editor grows below, as a picture loading does */
  await page.evaluate(() => { document.querySelector("#editor .ProseMirror").style.paddingBottom = "300px"; });
  await rest(page);
  const afterGrow = await rowUnderHead();
  await page.evaluate(() => { document.querySelector("#editor .ProseMirror").style.paddingBottom = ""; });
  await log("a held place, then a scroll no hand made", { kept: afterGrow === foundLine, line: afterGrow });
  await go("page/Horace");
  if (await R.inSource(page)) { await page.keyboard.press("Control+Meta+m"); await rest(page); }
  /* a place held on lines that open on inline code, one paragraph so the window's top always falls on text: the caret at the line's start, the code run no stop on the way */
  await go("page/Coded%20Lines");
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await R.setSource(page, Array.from({ length: 60 }, (_, i) => "I `go` and the sea, line " + (i + 1) + ".").join("\n"));
  await page.keyboard.press("Control+Meta+m");
  await page.waitForTimeout(1500);
  await wheelTo(1200);
  await page.waitForTimeout(700);
  await go("page/Horace");
  await go("page/Coded%20Lines");
  await rest(page);
  await log("back to lines opening on inline code", { source: await R.inSource(page) });
  /* a place held in the source mid-way down one long paragraph, the entry forced into the source by a stray line in a grid (another entry otherwise opens rendered): the caret on the line on screen, so a key typed leaves the window where it is */
  await go("page/Long%20Paragraph");
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await R.setSource(page, Array.from({ length: 300 }, (_, i) => "Sentence " + (i + 1) + " of one long paragraph.").join(" ") + "\n\n::: grid\n::: card-light-blue\nalpha\n:::\nloose\n:::\n");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForTimeout(1500);
  await wheelTo(1200);
  await page.waitForTimeout(700);
  await go("page/Horace");
  await go("page/Long%20Paragraph");
  await rest(page);
  const before = await winY();
  /* the caret's line on screen, from a twin of the textarea: a markdown line's start is a paragraph's, and a held index unmoved stands mid-line, neither shown by "stayed" alone */
  const onScreenStart = await page.evaluate((src) => {
    const ta = document.querySelector(src); if (!ta) return null;
    const cs = getComputedStyle(ta), d = document.createElement("div");
    for (const k of ["fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight", "letterSpacing", "wordSpacing", "paddingLeft", "paddingRight", "borderLeftWidth", "borderRightWidth", "boxSizing", "tabSize"]) d.style[k] = cs[k];
    Object.assign(d.style, { position: "absolute", visibility: "hidden", left: "-9999px", top: "0", whiteSpace: "pre-wrap", overflowWrap: "break-word", width: ta.getBoundingClientRect().width + "px" });
    const t = d.appendChild(document.createTextNode(ta.value + "\u200b")); document.body.append(d);
    const top = (k) => { const r = document.createRange(); r.setStart(t, k); r.setEnd(t, k + 1); return r.getBoundingClientRect().top; };
    const i = ta.selectionStart, at = i === 0 || top(i - 1) < top(i) - 2;
    d.remove(); return at;
  }, S.source);
  await page.keyboard.type("Z");
  await rest(page);
  await log("typed at the place in a long paragraph's source", { source: await R.inSource(page), lineOnScreen: onScreenStart, stayed: Math.abs((await winY()) - before) < 3 });
    }],
    ["entries left and renamed", async () => {
  /* what leaving, renaming and deleting do to an entry, a clipboard that refuses, and a page whose site data is blocked */
  await go("page/Never%20Typed");
  await go("page/Horace");
  await log("an unknown page visited and left untouched", { stored: (await A.stored(page, "page/Never Typed")) ?? null });
  await go("2026-09-05");
  answer = "Long";
  await A.act.create(page);
  await A.waitEntry(page, "2026-09-05/Long", 5000).catch(() => {});
  await page.click(S.editor);
  await R.pasteText(page, Array.from({ length: 80 }, (_, i) => "Line " + (i + 1) + " of a long entry.").join("\n\n"));
  await R.waitCorner(page, "saved");
  await wheelTo(900);
  await page.waitForTimeout(700);
  const before = await winY();
  answer = "Longer";
  await page.click(S.renameButton);
  await A.waitEntry(page, "2026-09-05/Longer", 5000).catch(() => {});
  await rest(page);
  await log("a long entry renamed, scrolled", { entry: await A.entry(page), stayed: Math.abs((await winY()) - before) < 3 });
  await wheelTo(600);
  await page.waitForTimeout(700);
  await page.click(S.deleteButton);
  await A.waitEntry(page, "2026-09-05", 5000).catch(() => {});
  await rest(page);
  await log("deleted scrolled: its place dropped", { entry: await A.entry(page), placeKept: await page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) || "[]").some((r) => r.key === "2026-09-05/Longer"); } catch { return null; } }, A.ns + "places") });
  answer = null;
  await page.evaluate(() => { const c = navigator.clipboard; window.__clip = [c.write, c.writeText, document.execCommand]; c.write = () => Promise.reject(new Error("refused")); c.writeText = () => Promise.reject(new Error("refused")); document.execCommand = () => false; });
  await page.keyboard.press("Control+Meta+c");
  await rest(page);
  await log("⌃⌘C with the clipboard refused", { corner: await cornerText() });
  await page.evaluate(() => { const c = navigator.clipboard, [a, b, x] = window.__clip; c.write = a; c.writeText = b; document.execCommand = x; });
  await page.keyboard.press("Control+Meta+c");
  await rest(page);
  await log("⌃⌘C again, the clipboard back", { corner: await cornerText() });
  const blocked = await ctx.newPage();
  await blocked.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new DOMException("site data blocked", "SecurityError"); } }); });
  await blocked.goto(A.url("page/Horace"));
  await A.waitEntry(blocked, "page/Horace", 8000).catch(() => {});
  /* localStorage alone refused: the profile's IndexedDB still answers, so the store's own failure path is not what this reads */
  await log("a page opened with localStorage refused", { entry: (await A.entry(blocked)) ?? null, blockedScreen: ((await A.screen(blocked).catch(() => "")) || "").split(" · corner")[0] });
  await blocked.close();
    }],
    ["margin-note", async () => {
  /* a margin-note set in the left margin beside the line after it (2026-09-29, successor-only): 15em in a 1500px window, pushed below a two-line margin-note a line above it, back in the text at the tools' 1000px; the caret typed into it at both widths */
  await A.seedMargin(page, MARGIN_SEEDS);
  await page.setViewportSize({ width: 1500, height: 900 });
  await go("bookshelf/Donne%2C%20John/Anniversaries/The%20First%20Anniversarie");
  await R.settle(page);
  await log("margin-notes in verse at 1500px", await R.margins(page));
  await R.clickMargin(page, "What life");
  await page.keyboard.type(" X");
  await log("typed into a margin-note in the margin", { lines: ((await A.stored(page)) || "").split("\n").filter((l) => /X/.test(l)) });
  await page.setViewportSize({ width: 1000, height: 600 });
  await rest(page);
  await page.keyboard.type("Y");
  await log("narrowed to 1000px, typed on", { ...(await R.margins(page)), lines: ((await A.stored(page)) || "").split("\n").filter((l) => /X/.test(l)) });
  await page.setViewportSize({ width: 1500, height: 900 });
  await go("page/Margins");
  await R.settle(page);
  await log("margin-notes between paragraphs and in a grid at 1500px", await R.margins(page));
  await page.setViewportSize({ width: 1000, height: 600 });
    }],
    ["footnote marks", async () => {
  /* a footnote mark, a space and superscript digits after a word, is no break in a phrase search (2026-10-01): "Pedenteria in comparison" finds "Pedenteria ¹ in comparison", and Enter selects it, the mark inside; "m²" stays text */
  await go("page/Footnoted");
  /* the box holding the whole query (it keeps the last one while the entry stays open, so a new one is typed over ⌘A), then the scan's pause: a row from the query before can stand until it runs */
  const searched = async (q) => { await page.waitForFunction((q) => document.querySelector(".page-search input")?.value === q, q, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(400); };
  await page.click(S.editor);
  await page.keyboard.type("Skill of government was but a Pedenteria ¹ in comparison, so as Amphion, ³ was said; an area of 4 m² here.");
  await page.waitForTimeout(1500);
  await page.keyboard.press("Control+Meta+k");
  await rest(page);
  await page.selectOption(S.searchScope, { label: "Everything" });
  await page.keyboard.type("Pedenteria in comparison");
  await searched("Pedenteria in comparison");
  await log("typed Pedenteria in comparison", await R.search(page));
  await page.keyboard.press("Enter");
  await R.waitSelection(page, "pedenteria ¹ in comparison");
  await log("Enter on the footnoted phrase", { entry: await A.entry(page), selected: await R.selectionText(page) });
  await page.keyboard.press("Control+Meta+k");
  await rest(page);
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("Amphion, was");
  await searched("Amphion, was");
  await log("typed Amphion, was", await R.search(page));
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+Meta+k");
  await rest(page);
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("4 m²");
  await searched("4 m²");
  await log("typed 4 m²", await R.search(page));
  await page.keyboard.press("Escape");
    }],
    ["bookmarks from another window", async () => {
  /* two windows (2026-10-01), last of the steps that read the page lists, the made page being known to the current app's first window and not to the successor's: a page made in a second one and bookmarked there; ⌃⌘B in the first shows its row and keeps it stored, though the first never loaded that page, its page, opened from that row, is read from the store with the second window's text and takes the typing after it; saved again in the second while open in the first, it is redrawn there; saved in the second while the first has typing not yet saved, the first's save is refused; open in the first and deleted in the second, it stays on screen, the corner says so, typing there is refused and the page opened again is blank; and a × there writes the list with it kept — the current app's ⌃⌘B keeps the list it read at launch, and the × drops the other window's row */
  await go("2026-09-06");
  const other = await page.context().newPage();
  await other.goto(A.url("page/Made%20Elsewhere"));
  await A.waitEntry(other, "page/Made Elsewhere").catch(() => {});
  await A.waitWarm(other).catch(() => {});
  await other.click(S.editor);
  await other.keyboard.type("made in the second window");
  await other.waitForTimeout(2500);
  await other.keyboard.press("Control+Meta+b");
  await rest(other);
  await other.keyboard.press("a");
  await other.waitForTimeout(500);
  await log("A in a second window", { card: await R.bookmarks(other) });
  await other.close();
  await page.bringToFront();
  await page.keyboard.press("Control+Meta+b");
  await page.waitForTimeout(500);
  await log("⌃⌘B back in the first", { card: await R.bookmarks(page), stored: await page.evaluate((k) => localStorage.getItem(k), A.bookmarksKey) });
  await page.click(".bookmarks .bookmark-label:text-is('Made Elsewhere')", { timeout: 1000 }).catch(() => {});
  await A.waitEntry(page, "page/Made Elsewhere", 5000).catch(() => {});
  await rest(page);
  await log("its row's page opened from the first", { entry: await A.entry(page), text: await R.editorTextHead(page) });
  await page.click(S.editor);
  await page.keyboard.type("typed in the first");
  await page.waitForTimeout(2500);
  await log("its row's page typed into from the first", { entry: await A.entry(page), stored: await A.stored(page, "page/Made Elsewhere"), corner: await R.cornerText(page) });
  const textEnd = () => page.evaluate((s) => document.querySelector(s)?.textContent.slice(-30), S.editor);
  const again = await page.context().newPage();
  await again.goto(A.url("page/Made%20Elsewhere"));
  await A.waitEntry(again, "page/Made Elsewhere").catch(() => {});
  await A.waitWarm(again).catch(() => {});
  await page.bringToFront();
  await page.click(S.editor);
  await again.click(S.editor);
  await again.keyboard.type(", the second again");
  await again.waitForTimeout(2500);
  await log("the page open in the first, saved in the second", { textEnd: await textEnd(), stored: await A.stored(page, "page/Made Elsewhere"), focused: await page.evaluate((s) => !!document.querySelector(s)?.contains(document.activeElement), S.editor) });
  await page.click(S.editor);
  await page.keyboard.type(", the first unsaved");
  await A.foreignWrite(again, "page/Made Elsewhere", "rewritten in the second");
  await page.waitForTimeout(2500);
  await log("typed in the first as the second saves", { textEnd: await textEnd(), stored: await A.stored(page, "page/Made Elsewhere"), corner: await R.cornerText(page) });
  await page.click(S.corner);
  await rest(page);
  await go("page/Deleted%20Elsewhere");
  await page.click(S.editor);
  await page.keyboard.type("to be deleted in the second");
  await page.waitForTimeout(1500);
  await A.foreignWrite(again, "page/Deleted Elsewhere", null);
  await page.waitForTimeout(500);
  await log("the page open in the first, deleted in the second", { entry: await A.entry(page), textEnd: await textEnd(), corner: await R.cornerText(page) });
  await page.click(S.editor);
  await page.keyboard.type(", typed after");
  await page.waitForTimeout(1500);
  await log("typed into the page deleted in the second", { stored: await A.stored(page, "page/Deleted Elsewhere"), corner: await R.cornerText(page) });
  await go("2026-09-06");
  await log("the deleted page left for the day", { corner: await R.cornerText(page) });
  await go("page/Deleted%20Elsewhere");
  await log("the deleted page opened again in the first", { textEnd: await textEnd() });
  await again.close();
  await go("2026-09-06");
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await page.click(S.bookmarkDel);
  await rest(page);
  await log("× on its first row", { card: await R.bookmarks(page), stored: await page.evaluate((k) => localStorage.getItem(k), A.bookmarksKey) });
  await page.keyboard.press("Escape");
    }],
    ["author filing", async () => {
  /* (2026-10-05) "New author…" asks the name, then where it sorts, filled with the surname first; Rename on an author with a book re-files it, the book and the link to it with it, and the corner says so; the current app asks once and files the name as typed, and refuses to rename an author with books */
  await go("2026-09-06");
  await page.click(S.booksOpener);
  answer = ["Sean Miller", "Miller, Sean"];
  prompts.length = 0;
  await page.click(S.newAuthor);
  await A.waitEntry(page, "bookshelf/Miller, Sean", 5000).catch(() => {});
  await log("New author…, Sean Miller, Enter twice", { prompts: prompts.slice(), entry: await A.entry(page), stored: await A.stored(page, "bookshelf/Miller, Sean") });
  await page.click(S.booksOpener);
  await log("the bookshelf lists it by its heading", await R.panel(page));
  await page.keyboard.press("Escape");
  /* a click just past the heading's last letter, the caret at its end */
  const end = await page.evaluate((s) => { const h = document.querySelector(s); const r = document.createRange(); r.selectNodeContents(h); const b = r.getBoundingClientRect(); return { x: b.right + 3, y: b.top + b.height / 2 }; }, S.editorFirst);
  await page.mouse.click(end.x, end.y);
  /* the editor takes a click's caret on the selection's change, a tick later than the click */
  await rest(page);
  await page.keyboard.press("Enter");
  answer = "Odes";
  await A.act.create(page);
  await A.waitEntry(page, "bookshelf/Miller, Sean/Odes", 5000).catch(() => {});
  await page.click(S.editor);
  await page.keyboard.type("A book.");
  await page.waitForTimeout(1500);
  await go("bookshelf/Miller%2C%20Sean", 5000);
  answer = "Sean Miller";
  prompts.length = 0;
  await page.click(S.renameAuthor);
  await A.waitEntry(page, "bookshelf/Sean Miller", 5000).catch(() => {});
  await page.waitForFunction((s) => /filed under/.test(document.querySelector(s)?.textContent || ""), S.corner, { timeout: 3000 }).catch(() => {});
  await log("Rename, Sean Miller typed, Enter", { prompts: prompts.slice(), entry: await A.entry(page), corner: await cornerText(), author: await A.stored(page, "bookshelf/Sean Miller"), book: await A.stored(page, "bookshelf/Sean Miller/Odes"), oldAuthor: await A.stored(page, "bookshelf/Miller, Sean"), oldBook: await A.stored(page, "bookshelf/Miller, Sean/Odes") });
  await page.click(S.booksOpener);
  await log("the bookshelf after the re-file", await R.panel(page));
  await page.keyboard.press("Escape");
    }],
    ["replace", async () => {
  /* find and replace (2026-10-08, successor-only): ⌃⌘E in the rendered view switches to the source view and opens the bar, the corner whispering; Enter in Find steps on, Enter in Replace with replaces the outlined match and moves on, Skip moves on leaving it, Replace All replaces the rest, ⌘Z in the text undoes the All in one step, Escape closes and switches back; opened in the source view it stays there */
  await go("page/Replaced");
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await R.setSource(page, "One*-*two *-*three, and *,* four.\n\nFive*-*six.\n");
  await R.waitCorner(page, "saved");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await rest(page);
  await page.keyboard.press("Control+Meta+e");
  await rest(page);
  await log("⌃⌘E in the rendered view", { ...(await R.replaceBar(page)), corner: await R.cornerTextOrEmpty(page) });
  await page.keyboard.type("*-*");
  await rest(page);
  await log("*-* typed into Find", await R.replaceBar(page));
  await page.keyboard.press("Enter");
  await rest(page);
  await log("Enter in Find", await R.replaceBar(page));
  await page.click(S.replaceWith, { timeout: 2000 }).catch(() => {});
  await page.keyboard.type("-");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("Enter in Replace with", { ...(await R.replaceBar(page)), stored: await A.stored(page) });
  await page.click(S.replaceSkip, { timeout: 2000 }).catch(() => {});
  await rest(page);
  await log("Skip", { ...(await R.replaceBar(page)), stored: await A.stored(page) });
  await page.click(S.replaceAll, { timeout: 2000 }).catch(() => {});
  await rest(page);
  await log("Replace All, the rest replaced", { ...(await R.replaceBar(page)), stored: await A.stored(page) });
  await page.click(S.source, { timeout: 2000 }).catch(() => {});
  await page.keyboard.press("Meta+z");
  await rest(page);
  await log("⌘Z in the text", { ...(await R.replaceBar(page)), stored: await A.stored(page) });
  await page.keyboard.press("Escape");
  await rest(page);
  await log("Escape, opened in the rendered view", await R.replaceBar(page));
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await page.keyboard.press("Control+Meta+e");
  await rest(page);
  await log("⌃⌘E in the source view", await R.replaceBar(page));
  await page.keyboard.press("Escape");
  await rest(page);
  await log("Escape, opened in the source view", await R.replaceBar(page));
  /* a long entry: the layer the matches are drawn on keeps the text's line pitch to its last line, where 27.54px set it 79px low over 2,706 lines of Paradise Lost (2026-10-08) */
  await R.setSource(page, Array.from({ length: 1500 }, (_, i) => "Line " + i + " of a long entry, with *-* in it and more words after it to wrap.").join("\n\n"));
  await page.keyboard.press("Control+Meta+e");
  await rest(page);
  await log("a long entry's matches", await R.replaceDrift(page));
  /* Replace All far from the end keeps the window where it was: the whole-text edit put the caret, and the window, at the entry's last line */
  { const y = await winY(); await page.click(S.replaceAll, { timeout: 2000 }).catch(() => {}); await rest(page); await log("Replace All in a long entry", { count: (await R.replaceBar(page)).count, kept: Math.abs((await winY()) - y) < 60 }); }
  await page.keyboard.press("Escape");
  /* a replacement holding the find: the rest are counted, not "none" */
  await R.setSource(page, "cat and cat\n");
  await page.keyboard.press("Control+Meta+e");
  await rest(page);
  await page.fill("#replacefind", "cat").catch(() => {});
  await page.fill("#replacewith", "cats").catch(() => {});
  await page.click(S.replaceAll, { timeout: 2000 }).catch(() => {});
  await rest(page);
  await log("Replace All, the replacement holding the find", await R.replaceBar(page));
  await page.keyboard.press("Escape");
  /* a switch back the parse refuses: the cursor goes back to the text, not into the hidden Find box */
  await R.setSource(page, "::: grid 2\n::: card-red\nx\n:::\n:::\n");
  await R.waitCorner(page, "saved");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await page.keyboard.press("Control+Meta+e");
  await rest(page);
  await page.fill("#replacefind", "::: card-red").catch(() => {});
  await page.fill("#replacewith", "zz").catch(() => {});
  await page.click(S.replaceAll, { timeout: 2000 }).catch(() => {});
  await rest(page);
  await page.keyboard.press("Escape");
  await rest(page);
  await log("Escape, the switch back refused", await R.replaceBar(page));
  await R.setSource(page, "One*-*two.\n");
  await R.waitCorner(page, "saved");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  /* another panel opened over the bar closes it, and switches back as Escape does */
  await page.keyboard.press("Control+Meta+e");
  await rest(page);
  await page.keyboard.press("Control+Meta+h");
  await rest(page);
  await log("⌃⌘H over the bar", { ...(await R.replaceBar(page)), help: (await R.helpOpen(page)).help });
  await page.keyboard.press("Escape");
  await rest(page);
  /* the same entry saved in another window rebuilds the source view under the bar: the bar closes, its offsets belonging to the text it was opened on, and the caret goes back to the match it stood on, not to the text's end */
  await page.keyboard.press("Control+Meta+e");
  await rest(page);
  await page.fill("#replacefind", "*-*").catch(() => {});
  /* the switch's own save lands first, or the other window's write is refused as stale */
  await landed(page, 1500);
  { const other = await page.context().newPage();
    await other.goto(A.url("page/Replaced")); await A.waitEntry(other, "page/Replaced");
    await other.click(S.editor); await other.keyboard.press("End"); await other.keyboard.type(" Seven*-*eight.");
    await R.waitCorner(other, "saved");
    /* the landed write reaches this window by its notice: waited for, so a reading never races it */
    await page.waitForFunction(() => /Seven/.test(document.querySelector("textarea.source")?.value || document.querySelector("#editor")?.textContent || ""), null, { timeout: 5000 }).catch(() => {});
    await rest(page);
    await log("the entry saved in another window, the bar open", { ...(await R.replaceBar(page)), text: await page.evaluate(() => document.querySelector("textarea.source")?.value ?? null), caret: await page.evaluate(() => document.querySelector("textarea.source")?.selectionStart ?? null) });
    await other.close(); }
  await page.keyboard.press("Escape");
  if (await R.inSource(page)) { await page.keyboard.press("Control+Meta+m"); await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {}); }
    }],
    ["losing nothing", async () => {
  /* what was lost and is kept now: a fence's words after its language, a picture under the code button, a selection under a paste of line breaks, page markers in a copy, a second export's report, a store that never answers */
  await go("page/Kept");
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await R.setSource(page, "```not code\nx = 1\n```\n\ncap ![](x.png) tion\n\n::: note\nin her degree ⟨8⟩ and on\n:::\n");
  await page.keyboard.press("Control+Meta+m");
  await rest(page);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await log("a fence's words after the language, through both views", { fence: await page.evaluate((s) => document.querySelector(s)?.value.split("\n")[0] ?? null, S.source) });
  await page.keyboard.press("Control+Meta+m");
  await rest(page);
  await R.waitCorner(page, "saved");   /* the source's save landed first: its whisper would stand over the refusal's */
  await R.selectBetween(page, "cap", "tion");
  await rest(page);
  await page.click(".fmt .code");
  await rest(page);
  await log("the code button over a picture", { corner: await cornerText(), kept: ((await A.stored(page)) || "").includes("cap ![](x.png) tion") });
  await R.selectBetween(page, "cap", "cap");
  await R.pasteText(page, "\n\n");
  await rest(page);
  await log("line breaks pasted over a selection", { kept: ((await A.stored(page)) || "").includes("cap ![](x.png) tion") });
  await R.selectBetween(page, "in her", "and on");
  await page.keyboard.press("Meta+c");
  await rest(page);
  await log("⌘C over a page marker", { text: await R.clipboardText(page) });
  await page.hover(S.editor + " div.note");
  await rest(page);
  await page.click(S.copybtn);
  await rest(page);
  await log("a note with a page marker hover-copied", { text: await R.clipboardText(page) });
  /* a folder picker that answers only when told: the export stays running */
  await page.evaluate(() => { window.__pickers = 0; window.showDirectoryPicker = () => new Promise((_, reject) => { window.__pickers++; window.__pickerAbort = () => reject(new DOMException("dismissed", "AbortError")); }); });
  await page.click(".toolbtn[title^='Export every entry']");
  await rest(page);
  await page.click(".toolbtn[title^='Export every entry']");
  await rest(page);
  await log("export pressed again while one runs", { corner: await cornerText(), pickers: await page.evaluate(() => window.__pickers) });
  await page.evaluate(() => window.__pickerAbort?.());
  await rest(page);
  /* an import over the entry open, typed into while it runs: the import's text stands and its tally shows; the keys go back to the text after the button */
  await go("page/Typed");
  await page.click(S.editor);
  await page.keyboard.type("before the import. ");
  await landed(page, 1200);
  await page.evaluate(() => {
    const file = (name, text) => ({ kind: "file", name, getFile: () => Promise.resolve(new File([text], name)) });
    const dir = (name, kids) => ({ kind: "directory", name, values: async function* () { for (const k of kids) yield k; } });
    const fillers = Array.from({ length: 1500 }, (_, i) => file("Filler " + String(i).padStart(4, "0") + ".md", "# Filler " + i + "\n"));
    window.showDirectoryPicker = () => Promise.resolve(dir("export", [dir("page", [...fillers, file("Typed.md", "IMPORTED TEXT\n")])]));
  });
  await page.click(".toolbtn[title^='Import']");
  await rest(page);
  const afterButton = await cursor();
  await page.waitForFunction((c) => /^importing/.test(document.querySelector(c)?.textContent || ""), S.corner, { timeout: 10000 }).catch(() => {});
  await page.click(S.editor);
  await page.keyboard.type("T0 T1 T2 ");
  /* the import's end: its tally, or a failure still owed from an earlier section, which every operation's end puts back */
  await page.waitForFunction((c) => !/^importing/.test(document.querySelector(c)?.textContent || ""), S.corner, { timeout: 30000 }).catch(() => {});
  const tallied = await cornerText();
  await page.waitForTimeout(1000);
  await log("typed into an entry an import overwrites", { afterButton, text: await page.evaluate((e) => (document.querySelector(e)?.textContent || "").slice(0, 40), S.editor), corner: tallied });
  /* a page of its own, the persist call watched from before the app's first line */
  const hung = await page.context().newPage();
  await hung.addInitScript(() => { const s = navigator.storage; const own = s.persist.bind(s); s.persist = () => { window.__persistAsked = true; return own(); }; });
  await hung.goto(A.url("page/Horace", "warm=hang"));
  await hung.waitForTimeout(8500);
  await log("a store that never answers", await hung.evaluate((c) => ({ corner: document.querySelector(c)?.textContent || "", persistAsked: !!window.__persistAsked }), S.corner));
  await hung.close();
    }],
    ["where the keys go", async () => {
  /* the caret or the focus that went nowhere: a card's chord pressed again, a row closed by its label, the bookmark card's link, Tab outside a list, a code block's Tab and ⌘A, Escape after a jump, ⌃⌘M and an arrival under an open row, Tab out of a card, held keys, a caret under the masthead, a line below a table, a picture landing while Search is typed in */
  /* a control the current app lacks fails its own step, not the section */
  const tap = (sel) => page.click(sel, { timeout: 3000 }).catch(() => {});
  /* the view asked for, whichever the arrival brought: the current app's carries across entries */
  const view = async (source) => { if ((await R.inSource(page)) !== source) { await page.keyboard.press("Control+Meta+m"); await rest(page); } };
  await go("page/Horace");
  await view(false);
  await page.click(S.corner, { timeout: 1000 }).catch(() => {});   /* an earlier section's pin, dismissed as a reader does: the whispers below yield to it */
  await tap(S.editor);
  const twice = async (chord) => { for (let i = 0; i < 2; i++) { await page.keyboard.press(chord); await rest(page); } };
  await twice("Control+Meta+s");
  await log("⌃⌘S pressed twice", {});
  await twice("Control+Meta+b");
  await log("⌃⌘B pressed twice", {});
  await page.keyboard.press("Control+Meta+l");
  await rest(page);
  await tap(".page-lines > summary");
  await rest(page);
  await log("Line numbering closed by its label", await R.linesRowOpen(page));
  await go("page/Links");
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await page.keyboard.press("a");
  await rest(page);
  await page.keyboard.press("Escape");
  await go("page/Horace");
  /* the line's place once the measuring passes after an arrival are done:
     two readings a frame apart agree. Measured at once, a full run's click
     landed a word later as often as not */
  let at = await R.wordAt(page, "Maecenas atavis", 8);
  for (let i = 0; i < 20; i++) { await rest(page); const again = await R.wordAt(page, "Maecenas atavis", 8); if (again.x === at.x && again.y === at.y) break; at = again; }
  /* the click's caret is the editor's only once its selectionchange has
     reached it: under a full run's load the link landed at the caret before */
  await page.evaluate(() => { window.__selSeen = false; document.addEventListener("selectionchange", () => { window.__selSeen = true; }, { once: true }); });
  await page.mouse.click(at.x + 30, at.y);
  await page.waitForFunction(() => window.__selSeen, null, { timeout: 2000 }).catch(() => {});
  await rest(page);
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await tap(".bookmark-link[aria-label='Link to Links']");
  await rest(page);
  await page.keyboard.type("Z");
  await log("a bookmark's link pressed, Z typed", { line: ((await A.stored(page)) || "").split("\n").find((l) => l.includes("](#page/Links)"))?.slice(0, 60) ?? null });
  await page.keyboard.press("Escape");
  /* Tab and ⌘A outside a list, in a code block, and the line below a table */
  await go("page/Keys");
  await tap(S.editor);
  await view(true);
  await R.setSource(page, "one\n\ntwo\n\n```\nx = 1\ny = 2\n```\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n");
  await view(false);
  await R.waitCorner(page, "saved");
  await page.waitForTimeout(1500);   /* every save landed first: a whisper of theirs stood over Tab's */
  /* clicked until the caret stands in the word: a click measured while the
     page settled after a view switch landed at the entry's end
     (pin: where the keys go › Tab held in a quote) */
  const clickWord = async (w) => {
    for (let i = 0; i < 3; i++) {
      const p = await R.wordAt(page, w, 1); await page.mouse.click(p.x, p.y); await rest(page);
      if (await page.evaluate((w) => (getSelection().anchorNode?.textContent || "").includes(w), w)) return;
      await rest(page); await rest(page);
    }
  };
  await clickWord("one");
  await page.keyboard.press("Tab");
  await rest(page);
  await log("Tab in prose", { corner: await cornerText() });
  await R.selectBetween(page, "one", "two");
  await rest(page);
  await page.keyboard.press("Tab");
  await rest(page);
  await log("Tab over two paragraphs", { corner: await cornerText() });
  await clickWord("x = 1");
  await page.keyboard.press("Tab");
  await rest(page);
  await log("Tab in a code block", { code: await page.evaluate((s) => document.querySelector(s)?.textContent ?? null, S.editorPre) });
  await page.keyboard.press("Meta+a");
  await rest(page);
  await log("⌘A in a code block", {});
  const below = await page.evaluate((e) => { const t = document.querySelector(e + " table"); if (!t) return null; const r = t.getBoundingClientRect(); return { x: r.left + 20, y: r.bottom + 14, last: document.querySelector(e).lastElementChild?.tagName }; }, S.editor);
  if (below) await page.mouse.click(below.x, below.y);
  await page.keyboard.type("z");
  await log("a click below a table at the end, z typed", { last: below?.last, tail: ((await A.stored(page)) || "").trimEnd().split("\n").slice(-2) });
  /* Escape after a search jump; ⌃⌘M over open results */
  await searchFor(page, "two");
  await landed(page, 600);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape");
  await rest(page);
  await log("Escape after a search jump", {});
  await searchFor(page, "one");
  await landed(page, 600);
  await page.keyboard.press("Control+Meta+m");
  await rest(page);
  await log("⌃⌘M over open search results", {});
  await page.keyboard.press("Control+Meta+m");
  await rest(page);
  await page.keyboard.press("Escape");
  /* an arrival at the entry already open, under the shortcuts popup and the Search row */
  await go(TODAY);
  await page.keyboard.press("Control+Meta+s");
  await rest(page);
  await page.keyboard.press("Control+Meta+t");
  await rest(page);
  await log("⌃⌘T on today from the shortcuts popup", {});
  await searchFor(page, "one");
  await landed(page, 600);
  await page.keyboard.press("Control+Meta+t");
  await rest(page);
  await log("⌃⌘T on today from Search", {});
  await page.keyboard.press("Escape");
  /* Tab out of a card */
  await tap(S.editor);
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  await rest(page);
  await log("Tab twelve times from the bookmarks card", {});
  await page.keyboard.press("Escape");
  await tap(S.editor);
  await page.keyboard.press("Control+Meta+s");
  await rest(page);
  await page.keyboard.press("Shift+Tab");
  await rest(page);
  await log("Shift-Tab from the shortcuts popup", {});
  await page.keyboard.press("Escape");
  /* held keys: a key down again before it is up is the browser's auto-repeat */
  const hold = async (key, times, mods = []) => {
    for (const m of mods) await page.keyboard.down(m);
    for (let i = 0; i < times; i++) { await page.keyboard.down(key); await page.waitForTimeout(i ? 50 : 400); }
    await page.keyboard.up(key);
    for (const m of mods.reverse()) await page.keyboard.up(m);
  };
  await page.focus(S.booksOpener);
  await hold("Tab", 11);
  await rest(page);
  await log("Tab held from the bookshelf button", { focus: await page.evaluate(() => document.activeElement?.getAttribute("title") ?? document.activeElement?.tagName) });
  await go("bookshelf/Boethius/Consolatio/3pr1");
  await tap(S.editor);
  await page.evaluate(() => { window.__walks = 0; addEventListener("hashchange", () => { window.__walks++; }); });
  await hold(".", 6, ["Control", "Meta"]);
  await page.waitForTimeout(1200);
  await log("⌃⌘. held from 3pr1", { walks: await page.evaluate(() => window.__walks) });
  await searchFor(page, "defixo");
  await landed(page, 600);
  await hold("Enter", 3);
  await rest(page);
  await log("Enter held on a search result", { entry: await A.entry(page), md: await A.stored(page, "bookshelf/Boethius/Consolatio/3pr2") });
  await go("page/Held");
  await tap(S.editor);
  await page.keyboard.press("Control+Meta+s");
  await rest(page);
  if (await page.isVisible(S.shortcutsEditor)) { await page.fill(S.shortcutsEditor, "sig: Sean Miller"); await tap(S.shortcutsSave); await rest(page); }
  await tap(S.shortcutsInput);
  await page.keyboard.type("sig");
  await rest(page);
  await hold("Enter", 3);
  await rest(page);
  await page.keyboard.type(" then.");
  await log("Enter held on a shortcut", { md: await A.stored(page) });
  await view(true);
  await R.setSource(page, "> quoted\n");
  await view(false);
  await clickWord("quoted");
  await hold("Tab", 3);
  await rest(page);
  await log("Tab held in a quote", { md: await A.stored(page) });
  /* a caret scrolled back into view stops below the masthead */
  await go("2026-09-05");
  await clickWord("The most famous story");
  await page.mouse.move(500, 400);
  await page.mouse.wheel(0, 900);
  await rest(page);
  await page.keyboard.press("Enter");
  await rest(page);
  await log("Enter with the caret above the window", { clear: await page.evaluate(() => { const s = getSelection(); if (!s.rangeCount) return null; const r = s.getRangeAt(0).getClientRects()[0] || s.anchorNode.parentElement?.getBoundingClientRect(); const head = document.querySelector(".site-head")?.getBoundingClientRect().bottom || 0; return r ? Math.round(r.top - head) : null; }) });
  await page.keyboard.press("Backspace");
  /* a picture that finishes preparing while Search is typed in */
  /* the digit that opens a bookmark, held: nothing typed into the entry it opened */
  await page.evaluate(() => { window.__typed = 0; document.addEventListener("beforeinput", () => { window.__typed++; }, true); });
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await hold("1", 4);
  await page.waitForTimeout(800);
  await log("a digit held on the bookmarks card", { typed: await page.evaluate(() => window.__typed) });
  /* a refused entry redrawn by another tab's write: Search, open over it, stays */
  await go("page/Refused");
  await view(true);
  await R.setSource(page, "::: grid\nloose\n:::\n");
  for (let i = 0; i < 12 && !((await A.stored(page)) || "").includes("loose"); i++);
  await go("page/Held");
  await go("page/Refused");
  await page.keyboard.press("Control+Meta+k");
  await rest(page);
  await page.keyboard.type("lo");
  await A.foreignWrite(page, "page/Refused", "::: grid\nloose again\n:::\n");
  await page.waitForTimeout(800);
  await log("a refused entry redrawn under Search", { source: await R.inSource(page), query: await page.evaluate(() => document.querySelector(".search-input")?.value ?? null) });
  await page.keyboard.press("Escape");
  /* the picture's preparation held 800ms, so it lands after the keys are in Search */
  await go("page/Pictured%20Late");
  await tap(S.editor);
  await page.evaluate(() => { const own = window.createImageBitmap; window.createImageBitmap = (...a) => new Promise((r) => setTimeout(() => r(own(...a)), 800)); });
  await R.pastePng(page);
  await searchFor(page, "abc");
  await page.waitForTimeout(2000);
  await log("a picture pasted, then Search typed in", { query: await page.evaluate(() => document.querySelector(".search-input")?.value ?? null), pictures: await page.evaluate((s) => document.querySelectorAll(s).length, S.editorImg), md: await A.stored(page) });
  await page.keyboard.press("Escape");
    }],
    ["editing as the help says", async () => {
  /* help.html's promises: a verse passage copied keeps its numbering, Enter in a countdown list counts down, Enter in a list item's own paragraph stays in the item, Tab in a quote carries its heading and table, and the line numbers while typing */
  /* a placed selection is read by the editor a moment later: a Tab pressed at once went where the arrival had left the caret */
  const caretAt = async (needle, offset) => { await R.caretAfter(page, needle, offset); await rest(page); };
  const view = async (source) => { if ((await R.inSource(page)) !== source) { await page.keyboard.press("Control+Meta+m"); await rest(page); } };
  /* an entry stored as another tab would, then opened: typed into the current app's source view, a list came back split at every line */
  const write = async (key, text) => {
    await A.foreignWrite(page, key, text);
    await go(key);
    await view(false);
  };
  const numbers = () => page.evaluate(() => [...document.querySelectorAll("#editor .ln.shown, #page .ln.shown")].filter((r) => getComputedStyle(r, "::before").content.replace(/"/g, "") !== "none").map((r) => r.dataset.line + ":" + r.textContent.trim().slice(0, 10)).join(" "));
  /* the numbers on screen beside a list: each item's own value, else the list's count from its start */
  const listNumbers = () => page.evaluate(() => [...document.querySelectorAll("#editor ol li, #page ol li")].map((li) => li.getAttribute("value") ?? "·").join(" ") + " (start " + (document.querySelector("#editor ol, #page ol")?.getAttribute("start") ?? "1") + (document.querySelector("#editor ol, #page ol")?.reversed ? ", reversed" : "") + ")");
  await write("page/Verse Copied", "::: verse\none line\ntwo line\nthree line\nfour line\nfive line\nsix line\nseven line\neight line\nnine line\nten line\neleven line\n:::\n");
  await R.selectBetween(page, "two line", "three line");
  await page.keyboard.press("Meta+c");
  await rest(page);
  await log("verse lines 2–3 copied", { clipboard: await R.clipboardLines(page) });
  await R.waitBar(page);
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
  await log("⌃⌘R on verse lines 2–3", { lines: (await R.clipboardLines(page)).map((l) => l.replace(/\(#[^)]*\)/, "(…)")) });
  await page.keyboard.press("ArrowRight");
  await caretAt("two line", 8);
  await page.waitForTimeout(3000);
  const before = await numbers();
  await page.keyboard.press("Enter");
  await page.keyboard.type("new line");
  await rest(page);
  const typing = await numbers();
  await page.waitForTimeout(3000);
  await log("a line typed into verse", { before, typing, after: await numbers() });
  await write("page/Countdown", "5. five\n4. four\n");
  await caretAt("four", 4);
  await page.keyboard.press("Enter");
  await page.keyboard.type("next");
  await log("Enter in a countdown list", { md: await A.stored(page), numbers: await listNumbers() });
  await write("page/Countdown Three", "5. five\n4. four\n3. three\n");
  await caretAt("five", 4);
  await page.keyboard.press("Enter");
  await page.keyboard.type("new");
  await log("Enter after the first item of a countdown", { md: await A.stored(page) });
  await write("page/Countdown Middle", "5. five\n4. four\n3. three\n");
  await caretAt("four", 4);
  await page.keyboard.press("Enter");
  await page.keyboard.type("new");
  await log("Enter after the middle item of a countdown", { md: await A.stored(page) });
  await write("page/Numbers Jump", "1. a\n5. e\n6. f\n");
  await caretAt("e", 1);
  await page.keyboard.press("Enter");
  await page.keyboard.type("new");
  await log("Enter after a jump in the numbering", { md: await A.stored(page) });
  await write("page/Item Paragraph", "1. one\n\n   more of one\n\n2. two\n");
  await caretAt("more of one", 11);
  await page.keyboard.press("Enter");
  await page.keyboard.type("next");
  await log("Enter in a list item's second paragraph", { md: await A.stored(page) });
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("out");
  await log("Enter twice after it, out typed", { md: await A.stored(page) });
  await write("page/Quoted Heading", "> ## Quoted head\n>\n> quoted text\n");
  await caretAt("Quoted head", 3);
  await page.keyboard.press("Tab");
  await rest(page);
  await log("Tab on a heading in a quote", { md: await A.stored(page) });
  await write("page/Quoted Table", "> quoted text\n>\n> | a | b |\n> | - | - |\n> | 1 | 2 |\n");
  await caretAt("1", 1);
  await page.keyboard.press("Tab");
  await rest(page);
  await log("Tab in a table in a quote", { md: await A.stored(page) });
    }],
    ["editing as the old app does", async () => {
  /* the inventory's group 4, where nothing promised either way: each gesture read over both apps, the old app's reading the one to match */
  const view = async (source) => { if ((await R.inSource(page)) !== source) { await page.keyboard.press("Control+Meta+m"); await rest(page); } };
  const write = async (key, text) => { await A.foreignWrite(page, key, text); await go(key); await view(false); };
  /* a placed selection is read by the editor a moment later */
  const caretAt = async (needle, offset) => { await R.caretAfter(page, needle, offset); await rest(page); };
  const between = async (a, b) => { await R.selectBetween(page, a, b); await rest(page); };
  /* the toolbar's button pressed as a click on it, shown or not: the selection is made by script */
  const button = async (title) => { await page.evaluate((t) => document.querySelector(".fmt button[title='" + t + "']")?.click(), title); await rest(page); };
  const copied = async () => { await page.keyboard.press("Meta+c"); await rest(page); return R.clipboardLines(page); };
  /* the stored text without its last line end: a seed left unedited keeps the one it was written with */
  const stored = async () => ((await A.stored(page)) ?? "").replace(/\n+$/, "");
  const corner = () => page.evaluate(() => document.querySelector(".saved.show")?.textContent || "");
  await write("page/Quote Enter", "> one\n> two\n");
  await caretAt("one", 3);
  await page.keyboard.press("Enter");
  await page.keyboard.type("new");
  await log("Enter inside a quote, new typed", { md: await stored() });
  await write("page/Code Two", "alpha\n\nbeta\n");
  await between("alpha", "beta");
  await button("Code block");
  await log("the code button over two paragraphs", { md: await stored() });
  await write("page/Quote Three", "> first\n>\n> second\n>\n> third\n");
  await caretAt("second", 3);
  await button("Quote");
  await log("the quote button with the caret in a quote's middle paragraph", { md: await stored() });
  await write("page/Nested Runs", "> intro\n>\n>> a\n>>\n>> b\n>>\n>> c\n");
  await caretAt("b", 1);
  await page.keyboard.press("Shift+Tab");
  await rest(page);
  await log("Shift-Tab on the middle run of a nested quote", { md: await stored() });
  await write("page/Soft Italic", "wrote this:\n");
  await caretAt("wrote this:", 11);
  await page.keyboard.press("Shift+Enter");
  await page.keyboard.type("_Somnium Scipionis_ ok");
  await log("_italic_ typed at the start of a Shift-Enter line", { md: await stored() });
  await write("page/Quote Italic", "> note:\n");
  await caretAt("note:", 5);
  await page.keyboard.press("Enter");
  await page.keyboard.type("_verity_ ok");
  await log("_italic_ typed on a quote's later line", { md: await stored() });
  await write("page/Middle Marker", "a\n");
  await caretAt("a", 1);
  await page.keyboard.press("Shift+Enter");
  await page.keyboard.type("Z");
  await page.keyboard.press("Shift+Enter");
  await page.keyboard.type("b");
  await caretAt("Z", 0);
  await page.keyboard.type("- ");
  await log("- typed at the start of a middle line", { md: await stored() });
  await write("page/Quote Marker", "> a\n");
  await caretAt("a", 1);
  await page.keyboard.press("Enter");
  await page.keyboard.type("> b");
  await log("> typed on a quote's later line", { md: await stored() });
  await write("page/List From Three", "3. x\n4. y\n5. z\n");
  await between("y", "z");
  await log("items 4–5 of a list from 3 copied", { clipboard: await copied() });
  await write("page/Code Copy", "```js\na = *ptr;\nmore\n```\n");
  await between("a = *ptr;", "mo");
  await log("a selection inside a code block copied", { clipboard: await copied() });
  await write("page/Paste In Run", "x *the best* of times\n");
  await caretAt("the be", 6);
  await R.pasteText(page, "L1\nL2");
  await rest(page);
  await log("two lines pasted inside an emphasised run", { md: await stored() });
  await write("page/Paste Quote", "> quoted line\n");
  await caretAt("quoted", 6);
  await R.pasteText(page, "> inner");
  await rest(page);
  await log("> inner pasted inside a quote", { md: await stored() });
  await write("page/Paste Picture Quote", "x\n");
  await caretAt("x", 1);
  await R.pasteText(page, "> ![](a.png)");
  await rest(page);
  await log("a one-line quote of a picture pasted", { md: await stored() });
  await write("page/Paste Url", "see it now\n");
  await caretAt("see ", 4);
  await R.pasteText(page, "https://example.org/x");
  await rest(page);
  await log("a bare URL pasted", { md: await stored(), links: await page.evaluate(() => document.querySelectorAll("#editor a, #page a").length) });
  /* a bookmark to press: Links, added from its own card */
  await go("page/Links");
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await page.keyboard.press("a");
  await rest(page);
  await page.keyboard.press("Escape");
  await write("page/Inline Code Link", "see `code here` now\n");
  await caretAt("code", 2);
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await page.click(".bookmark-link[aria-label='Link to Links']", { timeout: 2000 }).catch(() => {});
  await rest(page);
  await log("a bookmark's link pressed in inline code", { md: await stored(), corner: await corner() });
  await page.keyboard.press("Escape");
  await write("page/Paste Refused", "x\n");
  await caretAt("x", 1);
  await R.pasteText(page, "::: verse -1\nline one\n:::");
  await page.waitForTimeout(400);
  await log("a refused fence pasted", { md: await stored(), corner: await corner() });
  await write("page/Source Curl", "x\n");
  await view(true);
  await R.sourceCaretTo(page, "x");
  await page.keyboard.press("End");
  await page.keyboard.type(' a -- "b"" it\'s');
  await rest(page);
  await view(false);
  await log("-- and quotes typed in the markdown view", { md: await stored() });
  await write("page/Bold Italic Row", "::: verse\n**SPEAKER**\n*Stage direction*\n***KING JOHN***\nDeath.\n:::\n");
  await log("a wholly bold-italic row", await page.evaluate(() => {
    const colour = (t) => { const w = document.createTreeWalker(document.querySelector("#editor .ProseMirror") || document.getElementById("page"), NodeFilter.SHOW_TEXT); for (let n = w.nextNode(); n; n = w.nextNode()) if (n.data === t) return getComputedStyle(n.parentElement).color; return null; };
    const king = colour("KING JOHN");
    return { king: king === colour("SPEAKER") ? "as the speaker" : king === colour("Stage direction") ? "as the stage direction" : king };
  }));
  await write("page/Note Quote", "::: note\n> quoted in a note\n:::\n");
  await log("a quotation inside a note", await page.evaluate(() => { const q = document.querySelector("#editor .note blockquote, #page .note blockquote"); if (!q) return { quote: null }; const cs = getComputedStyle(q); return { fill: cs.backgroundColor !== "rgba(0, 0, 0, 0)", rule: parseFloat(cs.borderLeftWidth) > 0 || getComputedStyle(q, "::before").content !== "none" }; }));
  const box = "data:image/svg+xml;base64," + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="120"><rect width="300" height="120" fill="#ccc"/></svg>').toString("base64");
  await write("page/Spacing", `early light:\n\n![](${box})\n\n~ ~\n\nA paragraph.\n\n> ::: verse 265\n> ye Elves of Hilles,\n> :::\n\n> ::: verse 197 265\n> auraeque | Ye Ayres\n> :::\n\n> A quoted paragraph.\n`);
  await page.waitForFunction(() => [...document.querySelectorAll("#editor img:not(.ProseMirror-separator)")].every((i) => i.complete), null, { timeout: 2000 }).catch(() => {});
  await log("a picture's gaps and a quotation's top", await page.evaluate(() => {
    const R = (e) => e.getBoundingClientRect();
    const top = [...document.querySelectorAll("#editor .ProseMirror > *")];
    const at = (t) => top.find((e) => e.textContent === t);
    const img = document.querySelector("#editor .ProseMirror > p > img:not(.ProseMirror-separator)");
    if (!img) return { picture: null };
    return {
      abovePicture: Math.round(R(img).top - R(at("early light:")).bottom),
      belowPicture: Math.round(R(at("~ ~")).top - R(img).bottom),
      paragraphGap: Math.round(R(at("A paragraph.")).top - R(at("~ ~")).bottom),
      quoteTopToText: top.filter((e) => e.tagName === "BLOCKQUOTE").map((b) => Math.round(R(b.querySelector(".vrow, p")).top - R(b).top)),
    };
  }));
  await write("page/Reference Block", "::: reference\nroman book and canto\n:::\n\nafter\n");
  await page.click("#editor .reference, #page .reference", { timeout: 2000 }).catch(() => {});
  await rest(page);
  await page.keyboard.type("Q");
  await rest(page);
  await log("a reference block clicked, Q typed", { md: await stored(), corner: await corner() });
  const greek = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega".split(" ");
  await write("page/Spaced Leaves", greek.concat(greek, greek).map((w, i) => w + "word⟨" + (i + 1) + "⟩").join(" ") + "\n");
  await page.waitForTimeout(600);
  /* a label stands off its leaf when its middle is further than half a line from the middle of the first word after its marker */
  await log("page labels beside their leaf's first word", await page.evaluate(() => {
    const root = document.querySelector("#editor .ProseMirror") || document.getElementById("page");
    const markers = [...root.querySelectorAll("[data-folio]")];
    let off = 0;
    for (const m of markers) {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      w.currentNode = m;
      let t = w.nextNode(); while (t && !t.data.trim()) t = w.nextNode();
      if (!t) continue;
      const i = t.data.search(/\S/), r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1);
      const word = r.getBoundingClientRect(), mid = word.top + word.height / 2;
      const gutter = [...document.querySelectorAll("#foliogutter > *")].find((l) => l.textContent.trim() === "p. " + m.getAttribute("data-folio"));
      let labelMid;
      if (gutter) { const g = gutter.getBoundingClientRect(); labelMid = g.top + g.height / 2; }
      else { const b = m.getBoundingClientRect(); labelMid = b.top + (parseFloat(getComputedStyle(m, "::after").marginTop) || 0) + word.height / 2; }
      if (Math.abs(labelMid - mid) > word.height / 2) off++;
    }
    return { markers: markers.length, off };
  }));
  await write("page/Near Miss", "x\n");
  await caretAt("x", 1);
  await R.pasteText(page, " [near](#pagex)");
  await rest(page);
  await log("a near-miss entry link pasted", { md: await stored(), links: await page.evaluate(() => document.querySelectorAll("#editor a, #page a").length) });
    }],
    ["notices and surfaces as the old app has them", async () => {
  /* the inventory's groups 5–7, each gesture read over both apps, the old app's reading the one to match */
  const view = async (source) => { if ((await R.inSource(page)) !== source) { await page.keyboard.press("Control+Meta+m"); await rest(page); } };
  const write = async (key, text) => { await A.foreignWrite(page, key, text); await go(key); await view(false); };
  const corner = () => page.evaluate(() => document.querySelector(".saved.show, #saved.show")?.textContent || "");
  const dismiss = () => page.click(S.corner, { timeout: 1000 }).catch(() => {});
  const stored = async () => ((await A.stored(page)) ?? "").replace(/\n+$/, "");
  const LINES = ".page-lines select, #pagelines select";
  await go("page/Horace");
  await view(false);
  await dismiss();
  await page.click(S.editor);
  /* the key as Caps Lock spells it: a press with ⌘ held reaches the page lower-cased */
  await page.evaluate(() => (document.activeElement || document.body).dispatchEvent(new KeyboardEvent("keydown", { key: "K", code: "KeyK", ctrlKey: true, metaKey: true, bubbles: true, cancelable: true })));
  await rest(page);
  await log("⌃⌘K with Caps Lock", { searchOpen: await page.evaluate(() => { const d = document.querySelector(".page-search, #pagesearch"); return !!d && (d.tagName === "DETAILS" ? d.open : !d.hidden); }) });
  await page.keyboard.press("Escape");
  await page.goto(A.url("").replace(/#$/, ""));
  await page.waitForTimeout(2000);
  await log("a bare launch", { hash: await page.evaluate(() => location.hash) });
  await go("page/Horace");
  await view(false);
  const setLines = (v) => page.evaluate(([s, v]) => { const e = document.querySelector(s); if (!e) return; e.value = v; e.dispatchEvent(new Event("change", { bubbles: true })); }, [LINES, v]);
  /* picked with the row open, as a hand picks it */
  await page.keyboard.press("Control+Meta+l");
  await rest(page);
  await setLines("1");
  await rest(page);
  await page.reload();
  await A.waitEntry(page, "page/Horace").catch(() => {});
  await page.waitForTimeout(500);
  await log("Line numbering kept across a reload", { interval: await page.evaluate((s) => document.querySelector(s)?.value ?? null, LINES) });
  await page.keyboard.press("Control+Meta+l");
  await rest(page);
  await setLines("5");
  await rest(page);
  await page.keyboard.press("Control+Meta+l");
  await rest(page);
  /* a folder picker answering with what each import reads */
  const picked = (tree) => page.evaluate((tree) => {
    const file = (name, text) => ({ kind: "file", name, getFile: () => Promise.resolve(new File([text], name)) });
    const build = (n) => n.text !== undefined ? file(n.name, n.text) : { kind: "directory", name: n.name, values: async function* () { for (const k of n.kids) yield build(k); } };
    window.showDirectoryPicker = () => Promise.resolve(build(tree));
    window.confirm = () => false;
  }, tree);
  const importButton = ".toolbtn[title^='Import'], #importbtn";
  await picked({ name: "export", kids: [{ name: "stray.md", text: "x\n" }] });
  await page.click(importButton);
  await page.waitForTimeout(500);
  const first = await corner();
  await page.waitForTimeout(4000);
  await log("an import of refused files only", { corner: first, fourSecondsOn: await corner() });
  await dismiss();
  await picked({ name: "export", kids: [{ name: "page", kids: [{ name: "Trip--Log.md", text: "a\n" }, { name: "Trip-Log.md", text: "b\n" }] }] });
  await page.click(importButton);
  await page.waitForTimeout(500);
  await log("an import of two files for one entry", { corner: await corner() });
  await dismiss();
  await write("page/Pic Fail", "x\n");
  await R.caretAfter(page, "x", 1);
  await rest(page);
  await page.evaluate(() => { const P = IDBObjectStore.prototype; window.__idb = [P.put, P.add]; const full = () => { throw new DOMException("full", "QuotaExceededError"); }; P.put = full; P.add = full; });
  await R.pastePng(page);
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const P = IDBObjectStore.prototype; [P.put, P.add] = window.__idb; });
  await log("a picture whose write fails", { corner: await corner() });
  await dismiss();
  await write("page/Pic Copy", "::: note\nx\n:::\n");
  await R.caretAfter(page, "x", 1);
  await rest(page);
  await R.pastePng(page);
  await page.waitForTimeout(1500);
  await page.hover(S.editor + " div.note");
  await rest(page);
  await page.click(S.copybtn, { timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(500);
  await log("a block with a picture hover-copied", { pictureCarried: await page.evaluate(async () => { try { const items = await navigator.clipboard.read(); const html = items[0].types.includes("text/html") ? await (await items[0].getType("text/html")).text() : ""; return /<img[^>]+src="data:image\//.test(html); } catch (e) { return String(e); } }) });
  await go("page/Horace");
  await view(false);
  const before = await A.stored(page, "page/Horace");
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  const boxes = () => page.evaluate(() => { const v = (s) => { const e = document.querySelector(s); return !!e && e.offsetParent !== null; }; return { line: v("#lineinput"), page: v("#folioinput") }; });
  const asked = await boxes();
  await A.foreignWrite(page, "page/Horace", before.replace(/\n*$/, "") + "\n\nand on ⟨5⟩ here\n");
  await page.waitForTimeout(1200);
  await log("the line bar re-asked when the entry gains a page marker", { before: asked, after: await boxes() });
  const lineBox = await page.evaluate(() => { const r = document.querySelector("#lineinput")?.getBoundingClientRect(); return r ? { x: r.left + 5, y: r.top + r.height / 2 } : null; });
  const into = await page.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? { x: r.left + 60, y: r.top + 120 } : null; }, S.editor);
  if (lineBox && into) { await page.mouse.move(lineBox.x, lineBox.y); await page.mouse.down(); await page.mouse.move(into.x, into.y, { steps: 6 }); await page.mouse.up(); }
  await rest(page);
  await log("a drag from the Line box out over the entry", { barOpen: (await boxes()).line });
  await page.keyboard.press("Escape");
  await A.foreignWrite(page, "page/Horace", before);
  await page.waitForTimeout(1200);
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+k");
  await rest(page);
  await page.keyboard.type("atavis");
  await page.waitForTimeout(800);
  await page.keyboard.type(" zzz", { delay: 10 });
  await page.click(S.searchRows + ":first-child", { timeout: 1000 }).catch(() => {});
  await page.waitForTimeout(600);
  await log("a result clicked after more typing", { selected: await page.evaluate(() => document.getSelection()?.toString() || "") });
  await go("page/Horace");
  await view(false);
  await page.keyboard.press("Escape");
  await R.selectBetween(page, "Maecenas", "Maecenas");
  await rest(page);
  /* the bar over the first line, under the masthead: a row opening grows the masthead down over it */
  const underHeader = () => page.evaluate(() => { const b = document.querySelector(".fmt")?.getBoundingClientRect(), h = document.querySelector(".site-head, header")?.getBoundingClientRect(); return b && h ? b.top >= h.bottom - 1 : null; });
  const was = await underHeader();
  await page.keyboard.press("Control+Meta+l");
  await page.waitForTimeout(400);
  await log("the format bar after Line numbering opens", { clearBefore: was, clearAfter: await underHeader() });
  await page.keyboard.press("Control+Meta+l");
  await rest(page);
  await go("page/Pic Copy");
  await view(false);
  await page.hover(S.editor + " div.note");
  await rest(page);
  const over = await page.evaluate((s) => document.querySelector(s)?.classList.contains("show") ?? null, S.copybtn);
  await page.evaluate(() => { location.hash = "#page/Links"; });
  await page.waitForTimeout(800);
  await log("the copy button after a navigation", { over, after: await page.evaluate((s) => document.querySelector(s)?.classList.contains("show") ?? null, S.copybtn) });
  await log("a link's tooltip", { title: await page.evaluate((s) => document.querySelector(s + " a")?.title ?? null, S.editor) });
  await R.selectBetween(page, "link", "link");
  await rest(page);
  await log("the Tag button's tooltip", { title: await page.evaluate((s) => document.querySelector(s)?.title ?? null, S.fmtTag) });
  await page.click(S.editor);
  const refuse = () => page.evaluate(() => { const c = navigator.clipboard; window.__clip = [c.write, c.writeText, document.execCommand]; c.write = () => Promise.reject(new Error("refused")); c.writeText = () => Promise.reject(new Error("refused")); document.execCommand = () => false; });
  const restore = () => page.evaluate(() => { const c = navigator.clipboard, [a, b, x] = window.__clip; c.write = a; c.writeText = b; document.execCommand = x; });
  await refuse();
  await page.keyboard.press("Control+Meta+c");
  await rest(page);
  await restore();
  await page.click(S.corner, { timeout: 1000 }).catch(() => {});
  await rest(page);
  await log("a failed copy's pin clicked", { clipboard: (await R.clipboardText(page)).replace(/\(#[^)]*\)/, "(…)") });
  await log("the tab's icon", { icon: await page.evaluate(() => !!document.querySelector("link[rel~='icon']")?.getAttribute("href")) });
  await go("page/Horace");
  await view(false);
  await page.click(".page-title, #pagetitle, .site-head, header", { timeout: 1000 }).catch(() => {});
  await page.evaluate(() => { const h = document.querySelector(".site-head, header"); if (h) { const r = document.createRange(); r.selectNodeContents(h); r.collapse(true); const s = document.getSelection(); s.removeAllRanges(); s.addRange(r); } });
  await page.keyboard.press("Control+Meta+s");
  await rest(page);
  await page.click(S.shortcutsInput, { timeout: 1000 }).catch(() => {});
  await page.keyboard.type("md");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("a shortcut chosen with no cursor in the entry", { corner: await corner(), unchanged: (await A.stored(page, "page/Horace")) === before });
  await page.keyboard.press("Escape");
  await write("page/Source Link", "x\n");
  await view(true);
  await R.sourceCaretTo(page, "x");
  await page.keyboard.press("End");
  await page.keyboard.press("Control+Meta+b");
  await rest(page);
  await page.click(".bookmark-link[aria-label='Link to Links']", { timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(400);
  await log("a bookmark's link in the markdown view", { md: (await stored()).replace(/\(#[^)]*\)/, "(…)") });
  await view(false);
  const slow = await ctx.newPage();
  await slow.goto(A.url("page/Horace", "warm=slow"));
  await rest(slow);
  await slow.keyboard.press("Control+Meta+k");
  await rest(slow);
  await slow.keyboard.type("atavis");
  await slow.waitForTimeout(400);
  const loading = await slow.evaluate((s) => [...document.querySelectorAll(s)].map((l) => l.textContent.trim()).join(" | ").slice(0, 40), S.searchRows);
  await slow.waitForTimeout(3500);
  await log("Search opened before the warm", { loading, rows: await slow.evaluate((s) => document.querySelectorAll(s + ".hit, " + s + ":not(.empty)").length > 0, S.searchRows) });
  /* the Go to row and the bookshelf, each opened on a fresh slow launch with the keys left in it */
  const options = () => slow.evaluate(() => [...document.querySelectorAll(".page-goto select, #pagegoto select")].reduce((n, s) => n + s.options.length, 0));
  await slow.goto(A.url("page/Horace", "warm=slow&again=1"));
  await rest(slow);
  await slow.keyboard.press("Control+Meta+j");
  await rest(slow);
  const gotoBefore = await options();
  await slow.waitForTimeout(3500);
  await log("Go to opened before the warm", { more: (await options()) > gotoBefore, focusInRow: await slow.evaluate(() => !!document.activeElement?.closest(".page-goto, #pagegoto")) });
  const shelf = () => slow.evaluate(() => { const p = document.querySelector(".pages, #bookspanel"); return p ? p.querySelectorAll("a").length : -1; });
  await slow.goto(A.url("page/Horace", "warm=slow&again=2"));
  await rest(slow);
  await slow.click(S.booksOpener, { timeout: 2000 }).catch(() => {});
  await rest(slow);
  await slow.evaluate(() => document.querySelector(".pages .panel-new, #bookspanel .panel-new")?.focus());
  await slow.mouse.move(5, 700);
  const shelfBefore = await shelf();
  await slow.waitForTimeout(3500);
  await log("the bookshelf opened before the warm, the keys on its button", { before: shelfBefore, after: await shelf(), keysOnButton: await slow.evaluate(() => !!document.activeElement?.matches(".panel-new")) });
  await slow.close();
    }],
    ["pill", async () => {
  if (A.pill) {
    await page.goto(A.url("page/Horace", "corner=pill"));
    await A.waitWarm(page);
    /* the pill is set after the launch's backup run, which ends after the
       warm: read on the warm alone, it was missed 1 run in 10 */
    await page.waitForFunction(() => document.querySelector(".backup-paused")?.hidden === false, null, { timeout: 5000 }).catch(() => {});
    await log("with ?corner=pill", await R.pill(page));
    if (shot) await page.screenshot({ path: shot.replace(/\.png$/, "-pill.png"), clip: { x: 500, y: 500, width: 500, height: 100 } });
  }
    }],
    ["a rename keeps a label's marks", async () => {
  /* last of all: the old app keeps a deleted page in its scope lists, so
     the pages seeded here would show in any section after */
  /* a hand-written label part italic, its entry renamed: the label keeps its marks */
  await A.foreignWrite(page, "page/Rename Host", "See [the *Ideas* page](#page/Rename%20Host/Ideas) here.\n");
  await A.foreignWrite(page, "page/Rename Host/Ideas", "ideas\n");
  await go("page/Rename%20Host");
  await go("page/Rename%20Host/Ideas");
  answer = "Plans";
  await page.click(S.renameSubPage);
  await A.waitEntry(page, "page/Rename Host/Plans", 5000).catch(() => {});
  for (let i = 0; i < 30 && !((await A.stored(page, "page/Rename Host")) || "").includes("/Plans"); i++) await rest(page);
  await log("renamed under a label part italic", { entry: await A.entry(page), host: ((await A.stored(page, "page/Rename Host")) || "").split("\n")[0] });
  answer = null;
    }],
    ["shelves", async () => {
  /* the bookshelf's shelves: an entry Shelves names them in order and the authors on each; the list heads each shelf and sets its authors in, the go-to box groups by shelf */
  await A.foreignWrite(page, "bookshelf/Shelves", "# Shelves\n\n## Latin\n- [Boethius](#bookshelf/Boethius)\n- [Browning](#bookshelf/Browning%2C%20Robert)\n\n## English\n");
  /* read back before the reload: a reload during the write's commit read the store without it */
  const seeded = await seededIn("bookshelf/Shelves");
  await page.goto(A.url("2026-09-06"));
  await A.waitEntry(page, "2026-09-06", 5000).catch(() => {});
  await page.click(S.booksOpener);
  /* the list is answered again when the store's read ends: the shelves come with it */
  const shelvesShown = await page.waitForSelector(".pages .shelf", { timeout: 5000 }).then(() => true, () => false);
  const list = () => page.evaluate(() => { const p = document.querySelector(".pages"); return p ? [...p.children].map((e) => (e.classList.contains("shelf") ? "## " : e.classList.contains("shelved") ? "  " : "") + e.textContent + (e.classList.contains("shelved") ? " @" + Math.round(parseFloat(getComputedStyle(e).paddingLeft)) : "")) : null; });
  await log("the bookshelf on its shelves", { seeded, shelvesShown, rows: await list() });
  await page.click(".pages button.panel-new:has-text('Shelves…')");
  await A.waitEntry(page, "bookshelf/Shelves", 5000).catch(() => {});
  await log("Shelves… clicked", { entry: await A.entry(page), panel: await R.panel(page) });
  /* a shelf renamed, the list opened at once: the list reads the text as typed */
  const latin = await R.wordAt(page, "Latin", 5);
  await page.mouse.dblclick(latin.x, latin.y);
  await rest(page);
  await page.keyboard.type("Classical");
  /* the bar the double-click floated hides once the typing has collapsed the selection: read before it went, the screen said so */
  await page.waitForFunction(() => !document.querySelector(".fmt")?.classList.contains("show"), null, { timeout: 2000 }).catch(() => {});
  await page.click(S.booksOpener);
  await page.waitForSelector(".pages .shelf", { timeout: 5000 }).catch(() => {});
  await log("a shelf renamed, the list opened at once", { rows: await list() });
  await page.keyboard.press("Escape");
  await go("2026-09-06");
  await page.keyboard.press("Control+Meta+j");
  await rest(page);
  const groups = (sel) => page.evaluate((sel) => [...document.querySelectorAll(sel + " optgroup")].map((g) => g.label + ": " + (g.label === "Pages" ? g.querySelectorAll("option").length + " pages" : [...g.querySelectorAll("option")].map((o) => o.textContent).join("|"))), sel);
  await log("the go-to box on its shelves", await groups(S.gotoDestination));
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+Meta+k");
  await page.waitForSelector(S.searchScope + " optgroup", { timeout: 5000 }).catch(() => {});
  await log("the search scopes on their shelves", await groups(S.searchScope));
  await page.selectOption(S.searchScope, { label: "All Classical" });
  /* a word only one author's book holds, then one only the other's: each found under the shelf */
  for (const q of ["uisu", "silk-mills"]) {
    await page.click(".page-search input");
    await page.keyboard.press("Meta+a");
    await page.keyboard.type(q);
    await page.waitForFunction((q) => document.querySelector(".page-search input")?.value === q, q, { timeout: 5000 }).catch(() => {});
    await page.waitForFunction((q) => { const li = [...document.querySelectorAll(".search-results li")]; return li.length > 0 && li.every((e) => e.innerText.toLowerCase().includes(q)); }, q, { timeout: 5000 }).catch(() => {});
    await log("searched " + q + " under All Classical", await page.evaluate(() => ({ scope: document.querySelector(".page-search select")?.selectedOptions[0]?.textContent, where: [...document.querySelectorAll(".search-results .where")].map((w) => w.textContent) })));
  }
  await page.keyboard.press("Escape");
    }],
    ["a work in stanzas", async () => {
  /* any work in stanza fences refers by stanza, with no directive: Hávamál, a root that names no author, its stanzas paired with a translation */
  await A.foreignWrite(page, "bookshelf/Havamal", "# Hávamál\n\n::: reference\nno author\n:::\n\n::: stanza 76\nDeyr fé | Cattle die,\ndeyja frændr | kinsmen die,\ndeyr sjálfr it sama | the self dies likewise;\nen orðstírr | but the renown\ndeyr aldregi | for the one who gets good fame\nhveim er sér góðan getr | dies never.\n:::\n\n::: stanza 77\nDeyr fé | Cattle die,\ndeyja frændr | kinsmen die,\ndeyr sjálfr it sama | the self dies likewise;\nek veit einn | I know one thing\nat aldri deyr | that never dies:\ndómr um dauðan hvern | the repute of each of the dead.\n:::");
  const seeded = await seededIn("bookshelf/Havamal");
  await page.goto(A.url("bookshelf/Havamal"));
  await A.waitEntry(page, "bookshelf/Havamal", 5000).catch(() => {});
  await R.settle(page);
  await R.selectBetween(page, "Deyr fé", "it sama");
  await R.waitBar(page);
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
  await log("⌃⌘R on three lines of a stanza", { seeded, lines: await R.clipboardLines(page) });
  await R.selectBetween(page, "orðstírr", "ek veit einn");
  await R.waitBar(page);
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
  await log("⌃⌘R across two stanzas", { lines: await R.clipboardLines(page) });
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  await page.keyboard.type("77.4");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("⌃⌘G 77.4", { ...(await R.linebar(page)), landedText: await R.landedText(page) });
  await page.keyboard.press("Escape");
    }],
    ["Old English verse", async () => {
  /* a work whose page says Old English verse refers to its half-lines: Beowulf 49-52, a root that names no author */
  await A.foreignWrite(page, "bookshelf/Beowulf", "# Beowulf\n\n::: reference\nno author\nOld English verse\n:::\n\n::: verse 49\ngeafon on garsecg;  him wæs geomor sefa,\nmurnende mod.  Men ne cunnon\nsecgan to soðe,  selerædende,\nhæleð under heofenum,  hwa þæm hlæste onfeng.\n:::");
  const seeded = await seededIn("bookshelf/Beowulf");
  await page.goto(A.url("bookshelf/Beowulf"));
  await A.waitEntry(page, "bookshelf/Beowulf", 5000).catch(() => {});
  await R.settle(page);
  await R.selectBetween(page, "Men ne cunnon", "onfeng");
  await R.waitBar(page);
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
  await log("⌃⌘R from a second half-line", { seeded, lines: await R.clipboardLines(page) });
  await R.selectBetween(page, "murnende", "mod");
  await R.waitBar(page);
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
  await log("⌃⌘R on a first half-line", { lines: await R.clipboardLines(page) });
  /* beside its translation the original is quoted from the half referred to, the translation whole */
  await A.foreignWrite(page, "bookshelf/Seafarer", "# The Seafarer\n\n::: reference\nno author\nOld English verse\n:::\n\n::: verse 80\ndream mid dugeþum.  Dagas sind gewitene, | joy with the Hosts. The days are gone\nealle onmedlan  eorþan rices; | of all the glory of the kingdoms of the earth;\nnearon nu cyningas  ne caseras | there are not now kings, nor Cæsars,\n:::");
  const paired = await seededIn("bookshelf/Seafarer");
  await page.goto(A.url("bookshelf/Seafarer"));
  await A.waitEntry(page, "bookshelf/Seafarer", 5000).catch(() => {});
  await R.settle(page);
  await R.selectBetween(page, "Dagas sind", "ealle onmedlan");
  await R.waitBar(page);
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
  await log("⌃⌘R from a second half-line beside its translation", { seeded: paired, lines: await R.clipboardLines(page) });
  await page.keyboard.press("Escape");
    }],
    ["split lines", async () => {
  /* a verse line split between speakers is one line (2026-10-20, asked): Samson 1563, "Relate by whom." / "By Samson." / "That still lessens", each rest a space past the end of the half above and numbered with it, the 1671 margin's 1570 and 1580 where they stand; typed into the first half, the rests follow it; ⌃⌘R on "By Samson." refers to 1563; a rest typed longer than its row has room for is set in less, not wrapped */
  await A.foreignWrite(page, "bookshelf/Milton, John/Samson Agonistes", fixture("samson-split-lines.md"));
  const seeded = await seededIn("bookshelf/Milton, John/Samson Agonistes");
  await page.goto(A.url("bookshelf/Milton%2C%20John/Samson%20Agonistes"));
  await A.waitEntry(page, "bookshelf/Milton, John/Samson Agonistes", 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  await log("split lines in Samson", { seeded, ...(await R.splitRests(page)) });
  await R.caretAfter(page, "Relate by whom", "Relate by whom".length);
  await page.keyboard.type(" then");
  await rest(page);
  await rest(page);
  await log("typed into the first half of a split line", await R.splitRests(page));
  await R.selectBetween(page, "By Samson", "By Samson");
  await R.waitBar(page);
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
  await log("⌃⌘R on the rest of a split line", { lines: await R.clipboardLines(page) });
  await page.keyboard.press("Escape");
  await R.caretAfter(page, "That still lessens", "That still lessens".length);
  await page.keyboard.type(" and converts the sorrow nigh to joy, and more");
  await rest(page);
  await rest(page);
  await log("a rest typed past its row's width", await R.splitRests(page));
    }],
    ["dual-language", async () => {
  /* Ovid's Latin beside Miller's prose (2026-10-22, asked): each sentence level with the row its Latin starts on, the Latin waiting where the English runs long, split lines set in (one opening a fence, past the half the fence before closes), a note under the column its mark is in, the English held to 30em; typed longer, a sentence still clears the next */
  await A.foreignWrite(page, "bookshelf/Ovid/Metamorphoses/Book 1", fixture("ovid-metamorphoses-1.md"));
  const seeded = await seededIn("bookshelf/Ovid/Metamorphoses/Book 1");
  await page.goto(A.url("bookshelf/Ovid/Metamorphoses/Book%201"));
  await A.waitEntry(page, "bookshelf/Ovid/Metamorphoses/Book 1", 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  await log("dual-language in Ovid", { seeded, ...(await R.dualLayout(page)) });
  await R.caretAfter(page, "Men call it Tempe", "Men call it Tempe".length);
  await page.keyboard.type(", a name the valley keeps to this day among the shepherds of Thessaly who drive their flocks along its river");
  await rest(page);
  await rest(page);
  await log("a sentence typed longer than its Latin", await R.dualLayout(page));
  await R.caretAfter(page, "remoter regions by its roar", "remoter regions by its roar".length);
  await page.keyboard.press("ArrowDown");
  await rest(page);
  await log("ArrowDown from a sentence's last line", { cell: await R.caretCell(page) });
  await page.keyboard.press("ArrowUp");
  await rest(page);
  await log("ArrowUp from a sentence's first line", { cell: await R.caretCell(page) });
  /* down the English column out of a block: to a note under the English, past a note under the Latin to the next block's first sentence, and up again */
  await R.caretAfter(page, "to a world o’erwhelmed.”", "to a world o’erwhelmed.”".length);
  await page.keyboard.press("ArrowDown");
  await rest(page);
  await log("ArrowDown from a sentence above a note under the English", { cell: await R.caretCell(page) });
  await R.caretAfter(page, "Her gleaming beauty alone remained.", "Her gleaming beauty alone remained.".length);
  await page.keyboard.press("ArrowDown");
  await rest(page);
  await log("ArrowDown from a block's last sentence", { cell: await R.caretCell(page) });
  await page.keyboard.press("ArrowUp");
  await rest(page);
  await log("ArrowUp from a block's first sentence", { cell: await R.caretCell(page) });
  /* a line the Loeb leaves out but counts (2026-10-23, asked): nothing drawn, the line after it 547 (qua nimium placui), and ⌃⌘G for 546 lands there saying so */
  await log("a skipped line number", await page.evaluate(() => { const row = [...document.querySelectorAll("#editor .vrow")].find((r) => r.textContent.startsWith("qua nimium placui")); return { line: row?.dataset.line ?? null, before: row?.previousElementSibling?.className, drawn: row?.previousElementSibling ? getComputedStyle(row.previousElementSibling).display : null }; }));
  await A.stored(page);   /* a save landing after the Enter takes the corner from the word this reads */
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  await page.keyboard.type("546");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("⌃⌘G for a skipped line", { ...(await R.linebar(page)), landed: (await R.landedText(page))?.slice(0, 30) ?? null });
  await page.keyboard.press("Escape");
  await rest(page);
  /* a drag over one sentence's English (2026-11-02, asked): it selects that sentence alone, the Latin it stands beside marked as selected, and ⌃⌘R refers to and quotes that Latin */
  await R.dragCell(page, "Through this the River Peneus");
  await rest(page);
  await log("a drag over one sentence's English", await R.dualSelection(page));
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
  await log("⌃⌘R on one sentence's English", { lines: await R.clipboardLines(page) });
  await page.keyboard.press("Escape");
  await rest(page);
  /* quoted, the block stays dual-language (2026-10-23, asked): two Latin lines beside a six-line sentence keep together, the English held inside the quotation */
  await R.selectBetween(page, "ut canis in vacuo", "ille salutem;");
  await R.waitBar(page);
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
  const quoted = await R.clipboardLines(page);
  await page.keyboard.press("Escape");
  await go("page/Quoted%20Ovid");
  await page.click(S.editor);
  await page.keyboard.press("Meta+v");
  const fitted = await page.waitForFunction(() => document.querySelector("#editor .ProseMirror.fitted"), null, { timeout: 3000 }).then(() => true, () => false);
  /* the fit's settle, the app's own clock */
  await page.waitForTimeout(600);
  await rest(page);
  await log("⌃⌘R across a long sentence, pasted", { lines: quoted, fitted, ...(await R.dualQuote(page)) });
  /* a dual-language block in a note (2026-11-02, asked): Satire 1.10's bracketed lines, their English at the page's English edge, each note under its own column, the Latin unwrapped */
  await A.foreignWrite(page, "bookshelf/Horace/Satires/1.10", fixture("horace-satires-1.10.md"));
  await page.goto(A.url("bookshelf/Horace/Satires/1.10"));
  await A.waitEntry(page, "bookshelf/Horace/Satires/1.10", 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  await log("a dual-language block in a note", await R.dualInset(page));
    }],
    ["facing numbers", async () => {
  /* Ovid's Latin beside Golding's verse (2026-10-23, asked): a verse block numbered on both sides, Golding's numbers drawn on the right; a row with nothing on the left takes no Latin number; ⌃⌘G goes by Golding's numbers; ⌃⌘R refers to both */
  await A.foreignWrite(page, "bookshelf/Ovid/Metamorphoses (with Golding’s translation)", "# *Metamorphoses* (with Golding’s translation)\n\n- [Book 7](#bookshelf/Ovid/Metamorphoses%20(with%20Golding%E2%80%99s%20translation)/Book%207)\n");
  await A.foreignWrite(page, "bookshelf/Ovid/Metamorphoses (with Golding’s translation)/Book 7", fixture("ovid-golding-7.md"));
  await page.goto(A.url("bookshelf/Ovid/Metamorphoses%20(with%20Golding%E2%80%99s%20translation)/Book%207"));
  await A.waitEntry(page, "bookshelf/Ovid/Metamorphoses (with Golding’s translation)/Book 7", 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  await log("a verse block numbered on both sides", await page.evaluate(() => {
    const block = document.querySelector("#editor .verse[data-facing]");
    if (!block) return { block: false };
    const rows = [...block.querySelectorAll(":scope > .vrow")];
    const lines = (el) => { const g = document.createRange(); g.selectNodeContents(el); return new Set([...g.getClientRects()].filter((x) => x.width).map((x) => Math.round(x.top))).size; };
    const golding = rows.map((r) => r.querySelector(".vcell + .vcell")).filter(Boolean);
    const widest = Math.max(...golding.map((c) => { const g = document.createRange(); g.selectNodeContents(c); return g.getBoundingClientRect().right; }));
    const first = rows.find((r) => r.classList.contains("rshown"));
    const after = first ? getComputedStyle(first, "::after") : null;
    return {
      fitted: !!document.querySelector("#editor .ProseMirror.fitted"),
      rows: rows.length,
      left: rows.filter((r) => r.classList.contains("shown")).map((r) => r.dataset.line).join(" "),
      right: rows.filter((r) => r.classList.contains("rshown")).map((r) => r.dataset.facing).join(" "),
      unnumbered: rows.filter((r) => r.dataset.facing && !r.dataset.line).map((r) => r.dataset.facing).join(" "),
      drawn: after ? after.content : null,
      clear: after ? Math.round(first.getBoundingClientRect().left + parseFloat(after.left) - widest) : null,
      wrapped: rows.filter((r) => [...r.querySelectorAll(".vcell")].concat(r.classList.contains("vpair") ? [] : [r]).some((c) => lines(c) > 1)).length,
    };
  }));
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  await page.keyboard.type("265");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("⌃⌘G for a Golding line", { ...(await R.linebar(page)), landed: (await R.landedText(page))?.slice(0, 40) ?? null });
  await page.keyboard.press("Escape");
  await rest(page);
  await R.selectBetween(page, "Ye Ayres and windes", "darkes the Sun at Noone.");
  await R.waitBar(page);
  const refAll = () => page.evaluate(() => { const b = document.querySelector(".fmt button[title='Copy a reference to both columns']"); return b ? !b.hidden && getComputedStyle(b).display !== "none" : null; });
  const shown = await refAll();
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
  const lines = await R.clipboardLines(page);
  await log("⌃⌘R across Prospero's borrowing", { label: lines[0], fence: lines.find((l) => l.includes(":::")), first: lines.find((l) => l.startsWith("> ") && !l.includes(":::")) ?? null, rows: lines.length, refAll: shown });
  await page.evaluate(() => document.querySelector(".fmt button[title='Copy a reference to both columns']")?.click());
  await rest(page);
  const all = await R.clipboardLines(page);
  await page.keyboard.press("Escape");
  await rest(page);
  await R.selectBetween(page, "Jason", "Medea");
  await R.waitBar(page);
  await rest(page);
  await log("Ref (all) across Prospero's borrowing", { label: all[0], fence: all.find((l) => l.includes(":::")), rows: all.length, refAllOverHeading: await refAll() });
  await page.keyboard.press("Escape");
    }],
    ["scripture's Verse box", async () => {
  /* a Bible's chapters are asked by verse, whichever block they are set in */
  for (const [root, fence] of [["KJV", "::: verse numbered\nIn the beginning.\nAnd the earth.\nAnd God said.\n:::"], ["Douay-Rheims", "::: prose numbered\nIn principio. | In the beginning.\nTerra autem. | And the earth.\nDixitque Deus. | And God said.\n:::"]]) {
    const chapter = "bookshelf/" + root + "/Genesis/1";
    await A.foreignWrite(page, "bookshelf/" + root, "# " + root + "\n\n::: reference\nscripture\n:::\n");
    await A.foreignWrite(page, "bookshelf/" + root + "/Genesis", "# Genesis\n");
    await A.foreignWrite(page, chapter, "# Genesis 1\n\n" + fence + "\n");
    await page.goto(A.url(chapter));
    await A.waitEntry(page, chapter, 5000).catch(() => {});
    await R.settle(page);
    await rest(page);
    await page.keyboard.press("Control+Meta+g");
    await rest(page);
    await page.keyboard.type("2");
    await page.keyboard.press("Enter");
    await rest(page);
    await log("⌃⌘G 2 in " + root, { box: await page.evaluate(() => document.querySelector("label[for=lineinput]").textContent), landedOn: await page.evaluate(() => document.querySelector("#editor .landed")?.textContent.slice(0, 24) ?? null) });
    await page.keyboard.press("Meta+a");
    await page.keyboard.type("99");
    await page.keyboard.press("Enter");
    await rest(page);
    await log("⌃⌘G 99 in " + root, { said: await page.evaluate(() => document.querySelector(".saved.show")?.textContent ?? null) });
    await page.keyboard.press("Escape");
    await rest(page);
  }
    }],
    ["by book, chapter, and paragraph", async () => {
  /* the Line box takes a paragraph on such a work, and ⌃⌘R names the book, the chapter and the paragraph */
  const work = "bookshelf/Augustine/De Doctrina Christiana", book = work + "/Book 2";
  await A.foreignWrite(page, "bookshelf/Augustine", "# Augustine\n");
  await A.foreignWrite(page, work, "# De Doctrina Christiana\n\n::: reference\nby book, chapter, and paragraph\n:::\n");
  await A.foreignWrite(page, book, "# Book 2\n\n## Chapter 40\n\n::: prose 60\n60. Philosophi autem. | 60. Moreover the philosophers.\nSicut enim Aegyptii. | For as the Egyptians.\n\n61. Nam quid aliud. | 61. And what else.\n:::\n\n## Chapter 41\n\n::: prose 62\n62. Meminerint ergo. | 62. Let them remember.\n:::\n");
  await page.goto(A.url(book.replace(/ /g, "%20")));
  await A.waitEntry(page, book, 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  const landed = () => page.evaluate(() => document.querySelector("#editor .landed")?.textContent.slice(0, 24) ?? null);
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  await page.keyboard.type("61");
  await page.keyboard.press("Enter");
  await rest(page);
  const boxLabel = () => page.evaluate(() => document.querySelector("label[for=lineinput]").textContent);
  await log("⌃⌘G 61 on a work by paragraph", { ...(await R.linebar(page)), landedOn: await landed(), box: await boxLabel() });
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("61x");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("⌃⌘G 61x on a work by paragraph", { said: await page.evaluate(() => document.querySelector(".saved.show")?.textContent ?? null) });
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("99");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("⌃⌘G 99 on a work by paragraph", { landedOn: await landed(), said: await page.evaluate(() => document.querySelector(".saved.show")?.textContent ?? null) });
  await page.keyboard.press("Escape");
  await rest(page);
  await page.evaluate(() => { const w = document.createTreeWalker(document.querySelector("#editor .ProseMirror"), NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const i = n.data.indexOf("Nam quid aliud"); if (i >= 0) { getSelection().setBaseAndExtent(n, i, n, i + 14); break; } } });
  await rest(page);
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
  await log("⌃⌘R on a work by paragraph", { label: await page.evaluate(async () => { for (let i = 0; i < 40; i++) { const t = await navigator.clipboard.readText().catch(() => ""); if (t.includes("Augustine")) return t.split("\n")[0].replace(/\]\(#[^)]*\)/, "]"); await new Promise((r) => setTimeout(r, 50)); } return "not landed"; }) });
  await page.evaluate(() => { location.hash = "#page/Horace"; });
  await R.settle(page);
  await rest(page);
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  await log("⌃⌘G on the next page after a work by paragraph", { open: await page.evaluate(() => !document.querySelector(".linebar").hidden), box: await boxLabel() });
  await page.evaluate((h) => { location.hash = h; }, "#" + book.replace(/ /g, "%20"));
  await A.waitEntry(page, book, 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  await log("back on a work by paragraph", { open: await page.evaluate(() => !document.querySelector(".linebar").hidden), box: await boxLabel() });
  await page.keyboard.press("Escape");
  await rest(page);
    }],
    ["a link to a line", async () => {
  /* an address naming a line marks it as ⌃⌘G does: no selection, no format bar, and gone at the next press */
  const work = "bookshelf/Statius", book = work + "/Book 1", href = "#bookshelf/Statius/Book%201?line=";
  await A.foreignWrite(page, work, "# Statius\n\n- [To line 3](" + href + "3)\n");
  await A.foreignWrite(page, book, "# Book 1\n\n::: note\n[3-4](" + href + "3) and [nowhere](" + href + "99)\n:::\n\n::: verse\none\ntwo\n:::\n\n::: verse 3\nthree\nfour\n:::\n\n[Five](" + href + "5)\n\n::: dual-language 5\nquinque | Five, a sentence that runs on over the lines it translates.\nsex\nseptem\n:::\n");
  await page.goto(A.url(book.replace(/ /g, "%20")));
  await A.waitEntry(page, book, 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  const seen = () => page.evaluate(() => ({ landed: document.querySelector("#editor .landed")?.textContent ?? null, selected: getSelection().toString(), address: location.hash.split("?")[1] ?? null, said: document.querySelector(".saved.show")?.textContent ?? null }));
  const click = async (text) => { await page.locator("#editor a", { hasText: text }).first().click(); await rest(page); await rest(page); };
  await click("3-4");
  await log("a link to a line, clicked", await seen());
  await page.locator("#editor .vrow", { hasText: "one" }).first().click();
  await rest(page);
  await log("a link to a line, the next click", await seen());
  await click("3-4");
  await log("a link to a line, clicked again", await seen());
  await page.keyboard.press("ArrowDown");
  await rest(page);
  await log("a link to a line, the next key", await seen());
  await click("nowhere");
  await log("a link to a line the page lacks", await seen());
  await click("Five");
  await log("a link to a line in a dual-language block", await page.evaluate(() => { const r = document.querySelector("#editor .landed"), on = (e) => getComputedStyle(e).backgroundColor !== "rgba(0, 0, 0, 0)"; return { row: on(r), latin: on(r.children[0]), english: on(r.children[1]), latinText: r.children[0].textContent }; }));
  await page.goto(A.url(work));
  await A.waitEntry(page, work, 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  await click("To line 3");
  await A.waitEntry(page, book, 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  await rest(page);
  await log("a link to a line, from another page", await seen());
  const top = () => page.evaluate(() => { const s = getSelection(); return { row: s.anchorNode?.parentElement?.closest(".vrow")?.textContent ?? null, focused: document.activeElement?.closest("#editor") ? "the text" : "elsewhere" }; });
  await page.keyboard.press("Meta");
  await rest(page);
  await page.keyboard.press("Meta+c");
  await rest(page);
  await log("a link to a line, a bare modifier and a copy", await seen());
  await log("a link to a line, the caret after arriving", await top());
  await page.keyboard.press("ArrowDown");
  await rest(page);
  await log("a link to a line, a key after arriving", { ...(await seen()), ...(await top()) });
  /* a stanza: the same words name the same place as the bar, and an omitted line says so */
  const stanzas = "bookshelf/Statius/Stanzas", skips = "bookshelf/Statius/Skips";
  await A.foreignWrite(page, stanzas, "# Stanzas\n\n[2.1](#bookshelf/Statius/Stanzas?line=2.1) [2](#bookshelf/Statius/Stanzas?line=2)\n\n::: stanza 1\nalpha\nbeta\n:::\n\n::: stanza 2\ngamma\ndelta\n:::\n");
  await A.foreignWrite(page, skips, "# Skips\n\n[2](#bookshelf/Statius/Skips?line=2)\n\n::: verse\nfirst\n⟨skipped line number⟩\nthird\n:::\n");
  await page.goto(A.url(stanzas));
  await A.waitEntry(page, stanzas, 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  await click("2.1");
  await log("a link to a stanza, and line", await seen());
  await page.goto(A.url(skips));
  await A.waitEntry(page, skips, 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  await click("2");
  await log("a link to an omitted line", await seen());
  /* no press between two landings: the second keeps its mark */
  await page.goto(A.url(book.replace(/ /g, "%20") + "?line=3"));
  await A.waitEntry(page, book, 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  await rest(page);
  await page.evaluate((h) => { location.hash = h; }, href + "5");
  await rest(page);
  await rest(page);
  await rest(page);
  await log("a link to a line, then another with no press", await seen());
  /* opened before the warm: the work's own page says how it counts, and a rename follows */
  const work2 = "bookshelf/Augustine/De Doctrina Christiana/Book 2";
  await page.goto(A.url(work2.replace(/ /g, "%20") + "?line=61", "warm=slow"));
  await A.waitEntry(page, work2, 8000).catch(() => {});
  await R.settle(page);
  await page.waitForFunction(() => document.querySelector("#editor .landed"), null, { timeout: 8000 }).catch(() => {});
  await rest(page);
  await log("a link to a paragraph before the warm", await page.evaluate(() => ({ landed: document.querySelector("#editor .landed")?.textContent.slice(0, 24) ?? null })));
  /* a key before the warm: the landing owed is dropped, the warm's two seconds timed by the app's own clock */
  await page.goto(A.url(work2.replace(/ /g, "%20") + "?line=61", "warm=slow"));
  await A.waitEntry(page, work2, 8000).catch(() => {});
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(2600);
  await log("a key before the warm", await page.evaluate(() => ({ landed: document.querySelector("#editor .landed")?.textContent.slice(0, 24) ?? null })));
    }],
    ["a lettered line", async () => {
  /* a row saying its own number, 157a: every kind it can stand as, the gutter at every interval, the box, a link and a reference */
  const work = "bookshelf/Statius/Thebaid", key = work + "/Book 8", href = "#bookshelf/Statius/Thebaid/Book%208?line=";
  await A.foreignWrite(page, "bookshelf/Statius", "# Statius\n");
  await A.foreignWrite(page, work, "# Thebaid\n");
  await A.foreignWrite(page, key, "# Book 8\n\n[To the letter](" + href + "157a)\n\n::: dual-language 155\nquintus | Five, a sentence that runs on down beside the lines after it, and past them.\nsextus\nseptimus\n⟨line 157a⟩littera sola\n⟨line 157b⟩littera par | Its own English.\noctavus\n:::\n\n::: verse 200\nplanus\n⟨line 200a⟩littera in versu\n:::\n");
  const open = async () => { await page.goto(A.url(key.replace(/ /g, "%20"))); await A.waitEntry(page, key, 5000).catch(() => {}); await R.settle(page); await rest(page); await rest(page); };
  await open();
  const LINES = ".page-lines select, #pagelines select";
  const setLines = (v) => page.evaluate(([s, v]) => { const e = document.querySelector(s); if (!e) return false; e.value = v; e.dispatchEvent(new Event("change", { bubbles: true })); return true; }, [LINES, v]);
  const gutter = () => page.evaluate(() => [...document.querySelectorAll("#editor .ln")].map((r) => getComputedStyle(r, "::before").content.replace(/"/g, "")).filter((c) => c && c !== "none"));
  await log("the gutter at the page's setting", { drawn: await gutter() });
  await page.keyboard.press("Control+Meta+l");
  await rest(page);
  const was = await page.evaluate((s) => document.querySelector(s)?.value ?? null, LINES);
  await setLines("0");
  await rest(page);
  await log("the gutter with no numbering", { interval: await page.evaluate((s) => document.querySelector(s)?.value ?? null, LINES), drawn: await gutter() });
  await setLines(was);
  await rest(page);
  await page.keyboard.press("Escape");
  await rest(page);
  const seen = () => page.evaluate(() => { const m = document.querySelector("#editor .landed"), widest = Math.max(...[...document.querySelectorAll("#editor .verse.dual-language > .vpair")].map((p) => p.getBoundingClientRect().width)); return { landed: m?.textContent ?? null, label: m?.dataset.line ?? null, band: m ? (m.closest(".dual-language") ? Math.abs(m.getBoundingClientRect().width - widest) < 1 : null) : null, said: document.querySelector(".saved.show")?.textContent || null }; });
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  const ask = async (n) => { await page.keyboard.press("Meta+a"); await page.keyboard.type(n); await page.keyboard.press("Enter"); await rest(page); return seen(); };
  await log("⌃⌘G 157a, a lettered line with no English", await ask("157a"));
  await log("⌃⌘G 157, the line before it", await ask("157"));
  await log("⌃⌘G 157b, a lettered line with its own English", await ask("157b"));
  await log("⌃⌘G 158, the line after them", await ask("158"));
  await log("⌃⌘G 200a, a lettered line of plain verse", await ask("200a"));
  await log("⌃⌘G 157c, a letter the page lacks", await ask("157c"));
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("157a");
  await page.keyboard.press("Enter");
  await rest(page);
  await page.keyboard.press("Escape");
  await rest(page);
  await page.keyboard.press("Shift+Meta+ArrowRight");
  await rest(page);
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
  await log("⌃⌘R on a lettered line", { lines: await R.clipboardLines(page) });
  await open();
  await page.locator("#editor a", { hasText: "To the letter" }).first().click();
  await rest(page);
  await rest(page);
  await log("a link to a lettered line", { ...(await seen()), address: await page.evaluate(() => location.hash.split("?")[1] ?? null) });
    }],
    ["a bracketed line", async () => {
  /* a line printed moved under its old number in brackets: drawn with it, asked with it, the plain number the plain line's */
  const key = "bookshelf/Statius/Thebaid/Book 16";
  await A.foreignWrite(page, "bookshelf/Statius", "# Statius\n");
  await A.foreignWrite(page, "bookshelf/Statius/Thebaid", "# Thebaid\n");
  await A.foreignWrite(page, key, "# Book 16\n\n[To the bracket](#bookshelf/Statius/Thebaid/Book%2016?line=[378])\n\n::: dual-language 370\nseptuagesimus | Seventy, a sentence that runs on down beside the lines after it, and past them.\nunus\n⟨line [378]⟩translata prima\n⟨line [379]⟩translata altera\n:::\n\n::: dual-language 375\nquintus | Five\nsextus\nseptimus\noctavus\n:::\n");
  const open = async () => { await page.goto(A.url(key.replace(/ /g, "%20"))); await A.waitEntry(page, key, 5000).catch(() => {}); await R.settle(page); await rest(page); await rest(page); };
  await open();
  await log("the gutter by a bracketed line", { drawn: await page.evaluate(() => [...document.querySelectorAll("#editor .ln")].map((r) => getComputedStyle(r, "::before").content.replace(/"/g, "")).filter((c) => c && c !== "none")) });
  const seen = () => page.evaluate(() => { const m = document.querySelector("#editor .landed"), widest = Math.max(...[...document.querySelectorAll("#editor .verse.dual-language > .vpair")].map((p) => p.getBoundingClientRect().width)); return { landed: m?.textContent ?? null, label: m?.dataset.line ?? null, band: m ? Math.abs(m.getBoundingClientRect().width - widest) < 1 : null, said: document.querySelector(".saved.show")?.textContent || null }; });
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  const ask = async (n) => { await page.keyboard.press("Meta+a"); await page.keyboard.type(n); await page.keyboard.press("Enter"); await rest(page); return seen(); };
  await log("⌃⌘G [378], a bracketed line", await ask("[378]"));
  await log("⌃⌘G 378, the plain line of that number", await ask("378"));
  await log("⌃⌘G 372, a number not printed", await ask("372"));
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("[379]");
  await page.keyboard.press("Enter");
  await rest(page);
  await page.keyboard.press("Escape");
  await rest(page);
  await page.keyboard.press("Shift+Meta+ArrowRight");
  await rest(page);
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
  await log("⌃⌘R on a bracketed line", { lines: await R.clipboardLines(page) });
  await open();
  await page.locator("#editor a", { hasText: "To the bracket" }).first().click();
  await rest(page);
  await rest(page);
  await log("a link to a bracketed line", { ...(await seen()), address: await page.evaluate(() => decodeURI(location.hash.split("?")[1] ?? "")) });
    }],
    ["a line with no English of its own", async () => {
  /* the mark is the row's band across both columns on every row of a dual-language block, the rows the English runs down beside included; nothing moves */
  const band = "bookshelf/Statius/Band";
  await A.foreignWrite(page, "bookshelf/Statius", "# Statius\n");
  await A.foreignWrite(page, band, "# Band\n\n[The second](#bookshelf/Statius/Band?line=2)\n\n::: dual-language\nprimus | First, a sentence that runs on down over the lines it translates, and past them.\nsecundus, a Latin line long enough to measure\ntertius\n:::\n");
  await page.goto(A.url(band));
  await A.waitEntry(page, band, 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  await rest(page);
  const geometry = () => page.evaluate(() => {
    const rows = [...document.querySelectorAll("#editor .verse.dual-language > .vrow")], [pair, row] = rows, r = document.createRange();
    r.selectNodeContents(row);
    const words = r.getBoundingClientRect(), box = row.getBoundingClientRect(), whole = pair.getBoundingClientRect();
    return { words: Math.round(words.width), wordsTop: Math.round(words.top - whole.top), rows: rows.map((x) => Math.round(x.getBoundingClientRect().height)), acrossBoth: Math.abs(box.left - whole.left) < 1 && Math.abs(box.right - whole.right) < 1, marked: row.classList.contains("landed") };
  });
  await log("a line with no English, unmarked", await geometry());
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  await page.keyboard.type("2");
  await page.keyboard.press("Enter");
  await rest(page);
  await log("⌃⌘G to a line with no English", await geometry());
  await page.keyboard.press("Escape");
  await rest(page);
  await page.goto(A.url(band));
  await A.waitEntry(page, band, 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  await page.locator("#editor a", { hasText: "The second" }).first().click();
  await rest(page);
  await rest(page);
  await log("a link to a line with no English", await geometry());
    }],
    ["the block a line is in", async () => {
  /* the corner names the block only where the number is in more than one */
  const twice = "bookshelf/Statius/Twice";
  await A.foreignWrite(page, "bookshelf/Statius", "# Statius\n");
  await A.foreignWrite(page, twice, "# Twice\n\n::: verse\nalpha\nbeta\n:::\n\n::: verse\ngamma\n:::\n");
  await page.goto(A.url(twice));
  await A.waitEntry(page, twice, 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  const ask = async (n) => {
    if (n) { await page.keyboard.press("Meta+a"); await page.keyboard.type(n); }
    await page.keyboard.press("Enter");
    await rest(page);
    return { ...(await R.linebar(page)), landed: await R.landedText(page) };
  };
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  await log("⌃⌘G for a line in one of two blocks", await ask("2"));
  await log("⌃⌘G for a line in both blocks", await ask("1"));
  await log("Enter again for a line in both blocks", await ask(""));
  await log("⌃⌘G past the last line where blocks repeat a number", await ask("9"));
  await page.keyboard.press("Escape");
  await rest(page);
    }],
    ["a page moved with its sub-pages", async () => {
  /* Rename on a page whose sub-pages hold text asks where; an address in the bookshelf moves it there with its picture, its text after the text there, a sub-page there already by its title deleted, its links going to that one; a link from elsewhere follows */
  await A.foreignWrite(page, "bookshelf/Mover, Test", "# Test Mover\n");
  await A.foreignWrite(page, "bookshelf/Mover, Test/Essays", "# Essays\n\n[The Twin](#bookshelf/Mover%2C%20Test/Essays/2022-twin)\n");
  await A.foreignWrite(page, "bookshelf/Mover, Test/Essays/2022-twin", "# The Twin\n\nThe longer copy.\n");
  await A.foreignWrite(page, "page/Move Source", "[Essay](#page/Move%20Source/Essay)\n");
  await A.foreignWrite(page, "page/Move Source/2026-twin", "# The Twin\n\nThe shorter copy.\n");
  await A.foreignWrite(page, "page/Move Links", "See [the essay](#page/Move%20Source/Essay?line=1) and [the twin](#page/Move%20Source/2026-twin).\n");
  await go("page/Move%20Source/Essay");
  await page.click(S.editor);
  await page.keyboard.type("An essay with a picture: ");
  await R.pastePng(page);
  await R.waitImg(page);
  await R.waitCorner(page, "saved");
  await go("page/Move%20Source");
  answer = ["bookshelf/Mover, Test/Essays"];
  prompts.length = 0;
  confirms.length = 0;
  await page.click(S.renameSubPage);
  await page.waitForFunction((s) => /moved to/.test(document.querySelector(s)?.textContent || ""), S.corner, { timeout: 5000 }).catch(() => {});
  const there = (k) => A.stored(page, "bookshelf/Mover, Test/Essays" + k);
  await log("Rename, an address in the bookshelf typed, Enter, the confirm accepted", {
    prompts: prompts.slice(), confirms: confirms.slice(), entry: await A.entry(page), hash: page.url().split("#")[1], corner: await cornerText(),
    there: await there(""), essay: await there("/Essay"), twin: await there("/2022-twin"), links: await A.stored(page, "page/Move Links"),
    left: [await A.stored(page, "page/Move Source"), await A.stored(page, "page/Move Source/Essay"), await A.stored(page, "page/Move Source/2026-twin")],
  });
  await go("bookshelf/Mover%2C%20Test/Essays/Essay");
  await R.waitImg(page).catch(() => {});
  await page.waitForFunction(() => { const i = document.querySelector("#editor img"); return i && (i.naturalWidth || i.dataset.missing); }, null, { timeout: 5000 }).catch(() => {});
  await log("the moved essay, its picture", { entry: await A.entry(page), missing: await page.evaluate(() => document.querySelector("#editor img")?.dataset.missing || null), ...(await R.picture(page).catch(() => ({}))) });
    }],
  ];
  /* each section starts from the one window, in front, nothing open over
     it: windows a section left open held the focus, and a click in the
     next section moved no caret (2026-10-05, the author-filing record) */
  const settle = async () => {
    for (const p of page.context().pages()) if (p !== page) await p.close().catch(() => {});
    await page.bringToFront();
    await page.keyboard.press("Escape").catch(() => {});
  };
  /* TIMING=1: each section's time and the fixed waits within it, to stderr */
  const timing = process.env.TIMING ? [] : null;
  let slept = 0;
  const counted = new Set();
  let expired = 0;
  const sites = {};
  const lapses = {};
  const count = (p) => {
    if (counted.has(p)) return; counted.add(p);
    const w = p.waitForTimeout.bind(p); p.waitForTimeout = (ms) => { slept += ms; const at = (new Error().stack.split("\n").filter((l) => /helium-steps|adapters/.test(l))[1] || "").replace(/.*\/(tools\/[^:]+:\d+).*/, "$1"); sites[at] = (sites[at] || 0) + ms; return w(ms); };
    const f = p.waitForFunction.bind(p);
    p.waitForFunction = async (...a) => { const t = Date.now(); try { return await f(...a); } catch (e) { const ms = Date.now() - t; expired += ms; const k = section + " · " + String(a[0]).slice(0, 70).replace(/\s+/g, " "); lapses[k] = (lapses[k] || 0) + ms; throw e; } };
  };
  if (timing) { for (const p of ctx.pages()) count(p); ctx.on("page", count); }
  for (const [name, fn] of sections) {
    if (opts.only && name !== sections[0][0] && !opts.only.includes(name)) continue;
    const t0 = Date.now(), s0 = slept;
    await settle();
    section = name;
    try { await fn(); }
    catch (e) { console.log("SECTION FAILED (" + name + "): " + String(e).split("\n")[0].slice(0, 200)); }
    if (timing) timing.push([name, Date.now() - t0, slept - s0]);
  }
  if (timing) {
    for (const [n, ms, w] of timing.sort((a, b) => b[1] - a[1])) console.error(String(Math.round(ms / 100) / 10).padStart(6) + "s " + String(Math.round(w / 100) / 10).padStart(6) + "s waits  " + n);
    console.error("total " + timing.reduce((a, t) => a + t[1], 0) / 1000 + "s, fixed waits " + slept / 1000 + "s");
    for (const [k, ms] of Object.entries(sites).sort((a, b) => b[1] - a[1]).slice(0, 30)) console.error("sleep " + String(ms / 1000).padStart(6) + "s  " + k);
    console.error("condition waits run out: " + expired / 1000 + "s");
    for (const [k, ms] of Object.entries(lapses).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.error(String(ms / 1000).padStart(7) + "s  " + k);
  }
}
