# Timeline labels — additive provider routing (2026-10-31)

DeepSeek Flash becomes the default transport, but the Claude Code CLI path stays intact.
The original run-model.sh, pinned Claude CLI, Sonnet/Opus selection and Claude token
mechanism are preserved. Claude authentication is currently unavailable, so live
Claude verification must wait; the routing is verified with offline tests.

## Operator setup and rollout

1. Add GitHub Actions repository secret DEEPSEEK_API_KEY using the funded DeepSeek key.
   No key is committed, and no other API provider is required.
2. Optional repository variable TIMELINE_LABEL_MODEL = deepseek-flash for scheduled runs.
   Absent variable also defaults to DeepSeek; set sonnet or opus later to revert
   to Claude after working CLAUDE_CODE_OAUTH_TOKEN is restored.
3. Run the read-only Timeline labels probe with model deepseek-flash.
   Inspect structured output, validator, and accept dry-run. This must be green
   before publishing anything.
4. Run Timeline labels manually with target rehearsal and model deepseek-flash.
   It writes only the disposable rehearsal branch and dispatches CI; no Pages deploy.
5. Only after successful probe/rehearsal, explicitly permit production with
   the existing TIMELINE_LABELS_AUTO kill switch. Schedule and main protection
   are unchanged. A manual target main still requires the switch enabled.

## Isolation and safety

The model-specific steps receive only their respective secret. Record has no
provider credentials. The DeepSeek client calls a fixed official API endpoint
(chat/completions), model deepseek-flash, JSON output, and the approved production default
thinking enabled with reasoning_effort=max (2026-10-31).
It uses the existing editorial prompt, only replacing Claude's StructuredOutput
transport rule; decisions.schema.json is provided to guide output. It rejects
partial, reordered, and malformed batches before writing proposals.json.
Strict existing L1 validator, freshness recheck, deterministic accept, registry,
fingerprints, event IDs, source provenance, CI and Pages logic remain unchanged.
One retry on transient HTTP/network or blank/incomplete model results; no
automatic cross-provider fallback. Credential errors fail closed.

## Verification state

Offline tests and GitHub hosted CI must pass before merge. Live DeepSeek probe
and rehearsal need the new Actions secret. Since Claude auth is unavailable,
do not claim its live runner passed. The existing Timeline label architecture
and future dual-output editorial work are separate milestones.

## Live probe correction (2026-10-31)

Probe [41198532156](https://github.com/maxvfk/game-calendar/actions/runs/41198532156)
failed before HTTP because the first DeepSeek adapter treated `rulesVersion` as
an event property. Canonical `buildTimelineQueue` stores `rulesVersion` once
at the root. Adapter and regression tests now use the real bundled input shape.
Re-run the read-only probe after exact-head CI; no successful live provider call
was established by the failed run.

## Manual rehearsal checkout correction (2026-10-31)

A successful [read-only DeepSeek probe #41198860725](https://github.com/maxvfk/game-calendar/actions/runs/41198860725)
confirmed 25/25 accepted decisions but **all** decisions were `keep_original`.
The first [manual rehearsal #41200052369](https://github.com/maxvfk/game-calendar/actions/runs/41200052369)
failed *before calling the API*: the `propose` job deliberately used a fresh
`main` checkout and therefore could not see branch-only `run-deepseek.ts`.
The fix maintains the canonical main feed and a main-only record job, but
checks out the selected manual workflow revision into a separate read-only
`.timeline-provider-preview` path just for the DeepSeek runner and its prompt.
Scheduled/main jobs use the normal `main` script. Repeat the rehearsal after
green exact-head CI; no production writes are authorized by a green probe.

## Completed live rehearsal (2026-10-31)

[Workflow #41206800507](https://github.com/maxvfk/game-calendar/actions/runs/41206800507)
succeeded on corrected PR commit `c3fbf699`. Read-only `propose` obtained
25 DeepSeek results; credentialless `record` rechecked freshly fetched `main`
and accepted all 25 (0 guarded, 0 rejected, 0 warnings). Only the registry was
committed to disposable `timeline-labels/rehearsal` at `6afa6bd`. Dispatched
[CI #41206891636](https://github.com/maxvfk/game-calendar/actions/runs/41206891636)
passed and Pages was skipped. `main` was not modified.

The outcome is **25 `keep_original`, no `label` or `needs_research`** in
both the successful read-only probe and this rehearsal. Many original identities
were already concise, but `Overflowing Favor` (double artifact drops) and
`Astral Imagea Park: Park Souvenir` (voucher claim) are possible missed editorial
opportunities. This is not a proven API defect; do not infer that the model is
incapable from one queue. Because `keep_original` persists until fingerprint
change, the operator should approve this distribution or run a narrow,
provider-only prompt correction/probe before enabling main writes. Transport and
automated recording are verified; **production editorial approval is pending**.

## DeepSeek thinking comparison (manual read-only probe)

The existing `Timeline labels probe (read-only)` has two new workflow_dispatch
inputs. `experiment=single` allows DeepSeek
`effort=none|low|high|max` (default `none` for backwards-compatible probe and
Claude switching; production is explicitly `max`).
`experiment=compare`, `model=deepseek-flash` makes four billed API calls,
sequentially, with the **same generated agent-input JSON and unchanged
editorialPreferences**. Each run has independent proposals, L1 validation,
dry-run acceptance and metrics in `probe/compare/{none,low,high,max}/`.
The report contains counts, token usage and duration. No reasoning content,
API key, or raw API response is saved.

Official DeepSeek Chat Completions parameters are `thinking.type=disabled`
with no `reasoning_effort` for `none`, or `thinking.type=enabled` with
`reasoning_effort=low|high|max`. These are real distinct modes; aliases like
`medium` collapse to `high` and are intentionally not exposed. Larger
bounded generation budgets and timeouts account for thinking tokens. The
read-only workflow remains manually triggered, with contents:read and no
push/commit/deployment. The scheduled/production workflow explicitly supplies
`DEEPSEEK_REASONING_EFFORT=max`; the runner also defaults to `max` if no
override is provided. The Claude path remains unchanged.

**Next step:** select the PR branch, `model=deepseek-flash`, `experiment=compare`
(default `effort` irrelevant). Review the four sets of labels *qualitatively*
against the event summaries and the accept report; a high label count alone is
not proof of superior quality. Do not enable production until the user approves
the mode/editorial behavior.

## Selected production effort (user decision, 2026-10-31)

The operator selected **DeepSeek Flash with thinking enabled,
`reasoning_effort=max`** for routine Timeline label generation, following the
read-only four-effort comparison
[run #41211418997](https://github.com/maxvfk/game-calendar/actions/runs/41211418997).
The model settings are now explicit in the scheduled/manual rehearsal workflow
and default to `max` inside the DeepSeek runner. This does not alter the
existing provider choice, no-tool JSON contract, editorial instructions,
preferences, validators, registry, data/provenance, schedule or the Claude CLI.
The probe still allows manual `none|low|high|max` comparisons.

The selection is a product decision, not a claim that max always wins:
a single sample favored two source-grounded explanatory labels at `max`;
`low` proposed more total labels, often redundant banner suffixes. We will
revisit prompt editing separately, without holding this provider milestone open.

**Rollout remains separately gated:** PR #155 stays unmerged until approved;
no automatic production writes are enabled by this change. The existing
`TIMELINE_LABELS_AUTO` kill switch must be verified off before any merge, and
must not be enabled implicitly. After exact-head CI, a fresh `max` rehearsal
on the unmerged branch is the next validation step if the operator wants a
recorded end-to-end check at the chosen mode.
