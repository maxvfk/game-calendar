# CZN Daily Reset — safe 18:00 UTC forward-only cutover

**Status (2026-10-23 continuation): local protocol/client/backup candidate implemented but disabled. Hosted compatibility/production release gates remain open.**
The operator superseded Gate A item 4's docs-only stop for missing staging: continue local implementation/tests, never production rollout. See [candidate runbook](../../supabase/czn-cutover/README.md).
See [Gate A checkpoint and reproducible proof](CZN-DAILY-RESET-GATE-A-CHECKPOINT.md) for the privileged hosted migration/S6a prerequisites, release order and rollback contract.
**Product decisions accepted 2026-10-23:** UTC opening-date day labels; incompatible old PWA clients must not write CZN daily marks after cutover. No new manual per-device update workflow is requested from the operator.

## Sources and bounded outcome

Start from CURRENT main, [AGENTS.md](../../AGENTS.md), [IMPLEMENTATION-STATUS](../IMPLEMENTATION-STATUS.md), the verified [CZN clock evidence](../research/daily-reset-clocks/czn.md), and the completed [compatibility investigation](CZN-DAILY-RESET-FORWARD-ONLY-DESIGN.md). Treat the reproduced Sync collisions, silent wire metadata stripping and ignored v1 import version as known failure modes, not hypotheses to rediscover. Read relevant current source, SQL migrations, tests and S6a [backup/recovery contract](../ACCOUNT-BACKUP.md); preserve concurrent work.

**User-visible goal:** standing CZN daily reset/countdown and daily checklist roll at **18:00:00 UTC in every app Region**, using the UTC **opening date** of each game day as its stored label. This is *not* the calendar UTC date containing every instant in that game day. Example:

| UTC instant | New CZN stored dayKey | Next reset |
| --- | --- | --- |
| 2026-10-22 17:59:59.999Z | 2026-10-21 | 2026-10-22 18:00:00Z |
| 2026-10-22 18:00:00.000Z | 2026-10-22 | 2026-10-23 18:00:00Z |
| 2026-10-22 18:00:00.001Z | 2026-10-22 | 2026-10-23 18:00:00Z |

A newly cut-over CZN daily claim is unambiguously distinguished from every earlier legacy interpretation. The 18:00 instant is fixed, including DST transitions; changing app Region must not relabel a post-cutover CZN day.

**Out of scope:** CZN banners/precise event endpoints, region-scoped event clock semantics, other games' daily rules, NTE research, source ingestion/LKG/health, new Sync features, S6b, Astra audit and unrelated UI refactors. All published event IDs, sources, provenance and date precision stay invariant. Keep the standing subject identity dailies:czn and existing event subject identities; add a separate *policy namespace* for new daily registers, not destructive reminting of old marks.

## Approved product decisions and required behavior

1. **Labels:** fixed 18:00Z-to-18:00Z interval, named by the UTC date **at its opening**. Prefer an explicit CZN daily-only clock policy, not a fake server offset nor changes to RESET_HOUR_LOCAL / REGION_RESET_UTC_OFFSET. Other event/timeline day-precision clocks and latestBoundaryMs are unchanged.
2. **Old clients:** after a profile's *server-confirmed* CZN policy cutover, a cached/older PWA cannot write CZN daily rows under the old wire interpretation. Enforce this at the authenticated server RPC/database boundary; a frontend-only check or localStorage marker is insufficient. Show a clear update-required/read-only state only for affected CZN daily writes, allowing other game data and Sync to continue safely. No assumption that PWA cache refreshes instantly.
3. **Pending changes:** preserve unsent pre-cutover mutations, explicit false/tombstones and original UUID/version metadata. Never report a rejected or held mutation as acknowledged/synced. Define a user-visible, reversible resolution/export path for ambiguous legacy offline changes, without silently converting them into post-cutover completions.
4. **Legacy history:** preserve historical guest/account daily logs and cloud rows **verbatim**, including tombstones, incomplete rows, and old exports. Neither changedAt nor an edit timestamp recovers the original completion instant or Region. Render legacy history honestly and separately from post-cutover streaks; do not fabricate or silently stitch a continuous streak across incompatible policies.
5. **Import:** legacy v1 exports remain importable into a legacy namespace. A new policy-aware export/import must use a **distinct format discriminator**, not merely a bumped version ignored by existing importers. Repeated imports/cutovers must be idempotent; old clients must not misread new exports. Guest-to-account and cloud-only/import flows must preserve the distinction.
6. **No forced data migration:** never mass-shift, duplicate, delete or rename old day labels merely to make the new calculation appear clean. Treat the cutover as a forward-only state transition; preserve recovery and rollback readability.

## Work protocol — two gated stages in one Work

### Gate A — prove a minimal compatible protocol before implementing

