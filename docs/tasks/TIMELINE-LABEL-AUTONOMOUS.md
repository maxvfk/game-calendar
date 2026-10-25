# Timeline labels — autonomous naming (plan and milestones)

**Status:** M0 done (operator, 2026-10-25). M3 probe workflow added; production automation
is **not** implemented and stays off (`vars.TIMELINE_LABELS_AUTO = off`).

## Chosen architecture

GitHub Actions + Claude Code CLI headless on the operator's Claude subscription token
(`CLAUDE_CODE_OAUTH_TOKEN`, from `claude setup-token`; Pro plan, valid one year, model
requests only). One model call per non-empty run, no tools (`--tools ""`), output constrained
by `scripts/timeline-label-agent/decisions.schema.json`, fixed system prompt
`scripts/timeline-label-agent/system-prompt.md`. The input is built inside the job by
`build:feed` from the same commit, so no URL is fetched. An empty queue makes no model call.

Writes are deterministic and separate from the model: a future `accept` job without the
Claude secret validates every decision, records it in `data/presentation/timeline-labels.v1.json`,
commits to `main` with `GITHUB_TOKEN` and dispatches `ci.yml` (the existing `refresh.yml`
pattern). No PR, auto-merge, PAT, GitHub App, server or database.

Rejected: Cowork/Desktop scheduled tasks (need the PC on); cloud scheduled tasks (research
preview, full agentic session per run, auto-mode stalls); PR + auto-merge (PRs opened with
`GITHUB_TOKEN` do not trigger CI).

## Safeguards (including the 2026-10-25 external review)

1. **Re-check on fresh `main` before writing.** Not a plain rebase: fetch latest `main`, rebuild
   the feed, re-validate every accepted decision (event exists, same fingerprint, still
   undecided, label guards pass), rebuild the registry deterministically, rerun
   typecheck/test/build and `labelDiagnostics`, then push fast-forward only. Retry at most
   three times, then stop without writing.
2. **Guards that do not over-reject.** Novel-word guard targets name-like tokens (capitalized
   words, numbers) missing from the event's own input; a Git-reviewed vocabulary covers generic
   words (for example `invitation`). All 8 labels from PR #87 must pass unchanged. Negative tests:
   invented character, reward, date/number/certainty, lost season/phase/cycle, URL/markup,
   injected instructions, duplicate overlapping labels. A guard hit becomes `needs_research`
   with `auto-guard: …; proposed "…"`, never a published label.
3. **Off until proven.** Enable only after: the probe works with the subscription token in
   Actions and returns valid JSON for the real queue; the accept report is reasonable; a full
   rehearsal writes to `timeline-labels/rehearsal` (not `main`) and its dispatched CI is green
   (Pages deploys only from `main`); and the operator explicitly says to enable. Otherwise it
   stays off.

Other safeguards: per-decision partial acceptance; model job read-only and write job without the
Claude secret; `concurrency: timeline-labels`; kill switch `vars.TIMELINE_LABELS_AUTO`; rollback
by reverting the registry-only commit or overriding one decision (automation never rewrites a
decided event).

## Milestones

| | Scope | Production effect |
| --- | --- | --- |
| M0 | Operator: token secret + `TIMELINE_LABELS_AUTO=off` — **done** | None |
| M1 | Event Detail shows the AI title with "Original title" below | UI |
| M2 | Deterministic `accept` with fresh-main re-check, guards and tests | None |
| M3 | `timeline-labels-probe.yml`: manual, read-only, one model call, L1 validator report | None |
| M3.5 | Rehearsal writes to `timeline-labels/rehearsal` + dispatched CI (no deploy) | None |
| M4 | Scheduled Tue/Fri run writing to `main`, only after M3.5 and explicit operator approval | Yes |

## Running the M3 probe

GitHub → Actions → **Timeline labels probe (read-only)** → Run workflow. The run summary lists
the model decisions, L1 validator errors/warnings and token usage; the `probe/` artifact keeps
the input, the raw CLI result, proposals and validation for 14 days. Nothing is written.
