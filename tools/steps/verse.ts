import { section, page, A, R, S, log, go, seededIn, rest, still, fixture } from "./kit.ts";

section("a work in stanzas", async () => {
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
});
section("Old English verse", async () => {
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
});
section("split lines", async () => {
  /* a verse line split between speakers is one line: Samson 1563, "Relate by whom." / "By Samson." / "That still lessens", each rest a space past the end of the half above and numbered with it, the 1671 margin's 1570 and 1580 where they stand; typed into the first half, the rests follow it; ⌃⌘R on "By Samson." refers to 1563; a rest typed longer than its row has room for is set in less, not wrapped */
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
});
section("dual-language", async () => {
  /* Ovid's Latin beside Miller's prose: each sentence level with the row its Latin starts on, the Latin waiting where the English runs long, split lines set in (one opening a fence, past the half the fence before closes), a note under the column its mark is in, the English held to 30em; typed longer, a sentence still clears the next */
  await dualLanguageOvid();
  await dualLanguageBlockNote();
});
async function dualLanguageOvid(): Promise<void> {
  await dualLanguageInOvid();
  await lineBarSkippedLine();
}
async function dualLanguageInOvid(): Promise<void> {
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
  await still(page);
  await page.keyboard.press("ArrowDown");
  await rest(page);
  await log("ArrowDown from a block's last sentence", { cell: await R.caretCell(page) });
  await page.keyboard.press("ArrowUp");
  await rest(page);
  await log("ArrowUp from a block's first sentence", { cell: await R.caretCell(page) });
  /* a line the Loeb leaves out but counts: nothing drawn, the line after it 547 (qua nimium placui), and ⌃⌘G for 546 lands there saying so */
  await log("a skipped line number", await page.evaluate(() => { const row = [...document.querySelectorAll("#editor .vrow")].find((r) => r.textContent.startsWith("qua nimium placui")); return { line: row?.dataset.line ?? null, before: row?.previousElementSibling?.className, drawn: row?.previousElementSibling ? getComputedStyle(row.previousElementSibling).display : null }; }));
  await A.stored(page);   /* a save landing after the Enter takes the corner from the word this reads */
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  await page.keyboard.type("546");
  await page.keyboard.press("Enter");
}
async function lineBarSkippedLine(): Promise<void> {
  await rest(page);
  await log("⌃⌘G for a skipped line", { ...(await R.linebar(page)), landed: (await R.landedText(page))?.slice(0, 30) ?? null });
  await page.keyboard.press("Escape");
  await rest(page);
  /* a drag over one sentence's English: it selects that sentence alone, the Latin it stands beside marked as selected, and ⌃⌘R refers to and quotes that Latin */
  await R.dragCell(page, "Through this the River Peneus");
  await rest(page);
  await log("a drag over one sentence's English", await R.dualSelection(page));
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
  await log("⌃⌘R on one sentence's English", { lines: await R.clipboardLines(page) });
  await page.keyboard.press("Escape");
  await rest(page);
  /* quoted, the block stays dual-language: two Latin lines beside a six-line sentence keep together, the English held inside the quotation */
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
}
async function dualLanguageBlockNote(): Promise<void> {
  /* a dual-language block in a note: Satire 1.10's bracketed lines, their English at the page's English edge, each note under its own column, the Latin unwrapped */
  await A.foreignWrite(page, "bookshelf/Horace/Satires/1.10", fixture("horace-satires-1.10.md"));
  await page.goto(A.url("bookshelf/Horace/Satires/1.10"));
  await A.waitEntry(page, "bookshelf/Horace/Satires/1.10", 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  await log("a dual-language block in a note", await R.dualInset(page));
}
section("facing numbers", async () => {
  /* Ovid's Latin beside Golding's verse: a verse block numbered on both sides, Golding's numbers drawn on the right; a row with nothing on the left takes no Latin number; ⌃⌘G goes by Golding's numbers; ⌃⌘R refers to both */
  await facingNumbersOpening();
  await verseBlockNumberedBoth();
  await lineBarGoldingLine();
  await goldingLineFollowing();
});
async function facingNumbersOpening(): Promise<void> {
  await A.foreignWrite(page, "bookshelf/Ovid/Metamorphoses (with Golding’s translation)", "# *Metamorphoses* (with Golding’s translation)\n\n- [Book 7](#bookshelf/Ovid/Metamorphoses%20(with%20Golding%E2%80%99s%20translation)/Book%207)\n");
  await A.foreignWrite(page, "bookshelf/Ovid/Metamorphoses (with Golding’s translation)/Book 7", fixture("ovid-golding-7.md"));
  await page.goto(A.url("bookshelf/Ovid/Metamorphoses%20(with%20Golding%E2%80%99s%20translation)/Book%207"));
  await A.waitEntry(page, "bookshelf/Ovid/Metamorphoses (with Golding’s translation)/Book 7", 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
}
async function verseBlockNumberedBoth(): Promise<void> {
  await log("a verse block numbered on both sides", await page.evaluate(() => {
    const block = document.querySelector("#editor .verse[data-facing]");
    if (!block) return { block: false };
    const rows = [...block.querySelectorAll(":scope > .vrow")];
    const lines = (el: Element) => { const g = document.createRange(); g.selectNodeContents(el); return new Set([...g.getClientRects()].filter((x) => x.width).map((x) => Math.round(x.top))).size; };
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
}
async function lineBarGoldingLine(): Promise<void> {
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
}
const refAll = () => page.evaluate(() => { const b = document.querySelector(".fmt button[title='Copy a reference to both columns']"); return b ? !b.hidden && getComputedStyle(b).display !== "none" : null; });
async function goldingLineFollowing(): Promise<void> {
  await page.keyboard.press("Escape");
}
section("scripture's Verse box", async () => {
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
});
section("by book, chapter, and paragraph", async () => {
  /* the Line box takes a paragraph on such a work, and ⌃⌘R names the book, the chapter and the paragraph */
  await byParagraphOpening();
  await byParagraphFollowing();
});
async function byParagraphOpening(): Promise<void> {
  await byParagraphWork();
  await backWorkParagraph();
}
const AUGUSTINE = "bookshelf/Augustine/De Doctrina Christiana", AUGUSTINE_BOOK = AUGUSTINE + "/Book 2";
async function byParagraphWork(): Promise<void> {
  await lineBarOnWorkByParagraph();
  await escapeOnWorkByParagraph();
  await referenceOnWorkByParagraph();
  await lineBarNextPageAfterWork();
}
async function lineBarOnWorkByParagraph(): Promise<void> {
  await A.foreignWrite(page, "bookshelf/Augustine", "# Augustine\n");
  await A.foreignWrite(page, AUGUSTINE, "# De Doctrina Christiana\n\n::: reference\nby book, chapter, and paragraph\n:::\n");
  await A.foreignWrite(page, AUGUSTINE_BOOK, "# Book 2\n\n## Chapter 40\n\n::: prose 60\n60. Philosophi autem. | 60. Moreover the philosophers.\nSicut enim Aegyptii. | For as the Egyptians.\n\n61. Nam quid aliud. | 61. And what else.\n:::\n\n## Chapter 41\n\n::: prose 62\n62. Meminerint ergo. | 62. Let them remember.\n:::\n");
  await page.goto(A.url(AUGUSTINE_BOOK.replace(/ /g, "%20")));
  await A.waitEntry(page, AUGUSTINE_BOOK, 5000).catch(() => {});
  await R.settle(page);
  await rest(page);
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  await page.keyboard.type("61");
  await page.keyboard.press("Enter");
  await rest(page);
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
}
async function escapeOnWorkByParagraph(): Promise<void> {
  await page.evaluate(() => { const w = document.createTreeWalker(document.querySelector("#editor .ProseMirror"), NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const i = n.data.indexOf("Nam quid aliud"); if (i >= 0) { getSelection().setBaseAndExtent(n, i, n, i + 14); break; } } });
  await rest(page);
  await page.keyboard.press("Control+Meta+r");
  await rest(page);
}
async function referenceOnWorkByParagraph(): Promise<void> {
  await log("⌃⌘R on a work by paragraph", { label: await page.evaluate(async () => { for (let i = 0; i < 40; i++) { const t = await navigator.clipboard.readText().catch(() => ""); if (t.includes("Augustine")) return t.split("\n")[0].replace(/\]\(#[^)]*\)/, "]"); await new Promise((r) => setTimeout(r, 50)); } return "not landed"; }) });
  await page.evaluate(() => { location.hash = "#page/Horace"; });
  await R.settle(page);
  await rest(page);
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
}
async function lineBarNextPageAfterWork(): Promise<void> {
  await log("⌃⌘G on the next page after a work by paragraph", { open: await page.evaluate(() => !document.querySelector(".linebar").hidden), box: await boxLabel() });
  await page.evaluate((h) => { location.hash = h; }, "#" + AUGUSTINE_BOOK.replace(/ /g, "%20"));
  await A.waitEntry(page, AUGUSTINE_BOOK, 5000).catch(() => {});
}
async function backWorkParagraph(): Promise<void> {
  await R.settle(page);
  await rest(page);
  await page.keyboard.press("Control+Meta+g");
  await rest(page);
  await log("back on a work by paragraph", { open: await page.evaluate(() => !document.querySelector(".linebar").hidden), box: await boxLabel() });
}
const landed = () => page.evaluate(() => document.querySelector("#editor .landed")?.textContent.slice(0, 24) ?? null);
const boxLabel = () => page.evaluate(() => document.querySelector("label[for=lineinput]").textContent);
async function byParagraphFollowing(): Promise<void> {
  await page.keyboard.press("Escape");
  await rest(page);
}
