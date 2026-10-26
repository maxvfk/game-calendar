# Timeline labels — autonomous naming (plan and milestones)

**Status:** M0 done (operator, 2026-10-25). M3 probe ran successfully on 2026-10-26 (below).
M1 done (Event Detail shows the label). Production automation is **not** implemented and stays off
(`vars.TIMELINE_LABELS_AUTO = off`).

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

4. **Ground guards only in source input.** The novel-word and claim guards compare a label only
   with the event's canonical input fields (and, later, source excerpts), never with any text a
   model wrote. This keeps the guard sound when AI summaries arrive
   (`docs/research/event-context-unified-editorial-design.md`, review note 2).

Other safeguards: per-decision partial acceptance; model job read-only and write job without the
Claude secret; `concurrency: timeline-labels`; kill switch `vars.TIMELINE_LABELS_AUTO`; rollback
by reverting the registry-only commit or overriding one decision (automation never rewrites a
decided event).

## Milestones

| | Scope | Production effect |
| --- | --- | --- |
| M0 | Operator: token secret + `TIMELINE_LABELS_AUTO=off` — **done** | None |
| M1 | Event Detail shows the AI title with "Original title" below; leave room for a later "Original summary" pair — **done** | UI |
| M2 | Deterministic `accept` with fresh-main re-check, guards and tests | None |
| M3 | `timeline-labels-probe.yml`: manual, read-only, one model call, L1 validator report — **done** | None |
| M3.5 | Rehearsal writes to `timeline-labels/rehearsal` + dispatched CI (no deploy) | None |
| M4 | Scheduled Tue/Fri run writing to `main`, only after M3.5 and explicit operator approval | Yes |

## Running the M3 probe

GitHub → Actions → **Timeline labels probe (read-only)** → Run workflow. The run summary lists
the model decisions, L1 validator errors/warnings and token usage; the `probe/` artifact keeps
the input, the raw CLI result, proposals and validation for 14 days. Nothing is written.

## Probe results (run 40336557898, 2026-10-26, `main` 20e75cf)

- **Auth and runtime:** subscription token works in Actions. `claude-sonnet-5-5`, 2 turns, 36 s,
  about 16.7k tokens (12.8k prompt cache write, 3.9k output). Cost estimate $0.09, covered by
  the plan.
- **Input:** 48 eligible events, first batch of 25. The Rate-Up Rescue preference (PR #90) was
  in the input.
- **Output:** valid structured JSON, same IDs, order and fingerprints. L1 validator 0 errors; 2
  warnings from earlier Endfield season/cycle labels.
- **Decisions:** 5 `label`, 14 `keep_original`, 6 `needs_research`. Labels: Angels of Delusion
  Limited Outfit Choice; Rossweisse; Sig (the new rule applied); Umbra of Frigid Eventide Weapon
  Banner; Yvonne RE-Factor Headhunting #1. None used a word missing from the event's input.
- **Variance:** opaque events without a summary flip between `keep_original` and
  `needs_research` across runs. This is harmless: `summary` is in the fingerprint, so such an
  event returns to the queue when a summary appears.
- **Token fix:** the first failure ("Not logged in") was a secret saved with a leading space. M2
  trims the token and reports a malformed one without printing it.

Enable criterion 1 (safeguard 3) is met. The rest waits for M2 and the M3.5 rehearsal.
