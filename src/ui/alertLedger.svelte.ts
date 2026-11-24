import { errText } from "../store/files.ts";
import { asSaid, alertWords, alertKind, alertMs, type AlertId, type Kind, type Raise, type RaiseOpts, type OwnerOpts, type ErrorOwner, type Said, type SaidOf, type BareIdOf } from "../model/alertText.ts";

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
  /* the newest error standing: until closed or resolved by its owner */
  error: Line;
  /* why an act did nothing: until it fades, is clicked, replaced, or cleared by another entry */
  warning: Line;
  /* the backup's trouble, "" when healthy — drawn as the pill */
  trouble: string;
  /* each kind's last words as raised, kept after they fade or close */
  said: Live;
}
export type { Kind } from "../model/alertText.ts";
export type Fading = "info" | "success";
export type Kept = "error" | "warning";
/* the lifecycle handle a user-triggered op holds: the ONLY thing that
   ends the busy state, so a stray info can never sneak past the line
   and the line can never be orphaned */
export interface Progress {
  step(done: number, total: number): void;
  ok(s: SaidOf<"success">): void;
  fail(s: SaidOf<"error">, copy?: string): void;
  cancel(): void;
}
export interface Alerts {
  readonly state: AlertState;
  clearWarning(): void;
  /* an alert by its id in the table, shown where its kind goes */
  raise: Raise;
  /* `holdsSaved`: from this owner's raise to its resolve, a routine "saved" is held back */
  owner(opts?: { holdsSaved?: boolean }): ErrorOwner;
  progress(id: BareIdOf<"info">): Progress;
  click(kind: Kind): void;
  /* the ×: closes the alert without copying */
  dismiss(kind: Kind): void;
  setTrouble(msg: string): void;
}
/* what each kind holds while it is live, for the headless tools to read
   without waiting on what is drawn (pin: alertLedger.test › each kind present only while live) */
export type Live = Partial<Record<Kind, string>> & { latest?: Fading; last?: Kind };
export function liveAlerts(state: AlertState): Live {
  const live: Live = {};
  for (const kind of ["error", "warning", "info", "success"] as const) if (state[kind].shown) live[kind] = state[kind].text;
  if (state[state.latest].shown) live.latest = state.latest;
  return live;
}
/* what the page has said, whether or not it still shows: an alert's
   words outlast its time on screen (pin: alertLedger.test › nothing said
   at rest) */
export const saidAlerts = (state: AlertState): Live => ({ ...state.said });
export const IDLE_TEXT = alertWords({ id: "saved" });
export const INFO_MS = 3000;
/* a warning is no error: it fades, given longer to read than an info */
export const WARNING_MS = 10000;
const COPY_FAILED = alertWords({ id: "copyFailed" });
const ROUTINE = new Set([IDLE_TEXT, alertWords({ id: "copied" })]);

/* an error standing: whose it is (null, none's), its words, and what a click copies */
interface Standing { owner: object | null; text: string; copy: string }

