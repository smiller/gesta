import type { EntryNotices } from "../store/entries.ts";
import { errText } from "../store/files.ts";

export interface Line { text: string; shown: boolean }
export interface NoticeState {
  /* a count, a progress line or a note, telling of no outcome */
  info: Line;
  /* something done worked */
  success: Line;
  /* the one of info and success shown last */
  latest: Fading;
  /* a progress line is live: the info place is the op's, and not clickable */
  busy: boolean;
  /* pinned until clicked or released by its owner */
  failure: Line;
  /* why an act did nothing: until it fades, is clicked, replaced, or cleared by another entry */
  refusal: Line;
  /* the backup's trouble, "" when healthy — drawn as the pill */
  trouble: string;
}
export type Place = "failure" | "refusal" | "info" | "success";
export type Fading = "info" | "success";
/* the lifecycle handle a user-triggered op holds: the ONLY thing that
   ends the busy state, so a stray whisper can never sneak past the line
   and the line can never be orphaned */
export interface Progress {
  step(done: number, total: number): void;
  ok(msg: string, ms?: number): void;
  fail(msg: string, detail?: string): void;
  cancel(): void;
}
export interface Notices {
  readonly state: NoticeState;
  /* a failure stands */
  readonly pinned: boolean;
  whisper(text: string, ms?: number): void;
  succeed(text: string, ms?: number): void;
  refuse(text: string): void;
  clearRefusal(): void;
  stick(text: string, copy?: string): number;
  stickErr(text: string, err: unknown, copy?: string): number;
  releasePin(gen: number): void;
  progress(text: string): Progress;
  click(place: Place): void;
  /* the ×: closes the place without copying */
  dismiss(place: Place): void;
  setTrouble(msg: string): void;
  /* the entry layer's channel, wired to the keyed family */
  readonly entry: EntryNotices;
}
/* what each place holds while it is live, for the headless tools to read
   without waiting on what is drawn (pin: notices.test › each kind present only while live) */
export type Live = Partial<Record<Place, string>> & { latest?: Fading };
export function liveFlashes(state: NoticeState): Live {
  const live: Live = {};
  for (const place of ["failure", "refusal", "info", "success"] as const) if (state[place].shown) live[place] = state[place].text;
  if (state[state.latest].shown) live.latest = state.latest;
  return live;
}
export const IDLE_TEXT = "saved";
export const WHISPER_MS = 3000;
export const COPIED_MS = 1200;
/* a refusal is no error: it fades, given longer to read than a whisper */
export const REFUSAL_MS = 10000;
const COPY_FAILED = "copy failed — see console";
const ROUTINE = new Set([IDLE_TEXT, "copied", COPY_FAILED]);

