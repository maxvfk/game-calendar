# DAILY-PASSES — lean design gate and implementation roadmap

**Status (2026-11-05): planning only.** The product requirements are approved, but
PASS-0 design review and the operator's explicit implementation GO are pending.
This document is **not** authorization to run migrations, change production
Supabase, start PASS-1, or merge anything. Keep C1a.1 PR #161 untouched and do
not start C1b, CZN changes, Timeline labels or source-ingestion work.

**Source of truth:** CURRENT `main` and actual code → `AGENTS.md` →
`docs/DEVELOPMENT-WORKFLOW.md` → `docs/IMPLEMENTATION-STATUS.md` → this task
and current relevant code/tests. Previous design discussion is rationale,
not a mandate to implement its proposed schema.

## User contract (fixed)

- Personal paid daily pass for each enabled game, e.g. Genshin Welkin.
- Show **remaining game-days**, distinguishing active and expired.
- Manually set/correct duration or expiration; one-tap `+30`.
- Active `+30` continues from the existing expiry; expired `+30` begins
  on the current game server-day, not the later network-delivery date.
- Offer **Undo**, not a mandatory confirmation dialog. Undo targets the
  actual user action, not an unrelated later change.
- Small `Daily passes` block next to, but independent from, `Today's dailies`;
  details allow management for all enabled games. Mobile/desktop responsive.
- Respect the selected game region and each game's server-day reset policy.
  No naive `milliseconds / 86400000` countdown.
- Profile-scoped durable persistence; guest use, Account Sync, offline,
  switching accounts/profiles, user import/export and database backup.
- Expiration and daily reward-claim checkmarks are **different concepts**:
  never mutate or reuse daily marks to represent paid passes.
- Do not alter existing daily dayKeys, CZN epoch/policy, event IDs, historic
  marks, current event feed, provenance, or other milestones.

## Verified constraints from main at the design checkpoint

- `src/shared/sync.ts` uses strict `PreferenceKey` validation and per-key LWW;
  `localSync.ts` compacts outstanding changes by logical key. A plain expiry
  preference can silently lose a concurrent independent extension.
- PostgreSQL `sync_valid_preference` and `apply_profile_mutations` enforce the
  existing preference protocol; arbitrary JSON is not automatically accepted.
- `remote.ts` enumerates existing tables. Guest/account profiles use scoped
  `profileKeys` and durable outbox mechanics.
- `scripts/account-backup/` uses a strict, hash-bound, seven-table v1 contract;
  adding a table affects schema validation, backup role permissions and restore.
- `dayKey`/`dayStartMs`/`nextResetMs` provide existing regional clocks and
  game overrides; CZN has an independent **18:00 UTC** day policy. Treat this
  as an adapter requirement, not a reason to change stored day keys.
- Some games use fallback reset clocks where evidence is incomplete. Do not
  present fallback precision as independently confirmed server evidence.
- Current browser export is `gacha-tracker-export` v1; the existing importer
  checks `format` but does not reject an unknown `version`. Simply changing
  `version: 2` under the same format risks older clients accepting and silently
  dropping paid-pass data. Design a fail-closed cross-version format/transport.

## PASS-0 — minimal contract, independent read-only design review

**First and mandatory high-risk gate. No production implementation.**

Evaluate the *smallest* viable data model, with a concrete failure-mode matrix
and discriminative negative tests, starting from CURRENT main:

1. **Narrow pass-state register + idempotent extension receipts**, with atomic
   server updates, stable operation IDs, and conditional/manual correction.
2. **Small per-pass operation journal / deterministic reducer** (not a generic
   event-sourcing platform), with an explicit upper-bound / compaction policy
   only if actually needed.
3. **Strictly typed preference** only if it can prove preservation of *all*
   concurrent independent `+30` actions, offline retries and Undo across old
   clients and backup boundaries. Ordinary per-key LWW is insufficient.
4. Another smaller option only if current code proves it simpler and safer.

No model, new table count, RPC name, append-only log, global CAS mechanism or
backup format version is predetermined by this task. Avoid generic event
sourcing, a second sync engine, CZN-style cutover machinery and speculative
refactors. A specialized paid-pass protocol is acceptable if it minimizes
changes to existing sync and avoids silent data loss.

**Non-negotiable semantics to establish and test:**

- Two *distinct* `+30` actions, including simultaneous offline actions on two
  devices, both contribute 30 days; retransmission of the **same** action ID
  contributes **zero** additional days. A duplicate click must have defined
  UX semantics rather than accidental transport duplication.
- Preserve operation identity through retries, unknown ACKs, refresh, sign-out
  and reconnect. Never discard unacknowledged paid-pass writes.
