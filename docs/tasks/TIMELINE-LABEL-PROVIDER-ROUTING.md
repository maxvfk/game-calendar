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
(chat/completions), model deepseek-flash, thinking disabled, JSON output.
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
