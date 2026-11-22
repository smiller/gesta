import type { EntryLayer } from "../store/entries.ts";
import type { ErrorFrom } from "./alertLedger.svelte.ts";

type Load = Pick<EntryLayer, "warmed" | "storeReadFailed">;
export type LoadState = "loading" | "failed" | "in";
export const loadState = (layer: Load): LoadState => (layer.warmed ? "in" : layer.storeReadFailed ? "failed" : "loading");

const REFUSAL: Record<Exclude<LoadState, "in">, string> = {
  loading: "still loading — try that again in a moment",
  failed: "couldn’t load entries — reload first",
};
/* says the refusal and answers whether it refused (pin: journalLoad.test › an act refused while the journal loads) */
export function refuseCold(layer: Load, warn: (text: string) => void): boolean {
  const state = loadState(layer);
  if (state !== "in") warn(REFUSAL[state]);
  return state !== "in";
}

export interface Pins {
  error(text: string, from?: ErrorFrom): number;
  resolveError(gen: number): void;
}
/* a store that never answers left a blank page saying nothing
   (pin: losing nothing › a store that never answers) */
export function loadPins(ms: number, pins: Pins): { start(): void; landed(layer: Load & Pick<EntryLayer, "storeReadError">): void } {
  let pinned = 0, timer: ReturnType<typeof setTimeout> | undefined, landed = false;
  return {
    start: () => { if (!landed) timer = setTimeout(() => { pinned = pins.error("couldn’t load entries — reload"); }, ms); },
    landed: (layer) => {
      landed = true;
      clearTimeout(timer);
      if (pinned) pins.resolveError(pinned);
      /* an unreadable journal is an error, not a status: it sticks, the
         caught failure copyable */
      if (layer.storeReadFailed) pins.error("the store could not be read — reload", { caught: layer.storeReadError });
    },
  };
}
