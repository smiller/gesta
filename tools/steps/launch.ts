import { section, laid, settled, page, ctx, A, R, S, shot, log, go, stages, rest, jump, caretAt, searchFor, view, writeAll, landed } from "./kit.ts";

section("launch, menus, the corner, links", async () => {
  await afterWarm();
  await plainClickExternalLink();
  await followedByKey();
});
async function afterWarm(): Promise<void> {
  console.log("the launch's stages:", JSON.stringify(stages));
  /* the info's words, not whether they still show: a run's load decides that */
  const { text, pill } = await R.corner(page);
  await log("after warm", { text, pill });
  await log("masthead over Horace", await laid(R.masthead));
  if (shot) await page.screenshot({ path: shot.replace(/\.png$/, "-masthead.png"), clip: { x: 0, y: 0, width: 1000, height: 130 } });
  await page.click(S.commonplaceOpener);
  await log("the commonplace menu", await R.menu(page));
  if (shot) await page.screenshot({ path: shot.replace(/\.png$/, "-panel.png"), clip: { x: 0, y: 0, width: 600, height: 260 } });
  await page.click(S.bookshelfOpener);
  await log("the bookshelf menu, displacing it", await R.menu(page));
  await page.click(S.bookshelfOpener);
  await log("its own opener again", await R.menu(page));
  await page.click(S.commonplaceOpener);
  await page.keyboard.press("Escape");
  await log("after Escape", await R.menu(page));
  await page.click(S.commonplaceOpener);
  await settled(page);
  await page.mouse.click(500, 400);
  await log("after a click outside", await R.menu(page));
  await page.click(S.commonplaceOpener);
  await page.click(S.menuRow("Williams"));
  await A.waitEntry(page, "commonplace/Williams", 5000);
  await log("after a row click", { entry: await A.entry(page), menu: await R.menu(page) });
  await jump(page, 3200);
  await log("3.2 s later", await R.corner(page));
  await page.click(S.editor);
  await page.keyboard.press("End");
  await page.keyboard.type(" corner");
  await landed(page, 1500);
  await log("after typing", await R.corner(page));
  await page.keyboard.press("Control+Meta+c");
  await page.waitForSelector(".alert.success.show", { timeout: 2000 }).catch(() => {});
  await log("after ⌃⌘C", await R.corner(page));
  if (shot) await page.screenshot({ path: shot, clip: { x: 0, y: 500, width: 500, height: 100 } });
  await page.click(".alert.success.show", { timeout: 2000 }).catch(() => {});
  await log("after the click", await R.corner(page));
  await page.keyboard.press("Control+Meta+,");
  await rest(page);
  await log("after ⌃⌘, on the first entry", await R.corner(page));
  await go("commonplace/Links");
  await page.click(S.editorLink("#commonplace/Links"));
  /* the editor takes a click's caret a tick after the click */
  await page.waitForFunction(() => { const s = getSelection(); return !!s.rangeCount && s.anchorOffset > 0; }, null, { timeout: 1000 }).catch(() => {});
  await log("a link to itself", { entry: await A.entry(page), text: await R.saidText(page) });
}
async function plainClickExternalLink(): Promise<void> {
  await page.click(S.editorLink("https://example.org/"));
  await rest(page);
  await log("a plain click on an external link", { entry: await A.entry(page), url: page.url().split("#")[1] });
  const newTab = ctx.waitForEvent("page", { timeout: 5000 }).then((p) => p.url(), () => "(no new tab)");
  await page.click(S.editorLink("#commonplace/Horace"), { modifiers: ["Meta"] });
  await rest(page);
  await log("⌘-click on an internal link", { newTab: (await newTab).split("#")[1], ...(await R.afterModClick(page)) });
  const newTab2 = ctx.waitForEvent("page", { timeout: 5000 }).then((p) => p.url(), () => "(no new tab)");
  await page.click(S.editorLink("https://example.org/"), { modifiers: ["Meta"] });
  await rest(page);
  await log("⌘-click on an external link", { newTab: (await newTab2) !== "(no new tab)", ...(await R.afterModClick(page)) });   /* headless has no network: whether a tab opened, not where it got */
  await page.click(S.editorLink("#commonplace/Horace"));
  await A.waitEntry(page, "commonplace/Horace", 5000);
  await log("a plain click on an internal link", { entry: await A.entry(page) });
}
async function followedByKey(): Promise<void> {
  const followed = async (label: string, needle: string, offset: number, said = false) => {
    await go("commonplace/Links");
    await caretAt(needle, offset);
    await page.keyboard.press("Control+Meta+Enter");
    await rest(page);
    await log(label, { entry: await A.entry(page), ...(said ? { said: await R.saidText(page) } : {}) });
  };
  await followed("⌃⌘Enter inside a link", "Horace", 3);
  await followed("⌃⌘Enter just after a link", "Horace", 6);
  await followed("⌃⌘Enter away from a link", "A link to", 2);
  await followed("⌃⌘Enter on a link to itself", "itself", 2, true);
  const newTab = ctx.waitForEvent("page", { timeout: 5000 }).then(() => true, () => false);
  await followed("⌃⌘Enter on an external link", "outside", 2);
  await log("an external link's new tab", { newTab: await newTab });
  await go("commonplace/Links");
  await view(true);
  const source = () => page.evaluate(() => document.querySelector<HTMLTextAreaElement>("#editor textarea")?.value ?? null);
  await page.evaluate(() => { const ta = document.querySelector<HTMLTextAreaElement>("#editor textarea")!; const at = ta.value.indexOf("Horace") + 3; ta.focus(); ta.setSelectionRange(at, at); });
  const before = await source();
  await page.keyboard.press("Control+Meta+Enter");
  await rest(page);
  await log("⌃⌘Enter in the source view", { entry: await A.entry(page), sourceKept: (await source()) === before });
  await view(false);
  await writeAll({ "commonplace/Script Link": "A [script](javascript:void(0)) link.\n" });
  await go("commonplace/Script%20Link");
  const scriptTab = ctx.waitForEvent("page", { timeout: 2000 }).then(() => true, () => false);
  await page.click("#editor a[href^='javascript']", { modifiers: ["Meta"] });
  await rest(page);
  await log("⌘-click on a script link", { newTab: await scriptTab, ...(await R.afterModClick(page)) });
  for (const [key, label] of [["Enter", "Enter on a search result inside a link"], ["Control+Meta+Enter", "⌃⌘Enter on a search result inside a link"]]) {
    await go("commonplace/Links");
    await searchFor(page, "outside");
    const hits = await page.waitForSelector(S.searchRows + ".hit", { timeout: 5000 }).then(() => true, () => false);
    const opened = ctx.waitForEvent("page", { timeout: 2000 }).then(() => true, () => false);
    await page.keyboard.press(key);
    await settled(page);
    await log(label, { hits, entry: await A.entry(page), search: await R.searchOpen(page), newTab: await opened });
  }
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
  await log("Shift-Tab twice", { md: await A.stored(page), corner: await R.saidText(page) });
  await go("commonplace/Horace");
  await page.keyboard.press("Control+Meta+l");
  await rest(page);
  await log("⌃⌘L over Horace", await R.linesRow(page));
  await page.keyboard.press("Escape");
  await log("Escape", await R.linesRowOpen(page));
});
