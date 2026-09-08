/* The notice ledger: the corner's ONE indicator and its states — a whisper
   that times out, a pin that stays until clicked and copies its detail, a
   progress line a running op owns, the deferred one-shot, and the keyed
   save-failure family that releases itself when every owed entry lands —
   plus the paused pill's text, the corner's other element. Ported
   2026-09-07 from ../writer/src/js/06-save-load.js as a factory over the
   clipboard writer; the state is a rune the Notices component reads, and
   every other module reaches it through the calls below. What the port
   drops: the index-debt shape and its `lesser` rank. The successor's lists
   are derived from the cache (lists.ts), so a save owes ONE write and the
   two vocabularies the current app had to rank are one. */
import type { EntryNotices } from "../store/entries.ts";
import { errText } from "../store/files.ts";

export interface NoticeState {
  text: string;
  shown: boolean;
  /* a progress line is live: the indicator is the op's, and not clickable */
  busy: boolean;
  /* the backup's trouble, "" when healthy — drawn as the pill */
  trouble: string;
}
/* the lifecycle handle a user-triggered op holds: the ONLY thing that
   ends the busy state, so a stray whisper can never sneak past the pin
   and the pin can never be orphaned */
export interface Progress {
  step(done: number, total: number): void;
  ok(msg: string, ms?: number): void;
  fail(msg: string, detail?: string): void;
  cancel(): void;
}
export interface Notices {
  readonly state: NoticeState;
  readonly pinned: boolean;
  whisper(text: string, ms?: number): void;
  refuse(e: { repeat: boolean }, why: string, ms?: number): void;
  stick(text: string, copy?: string): number;
  stickErr(text: string, err: unknown, copy?: string): number;
  stickErrIdle(text: string, err: unknown, copy?: string): number;
  releasePin(gen: number): void;
  progress(text: string): Progress;
  click(): void;
  setTrouble(msg: string): void;
  /* the entry layer's channel, wired to the keyed family */
  readonly entry: EntryNotices;
}
export const IDLE_TEXT = "saved";
export const WHISPER_MS = 3000;
export const SAVED_MS = 1400;
export const COPIED_MS = 1200;

