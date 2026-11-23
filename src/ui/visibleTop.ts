/* where the page shows from: under the masthead and the alert area
   stuck beneath it, whichever reaches lower */
export const visibleTop = (): number => Math.max(0, ...[".site-head", ".alerts"].map((s) => document.querySelector(s)?.getBoundingClientRect().bottom ?? 0));
