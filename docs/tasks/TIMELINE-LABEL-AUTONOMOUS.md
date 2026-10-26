# Timeline labels — autonomous naming (plan and milestones)

**Status:** M0 done (operator, 2026-10-25). M3 probe ran successfully on 2026-10-26 (below).
M1 done (Event Detail shows the label). M2 done: deterministic `accept`, dry-run in the probe.
M3.5 done (rehearsal run 40346051669, CI green on the rehearsal branch). M4 done: scheduled
runs write to `main`, but only while `vars.TIMELINE_LABELS_AUTO` is `on`; it is `off` until the
operator switches it (see "Enabling and operating").

## Chosen architecture

GitHub Actions + Claude Code CLI headless on the operator's Claude subscription token
(`CLAUDE_CODE_OAUTH_TOKEN`, from `claude setup-token`; Pro plan, valid one year, model
requests only). One model call per non-empty run, no tools (`--tools ""`), output constrained
by `scripts/timeline-label-agent/decisions.schema.json`, fixed system prompt
`scripts/timeline-label-agent/system-prompt.md`. The input is built inside the job by
`build:feed` from the same commit, so no URL is fetched. An empty queue makes no model call.

Writes are deterministic and separate from the model: an `accept` job (M3.5/M4) without the
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
   with `auto-guard: …; proposed "…"`, never a published label. As built in M2, a short list of
   claim words (for example "guaranteed", "rerun", "ignore") is also checked in lowercase.
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
decided event; it replaces only a record whose fingerprint no longer matches, because that event
is back in the queue).

## Milestones

| | Scope | Production effect |
| --- | --- | --- |
| M0 | Operator: token secret + `TIMELINE_LABELS_AUTO=off` — **done** | None |
| M1 | Event Detail shows the AI title with "Original title" below; leave room for a later "Original summary" pair — **done** | UI |
| M2 | Deterministic `accept` with fresh-main re-check, guards and tests — **done**; the git fetch/retry/push loop belongs to M3.5 | None |
| M3 | `timeline-labels-probe.yml`: manual, read-only, one model call, L1 validator report — **done** | None |
| M3.5 | Rehearsal writes to `timeline-labels/rehearsal` + dispatched CI (no deploy) — **done** | None |
| M4 | Scheduled Tue/Sat 07:23 Moscow run writing to `main` behind the kill switch — **done**, approved by the operator 2026-10-26 | Yes, once switched on |

## Running the M3 probe

GitHub → Actions → **Timeline labels probe (read-only)** → Run workflow. The run summary lists
the model decisions, L1 validator errors/warnings, token usage and the M2 accept dry run
(accepted / guarded / rejected); the `probe/` artifact keeps the input, the raw CLI result,
proposals, validation, `accept-report.json` and `registry-after.json` for 14 days. Nothing is
written to the repository.

## M2: what was built

- `src/presentation/timeline-label-accept.ts`: `acceptTimelineProposals(proposals, feed, registry,
  vocabulary, asOf)` and `labelGuard`. Pure and deterministic; the caller passes the freshest
  feed and registry, which is the fresh-main re-check. Rules are in `data/presentation/README.md`.
- `labelVocabulary` in the preferences file (reviewed in Git; today only `invitation`). The
  preferences also tell the model that other words make a label `needs_research`.
- `scripts/timeline-labels.ts accept` writes only the output paths it is given.
- `scripts/timeline-label-agent/run-model.sh`: the single model call, now shared by the probe
  and later jobs. It strips whitespace from the token, warns about it and about an unexpected
  token shape, and never prints the token.
- Measured before choosing the guard: on the 8 labels from PR #87 and the 5 from the probe, the
  only word missing from an event's own text was "Invitation" (the summary says "Invite"), and
  "Character" needed the plural rule. All 13 pass; the 25 probe decisions all accept.
- M3.5 adds the git side: fetch `main`, rebuild the feed, run `accept`, rerun
  typecheck/test/build, push fast-forward to the rehearsal branch, retry at most three times.

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

Enable criterion 1 (safeguard 3) is met.

## Probe after M2 (run 40344178775, 2026-10-26, `main` 599a361)

