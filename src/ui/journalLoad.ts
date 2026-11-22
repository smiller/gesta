import type { EntryLayer } from "../store/entries.ts";
import type { Raise } from "../model/alertText.ts";

type Load = Pick<EntryLayer, "warmed" | "storeReadFailed">;
export type LoadState = "loading" | "failed" | "in";
export const loadState = (layer: Load): LoadState => (layer.warmed ? "in" : layer.storeReadFailed ? "failed" : "loading");

const REFUSAL: Record<Exclude<LoadState, "in">, "stillLoading" | "loadFailedFirst"> = { loading: "stillLoading", failed: "loadFailedFirst" };
/* says the refusal and answers whether it refused (pin: journalLoad.test › an act refused while the journal loads) */
export function refuseCold(layer: Load, raise: Raise): boolean {
  const state = loadState(layer);
  if (state !== "in") raise(REFUSAL[state]);
  return state !== "in";
}

export interface LoadAlerts {
  raise: Raise;
  resolveError(gen: number): void;
}
/* a store that never answers left a blank page saying nothing
   (pin: losing nothing › a store that never answers) */
export function loadErrors(ms: number, alerts: LoadAlerts): { start(): void; landed(layer: Load & Pick<EntryLayer, "storeReadError">): void } {
  let shown = 0, timer: ReturnType<typeof setTimeout> | undefined, landed = false;
  return {
    start: () => { if (!landed) timer = setTimeout(() => { shown = alerts.raise("couldntLoad"); }, ms); },
    landed: (layer) => {
      landed = true;
      clearTimeout(timer);
      if (shown) alerts.resolveError(shown);
      /* an unreadable journal is an error, not a status: it sticks, the
         caught failure copyable */
      if (layer.storeReadFailed) alerts.raise("storeUnreadable", { caught: layer.storeReadError });
    },
  };
}
