import type { EntryLayer } from "../store/entries.ts";
import type { Raise, ErrorOwner } from "../model/alertText.ts";

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

/* a store that never answers left a blank page saying nothing
   (pin: losing nothing › a store that never answers) */
export function loadErrors(ms: number, owner: ErrorOwner): { start(): void; landed(layer: Load & Pick<EntryLayer, "storeReadError">): void } {
  let timer: ReturnType<typeof setTimeout> | undefined, landed = false;
  return {
    start: () => { if (!landed) timer = setTimeout(() => owner.raise("couldntLoad"), ms); },
    landed: (layer) => {
      landed = true;
      clearTimeout(timer);
      owner.resolve();
      /* an unreadable journal is an error, not a status: it sticks, the
         caught failure copyable */
      if (layer.storeReadFailed) owner.raise("storeUnreadable", { caught: layer.storeReadError });
    },
  };
}
