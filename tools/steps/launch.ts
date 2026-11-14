import { section, page, ctx, A, R, S, shot, log, go, stages, rest } from "./kit.ts";

section("launch, panels, the corner, links", async () => {
  await afterWarm();
  await plainClickExternalLink();
});
async function afterWarm(): Promise<void> {
  console.log("the launch's stages:", JSON.stringify(stages));
  await log("after warm", await R.corner(page));
  await log("masthead over Horace", await R.masthead(page));
  if (shot) await page.screenshot({ path: shot.replace(/\.png$/, "-masthead.png"), clip: { x: 0, y: 0, width: 1000, height: 130 } });
  await page.click(S.commonplacesOpener);
  await log("pages panel", await R.panel(page));
  if (shot) await page.screenshot({ path: shot.replace(/\.png$/, "-panel.png"), clip: { x: 0, y: 0, width: 600, height: 260 } });
  await page.click(S.booksOpener);
  await log("books panel, displacing it", await R.panel(page));
  await page.click(S.booksOpener);
  await log("its own opener again", await R.panel(page));
  await page.click(S.commonplacesOpener);
  await page.keyboard.press("Escape");
  await log("after Escape", await R.panel(page));
  await page.click(S.commonplacesOpener);
  await page.mouse.click(500, 400);
  await log("after a click outside", await R.panel(page));
  await page.click(S.commonplacesOpener);
  await page.click(S.panelRow("Williams"));
  await A.waitEntry(page, "commonplace/Williams", 5000);
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
  await go("commonplace/Links");
  await page.click(S.editorLink("#commonplace/Links"));
  /* the editor takes a click's caret a tick after the click */
  await page.waitForFunction(() => { const s = getSelection(); return !!s.rangeCount && s.anchorOffset > 0; }, null, { timeout: 1000 }).catch(() => {});
  await log("a link to itself", { entry: await A.entry(page), ...(await R.corner(page)) });
}
async function plainClickExternalLink(): Promise<void> {
  await page.click(S.editorLink("https://example.org/"));
  await rest(page);
  await log("a plain click on an external link", { entry: await A.entry(page), url: page.url().split("#")[1] });
  const popup = ctx.waitForEvent("page", { timeout: 5000 }).then((p) => p.url(), () => "(no new tab)");
  await page.click(S.editorLink("#commonplace/Horace"), { modifiers: ["Meta"] });
  await rest(page);
  await log("⌘-click on an internal link", { newTab: (await popup).split("#")[1], ...(await R.afterModClick(page)) });
  const popup2 = ctx.waitForEvent("page", { timeout: 5000 }).then((p) => p.url(), () => "(no new tab)");
  await page.click(S.editorLink("https://example.org/"), { modifiers: ["Meta"] });
  await rest(page);
  await log("⌘-click on an external link", { newTab: (await popup2) !== "(no new tab)", ...(await R.afterModClick(page)) });   /* headless has no network: whether a tab opened, not where it got */
  await page.click(S.editorLink("#commonplace/Horace"));
  await A.waitEntry(page, "commonplace/Horace", 5000);
  await log("a plain click on an internal link", { entry: await A.entry(page) });
}
section("fence", async () => {
  /* a verse fence pasted as TEXT mid-paragraph is set down between the halves, its first line inside */
  await go("commonplace/Pasted%20Fence");
  await page.click(S.editor);
  await page.keyboard.type("start end");
  /* THE CARET PLACED THROUGH THE DOM SELECTION, not the keys: Home and the
     arrows moved it on some runs and not others (measured over three
     runs), and the paste then landed at the paragraph's end */
  await rest(page);
  await R.caretAfter(page, "start end", 5);
  await rest(page);
  await R.pasteText(page, "::: verse\nHeil! Heil! | Hail! Hail!\nErlösung | Salvation\n:::");
  await rest(page);
  await log("a fence pasted as text mid-paragraph", { md: await A.stored(page) });
});
section("verse copy", async () => {
  /* a verse block copied inside the rendered view with ⌘C and pasted into a fresh page with ⌘V comes back as the block */
  await go("commonplace/Horace");
  await R.selectAll(page, S.editorVerse);
  await rest(page);
  await page.keyboard.press("Meta+c");
  await go("commonplace/Pasted%20Verse");
  await page.click(S.editor);
  await page.keyboard.press("Meta+v");
  await rest(page);
  { const md = await A.stored(page); console.log("a verse block copied and pasted:", JSON.stringify({ fence: md.startsWith("::: verse"), pairs: await R.pairs(page), head: md.split("\n").slice(0, 3) })); }
});
section("refused fence", async () => {
  /* a refused fence named on the switch back: "::: versey" typed in the source stays a paragraph and the corner says why; a clean switch releases it */
  await go("commonplace/Fenced");
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
});
section("quote tab", async () => {
  /* Tab in a quote nests, Shift-Tab lifts, again at the floor says so; ⌃⌘L opens the Line numbering row over verse */
  await go("commonplace/Quoted");
  await page.click(S.editor);
  await page.keyboard.type("> quoted words");
  await page.keyboard.press("Tab");
  await rest(page);
  await log("Tab in a quote", { md: await A.stored(page) });
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await rest(page);
  await log("Shift-Tab twice", { md: await A.stored(page), corner: await R.cornerText(page) });
  await go("commonplace/Horace");
  await page.keyboard.press("Control+Meta+l");
  await rest(page);
  await log("⌃⌘L over Horace", await R.linesRow(page));
  await page.keyboard.press("Escape");
  await log("Escape", await R.linesRowOpen(page));
});
