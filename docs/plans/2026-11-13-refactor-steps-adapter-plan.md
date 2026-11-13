# The Helium steps without their adapter seam, the seeds out of the page

## Why

Candidate 6 of the first `/improve-codebase-architecture` run
(2026-11-12): the steps took their one adapter through a binding made for
two, and the page carried the steps' seed tables and a scratch mode no
tool used.

## Decided (the reader, 2026-11-13, by grilling)

1. kit.ts imports `adapters/app.ts`; `Adapter` and its binding gone,
   `pill` a run option.
2. Every seed once, in kit.ts, written through the store by the steps;
   main.ts's three tables and `?store=seed…` modes gone.
3. The approved run's launch line may lose `seed;`; nothing else may move.
4. `?fixture=` retired ("I never use it by hand"), and with it every
   fixture import in the page.

## Record

- The fresh start opens the page, writes the seeds, and opens it again
  under a query no address carries (`?fresh`). Without it a step's next
  goto moved only the hash and the page never read what the step had just
  written: four sections read otherwise, the shelves step its Shelves
  entry unseen (MEASURED, the first replay). With it the corner run
  differs in the launch line alone; order, bridge and reader ok.
- main.ts 563 → 510 lines; dist/index.html 945,037 → 886,752 bytes
  (MEASURED, `wc -l`, `ls -l`).
- main.ts fell to 9.09 on Code Duplication once the else-branch around
  the wiring was gone: CodeScene had not read the code under it, and the
  threshold the code-health plan recorded over five short call sequences
  was crossed. The cure that plan named: the load's patience moved to
  src/ui/loadPatience.ts, given the notices themselves; main.ts 10.
