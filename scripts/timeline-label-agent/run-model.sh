#!/usr/bin/env bash
# One model call, no tools.
# Usage: RAW_CLAUDE_TOKEN=... MODEL=sonnet run-model.sh <agent-input.json> <claude-result.json>
#
# The token comes from the CLAUDE_CODE_OAUTH_TOKEN secret. A copied token can pick up
# whitespace, which the CLI reports only as "Not logged in", so it is stripped here and
# diagnosed without printing it. Stdout stays the step log (workflow commands work);
# the result goes only to the output file.
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"
input="$1" output="$2"

raw="${RAW_CLAUDE_TOKEN:-}"
unset RAW_CLAUDE_TOKEN
token="$(printf '%s' "$raw" | tr -d '[:space:]')"
stripped=$(( ${#raw} - ${#token} ))
raw=""
if [ -z "$token" ]; then
  echo "::error::The CLAUDE_CODE_OAUTH_TOKEN secret is empty or missing."
  exit 1
fi
echo "::add-mask::$token"
if [ "$stripped" -gt 0 ]; then
  echo "::warning::Removed $stripped whitespace character(s) from the token secret. Save the secret again without them."
fi
case "$token" in
  sk-ant-oat*) ;;
  *) echo "::warning::The token does not start like a 'claude setup-token' token. If the call fails with 'Not logged in', create a new one." ;;
esac
export CLAUDE_CODE_OAUTH_TOKEN="$token"
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1

claude --version
claude -p "Apply editorialPreferences from the JSON on standard input to its events and return the decisions." \
  --model "${MODEL:-sonnet}" --tools "" --max-turns 3 --no-session-persistence \
  --system-prompt-file "$dir/system-prompt.md" \
  --json-schema "$(cat "$dir/decisions.schema.json")" \
  --output-format json < "$input" > "$output"
