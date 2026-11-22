import type { EntryAlerts } from "../store/entries.ts";
import { errText } from "../store/files.ts";
import { asSaid, alertWords, alertKind, alertMs, type AlertId, type Kind as AlertKind, type Raise, type RaiseOpts, type Said } from "../model/alertText.ts";

export interface Line { text: string; shown: boolean }
export interface AlertState {
  /* a count, a progress line or a note, telling of no outcome */
  info: Line;
  /* something done worked */
  success: Line;
  /* the one of info and success shown last */
  latest: Fading;
  /* a progress line is live: the info place is the op's, and not clickable */
  busy: boolean;
  /* standing until closed or resolved by its owner */
  error: Line;
  /* why an act did nothing: until it fades, is clicked, replaced, or cleared by another entry */
  warning: Line;
  /* the backup's trouble, "" when healthy — drawn as the pill */
  trouble: string;
}
export type Kind = "error" | "warning" | "info" | "success";
export type Fading = "info" | "success";
export type Kept = "error" | "warning";
/* what came with an error: the exception caught, logged with its stack and
   copied by a click unless a copy is given; or the copy alone */
export interface ErrorFrom { caught?: unknown; copy?: string }
/* the lifecycle handle a user-triggered op holds: the ONLY thing that
   ends the busy state, so a stray info can never sneak past the line
   and the line can never be orphaned */
export interface Progress {
  step(done: number, total: number): void;
  ok(s: Said): void;
  fail(s: Said, copy?: string): void;
  cancel(): void;
}
export interface Alerts {
  readonly state: AlertState;
  /* an error stands */
  readonly errorShown: boolean;
  clearWarning(): void;
  /* an alert by its id in the table, shown where its kind goes */
  raise: Raise;
  resolveError(gen: number): void;
  progress(id: AlertId): Progress;
  click(kind: Kind): void;
  /* the ×: closes the alert without copying */
  dismiss(kind: Kind): void;
  setTrouble(msg: string): void;
  /* the entry layer's channel, wired to the keyed family */
  readonly entry: EntryAlerts;
}
/* what each kind holds while it is live, for the headless tools to read
   without waiting on what is drawn (pin: alertLedger.test › each kind present only while live) */
export type Live = Partial<Record<Kind, string>> & { latest?: Fading };
export function liveAlerts(state: AlertState): Live {
  const live: Live = {};
  for (const kind of ["error", "warning", "info", "success"] as const) if (state[kind].shown) live[kind] = state[kind].text;
  if (state[state.latest].shown) live.latest = state.latest;
  return live;
}
export const IDLE_TEXT = alertWords({ id: "saved" });
export const INFO_MS = 3000;
/* a warning is no error: it fades, given longer to read than an info */
export const WARNING_MS = 10000;
const COPY_FAILED = alertWords({ id: "copyFailed" });
const ROUTINE = new Set([IDLE_TEXT, alertWords({ id: "copied" })]);

