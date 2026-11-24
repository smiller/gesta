import type { Node } from "prosemirror-model";
import type { Flat } from "../model/flatten.ts";
import { parseMarkdown } from "../model/parse.ts";
import { fenceRefusals } from "../model/fenceRefusals.ts";
import { said, type ErrorOwner } from "../model/alertText.ts";
import { directivesIn, directiveTrouble } from "../store/conventions.ts";
import { splitKey } from "../store/keys.ts";
import { countBefore, positionAt, arrivingCount, crossViewOffset, type Hold } from "../ui/viewCarets.ts";

export interface Surface {
  /* markdown mode's stream holds every fence line HTML mode's lacks: a count
     crosses between the two, never carried over as equal */
  readonly markdownMode: boolean;
  md(): string;
  flat(): Flat;
  caret(): number;
  caretSeen(): boolean;
  /* the first line at or below `under`, the window's height under the masthead */
  topAt(under: number): number | null;
  /* the start of the line on screen holding `pos` */
  lineStart(pos: number): number;
  /* the position at the height `under`; null where there is none */
  placeAt(under: number): number | null;
  /* a position inside a closed section opens it */
  reveal(pos: number): void;
  end(): number;
  scrollToPos(pos: number, under: number): void;
  /* null: a fresh caret, where the view puts one */
  placeCaret(pos: number | null, scroll: boolean): void;
  /* the focus back, the selection as it stands */
  focus(): void;
  /* on: nothing typed reaches the text */
  lock(on: boolean): void;
  /* `after`: at the selection's end, the caret after it */
  insertText(text: string, after?: boolean): void;
  /* where a text inserted `after` lands */
  selectionEnd(): number;
  insertPicture(name: string): void;
  words(): number;
  replace?: ReplacePort;
  destroy(): void;
}
/* `under`: the window's height above which no text shows */
export interface ReplacePort {
  text(): string;
  /* the caret where it is on screen, else the first character below `under` */
  start(under: number): number;
  /* `now` -1: every match marked, none current, nothing moved */
  show(hits: number[], len: number, now: number, under: number): void;
  clear(): void;
  edit(from: number, to: number, text: string, caret: number): void;
  watch(fn: () => void): () => void;
  focus(): void;
  /* the caret at `pos`, clamped to the text, the window left where it is */
  place(pos: number): void;
}

export interface Viewport { y(): number; scrollTo(y: number): void; under(): number }
export interface PlacePort { carry(pos: number): void; release(): void }
export interface SurfaceOptions {
  build: { html(doc: Node): Surface; markdown(md: string): Surface };
  window: Viewport;
  places: PlacePort;
  /* the entry's own error: a fence refused, a directive's trouble, an entry that cannot render */
  fenceError: ErrorOwner;
  onView: (md: boolean) => void;
  switched: () => void;
}
export interface Surfaces {
  readonly current: Surface | null;
  readonly md: boolean;
  readonly forced: boolean;
  /* keepView: the same entry under a new key (a rename), not an arrival */
  show(md: string, ekey: string, keepView?: boolean): void;
  switchTo(md: boolean): void;
}