- Token script path works; no whitespace or token-shape warning, so the secret is clean.
- Sonnet, 2 turns, 34 s, about 16.8k tokens (11.6k cache write, 1.3k cache read, 3.9k output).
- Same split as before: 5 `label`, 14 `keep_original`, 6 `needs_research`; validator 0 errors.
- Accept dry run: 25 accepted, 0 guarded, 0 rejected.
- Two labels were worded differently from the first probe ("Choice of Limited Outfits for the
  Angels of Delusion", "Umbra of Frigid Eventide Weapon Rate-Up"). Both are supported by the
  summary. Once recorded, a decision does not change until the event does.

The operator found the report reasonable: enable criterion 2 is met.

## Usage estimate (Claude Pro subscription)

Measured on two full batches: about 4k tokens fixed (system prompt, preferences, CLI) plus about
500 tokens per event (350 in, 150 out). A full batch of 25 is about 17k tokens; the CLI's
API-equivalent estimate is $0.09. Nothing is billed: it counts toward the plan's usage limits,
shared with claude.ai and Claude Code, roughly like one medium chat request with an attachment.

- Backlog today: 48 eligible events, so two runs, about 33k tokens once.
- After that only new or changed events are queued. At a rough 10 to 25 new events a week and two
  runs a week (Tue/Sat), that is about 15k to 25k tokens a week, under $1 a month API-equivalent.
- An empty queue makes no model call. GitHub Actions minutes are free for this public repository.
- The write job, tests and CI use no Claude usage.

## Running the M3.5 rehearsal

GitHub → Actions → **Timeline labels** → Run workflow (model `sonnet`). The `propose` job builds
the queue from `main` and asks the model once (read-only, the only job with the token). The
`record` job, without the token, runs `scripts/timeline-label-agent/record.sh`: fresh `main`,
`build:feed`, `accept`, typecheck/test/build, commit only the registry, force-push to
`timeline-labels/rehearsal` (rebuilt from `main` every run), then dispatch `ci.yml` on that
branch and wait for it. Pages deploys only from `main`, so the site is untouched. The summary
lists every outcome; artifacts keep the proposals, the accept report and the new registry.

Criterion 3 is met when one rehearsal records decisions and its dispatched CI is green. The
rehearsal branch is disposable; it is never merged.

**Rehearsal result (run 40346051669, 2026-10-26):** 25 accepted, 0 guarded, 0 rejected; one
registry-only commit on `timeline-labels/rehearsal` (164 added lines, no existing record
changed); dispatched CI 40346322560 green, Pages skipped. Registry on the branch: 50 decisions,
12 labels (8 reviewed + Rossweisse, Sig, Umbra of Frigid Eventide weapon rate-up, Yvonne
RE-Factor Headhunting #1). Criterion 3 is met.

## Enabling and operating (M4)

- **Schedule:** Tue and Sat 07:23 Moscow (04:23 UTC). Morning, so a usage window spent in the
  evening has reset; Saturday is after the weekly reset (Sat 04:00). GitHub can delay or drop a
  scheduled run; the next one picks up the same queue.
- **Switch on:** GitHub → Settings → Secrets and variables → Actions → Variables →
  `TIMELINE_LABELS_AUTO` = `on`. Switch off the same way (`off`); scheduled runs then skip.
  A manual run can also target `main` (input `target: main`), but only while the switch is `on`.
- **Each run:** model call (read-only job), then `record.sh` on fresh `main`: accept, checks,
  fast-forward push of a registry-only commit, then CI on that commit, which deploys Pages.
- **Usage limit:** if the subscription limit is reached or the service is busy, the run is
  marked skipped with a notice, nothing is written, and the next run retries the same events.
- **Token renewal:** the setup token was created on 2026-10-26 and lasts one year. Renew it
  before **2027-10-26**: `claude setup-token`, then save it as the `CLAUDE_CODE_OAUTH_TOKEN`
  secret. A rejected token fails the run with that hint.
- **Rollback:** revert the registry-only commit, or override one decision in the registry by
  hand. Each commit links its run.
- **Review:** guarded proposals are `needs_research` records whose reason starts with
  `auto-guard:`; the operator can turn one into a label by hand.
