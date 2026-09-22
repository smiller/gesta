#!/bin/sh
# hooks-test.sh — prove the hooks still have teeth: the review gate
# (hooks/sig.sh, accept.sh, pre-review.sh), the test gates (hooks/stop.sh,
# hooks/pre-commit) and their wiring. The running app's gate-test.sh, cut
# to this app's five scripts (2026-09-22). A hook's long-term risk is not
# being defeated but breaking QUIETLY — a renamed script, a settings
# reload that did not take, a hooksPath never set on a clone — while
# everyone assumes it is on. Every check here was run by hand once while
# the hook was built; this makes them repeatable, and `npm run verify`
# runs it, so the pre-commit certifies the gates it is one of.
#
# It runs inside a throwaway git repo under $TMPDIR and never touches this
# repo's markers: the acceptance mark and the stop log resolve inside the
# fixture's .git off `git rev-parse --git-dir`, and git's INHERITED
# environment is cleared first — a commit from a linked worktree exports
# GIT_DIR and GIT_INDEX_FILE, which outrank the working directory, and
# without the unset every git command below would act on the REAL repo
# (the running app's record, 54483f6). The belts after `git init` assert
# both against git's own answer.
#
# Every check is asserted on the hook's EXIT CODE — that is what allows or
# refuses — and, where more than one arm could give the same code, on the
# message, so a case cannot pass because a later arm fired.
#
# Exits 0 only when every case passes. Usage: sh tools/hooks-test.sh [-v]
set -u
VERBOSE=${1:-}
REPO=$(cd "$(dirname "$0")/.." && pwd)
command -v python3 >/dev/null || { echo "hooks-test: python3 required"; exit 1; }
command -v npm >/dev/null || { echo "hooks-test: npm required"; exit 1; }

TMP=$(mktemp -d) || exit 1
trap 'rm -rf "$TMP"' EXIT INT TERM
WORK="$TMP/repo"

unset GIT_DIR GIT_INDEX_FILE GIT_WORK_TREE GIT_OBJECT_DIRECTORY \
      GIT_COMMON_DIR GIT_PREFIX GIT_CONFIG_PARAMETERS GIT_NAMESPACE \
      GIT_ALTERNATE_OBJECT_DIRECTORIES GIT_CEILING_DIRECTORIES
GIT_AUTHOR_NAME="Hooks Test"; GIT_AUTHOR_EMAIL=test@example.invalid
GIT_COMMITTER_NAME="Hooks Test"; GIT_COMMITTER_EMAIL=test@example.invalid
export GIT_AUTHOR_NAME GIT_AUTHOR_EMAIL GIT_COMMITTER_NAME GIT_COMMITTER_EMAIL

