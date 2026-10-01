import type { Node } from "prosemirror-model";
import type { Flat } from "../model/flatten.ts";
import { parseMarkdown } from "../model/parse.ts";
import { fenceRefusals, refusalsText } from "../model/fenceRefusals.ts";
import { countBefore, positionAt, arrivingCount, crossViewOffset, type Hold } from "../chrome/viewCarets.ts";

export interface Surface {
  /* the source stream holds every fence line the rendered one lacks: a count
     crosses between the two, never carried over as equal */
  readonly source: boolean;
  md(): string;
  flat(): Flat;
  caret(): number;
  caretSeen(): boolean;
  /* the first line at or below `under`, the window's height under the masthead */
  topAt(under: number): number | null;
  /* the position at the height `under`; null where there is none */
  placeAt(under: number): number | null;
  /* a position inside a closed section opens it */
  reveal(pos: number): void;
  end(): number;
  scrollToPos(pos: number, under: number): void;
  /* null: a fresh caret, where the view puts one */
  placeCaret(pos: number | null, scroll: boolean): void;
  insertText(text: string): void;
  insertPicture(name: string): void;
  words(): number;
  destroy(): void;
}
export interface Viewport { y(): number; scrollTo(y: number): void; under(): number }
export interface PlacePort { carry(pos: number): void; release(): void }
export interface SurfaceOptions {
  build: { rendered(doc: Node): Surface; source(md: string): Surface };
  window: Viewport;
  places: PlacePort;
  /* 0 when nothing was pinned */
  pin: (text: string) => number;
  releasePin: (gen: number) => void;
  onView: (md: boolean) => void;
  switched: () => void;
}
export interface Surfaces {
  readonly current: Surface | null;
  readonly md: boolean;
  readonly forced: boolean;
  show(md: string, ekey: string): void;
  switchTo(md: boolean): void;
}

