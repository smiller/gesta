// The CURRENT APP's adapter for the shared headless steps (helium-steps.mjs):
// ../writer/index.html opened from file://, seeded through its window.gesta
// seam, its screen read through its own ids. Its output is the APPROVED
// behaviour the successor's run is diffed against (helium-approve.mjs):
// asked 2026-09-12, after the walk's order was found ported from an older
// spelling of the current app. The selectors and seam calls are from the
// map made the same day (the seam at index.html:19334, the markup at 1516–1739).
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { readFileSync } from "node:fs";
export const name = "writer";
export const profile = resolve(tmpdir(), "gesta-helium-writer-profile");
const PAGE = "file://" + resolve("../writer/index.html");
export const url = (hash, query = "") => PAGE + (query ? "?" + query : "") + "#" + hash;
const FIX = { horace: "fixtures/horace-odes-1.1.md", pippa: "fixtures/pippa-passes-intro.md", twelfth: "fixtures/twelfth-night-1.1.md", williams: "fixtures/williams-witchcraft-3.md" };
/* the seeds written through the seam as the current app's HTML, its own
   converter doing the reading; the derived lists rebuilt after */
export async function launch(page, seeds) {
  /* seeded from TODAY, not from Horace: the open page's autosave of its
     blank body landed after the seed and emptied Horace (measured
     2026-09-12, the first run) */
  await page.goto(url(new Date().toISOString().slice(0, 10)));
  await page.waitForFunction(() => window.gesta && document.getElementById("page")?.getAttribute("contenteditable") === "true", null, { timeout: 15000 });
  const bodies = {};
  for (const [k, v] of Object.entries(seeds)) bodies[k] = FIX[v] ? readFileSync(resolve(FIX[v]), "utf8") : v;
  const n = await page.evaluate(async (bodies) => { const G = window.gesta; let n = 0; for (const k of Object.keys(bodies)) { await G.setEntry(k, G.mdToHtml(bodies[k])); n++; } G.reindex(); return n; }, bodies);
  await page.goto(url("page/Horace"));
  await page.reload();
  await waitEntry(page, "page/Horace");
  return "seeded " + n;
}
const KEY = () => { const G = window.gesta, s = G.state(); return G.entryKey(s.date, s.tag); };
export const entry = (page) => page.evaluate(KEY);
/* the key AND the paint: the current app sets its state before the body
   is painted, and a reader that ran between found an empty #page */
export const waitEntry = (page, key, ms = 15000) => page.waitForFunction((k) => { const G = window.gesta; if (!G) return false; const s = G.state(); if (G.entryKey(s.date, s.tag) !== k) return false; const p = document.getElementById("page"); return !G.entryHtml(k) || p.childElementCount > 0; }, key, { timeout: ms });
export const waitWarm = (page) => page.waitForFunction(() => document.getElementById("page")?.getAttribute("contenteditable") === "true", null, { timeout: 15000 });
/* what the store holds, read through the seam and turned back into markdown
   by the current app's own converter */
export const stored = async (page, which) => { await page.waitForTimeout(800); return page.evaluate((which) => { const G = window.gesta; const s = G.state(); const key = which || G.entryKey(s.date, s.tag); const html = G.entryHtml(key); return html ? G.htmlStringToMd(html) : null; }, which); };
/* the gestures the two apps spell differently: the create is a chord in
   the successor (⌃⌘N, asked 2026-09-07) and a button here */