export function noticeLedger(copyText: (text: string) => Promise<void>): Notices {
  const state = $state<NoticeState>({ text: IDLE_TEXT, shown: false, busy: false, trouble: "" });
  let timer: ReturnType<typeof setTimeout> | null = null;
  /* the clipboard payload a pinned notice copies on click; "" is no pin */
  let stuckCopy = "";
  /* bumped on every notice change, so a late async callback (a slow
     clipboard write) can tell it was superseded and stay quiet, and an
     owner can release only while the notice is still its own */
  let gen = 0;
  /* the progress handle's supersession token: a step from a retired handle
     is dropped, a newer progress retires the older */
  let busyGen = 0;
  function show(text: string): void {
    gen++;
    state.text = text;
    state.shown = true;
    if (timer) clearTimeout(timer);
    timer = null;
  }
  /* the text STAYS as the notice fades: the current app's hide reset it
     to "saved" for the fade, so a refusal went out reading as a save.
     Changed 2026-09-07. */
  function hide(): void { state.shown = false; }
  /* a stuck failure is PINNED and a live progress line holds the indicator
     too: a routine whisper (an autosave "saved", a word count) must not
     wipe either or drop the pin; only a click, or the handle's own terminal
     call, clears it. A save failure that fires under a busy pin is the
     keyed family's, and it latches to replay when the op ends. */
  function whisper(text: string, ms = WHISPER_MS): void {
    if (stuckCopy || state.busy) return;
    show(text);
    timer = setTimeout(hide, ms);
  }
  /* a swallowed press that changed nothing SAYS why: an action the app
     quietly ignores cannot be told apart from a key that does nothing at
     all. App-wide, so it lives beside the other states. Once per PRESS: a
     held key would otherwise stamp its line at key-repeat rate. */
  function refuse(e: { repeat: boolean }, why: string, ms?: number): void {
    if (!e.repeat) whisper(why, ms);
  }
  /* the notice STAYS, with no timer, and PINS the indicator; a click copies
     `copy` (else the shown text). The affordance is written here so no
     caller can omit it. */
  function stick(text: string, copy?: string): number {
    show(text + " (click to copy)");
    stuckCopy = copy || text;
    return gen;
  }
  /* console.error + stick with the error's detail as the copy payload: the
     ONE spelling of "report a caught error sticky" */
  function stickErr(text: string, err: unknown, copy?: string): number {
    console.error(text, err);
    return stick(text, copy || errText(err));
  }
  /* stickErr DEFERRED while a progress line owns the indicator: the trace
     always lands, the notice waits in ONE slot (a newer deflected failure
     supersedes an older unseen one; the console holds both) to resurface
     when the op ends or a pin is dismissed. Returns 0 when deferred: a
     deferred notice has no owner-release and clears by click once shown. */
  let idleStick: [string, string] | null = null;
  function stickErrIdle(text: string, err: unknown, copy?: string): number {
    console.error(text, err);
    if (state.busy) { idleStick = [text, copy || errText(err)]; return 0; }
    return stick(text, copy || errText(err));
  }
  function replayIdleStick(): void {
    if (!idleStick) return;
    const d = idleStick;
    idleStick = null;
    stick(d[0], d[1]);
  }
  /* release an OWNED pin: only while the notice is still the owner's — any
     newer notice moved the generation, and the release stands down */
  function releasePin(g: number): void {
    if (!g || g !== gen) return;
    stuckCopy = "";
    gen++;
    hide();
  }
  /* the keyed save-failure family: a failed save is easy-to-miss data
     loss, so it pins with the caught error copyable and releases ITSELF
     only when every OWED entry durably lands. Keyed, not journal-level: a
     sibling's success settling milliseconds after the failure would
     otherwise strangle the only signal that this entry lives in the cache
     alone. The latch holds the last failure that spoke, not only under a
     busy pin: progress() wipes a pre-op pin for its own display, so the
     op's end must be able to resurface a failure whose keys are still
     owed; it dies only when they all land. */
  const owed: Record<string, true> = Object.create(null);
  let saveFailGen = 0;
  let saveFailLatch: [string, unknown, string | undefined] | null = null;
  function stickSaveFail(text: string, err: unknown, ekey: string, copy?: string): void {
    owed[ekey] = true;
    saveFailLatch = [text, err, copy];
    if (state.busy) { console.error(text, err); return; }
    saveFailGen = stickErr(text, err, copy);
  }
  function releaseSaveFail(ekey: string): void {
    delete owed[ekey];
    for (const k in owed) if (k) return;   /* another key still owed — keep the pin */
    saveFailLatch = null;
    releasePin(saveFailGen);
    saveFailGen = 0;
  }
  function replaySaveFail(): void {
    if (!saveFailLatch) return;
    saveFailGen = stickErr(saveFailLatch[0], saveFailLatch[1], saveFailLatch[2]);
  }
  /* the "in progress" line for a user-triggered op that runs longer than a
     moment: shown AT ONCE, in the click, and held until the handle's own
     terminal call. A new user-driven op supersedes an unclicked prior
     failure — its pin is dropped so the op's own end is not yielded to the
     stale one, and a later click cannot copy the previous payload. With
     BOTH latches armed at the end, only the save failure shows (data loss
     outranks) and the one-shot waits for that pin's dismiss click:
     replaying both would flash the one-shot for zero frames. */
  function progress(text: string): Progress {
    const mine = ++busyGen;
    state.busy = true;
    stuckCopy = "";
    show(text);
    const live = (): boolean => mine === busyGen;
    const end = (): boolean => { if (!live()) return false; state.busy = false; busyGen++; return true; };
    const settle = (): void => { if (!saveFailLatch) replayIdleStick(); replaySaveFail(); };
    return {
      step(done, total) { if (live()) state.text = text + " " + done + " / " + total; },
      ok(msg, ms) { if (end()) { whisper(msg, ms); settle(); } },
      fail(msg, detail) { if (end()) stick(msg, detail); },
      cancel() { if (end()) { hide(); settle(); } },
    };
  }
  /* the indicator's click: nothing while an op runs (hiding the line would
     lose the only signal); a whisper dismisses; a pin copies its payload,
     releases, and the outcome whispers unless a newer notice moved in.
     Dismissing one pin surfaces the next deferred one-shot, never the
     save-fail latch, which would make its own pin undismissable. */
  function click(): void {
    if (state.busy) return;
    gen++;
    if (!stuckCopy) {
      if (timer) clearTimeout(timer);
      hide();
      replayIdleStick();
      return;
    }
    const detail = stuckCopy, mine = gen;
    stuckCopy = "";
    copyText(detail).then(
      () => { if (mine === gen) whisper("copied", COPIED_MS); },
      (err: unknown) => { console.error("copy failed", err, detail); if (mine === gen) whisper("copy failed — see console"); },
    );
    replayIdleStick();
  }
  function setTrouble(msg: string): void { state.trouble = msg || ""; }
  return {
    get state() { return state; },
    get pinned() { return !!stuckCopy; },
    whisper, refuse, stick, stickErr, stickErrIdle, releasePin, progress, click, setTrouble,
    entry: {
      landed: releaseSaveFail,
      removed: releaseSaveFail,
      stuck: stickSaveFail,
      stuckIdle: (text, err) => { stickErrIdle(text, err); },
    },
  };
}