export function surfaces(opts: SurfaceOptions): Surfaces {
  const { build, window: win, places } = opts;
  let cur: Surface | null = null;
  let ekey = "";
  let markdownMode = false;
  /* a stored text the model refuses FORCES markdown mode for that entry
     only; a reader's own choice is put back on the next show
     (pin: grid › the next entry after a refused switch)
     (pin: surface.test › shown, forces markdown mode) */
  let forced = false, readerView = false;
  const carets: { html: Hold | null; markdown: Hold | null } = { html: null, markdown: null };
  let placedAt: number | null = null;
  const dropFenceError = (): void => opts.fenceError.resolve();
  const mount = (make: () => Surface): void => {
    const old = cur;
    cur = null;
    old?.destroy();
    cur = make();
  };
  const refusedError = (err: unknown, beneath = false): void => opts.fenceError.raise(said("cannotRender", { key: ekey, why: (err as Error).message }), { beneath });
  /* the entry's refused fences and its directives' trouble, raised as an
     error when it is drawn: told only on the switch back, they were never seen by a
     reader who did not edit in markdown mode (pin: surface.test › an entry opened
     raises its refused fences). On opening it goes beneath an error
     standing: on top it hid a "not saved" (pin: surface.test › the error on
     open goes beneath) */
  function raiseTold(doc: Node, opening: boolean): void {
    const refused = fenceRefusals(doc);
    const trouble = directiveTrouble(...splitKey(ekey), directivesIn(doc));
    if (refused.length || trouble.length) opts.fenceError.raise(said("toldOnOpen", { refused, trouble }), { beneath: opening });
  }
  /* whether the show is of another entry than the one on screen, the view
     it opens in settled */
  function arrived(key: string, keepView: boolean): boolean {
    /* the release is told, as the force was: told only of the force, a
       view shown forced stayed shown after it ended (pin: grid › the next entry after a refused switch) */
    if (forced) { markdownMode = readerView; forced = false; opts.onView(markdownMode); }
    /* HTML mode is the default: another entry opens in it, the same
       entry drawn again or renamed keeps the view chosen
       (pin: surface.test › a show of another entry is in HTML mode)
       (pin: surface.test › a renamed entry) */
    const fresh = key !== ekey, another = fresh && !keepView;
    if (another && markdownMode) { markdownMode = false; opts.onView(false); }
    ekey = key;
    return fresh;
  }
  function show(md: string, key: string, keepView = false): void {
    const fresh = arrived(key, keepView);
    /* the carets and a fence refusal's error belong to the entry left
       (pin: surface.test › a show resolves the entry left's fence error); a
       redraw of the entry on screen keeps its error, and raises it no more
       (pin: surface.test › a redraw of the entry on screen) */
    carets.html = carets.markdown = null; placedAt = null;
    if (fresh) dropFenceError();
    if (markdownMode) { mount(() => build.markdown(md)); return; }
    let doc;
    try { doc = parseMarkdown(md); }
    catch (err) { shownForced(md, err); return; }
    mount(() => build.html(doc));
    if (fresh) raiseTold(doc, true);
  }
  /* not edited as a document — an editor over a lossy parse would save
     the loss — but in markdown mode: the switch back parses it again
     (pin: grid › the faulty entry opened) */
  function shownForced(md: string, err: unknown): void {
    console.error("cannot render", ekey, (err as Error).message);   /* the message, not the stack: minified names churn per build (pin: console › cannot render commonplace/Gridded) */
    /* AN ERROR, resolved by the next show: an info was covered by the
       entry count before it was read (pin: grid › the faulty entry opened);
       beneath an error standing, as the told lines go (pin: surface.test ›
       an entry that cannot render, opened) */
    refusedError(err, true);
    readerView = markdownMode; forced = true;
    markdownMode = true;
    mount(() => build.markdown(md));
    opts.onView(true);
  }
  /* a MOVED caret retires the other view's hold
     (pin: markdown mode › the caret moved in markdown mode, ⌃⌘M back)
     (pin: surface.test › a caret unmoved since it arrived) */
  function holdCaret(): void {
    let hold: Hold | null = null;
    if (cur) {
      const flat = cur.flat();
      const at = countBefore(flat, cur.caret());
      hold = { at, text: flat.text, tail: at >= flat.text.length, seen: cur.caretSeen() };
    }
    if (hold && hold.at !== placedAt) carets[markdownMode ? "html" : "markdown"] = null;
    carets[markdownMode ? "markdown" : "html"] = hold;
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
    const flat = cur.flat(), count = crossViewOffset(from.text, flat.text, from.at, { toMarkdown: cur.markdownMode, pastTail: false });
    if (count === 0) { win.scrollTo(0); return; }
    const pos = Math.min(positionAt(flat, count) ?? cur.end(), cur.end());
    if (cur.markdownMode) cur.scrollToPos(pos, win.under());
    else places.carry(pos);
  }
  function placeCaret(): void {
    if (!cur) return;
    const [here, other] = markdownMode ? (["markdown", "html"] as const) : (["html", "markdown"] as const);
    const flat = cur.flat(), end = cur.end();
    const arriving = arrivingCount(carets[here], carets[other], flat.text, cur.markdownMode);
    placedAt = arriving?.at ?? null;
    const pos = arriving ? (positionAt(flat, arriving.at) ?? end) : null;
    /* KEEP THE CARET AS VISIBLE AS IT WAS: a reader who scrolled away from
       the caret stays where they scrolled; a miss scrolls, having no bit to
       follow (pin: markdown mode › ⌃⌘M scrolled away from the caret). A seen
       caret wins over the switch's held place in HTML mode
       (pin: surface.test › a caret seen on leaving) */
    const scroll = !arriving || arriving.seen;
    if (!cur.markdownMode && scroll) places.release();
    cur.placeCaret(pos, scroll);
  }
  function htmlShown(text: string, wasForced: boolean): boolean {
    let doc;
    try { doc = parseMarkdown(text); }
    catch (err) {
      /* AN ERROR, in the show path's words: the writer stays in markdown mode to fix
         the line the message quotes, and an info faded before a slow
         reader found it; resolved by the clean parse below
         (pin: grid › a stray line in a grid, switched back) */
      refusedError(err);
      forced = wasForced;   /* a forced markdown mode stays forced, so the next show renders (pin: grid › the next entry after a refused switch) */
      return false;
    }
    markdownMode = false;
    mount(() => build.html(doc));
    dropFenceError();
    raiseTold(doc, false);
    return true;
  }
  function switchTo(md: boolean): void {
    if (md === markdownMode) return;
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
       (pin: markdown mode › ⌃⌘M scrolled away from the caret)
       (pin: surface.test › holds the caret, reads the top) */
    const y = win.y(), top = y > 0 ? topCount() : null;
    const text = cur ? cur.md() : "";
    if (md) {
      markdownMode = true;
      mount(() => build.markdown(text));
    } else if (!htmlShown(text, wasForced)) return;
    win.scrollTo(y);
    if (top !== null) alignTop(top);
    opts.onView(markdownMode);
    opts.switched();
    placeCaret();
  }
  return {
    get current() { return cur; },
    get md() { return markdownMode; },
    get forced() { return forced; },
    show, switchTo,
  };
}