export function surfaces(opts: SurfaceOptions): Surfaces {
  const { build, window: win, places } = opts;
  let cur: Surface | null = null;
  let ekey = "";
  let mdView = false;
  /* a stored text the model refuses FORCES the source view for that entry
     only; a reader's own choice is put back on the next show
     (pin: grid › the next entry after a refused switch)
     (pin: surface.test › shown, forces the source view) */
  let forced = false, readerView = false;
  const carets: { rendered: Hold | null; source: Hold | null } = { rendered: null, source: null };
  let placedAt: number | null = null;
  let fencePin = 0;
  const mount = (make: () => Surface): void => {
    const old = cur;
    cur = null;
    old?.destroy();
    cur = make();
  };
  const refusedPin = (err: unknown): number => opts.pin("cannot render " + ekey + " — " + (err as Error).message + "; shown as source");
  function show(md: string, key: string): void {
    /* the chrome's pill followed the forced view but not its release (pin: grid › the next entry after a refused switch) */
    if (forced) { mdView = readerView; forced = false; opts.onView(mdView); }
    ekey = key;
    /* the open view stays the open view across a navigation; the carets and
       a pinned fence refusal belong to the entry left (pin: walk › ⌃⌘M, then ⌃⌘.)
       (pin: surface.test › a show releases the entry left's fence pin) */
    carets.rendered = carets.source = null; placedAt = null;
    if (fencePin) { opts.releasePin(fencePin); fencePin = 0; }
    if (mdView) { mount(() => build.source(md)); return; }
    let doc;
    try { doc = parseMarkdown(md); }
    catch (err) {
      /* not edited as a document — an editor over a lossy parse would save
         the loss — but as source: the switch back parses it again
         (pin: grid › the faulty entry opened) */
      console.error("cannot render", ekey, (err as Error).message);   /* the message, not the stack: minified names churn per build (pin: console › cannot render page/Gridded) */
      /* PINNED, released by the next show: a whisper was covered by the
         entry count before it was read (pin: grid › the faulty entry opened) */
      fencePin = refusedPin(err);
      readerView = mdView; forced = true;
      mdView = true;
      mount(() => build.source(md));
      opts.onView(true);
      return;
    }
    mount(() => build.rendered(doc));
  }
  /* a MOVED caret retires the other view's hold
     (pin: source view › the caret moved in the source, ⌃⌘M back)
     (pin: surface.test › a caret unmoved since it arrived) */
  function holdCaret(): void {
    let hold: Hold | null = null;
    if (cur) {
      const flat = cur.flat();
      const at = countBefore(flat, cur.caret());
      hold = { at, text: flat.text, tail: at >= flat.text.length, seen: cur.caretSeen() };
    }
    if (hold && hold.at !== placedAt) carets[mdView ? "rendered" : "source"] = null;
    carets[mdView ? "source" : "rendered"] = hold;
  }
  function topCount(): { at: number; text: string } | null {
    if (!cur) return null;
    const pos = cur.topAt(win.under());
    if (pos === null) return null;
    const flat = cur.flat();
    return { at: countBefore(flat, pos), text: flat.text };
  }
  /* carried across by the caret's own crossing: a count taken as equal in
     both drifted seven lines by stanza 21
     (pin: the switch carries the text › a long canto switched at its middle).
     Nothing above the first line ARRIVED AT: near the top stays at the top,
     where setting the first character under the masthead pushed the page's
     own top out of view (pin: the switch carries the text › ⌃⌘M from 20px down)
     (pin: surface.test › carries the top by the crossing) */
  function alignTop(from: { at: number; text: string }): void {
    if (!cur) return;
    const flat = cur.flat(), count = crossViewOffset(from.text, flat.text, from.at, cur.source, false);
    if (count === 0) { win.scrollTo(0); return; }
    const pos = Math.min(positionAt(flat, count) ?? cur.end(), cur.end());
    if (cur.source) cur.scrollToPos(pos, win.under());
    else places.carry(pos);
  }
  function placeCaret(): void {
    if (!cur) return;
    const here = mdView ? "source" : "rendered", other = mdView ? "rendered" : "source";
    const flat = cur.flat();
    const arriving = arrivingCount(carets[here], carets[other], flat.text, cur.source);
    placedAt = arriving ? arriving.at : null;
    const pos = arriving ? (positionAt(flat, arriving.at) ?? cur.end()) : null;
    /* KEEP THE CARET AS VISIBLE AS IT WAS: a reader who scrolled away from
       the caret stays where they scrolled; a miss scrolls, having no bit to
       follow (pin: source view › ⌃⌘M scrolled away from the caret). A seen
       caret wins over the switch's held place in the rendered view
       (pin: surface.test › a caret seen on leaving) */
    const scroll = !arriving || arriving.seen;
    if (!cur.source && scroll) places.release();
    cur.placeCaret(pos, scroll);
  }
  function switchTo(md: boolean): void {
    if (md === mdView) return;
    /* an arrival's hold is let go here, not left to the gesture that asked
       for the switch (pin: surface.test › a switch to the view already open) */
    places.release();
    const wasForced = forced;
    forced = false;
    holdCaret();
    /* THE TEXT AT THE TOP SURVIVES THE SWAP: the two views lay one text out
       at different heights, and the pixel offset alone put another passage
       there (stanza 55 came up as 45). Set after the new view is built —
       the teardown clamps the scroll to the top — and before the caret is
       placed, so a caret that was seen still scrolls into view and one that
       was not leaves a reader where they were reading.
       (pin: the switch carries the text › a long canto switched at its middle)
       (pin: source view › ⌃⌘M scrolled away from the caret)
       (pin: surface.test › holds the caret, reads the top) */
    const y = win.y(), top = y > 0 ? topCount() : null;
    const text = cur ? cur.md() : "";
    if (md) {
      mdView = true;
      mount(() => build.source(text));
    } else {
      let doc;
      try { doc = parseMarkdown(text); }
      catch (err) {
        /* PINNED, in the show path's words: the writer stays in source to fix
           the line the message quotes, and a whisper faded before a slow
           reader found it; released by the clean parse below
           (pin: grid › a stray line in a grid, switched back) */
        if (fencePin) opts.releasePin(fencePin);
        fencePin = refusedPin(err);
        forced = wasForced;   /* a forced source view stays forced, so the next show renders (pin: grid › the next entry after a refused switch) */
        return;
      }
      mdView = false;
      mount(() => build.rendered(doc));
      const refused = fenceRefusals(doc);
      if (fencePin) { opts.releasePin(fencePin); fencePin = 0; }
      if (refused.length) fencePin = opts.pin(refusalsText(refused));
    }
    win.scrollTo(y);
    if (top !== null) alignTop(top);
    opts.onView(mdView);
    opts.switched();
    placeCaret();
  }
  return {
    get current() { return cur; },
    get md() { return mdView; },
    get forced() { return forced; },
    show, switchTo,
  };
}
