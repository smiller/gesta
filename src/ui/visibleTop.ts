/* where the page shows from: under the header and the strip of flashes
   stuck beneath it, whichever reaches lower */
export const visibleTop = (): number => Math.max(0, ...[".site-head", ".notices"].map((s) => document.querySelector(s)?.getBoundingClientRect().bottom ?? 0));