# --- fixture ---------------------------------------------------------------
mkdir -p "$WORK/hooks" "$WORK/src" "$WORK/tools" || exit 1
cd "$WORK" || exit 1
git init -q .
CLAUDE_PROJECT_DIR="$WORK"; export CLAUDE_PROJECT_DIR
case "$CLAUDE_PROJECT_DIR" in
  "$TMP"/*) ;;
  *) echo "hooks-test: refusing to run outside the throwaway repo"; exit 1 ;;
esac
TMPREAL=$(cd "$TMP" && pwd -P)
REALGIT=$(git rev-parse --absolute-git-dir 2>/dev/null)
case "$REALGIT" in
  "$TMP"/*|"$TMPREAL"/*) ;;
  *) echo "hooks-test: git dir resolved to '$REALGIT', outside the throwaway repo — refusing"; exit 1 ;;
esac
for f in sig.sh accept.sh pre-review.sh stop.sh pre-commit; do
  cp "$REPO/hooks/$f" hooks/ || exit 1
done
# the npm scripts the test gates run, as stubs this script flips: a file
# each, so a case rewrites one line and the hook under test runs npm as
# it does in anger
cat > package.json <<'JSON'
{ "name": "hooks-fixture", "private": true,
  "scripts": { "check": "sh ./check.sh", "test": "sh ./test.sh", "verify": "sh ./verify.sh" } }
JSON
green() { printf '#!/bin/sh\nexit 0\n' > "$1"; }
red()   { printf '#!/bin/sh\necho "%s says red"\nexit 1\n' "$1" > "$1"; }
green check.sh; green test.sh; green verify.sh
echo app > index.html
echo 'export const a = 1;' > src/a.ts
echo tool > tools/t.mjs
git add -A && git commit -qm "init" >/dev/null
git config core.hooksPath hooks

. hooks/sig.sh   # ACCEPTMARK, app_sig, accepted_sig — from the gate itself, so a rename cannot strand a copy here
case "$ACCEPTMARK" in
  .git/*|"$TMP"/*|"$TMPREAL"/*) ;;
  *) echo "hooks-test: the acceptance mark '$ACCEPTMARK' is not in this fixture's .git — refusing"; exit 1 ;;
esac

pass=0; fail=0
ok()  { pass=$((pass + 1)); [ -n "$VERBOSE" ] && printf '  ok    %s\n' "$1"; return 0; }
bad() { fail=$((fail + 1)); printf '  FAIL  %s\n' "$1"; }

clean() { git checkout -q -- . ; git clean -qfd; rm -f "$ACCEPTMARK"; }
touch_src()   { printf '\n// tweak\n' >> src/a.ts; }
touch_index() { printf '\n<!-- tweak -->\n' >> index.html; }
touch_tool()  { printf '\n// tweak\n' >> tools/t.mjs; }

# call <name> <want-exit> <tool-json> [<stderr-substring>]
call() {
  cerr=$(printf '%s' "$3" | sh hooks/pre-review.sh 2>&1 >/dev/null); got=$?
  if [ "$got" != "$2" ]; then bad "$1 — want exit $2, got $got"; return 0; fi
  if [ $# -ge 4 ] && [ -n "$4" ]; then
    case "$cerr" in *"$4"*) ;; *) bad "$1 — exit $2 but stderr lacked \"$4\": $(printf '%s' "$cerr" | head -1)"; return 0 ;; esac
  fi
  ok "$1"
}
# stop_says <name> <want-exit> [<stderr-substring>]  (no substring = expect silence)
stop_says() {
  serr=$(sh hooks/stop.sh 2>&1 >/dev/null); rc=$?
  if [ "$rc" != "$2" ]; then bad "$1 — want exit $2, got $rc"; return 0; fi
  if [ $# -ge 3 ] && [ -n "$3" ]; then
    case "$serr" in *"$3"*) ;; *) bad "$1 — exit $2 but stderr lacked \"$3\""; return 0 ;; esac
  elif [ -n "$serr" ]; then bad "$1 — expected silence, got: $(printf '%s' "$serr" | head -1)"; return 0
  fi
  ok "$1"
}
SKILL_REVIEW='{"tool_name":"Skill","tool_input":{"skill":"code-review","args":"medium"}}'
SKILL_OTHER='{"tool_name":"Skill","tool_input":{"skill":"tdd"}}'
WORKFLOW='{"tool_name":"Workflow","tool_input":{"script":"export const meta = {}"}}'
AGENT_REVIEW='{"tool_name":"Agent","tool_input":{"subagent_type":"general-purpose","description":"Look at the diff","prompt":"Read the last commit and report your findings on its correctness"}}'
AGENT_OTHER='{"tool_name":"Agent","tool_input":{"subagent_type":"Explore","description":"Find the parser","prompt":"Where is the markdown parsed? Name the file."}}'
BASH='{"tool_name":"Bash","tool_input":{"command":"ls"}}'

# === sig.sh ================================================================
clean
s0=$(app_sig)
touch_src;   [ "$(app_sig)" != "$s0" ] && ok "sig moves on an edit under src/" || bad "sig did not move on an edit under src/"
clean
touch_index; [ "$(app_sig)" != "$s0" ] && ok "sig moves on an edit to index.html" || bad "sig did not move on an edit to index.html"
clean
touch_tool;  [ "$(app_sig)" = "$s0" ] && ok "sig stands on an edit under tools/" || bad "sig moved on an edit under tools/"
clean
echo 'export const b = 2;' > src/new.ts
[ "$(app_sig)" != "$s0" ] && ok "sig counts an untracked file under src/" || bad "sig ignored an untracked file under src/"
clean
[ "$(app_sig)" = "$s0" ] && ok "sig is stable over a clean tree" || bad "sig differs between two reads of a clean tree"

# === pre-review.sh, nothing accepted =======================================
clean
call "unaccepted: code-review refused"     2 "$SKILL_REVIEW" "REFUSED (skill:code-review)"
call "unaccepted: simplify refused"        2 '{"tool_name":"Skill","tool_input":{"skill":"simplify"}}' "REFUSED (skill:simplify)"
call "unaccepted: security-review refused" 2 '{"tool_name":"Skill","tool_input":{"skill":"security-review"}}' "REFUSED (skill:security-review)"
call "unaccepted: any Workflow refused"    2 "$WORKFLOW" "REFUSED (workflow)"
call "unaccepted: a review-shaped Agent refused" 2 "$AGENT_REVIEW" "REFUSED (agent)"
call "unaccepted: a Skill outside the review set passes" 0 "$SKILL_OTHER"
call "unaccepted: an Agent with no review in its words passes" 0 "$AGENT_OTHER"
call "unaccepted: a Bash call is not the gate's" 0 "$BASH"

# === accept.sh, then pre-review.sh over the accepted tree ==================
aout=$(sh hooks/accept.sh 2>&1); arc=$?
[ "$arc" = 0 ] && [ -f "$ACCEPTMARK" ] && ok "accept writes the mark and exits 0" || bad "accept: exit $arc, mark $([ -f "$ACCEPTMARK" ] && echo present || echo absent)"
[ "$(accepted_sig)" = "$(app_sig)" ] && ok "the mark's sig is the tree's" || bad "the mark's sig is not the tree's"
grep -q '^head=' "$ACCEPTMARK" && grep -q '^when=' "$ACCEPTMARK" && ok "the mark records head and when" || bad "the mark lacks head= or when="
aout2=$(sh hooks/accept.sh 2>&1); case "$aout2" in *"already accepted"*) ok "a second accept says already accepted" ;; *) bad "a second accept did not say already accepted: $aout2" ;; esac
call "accepted: code-review passes"        0 "$SKILL_REVIEW"
call "accepted: a Workflow passes"         0 "$WORKFLOW"
call "accepted: a review-shaped Agent passes" 0 "$AGENT_REVIEW"
touch_tool
call "accepted: an edit under tools/ keeps the acceptance" 0 "$SKILL_REVIEW"
touch_src
call "accepted then src/ edited: code-review refused again" 2 "$SKILL_REVIEW" "REFUSED (skill:code-review)"
git checkout -q -- src
call "the edit reverted: accepted again" 0 "$SKILL_REVIEW"
touch_index
call "accepted then index.html edited: refused again" 2 "$SKILL_REVIEW" "REFUSED"
clean
echo 'export const b = 2;' > src/new.ts
sh hooks/accept.sh >/dev/null 2>&1
rm src/new.ts
call "an untracked src file removed after acceptance: refused" 2 "$SKILL_REVIEW" "REFUSED"

# === stop.sh ===============================================================
clean
red check.sh; red test.sh
stop_says "clean tree: silent and 0 even with the checks red" 0
green check.sh; green test.sh
touch_src;   stop_says "src/ moved, checks green: silent and 0" 0
red check.sh; stop_says "src/ moved, tsc red: blocked" 2 "Stop blocked"
green check.sh; red test.sh; stop_says "src/ moved, suite red: blocked" 2 "Stop blocked"
serr=$(sh hooks/stop.sh 2>&1 >/dev/null); case "$serr" in *"test.sh says red"*) ok "the block carries the log's tail" ;; *) bad "the block did not carry the log's tail" ;; esac
clean; red test.sh
touch_index; stop_says "index.html moved, suite red: blocked" 2 "Stop blocked"
clean; red test.sh
touch_tool;  stop_says "only tools/ moved, suite red: not the Stop gate's" 0
clean; red test.sh
echo 'export const b = 2;' > src/new.ts
stop_says "an untracked file under src/ alone, suite red: blocked (the hole found 2026-09-22: git diff HEAD read tracked files only)" 2 "Stop blocked"
clean; green test.sh

# === pre-commit ============================================================
clean
h0=$(git rev-parse HEAD)
touch_src; git add -A
if git commit -qm "feat: green" >/dev/null 2>&1 && [ "$(git rev-parse HEAD)" != "$h0" ]; then ok "pre-commit: verify green, the commit lands"; else bad "pre-commit: verify green but the commit did not land"; fi
h1=$(git rev-parse HEAD)
red verify.sh; touch_src; git add -A
cout=$(git commit -qm "feat: red" 2>&1); crc=$?
if [ "$crc" != 0 ] && [ "$(git rev-parse HEAD)" = "$h1" ]; then ok "pre-commit: verify red, the commit is refused"; else bad "pre-commit: verify red, exit $crc, HEAD $([ "$(git rev-parse HEAD)" = "$h1" ] && echo held || echo MOVED)"; fi
case "$cout" in *"npm run verify FAILED"*) ok "pre-commit names verify in its refusal" ;; *) bad "pre-commit's refusal did not name verify: $(printf '%s' "$cout" | tail -1)" ;; esac
git reset -q --hard "$h1"; green verify.sh

# === the wiring, read from THE REAL REPO (read-only) ========================
wiring=$(python3 - "$REPO" <<'PY'
import json, sys, os
repo = sys.argv[1]; out = []
def bad(m): out.append(m)
s = json.load(open(os.path.join(repo, ".claude", "settings.json")))
hooks = s.get("hooks", {})
pre = [h for m in hooks.get("PreToolUse", []) for h in m.get("hooks", []) if "pre-review.sh" in h.get("command", "")]
if not pre: bad("PreToolUse does not run hooks/pre-review.sh")
matchers = [m.get("matcher", "") for m in hooks.get("PreToolUse", []) if any("pre-review.sh" in h.get("command", "") for h in m.get("hooks", []))]
for tool in ("Skill", "Agent", "Workflow"):
    if not any(tool in m.split("|") for m in matchers): bad("the pre-review matcher does not cover %s" % tool)
stop = [h for m in hooks.get("Stop", []) for h in m.get("hooks", []) if "stop.sh" in h.get("command", "")]
if not stop: bad("Stop does not run hooks/stop.sh")
deny = s.get("permissions", {}).get("deny", [])
for rule in ("Edit(hooks/**)", "Write(hooks/**)", "Edit(.claude/settings.json)", "Write(.claude/settings.json)"):
    if rule not in deny: bad("permissions.deny is missing %s" % rule)
if not any(r.startswith("Bash(") and "accept.sh" in r for r in deny): bad("permissions.deny does not deny running accept.sh")
print("\n".join(out))
PY
)
if [ -z "$wiring" ]; then ok "settings.json wires pre-review.sh and stop.sh, the matcher covers Skill, Agent and Workflow, hooks/** and accept.sh are denied"
else printf '%s\n' "$wiring" | while IFS= read -r w; do [ -n "$w" ] && echo "  FAIL  wiring: $w"; done; fail=$((fail + $(printf '%s\n' "$wiring" | grep -c .))); fi
[ "$(git -C "$REPO" config core.hooksPath)" = "hooks" ] && ok "the real repo's core.hooksPath is hooks" || bad "the real repo's core.hooksPath is not hooks: git will not run hooks/pre-commit"
for f in accept.sh pre-review.sh stop.sh pre-commit; do [ -x "$REPO/hooks/$f" ] && ok "hooks/$f is executable" || bad "hooks/$f is not executable"; done
grep -q 'test:hooks' "$REPO/package.json" && ok "npm run verify runs this test" || bad "package.json does not run this test under verify"

# === report ================================================================
total=$((pass + fail))
echo
if [ "$fail" = 0 ]; then echo "PASS — $pass/$total hook checks"; exit 0; fi
echo "FAIL — $fail of $total hook checks failed"
echo "A hook is not behaving as documented. Do NOT assume the gates are on until this is green again."
exit 1