export type Told = (kind: "failure" | "refusal", text: string) => void;
export function noticeLedger(copyText: (text: string) => Promise<void>, told: Told = () => {}): Notices {
  const line = (text = ""): Line => ({ text, shown: false });
  const state = $state<NoticeState>({ info: line(IDLE_TEXT), success: line(), latest: "info", busy: false, failure: line(), refusal: line(), trouble: "" });
  const timers: Record<Fading, ReturnType<typeof setTimeout> | null> = { info: null, success: null };
  /* each place's generation, bumped on every change to it: a late clipboard
     answer stays quiet once a newer success moved in, and an owner releases
     its failure only while that failure is still its own */
  const fadingGen: Record<Fading, number> = { info: 0, success: 0 };
  let failureGen = 0, busyGen = 0;
  /* the clipboard payload the failure copies on click; "" is none */
  let failureCopy = "";

  function stopClock(place: Fading): void {
    const t = timers[place];
    if (t) clearTimeout(t);
    timers[place] = null;
  }
  function show(place: Fading, text: string): void {
    fadingGen[place]++;
    state.latest = place;
    state[place].text = text;
    state[place].shown = true;
    stopClock(place);
  }
  function hide(place: Fading): void {
    stopClock(place);
    state[place].shown = false;
  }
  function flash(place: Fading, text: string, ms: number): void {
    show(place, text);
    timers[place] = setTimeout(() => hide(place), ms);
  }
  /* a live progress line holds the info place: a word count must not wipe
     it (pin: notices.test › shows at once, holds the info place against a
     whisper) */
  function whisper(text: string, ms = WHISPER_MS): void {
    if (!state.busy) flash("info", text, ms);
  }
  /* a routine "saved" is held back while a save failure stands: shown under
     the error, another entry's landing read as this one's (pin: notices.test
     › a routine success is held back while a save failure stands) */
  function succeed(text: string, ms = WHISPER_MS): void {
    if (!(text === IDLE_TEXT && saveFailLatch)) flash("success", text, ms);
  }
  /* shown first, then logged: a log that throws must not keep a flash from
     being seen (pin: notices.test › a log that cannot be written) */
  function tell(kind: "failure" | "refusal", text: string): void {
    try { told(kind, text); } catch (err) { console.error("the flash log failed", err); }
  }
  function stick(text: string, copy?: string): number {
    const g = showFailure(text, copy);
    tell("failure", text);
    return g;
  }
  function showFailure(text: string, copy?: string): number {
    failureGen++;
    state.failure.text = text;
    state.failure.shown = true;
    failureCopy = copy || text;
    return failureGen;
  }
  /* console.error + stick with the error's detail as the copy payload: the
     ONE spelling of "report a caught error sticky" */
  function stickErr(text: string, err: unknown, copy?: string): number {
    console.error(text, err);
    return stick(text, copy || errText(err));
  }
  /* releasing another failure brings back a save failure still owed
     (pin: notices.test › a save failure covered by another failure comes
     back when its owner releases) */
  function releasePin(g: number): void {
    if (!g || g !== failureGen) return;
    failureGen++;
    failureCopy = "";
    state.failure.shown = false;
    if (g !== saveFailGen) replaySaveFail();
  }
  let refusalTimer: ReturnType<typeof setTimeout> | null = null;
  function clearRefusal(): void {
    if (refusalTimer) clearTimeout(refusalTimer);
    refusalTimer = null;
    state.refusal.shown = false;
  }
  function refuse(text: string): void {
    clearRefusal();
    state.refusal.text = text;
    state.refusal.shown = true;
    refusalTimer = setTimeout(clearRefusal, REFUSAL_MS);
    tell("refusal", text);
  }
  /* the keyed save-failure family: a failed save is easy-to-miss data
     loss, so it pins with the caught error copyable and releases ITSELF
     only when every OWED entry durably lands. Keyed, not journal-level: a
     sibling's success settling milliseconds after the failure would
     otherwise strangle the only signal that this entry lives in the cache
     alone (pin: notices.test › the pin stands until the LAST owed key
     lands). Another failure can cover it; the latch brings it back when
     that one is clicked, while its keys are still owed (pin: notices.test
     › a save failure covered by another failure comes back) */
  const owed: Record<string, true> = Object.create(null);
  let saveFailGen = 0;
  let saveFailLatch: [string, unknown, string | undefined] | null = null;
  function stickSaveFail(text: string, err: unknown, ekey: string, copy?: string): void {
    owed[ekey] = true;
    saveFailLatch = [text, err, copy];
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
    /* shown again, not told again: it was told when it was raised */
    if (saveFailLatch) saveFailGen = showFailure(saveFailLatch[0], saveFailLatch[2] || errText(saveFailLatch[1]));
  }
  /* the line for a user-triggered op that runs longer than a moment: shown
     AT ONCE, in the click, and held until the handle's own terminal call */
  function progress(text: string): Progress {
    const mine = ++busyGen;
    state.busy = true;
    show("info", text);
    const live = (): boolean => mine === busyGen;
    const end = (): boolean => { if (!live()) return false; state.busy = false; busyGen++; return true; };
    return {
      step(done, total) { if (live()) state.info.text = text + " " + done + " / " + total; },
      ok(msg, ms) { if (end()) { hide("info"); succeed(msg, ms); } },
      fail(msg, detail) { if (end()) { hide("info"); stick(msg, detail); } },
      cancel() { if (end()) hide("info"); },
    };
  }
  function copyDetail(detail: string): void {
    const mine = ++fadingGen.success;
    copyText(detail).then(
      () => { if (mine === fadingGen.success) succeed("copied", COPIED_MS); },
      (err: unknown) => { console.error("copy failed", err, detail); stick(COPY_FAILED); },
    );
  }
  /* an info or a success on screen copies its words, so what it said can be
     pasted elsewhere; a routine one only goes, so a click to clear "saved"
     never takes the clipboard; nothing while an op runs, whose line is the
     only signal (pin: notices.test › a click on a whisper copies its words)
     (pin: notices.test › a routine whisper) (pin: notices.test › a click on
     the line while busy) */
  function clickFading(place: Fading): void {
    if (place === "info" && state.busy) return;
    const words = state[place].shown && !ROUTINE.has(state[place].text) ? state[place].text : "";
    hide(place);
    if (words) copyDetail(words);
  }
  /* closing the save failure itself never replays it, which would make
     its own pin undismissable; closing another brings it back while owed */
  function closeFailure(): string {
    const payload = failureCopy;
    releasePin(failureGen);
    return payload;
  }
  /* the copy-failed error only closes: copying its words would fail again
     and pin it again (pin: notices.test › a click on the copy-failed error) */
  function clickFailure(): void {
    if (!state.failure.shown) return;
    const again = state.failure.text === COPY_FAILED, payload = closeFailure();
    if (!again) copyDetail(payload);
  }
  function clickRefusal(): void {
    if (!state.refusal.shown) return;
    const words = state.refusal.text;
    clearRefusal();
    copyDetail(words);
  }
  const CLICKS: Record<Place, () => void> = { info: () => clickFading("info"), success: () => clickFading("success"), failure: clickFailure, refusal: clickRefusal };
  const CLOSES: Record<Place, () => void> = {
    info: () => { if (!state.busy) hide("info"); },
    success: () => hide("success"),
    failure: () => { if (state.failure.shown) closeFailure(); },
    refusal: clearRefusal,
  };
  return {
    get state() { return state; },
    get pinned() { return state.failure.shown; },
    whisper, succeed, refuse, clearRefusal, stick, stickErr, releasePin, progress, setTrouble: (msg) => { state.trouble = msg || ""; },
    click: (place) => CLICKS[place](),
    dismiss: (place) => CLOSES[place](),
    entry: {
      landed: releaseSaveFail,
      removed: releaseSaveFail,
      stuck: stickSaveFail,
      stuckIdle: (text, err) => { stickErr(text, err); },
    },
  };
}