export type Told = (kind: Kept, text: string) => void;
export function alertLedger(copyText: (text: string) => Promise<void>, told: Told = () => {}): Alerts {
  const line = (text = ""): Line => ({ text, shown: false });
  const state = $state<AlertState>({ info: line(IDLE_TEXT), success: line(), latest: "info", busy: false, error: line(), warning: line(), trouble: "" });
  const timers: Record<Fading, ReturnType<typeof setTimeout> | null> = { info: null, success: null };
  /* each place's generation, bumped on every change to it: a late clipboard
     answer stays quiet once a newer success moved in, and an owner releases
     its error only while that error is still its own */
  const fadingGen: Record<Fading, number> = { info: 0, success: 0 };
  let errorGen = 0, busyGen = 0;
  /* the clipboard payload the error copies on click; "" is none */
  let errorCopy = "";

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
  function showFor(place: Fading, text: string, ms: number): void {
    show(place, text);
    timers[place] = setTimeout(() => hide(place), ms);
  }
  /* a live progress line holds the info place: a word count must not wipe
     it (pin: alertLedger.test › shows at once, holds the info place against an
     info) */
  function info(text: string, ms = INFO_MS): void {
    if (!state.busy) showFor("info", text, ms);
  }
  /* a routine "saved" is held back while a save error stands: shown under
     the error, another entry's landing read as this one's (pin: alertLedger.test
     › a routine success is held back while a save error stands) */
  function succeed(text: string, ms = INFO_MS): void {
    if (!(text === IDLE_TEXT && saveErrorLatch)) showFor("success", text, ms);
  }
  /* shown first, then logged: a log that throws must not keep an alert from
     being seen (pin: alertLedger.test › a log that cannot be written) */
  function tell(kind: Kept, text: string): void {
    try { told(kind, text); } catch (err) { console.error("the alert log failed", err); }
  }
  /* a key `caught` logs even when nothing was caught (pin: alertLedger.test ›
     an error with what was caught) */
  function error(text: string, from: ErrorFrom = {}): number {
    const caught = "caught" in from;
    if (caught) console.error(text, from.caught);
    const g = showError(text, from.copy || (caught ? errText(from.caught) : ""));
    tell("error", text);
    return g;
  }
  function showError(text: string, copy?: string): number {
    errorGen++;
    state.error.text = text;
    state.error.shown = true;
    errorCopy = copy || text;
    return errorGen;
  }
  /* resolving another error brings back a save error still owed
     (pin: alertLedger.test › a save error covered by another error comes
     back when its owner resolves) */
  function resolveError(g: number): void {
    if (!g || g !== errorGen) return;
    errorGen++;
    errorCopy = "";
    state.error.shown = false;
    if (g !== saveErrorGen) replaySaveError();
  }
  let warningTimer: ReturnType<typeof setTimeout> | null = null;
  function clearWarning(): void {
    if (warningTimer) clearTimeout(warningTimer);
    warningTimer = null;
    state.warning.shown = false;
  }
  function warn(text: string): void {
    clearWarning();
    state.warning.text = text;
    state.warning.shown = true;
    warningTimer = setTimeout(clearWarning, WARNING_MS);
    tell("warning", text);
  }
  /* the keyed save-error family: a failed save is easy-to-miss data
     loss, so it stands with the caught error copyable and resolves ITSELF
     only when every OWED entry durably lands. Keyed, not journal-level: a
     sibling's success settling milliseconds after the failure would
     otherwise strangle the only signal that this entry lives in the cache
     alone (pin: alertLedger.test › the error stands until the LAST owed
     key lands). Another error can cover it; the latch brings it back when
     that one is clicked, while its keys are still owed (pin: alertLedger.test
     › a save error covered by another error comes back) */
  const owed: Record<string, true> = Object.create(null);
  let saveErrorGen = 0;
  let saveErrorLatch: [string, unknown, string | undefined] | null = null;
  function saveError(id: AlertId, err: unknown, ekey: string, copy?: string): void {
    const text = alertWords({ id } as Said);
    owed[ekey] = true;
    saveErrorLatch = [text, err, copy];
    saveErrorGen = error(text, { caught: err, copy });
  }
  function resolveSaveError(ekey: string): void {
    delete owed[ekey];
    for (const k in owed) if (k) return;   /* another key still owed — keep the error */
    saveErrorLatch = null;
    resolveError(saveErrorGen);
    saveErrorGen = 0;
  }
  function replaySaveError(): void {
    /* shown again, not told again: it was told when it was raised */
    if (saveErrorLatch) saveErrorGen = showError(saveErrorLatch[0], saveErrorLatch[2] || errText(saveErrorLatch[1]));
  }
  /* the line for a user-triggered op that runs longer than a moment: shown
     AT ONCE, in the click, and held until the handle's own terminal call */
  function progress(id: AlertId): Progress {
    const text = alertWords({ id } as Said);
    const mine = ++busyGen;
    state.busy = true;
    show("info", text);
    const live = (): boolean => mine === busyGen;
    const end = (): boolean => { if (!live()) return false; state.busy = false; busyGen++; return true; };
    return {
      step(done, total) { if (live()) state.info.text = text + " " + done + " / " + total; },
      ok(s) { if (end()) { hide("info"); succeed(alertWords(s), alertMs(s.id)); } },
      fail(s, copy) { if (end()) { hide("info"); error(alertWords(s), { copy }); } },
      cancel() { if (end()) hide("info"); },
    };
  }
  function copyDetail(detail: string): void {
    const mine = ++fadingGen.success;
    copyText(detail).then(
      () => { if (mine === fadingGen.success) raise("copied"); },
      (err: unknown) => { console.error("copy failed", err, detail); raise("copyFailed"); },
    );
  }
  /* an info or a success on screen copies its words, so what it said can be
     pasted elsewhere; a routine one only goes, so a click to clear "saved"
     never takes the clipboard; nothing while an op runs, whose line is the
     only signal (pin: alertLedger.test › a click on an info copies its words)
     (pin: alertLedger.test › a routine success) (pin: alertLedger.test › a click
     on the line while busy) */
  function clickFading(place: Fading): void {
    if (place === "info" && state.busy) return;
    const words = state[place].shown && !ROUTINE.has(state[place].text) ? state[place].text : "";
    hide(place);
    if (words) copyDetail(words);
  }
  /* closing the save error itself never replays it, which would make
     its own error undismissable; closing another brings it back while owed */
  function closeError(): string {
    const payload = errorCopy;
    resolveError(errorGen);
    return payload;
  }
  /* the copy-failed error only closes: copying its words would fail again
     and raise it again (pin: alertLedger.test › a click on the copy-failed error) */
  function clickError(): void {
    if (!state.error.shown) return;
    const again = state.error.text === COPY_FAILED, payload = closeError();
    if (!again) copyDetail(payload);
  }
  function clickWarning(): void {
    if (!state.warning.shown) return;
    const words = state.warning.text;
    clearWarning();
    copyDetail(words);
  }
  const BY_KIND: Record<AlertKind, (words: string, ms: number | undefined, from: RaiseOpts) => number> = {
    error: (words, _ms, from) => error(words, from),
    warning: (words) => { warn(words); return 0; },
    info: (words, ms) => { info(words, ms); return 0; },
    success: (words, ms) => { succeed(words, ms); return 0; },
  };
  const raise = ((a: AlertId | Said, b?: unknown, c?: unknown): number => {
    const [s, from] = asSaid(a, b, c);
    return BY_KIND[alertKind(s.id)](alertWords(s), alertMs(s.id), from);
  }) as Raise;
  const CLICKS: Record<Kind, () => void> = { info: () => clickFading("info"), success: () => clickFading("success"), error: clickError, warning: clickWarning };
  const CLOSES: Record<Kind, () => void> = {
    info: () => { if (!state.busy) hide("info"); },
    success: () => hide("success"),
    error: () => { if (state.error.shown) closeError(); },
    warning: clearWarning,
  };
  return {
    get state() { return state; },
    get errorShown() { return state.error.shown; },
    clearWarning, raise, resolveError, progress, setTrouble: (msg) => { state.trouble = msg || ""; },
    click: (kind) => CLICKS[kind](),
    dismiss: (kind) => CLOSES[kind](),
    entry: {
      landed: resolveSaveError,
      removed: resolveSaveError,
      stuck: saveError,
      stuckIdle: (id, err) => { error(alertWords({ id } as Said), { caught: err }); },
    },
  };
}
