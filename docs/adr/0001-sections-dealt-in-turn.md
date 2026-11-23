# The verdict deals its sections to the windows in turn, not by their measured time

The verdict plays the corner and order runs each in five windows, window
k taking every fifth section from the k-th. Dealing by each section's
time from the last run, longest first to the window with least work, was
built and measured on 2026-11-23 and dropped. On paper it evened the
windows' work from 55.6–78.1 s to 68.7–69.0 s; played, the windows took
46–71 s by time against 47–68 s in turn, and four whole verdicts took
86.1–90.7 s either way. A section's time moves too much from run to run,
and with the machine's load, for last run's times to plan the next one;
the balance found on paper was not there when played.

## Considered Options

- Dealt by measured time (longest first, least-loaded window): built,
  played, no gain; it also left the deal changing with every run and the
  merge needing each section's place printed beside it.
- Dealt in turn: kept. With no times it is what the time-based deal falls
  back to anyway, and its windows are fixed from run to run.
