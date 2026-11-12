import { appendFileSync, mkdirSync } from "node:fs";
import { section, page, A, R, S, log, go, cornerText, landed, rest } from "./kit.ts";
import { inPage } from "../adapters/inPage.ts";

section("reference copy", async () => {
  /* the rich flavour: ⌃⌘R over a selection in a paired verse block writes markdown and HTML, the HTML carrying the reference anchor and the pair's grid inline */
  await go("page/Horace");
  await R.selectAll(page, S.editorCell);
  /* the bar, not 100ms: it shows after the selectionchange the editor takes the selection on */
  /* the bar has missed about 1 full run in 15 and never in this step's
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
const barMiss = () => R.waitBar(page).then((): string | null => null, (e: Error) => e.message);
section("a reference pasted", async () => {
  /* ⌃⌘R's reference pasted with ⌘V into another entry: the link stored by its bare address (#page/…), never the page's full file address */
  await referencePasted();
  await proseTwoSpacesPasted();
  await referencePastedMidSentence();
  await pageOwnReferencePasted();
});
async function referencePasted(): Promise<void> {
  await go("page/Horace");
  await R.selectAll(page, S.editorCell);
  const barMissed = await R.waitBar(page).then((): string | null => null, (e: Error) => e.message);
  const said = await R.cornerAfter(page, () => page.keyboard.press("Control+Meta+r"), /copied|copy/);
  /* the HTML flavour is the paste's source and carries the full address, so a bare link stored is the paste's own doing; the old app's copy was still landing at the first read ("Clipboard data has changed") */
  const copied = await page.evaluate(inPage(copiedLink, linkKind, htmlLink));
  await go("page/Referred");
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
  await go("page/Williams/Witchcraft 3");
  const spanned = await R.selectBetween(page, "though they were not vampires", "could take again");
  const barMissedProse = await R.waitBar(page).then((): string | null => null, (e: Error) => e.message);
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
}
async function referencePastedMidSentence(): Promise<void> {
  /* the same reference pasted mid-sentence: its label alone, no colon, the caret after it */
  await R.caretAfter(page, "greater.", 8);
  await page.keyboard.press("Meta+v");
  await rest(page);
  /* the paste may not have landed in two frames, and no edit is then there to wait on: the reading says what stood when the wait ran out */
  { const md = await landedAfter((m) => /greater\.\[\*Williams/.test(m)); const screen = await page.evaluate(() => { const s = getSelection(); return { caretAfter: s.anchorNode?.textContent.slice(Math.max(0, s.anchorOffset - 8), s.anchorOffset), caretBefore: s.anchorNode?.textContent.slice(s.anchorOffset, s.anchorOffset + 6) }; }); await log("a reference pasted mid-sentence", { ...screen, references: md.split("):\n").length - 1, referred: /greater\.\[\*Williams\*[^\]]*\]\(#page\/Williams\/Witchcraft%203\?h=[^)]*\) *The/.test(md), colon: /greater\.\[[^\]]*\]\([^)]*\):/.test(md) }); }
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
});
section("card copy", async () => {
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
});
section("grid", async () => {
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
});
section("paired card", async () => {
  /* a card's and a note's paired verse split by their own widest lines: equal halves wrapped four lines of a card whose translation needed a third of it */
  await pairedCardOpening();
  await cardNotePairedVerse();
});
async function pairedCardOpening(): Promise<void> {
  await go("page/Paired%20Card");
  await page.click(S.editor);
  await R.pasteText(page, "::: card-light-blue\n" + pairs + "\n:::\n\n::: note\n" + pairs + "\n:::");
  await page.waitForTimeout(700);
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
  await picturePastedAnotherEntry();   /* the pin read, dismissed as a reader does: a whisper yields to it */
});
async function picturePasted(): Promise<void> {
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
  await go("page/Pictured%20Away");
  await page.click(S.editor);
  await page.keyboard.type("Aimed here");
  await R.pastePng(page);
  await page.evaluate(() => { location.hash = "#page/Horace"; });
  await A.waitEntry(page, "page/Horace", 5000).catch(() => {});
  await page.waitForTimeout(1500);
  await log("a picture pasted, then another entry at once", { entry: await A.entry(page), picturesHere: await page.evaluate((s) => document.querySelectorAll(s).length, S.editorImg), corner: await cornerText(), aimedAtHasOne: /!\[/.test((await A.stored(page, "page/Pictured Away")) || "") });
  await page.click(S.corner).catch(() => {});
}
