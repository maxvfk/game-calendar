# Daily passes (PASS-1A) — reviewed SQL candidate, NOT installed

This directory holds exactly one release candidate: `20261112120000_daily_pass_ops.sql`.
It is deliberately outside `supabase/migrations` (production never replays it) and
outside `supabase/czn-cutover` (whose tooling expects exactly one CZN candidate).
Nothing here authorizes a production migration, a private backup pin change or a
client feature flag. The contract is [docs/tasks/DAILY-PASSES.md](../../docs/tasks/DAILY-PASSES.md).

## What the candidate adds

- `public.daily_pass_ops`: an insert-only, per-profile operation set
  (`extend` | `set` | `undo` | `resolve`). FK `profiles(id) on delete cascade`,
  PK `(profile_id, op_id)`, per-kind shape check, `game` validated by format
  (built-in IDs and `mygame:` IDs; reserved segments refused). An UPDATE trigger
  refuses every change; no client or backup role may INSERT/UPDATE/DELETE.
- `public.daily_pass_apply(p_profile_id uuid, p_ops jsonb)`: SECURITY DEFINER, explicit
  owner check, the existing 100-op / 256 KiB batch limits, strict per-kind wire
  validation, `action_day` at most server UTC date + 1, union insert. An exact replay
  is `accepted`; the same `op_id` with different content raises and rolls back the batch.
  Only `authenticated` may execute it.
- RLS: owners read their own ops; `calendar_backup` reads all through
  `calendar_backup_read` and cannot execute any daily pass function.
- Two immutable validators (`daily_pass_valid_day`, `daily_pass_valid_game`) and the
  guard trigger function; none is executable by clients or the backup role.

There is no server pass state, CAS or profile lock. The pass itself is derived on
devices by the pure reducer in `src/shared/dailyPasses.ts`.

## Backup contract v3

`supabase/backup-contract.passes-v3.json` is generated from the three migrations,
the installed CZN candidate and this candidate (`bun scripts/daily-passes/contract.ts`,
from an LF checkout: migration hashes cover exact file bytes). It covers the ten v2
tables plus `daily_pass_ops`, all daily pass functions and their ACLs.

- The pinned **v2** tool fails closed on the v3 schema (`Uncovered child table`),
  so the gap between the DDL and the pin switch halts backups instead of omitting ops.
- `scripts/czn-cutover/production.ts` detects v1, v2 or v3 exactly. Any daily pass
  table or function forces full v3 verification. v3 backups go to `snapshots/v3/`
  (30 daily / 12 monthly) as `*.passes-v3.snapshot.age`; v1/v2 trees are untouched.
- Recovery into v3 accepts v1, v2 and v3 snapshots and keeps every v2 rule (fences,
  frozen CZN history, release switch never restored). Ops are only **union-inserted**:
  no snapshot deletes or rewrites a live op, and a live op ID with different content
  refuses the whole recovery.

## Verification

```sh
bun test test/daily-passes.test.ts test/daily-passes-db.test.ts test/daily-passes-backup.test.ts
# real PostgreSQL 17 (CI job "CZN PostgreSQL 17 concurrency and recovery"):
PASSES_LOCAL_PG17_URL=postgres://postgres:…@127.0.0.1:5434/postgres bun scripts/daily-passes/verify-postgres17.ts
CZN_LOCAL_DRILL_URL=postgres://postgres:…@127.0.0.1:5435/czn_recovery_drill bun scripts/daily-passes/verify-local-drill.ts
```

## Rollout (each step needs its own operator GO)

1. Merge this candidate, the v3 tooling and tests. Nothing applied.
2. Private backup repo: prepare the v3 pin to the merged revision, merged but not active.
3. Operator window: take a v2 backup, apply this file in one transaction, switch the
   private pin, then run and verify a v3 backup (`production.ts preflight` reports
   `version: 3`). Between DDL and pin switch the v2 backup fails closed by design.
4. PASS-1B client behind its feature flag, enabled only after step 3 is verified.

Rollback: `revoke execute on function public.daily_pass_apply(uuid,jsonb) from authenticated`
stops writes; reads, backups and local ops remain. The v3 contract hashes exactly two
ACLs of that function identically (enabled, and authenticated EXECUTE revoked), and
`assertAccess` accepts both, so backup, preflight and every recovery path keep working
in the rollback state. Any other ACL change still fails closed as schema drift. Dropping the table needs a separate
GO after a verified v3 backup.