1. Check current main, open PRs and actual old-client code; do not rely on the older SHA in the investigation. Inspect daily.ts/time.ts/games.ts, UI callers, useDailyLog, shared/sync.ts, localSync, remote, syncEngine, storage, export/import, the service worker/update notice, Supabase schema/RPC and PGlite integration tests. Include backup-contract generation/checks and hosted deployment requirements.
2. Produce a concrete protocol/cutover contract (add a short design section/document as appropriate) defining: immutable policy ID; exact server cutover state and authority per profile; namespace and primary-key strategy; wire version negotiation; old RPC behavior; preservation of pending outbox; v1/new import/export and tombstone rules; guest/account/profiles; upgrade-required UI; release order; rollback; migration impact on S6a backups. Do not treat client feature detection as a server gate.
3. Prove via local database and real existing Sync code that old RPC requests cannot mutate **new-policy** CZN registers after cutover, while other games work. Test a queued old-client request with a later changedAt than the new claim. Include old import into a cut-over account and both distinct-key and same-key counterexamples from the predecessor investigation.
4. If the protocol requires an unsupported privileged hosted database migration, direct production access, a destructive backup-contract change, or a remaining material product decision, **stop at a docs-only design/checkpoint PR**. Document the exact missing prerequisite and the safest operator action; do not publish a clock change or improvise credentials. User approved the label and old-client policy above; do not re-ask these two decisions.

### Gate B — bounded implementation only if Gate A is proven

1. Work from freshly checked main, use a separate small branch/PR after the protocol checkpoint as useful. Implement explicit CZN-only daily policy and the narrowly necessary persistence/wire/server changes; keep unrelated clock and feed semantics untouched. Prefer small additive, reversible migrations over rewrites. All new-client reads/writes must negotiate the same policy/epoch before writing.
2. Provide a safe **server-first** release and rollback runbook: old RPC guard active before new clients can create new-policy rows; backfill or preserve relevant older data without reinterpretation; verify read-only/update prompts on cached PWA builds; never reopen old-writer acceptance on rollback. Account Sync S6a backup/recovery, logical snapshot schema and contract-generation implications must be handled explicitly. Do not replay destructive historical migrations or access production identities for synthetic tests.
3. For authenticated testing, use an isolated test account, never the operator's real profile. If the environment cannot safely perform hosted migration/preflight/isolated end-to-end test, deliver reviewed code + test evidence and **stop before enabling/deploying the new CZN policy in production**. A green repository CI does not prove hosted DB compatibility.
4. Once every production gate passes, merge minimal reviewed implementation PR(s), verify main CI/Pages, actual hosted schema/RPC and both desktop/phone-sized browser flows. Leave physical phone/PC final smoke to the operator. If any safety proof fails, roll back or keep the feature disabled and report honestly as blocked. Do not claim a completed reset correction before 18:00Z is effective in production.

## Required regression and acceptance matrix

- **Clock arithmetic:** -1ms / exact / +1ms at 18:00 UTC; strict next reset; inverse of stored labelled days; UTC month/year changes; all three Regions; before/after EU and US DST changes; standing CZN dailies only.
- **Daily UX:** today/next-reset, dailyDays exclusive last instant, dailySummary (logged, missed, remaining, doneToday), catchUpDays and streakOf; separate preserved legacy history; no phantom completion or lost false row.
- **Identity and feed:** no changes to event IDs, marks attached to published events, exact banner dates, region-scoped event clock, dayStartMs/clockFor/latestBoundaryMs, custom recurrence, feed retention, source-health/LKG and other games' daily/reset behavior.
- **State:** fresh guest; existing guest; authenticated profile; multiple profiles; legacy cloud history and tombstones; empty/new cloud; pre-cutover and post-cutover logout/login; guest-to-account; imported v1 and policy-aware exports; repeated import; rollback.
- **Cross-device:** updated desktop and old offline phone; previously cached PWA/SW; old RPC writes after cutover; stale outbox replay before and after client update; same-label collision and different-label removal; recent remote deletion; concurrent devices and retry/idempotence. No loss of pending mutations and no misleading success state.
- **Database/S6a:** local PGlite migrations (fresh and upgrade), RPC roles/grants/RLS and policy enforcement, database backup schema/contract compatibility, non-destructive recovery of both policy namespaces, safe migration sequencing, no client-side bypass.
- **Tests and delivery:** meaningful reproductions that fail against prior behavior, full bun install --frozen-lockfile / bun run typecheck / bun test / bun run build, PR and hosted CI, database-specific integration tests, deployed Pages and authenticated isolated smoke **only when** the hosted migration and protected rollout are actually ready. Record what was not executable.

## Deliverables and stop conditions

- An inspectable proof and decision record for the protocol, or a bounded precise blocker; minimal migration/code/tests only when safe.
- One or more small related PRs, no unrelated improvements. Before each, use latest main, update IMPLEMENTATION-STATUS with **actual** work, validations, deployment and operator actions.
- Final outcome must clearly say **implemented + deployed**, **implemented but not enabled**, or **design-only blocked**. Include PR/commit/CI, hosted state, pending manual migration or credentials (if any), an operator phone/PC test, rollback readiness, and one next concrete step.
- Do **not** automatically begin any other milestone. No broad rewrite of Account Sync and no claim of compatibility based solely on green unit tests.
