# DAILY-PASSES — lean design gate and implementation roadmap

**Status (2026-11-12): PASS-1A implemented as a reviewed candidate in
[PR #171](https://github.com/maxvfk/game-calendar/pull/171), review pending.** Operator GO
covered code, SQL candidate and tests only: nothing applied in production, no
private pin change, no client or feature flag. Next: preliminary review, then an
independent final review; merge and every rollout step need separate GOs.

**Earlier status (2026-11-05): PASS-0 complete; PASS-1A awaiting implementation GO.**
The product requirements are approved. The independent read-only PASS-0 design
review is complete ([review](https://github.com/maxvfk/game-calendar/pull/167#issuecomment-6657157606), [D7/D8 addendum](https://github.com/maxvfk/game-calendar/pull/167#issuecomment-6657262999)), and the operator
has settled decisions D1–D8. The accepted contract is recorded below. This
document is still **not** authorization to run migrations, change production
Supabase, start PASS-1A, or merge anything: implementation needs the operator's
explicit GO. Do not start C1b, CZN changes, Timeline labels or source-ingestion
work as part of this task.

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
- Production scheduled backups use the CZN **v2** format
  (`game-calendar-personal-czn`, `formatVersion: 2`, `scripts/czn-cutover/backup.ts`):
  the seven base tables of `scripts/account-backup/` plus three CZN tables. Its
  schema hash (`cznContract` → `contractSql`) covers **only the listed tables**.
  A new table **without** an FK to `profiles` would be silently omitted from
  every v2 backup; **with** an FK it trips `Uncovered child table` and halts
  scheduled backups. The new table therefore needs that FK (fail closed), and
  v3 backup/restore tooling plus the private pin must be ready before the DDL.
- In production, `public.apply_profile_mutations` is the CZN wrapper around
  `calendar_sync_internal.apply_profile_mutations`. An unknown mutation `kind`
  raises and fails the **whole batch**, and old clients reject any ACK outcome
  other than `accepted`/`superseded`. Paid passes therefore use their own table
  and RPC, never a new kind inside the v1 protocol.
- `dayKey`/`dayStartMs`/`nextResetMs` provide existing regional clocks and
  game overrides; CZN has an independent **18:00 UTC** day policy. Treat this
  as an adapter requirement, not a reason to change stored day keys.
- Some games use fallback reset clocks where evidence is incomplete. Do not
  present fallback precision as independently confirmed server evidence.
- The current browser export is `game-calendar-policy-export` v1: with
  `CZN_CUTOVER_ENABLED = true` every export goes through `buildCznExport`, a
  `.strict()` envelope with `formatVersion: z.literal(1)` that wraps the v1
  `gacha-tracker-export` payload as `personal`. `parseImportData` ignores unknown
  keys, so paid-pass data placed inside `personal` would be silently dropped.
  Placed at the envelope's top level with `formatVersion: 2`, it is refused
  whole by current clients (`importCzn` throws before any merge): fail closed,
  with no new format name.
- Reuse the proven CZN patterns rather than its epoch/release machinery: an
  isolated table plus SECURITY DEFINER RPC with an explicit profile-ownership
  check; per-profile local state outside the generic outbox (`compactOutbox`
  compacts by logical key); a failure in this path never blocks v1 sync (as
  `syncProfile` already does with "hold CZN only"); the strict export envelope;
  a backup extension with `calendar_backup` SELECT + RLS read policy and
  `assertCznBackupRole`-style grant checks.

## PASS-0 — minimal contract, independent read-only design review

**Complete (2026-11-05).** The review below was the first mandatory high-risk
gate. Its findings, model comparison, failure-mode matrix (20 scenarios with
input basis) and test lists are in the [review comment](https://github.com/maxvfk/game-calendar/pull/167#issuecomment-6657157606); the accepted
outcome is recorded in [Accepted PASS-0 contract](#accepted-pass-0-contract).
The original brief is kept for traceability.

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

**Deliverable (delivered):** one short design note / task amendment with the recommended
minimal model, comparison and rejected options, state transitions, failure
matrix, PG17 tests, old-client/backup migration plan, rollback and rollout
order, plus independently reviewed acceptance invariants.

## Accepted PASS-0 contract

**Model: an immutable per-profile operation set with a pure client reducer.**
A narrow state register was rejected: it cannot be both lossless and
independent of network arrival order. Counterexample: a pass expired on day 4;
device A taps `+30` offline on day 10, device B on day 12. Arrival A→B gives
69, B→A gives 71. Preferences (per-key LWW) were rejected because two devices'
`+30` collapse into one register.

**Table `public.daily_pass_ops`** (insert-only; no UPDATE/DELETE grants; an update
trigger refuses changes):

- `profile_id uuid` FK `profiles(id) on delete cascade`; PK `(profile_id, op_id)`.
- `game text`, validated **by format**: built-in game IDs plus custom IDs
  matching `CustomGameId` (`^mygame:[a-z0-9-]{1,60}$`), so a future built-in game
  needs no SQL migration (D7).
- `region text` (`america`/`europe`/`asia`, the app region at action time).
- `kind text`: `extend` | `set` | `undo` | `resolve`.
- `action_day text`: valid `YYYY-MM-DD` game-day at the click; rejected if later
  than the server UTC date + 1 day.
- `created_at timestamptz` (client clock; tie-break and conflict detection only).
- `days int` (`extend` only, 1–180, default 30).
- `last_day text null` (`set` only: inclusive last active game-day, or null for
  "no pass").
- `target_op uuid null` (`undo`/`resolve` only).
- `based_on uuid[]` (`set` only: op IDs the device had seen for this pass, ≤ 500).
- `resolution text null` (`resolve` only: `include` | `exclude`).
- `received_at timestamptz default now()`.

RLS gives `authenticated` SELECT on its own profiles only; `calendar_backup`
gets SELECT through a read policy and cannot execute the RPC.

**RPC `public.daily_pass_apply(p_profile_id uuid, p_ops jsonb) → jsonb`:** the same
ownership check and batch limits as the existing RPC, per-kind validation,
`insert … on conflict (profile_id, op_id) do nothing`; an existing row with
different content raises (ID reuse). It returns `[{opId, outcome: "accepted"}]`,
and an exact replay is also `accepted`. There is no server pass state, no CAS and
no profile lock: union is commutative.

**Reducer** (pure shared TS), for one pass `(game, region)`:

1. Drop ops targeted by a live `undo` when the target belongs to the same pass.
   An `undo` whose target has not arrived yet applies when it does.
2. Sort the remaining `extend`/`set` by `(action_day, created_at, op_id)`.
3. Let `S` be the latest live `set`; start from `last = S ? S.last_day : null`.
4. Apply, in sort order, every live `extend` that is **not** in `S.based_on` and
   is either after `S`, or before `S` with a live `resolve(include)`:
   `last = max(last, action_day − 1) + days`.
5. Earlier-than-`S`, unseen, unresolved extends are **conflicts**: shown, not
   applied (D3). A live `set` not in the winner's `based_on` is reported as a
   concurrent correction.
6. Display: `today = passDay(now, game, region)`; active while `today ≤ last`;
   remaining = `last − today + 1` (inclusive, D1); expires at `dayStart(last + 1)`.

**Day arithmetic on day keys, never milliseconds.** `passDay` is
`dayKey(…, region, game)`, except CZN, which reuses `cznDayKey`/`cznDayStart`
(18:00 UTC, D8). Custom games take the regional default that `dayKey` already
applies to custom lanes (D7). `+N` is UTC calendar arithmetic on `YYYY-MM-DD`.
Existing `dayKey`/`daily_marks`/CZN keys are not touched. Fallback reset clocks
are labelled as such.

**Invariants (acceptance contract):**

1. Distinct ops always survive: two `+30`, including simultaneous offline ones
   on two devices, give +60. Replaying the same `op_id` adds 0.
2. Convergence: every device holding the same op set shows the same state,
   whatever the arrival order.
3. An op leaves local `pending` only after an `accepted` ACK. An unknown ACK,
   refresh, sign-out or reconnect never discards it.
4. `undo(X)` changes only X's contribution, before or after ACK, with later
   extensions present, or with X not yet arrived.
5. A manual `set` never silently erases an unseen extension: it is either
   applied (after `S`) or shown as a conflict until resolved.
6. Pass state never reuses `daily_marks`, preferences or CZN rows. Existing day
   keys, IDs and marks stay unchanged.
7. Only the owning account reads or writes a profile's ops. Guest ops never
   leave the guest profile without explicit first-login handling (D6).
8. Old clients, old exports and old backups cannot corrupt or silently drop
   pass data.
9. A pass write failure never blocks v1 sync. A v1 failure never discards pass
   ops.

**Operator decisions (2026-11-05):**

- **D1** Inclusive: the purchase day is day 1 and the remaining count includes
  today. One constant; per-game in-game confirmation is a PASS-2 smoke item.
- **D2** Standard period per game, default 30. Caps such as Genshin Welkin's
  180 days **warn, not block**.
- **D3** A manual `set` wins over an unseen *earlier* extension, which is shown
  as a conflict with one-tap include/dismiss and never silently dropped.
- **D4** The main surface shows the current region's pass; other regions'
  passes are kept and visible in details.
- **D5** A second `+30` tap within ~1 s is the same intent and is ignored.
- **D6** Guest→account first login and cross-profile import never sum. Per game:
  if the cloud has no ops, guest ops are uploaded; otherwise the user chooses
  "keep cloud / use this device's value" (as a `set`).
- **D7** The server accepts built-in and `mygame:` IDs by format; the UI starts
  with built-in games only. Custom games use the regional 04:00 default (a small
  inaccuracy is accepted). Ops of a deleted custom game are hidden, never
  deleted, and reappear if the same ID returns.
- **D8** The CZN pass boundary is 18:00 UTC, the same as the CZN daily policy.

**Rollout and rollback order:**

1. PASS-1A merged with the additive DDL as a reviewed candidate, the v3
   backup/restore tooling and PG17 tests. Nothing applied.
2. Private backup repo: the v3 pin prepared, merged but not active.
3. Operator window: take a v2 backup, apply the DDL, switch the private pin to
   v3, then run and verify a v3 backup. Between the DDL and the pin switch, v2
   backups fail closed by design.
4. PASS-1B client, with the feature flag on only after step 3 is verified.
5. Rollback: `revoke execute on daily_pass_apply` stops writes while reads,
   backups and local ops remain. Ops are data, so a reducer bug is fixed
   client-side without data migration. Dropping the additive table needs a
   separate GO after a verified v3 backup.

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

Accepted-contract additions: the FK to `profiles` is required; the v2 backup
tool fails closed on the v3 schema; restoring a v2 snapshot into the v3 schema
never deletes ops (union insert only); `game` is validated by format and
accepts `mygame:` IDs while rejecting malformed or reserved ones; an op ID reused
with different content fails without changing the row; direct writes are
denied to `authenticated` and `calendar_backup`; FK cascade on profile delete;
per-kind validation (`2026-02-30`, missing target, oversized `based_on`, `days`
out of range); batch limit. The reducer gets exhaustive permutation-invariance
tests for up to 6 ops, including the counterexample above (69 in every order).

### PASS-1B — offline/profile/Sync/import/export

Extend the approved minimal contract to profile-scoped local storage,
durable retry/outbox, reconnect reconciliation, first login, account/profile
switching, user export/import compatibility and mixed client behavior.
No paid-pass action may be compacted away by generic LWW storage.

Use a new fail-closed export format or equally proven version negotiation:
old importers must not interpret new paid-pass exports as ordinary v1 files
while silently dropping the pass information. Test no data loss, no duplicate
`+30`, crash/unknown ACK, rollback and same-file re-import.

Accepted-contract additions: per-profile `…:passes` local state `{ops, pending}`
outside `compactOutbox`, never compacted; after the v1 cycle `syncProfile`
pushes pending ops, pulls the table and unions by `op_id` (raising on content
mismatch); a pass failure holds passes only and v1 sync continues. Export puts
passes at the top level of `game-calendar-policy-export` with
`formatVersion: 2`. Same-profile import is an op union; cross-profile import
and first login follow D6. Tests also cover a v2 export run through the
**current** `importCzn` (refused whole), a v1 export leaving passes unchanged,
and a pass RPC failure while v1 sync succeeds.

### PASS-2 — compact UI and manual smoke

Add the Daily passes surface near Today's dailies, a detail management screen
for all enabled games, manual correction, `+30` and action-specific Undo,
mobile/desktop layout and clear offline/conflict messaging. Distinguish
expiry from daily reward collection. Browser tests cover reset edges,
regions, profile/account switch and offline/reconnect.

After deployment, prepare a short Android/PC manual smoke checklist, including
a real server-reset boundary when practical.

Accepted-contract additions: conflict include/dismiss UI (D3), cap warning
(D2), current-region display with other regions in details (D4), ~1 s
double-tap guard (D5), passes for built-in games only, with ops of deleted
custom games hidden (D7). The smoke checklist includes a per-game in-game check
of the inclusive convention (D1).

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
- PASS-0 found the full concurrency guarantee compatible with a small
  implementation (one table, one RPC, a pure reducer). **Do not weaken** the
  guaranteed behavior or build a general platform without another explicit
  product decision.
- No changes to C1a.1 #161, C1b, source ingestion, Timeline labels, CZN
  cutover or historic user data.

**Next concrete step:** preliminary and independent final review of PR #171
(PASS-1A). Do not merge, apply the SQL, change the private pin or start PASS-1B
without the corresponding separate operator GO.

### PASS-1A implementation notes (2026-11-12)

Where the contract left a detail open, PASS-1A fixed it as follows (review these):

- **Undo never targets an undo.** There is no redo chain, so liveness cannot depend
  on arrival order or form a cycle; redo is a new `extend`. An undo or resolve whose
  target belongs to another pass, or a resolve aimed at a non-extend, is reported as
  `ignored`. An undo/resolve whose target has not arrived stays pending.
- **Several resolves for one extend:** the latest live one in action order wins.
- **`days` is required on the wire** for `extend`; 30 (D2) is the client default.
- **`basedOn` must be distinct**; the server stores it sorted, and content comparison
  treats `createdAt` as an instant (offset spelling does not matter).
- **Wire strictness:** canonical lowercase UUIDs, `createdAt` with ≤3 fractional
  digits, hours 00–23 and an offset ≤ ±14:00; the TS schema mirrors the SQL.
- **`action_day` has an upper bound only** (server UTC date + 1), as the contract says.
- **Clock basis** (`passClockBasis`) labels `regional-default` clocks; it is not a
  claim of independent server evidence (UI wording is PASS-2).
- **Calendar limits (preliminary review P1/P2).** Every stored instant must stay in
  UTC years 0001–9999 (TS schema, RPC and a table check with epoch bounds, so the
  catalog text and contract hash do not depend on the session time zone); one
  year-10000 row would otherwise stop every v3 backup. The reducer never forms the
  day before `actionDay` (`max(last, actionDay − 1) + days` is evaluated as restart
  or continue). An extend that would pass 9999-12-31 is retained, reported in
  `outOfRange` and not applied; a `set` or `undo` recovers. `expiresAtMs` is the
  next game-day's opening, computed as `dayStart(lastDay) + 1 day`, which is
  identical for these fixed-offset clocks and stays defined at 9999-12-31.
- **Undo after an absorbing set (review clarification).** For `extend E`, then
  `set S` with `E` in `S.basedOn`, then `undo(E)`: E is reported in `undone`, but
  the expiry stays `S.lastDay`, because S already absorbed E and its explicit value
  is authoritative. The PASS-2 Undo UX must explain or avoid offering this undo.
- **v3 backup format** is `game-calendar-personal-passes` v3 with its own encrypted
  manifest and `snapshots/v3/` retention; `production.ts` detects v1/v2/v3, and any
  daily pass table or function forces full v3 verification.