- Undo is bound to its original action ID. Establish precise behavior before
  ACK, after ACK, after later extensions and when another client is offline;
  never silently undo an unrelated user's newer action.
- Manual correction is an *authoritative* intentional change, but must not
  silently erase concurrent extensions. Define compare-and-set/revision
  semantics and an explicit recoverable conflict/confirmation path.
- Define ordering when two offline extensions were created on different
  server-days, including the expired case; replay must be deterministic and
  independent of network arrival order. Record the action game-day/region if
  needed and handle clock skew explicitly.
- Treat expiration as a **server-day boundary**, not a UTC-duration clock.
  Specify inclusive/exclusive convention, month/year/leap-day boundaries,
  region switching, game-specific clocks, and CZN's independent policy.
- Prefer an identity preserving `(profile, game, region)` so a region change
  cannot silently reinterpret or destroy a pass; validate this against UX.
- Every online write checks authenticated profile ownership; offline guest
  storage cannot leak into a different account/profile.
- Old clients continue syncing existing data or safely refuse the new protocol;
  they must not corrupt paid passes. Legacy user exports and S6a backup v1
  remain readable *only with explicitly defined compatible semantics*.
- No backup omission: new personal data must be covered by versioned
  backup and restore; old backup tooling must fail closed on schema drift.
  A legacy snapshot must never be treated as a complete replacement of a
  newer schema unless the migration plan explicitly preserves new data.

**Deliverable:** one short design note / task amendment with the recommended
minimal model, comparison and rejected options, state transitions, failure
matrix, PG17 tests, old-client/backup migration plan, rollback and rollout
order, plus independently reviewed acceptance invariants. Under
`docs/DEVELOPMENT-WORKFLOW.md`, obtain **independent read-only design
review** before requesting PASS-1 implementation. Only genuine unresolved
product decisions go back to the operator.

## Roadmap after PASS-0 acceptance

### PASS-1A — minimal domain/DB/backup contract

Implement the approved bounded model only: pure server-day arithmetic,
validation, database schema/RPC and profile ownership/RLS, operation dedup,
manual-correction conflict handling, plus strictly versioned S6a backup,
restore and migration checks. Do not couple to existing event/daily protocols
or alter production. Scope and file count come from PASS-0, not a required
append-only-journal architecture.

PG17 tests must include concurrent independent extensions, exact replay,
stale correction, Undo after ACK, unexpected delivery order, restricted-role
and cross-profile access, full v2 data coverage and safe legacy v1 restore.

### PASS-1B — offline/profile/Sync/import/export

Extend the approved minimal contract to profile-scoped local storage,
durable retry/outbox, reconnect reconciliation, first login, account/profile
switching, user export/import compatibility and mixed client behavior.
No paid-pass action may be compacted away by generic LWW storage.

Use a new fail-closed export format or equally proven version negotiation:
old importers must not interpret new paid-pass exports as ordinary v1 files
while silently dropping the pass information. Test no data loss, no duplicate
`+30`, crash/unknown ACK, rollback and same-file re-import.

### PASS-2 — compact UI and manual smoke

Add the Daily passes surface near Today's dailies, a detail management screen
for all enabled games, manual correction, `+30` and action-specific Undo,
mobile/desktop layout and clear offline/conflict messaging. Distinguish
expiry from daily reward collection. Browser tests cover reset edges,
regions, profile/account switch and offline/reconnect.

After deployment, prepare a short Android/PC manual smoke checklist, including
a real server-reset boundary when practical.

## Gates and boundaries

- Each implementation stage gets its own *short Codex session*, fresh-main
  branch, small PR, required four `AGENTS.md` commands, relevant PG17,
  exact-head CI and independent review per risk-gated workflow.
- After substantial implementation, update
  `docs/IMPLEMENTATION-STATUS.md` with real tests, exact revision and next step.
- Do **not** apply Supabase production migrations, update private backup pins,
  deploy or activate writes until migration, backup/recovery, old-client and
  rollback tests are reviewed and the operator separately authorizes rollout.
  Do not request credentials for design/local tests.
- If PASS-0 proves the full concurrency guarantee incompatible with a truly
  small implementation, report the narrowest safe alternative and trade-off;
  **do not weaken** the guaranteed behavior or build a general platform
  without another explicit product decision.
- No changes to C1a.1 #161, C1b, source ingestion, Timeline labels, CZN
  cutover or historic user data.

**Next concrete step:** submit this scoped contract to an independent
read-only PASS-0 design reviewer; do not start PASS-1A before acceptance.
