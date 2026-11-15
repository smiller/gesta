# The Helium steps wait for what they wait for

## Why

`verify` plays the steps twice. A timed corner run (TIMING=1) took 319.3 s,
96.3 s of it in fixed waits and 16.0 s in condition waits run out.

## Decisions (asked)

- A wait that could never be met fixed first: three, 16 s (a19e7f3).
- Each fixed wait, largest first, made a wait for its condition (a save
  landed, a pin shown, an entry arrived, the warm in) (9be39e5), or, over
  an app timer, a jump of the page's clock: the corner run installs
  Playwright's clock, its date fixed as before, and `jump` in the kit
  fast-forwards it (d85aeb9, then this). Each section checked against the
  approved run on its own, then the whole verdict in both orders.
- Kept fixed, and why: a held key's repeats arrive in real time
  (keys.ts `hold`, the walks and digits read after it); another window's
  write arriving has no mark of its own to wait on (notices.ts, keys.ts);
  a picture's decode after a step-made delay; a fold click's 200 ms in the
  adapters, which cannot take the kit's jump.

## Record

- Timed whole corner runs: 319.3 s, fixed 96.3 s, run out 16.0 s at the
  start; 247.2 s, fixed 25.9 s at the end. One run out 2.0 s in
  "sub-entries" (a click onto the selection already there), not when
  played alone: on the side list.
- One reading changed and approved: a corner read once its save landed
  shows "saved", where 2.5 s later it had faded.
- `STEPS=` takes its whole value as a name too, for a section whose name
  holds a comma.
