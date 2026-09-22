#!/bin/sh
# Stop hook — the test gate the running app's stop.sh had as its gate (1),
# carried over 2026-09-21 without the reviewer loop that sat behind it. If
# src/ or index.html differ from HEAD, tsc and the suite must be green before
# the turn can end: the reader is asked to look and accept AFTER this, and a
# red suite is rework either way, so the look should never be spent on one.
# The Helium tools are not run here — they take most of a Stop timeout (the
# running app's record) and are `npm run verify`'s, gated at commit instead.
# Exit 2 feeds the message back to the agent and refuses the stop.
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" || exit 0
[ -z "$(git status --porcelain -- src index.html)" ] && exit 0
log="$(git rev-parse --git-dir)/gesta-stop-tests.log"
if ! { npm run check && npm test; } > "$log" 2>&1; then
  {
    echo "Stop blocked: src/ or index.html has uncommitted changes and the checks FAILED:"
    tail -15 "$log"
    echo "Fix the suite before asking the reader to look; a red suite is rework anyway."
  } >&2
  exit 2
fi
exit 0
