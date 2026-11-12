import { section, page, A, R, log, go, rest } from "./kit.ts";
import { inPage } from "../adapters/inPage.ts";

section("editing as the old app does", async () => {
  /* the inventory's group 4, where nothing promised either way: each gesture read over both apps, the old app's reading the one to match */
  
  /* a placed selection is read by the editor a moment later */
  
  /* the toolbar's button pressed as a click on it, shown or not: the selection is made by script */
  
  /* the stored text without its last line end: a seed left unedited keeps the one it was written with */
  
  await enterInsideQuoteNew();
  await whollyBoldItalicRow();
  await quotationInsideNote();
  await pictureSGapsQuotation();
  await referenceBlockClickedQ();
  await pageLabelsBesideTheir();
  await nearMissEntryLink();
});
async function enterInsideQuoteNew(): Promise<void> {
  await enterInsideQuoteNew2();
  await typedQuoteSLater();
  await bookmarkSLinkPressed();
}
async function enterInsideQuoteNew2(): Promise<void> {
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
}
async function typedQuoteSLater(): Promise<void> {
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
}
async function bookmarkSLinkPressed(): Promise<void> {
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
}
async function whollyBoldItalicRow(): Promise<void> {
  await log("a wholly bold-italic row", await page.evaluate(() => {
    const colour = (t: string) => { const w = document.createTreeWalker(document.querySelector("#editor .ProseMirror") || document.getElementById("page"), NodeFilter.SHOW_TEXT); for (let n = w.nextNode(); n; n = w.nextNode()) if (n.data === t) return getComputedStyle(n.parentElement).color; return null; };
    const king = colour("KING JOHN");
    return { king: king === colour("SPEAKER") ? "as the speaker" : king === colour("Stage direction") ? "as the stage direction" : king };
  }));
}
async function quotationInsideNote(): Promise<void> {
  await write("page/Note Quote", "::: note\n> quoted in a note\n:::\n");
  await log("a quotation inside a note", await page.evaluate(() => { const q = document.querySelector("#editor .note blockquote, #page .note blockquote"); if (!q) return { quote: null as string | null }; const cs = getComputedStyle(q); return { fill: cs.backgroundColor !== "rgba(0, 0, 0, 0)", rule: parseFloat(cs.borderLeftWidth) > 0 || getComputedStyle(q, "::before").content !== "none" }; }));
  const box = "data:image/svg+xml;base64," + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="120"><rect width="300" height="120" fill="#ccc"/></svg>').toString("base64");
  await write("page/Spacing", `early light:\n\n![](${box})\n\n~ ~\n\nA paragraph.\n\n> ::: verse 265\n> ye Elves of Hilles,\n> :::\n\n> ::: verse 197 265\n> auraeque | Ye Ayres\n> :::\n\n> A quoted paragraph.\n`);
  await page.waitForFunction(() => [...document.querySelectorAll("#editor img:not(.ProseMirror-separator)")].every((i) => i.complete), null, { timeout: 2000 }).catch(() => {});
}
async function pictureSGapsQuotation(): Promise<void> {
  await log("a picture's gaps and a quotation's top", await page.evaluate(() => {
    const R = (e: Element) => e.getBoundingClientRect();
    const top = [...document.querySelectorAll("#editor .ProseMirror > *")];
    const at = (t: string) => top.find((e) => e.textContent === t);
    const img = document.querySelector("#editor .ProseMirror > p > img:not(.ProseMirror-separator)");
    if (!img) return { picture: null as string | null };
    return {
      abovePicture: Math.round(R(img).top - R(at("early light:")).bottom),
      belowPicture: Math.round(R(at("~ ~")).top - R(img).bottom),
      paragraphGap: Math.round(R(at("A paragraph.")).top - R(at("~ ~")).bottom),
      quoteTopToText: top.filter((e) => e.tagName === "BLOCKQUOTE").map((b) => Math.round(R(b.querySelector(".vrow, p")).top - R(b).top)),
    };
  }));
}
async function referenceBlockClickedQ(): Promise<void> {
  await write("page/Reference Block", "::: reference\nroman book and canto\n:::\n\nafter\n");
  await page.click("#editor .reference, #page .reference", { timeout: 2000 }).catch(() => {});
  await rest(page);
  await page.keyboard.type("Q");
  await rest(page);
  await log("a reference block clicked, Q typed", { md: await stored(), corner: await corner() });
  const greek = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega".split(" ");
  await write("page/Spaced Leaves", greek.concat(greek, greek).map((w, i) => w + "word⟨" + (i + 1) + "⟩").join(" ") + "\n");
  await page.waitForTimeout(600);
}
async function pageLabelsBesideTheir(): Promise<void> {
  /* a label stands off its leaf when its middle is further than half a line from the middle of the first word after its marker */
  await log("page labels beside their leaf's first word", await page.evaluate(inPage(labelsOffLeaf, folioWordBox, folioLabelMid)));
}
/* the box of the first letter of the word after a page marker, or null */
function folioWordBox(root: Element, m: Element): DOMRect | null {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  w.currentNode = m;
  let t = w.nextNode(); while (t && !t.data.trim()) t = w.nextNode();
  if (!t) return null;
  const i = t.data.search(/\S/), r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1);
  return r.getBoundingClientRect();
}
/* the middle of a marker's label: its gutter row's, or its own drop below the marker */
function folioLabelMid(m: Element, word: DOMRect): number {
  const gutter = [...document.querySelectorAll("#foliogutter > *")].find((l) => l.textContent.trim() === "p. " + m.getAttribute("data-folio"));
  if (gutter) { const g = gutter.getBoundingClientRect(); return g.top + g.height / 2; }
  const b = m.getBoundingClientRect();
  return b.top + (parseFloat(getComputedStyle(m, "::after").marginTop) || 0) + word.height / 2;
}
function labelsOffLeaf(): { markers: number; off: number } {
  const root = document.querySelector("#editor .ProseMirror") || document.getElementById("page");
  const markers = [...root.querySelectorAll("[data-folio]")];
  let off = 0;
  for (const m of markers) {
    const word = folioWordBox(root, m);
    if (word && Math.abs(folioLabelMid(m, word) - (word.top + word.height / 2)) > word.height / 2) off++;
  }
  return { markers: markers.length, off };
}
async function nearMissEntryLink(): Promise<void> {
  await write("page/Near Miss", "x\n");
  await caretAt("x", 1);
  await R.pasteText(page, " [near](#pagex)");
  await rest(page);
  await log("a near-miss entry link pasted", { md: await stored(), links: await page.evaluate(() => document.querySelectorAll("#editor a, #page a").length) });
}
const view = async (source: boolean) => { if ((await R.inSource(page)) !== source) { await page.keyboard.press("Control+Meta+m"); await rest(page); } };
const write = async (key: string, text: string | null) => { await A.foreignWrite(page, key, text); await go(key); await view(false); };
const caretAt = async (needle: string, offset: number) => { await R.caretAfter(page, needle, offset); await rest(page); };
const between = async (a: string, b: string) => { await R.selectBetween(page, a, b); await rest(page); };
const button = async (title: string) => { await page.evaluate((t) => document.querySelector(".fmt button[title='" + t + "']")?.click(), title); await rest(page); };
const copied = async () => { await page.keyboard.press("Meta+c"); await rest(page); return R.clipboardLines(page); };
const stored = async () => ((await A.stored(page)) ?? "").replace(/\n+$/, "");
const corner = () => page.evaluate(() => document.querySelector(".saved.show")?.textContent || "");