export type Told = (kind: Kept, text: string) => void;
export function alertLedger(copyText: (text: string) => Promise<void>, told: Told = () => {}): Alerts {
  const line = (text = ""): Line => ({ text, shown: false });
  const state = $state<AlertState>({ info: line(IDLE_TEXT), success: line(), latest: "info", busy: false, error: line(), warning: line(), trouble: "", said: {} });
  const timers: Record<Fading, ReturnType<typeof setTimeout> | null> = { info: null, success: null };
  /* each fading place's generation, bumped on every change to it: a late
     clipboard answer stays quiet once a newer success moved in */
  const fadingGen: Record<Fading, number> = { info: 0, success: 0 };
  let busyGen = 0;

  function stopClock(place: Fading): void {
    const t = timers[place];
    if (t) clearTimeout(t);
    timers[place] = null;
  }
  function say(kind: Kind, text: string): void {
    state.said[kind] = text;
    state.said.last = kind;
    if (kind === "info" || kind === "success") state.said.latest = kind;
  }
  function show(place: Fading, text: string): void {
    say(place, text);
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
  /* every error not yet resolved or closed, the newest last and shown; when
     it goes, the one beneath comes back (pin: alertLedger.test › the newest
     error shows) */
  const standing: Standing[] = [];
  const holding = new Set<object>();
  function showTop(): void {
    const top = standing.at(-1);
    if (top) state.error.text = top.text;
    state.error.shown = !!top;
  }
  /* an error raised again, by its owner or with no owner in the same words,
     goes to the top and its old one comes out (pin: alertLedger.test › an
     owner raising again takes its error to the top) (pin: alertLedger.test ›
     an error with no owner goes only when closed) */
  function place(s: Standing, beneath: boolean): void {
    const at = standing.findIndex((x) => (s.owner ? x.owner === s.owner : !x.owner && x.text === s.text));
    if (at >= 0) standing.splice(at, 1);
    standing.splice(beneath && standing.length ? standing.length - 1 : standing.length, 0, s);
    showTop();
  }
  function take(s: Standing | undefined): void {
    if (!s) return;
    standing.splice(standing.indexOf(s), 1);
    showTop();
  }
  /* a routine "saved" is held back from a `holdsSaved` owner's raise to its
     resolve, its error closed or not: another entry's landing would read as
     that one's (pin: alertLedger.test › a routine success is held back while
     a save error stands) (pin: alertLedger.test › an owner holding back) */
  function succeed(text: string, ms = INFO_MS): void {
    if (!(text === IDLE_TEXT && holding.size)) showFor("success", text, ms);
  }
  /* shown first, then logged: a log that throws must not keep an alert from
     being seen (pin: alertLedger.test › a log that cannot be written) */
  function tell(kind: Kept, text: string): void {
    try { told(kind, text); } catch (err) { console.error("the alert log failed", err); }
  }
  /* a key `caught` logs even when nothing was caught (pin: alertLedger.test ›
     an error with what was caught) */
  function error(text: string, from: OwnerOpts = {}, owner: object | null = null): void {
    const caught = "caught" in from;
    if (caught) console.error(text, from.caught);
    say("error", text);
    place({ owner, text, copy: from.copy || (caught ? errText(from.caught) : "") || text }, !!from.beneath);
    tell("error", text);
  }
  function owner(opts: { holdsSaved?: boolean } = {}): ErrorOwner {
    const me = {};
    return {
      raise: ((a: AlertId | Said, b?: unknown, c?: unknown): void => {
        const [s, from] = asSaid(a, b, c);
        if (opts.holdsSaved) holding.add(me);
        error(alertWords(s), from, me);
      }) as ErrorOwner["raise"],
      resolve: () => { holding.delete(me); take(standing.find((x) => x.owner === me)); },
    };
  }
  let warningTimer: ReturnType<typeof setTimeout> | null = null;
  function clearWarning(): void {
    if (warningTimer) clearTimeout(warningTimer);
    warningTimer = null;
    state.warning.shown = false;
  }
  function warn(text: string): void {
    clearWarning();
    say("warning", text);
    state.warning.text = text;
    state.warning.shown = true;
    warningTimer = setTimeout(clearWarning, WARNING_MS);
    tell("warning", text);
  }
  /* the line for a user-triggered op that runs longer than a moment: shown
     AT ONCE, in the click, and held until the handle's own terminal call */
  function progress(id: BareIdOf<"info">): Progress {
    const text = alertWords({ id } as Said);
    const mine = ++busyGen;
    state.busy = true;
    show("info", text);
    const live = (): boolean => mine === busyGen;
    const end = (): boolean => { if (!live()) return false; state.busy = false; busyGen++; return true; };
    return {
      step(done, total) { if (live()) { state.info.text = text + " " + done + " / " + total; say("info", state.info.text); } },
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
  /* the copy-failed error only closes: copying its words would fail again
     and raise it again (pin: alertLedger.test › a click on the copy-failed error) */
  function clickError(): void {
    const top = standing.at(-1);
    if (!top) return;
    take(top);
    if (top.text !== COPY_FAILED) copyDetail(top.copy);
  }
  function clickWarning(): void {
    if (!state.warning.shown) return;
    const words = state.warning.text;
    clearWarning();
    copyDetail(words);
  }
  const BY_KIND: Record<Kind, (words: string, ms: number | undefined, from: RaiseOpts) => void> = {
    error: (words, _ms, from) => error(words, from),
    warning: (words) => warn(words),
    info: (words, ms) => info(words, ms),
    success: (words, ms) => succeed(words, ms),
  };
  const raise = ((a: AlertId | Said, b?: unknown, c?: unknown): void => {
    const [s, from] = asSaid(a, b, c);
    BY_KIND[alertKind(s.id)](alertWords(s), alertMs(s.id), from);
  }) as Raise;
  const CLICKS: Record<Kind, () => void> = { info: () => clickFading("info"), success: () => clickFading("success"), error: clickError, warning: clickWarning };
  const CLOSES: Record<Kind, () => void> = {
    info: () => { if (!state.busy) hide("info"); },
    success: () => hide("success"),
    error: () => take(standing.at(-1)),
    warning: clearWarning,
  };
  return {
    get state() { return state; },
    clearWarning, raise, owner, progress, setTrouble: (msg) => { state.trouble = msg || ""; },
    click: (kind) => CLICKS[kind](),
    dismiss: (kind) => CLOSES[kind](),
  };
}
