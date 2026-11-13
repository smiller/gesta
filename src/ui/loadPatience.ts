export interface Pins {
  stick(text: string): number;
  releasePin(gen: number): void;
}
/* a store that never answers left a blank page saying nothing
   (pin: losing nothing › a store that never answers) */
export function loadPatience(ms: number, pins: Pins): { start(): void; done(): void } {
  let pinned = 0, timer: ReturnType<typeof setTimeout> | undefined, loaded = false;
  return {
    start: () => { if (!loaded) timer = setTimeout(() => { pinned = pins.stick("couldn't load entries — reload"); }, ms); },
    done: () => {
      loaded = true;
      clearTimeout(timer);
      if (pinned) pins.releasePin(pinned);
    },
  };
}
