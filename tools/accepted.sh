#!/bin/sh
# Whether the app tree is the accepted one, asked as the hooks ask it: under
# sh, from the repository's top, through hooks/sig.sh. Sourcing sig.sh from
# another shell read zero files (zsh does not split $APP_PATHS; `sh -c` cds
# outside the repository) and answered "not accepted" over an accepted tree,
# so a signature over no files is refused here rather than compared.
# Exit 0 accepted, 1 not, 2 could not tell. Usage: sh tools/accepted.sh
top=$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null) || { echo "accepted: not inside a git repository — cannot tell" >&2; exit 2; }
CLAUDE_PROJECT_DIR=$top; export CLAUDE_PROJECT_DIR
. "$top/hooks/sig.sh" || { echo "accepted: hooks/sig.sh did not load — cannot tell" >&2; exit 2; }
count=$(git ls-files -co --exclude-standard -- src index.html | wc -l | tr -d ' ')
[ "$count" -gt 0 ] || { echo "accepted: no files under src/ or index.html at $top — cannot tell" >&2; exit 2; }
sig=$(app_sig)
case "$sig" in
  e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855|"") echo "accepted: the signature read no files — cannot tell" >&2; exit 2 ;;
esac
mark=$(sed -nE 's/^(head|when)=//p' "$ACCEPTMARK" 2>/dev/null | paste -sd' ' -)
if [ "$sig" = "$(accepted_sig)" ]; then
  echo "accepted: $count files, sig $(echo "$sig" | cut -c1-12)… (mark: ${mark:-none})"; exit 0
fi
echo "NOT accepted: $count files, sig $(echo "$sig" | cut -c1-12)…, the mark's $(accepted_sig | cut -c1-12)… (mark: ${mark:-none})"; exit 1
