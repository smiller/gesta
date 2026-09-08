#!/bin/sh
# The acceptance: run it yourself (`! sh hooks/accept.sh`) once you have
# LOOKED at the app code as it stands and are willing to pay for a review
# of it. It records the tree's signature; hooks/pre-review.sh refuses a
# review-shaped tool call while the tree's signature is not the accepted
# one. The agent is not to run this — the point is a look by a hand.
. "$(dirname "$0")/sig.sh"
sig=$(app_sig)
if [ "$sig" = "$(accepted_sig)" ]; then echo "accept: this tree is already accepted."; exit 0; fi
{ echo "sig=$sig"; echo "head=$(git rev-parse --short HEAD 2>/dev/null)"; echo "when=$(date -u +%Y-%m-%dT%H:%M:%SZ)"; } > "$ACCEPTMARK" \
  || { echo "accept: could not write $ACCEPTMARK — NOT accepted." >&2; exit 1; }
echo "Accepted src/ and index.html as they stand ($(echo "$sig" | cut -c1-12)…). A review may run"
echo "over exactly this content; editing any of it re-arms the gate."
