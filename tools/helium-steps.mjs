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
  const prompts = [];
  page.on("dialog", (d) => {
    if (d.type() === "confirm") { d.accept(); return; }
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
  await page.waitForTimeout(100);
  await log("after ⌃⌘, on the first entry", await R.corner(page));
  await go("page/Links");
  await page.click(S.editorLink("#page/Links"));
  await page.waitForTimeout(200);
  await log("a link to itself", { entry: await A.entry(page), ...(await R.corner(page)) });
  await page.click(S.editorLink("https://example.org/"));
  await page.waitForTimeout(200);
  await log("a plain click on an external link", { entry: await A.entry(page), url: page.url().split("#")[1] });
  const popup = ctx.waitForEvent("page", { timeout: 5000 }).then((p) => p.url(), () => "(no new tab)");
  await page.click(S.editorLink("#page/Horace"), { modifiers: ["Meta"] });
  await page.waitForTimeout(200);
  await log("⌘-click on an internal link", { newTab: (await popup).split("#")[1], ...(await R.afterModClick(page)) });
  const popup2 = ctx.waitForEvent("page", { timeout: 5000 }).then((p) => p.url(), () => "(no new tab)");
  await page.click(S.editorLink("https://example.org/"), { modifiers: ["Meta"] });
  await page.waitForTimeout(200);
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
  await page.waitForTimeout(100);
  await R.caretAfter(page, "start end", 5);
  await page.waitForTimeout(100);
  await R.pasteText(page, "::: verse\nHeil! Heil! | Hail! Hail!\nErlösung | Salvation\n:::");
  await page.waitForTimeout(200);
  await log("a fence pasted as text mid-paragraph", { md: await A.stored(page) });
    }],
    ["verse copy", async () => {
  /* a verse block copied inside the rendered view with ⌘C and pasted into a fresh page with ⌘V comes back as the block */
  await go("page/Horace");
  await R.selectAll(page, S.editorVerse);
  await page.waitForTimeout(100);
  await page.keyboard.press("Meta+c");
  await go("page/Pasted%20Verse");
  await page.click(S.editor);
  await page.keyboard.press("Meta+v");
  await page.waitForTimeout(300);
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
  await page.waitForTimeout(150);
  await log("a refused fence", await R.refusedFence(page));
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source);
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("::: verse\nline\n:::");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor);
  await page.waitForTimeout(150);
  await log("a clean switch", await R.cleanSwitch(page));
    }],
    ["quote tab", async () => {
  /* Tab in a quote nests, Shift-Tab lifts, again at the floor says so; ⌃⌘L opens the Line numbering row over verse */
  await go("page/Quoted");
  await page.click(S.editor);
  await page.keyboard.type("> quoted words");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(150);
  await log("Tab in a quote", { md: await A.stored(page) });
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await page.waitForTimeout(150);
  await log("Shift-Tab twice", { md: await A.stored(page), corner: await R.cornerText(page) });
  await go("page/Horace");
  await page.keyboard.press("Control+Meta+l");
  await page.waitForTimeout(100);
  await log("⌃⌘L over Horace", await R.linesRow(page));
  await page.keyboard.press("Escape");
  await log("Escape", await R.linesRowOpen(page));
    }],
    ["reference copy", async () => {
  /* the rich flavour: ⌃⌘R over a selection in a paired verse block writes markdown and HTML, the HTML carrying the citation anchor and the pair's grid inline */
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
    ["code block", async () => {
  /* code: a fence with a language typed, its tokens coloured, the label in the corner, the copy button on hover */
  await go("page/Coded");
  await page.click(S.editor);
  await page.keyboard.type("```js");
  await page.keyboard.press("Enter");
  await page.keyboard.type("const n = 42 // answer");
  await page.waitForTimeout(150);
  await log("a js block typed", await R.codeBlock(page));
  await page.hover(S.editorPre);
  await page.waitForTimeout(150);
  await log("hovered", await R.copyHover(page));
  await page.click(S.copybtn);
  await page.waitForTimeout(300);
  await log("clicked", await R.copyLabel(page));
    }],
    ["card copy", async () => {
  /* a card copied both ways carries its colour: the hover copy's HTML and ⌘C's HTML both spell the background inline, and ⌘V on a fresh page brings the card back */
  await go("page/Carded");
  await page.click(S.editor);
  await R.pasteText(page, "::: card-light-blue\n*Purgatorio* 19.26\n\n::: verse\nquand’ una donna apparve | When a lady appeared\n:::\n:::");
  await page.waitForTimeout(200);
  await page.hover(S.editorCard);
  await page.waitForTimeout(150);
  await page.click(S.copybtn);
  await page.waitForTimeout(300);
  await log("a card hover-copied", { label: await R.copyLabel(page), live: await R.cardLive(page), ...(await R.clipboardCard(page)) });
  await R.selectAll(page, S.editorCard);
  await page.waitForTimeout(100);
  await page.keyboard.press("Meta+c");
  await page.waitForTimeout(200);
  await log("a card ⌘C'd", await R.clipboardCard(page));
  await go("page/Pasted%20Card");
  await page.click(S.editor);
  await page.keyboard.press("Meta+v");
  await page.waitForTimeout(300);
  { const md = await A.stored(page); console.log("pasted on a fresh page:", JSON.stringify({ fence: md.startsWith("::: card-light-blue"), lines: md.split("\n").length, ...(await R.cardsAndPairs(page)) })); }
    }],
    ["grid", async () => {
  /* a grid of cards (2026-09-22, successor-only): drawn N across past the measure, hover-copied whole from the band above its top-right corner, ⌘C across two cards carrying the columns, and a stray line inside refused on the switch back with its reason pinned */
  await go("page/Gridded");
  await page.click(S.editor);
  await R.pasteText(page, "::: card-light-green\nabove\n:::\n\n::: grid 2\n::: card-light-blue\nalpha\n:::\n\n::: card-red\nbeta\n:::\n:::");   /* a card directly above: the band over its foot still finds the grid (the 2026-09-22 review) */
  await page.waitForTimeout(300);
  await log("a grid pasted", await R.gridLayout(page));
  const hover = await R.gridHover(page);
  await log("hovered above its corner", hover);
  if (hover.show) { await page.click(S.copybtn); await page.waitForTimeout(300); }
  await log("the grid copied", { label: await R.copyLabel(page), text: await R.clipboardText(page) });
  await R.selectCards(page);
  await page.waitForTimeout(100);
  await page.keyboard.press("Meta+c");
  await page.waitForTimeout(200);
  await log("two cards ⌘C'd", await R.clipboardCard(page));
  await go("page/Pasted%20Grid");
  await page.click(S.editor);
  await page.keyboard.type("prose first ");
  await page.keyboard.press("Meta+v");
  await page.waitForTimeout(300);
  await log("two cards pasted mid-paragraph", await R.gridLayout(page));
  await go("page/Gridded");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForTimeout(200);
  await R.setSource(page, "::: grid\n::: card-light-blue\nalpha\n:::\nloose\n:::");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForTimeout(400);
  await log("a stray line in a grid, switched back", { corner: await R.gridCorner(page) });
  /* the open path forces source over the stored fault (away and back, once the save has landed — a reload ended the old app's run); a refused ⌃⌘M leaves it forced, so the next entry opens rendered (the 2026-09-22 review) */
  for (let i = 0; i < 12 && !(await A.stored(page) || "").includes("loose"); i++);   /* the store holds the stray line before the navigation, or the open path has nothing to refuse (the confirmation pass) */
  await go("page/Carded");
  await page.keyboard.press("Control+Meta+m");   /* back to the rendered view on a sound entry, so the faulty one is opened from it */
  await page.waitForTimeout(300);
  await go("page/Gridded");
  await page.waitForTimeout(300);
  await log("the faulty entry opened", { source: await R.inSource(page), corner: await R.gridCorner(page) });
  await page.keyboard.press("Control+Meta+m");
  await page.waitForTimeout(300);
  await go("page/Carded");
  await log("the next entry after a refused switch", { source: await R.inSource(page) });
  await go("page/Gridded");
  await page.waitForTimeout(200);
  /* the line fixed and the view restored: the pin released, the grid drawn — and the source view is the reader's choice until switched back, so a step that left it would run every later section in source */
  if (!(await R.inSource(page))) { await page.keyboard.press("Control+Meta+m"); await page.waitForTimeout(200); }   /* the current app rendered the stray line as a paragraph and came back */
  await R.setSource(page, "::: grid\n::: card-light-blue\nalpha\n:::\n\n::: card-red\nloose\n:::\n:::");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForTimeout(400);
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
  await page.waitForTimeout(900);
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
  await page.waitForTimeout(150);
  await log("⌃⌘S, no table yet", await R.shortcuts(page));
  await page.fill(S.shortcutsEditor, "sig: Sean Miller\nmd: markdown");
  await page.click(S.shortcutsSave);
  await page.waitForTimeout(150);
  await log("saved", { ...(await R.shortcuts(page)), corner: await R.cornerText(page) });
  await page.click(S.shortcutsInput);
  await page.keyboard.type("m");
  await page.waitForTimeout(100);
  await log("m typed", (await R.shortcuts(page)).rows);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  await log("Enter", { card: await R.shortcuts(page), text: await R.editorTextHead(page) });
    }],
    ["bookmarks", async () => {
  /* bookmarks: ⌃⌘B on a day, A adds it, 1 jumps to it from elsewhere, a key given and typed, × deletes */
  await go("2026-09-06");
  await page.keyboard.press("Control+Meta+b");
  await page.waitForTimeout(150);
  await log("⌃⌘B on a day", await R.bookmarks(page));
  await page.keyboard.press("a");
  await page.waitForTimeout(300);
  await log("A pressed", await R.bookmarks(page));
  await page.keyboard.press("Escape");
  await go("page/Horace", 5000);
  await page.keyboard.press("Control+Meta+b");
  await page.waitForTimeout(150);
  await page.keyboard.press("1");
  await A.waitEntry(page, "2026-09-06", 5000);
  await log("1 from Horace", { entry: await A.entry(page), card: await R.bookmarks(page) });
  await page.keyboard.press("Control+Meta+b");
  await page.waitForTimeout(150);
  await page.click(S.bookmarkKey);
  await page.waitForTimeout(150);
  await page.keyboard.type("fb");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  await log("keyed fb", await R.bookmarks(page));
  await page.keyboard.press("f");
  await page.waitForTimeout(100);
  await log("f typed", { lit: await R.bookmarksLit(page) });
  await page.keyboard.press("b");
  await page.waitForTimeout(150);
  await log("b typed, already here", { card: await R.bookmarks(page), corner: await R.cornerText(page) });
  /* the same press over a selection: the focus back, the selection as it stood */
  await R.selectBetween(page, "food", "love");
  await page.waitForTimeout(150);
  await page.keyboard.press("Control+Meta+b");
  await page.waitForTimeout(150);
  await page.keyboard.type("fb");
  await page.waitForTimeout(150);
  await log("fb over a selection, already here", { corner: await R.cornerText(page) });
  await page.keyboard.press("Control+Meta+b");
  await page.waitForTimeout(150);
  await page.click(S.bookmarkDel);
  await page.waitForTimeout(150);
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
  await page.waitForTimeout(150);
  await log("⌃⌘B over a damaged list", await R.bookmarks(page));
  await page.keyboard.press("a");
  await page.waitForTimeout(300);
  await log("A over a damaged list", { card: await R.bookmarks(page), corner: await R.cornerText(page), stored: await page.evaluate((k) => localStorage.getItem(k), A.bookmarksKey) });
  await page.keyboard.press("Escape");
  await page.evaluate((k) => localStorage.setItem(k, '["2026-09-06"]'), A.bookmarksKey);
  await page.keyboard.press("Control+Meta+b");
  await page.waitForTimeout(150);
  await log("⌃⌘B over the list repaired", await R.bookmarks(page));
  await page.keyboard.press("a");
  await page.waitForTimeout(300);
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
  await page.waitForTimeout(100);
  await log("backups", await R.backups(page));
  await page.keyboard.press("Escape");
  await log("Escape", { card: await R.backupsOpen(page) });
    }],
    ["help", async () => {
  /* help: ⌃⌘H opens the card over the entry and closes the pages panel; Escape closes it */
  await page.click(S.pagesOpener);
  await page.keyboard.press("Control+Meta+h");
  await page.waitForTimeout(100);
  await log("⌃⌘H over an open pages panel", await R.help(page));
  await page.keyboard.press("Escape");
  await log("Escape", await R.helpOpen(page));
    }],
    ["line bar", async () => {
  /* ⌃⌘G: the bar over verse takes a line, cycles nothing on one block, marks and centres; Escape hands the caret to the row; over a book of leaves the Page box */
  await go("page/Horace");
  await R.settle(page);
  await page.keyboard.press("Control+Meta+g");
  await page.waitForTimeout(100);
  await log("⌃⌘G over Horace", await R.linebar(page));
  await page.keyboard.type("3");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  await log("3, Enter", await R.linebar(page));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  await log("Enter again on one block", await R.linebar(page));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  await log("Escape", { ...(await R.linebar(page)), caretRow: await R.caretRow(page) });
  await go("page/Williams/Witchcraft%203");
  await R.settle(page);
  await page.keyboard.press("Control+Meta+g");
  await page.waitForTimeout(100);
  await log("⌃⌘G over Witchcraft", await R.linebar(page));
  await page.keyboard.type("9z");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  await log("9z, Enter", await R.linebar(page));
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("61");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  await log("61, Enter", await R.linebar(page));
  await page.keyboard.press("Escape");
    }],
    ["reference paste", async () => {
  /* a reference pasted as plain text into the rendered view renders as its markdown */
  await go("page/Pasted");
  await page.click(S.editor);
  await R.pasteText(page, "[*Gesta*, 7 September 2026](#2026-09-07?h=blind%20cord):\n\n> blind cord");
  await page.waitForTimeout(200);
  await log("a reference pasted", { md: await A.stored(page), ...(await R.pastedReference(page)) });
  await R.pasteText(page, "[*Gesta*](#2026-09-06?h=food%20of%20love)");
  await page.waitForTimeout(200);
  await page.click(S.editorLink("#2026-09-06?h=food%20of%20love"));
  await R.waitEntryAndSelection(page, "2026-09-06", "food of love");
  await page.waitForTimeout(300);
  await log("the reference link followed", await R.highlightFollowed(page));
  /* the link's passage is deep in a long entry: the jump must SCROLL to it,
     not only select it — the one-line case above never needed a scroll,
     and the jump landed at the top of Paradise Lost (found by hand
     2026-09-12); the bar stays off, the passage is to be read in context */
  await go("page/Pasted");
  await page.click(S.editor);
  await R.pasteText(page, "[*Pippa*](#bookshelf/Browning%2C%20Robert/Pippa%20Passes?h=Power%20shall%20fall%20short%20in%20or%20exceed)");
  await page.waitForTimeout(200);
  await page.click(S.editorLink("#bookshelf/Browning%2C%20Robert/Pippa%20Passes?h=Power%20shall%20fall%20short%20in%20or%20exceed"));
  await R.waitEntryAndSelection(page, "bookshelf/Browning, Robert/Pippa Passes", "Power shall fall short in or exceed");
  await page.waitForTimeout(300);
  await log("a link deep into a long entry followed", await R.highlightFollowed(page));
  /* a paired citation is a fence inside the quotation (2026-09-12): its
     pair stands where a quoted paragraph's text does, its cells unwrapped */
  await go("page/Pasted Pair");
  await page.click(S.editor);
  await R.pasteText(page, "[*Milton*](#2026-09-07?h=mind):\n\n> The mind is its own place\n\n[*Horace*](#page/Horace?h=intemptata):\n\n> ::: verse 13\n> intemptata nites. Me tabula sacer | you shine untested. As for me, a holy\n> votiva paries indicat uvida | wall with a votive table shows that I\n> suspendisse potenti | have hung up my still dripping clothes\n> vestimenta maris deo. | to the deity who rules the sea.\n> :::");
  await page.waitForTimeout(700);
  await log("a paired citation pasted", await R.quotedPair(page));
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
  await page.waitForTimeout(100);   /* the editor's own selection lands a beat after the DOM's */
  await log("a word double-clicked", await R.bar(page));
  await page.click(S.fmtB);
  await page.waitForTimeout(100);
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
  await R.caretBefore(page, "food of love");
  await page.waitForTimeout(100);   /* the editor reads the DOM selection a beat later; without the beat the caret was at the top on one run in three */
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
  await page.waitForTimeout(100);
  await log("the caret moved in the source, ⌃⌘M back", await R.sourceBack(page));
  await wheelTo(0);
  await page.click(S.editorFirst);
  await page.waitForTimeout(100);   /* the click's caret is read a beat later, as the section's first caret is: a chord at once switched with the caret before the click */
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(150);
  await log("⌃⌘M from the top", { y: await winY() });
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await page.click(S.editorFirst);
  await wheelTo(600);
  const away = await winY();
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(150);
  /* within two lines, not to the top or to the caret: the switch carries the text at the window's top, and the pixel offset follows the other view's layout */
  await log("⌃⌘M scrolled away from the caret", { stayed: Math.abs((await winY()) - away) < 60 });
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(150);
  await log("⌃⌘M back, still scrolled away", { stayed: Math.abs((await winY()) - away) < 60 });
  await page.keyboard.press("Control+Meta+w");
  await page.waitForTimeout(200);
  await log("⌃⌘W rendered", { corner: await cornerText() });
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await page.keyboard.press("Control+Meta+w");
  await page.waitForTimeout(200);
  await log("⌃⌘W in the source view", { corner: await cornerText() });
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
    }],
    ["go to", async () => {
  /* the Go to row: ⌃⌘J on a day, a year pick refilling the months, a day pick navigating; on a book, the chain and the sentinel */
  await go("2026-09-06");
  await page.keyboard.press("Control+Meta+j");
  await page.waitForTimeout(100);
  await log("⌃⌘J on a day", await R.goto(page));
  await page.selectOption(S.gotoDay, "05");
  await A.waitEntry(page, "2026-09-05", 5000);
  await log("a day picked", { entry: await A.entry(page), open: await R.gotoOpen(page) });
  await go("bookshelf/Browning,%20Robert/Pippa%20Passes");
  await page.keyboard.press("Control+Meta+j");
  await page.waitForTimeout(100);
  await log("⌃⌘J on a book", await R.goto(page));
  await page.selectOption(S.gotoDestination, "");
  await page.waitForTimeout(100);
  await log("Journal picked from the book", (await R.goto(page)).selects);
  await page.keyboard.press("Escape");
  await log("Escape", await R.goto(page));
    }],
    ["sub-entries", async () => {
  /* the sub-entries: the dialogs answered by the harness (declared above) */
  await go("2026-09-06");
  await log("the masthead over the day after the rows closed", await R.rowsClosed(page));
  await page.click(S.editorFirst);
  await page.keyboard.press("End");
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
  await page.waitForTimeout(300);
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
  await page.waitForTimeout(200);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("```");
  await page.keyboard.press("Enter");
  await page.keyboard.type("code line");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("after the block");
  await page.waitForTimeout(200);
  await log("a code block typed, Enter twice out of it", { md: await A.stored(page) });
  await log("a list typed: bullet, Enter, Tab, Enter, Shift-Tab twice", { md: await A.stored(page), ...(await R.corner(page)) });
  await log("the gap between the two outer items, and a line's height", await R.listGaps(page));
    }],
    ["search", async () => {
  await go("page/Links");
  await page.keyboard.press("Control+Meta+k");
  await page.waitForTimeout(100);
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
  await page.waitForTimeout(100);
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
  await page.waitForTimeout(100);   /* a selection left on the last entry keeps the bar up one frame into this one (MEASURED, 10 ms) */
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
  await page.waitForTimeout(200);
  await log("⌃⌘M, then ⌃⌘.", { entry: await A.entry(page), source: await R.inSource(page) });
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
    }],
    ["stanza", async () => {
  /* the Faerie Queene's stanzas (2026-09-28, successor-only): a work whose page says `roman book and canto`, each stanza a `::: stanza N` fence — the number drawn in its own column at every interval, the crumb respelled, ⌃⌘R across a stanza gap citing I.i.1.3–2.1 and quoting both, ⌃⌘G taking stanza.line */
  await A.seedStanza(page, STANZA_SEEDS);
  await go("bookshelf/Spenser%2C%20Edmund/The%20Faerie%20Queene/1.1");
  await R.settle(page);
  await log("a canto opened", { ...(await R.stanzas(page)), crumb: (await R.masthead(page)).crumb, title: (await R.masthead(page)).title });
  await R.selectBetween(page, "bloudie Crosse", "bloudie Crosse");
  await R.waitBar(page);
  await page.keyboard.press("Control+Meta+r");
  await page.waitForTimeout(300);
  await log("⌃⌘R on a line", { lines: await R.clipboardLines(page) });
  await R.selectBetween(page, "deepe wounds", "bloudie Crosse");
  await R.waitBar(page);
  await page.keyboard.press("Control+Meta+r");
  await page.waitForTimeout(300);
  await log("⌃⌘R across a stanza gap", { lines: await R.clipboardLines(page) });
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+g");
  await page.waitForTimeout(100);
  await page.keyboard.type("2.1");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  await log("⌃⌘G 2.1", { ...(await R.linebar(page)), landedText: await R.landedText(page) });
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("2.9");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  await log("⌃⌘G 2.9", await R.linebar(page));
  await page.keyboard.press("Escape");
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
    await page.waitForTimeout(300);
    const source = await R.topStanza(page), sourceEnd = await R.lastStanzaShowing(page);
    await page.keyboard.press("Control+Meta+m");
    await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
    /* at the end the source, the shorter, stops at its own foot: the last stanza showing in both, not one stanza at both tops */
    await log(label, where < 1 ? { rendered, source, back: await R.topStanza(page) } : { rendered: renderedEnd, source: sourceEnd, back: await R.lastStanzaShowing(page) });
    if (where < 1) {
      await log("the switch's place remembered", { matches: await page.evaluate((k) => { try { const r = JSON.parse(localStorage.getItem(k) || "[]").find((x) => x.key === "page/Long Canto"); return !!r && Math.abs(r.y - scrollY) < 3; } catch { return null; } }, A.ns + "places") });
      /* the page grows above the text just set, as a picture resolving does: the switch's place is held like an arrival's */
      await page.evaluate((s) => { document.querySelector(s).style.paddingTop = "400px"; }, S.editor);
      await page.waitForTimeout(300);
      await log("⌃⌘M back, then 400px grown above", { top: await R.topStanza(page) });
      await page.evaluate((s) => { document.querySelector(s).style.paddingTop = ""; }, S.editor);
      await page.waitForTimeout(300);
    }
  }
  await wheelTo(20);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
  const nearTop = await winY();
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
  await log("⌃⌘M from 20px down", { source: nearTop, back: await winY() });
  /* a caret placed low in the source's window, then back: it is still in view */
  await wheelTo(Math.round((await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)) / 2));
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
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
  await page.waitForTimeout(200);
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
  await page.waitForTimeout(200);
  await log("Horace followed", await R.place(page));
  await page.goBack();
  await A.waitEntry(page, pippa, 5000).catch(() => {});
  await page.waitForTimeout(200);
  await log("Back", await R.place(page));
  await page.goForward();
  await A.waitEntry(page, "page/Horace", 5000).catch(() => {});
  await page.waitForTimeout(200);
  await log("Forward", await R.place(page));
  await page.goBack();
  await A.waitEntry(page, pippa, 5000).catch(() => {});
  await page.waitForTimeout(200);
  await log("Back again", await R.place(page));
  await page.reload();
  await A.waitEntry(page, pippa).catch(() => {});
  await A.waitWarm(page).catch(() => {});
  await page.waitForTimeout(300);
  await log("reloaded", await R.place(page));
  await page.evaluate((s) => { document.querySelector(s).style.paddingTop = "400px"; }, S.editor);   /* the page grows above the held place, as a picture resolving does */
  await page.waitForTimeout(300);
  await log("400px grown above the held place", await R.place(page));
  await page.waitForTimeout(500);
  await go("page/Horace");
  await go("bookshelf/Browning%2C%20Robert/Pippa%20Passes");
  await page.waitForTimeout(200);
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
  await page.waitForTimeout(300);
  await log("back to a place in a closed section", { open: (await R.folds(page)).open, fillerInView: await inView("Filler 5.4") });
  /* the same page reloaded with the warm held back: drawn unfolded from its one row, then folded when the warm lands, the place set again */
  await page.goto(A.url("bookshelf/Boethius/Consolatio", "warm=slow"));
  await A.waitEntry(page, "bookshelf/Boethius/Consolatio", 5000).catch(() => {});
  await page.waitForTimeout(200);
  await log("before the warm", { folds: (await R.folds(page)).folds, fillerInView: await inView("Filler 5.4") });
  await A.waitWarm(page).catch(() => {});
  await page.waitForTimeout(300);
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
  await page.waitForTimeout(300);
  for (const b of (await R.folds(page)).open) await R.clickFoldTriangle(page, b.trim().split(":")[0]);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await R.sourceScrollTo(page, "Filler 3.4");
  await page.waitForTimeout(200);
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
  if (await R.inSource(page)) { await page.keyboard.press("Control+Meta+m"); await page.waitForTimeout(300); }
  await go("page/Forced%20Long");
  await page.waitForTimeout(300);
  await wheelTo(900);
  const leftAt = await winY();
  await page.waitForTimeout(700);
  await go("page/Horace");
  await go("page/Forced%20Long");
  await page.waitForTimeout(300);
  await log("a forced entry left scrolled, returned to", { source: await R.inSource(page), stayed: Math.abs((await winY()) - leftAt) < 3 });
  /* the masthead changing height under a held place, as it does when the
     entry arrived from had a taller one: the place is set again, in the
     source view by its offset and in the rendered one by its text */
  const shrunk = async (fn) => {
    await page.evaluate(() => { const h = document.querySelector(".site-head"); h.style.maxHeight = "50px"; h.style.overflow = "hidden"; });
    try { await page.waitForTimeout(300); return await fn(); }
    finally { await page.evaluate(() => { const h = document.querySelector(".site-head"); h.style.maxHeight = ""; h.style.overflow = ""; }); await page.waitForTimeout(300); }
  };
  await log("a held place, the masthead shrinking under it", await shrunk(async () => ({ stayed: Math.abs((await winY()) - leftAt) < 3 })));
  await go("page/Horace");
  if (await R.inSource(page)) { await page.keyboard.press("Control+Meta+m"); await page.waitForTimeout(300); }
  await go("bookshelf/Browning%2C%20Robert/Pippa%20Passes");
  await page.waitForTimeout(300);
  await wheelTo(2600);
  await page.waitForTimeout(700);
  await go("page/Horace");
  await go("bookshelf/Browning%2C%20Robert/Pippa%20Passes");
  await page.waitForTimeout(300);
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
  await page.waitForTimeout(300);
  const afterGrow = await rowUnderHead();
  await page.evaluate(() => { document.querySelector("#editor .ProseMirror").style.paddingBottom = ""; });
  await log("a held place, then a scroll no hand made", { kept: afterGrow === foundLine, line: afterGrow });
  await go("page/Horace");
  if (await R.inSource(page)) { await page.keyboard.press("Control+Meta+m"); await page.waitForTimeout(300); }
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
  await page.waitForTimeout(300);
  await log("back to lines opening on inline code", { source: await R.inSource(page) });
  /* a place held in the source mid-way down one long paragraph: the caret on the line on screen, so a key typed leaves the window where it is */
  await go("page/Long%20Paragraph");
  await page.click(S.editor);
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await R.setSource(page, Array.from({ length: 300 }, (_, i) => "Sentence " + (i + 1) + " of one long paragraph.").join(" "));
  await page.waitForTimeout(1500);
  await wheelTo(1200);
  await page.waitForTimeout(700);
  await go("page/Horace");
  await go("page/Long%20Paragraph");
  await page.waitForTimeout(300);
  const before = await winY();
  await page.keyboard.type("Z");
  await page.waitForTimeout(300);
  await log("typed at the place in a long paragraph's source", { source: await R.inSource(page), stayed: Math.abs((await winY()) - before) < 3 });
  await page.keyboard.press("Control+Meta+m");
  await page.waitForTimeout(300);
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
  await page.waitForTimeout(300);
  await log("a long entry renamed, scrolled", { entry: await A.entry(page), stayed: Math.abs((await winY()) - before) < 3 });
  await wheelTo(600);
  await page.waitForTimeout(700);
  await page.click(S.deleteButton);
  await A.waitEntry(page, "2026-09-05", 5000).catch(() => {});
  await page.waitForTimeout(300);
  await log("deleted scrolled: its place dropped", { entry: await A.entry(page), placeKept: await page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) || "[]").some((r) => r.key === "2026-09-05/Longer"); } catch { return null; } }, A.ns + "places") });
  answer = null;
  await page.evaluate(() => { const c = navigator.clipboard; window.__clip = [c.write, c.writeText, document.execCommand]; c.write = () => Promise.reject(new Error("refused")); c.writeText = () => Promise.reject(new Error("refused")); document.execCommand = () => false; });
  await page.keyboard.press("Control+Meta+c");
  await page.waitForTimeout(300);
  await log("⌃⌘C with the clipboard refused", { corner: await cornerText() });
  await page.evaluate(() => { const c = navigator.clipboard, [a, b, x] = window.__clip; c.write = a; c.writeText = b; document.execCommand = x; });
  await page.keyboard.press("Control+Meta+c");
  await page.waitForTimeout(300);
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
  await page.waitForTimeout(300);
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
  await page.waitForTimeout(100);
  await page.selectOption(S.searchScope, { label: "Everything" });
  await page.keyboard.type("Pedenteria in comparison");
  await searched("Pedenteria in comparison");
  await log("typed Pedenteria in comparison", await R.search(page));
  await page.keyboard.press("Enter");
  await R.waitSelection(page, "pedenteria ¹ in comparison");
  await log("Enter on the footnoted phrase", { entry: await A.entry(page), selected: await R.selectionText(page) });
  await page.keyboard.press("Control+Meta+k");
  await page.waitForTimeout(100);
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("Amphion, was");
  await searched("Amphion, was");
  await log("typed Amphion, was", await R.search(page));
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+Meta+k");
  await page.waitForTimeout(100);
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
  await other.waitForTimeout(150);
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
  await page.waitForTimeout(200);
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
  await page.waitForTimeout(200);
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
  await page.waitForTimeout(300);
  await page.click(S.bookmarkDel);
  await page.waitForTimeout(150);
  await log("× on its first row", { card: await R.bookmarks(page), stored: await page.evaluate((k) => localStorage.getItem(k), A.bookmarksKey) });
  await page.keyboard.press("Escape");
    }],
    ["author filing", async () => {
  /* (2026-10-05) "New author…" asks the name, then where it sorts, filled with the surname first; Rename on an author with a book re-files it, the book and the link to it with it, and the corner says so; the current app asks once and files the name as typed, and refuses to rename an author with books */
  await go("2026-09-06");
  await page.click(S.booksOpener);
  answer = ["Harley Price", "Price, Harley"];
  prompts.length = 0;
  await page.click(S.newAuthor);
  await A.waitEntry(page, "bookshelf/Price, Harley", 5000).catch(() => {});
  await log("New author…, Harley Price, Enter twice", { prompts: prompts.slice(), entry: await A.entry(page), stored: await A.stored(page, "bookshelf/Price, Harley") });
  await page.click(S.booksOpener);
  await log("the bookshelf lists it by its heading", await R.panel(page));
  await page.keyboard.press("Escape");
  /* a click just past the heading's last letter, the caret at its end */
  const end = await page.evaluate((s) => { const h = document.querySelector(s); const r = document.createRange(); r.selectNodeContents(h); const b = r.getBoundingClientRect(); return { x: b.right + 3, y: b.top + b.height / 2 }; }, S.editorFirst);
  await page.mouse.click(end.x, end.y);
  /* the editor takes a click's caret on the selection's change, a tick later than the click */
  await page.waitForTimeout(150);
  await page.keyboard.press("Enter");
  answer = "Odes";
  await A.act.create(page);
  await A.waitEntry(page, "bookshelf/Price, Harley/Odes", 5000).catch(() => {});
  await page.click(S.editor);
  await page.keyboard.type("A book.");
  await page.waitForTimeout(1500);
  await go("bookshelf/Price%2C%20Harley", 5000);
  answer = "Harley Price";
  prompts.length = 0;
  await page.click(S.renameAuthor);
  await A.waitEntry(page, "bookshelf/Harley Price", 5000).catch(() => {});
  await page.waitForFunction((s) => /filed under/.test(document.querySelector(s)?.textContent || ""), S.corner, { timeout: 3000 }).catch(() => {});
  await log("Rename, Harley Price typed, Enter", { prompts: prompts.slice(), entry: await A.entry(page), corner: await cornerText(), author: await A.stored(page, "bookshelf/Harley Price"), book: await A.stored(page, "bookshelf/Harley Price/Odes"), oldAuthor: await A.stored(page, "bookshelf/Price, Harley"), oldBook: await A.stored(page, "bookshelf/Price, Harley/Odes") });
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
  await page.waitForTimeout(150);
  await page.keyboard.press("Control+Meta+e");
  await page.waitForTimeout(200);
  await log("⌃⌘E in the rendered view", { ...(await R.replaceBar(page)), corner: await R.cornerTextOrEmpty(page) });
  await page.keyboard.type("*-*");
  await page.waitForTimeout(100);
  await log("*-* typed into Find", await R.replaceBar(page));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  await log("Enter in Find", await R.replaceBar(page));
  await page.click(S.replaceWith, { timeout: 2000 }).catch(() => {});
  await page.keyboard.type("-");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  await log("Enter in Replace with", { ...(await R.replaceBar(page)), stored: await A.stored(page) });
  await page.click(S.replaceSkip, { timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(100);
  await log("Skip", { ...(await R.replaceBar(page)), stored: await A.stored(page) });
  await page.click(S.replaceAll, { timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(100);
  await log("Replace All, the rest replaced", { ...(await R.replaceBar(page)), stored: await A.stored(page) });
  await page.click(S.source, { timeout: 2000 }).catch(() => {});
  await page.keyboard.press("Meta+z");
  await page.waitForTimeout(100);
  await log("⌘Z in the text", { ...(await R.replaceBar(page)), stored: await A.stored(page) });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  await log("Escape, opened in the rendered view", await R.replaceBar(page));
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.source, { timeout: 5000 }).catch(() => {});
  await page.keyboard.press("Control+Meta+e");
  await page.waitForTimeout(200);
  await log("⌃⌘E in the source view", await R.replaceBar(page));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  await log("Escape, opened in the source view", await R.replaceBar(page));
  /* a long entry: the layer the matches are drawn on keeps the text's line pitch to its last line, where 27.54px set it 79px low over 2,706 lines of Paradise Lost (2026-10-08) */
  await R.setSource(page, Array.from({ length: 1500 }, (_, i) => "Line " + i + " of a long entry, with *-* in it and more words after it to wrap.").join("\n\n"));
  await page.keyboard.press("Control+Meta+e");
  await page.waitForTimeout(200);
  await log("a long entry's matches", await R.replaceDrift(page));
  /* Replace All far from the end keeps the window where it was: the whole-text edit put the caret, and the window, at the entry's last line */
  { const y = await winY(); await page.click(S.replaceAll, { timeout: 2000 }).catch(() => {}); await page.waitForTimeout(200); await log("Replace All in a long entry", { count: (await R.replaceBar(page)).count, kept: Math.abs((await winY()) - y) < 60 }); }
  await page.keyboard.press("Escape");
  /* a replacement holding the find: the rest are counted, not "none" */
  await R.setSource(page, "cat and cat\n");
  await page.keyboard.press("Control+Meta+e");
  await page.waitForTimeout(150);
  await page.fill("#replacefind", "cat").catch(() => {});
  await page.fill("#replacewith", "cats").catch(() => {});
  await page.click(S.replaceAll, { timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(150);
  await log("Replace All, the replacement holding the find", await R.replaceBar(page));
  await page.keyboard.press("Escape");
  /* a switch back the parse refuses: the cursor goes back to the text, not into the hidden Find box */
  await R.setSource(page, "::: grid 2\n::: card-red\nx\n:::\n:::\n");
  await R.waitCorner(page, "saved");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  await page.keyboard.press("Control+Meta+e");
  await page.waitForTimeout(200);
  await page.fill("#replacefind", "::: card-red").catch(() => {});
  await page.fill("#replacewith", "zz").catch(() => {});
  await page.click(S.replaceAll, { timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(150);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  await log("Escape, the switch back refused", await R.replaceBar(page));
  await R.setSource(page, "One*-*two.\n");
  await R.waitCorner(page, "saved");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {});
  /* another panel opened over the bar closes it, and switches back as Escape does */
  await page.keyboard.press("Control+Meta+e");
  await page.waitForTimeout(200);
  await page.keyboard.press("Control+Meta+h");
  await page.waitForTimeout(200);
  await log("⌃⌘H over the bar", { ...(await R.replaceBar(page)), help: (await R.helpOpen(page)).help });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  /* the same entry saved in another window rebuilds the source view under the bar: the bar closes, its offsets belonging to the text it was opened on, and the caret goes back to the match it stood on, not to the text's end */
  await page.keyboard.press("Control+Meta+e");
  await page.waitForTimeout(150);
  await page.fill("#replacefind", "*-*").catch(() => {});
  /* the switch's own save lands first, or the other window's write is refused as stale */
  await page.waitForTimeout(1500);
  { const other = await page.context().newPage();
    await other.goto(A.url("page/Replaced")); await A.waitEntry(other, "page/Replaced");
    await other.click(S.editor); await other.keyboard.press("End"); await other.keyboard.type(" Seven*-*eight.");
    await R.waitCorner(other, "saved");
    /* the landed write reaches this window by its notice: waited for, so a reading never races it */
    await page.waitForFunction(() => /Seven/.test(document.querySelector("textarea.source")?.value || document.querySelector("#editor")?.textContent || ""), null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(100);
    await log("the entry saved in another window, the bar open", { ...(await R.replaceBar(page)), text: await page.evaluate(() => document.querySelector("textarea.source")?.value ?? null), caret: await page.evaluate(() => document.querySelector("textarea.source")?.selectionStart ?? null) });
    await other.close(); }
  await page.keyboard.press("Escape");
  if (await R.inSource(page)) { await page.keyboard.press("Control+Meta+m"); await page.waitForSelector(S.editor, { timeout: 5000 }).catch(() => {}); }
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
  ];
  /* each section starts from the one window, in front, nothing open over
     it: windows a section left open held the focus, and a click in the
     next section moved no caret (2026-10-05, the author-filing record) */
  const settle = async () => {
    for (const p of page.context().pages()) if (p !== page) await p.close().catch(() => {});
    await page.bringToFront();
    await page.keyboard.press("Escape").catch(() => {});
  };
  for (const [name, fn] of sections) {
    if (opts.only && name !== sections[0][0] && !opts.only.includes(name)) continue;
    await settle();
    section = name;
    try { await fn(); }
    catch (e) { console.log("SECTION FAILED (" + name + "): " + String(e).split("\n")[0].slice(0, 200)); }
  }
}
