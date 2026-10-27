# E2a.1 — Controlled production cutover of Timeline editorial decisions v1 → v2

**Priority:** next Editorial milestone after ZZZ source recovery.
**Status:** IMPLEMENTATION PREPARED / NOT LIVE; evidence/runbook: `docs/evidence/timeline-v2-controlled-cutover.md`. **PRODUCTION CUTOVER NOT AUTHORIZED BY THIS TASK OR BY PR CREATION**.
**Scope:** one versioned Timeline registry migration and single-writer M4 cutover. No `displaySummary`, unified model calls, or evidence-triggered production requeue.

## Baseline and sources of truth

Start from then-current `main`, not a frozen commit. Read:

- `AGENTS.md` and `docs/IMPLEMENTATION-STATUS.md`.
- `docs/research/event-context-editorial-technical-design.md`, especially §§4–6.
- `docs/evidence/editorial-provenance-e2a.md` and PR #104 (E2a).
- `data/presentation/README.md`, `data/presentation/timeline-labels.v1.json`, `data/presentation/timeline-origin-migration.v1.json`.
- `src/editorial/timeline-decisions-v2.ts`, `src/editorial/provenance-migration.ts`, `scripts/editorial-provenance*.ts`.
- `src/presentation/timeline-labels.ts`, `src/presentation/timeline-label-accept.ts`, `scripts/timeline-labels.ts`, `scripts/build-feed.ts`, `scripts/timeline-label-agent/record.sh`, `.github/workflows/timeline-labels.yml`, and relevant tests.

The E2a historical rehearsal classified 50 decisions at its **then-current** boundary: 25 `operator_approved`, 25 `automated`, 0 `legacy_unknown`, 12 `label`. This is **not** a promise about the live record count at cutover. The immutable historical `timeline-origin-migration.v1.json` has `purpose: timeline-v1-to-v2-rehearsal-only`; **do not reuse or silently repurpose it as live production authority**.

At task creation, production `build:feed`, queue, acceptance, writer and workflow use `timeline-labels.v1.json`; v2 code only supports an offline rehearsal. Confirm this against fresh main and stop with a reconciliation report if another PR already completed the cutover.

## Intended end state

1. One strictly validated, persisted **v2** Timeline decisions registry with durable `origin: operator_approved | automated | legacy_unknown`; non-label records have explicit nullable `evidenceHashAtDecision`. Do not accept origin or evidence metadata supplied by model proposals. Only trusted deterministic record code assigns `automated`.
2. **One** active reader/queue/accept/writer path and **one** M4 schedule. Preserve the existing `timeline-semantic-sha256-v1` fingerprint, L1 proposal/input contract, editorial preferences, 25-event batch semantics, per-decision guards, explicit provenance, fresh-main checks, and `TIMELINE_LABELS_AUTO` kill switch.
3. Preserve every current `label`, `keep_original`, `needs_research`, `timelineTitle`, reason, event ID, approved identity and protected human choices without reinterpretation. `legacy_unknown` stays conservatively protected.
4. No user-visible change under a fixed feed/source snapshot: same event IDs, dates, summaries, published Timeline titles, queue and public event assets (byte-identical when inputs/clock are fixed), unless a difference is explicitly justified by migration format alone in internal artifacts. Old cached public feeds remain usable.
5. Evidence-triggered eligibility helper remains **unwired**: no automatic evidence-only requeue, no new AI decisions merely because `evidenceHashAtDecision` was initialized to `null`.
6. A rehearsed, documented rollback that preserves **latest** v2 decisions (including post-cutover writes) and archives their origin/evidence metadata before a lossless projection to v1; never restore a frozen old v1 file over new decisions.

## Gate 0 — verify live state, inventory, and operator controls

