#!/bin/sh
# UserPromptExpansion, UserPromptSubmit and SubagentStop: a typed /code-review
# or /improve-codebase-architecture adds and starts its progress row
# (tools/progress/reviewRow.ts), whichever event brings it; the second to
# fire finds the row started and writes nothing. Each input is kept in
# .git/gesta-hook-input.log, to read what each event sends. Never blocks a
# prompt: exit 0 whatever happens. Stdout reaches the agent as context.
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" || exit 0
in=$(cat)
printf '%s\n' "$in" >> "$(git rev-parse --git-dir)/gesta-hook-input.log" 2>/dev/null
printf '%s' "$in" | node tools/progress/reviewRow.ts
exit 0
