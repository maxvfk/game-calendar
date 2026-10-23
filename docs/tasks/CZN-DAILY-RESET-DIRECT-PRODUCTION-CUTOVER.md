# CZN Daily Reset — direct-production cutover readiness (no staging)

**Status (2026-10-23): NEW bounded preparation milestone; NOT authority to execute production migration, delete user rows, or enable policy.**

## Authoritative context and decisions

Start from CURRENT main, [AGENTS.md](../../AGENTS.md), [IMPLEMENTATION-STATUS](../IMPLEMENTATION-STATUS.md), [safe cutover implementation task](CZN-DAILY-RESET-SAFE-CUTOVER-IMPLEMENTATION.md), [Gate A checkpoint](CZN-DAILY-RESET-GATE-A-CHECKPOINT.md), [candidate runbook](../../supabase/czn-cutover/README.md), [S6a backup](../ACCOUNT-BACKUP.md), actual code, migrations, tests, and authorized private backup repository.

PRs #65–#67 delivered the disabled candidate: dedicated policy/epoch server SQL outside deployed migrations, fenced old standing-CZN Sync writes, CZN client journal/export/import/read-only UX, and staging-only encrypted v2 backup tooling. The deployed frontend compile flag is **false**; the production CZN clock remains unchanged. Do not repeat the completed source research or redesign a working Sync protocol.

Product decisions already approved:
1. Standing CZN reset = **18:00 UTC**, stored day label = UTC **opening-date** for the 18:00–18:00 interval, independent of Region or DST.
2. After a profile's server-confirmed cutover, incompatible old PWA clients **cannot write CZN daily marks**. Other games' Sync must continue.

New operator preference: **avoid creating a new Supabase staging project or branch**. Currently only the operator and spouse use the service; legacy CZN marks are not valuable to them, so historical CZN completion continuity may be relinquished if needed. This is permission to **design an optional simplified historical transition**, NOT permission to erase the production database now. Preserve Auth users, profiles, other-game marks, progress, preferences, custom data, and event IDs. Safest default: preserve even old CZN records but do not reinterpret them.

## Scope and stop boundary

Prepare a controlled **direct-production** release plan with strong local verification and reviewed S6a backup compatibility. With no staging, disclose the hosted Auth/PostgREST and concurrency tests that cannot be independently performed before live deployment. No staging creation, no data reset by default, no unrelated source/UI/Account milestones.

**Hard operator GO gate:** Do not apply production DDL, change active private backup workflow/pin, remove any existing user rows, or activate the CZN policy before an explicit operator approval of the exact reviewed actions, risk and rollback instructions. This Work should deliver readiness, not automatically use the user's remark about accepting data loss as blanket production authorization. Do not use production accounts to simulate destructive tests or place credentials/secrets in chat, GitHub, or PWA bundles.

## Bounded Work stages

### A. Read-only inventory and simplification decision

1. Check CURRENT main, AGENTS, relevant status/tasks, open PRs, actual current code; keep other work isolated. Check connected Supabase project identity, hosted PG version and migration/ACL/RLS/role **metadata only**. Avoid reading actual user contents.
2. Review authorized private S6a backup workflow, last encrypted backup health, immutable public revision pin, scheduling/retention, actual restore drill status and whether private changes are feasible. Do not assume a green backup Action proves restore compatibility.
3. Compare (A, default) forward-only new CZN namespace without deletion, preserving legacy rows as inert history, vs (B) targeted legacy CZN history discard **only if technically necessary**. Note that full DB reset would unnecessarily destroy auth/profiles and other-game state; even clearing server marks does not clear cached PWA/outbox. If B is proposed, describe exact narrowly scoped affected rows, dependency order, safe pre-deletion snapshot and separate deletion approval.
4. Identify residual no-staging risks, affected old v1 RPC and private backup contract, and whether a read-only cutover preflight can be implemented before permission to write anything. Verify that two accepted product decisions are preserved.

### B. Finish production readiness without production writes

1. Complete hardened production-capable but **default dry-run / fail-closed** preflight and migration/backup orchestration (do not simply strip the staging-only CLI's production-ref guard). Live production writes must require an explicit independent GO and exact project confirmation. Keep disabled server/client defaults until reviewed enablement.
2. Complete versioned S6a v2 encrypted backup, validation, guarded recovery, private backup workflow pin/schedule/retention *preparations* and v1 snapshot readability, without overwriting the canonical v1 contract or weakening grants/RLS/function hashes. Never allow an old restore to erase the monotonic cutover fence.
3. Use local PostgreSQL 17 or containerized Supabase where available, plus PGlite and browser test harness, to test migrations, real RPC/RLS/Auth boundaries, two concurrent writers locking around profile cutover, stale old-client false/tombstone replay, import/recovery and other-game mixed batches. Record any hosted-specific checks impossible without staging.
4. Prove no-legacy-history/no-data-preservation option does not allow stale devices to reintroduce old CZN marks. Keep exact source coverage, Event IDs, banner and event clocks, other games, Timeline and current runtime unchanged.
5. Use small short-lived branches and focused PRs, update implementation status/runbooks with evidence. Run all four mandatory AGENTS checks: frozen Bun install, typecheck, Bun tests, build; focused DB/backup integration and PR/main CI. If private workflow cannot be accessed or permission is missing, document the precise manual prerequisite, not invented success.

### C. Operator-ready GO/NO-GO gate; STOP before live changes

Prepare a concise, reviewable operator handoff containing:
- immutable public/private commits; exact production project ref and preflight SQL/migration diff; backup snapshot identity without secrets;
- server-first order: verified encrypted pre-migration backup and local restore drill, coordinate any in-flight private backup job, install **disabled** additive SQL with strict grants/RLS, verify database contract/PostgREST/Auth/other-game Sync, switch to compatible v2 backup/pin with no protection gap, deploy compatible PWA still disabled, then separately enable new CZN policy;
- per-step health checks, rollback/fail-closed behavior, and stop criteria. After policy activation never reopen v1 old CZN writes or erase the server epoch; rollback retains v2 policy-aware reader and queued recovery;
- what remains unproven without staging, maximum reasonable blast radius, immediate verification and explicit user acceptance of this risk;
- optional CZN-only legacy-data discard *only after separate, exact row-scope confirmation*, never full production database or Auth reset.

**Do not auto-pass GO and do not claim 18:00 UTC deployed**. If substantial readiness work cannot be finished, deliver a precise bounded blocker. One next concrete step.

### D. Future implementation only after separate explicit user GO

Following approval and safety preflight, apply reviewed additive production migration with feature disabled; verify live schema/read-only capability/RLS and compatible S6a backup; publish/enable client in safe server-first order and test isolated Auth/old-vs-new device conditions. Operator performs final real phone/PC smoke. Any destructive step requires its own narrow confirmation.

## Expected outcome

Report explicitly: **readiness prepared — awaiting production GO**, **blocked with a precise prerequisite**, or **production migration installed / cutover enabled only with separately recorded explicit approval**. Include tested vs untested gates, PRs/CI, exact user actions, no-production-write assurance, public/private backup revisions, and one next concrete step. Do not start an unrelated milestone.