- Check fresh `main`, open/merged relevant PRs, active workflows, Actions variable state, latest Timeline bot writes and whether there are scheduled/manual M4 jobs in progress or queued. Do not infer live switch state from repository YAML alone. If Actions variable or running-job access cannot be proven, mark the relevant live gate **BLOCKED**, not passed.
- Audit **all** registry-mutating commits from initial creation through the actual cutover boundary with full first-parent Git history, including writes after E2a. Attribute by exact writer identity **and** diff shape, subject, eventId/fingerprint/**content**, replacement lineage and recorded hashes. Anything ambiguous is `legacy_unknown` unless explicitly reviewed; do not promote it to `operator_approved`.
- Create a reviewed, strictly versioned **cutover-specific** manifest/ledger anchored to the actual live registry SHA and commit, separate from the immutable E2a historical rehearsal. Validate records/counts and protect unknown origins. Recompute from fresh main if registry history changes, even if registry bytes later happen to match.
- Prepare a runbook identifying exact operator-controlled freeze, GO, release, rollback and failure procedures. Do not change repository secrets, public deployment, existing scheduled variables or production registry as a side effect of this preparatory gate.

## Gate 1 — implementation and offline rehearsal (may proceed without production GO)

- Implement the narrow v2 schema reader, presentation/queue projection, deterministic acceptance and record/write path. Reuse v1 proposal validation and existing guards; introduce only the trusted v2 metadata assignment necessary for new decisions.
- Eliminate competing active v1/v2 writers; retain a single existing workflow and schedule. Verify a stale v1-format job/proposal cannot write after the switch; document the limit of any in-repo guard against a **previously running old workflow**. The remote writer quiescence gate is mandatory, not replaceable by local code.
- Keep a validated historical v1 snapshot if useful for audit, but never have `build:feed` or record.sh silently select an obsolete v1 file after activation. Fail closed on invalid/mismatched v2 storage; no fallback that discards metadata or rolls back without operator intent.
- Rehearse with complete Git history and fixed clock/snapshot. Verify v1→v2→v1 byte-identical rollback, preserved all decisions and all labels, idempotence, no changes to public feed/queue/input/review bytes, normal fresh-proposal recording under v2, deterministic replay, and no automatic evidence requeue.
- Prove freeze/race handling in a disposable repository: changed remote main after inventory, bot write between inventory and commit, stale v1-runner write, queued/in-flight job, failed/cancelled job, mismatched manifest/hash, unauthorized/unknown origin, invalid evidence hash, concurrent v2 writers, retry/idempotence, and v2→v1 rollback **after a newly recorded v2 decision**.
- Keep `propose` read-only with the Claude token and `record` write-only without that token. No second scheduler, no new model/provider. Rehearsal must not push main or deploy public Pages.

## Gate 2 — EXPLICIT OPERATOR GO before live cutover

**STOP at a prepared PR + green CI + reviewed rehearsal unless the operator separately authorizes a specific production cutover window and freeze.** A request to draft this task or a passing rehearsal is not that GO.

When GO is obtained:
1. Set/verify admission control that prevents **new** old-contract `main` writers; drain or cancel **all** queued and in-flight M4 `propose`/`record` jobs, including manual runs. The existing `TIMELINE_LABELS_AUTO=off` check by itself cannot revoke an already-started job. Establish a real remote quiescence proof; if unavailable, abort cutover.
2. Fetch the latest `main` with full history; compare exact remote head, registry SHA, complete new write history and origin ledger. Recompute/review manifest and v2 registry if anything changed. No copying a stale E2a preview.
3. Make one atomic, guarded reader/queue/accept/writer+registry transition under exclusive writer control. Require expected-base/fast-forward checks and fail closed on any concurrent update; do not allow dual v1/v2 publication paths.
4. Complete PR review/CI and authorized merge; confirm post-merge CI/Pages and that the normal M4 write path now targets only v2. Exercise a bounded, non-destructive rehearsal/record validation without changing already approved labels. Re-enable normal schedule only after verified success and operator approval for release.
5. Archive the final manifest, hashes, run IDs, operator GO, freeze/unfreeze and outcome. If any invariant fails, stop writes and execute only the documented controlled rollback, not an unconditional reset.

If the operator GO cannot be obtained in this Work, **deliver a ready-for-cutover PR/report and STOP**, explicitly stating what remains unverified or unpublished. Never claim live v2 simply because code exists on a branch.

## Acceptance and regression gates

- `bun install --frozen-lockfile`, `bun run typecheck`, `bun test`, `bun run build`; project CI including PG17 as applicable.
- Exact count/content/origin validation against **fresh** registry; stable `eventId()`, date precision, source provenance, canonical `summary`, existing `timelineTitle` and all 12 historically approved labels (plus any newer valid ones).
- Same frozen-input public `events.v1.json`, Timeline queue, agent input, review JSON and Event Detail behavior; browser smoke for label and canonical original-title fallback. No required client-side migration.
- Test readonly/offline/empty-queue/429/529 handling and existing `TIMELINE_LABELS_AUTO` behavior; no generated AI text as source evidence, no forged `operator_approved`.
- Post-cutover only: proven live workflow path, CI/Pages health, explicit single writer and accurate status in `docs/IMPLEMENTATION-STATUS.md`. If not cut over, status must be `PREPARED / NOT LIVE`.
- A reproducible rollback drill preserving a newly created v2 decision; archived origin/evidence data must survive even though v1 cannot represent it.

## Explicit exclusions

- No `displaySummary`, editorial summary registry/UI, Event Detail redesign, E2b/E3/E4 implementation or new unified AI prompt.
- No activation of evidence-triggered requeue or reinterpretation of protected existing decisions.
- No changes to ZZZ/other source-ingestion recovery, recurring endgame clocks, Account/User Sync, Supabase, backup, daily-reset or user data.
- No incidental changes to the existing M4 cadence/model/budget, source evidence/public exposure, fingerprints or event IDs.

## Deliverables and STOP condition

- Short-lived branch, minimal commits, implementation PR with green CI and clear diff. An unapproved live cutover must remain unmerged/not activated.
- A durable cutover-specific reviewed provenance manifest, exact-count report and runbook with quiescence, release and rollback gates; tests and fixed-input before/after hashes.
- Updated `docs/IMPLEMENTATION-STATUS.md` with **truthful** PREPARED vs LIVE status, CI/Pages evidence and one **Next concrete step**.
- Final summary: current baseline, decisions by origin, all guards/checks, PR/run links, operator actions needed, unresolved risks, and cutover/rollback status.

**STOP after E2a.1.** E2b (`displaySummary` contract/UI), E3 shadow pilot and E4 AI-summary enablement are independent later milestones.