export const act = {
  create: async (page) => { await page.click("#tagbtn"); },
  createOnLeaf: async () => ({ unavailable: "no ⌃⌘N in the current app; the button is hidden on a tagged entry" }),
};
export const sel = {
  editor: "body:not(.mdview) #page", editorFirst: "#page > :first-child",
  pagesOpener: "#pagebtn", booksOpener: "#booksbtn",
  panelRow: (name) => "#pagespanel a[title='" + name + "']",
  corner: "#saved.show", backupsButton: "#backupsbtn",
  source: "body.mdview #page", copybtn: "#copybtn", fmtB: ".fmt .b", fmtTag: ".fmt .t",
  shortcutsEditor: "#shortcutedit", shortcutsSave: "#shortcutsave", shortcutsInput: "#shortcutinput",
  bookmarkKey: "#bookmarkspanel .bookmark-setalias", bookmarkDel: "#bookmarkspanel .bookmark-del",
  tagbarLink: (href) => "#tagbar a[href='" + href + "']", renameButton: "#renamebtn", deleteButton: "#delbtn",
  gotoDay: "#pagegoto select[aria-label='Day']", gotoDestination: "#pagegoto select[aria-label='Destination']", searchScope: "#pagesearchscope", searchRows: "#pagesearchresults li",
  editorLink: (href) => "#page a[href='" + href + "']", editorImg: "#page img", editorPre: "#page pre", editorVerse: "#page .verse", editorCard: "#page .card-light-blue", editorCell: "#page .vrow .va",
};
export const screen = (page) => page.evaluate(() => {
  const q = (sel) => document.querySelector(sel);
  const G = window.gesta, st = G.state(), key = G.entryKey(st.date, st.tag);
  const sel = document.getSelection();
  const selected = sel && !sel.isCollapsed ? sel.toString().length + " chars" : "none";
  const panel = [["pages", "#pagespanel"], ["pages", "#bookspanel"], ["help", "#helppanel"], ["bookmarks", "#bookmarkspanel"], ["backups", "#backuppanel"], ["shortcuts", "#shortcutspanel"]].find(([, c]) => q(c) && !q(c).hidden);
  const rows = [["goto", "#pagegoto"], ["search", "#pagesearch"], ["lines", "#pagelines"]].filter(([, c]) => q(c)?.open && !q(c).hidden).map(([n]) => n);
  if (q("#linebar") && !q("#linebar").hidden) rows.push("linebar");
  const corner = q("#saved.show")?.textContent || "";
  return [key, "sel " + selected, "bar " + (q(".fmt")?.classList.contains("show") ? "on" : "off"),
    "panel " + (panel ? panel[0] : "none"), "rows " + (rows.length ? rows.join("+") : "none"),
    document.body.classList.contains("mdview") ? "source" : "rendered", "corner " + JSON.stringify(corner)].join(" · ");
});
const NA = (what) => ({ unavailable: what });
export const read = {
  corner: (page) => page.evaluate(() => { const s = document.getElementById("saved"); return { text: s?.textContent, show: s?.classList.contains("show"), opacity: getComputedStyle(s).opacity, pill: document.getElementById("backuppaused")?.hidden }; }),
  cornerText: (page) => page.evaluate(() => document.querySelector("#saved.show")?.textContent),
  cornerTextOrEmpty: (page) => page.evaluate(() => document.querySelector("#saved.show")?.textContent || ""),
  masthead: (page) => page.evaluate(() => { const h = document.querySelector(".site-head"); const r = h.getBoundingClientRect(); return { crumb: document.getElementById("datelabel")?.textContent.replace(/\s+/g, " ").trim(), title: document.getElementById("pagetitle")?.textContent, titleHidden: document.getElementById("pagetitle")?.hidden, lines: !document.getElementById("pagelines")?.hidden, today: !document.getElementById("todaybtn")?.hidden, backups: document.getElementById("backupsbtn")?.textContent, height: r.height, sticky: getComputedStyle(h).position }; }),
  panel: (page) => page.evaluate(() => { const p = [document.getElementById("pagespanel"), document.getElementById("bookspanel")].find((el) => el && !el.hidden); return p ? { rows: [...p.querySelectorAll("a")].map((a) => a.textContent), create: p.querySelector(".panel-new")?.textContent, empty: p.querySelector(".panel-empty")?.textContent } : null; }),
  afterModClick: (page) => page.evaluate(() => { const G = window.gesta, st = G.state(); return { stayed: G.entryKey(st.date, st.tag), nodeSelected: false, selection: document.getSelection()?.toString().slice(0, 20), bar: document.querySelector(".fmt")?.classList.contains("show") }; }),
  pairs: (page) => page.evaluate(() => document.querySelectorAll("#page .vrow:has(> .vb)").length),
  refusedFence: (page) => page.evaluate(() => ({ corner: document.querySelector("#saved.show")?.textContent, paragraphs: document.querySelectorAll("#page p").length })),
  cleanSwitch: (page) => page.evaluate(() => ({ corner: document.querySelector("#saved.show")?.textContent || "", verse: !!document.querySelector("#page .verse") })),
  linesRow: (page) => page.evaluate(() => ({ open: document.getElementById("pagelines").open, focused: document.activeElement?.getAttribute("aria-label"), options: [...document.querySelectorAll("#pagelines option")].map((o) => o.textContent) })),
  linesRowOpen: (page) => page.evaluate(() => ({ open: document.getElementById("pagelines").open })),
  clipboardReference: (page) => page.evaluate(async () => { const corner = document.querySelector("#saved.show")?.textContent; try { const items = await navigator.clipboard.read(); const types = items[0].types; const html = types.includes("text/html") ? await (await items[0].getType("text/html")).text() : ""; const text = types.includes("text/plain") ? await (await items[0].getType("text/plain")).text() : ""; return { corner, types, textHead: text.slice(0, 40), htmlHead: html.replace(/<meta[^>]*>/g, "").replace(/href="[^"]*"/, 'href="…"').slice(0, 160), anchor: /<a href="[^"]*#page\/Horace\?h=/.test(html), em: html.includes("<em>Horace</em>"), grid: /grid-template-columns:/.test(html) }; } catch (e) { return { corner, clipboard: String(e) }; } }),
  codeBlock: (page) => page.evaluate(() => { const pre = document.querySelector("#page pre"); return { lang: pre.dataset.lang, label: getComputedStyle(pre, "::after").content, tokens: [...pre.querySelectorAll("[class^=tok-]")].map((t) => t.className + ":" + t.textContent) }; }),
  copyHover: (page) => page.evaluate(() => { const b = document.getElementById("copybtn"); const pre = document.querySelector("#page pre").getBoundingClientRect(); const r = b.getBoundingClientRect(); return { show: b.classList.contains("show"), title: b.title, insideBlock: r.top >= pre.top && r.right <= pre.right + 1, labelHidden: getComputedStyle(document.querySelector("#page pre"), "::after").opacity }; }),
  copyLabel: (page) => page.evaluate(() => document.getElementById("copybtn").textContent),
  clipboardCard: (page) => page.evaluate(async () => { try { const items = await navigator.clipboard.read(); const html = items[0].types.includes("text/html") ? await (await items[0].getType("text/html")).text() : ""; const bg = /background-color:\s*([^;"]+)/.exec(html); return { bg: bg && bg[1], grid: /grid-template-columns:/.test(html), card: /class="card-light-blue"/.test(html), raw: /background-color/.test(html) ? undefined : html.replace(/<meta[^>]*>/g, "").slice(0, 120) }; } catch (e) { return { clipboard: String(e) }; } }),
  cardLive: (page) => page.evaluate(() => getComputedStyle(document.querySelector("#page .card-light-blue")).backgroundColor),
  cardsAndPairs: (page) => page.evaluate(() => ({ cards: document.querySelectorAll("#page .card-light-blue").length, pairs: document.querySelectorAll("#page .vrow:has(> .vb)").length })),
  picture: (page) => page.evaluate(() => { const img = document.querySelector("#page img"); return { src: img.getAttribute("src")?.slice(0, 5), width: img.naturalWidth, height: img.naturalHeight, last: document.getElementById("page").lastElementChild?.tagName }; }),
  shortcuts: (page) => page.evaluate(() => { const c = document.getElementById("shortcutspanel"); return c && !c.hidden ? { rows: [...c.querySelectorAll("li")].map((li) => li.textContent.trim()), editor: !document.getElementById("shortcuteditbox").hidden, focused: document.activeElement?.className.split(" ")[0] } : null; }),
  editorTextHead: (page) => page.evaluate(() => document.getElementById("page").textContent.slice(0, 30)),
  bookmarks: (page) => page.evaluate(() => { const c = document.getElementById("bookmarkspanel"); return c && !c.hidden ? { rows: [...c.querySelectorAll("li")].map((li) => li.innerText.replace(/\s+/g, " ").trim().slice(0, 40)), foot: c.querySelector(".bookmarks-add")?.textContent.replace(/\s+/g, " ").trim(), focused: document.activeElement?.className.split(" ")[0] } : null; }),
  bookmarksLit: (page) => page.evaluate(() => [...document.querySelectorAll("#bookmarklist li.bookmark-typing")].length),
  backups: (page) => page.evaluate(() => { const c = document.getElementById("backuppanel"); return c && !c.hidden ? { buttons: [...c.querySelectorAll("button")].filter((b) => !b.hidden).map((b) => b.textContent), status: (!document.getElementById("backupstatus").hidden && document.getElementById("backupstatus").textContent) || null } : null; }),
  backupsOpen: (page) => page.evaluate(() => !document.getElementById("backuppanel").hidden),
  help: (page) => page.evaluate(() => ({ help: !document.getElementById("helppanel").hidden, pages: !document.getElementById("pagespanel").hidden, heading: document.querySelector("#helppanel h3")?.textContent })),
  helpOpen: (page) => page.evaluate(() => ({ help: !document.getElementById("helppanel").hidden })),
  linebar: (page) => page.evaluate(() => { const b = document.getElementById("linebar"); const marked = document.querySelector("#page .landed"); const r = marked?.getBoundingClientRect(); return { open: !b.hidden, focused: document.activeElement?.id === "page" ? "editor" : document.activeElement?.id, lineBox: !document.getElementById("lineask").hidden, pageBox: !document.getElementById("folioask").hidden, marked: marked ? (marked.dataset.line || marked.dataset.folio || marked.className) : null, centred: r ? Math.round((r.top + r.bottom) / 2 - innerHeight / 2) : null, corner: document.querySelector("#saved.show")?.textContent || "" }; }),
  caretRow: (page) => page.evaluate(() => document.getSelection()?.anchorNode?.parentElement?.closest(".vrow")?.dataset.line),
  pastedReference: (page) => page.evaluate(() => ({ link: document.querySelector("#page a")?.getAttribute("href"), quote: document.querySelector("#page blockquote")?.textContent })),
  highlightFollowed: (page) => page.evaluate(() => { const s = document.getSelection(); const r = s.rangeCount && !s.isCollapsed ? s.getRangeAt(0).getBoundingClientRect() : null; return { selected: s.toString(), bar: document.querySelector(".fmt").classList.contains("show"), onScreen: !!r && r.top >= 0 && r.bottom <= innerHeight }; }),
  wordAt: (page, needle, len) => page.evaluate(([needle, len]) => { const w = document.createTreeWalker(document.getElementById("page"), NodeFilter.SHOW_TEXT); let tn; while ((tn = w.nextNode())) if (tn.textContent.includes(needle)) break; const r = document.createRange(); r.setStart(tn, tn.textContent.indexOf(needle)); r.setEnd(tn, tn.textContent.indexOf(needle) + len); tn.parentElement.scrollIntoView({ block: "center" }); const b2 = r.getBoundingClientRect(); return { x: b2.left + b2.width / 2, y: b2.top + b2.height / 2 }; }, [needle, len]),
  waitBar: (page) => page.waitForFunction(() => document.querySelector(".fmt")?.classList.contains("show"), null, { timeout: 5000 }),
  bar: (page) => page.evaluate(() => { const f = document.querySelector(".fmt"); const r = f.getBoundingClientRect(); return { show: f.classList.contains("show"), selected: document.getSelection().toString(), lit: [...f.querySelectorAll("button.on")].map((b) => b.title.split(" ")[0]), aboveSelection: document.getSelection().rangeCount ? r.bottom < document.getSelection().getRangeAt(0).getBoundingClientRect().top : null, focused: document.activeElement?.id === "page" ? "editor" : document.activeElement?.className.slice(0, 20), tag: !f.querySelector(".t").hidden }; }),
  textAroundLink: (page, href) => page.evaluate((href) => { const a = document.querySelector("#page a[href='" + href + "']"); return a && a.closest(".vrow, p, li, h1, h2, h3").textContent.slice(0, 40); }, href),
  caretBefore: (page, needle) => page.evaluate((needle) => { const w = document.createTreeWalker(document.getElementById("page"), NodeFilter.SHOW_TEXT); let tn; while ((tn = w.nextNode())) if (tn.textContent.includes(needle)) break; const r = document.createRange(); r.setStart(tn, tn.textContent.indexOf(needle)); r.collapse(true); const s = document.getSelection(); s.removeAllRanges(); s.addRange(r); }, needle),
  /* the source surface is the same contenteditable under body.mdview */
  sourceView: (page, storedMd) => page.evaluate((storedMd) => { const p = document.getElementById("page"); const s = document.getSelection(); const at = s.anchorNode ? s.anchorNode.textContent.slice(s.anchorOffset, s.anchorOffset + 12) : ""; return { pill: document.body.classList.contains("mdview"), focused: document.activeElement === p, sameAsStore: p.textContent === storedMd, caretAt: at }; }, storedMd),
  sourceBack: (page) => page.evaluate(() => { const s = document.getSelection(); return { pill: document.body.classList.contains("mdview"), text: document.getElementById("page").textContent.includes("FOOD   food of love"), caretBefore: s.anchorNode?.textContent.slice(Math.max(0, s.anchorOffset - 6), s.anchorOffset), caretAfter: s.anchorNode?.textContent.slice(s.anchorOffset, s.anchorOffset + 8) }; }),
  goto: (page) => page.evaluate(() => ({ open: document.getElementById("pagegoto")?.open, focused: document.activeElement?.getAttribute("aria-label"), selects: [...document.querySelectorAll("#pagegoto select")].map((s) => s.getAttribute("aria-label") + "=" + (s.selectedOptions[0]?.disabled ? "—" : s.value) + " [" + [...s.options].map((o) => o.textContent).join("|") + "]") })),
  gotoOpen: (page) => page.evaluate(() => document.getElementById("pagegoto")?.open),
  rowsClosed: (page) => page.evaluate(() => ({ height: document.querySelector(".site-head").getBoundingClientRect().height, gotoOpen: document.getElementById("pagegoto")?.open, searchOpen: document.getElementById("pagesearch")?.open })),
  tools: (page) => page.evaluate(() => [...document.querySelectorAll(".site-tools .toolbtn")].filter((b) => !b.hidden && getComputedStyle(b).display !== "none").map((b) => b.textContent)),
  crumb: (page) => page.evaluate(() => document.getElementById("datelabel").textContent.replace(/\s+/g, " ").trim()),
  lastLink: (page) => page.evaluate(() => { const a = [...document.querySelectorAll("#page a")].pop(); return a && [a.textContent, a.getAttribute("href")]; }),
  tags: (page) => page.evaluate(() => [...document.querySelectorAll("#tagbar a")].map((a) => a.textContent)),
  links: (page) => page.evaluate(() => [...document.querySelectorAll("#page a")].map((a) => a.getAttribute("href"))),
  waitLinkGone: (page, href) => page.waitForFunction((href) => { const G = window.gesta, st = G.state(); return G.entryKey(st.date, st.tag) === "2026-09-06" && !document.querySelector("#page a[href='" + href + "']"); }, href, { timeout: 5000 }).catch(() => {}),
  waitLink: (page, href) => page.waitForFunction((href) => document.querySelector("#page a[href='" + href + "']"), href, { timeout: 5000 }).catch(() => {}),
  listGaps: (page) => page.evaluate(() => { const li = document.querySelectorAll("#page ul > li"); const a = li[0].getBoundingClientRect(), b = li[li.length - 1].getBoundingClientRect(); const line = (el) => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const t = w.nextNode(); const r = document.createRange(); r.selectNodeContents(t); return r.getBoundingClientRect(); }; const l0 = line(li[0]), l1 = line(li[0].querySelector("li")); return { outerGapPastNestedList: +(b.top - a.bottom).toFixed(1), lineToNextLine: +(l1.top - l0.bottom).toFixed(1), line: +l0.height.toFixed(1) }; }),
  search: (page) => page.evaluate(() => ({ open: document.getElementById("pagesearch")?.open, focused: document.activeElement?.className, scope: document.getElementById("pagesearchscope")?.selectedOptions[0]?.textContent, options: [...document.querySelectorAll("#pagesearchscope option")].map((o) => o.textContent), rows: [...document.querySelectorAll("#pagesearchresults li")].map((li) => li.className + ": " + li.innerText.replace(/\s+/g, " ").trim()) })),
  searchOpen: (page) => page.evaluate(() => document.getElementById("pagesearch")?.open),
  selectionText: (page) => page.evaluate(() => document.getSelection()?.toString()),
  pill: () => NA("the paused pill is drawn by ?corner=pill in the successor only"),
  selectAll: (page, sel) => page.evaluate((sel) => { const v = document.querySelector(sel); const r = document.createRange(); r.selectNodeContents(v); const s = document.getSelection(); s.removeAllRanges(); s.addRange(r); }, sel),
  caretAfter: (page, needle, offset) => page.evaluate(([needle, offset]) => { const walker = document.createTreeWalker(document.getElementById("page"), NodeFilter.SHOW_TEXT); let t; while ((t = walker.nextNode())) if (t.textContent.includes(needle)) break; const r = document.createRange(); r.setStart(t, t.textContent.indexOf(needle) + offset); r.collapse(true); const sel = document.getSelection(); sel.removeAllRanges(); sel.addRange(r); }, [needle, offset]),
  pasteText: (page, text) => page.evaluate((text) => { const dt = new DataTransfer(); dt.setData("text/plain", text); document.getElementById("page").dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); }, text),
  pastePng: (page) => page.evaluate(async () => { const c = document.createElement("canvas"); c.width = 1600; c.height = 800; const x = c.getContext("2d"); x.fillStyle = "#c33"; x.fillRect(0, 0, 1600, 800); const blob = await new Promise((r) => c.toBlob(r, "image/png")); const dt = new DataTransfer(); dt.items.add(new File([blob], "shot.png", { type: "image/png" })); document.getElementById("page").dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); }),
  waitCorner: (page, text, ms = 5000) => page.waitForFunction((t) => document.querySelector("#saved.show")?.textContent === t, text, { timeout: ms }).catch(() => {}),
  waitCornerMatch: (page, re) => page.waitForFunction((src) => new RegExp(src).test(document.querySelector("#saved.show")?.textContent || ""), re.source, { timeout: 5000 }).catch(() => {}),
  settle: (page) => page.waitForFunction(() => !document.querySelector("#saved.show"), null, { timeout: 5000 }).catch(() => {}),
  waitSelection: (page, text) => page.waitForFunction((t) => document.getSelection()?.toString().toLowerCase() === t, text, { timeout: 5000 }).catch(() => {}),
  waitEntryAndSelection: (page, key, text) => page.waitForFunction(([k, t]) => { const G = window.gesta, st = G.state(); return G.entryKey(st.date, st.tag) === k && document.getSelection()?.toString() === t; }, [key, text], { timeout: 5000 }),
  waitImg: (page) => page.waitForFunction(() => document.querySelector("#page img"), null, { timeout: 8000 }),
  waitSearchRows: (page) => page.waitForFunction(() => document.querySelectorAll("#pagesearchresults li").length > 0, null, { timeout: 15000 }),
  waitEntryNot: (page, key) => page.waitForFunction((k) => { const G = window.gesta, st = G.state(); return G.entryKey(st.date, st.tag) !== k; }, key, { timeout: 5000 }).catch(() => {}),
};
