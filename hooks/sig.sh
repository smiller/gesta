#!/bin/sh
# The signature of the app code as it stands in the working tree: every
# tracked or untracked file under src/ and index.html, names and bytes.
# Both hooks/accept.sh and hooks/pre-review.sh read it, so an acceptance
# covers the tree EXACTLY as looked at — touching any of these files after
# it re-arms the gate, a fix for a review finding included (the running
# app's rule, kept: the gate cannot tell a fix from a feature, so batch
# the fixes and ask once). Decided 2026-09-08.
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" || exit 1
APP_PATHS="src index.html"
ACCEPTMARK="$(git rev-parse --git-dir 2>/dev/null)/gesta-accepted"
app_sig() {
  git ls-files -co --exclude-standard -- $APP_PATHS | LC_ALL=C sort | while IFS= read -r f; do
    [ -f "$f" ] && { printf '%s ' "$f"; shasum -a 256 < "$f" | cut -c1-64; }
  done | shasum -a 256 | cut -c1-64
}
accepted_sig() { [ -f "$ACCEPTMARK" ] && sed -n 's/^sig=//p' "$ACCEPTMARK"; }
