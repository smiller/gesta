#!/bin/sh
# PreToolUse gate, decided 2026-09-08: no review-shaped call while the app
# code has moved past the last acceptance. A review costs quota (MEASURED
# in the running app: 101k–154k tokens for one /code-review at medium) and
# a look by hand at a UI change routinely turns up rework, so a review
# before the look pays twice. Exit 2 makes the harness refuse the call;
# there is nothing to talk past. What it gates, by COST SHAPE: the review
# skills (code-review, simplify, security-review), ANY Workflow call, and
# an Agent whose type or prompt reads like review work. Nothing else.
# Ungated when the tree's signature is the accepted one.
. "$(dirname "$0")/sig.sh"
input=$(cat)
shape=$(printf '%s' "$input" | python3 -c '
import json,sys,re
d=json.load(sys.stdin); t=d.get("tool_name",""); i=d.get("tool_input",{}) or {}
if t=="Workflow": print("workflow"); sys.exit()
if t=="Skill" and re.match(r"^(code-review|simplify|security-review)$", str(i.get("skill",""))): print("skill:"+i["skill"]); sys.exit()
if t=="Agent":
  text=(str(i.get("subagent_type",""))+" "+str(i.get("description",""))+" "+str(i.get("prompt",""))[:2000]).lower()
  if re.search(r"\breview|\baudit\b|\bfindings?\b|\bcritique\b", text): print("agent"); sys.exit()
print("")
' 2>/dev/null)
[ -n "$shape" ] || exit 0
if [ "$(app_sig)" = "$(accepted_sig)" ]; then exit 0; fi
cat >&2 <<MSG
REFUSED ($shape): src/ or index.html has moved since the last acceptance.
A review runs only over code a hand has looked at. Finish the work, make
the suite green, tell the reader what to look at, and STOP. When they have
looked they run \`! sh hooks/accept.sh\`; then the call goes through.
MSG
exit 2
