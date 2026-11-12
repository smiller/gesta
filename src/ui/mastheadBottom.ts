export const mastheadBottom = (): number => Math.max(0, document.querySelector(".site-head")?.getBoundingClientRect().bottom ?? 0);
