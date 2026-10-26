#!/usr/bin/env bash
# One model call, no tools.
# Usage: RAW_CLAUDE_TOKEN=... MODEL=sonnet run-model.sh <agent-input.json> <claude-result.json>
#
# The token comes from the CLAUDE_CODE_OAUTH_TOKEN secret. A copied token can pick up
# whitespace, which the CLI reports only as "Not logged in", so it is stripped here and
# diagnosed without printing it. Stdout stays the step log (workflow commands work);
# the result goes only to the output file. A subscription limit is a skip, not a
# failure: limited=true goes to GITHUB_OUTPUT and the script exits 0.
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
errors="$(mktemp)"
set +e
claude -p "Apply editorialPreferences from the JSON on standard input to its events and return the decisions." \
  --model "${MODEL:-sonnet}" --tools "" --max-turns 3 --no-session-persistence \
  --system-prompt-file "$dir/system-prompt.md" \
  --json-schema "$(cat "$dir/decisions.schema.json")" \
  --output-format json < "$input" > "$output" 2> "$errors"
status=$?
set -e
cat "$errors"

# Only a failed call is classified, so event text in a good answer can never match.
failed="$status"
if [ "$failed" -eq 0 ] && grep -q '"is_error":[[:space:]]*true' "$output"; then failed=1; fi
if [ "$failed" -ne 0 ]; then
  if cat "$output" "$errors" | grep -qiE 'usage limit|limit reached|hit your( usage)? limit|rate.?limit|status.?429|overloaded|status.?529'; then
    echo "::notice::Skipped: the Claude subscription limit was reached or the service was busy. Nothing was written; the next run retries the same events."
    echo "limited=true" >> "${GITHUB_OUTPUT:-/dev/null}"
    exit 0
  fi
  if cat "$output" "$errors" | grep -qiE 'not logged in|invalid.*(token|api key)|unauthori[sz]ed|status.?401|expired|oauth'; then
    echo "::error::The Claude token was rejected; it may have expired (setup tokens last one year). Run 'claude setup-token' and save the new token as the CLAUDE_CODE_OAUTH_TOKEN secret."
  fi
  exit 1
fi
