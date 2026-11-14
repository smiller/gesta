import { section, page, A, R, S, log, go, cornerText, setAnswer, prompts, confirms, rest } from "./kit.ts";

section("a page renamed with every link following", async () => {
  /* Rename on a page with no sub-pages, a plain name typed: a link to it on another page follows, and the corner says so */
  await A.foreignWrite(page, "commonplace/Rename Me", "me\n");
  await A.foreignWrite(page, "commonplace/Rename Far", "See [it](#commonplace/Rename%20Me) here.\n");
  /* both read by the page before the rename, as entries written elsewhere are */
  await go("commonplace/Rename%20Far");
  await go("commonplace/Rename%20Me");
  setAnswer("Renamed Me");
  prompts.length = 0;
  confirms.length = 0;
  await page.click(S.renameSubPage);
  await A.waitEntry(page, "commonplace/Renamed Me", 5000).catch(() => {});
  await page.waitForFunction((s) => /renamed to/.test(document.querySelector(s)?.textContent || ""), S.corner, { timeout: 3000 }).catch(() => {});
  await log("Rename, Renamed Me typed, Enter", { prompts: prompts.slice(), confirms: confirms.slice(), entry: await A.entry(page), corner: await cornerText(), far: await A.stored(page, "commonplace/Rename Far"), old: await A.stored(page, "commonplace/Rename Me") });
});
section("unused pictures", async () => {
  /* a picture pasted, then deleted from the text: the backups panel offers to remove it, and its button removes it */
  await pictureDeletedTextBackups();
  await removeUnusedPictureClicked();
  await whisperClicked();
});
async function pictureDeletedTextBackups(): Promise<void> {
  await go("commonplace/Unused%20Pictures");
  await page.click(S.editor);
  await page.keyboard.type("A picture: ");
  await R.pastePng(page);
  await R.waitImg(page);
  await R.waitCorner(page, "saved");
  const kept = await A.pictureKeys(page, "commonplace/Unused Pictures");
  await page.keyboard.press("Meta+a");
  await page.keyboard.press("Backspace");
  /* the corner may still say "saved" from the paste: the stored text is what the panel counts */
  for (let i = 0; i < 40 && ((await A.stored(page, "commonplace/Unused Pictures")) || "").includes("!["); i++) await rest(page);
  await page.click(S.backupsButton);
  await page.waitForFunction(() => /unused picture/.test(document.querySelector(".backups")?.textContent || ""), null, { timeout: 5000 }).catch(() => {});
  await log("the picture deleted from the text, the backups panel opened", { kept, md: await A.stored(page, "commonplace/Unused Pictures"), panel: await R.backups(page) });
}
async function removeUnusedPictureClicked(): Promise<void> {
  await page.click(".backups button:has-text('unused picture')").catch(() => {});
  await page.waitForFunction((s) => /removed/.test(document.querySelector(s)?.textContent || ""), S.corner, { timeout: 5000 }).catch(() => {});
  await log("Remove … unused picture clicked, the confirm accepted", { corner: await cornerText(), left: await A.pictureKeys(page, "commonplace/Unused Pictures"), panel: await R.backups(page) });
  await page.click(S.corner).catch(() => {});
}
async function whisperClicked(): Promise<void> {
  await page.waitForFunction((s) => document.querySelector(s)?.textContent === "copied", S.corner, { timeout: 3000 }).catch(() => {});
  await log("the whisper clicked", { corner: await cornerText(), clipboard: await page.evaluate(async () => { for (let i = 0; i < 20; i++) { try { return await navigator.clipboard.readText(); } catch { await new Promise((r) => setTimeout(r, 50)); } } return null; }) });
  await page.keyboard.press("Escape");
}
section("a page moved with its sub-pages", async () => {
  /* Rename on a page whose sub-pages hold text asks where; an address in the bookshelf moves it there with its picture, its text after the text there, a sub-page there already by its title deleted, its links going to that one; a link from elsewhere follows */
  await renameToBookshelfAddress();
  await picturesUnderOldPage();
  await movedEssayPicture();
});
async function renameToBookshelfAddress(): Promise<void> {
  await A.foreignWrite(page, "bookshelf/Mover, Test", "# Test Mover\n");
  await A.foreignWrite(page, "bookshelf/Mover, Test/Essays", "# Essays\n\n[The Twin](#bookshelf/Mover%2C%20Test/Essays/2022-twin)\n");
  await A.foreignWrite(page, "bookshelf/Mover, Test/Essays/2022-twin", "# The Twin\n\nThe longer copy.\n");
  await A.foreignWrite(page, "commonplace/Move Source", "[Essay](#commonplace/Move%20Source/Essay)\n");
  await A.foreignWrite(page, "commonplace/Move Source/2026-twin", "# The Twin\n\nThe shorter copy.\n");
  await A.foreignWrite(page, "commonplace/Move Links", "See [the essay](#commonplace/Move%20Source/Essay?line=1) and [the twin](#commonplace/Move%20Source/2026-twin).\n");
  await go("commonplace/Move%20Source/Essay");
  await page.click(S.editor);
  await page.keyboard.type("An essay with a picture: ");
  await R.pastePng(page);
  await R.waitImg(page);
  await R.waitCorner(page, "saved");
  await go("commonplace/Move%20Source");
  setAnswer(["bookshelf/Mover, Test/Essays"]);
  prompts.length = 0;
  confirms.length = 0;
  await page.click(S.renameSubPage);
  await page.waitForFunction((s) => /moved to/.test(document.querySelector(s)?.textContent || ""), S.corner, { timeout: 5000 }).catch(() => {});
  await log("Rename, an address in the bookshelf typed, Enter, the confirm accepted", {
    prompts: prompts.slice(), confirms: confirms.slice(), entry: await A.entry(page), hash: page.url().split("#")[1], corner: await cornerText(),
    there: await there(""), essay: await there("/Essay"), twin: await there("/2022-twin"), links: await A.stored(page, "commonplace/Move Links"),
    left: [await A.stored(page, "commonplace/Move Source"), await A.stored(page, "commonplace/Move Source/Essay"), await A.stored(page, "commonplace/Move Source/2026-twin")],
  });
  await log("the place's links, hovered", { titles: await page.evaluate((s) => [...document.querySelectorAll(s + " a")].map((a) => a.title), S.editor) });
  await go("bookshelf/Mover%2C%20Test/Essays/Essay");
}
const there = (k: string) => A.stored(page, "bookshelf/Mover, Test/Essays" + k);
async function picturesUnderOldPage(): Promise<void> {
  await R.waitImg(page).catch(() => {});
  await page.waitForFunction(() => { const i = document.querySelector("#editor img"); return i && (i.naturalWidth || i.dataset.missing); }, null, { timeout: 5000 }).catch(() => {});
  await log("the pictures under the old page and the new", { old: await A.pictureKeys(page, "commonplace/Move Source/"), now: await A.pictureKeys(page, "bookshelf/Mover, Test/Essays/") });
}
async function movedEssayPicture(): Promise<void> {
  await log("the moved essay, its picture", { entry: await A.entry(page), missing: await page.evaluate(() => document.querySelector("#editor img")?.dataset.missing || null), ...(await R.picture(page).catch(() => ({}))) });
}
