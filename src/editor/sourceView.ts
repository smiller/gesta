import { flattenText } from "../model/flatten.ts";
import { parseMarkdown } from "../model/parse.ts";
import { pastedImageFile } from "./images.ts";
import { sourceTab } from "./sourceKeys.ts";
import { wordCount, wordsOf } from "./format.ts";
import type { Surface } from "./surface.ts";

export interface SourceOptions {
  onChange: () => void;
  onPasteFile: (file: File) => void;
  onRefuse: (why: string) => void;
}

export function sourceView(mount: HTMLElement, md: string, opts: SourceOptions): Surface {
  const ta = document.createElement("textarea");
  ta.className = "source";
  ta.spellcheck = false;
  ta.value = md;
  ta.addEventListener("input", () => opts.onChange());
  ta.addEventListener("paste", (e) => { const f = pastedImageFile(e.clipboardData); if (f) { e.preventDefault(); opts.onPasteFile(f); } });
  ta.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    if (e.repeat && ta.selectionStart !== ta.selectionEnd) { e.preventDefault(); return; }
    const r = sourceTab(ta.value, ta.selectionStart, ta.selectionEnd, e.shiftKey);
    if (r === null) return;
    e.preventDefault();
    if ("refuse" in r) { if (!e.repeat) opts.onRefuse(r.refuse); return; }
    ta.value = r.value;
    ta.setSelectionRange(r.start, r.end);
    ta.dispatchEvent(new Event("input"));
  });
  mount.appendChild(ta);
  /* where a character of the textarea stands on screen, measured on a
     hidden twin that wraps as it does: a textarea reports no geometry for
     its text. Built once per question, removed with done(). */
  function twin(): { topOf(i: number): number; indexAt(y: number): number; done(): void } {
    const cs = getComputedStyle(ta), el = document.createElement("div");
    for (const p of ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "wordSpacing", "tabSize", "padding", "borderWidth", "borderStyle", "boxSizing", "overflowWrap", "wordBreak"] as const) el.style[p] = cs[p];
    Object.assign(el.style, { position: "absolute", visibility: "hidden", top: "0", left: "-9999px", whiteSpace: "pre-wrap", width: ta.getBoundingClientRect().width + "px" });
    const text = el.appendChild(document.createTextNode(ta.value + "​"));
    document.body.appendChild(el);
    const range = document.createRange();
    const origin = ta.getBoundingClientRect().top - el.getBoundingClientRect().top - ta.scrollTop;
    const topOf = (i: number): number => {
      range.setStart(text, Math.min(i, ta.value.length)); range.setEnd(text, Math.min(i, ta.value.length) + 1);
      const r = range.getClientRects()[0] || range.getBoundingClientRect();
      return origin + r.top;
    };
    const indexAt = (y: number): number => {
      let lo = 0, hi = ta.value.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (topOf(mid) < y - 1) lo = mid + 1; else hi = mid; }
      return lo;
    };
    return { topOf, indexAt, done: () => el.remove() };
  }
  const insertText = (text: string): void => {
    ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, "end");
    ta.focus();
    ta.dispatchEvent(new Event("input"));
  };
  return {
    source: true,
    md: () => ta.value,
    flat: () => flattenText(ta.value),
    caret: () => ta.selectionStart,
    /* reported seen always, the switch back jumped to a caret a reader had
       scrolled away from (pin: source view › ⌃⌘M back, still scrolled away) */
    caretSeen: () => {
      const t = twin(), top = t.topOf(ta.selectionStart);
      t.done();
      return top + parseFloat(getComputedStyle(ta).lineHeight) >= 0 && top <= document.documentElement.clientHeight;
    },
    topAt: (under) => { const t = twin(), i = t.indexAt(under); t.done(); return i; },
    placeAt: () => null,
    reveal: () => {},
    end: () => ta.value.length,
    scrollToPos: (i, under) => {
      const t = twin(), top = t.topOf(i);
      t.done();
      window.scrollTo(0, window.scrollY + top - under);
    },
    placeCaret: (pos, scroll) => {
      const at = pos ?? ta.value.length;
      /* the caret BEFORE the focus: a fresh textarea's selection sits at
         its end, and focusing scrolls that into view (pin: source view › ⌃⌘M from the top) */
      ta.setSelectionRange(at, at);
      ta.focus({ preventScroll: !scroll });
    },
    insertText,
    insertPicture: (name) => insertText("![](" + name + ")"),
    /* the markdown is parsed first, so syntax never counts as words and both
       views report one number (pin: source view › ⌃⌘W in the source view) */
    words: () => {
      const a = ta.selectionStart, b = ta.selectionEnd;
      const text = a === b ? ta.value : ta.value.slice(a, b);
      try { return wordCount(parseMarkdown(text), 0, 0); } catch { return wordsOf(text); }
    },
    destroy: () => { ta.remove(); },
  };
}
