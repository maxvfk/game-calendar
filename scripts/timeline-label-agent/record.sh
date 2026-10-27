#!/usr/bin/env bash
# Deterministic write side of autonomous Timeline naming. No model, no Claude secret.
# Usage: record.sh <proposals.json> <target-branch> <report-dir> <writer-ticket.json>
#
# Each attempt starts from the freshest origin/main: rebuild the feed, run `accept`
# against it, rerun typecheck/test/build, commit only the registry and push. Pushing to
# main is fast-forward only; the rehearsal branch is rebuilt from main each run. At most
# three attempts, then stop without writing. Writes changed=true|false to GITHUB_OUTPUT.
set -euo pipefail
proposals="$(realpath "$1")" target="$2" reports="$(realpath -m "$3")"
ticket="$(realpath "${4:?writer ticket required}")"
registry=""
mkdir -p "$reports"
case "$target" in
  main) push_args=() ;;
  timeline-labels/rehearsal) push_args=(--force-with-lease) ;;
  *) echo "::error::Unsupported target branch: $target"; exit 1 ;;
esac

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

for attempt in 1 2 3; do
  echo "::group::Attempt $attempt on fresh main"
  git fetch --quiet origin main
  git checkout --quiet --detach origin/main
  registry="$(bun scripts/timeline-storage.ts check-ticket "$ticket")"
  bun run build:feed > /dev/null
  bun scripts/timeline-labels.ts accept "$proposals" "$registry" "$reports/accept-report.json" "" "$ticket"
  if git diff --quiet -- "$registry"; then
    echo "Nothing new to record."
    echo "::endgroup::"
    echo "changed=false" >> "${GITHUB_OUTPUT:-/dev/null}"
    exit 0
  fi
  cp "$registry" "$reports/registry-after.json"
  bun run typecheck
  bun test
  bun run build > /dev/null
  bun scripts/timeline-storage.ts check-ticket "$ticket" > /dev/null
  git add -- "$registry"
  if [ -n "$(git status --porcelain --untracked-files=no | grep -v " $registry\$" || true)" ]; then
    echo "::error::Checks changed tracked files other than the registry"; git status --porcelain; exit 1
  fi
  summary="$(jq -r '.outcomes | group_by(.outcome) | map("\(.[0].outcome) \(length)") | join(", ")' "$reports/accept-report.json")"
  git commit --quiet -m "data(timeline): record automatic label decisions" \
    -m "$summary. Run: ${GITHUB_SERVER_URL:-}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-local}"
  echo "::endgroup::"
  if git push ${push_args[@]+"${push_args[@]}"} origin "HEAD:refs/heads/$target"; then
    echo "Recorded on $target: $summary"
    echo "changed=true" >> "${GITHUB_OUTPUT:-/dev/null}"
    exit 0
  fi
  echo "::warning::Push to $target failed (attempt $attempt); main moved, starting over."
  sleep $((attempt * 10))
done
echo "::error::Gave up after three attempts; nothing was written."
exit 1
