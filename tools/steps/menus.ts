import { section, page, A, R, S, log, go, rest, still, writeAll, seededIn, wheelTo, caretAt, fixture, STANZA_SEEDS } from "./kit.ts";

const OVID = "bookshelf/Ovid/Metamorphoses/Book 1";
const SHELVES = "# Shelves\n\n## Latin\n- [Boethius](#bookshelf/Boethius)\n- [Ovid](#bookshelf/Ovid)\n\n## English\n";
section("menus", async () => {
  /* the keys over every kind of row: a shelf's heading passed over, an author on a shelf, one on the shelf with no list, the acts at the foot */
  await writeAll({ "bookshelf/Shelves": SHELVES, "bookshelf/Spenser, Edmund": STANZA_SEEDS["bookshelf/Spenser, Edmund"], "bookshelf/Ovid": "# Ovid\n", [OVID]: fixture("ovid-metamorphoses-1.md") });
  const seeded = await seededIn(OVID);
  await keysOverRows(seeded);
  await focusBack();
  await roomMade();
});
async function keysOverRows(seeded: boolean): Promise<void> {
  const sel = async () => ({ sel: (await R.menuNow(page)).sel });
  await go("commonplace/Horace");
  await page.click(S.bookshelfOpener);
  await page.waitForSelector(".menu .shelf", { timeout: 5000 }).catch(() => {});
  await log("the bookshelf menu opened", { seeded, ...(await sel()) });
  for (const k of ["ArrowDown", "ArrowDown", "ArrowDown", "ArrowDown", "ArrowDown", "Home", "ArrowUp", "End"]) {
    await page.keyboard.press(k);
    await log(k, await sel());
  }
  await page.keyboard.type("spe");
  await log("spe typed", await sel());
  await page.keyboard.press("Enter");
  await A.waitEntry(page, "bookshelf/Spenser, Edmund", 5000).catch(() => {});
  await log("Enter on Edmund Spenser", { entry: await A.entry(page), menu: await R.menu(page) });
  await go("commonplace/Horace");
  await page.click(S.commonplaceOpener);
  await page.keyboard.press("End");
  await log("the commonplace menu, End", await sel());
}
async function focusBack(): Promise<void> {
  /* the caret where it stood, after Escape, Tab and the icon pressed again */
  await go("commonplace/Horace");
  await caretAt("Maecenas", 4);
  for (const close of ["Escape", "Tab", "icon"]) {
    await page.click(S.bookshelfOpener);
    await rest(page);
    if (close === "icon") await page.click(S.bookshelfOpener); else await page.keyboard.press(close);
    await rest(page);
    await log("closed by " + close, { menu: await R.menu(page), beforeCaret: (await R.menuNow(page)).beforeCaret });
  }
}
async function roomMade(): Promise<void> {
  /* a wide entry moves over for the open menu, the line at the top held there; a narrow window keeps the menu over the text */
  const room = async () => { const m = await R.menuNow(page); return { room: m.room, textLeft: m.textLeft }; };
  await go(OVID);
  await still(page);
  await log("Ovid 1, the menu closed", await room());
  await wheelTo(2400);
  await still(page);
  const top = (await R.menuNow(page)).topLine;
  await page.click(S.bookshelfOpener);
  await still(page);
  await log("Ovid 1 scrolled, the menu open", { ...(await room()), sameTopLine: (await R.menuNow(page)).topLine === top });
  await page.keyboard.press("Escape");
  await still(page);
  await log("Ovid 1, the menu closed again", { ...(await room()), sameTopLine: (await R.menuNow(page)).topLine === top });
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: 860, height: size.height });
  await go(OVID);
  await page.click(S.bookshelfOpener);
  await still(page);
  await log("Ovid 1 at 860 px, the menu open", { room: (await R.menuNow(page)).room });
  await page.keyboard.press("Escape");
  await page.setViewportSize(size);
}
