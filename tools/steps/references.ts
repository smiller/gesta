import { appendFileSync, mkdirSync } from "node:fs";
import { section, laid, storedWith, page, A, R, S, log, go, saidText, landed, rest, settled, write, caretAt, view, writeAll, jump } from "./kit.ts";
import { inPage } from "../adapters/inPage.ts";

section("reference copy", async () => {
  /* the rich flavour: ⌃⌘R over a selection in a paired verse block writes markdown and HTML, the HTML carrying the reference anchor and the pair's grid inline */
  await go("commonplace/Horace");
  await R.selectAll(page, S.editorCell);
  /* the format toolbar, not 100ms: it shows after the selectionchange the editor takes the selection on */
  /* the format toolbar has missed about 1 full run in 15 and never in this step's
     replays: its cause unknown, a miss is selected again once and appended
     to tools/out/flakes.log, outside the verdict; a second miss reads as
     itself */
  let barMissed = await barMiss();
  if (barMissed) {
    mkdirSync(new URL("../out/", import.meta.url), { recursive: true });
    appendFileSync(new URL("../out/flakes.log", import.meta.url), new Date().toISOString() + " " + A.name + " reference copy: " + barMissed + "\n");
    await R.selectAll(page, S.editorCell);
    barMissed = await barMiss();
  }
  const said = await R.cornerAfter(page, () => page.keyboard.press("Control+Meta+r"), /copied|copy/);
  await log("⌃⌘R", { ...(barMissed ? { barMissed } : {}), said, ...await R.clipboardReference(page) });
});
const barMiss = () => R.waitToolbar(page).then((): string | null => null, (e: Error) => e.message);
section("a reference pasted", async () => {
  /* ⌃⌘R's reference pasted with ⌘V into another entry: the link stored by its bare address (#commonplace/…), never the app's full file address */
  await referencePasted();
  await proseTwoSpacesPasted();
  await referencePastedMidSentence();
  await pageOwnReferencePasted();
});
async function referencePasted(): Promise<void> {
  await go("commonplace/Horace");
  await R.selectAll(page, S.editorCell);
  const barMissed = await R.waitToolbar(page).then((): string | null => null, (e: Error) => e.message);
  const said = await R.cornerAfter(page, () => page.keyboard.press("Control+Meta+r"), /copied|copy/);
  /* the HTML flavour is the paste's source and carries the full address, so a bare link stored is the paste's own doing */
  const copied = await page.evaluate(inPage(copiedLink, linkKind, htmlLink));
  await go("commonplace/Referred");
  await page.click(S.editor);
  await page.keyboard.press("Meta+v");
  await rest(page);
  { const md = await A.stored(page); const href = (md.match(/\]\(([^)]*)\)/) ?? [])[1] ?? ""; await log("the reference pasted", { ...(barMissed ? { barMissed } : {}), said, copied, link: linkKind(href, "none"), head: href.replace(/\?h=.*$/, "").replace(/^file:.*#/, "file:…#") }); }
}
/* a link's address by its kind: the entry's bare hash, a file's address, another, or none */
function linkKind(href: string, none: string): string {
  if (href.startsWith("#")) return "bare";
  if (href.startsWith("file:")) return "file address";
  return href ? "other" : none;
}
async function htmlLink(): Promise<string> {
  const item = (await navigator.clipboard.read())[0];
  if (!item.types.includes("text/html")) return "no html";
  const href = (/<a href="([^"]*)"/.exec(await (await item.getType("text/html")).text()) ?? [])[1] ?? "";
  return linkKind(href, "no link");
}
/* the HTML flavour's link, read again while the clipboard is still landing */
async function copiedLink(): Promise<string> {
  let last = "";
  for (let i = 0; i < 10; i++) {
    try { return await htmlLink(); } catch (e) { last = String(e); await new Promise((r) => setTimeout(r, 50)); }
  }
  return last;
}
async function proseTwoSpacesPasted(): Promise<void> {
  /* prose with two spaces after a full stop: the paste keeps them as the entry has them */
  await go("commonplace/Williams/Witchcraft 3");
  const spanned = await R.selectBetween(page, "though they were not vampires", "could take again");
  const barMissedProse = await R.waitToolbar(page).then((): string | null => null, (e: Error) => e.message);
  const saidProse = await R.cornerAfter(page, () => page.keyboard.press("Control+Meta+r"), /copied|copy/);
  await go("commonplace/Referred");
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
  { const md = await A.stored(page); const screen = await page.evaluate(() => { const a = [...document.querySelectorAll("#editor .ProseMirror a")].find((x) => x.textContent === "vampires"); const s = getSelection(); return { link: a ? (a.getAttribute("href") ?? "").replace(/\?h=.*$/, "") : "none", collapsed: s.isCollapsed, caretAfter: s.anchorNode?.textContent.slice(Math.max(0, s.anchorOffset - 8), s.anchorOffset) }; }); await log("a reference pasted onto a word", { chosen, ...screen, references: md.split("):\n").length - 1, stored: /\[vampires\]\(#commonplace\/Williams/.test(md) }); }
}
async function referencePastedMidSentence(): Promise<void> {
  /* the same reference pasted mid-sentence: its label alone, no colon, the caret after it */
  await R.caretAfter(page, "greater.", 8);
  await page.keyboard.press("Meta+v");
  await rest(page);
  /* the paste may not have landed in two frames, and no edit is then there to wait on: the reading says what stood when the wait ran out */
  { const md = await landedAfter((m) => /greater\.\[\*Williams/.test(m)); const screen = await page.evaluate(() => { const s = getSelection(); return { caretAfter: s.anchorNode?.textContent.slice(Math.max(0, s.anchorOffset - 8), s.anchorOffset), caretBefore: s.anchorNode?.textContent.slice(s.anchorOffset, s.anchorOffset + 6) }; }); await log("a reference pasted mid-sentence", { ...screen, references: md.split("):\n").length - 1, referred: /greater\.\[\*Williams\*[^\]]*\]\(#commonplace\/Williams\/Witchcraft%203\?h=[^)]*\) *The/.test(md), colon: /greater\.\[[^\]]*\]\([^)]*\):/.test(md) }); }
  /* the page's reference copied with ⌘C, then pasted mid-sentence: a copy made in the page pastes whole */
  await page.click(S.editor);
  await page.keyboard.press("Meta+a");
  await page.keyboard.press("Meta+c");
}
async function pageOwnReferencePasted(): Promise<void> {
  const copiedHere = await page.evaluate(async () => { for (let i = 0; i < 40; i++) { try { const it = (await navigator.clipboard.read())[0]; if (it.types.includes("text/html") && (await (await it.getType("text/html")).text()).includes("data-pm-slice")) return "in-page"; } catch { /* read again */ } await new Promise((r) => setTimeout(r, 50)); } return "not landed"; });
  await R.caretAfter(page, "greater.", 8);
  await page.keyboard.press("Meta+v");
  await rest(page);
  { const md = await landedAfter((m) => m.split("):\n").length >= 3 && /greater\.\[\*Williams/.test(m)); await log("the page's own reference pasted mid-sentence", { copied: copiedHere, references: md.split("):\n").length - 1, labelAlone: (md.match(/greater\.\[\*Williams/g) ?? []).length }); }
}
const landedAfter = async (done: (md: string) => boolean) => { let md = await A.stored(page); for (let i = 0; i < 60 && !done(md); i++) { await page.waitForTimeout(50); md = await A.stored(page); } return md; };
section("code block", async () => {
  /* code: a fence with a language typed, its tokens coloured, the label in the corner, the copy button on hover */
  await go("commonplace/Coded");
  await page.click(S.editor);
  await page.keyboard.type("```js");
  await page.keyboard.press("Enter");
  await page.keyboard.type("const n = 42 // answer");
  await rest(page);
  await log("a js block typed", await R.codeBlock(page));
  await page.hover(S.editorPre);
  await page.waitForFunction(() => document.querySelector(".copybtn")?.classList.contains("show"), null, { timeout: 3000 }).catch(() => {});
  await log("hovered", await R.copyHover(page));
  await page.click(S.copybtn);
  await rest(page);
  await log("clicked", await R.copyLabel(page));
});
section("card copy", async () => {
  /* a card copied both ways carries its colour: the hover copy's HTML and ⌘C's HTML both spell the background inline, and ⌘V on a fresh page brings the card back */
  await go("commonplace/Carded");
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
  await go("commonplace/Pasted%20Card");
  await page.click(S.editor);
  await page.keyboard.press("Meta+v");
  await rest(page);
  { const md = await A.stored(page); console.log("pasted on a fresh page:", JSON.stringify({ fence: md.startsWith("::: card-light-blue"), lines: md.split("\n").length, ...(await R.cardsAndPairs(page)) })); }
});
section("grid", async () => {
  /* a grid of cards: drawn N across past the measure, hover-copied whole from the band above its top-right corner, ⌘C across two cards carrying the columns, and a stray line inside refused on the switch back with its reason raised as an error */
  await go("commonplace/Gridded");
  await page.click(S.editor);
  await R.pasteText(page, "::: card-light-green\nabove\n:::\n\n::: grid 2\n::: card-light-blue\nalpha\n:::\n\n::: card-red\nbeta\n:::\n:::");   /* a card directly above: the band over its foot still finds the grid */
  await rest(page);
  await log("a grid pasted", await laid(R.gridLayout));
  const hover = await R.gridHover(page);
  await log("hovered above its corner", hover);
  if (hover.show) { await page.click(S.copybtn); await rest(page); }
  await log("the grid copied", { label: await R.copyLabel(page), text: await R.clipboardText(page) });
  await R.selectCards(page);
  await rest(page);
  await page.keyboard.press("Meta+c");
  await rest(page);
  await log("two cards ⌘C'd", await R.clipboardCard(page));
  await go("commonplace/Pasted%20Grid");
  await page.click(S.editor);
  await page.keyboard.type("prose first ");
  await page.keyboard.press("Meta+v");
  await rest(page);
  await log("two cards pasted mid-paragraph", await laid(R.gridLayout));
  await go("commonplace/Gridded");
  await page.keyboard.press("Control+Meta+m");
  await rest(page);
  await R.setSource(page, "::: grid\n::: card-light-blue\nalpha\n:::\nloose\n:::");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForTimeout(400);
  await log("a stray line in a grid, switched back", { corner: await R.saidTextOrEmpty(page) });
  /* the open path forces source over the stored fault (away and back, once the save has landed); a refused ⌃⌘M leaves it forced, so the next entry opens rendered */
  for (let i = 0; i < 12 && !(await A.stored(page) || "").includes("loose"); i++);   /* the store holds the stray line before the navigation, or the open path has nothing to refuse */
  await go("commonplace/Carded");
  await page.keyboard.press("Control+Meta+m");   /* back to the rendered view on a sound entry, so the faulty one is opened from it */
  await rest(page);
  await go("commonplace/Gridded");
  await rest(page);
  await log("the faulty entry opened", { source: await R.inSource(page), corner: await R.saidTextOrEmpty(page) });
  await page.keyboard.press("Control+Meta+m");
  await rest(page);
  await go("commonplace/Carded");
  await log("the next entry after a refused switch", { source: await R.inSource(page) });
  await go("commonplace/Gridded");
  await rest(page);
  /* the line fixed and the view restored: the error resolved, the grid drawn */
  await R.setSource(page, "::: grid\n::: card-light-blue\nalpha\n:::\n\n::: card-red\nloose\n:::\n:::");
  await page.keyboard.press("Control+Meta+m");
  await page.waitForFunction(() => !JSON.parse(document.documentElement.dataset.alerts || "{}").error, null, { timeout: 5000 }).catch(() => {});
  await log("the line made a card, switched back", { standing: (await R.standingText(page)) ?? "none", ...(await laid(R.gridLayout)) });
});
section("told on open", async () => {
  /* a refused fence line and a directive no page reads, raised as an error when the entry opens: told only on the switch back from the source, a reader who never opened it there never saw them */
  await writeAll({
    "2026-09-02/gesta-wrangling": "# Gesta wrangling\n\n```\nx\n```\n\n::: verse -3\nfealan thalos\n\\:::",
    "bookshelf/Chaucer, Geoffrey": "# Geoffrey Chaucer\n\n::: reference\nroman book and canto\npart titles in roman\n:::",
  });
  await go("2026-09-02/gesta-wrangling");
  await rest(page);
  await log("a journal day with a refused fence line, opened", { corner: await R.saidTextOrEmpty(page) });
  await go("bookshelf/Chaucer,%20Geoffrey");
  await rest(page);
  await log("an author with directives no page reads there, opened", { corner: await R.saidTextOrEmpty(page) });
});
section("paired card", async () => {
  /* a card's and a note's paired verse split by their own widest lines: equal halves wrapped four lines of a card whose translation needed a third of it */
  await pairedCardOpening();
  await cardNotePairedVerse();
});
async function pairedCardOpening(): Promise<void> {
  await go("commonplace/Paired%20Card");
  await page.click(S.editor);
  await R.pasteText(page, "::: card-light-blue\n" + pairs + "\n:::\n\n::: note\n" + pairs + "\n:::");
  await jump(page, 700);
}
const pairs = "::: verse\n*This is what was bequeathed us* | Death of the body —\n | How many poems\nNo other shore, only this bank | In the Book\nOn which the living gather. | Urge us\n\nNo meaning but what we find here. |\nNo purpose but what we make. | Death of the heart —\n\nThat, and the beloved’s clear instructions: | Insisting\nTurn me into song; sing me awake. | We'd better not.\n:::";
async function cardNotePairedVerse(): Promise<void> {
  await log("a card and a note of paired verse", { blocks: await split() });
  await page.keyboard.press("End");
  await page.keyboard.type(" and on, and on, and on");
  await landed(page, 900);
  await log("typed on in the note's last row", { blocks: await split() });
}
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
section("picture", async () => {
  /* a pasted picture: a PNG drawn on a canvas, pasted as a file, filed beside the entry and placed */
  await picturePasted();
  await picturePastedEntryS();
  await picturePastedAnotherEntry();   /* the error read, dismissed as a reader does: an alert yields to it */
});
async function picturePasted(): Promise<void> {
  await go("commonplace/Pictured");
  await page.click(S.editor);
  await page.keyboard.type("A picture: ");
  await R.pastePng(page);
  await R.waitImg(page);
  await storedWith("img-1.webp");
  await log("a picture pasted", { md: await A.stored(page), ...(await R.picture(page)) });
  await go("commonplace/Pictured%20End");
  await page.click(S.editor);
  await page.keyboard.type("Last line");
  await page.keyboard.press("Enter");
  await R.pastePng(page);
  await R.waitImg(page);
  await storedWith("img-1.webp");
}
async function picturePastedEntryS(): Promise<void> {
  await log("a picture pasted at the entry's end", { md: await A.stored(page), lineBelowPicture: await page.evaluate(lineBelowPicture, S.editor), caretBelowPicture: await page.evaluate(caretBelowPicture, S.editor) });
}
/* the entry's last block a blank line, the one above it holding the picture */
function lineBelowPicture(s: string): boolean {
  const last = document.querySelector(s)?.lastElementChild;
  const prev = last?.previousElementSibling;
  return !!last && !last.textContent.trim() && !last.querySelector("img") && !!prev?.querySelector("img");
}
function caretBelowPicture(s: string): boolean {
  const n = getSelection().anchorNode;
  const el = n && (n.nodeType === 1 ? n : n.parentElement);
  const root = document.querySelector(s);
  let b = el;
  while (b && b.parentElement !== root) b = b.parentElement;
  return !!b && b === root.lastElementChild && !!(b as Element).previousElementSibling?.querySelector("img");
}
async function picturePastedAnotherEntry(): Promise<void> {
  await go("commonplace/Pictured%20Away");
  await page.click(S.editor);
  await page.keyboard.type("Aimed here");
  await R.pastePng(page);
  await page.evaluate(() => { location.hash = "#commonplace/Horace"; });
  await A.waitEntry(page, "commonplace/Horace", 5000).catch(() => {});
  await page.waitForFunction(() => /nowhere to land/.test(window.__said() || ""), null, { timeout: 1500 }).catch(() => {});
  await log("a picture pasted, then another entry at once", { entry: await A.entry(page), picturesHere: await page.evaluate((s) => document.querySelectorAll(s).length, S.editorImg), corner: await saidText(), aimedAtHasOne: /!\[/.test((await A.stored(page, "commonplace/Pictured Away")) || "") });
  await page.click(S.corner).catch(() => {});
}
section("a terminal's copy pasted", async () => {
  /* a terminal's copy, its HTML white-space: pre blocks of coloured inline runs and its lines broken at the window's width: pasted as its text, a line not ending a sentence running on into the next, a list item starting its own; one line, and into a list item, the same; a box-drawn table, in a second block, a table; a line opening on -- its own, a line wrapped from it run back on; a command's ⎿ output its own line, and each line of it */
  await go("commonplace/Terminal%20Paste");
  await page.click(S.editor);
  await pasteTerminal(TERMINAL_HTML, TERMINAL_TEXT);
  await log("a terminal's copy pasted", { md: await A.stored(page), drawn: await drawn() });
  await write("commonplace/Terminal Line", "before\n");
  await caretAt("before", 6);
  await pasteTerminal(terminal(" " + run(CODE, "git log") + " shows the day"), " git log shows the day");
  await log("a terminal's one line pasted", { md: await A.stored(page), drawn: await drawn() });
  await write("commonplace/Terminal Item", "- an item\n");
  await caretAt("an item", 7);
  await pasteTerminal(terminal(" that " + run(CODE, "wraps") + " at the\n  window's width."), " that wraps at the\n  window's width.");
  await log("a terminal's copy pasted into a list item", { md: await A.stored(page), drawn: await drawn() });
  await write("commonplace/Terminal Code", "```\nfirst\n```\n");
  await caretAt("first", 5);
  await pasteTerminal(terminal("\n" + run(CODE, "const") + " a = 1\nconst b = 2"), "\nconst a = 1\nconst b = 2");
  await log("a terminal's copy pasted into a code block", { md: await A.stored(page) });
  await write("commonplace/Terminal Table", "before\n");
  await caretAt("before", 6);
  await page.keyboard.press("Enter");
  await pasteTerminal(terminal(run("color: rgb(255, 255, 255);", "&#9210;") + " Done:") + terminal(TABLE.join("\n")), "⏺ Done:\n" + TABLE.join("\n"));
  await log("a terminal's box-drawn table pasted, in a second pre block", { md: await A.stored(page), rows: await page.evaluate((sel) => [...document.querySelectorAll(sel + " tr")].map((r) => r.children.length), S.editor) });
  await write("commonplace/Terminal Rows", "before\n");
  await caretAt("before", 6);
  await page.keyboard.press("Enter");
  const rows = ["┌───┬─────┐", "│ a │ b   │", "├───┼─────┤", "│ 1 │ x|y │", "│ 3 │ 4   │", "└───┴─────┘"];
  await pasteTerminal(terminal(rows.join("\n")), rows.join("\n"));
  await log("a terminal's table with no rule between rows, a pipe in a cell", { md: await A.stored(page), cells: await page.evaluate((sel) => [...document.querySelectorAll(sel + " tr")].map((r) => [...r.children].map((c) => c.textContent)), S.editor) });
  await write("commonplace/Terminal Counts", "before\n");
  await caretAt("before", 6);
  await page.keyboard.press("Enter");
  const counts = ["  Started with 5 (1 side list, 4 bigger questions)", "  -- unstarted 5", "", "  Spawned or added since 17 (7 architecture queue)", "  -- done · spawned", "  open 1", "  -- dropped 1", "", "  This morning's session did S14."];
  await pasteTerminal(terminal(counts.join("\n")), counts.join("\n"));
  await log("a terminal's -- lines pasted", { md: await A.stored(page), drawn: await drawn() });
  await write("commonplace/Terminal Command", "before\n");
  await caretAt("before", 6);
  await page.keyboard.press("Enter");
  const ran = ["! node tools/progress/page.ts 2026-11-16 --terminal", "  ⎿  Monday, 16 November 2026", "", "     Started with 5 (1 side list, 4 bigger questions)", "     -- unstarted 5"];
  await pasteTerminal(terminal(ran.join("\n")), ran.join("\n"));
  await log("a terminal's command and its ⎿ output pasted", { md: await A.stored(page), drawn: await drawn() });
  await write("commonplace/Terminal Listing", "before\n");
  await caretAt("before", 6);
  await page.keyboard.press("Enter");
  const listed = ["⏺ Bash(git log --oneline -3)", "  ⎿  bfeecd2 docs: A8 added", "     a03bb5d docs: A7.1.2 done", "     ff11004 refactor: the verdict", "", "⏺ Done, and the", "  rest wraps."];
  await pasteTerminal(terminal(listed.join("\n")), listed.join("\n"));
  await log("a terminal's command output of several lines pasted", { md: await A.stored(page), drawn: await drawn() });
  await write("commonplace/Terminal Source", "x\n");
  await view(true);
  await R.sourceCaretTo(page, "x");
  await page.keyboard.press("End");
  await page.evaluate(([html, plain]) => {
    const dt = new DataTransfer();
    dt.setData("text/html", html);
    dt.setData("text/plain", plain);
    document.querySelector("textarea.source").dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, [terminal(" passed\n  before it landed."), " passed\n  before it landed."]);
  await landed(page, 1200);
  await log("a terminal's copy pasted in the source view", { md: await A.stored(page) });
  await view(false);
});
async function pasteTerminal(html: string, plain: string): Promise<void> {
  await page.evaluate(([sel, html, plain]) => {
    const dt = new DataTransfer();
    dt.setData("text/html", html);
    dt.setData("text/plain", plain);
    document.querySelector(sel).dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, [S.editor, html, plain]);
  await landed(page, 1200);
}
const drawn = () => page.evaluate((sel) => ({ paragraphs: document.querySelectorAll(sel + " p").length, items: document.querySelectorAll(sel + " li").length }), S.editor);
const CODE = "color: rgb(177, 185, 249);";
const run = (style: string, text: string): string => '<div style="display: inline;' + style + '">' + text + "</div>";
const terminal = (inner: string): string => '<div style="font-family: monospace; white-space: pre;">' + inner + "</div>";
const TABLE = ["", "  ┌──────┬──────────────┐", "  │ Item │     What     │", "  ├──────┼──────────────┤", "  │      │ begin failed │", "  │ P1   │  its carries │", "  ├──────┼──────────────┤", "  │ S14  │ the paste    │", "  └──────┴──────────────┘"];
const TERMINAL_HTML = terminal(run("color: rgb(255, 255, 255);", "&#9210;") + " Two commits today, and " + run(CODE, "npm run verify") + " passed\n  before each landed.\n\n  - " + run(CODE, "f2db598") + ": the one-offs split, with every\n    check still covering them.\n  - " + run(CODE, "7603f25") + ": the steps made independent.");
const TERMINAL_TEXT = "⏺ Two commits today, and npm run verify passed\n  before each landed.\n\n  - f2db598: the one-offs split, with every\n    check still covering them.\n  - 7603f25: the steps made independent.";
section("references across verse blocks", async () => {
  /* blocks numbered apart refuse ⌃⌘R with a warning; the next ⌃⌘R, over blocks numbered straight on, copies them as one, its alert not swallowed by the warning */
  await write("commonplace/Blocks", "# Blocks\n\n::: verse\nfirst block\n:::\n\n::: verse\nsecond block\n:::\n\n## Between\n\n::: verse 2\nthird block\n:::");
  await settled(page);
  await R.selectBetween(page, "first block", "second block");
  await R.waitToolbar(page);
  const refused = await R.cornerAfter(page, () => page.keyboard.press("Control+Meta+r"), /straight on/);
  await log("⌃⌘R over blocks numbered apart", { refused });
  await settled(page);
  await R.selectBetween(page, "second block", "third block");
  await R.waitToolbar(page);
  const said = await R.cornerAfter(page, () => page.keyboard.press("Control+Meta+r"), /copied/);
  const copied = await R.clipboardReference(page);
  await log("⌃⌘R over blocks numbered straight on", { said, textHead: copied.textHead, passage: copied.passage });
});
/* the clipboard emptied first and waited for: the corner still read the
   copy before's "copied", and the clipboard was read one copy behind */
async function copiedBy(act: () => Promise<unknown>): Promise<{ said: string | false; lines: string[] }> {
  await page.evaluate(() => navigator.clipboard.writeText(""));
  const said = await R.cornerAfter(page, act, /copied/);
  await page.waitForFunction(async () => !!(await navigator.clipboard.readText()), null, { timeout: 2000, polling: 25 }).catch(() => {});
  return { said, lines: await R.clipboardLines(page) };
}
section("references across blocks of each kind", async () => {
  /* the run on each row kind it lands on: dual-language blocks with a heading between; blocks numbered on both sides, the second opening with the rest of the translation's last line, by Ref and by Ref (all) */
  await write("commonplace/Dual", "# Dual\n\n::: dual-language 1\nArma virumque | Arms and the man\ncano.\n:::\n\n## Between\n\n::: dual-language 3\nTroiae qui | who from Troy\n:::");
  await settled(page);
  await R.selectBetween(page, "cano.", "Troiae qui");
  await R.waitToolbar(page);
  await log("⌃⌘R over dual-language blocks with a heading between", await copiedBy(() => page.keyboard.press("Control+Meta+r")));
  await write("commonplace/Facing", "# Facing\n\n::: verse 1 10\nprima | first\n | second\n:::\n\n::: verse 2 11\n⟨…⟩ | the rest\nsecunda | third\n:::");
  await settled(page);
  await R.selectBetween(page, "second", "third");
  await R.waitToolbar(page);
  await log("⌃⌘R over blocks numbered on both sides, the second opening with a rest", await copiedBy(() => page.keyboard.press("Control+Meta+r")));
  await log("Ref (all) over the same", await copiedBy(() => page.click(".fmt button[title='Copy a reference to both columns']")));
});
