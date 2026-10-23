# CZN direct-production handoff — STOP before GO

**Status 2026-10-23: GO 1 (backup transition) COMPLETE; GO 2 (disabled additive
migration) and GO 3 (enablement) NOT started and each need a separate operator GO.**
No production SQL, user-row deletion or CZN enablement is authorized by this
document. No staging will be created.
The default path preserves every legacy CZN row unchanged in `daily_marks`; the
new namespace starts empty. Clearing history is unnecessary and would not clear
cached PWA outboxes. No Auth/profile/database reset is part of this release.

## Reviewed inputs

- Production: `vzzudezdigjwbwfejlsg`, `game-calendar`, eu-west-1, PG17.6.1.166.
- Baseline: main `b075d8056ffbf6d6ac8876bd6175739de808742d` (#69), post-merge
  CI [39949829568](https://github.com/maxvfk/game-calendar/actions/runs/39949829568) success.
- Candidate only: `supabase/czn-cutover/20261023084944_czn_daily_cutover.sql`;
  SHA256 `a5fdb2301b3906d314a9f03afcef41b0de2a0ab8d00e32cd1b97a562172db788`.
  It is deliberately outside deployed migrations. Never replay the three old
  SQL files: production's CLI migration ledger is empty although those objects exist.
- Canonical v1 SHA256 `312a36fa274c90eba0f72000b81b8de72d25a2d5d54bebb31b955479889f4a3e`;
  v2 `17bcce566b7d71364e4886721c0624b26e17542b4c4d77cfac8260bc721f1254`.
  Do not replace either expected contract with an observed production hash.
- Client `CZN_CUTOVER_ENABLED=false`; server candidate `enabled=false`.
  Standing `dailies:czn` only: 18:00 UTC, UTC opening-date. Event clocks, IDs,
  other games, Timeline and source-health are unchanged.

## Immutable readiness evidence (2026-10-23)

- Implementation [public #70](https://github.com/maxvfk/game-calendar/pull/70),
  merged `0a83bae2cfc35328bcc28132d7f6207d929be3aa`;
  [PR CI 39954344066](https://github.com/maxvfk/game-calendar/actions/runs/39954344066)
  and [main CI/Pages 39954540087](https://github.com/maxvfk/game-calendar/actions/runs/39954540087)
  passed, including PG17.6 two-connection lock waits and recovery.
- Operator drill/preflight [public #71](https://github.com/maxvfk/game-calendar/pull/71),
  merged `b5d46b5fa0b820f9d244302a77c34e7020cde2ee`; final
  [PR CI 39956124419](https://github.com/maxvfk/game-calendar/actions/runs/39956124419)
  and [main CI/Pages 39956392921](https://github.com/maxvfk/game-calendar/actions/runs/39956392921)
  passed. The exact encrypted operator path passed in a second empty PG17 service;
  false/epoch/microseconds preserved, second run refused. Supplemental metadata
  SQL ran under READ ONLY on local v1/v2. Legacy direct-write or owner-policy drift
  now fails preflight too. Private draft pin uses this final merged implementation.
- Prepared [private draft #6](https://github.com/maxvfk/game-calendar-backups/pull/6),
  head `c602d3101bc733bf6699a8fb6e3fe559a2b90383`, proposed public pin
  `b5d46b5fa0b820f9d244302a77c34e7020cde2ee`. (Merged under GO 1 — see below.)
  It retains the existing schedule/mutex, adds independent exact-pin GO and
  synthetic-only validation. No production credentials in PR CI.
  Final private validation passed: [39956500529](https://github.com/maxvfk/game-calendar-backups/actions/runs/39956500529).
  Its gates include actual proposed shell syntax/encrypted-path allowlist, all four
  AGENTS commands, independent PG17 and the exact operator encrypted local drill.
  Active scheduled workflow was not run or changed by this validation.
- Pre-GO-1 private main was `93128e7fd5ed7e407cee234ba0231a93506f76f2`,
  public pin `5b2a2b048bae53f32e464b0a91a8f5d9f354b669`; latest scheduled
  [39909326284](https://github.com/maxvfk/game-calendar-backups/actions/runs/39909326284)
  succeeded. Its 2026-10-23 v1 manifest was inspected as metadata only; no
  ciphertext/plaintext/private key was downloaded. This is not a fresh migration
  backup or operator recovery acceptance.
- Four AGENTS commands: frozen install/typecheck/tests/build passed; 1151 pass,
  1 old optional age skip, 0 failures; new real-age tests ran. Build 178 events /
  7 games / 1 existing conflict. Filesystem-heavy old retention test has an
  explicit 20s budget after one default-5s timeout; assertions are unchanged.
- Supplemental catalog-only review SQL is
  `supabase/preflight/czn-production-readonly.sql`; not executed in production.
  Exact contract verification remains the CLI below. Current hosted ACL/role
  proof and hosted API checks await production GO.
- **Operator real-key acceptance (2026-10-23):** latest scheduled v1 pair
  `2026-10-23` (createdAt `2026-10-23T06:05:10.301Z`, source `5b2a2b04…`,
  ciphertext SHA256 `d3001dae…4ca6`) decrypted with the operator's private
  identity via `validate`, then restored by `local-drill.ts` from main `02f3c6c6`
  into a new empty loopback PG17.11 `czn_recovery_drill`. Independent re-export
  matched all seven table digests and `dataSha256`; release disabled, no policy/
  epoch created; nonempty rerun refused; cluster disposed. Details:
  [implementation status](IMPLEMENTATION-STATUS.md). The pair is kept outside
  retention, but a fresh pre-migration pair is still required at release time.
- **GO 1 executed (2026-10-23, operator-authorized):** variable
  `CZN_BACKUP_GO_REVISION=b5d46b5fa0b820f9d244302a77c34e7020cde2ee`; private #6
  squash-merged as `ffdd3428b4a08964e1ec466bf328a05ee8da68b5` (workflow blob
  `b10a96db…`, cron `23 1 * * *`, `personal-data-backup` mutex unchanged). Manual
  [run 39987601875](https://github.com/maxvfk/game-calendar-backups/actions/runs/39987601875)
  passed every step with `_source` at `b5d46b5`, detected exact v1 and committed
  only `snapshots/daily/2026-10-23` as `c00090a15a37a0f9a4c44fd3ccc24180850c8be6`
  (no `snapshots/v2`; monthly `2026-10` and older dailies unchanged). Manifest:
  v1, createdAt `2026-10-23T16:32:59.510Z`, source `b5d46b5…`, canonical v1,
  operator recipient, ciphertext SHA256 `8dfb3183…187c`. Operator decrypted it via
  `validate` from exact `b5d46b5` bytes and repeated the empty-PG17 local drill
  (all digests matched, release disabled, rerun refused, cluster disposed).
  Pre-cutover pair `d3001dae…` stays archived outside retention. No Supabase
  schema/SQL change, Auth change or enablement.

## Backup and recovery commands

`bun scripts/czn-cutover/production.ts` prints an offline plan. It does not open a
connection. The old staging CLI retains its production guard. This new entrypoint
has no migration or enablement command. Connection URLs remain local environment
variables, use existing verified TLS, role and exact project checks, and must
never appear in command lines, chat, Actions logs or public artifacts.

After the corresponding explicit GO, a read-only catalog/role preflight is:

```sh
bun scripts/czn-cutover/production.ts preflight \
  --project-ref vzzudezdigjwbwfejlsg --read-only
```

It uses `BACKUP_DATABASE_URL`, inspects catalogs/privileges and the existing
project marker, and outputs only the known version/hash. No personal rows are
selected. Unknown/partial schema, unsafe grants, changed RPC/policies, uncovered
FK children, project mismatch or excessive backup privileges stop the operation.
The non-exposed control marker intentionally has no RLS; client schema USAGE and
marker writes must both be denied. A generic RLS advisory alone does not establish
exposure; verify effective ACLs, never blindly enable RLS or rewrite the marker.

After backup-transition GO, with the reviewed source checked out and private
workflow variable set independently (do not set it merely to run this example):

```sh
reviewed_public_revision=b5d46b5fa0b820f9d244302a77c34e7020cde2ee
bun scripts/czn-cutover/production.ts backup --execute \
  --project-ref vzzudezdigjwbwfejlsg --confirm-project vzzudezdigjwbwfejlsg \
  --source-revision "$reviewed_public_revision" \
  --go-revision "${CZN_BACKUP_GO_REVISION:?separate operator GO required}" \
  --output snapshots
```

Backup (only after backup-transition GO) additionally requires `--execute`,
`--confirm-project REF`, immutable `--source-revision SHA`, matching independently
set `--go-revision SHA`, `--output snapshots`, and `AGE_RECIPIENT`. The source
revision must equal the checked-out implementation HEAD. It detects exactly v1
or v2 inside one REPEATABLE READ READ ONLY transaction and enforces the matching
contract/role. There is no catch-and-fallback downgrade. v1 keeps existing paths;
v2 uses `snapshots/v2/daily` (30) and `snapshots/v2/monthly` (12). Daily reruns
refresh that day; monthly retains the first verified pair. Both trees are checked
before pruning. Corruption, orphan pairs, foreign project/contract, unexpected
files and symlinks fail closed. v2 never visits legacy retention or operator
`pre-cutover` archives. Pair replacement can fail between renames: verification
then refuses it and no commit/prune succeeds; the previous committed Git version
and monthly/archive copies remain recovery points. Jobs must share one mutex.

Offline validate/decrypt is available without GO:

```sh
bun scripts/czn-cutover/production.ts validate --project-ref vzzudezdigjwbwfejlsg \
  --snapshot LOCAL_ENCRYPTED_PAIR --identity LOCAL_OPERATOR_AGE_IDENTITY
```

Decrypted bytes stay in memory. Old v1 and new v2 encrypted snapshots are readable.
A green export Action/manifest is NOT proof the operator can decrypt/recover.

### Operator actual local recovery drill (no hosted connection)

Use the current reviewed handoff revision containing `local-drill.ts`, and a
new dedicated **local PostgreSQL 17 cluster**, database `czn_recovery_drill`,
admin `postgres`. Do not reuse the application database or SSH-tunnel a hosted
project to localhost. Provision it on the operator machine with their normal
local container/PG tools, empty of all custom schemas/relations and the roles
`anon`, `authenticated`, `calendar_backup`. Set `CZN_LOCAL_DRILL_URL` privately
to a loopback URL for this database; do not paste its password into chat/history.
Then run locally with the downloaded encrypted pair and operator's private key:

```sh
bun scripts/czn-cutover/local-drill.ts --execute-local \
  --project-ref vzzudezdigjwbwfejlsg \
  --snapshot LOCAL_ENCRYPTED_PAIR --identity LOCAL_OPERATOR_AGE_IDENTITY
```

Only localhost/127.0.0.1, dedicated database name, PG17 and an empty cluster are
accepted. No existing schemas/roles/data are overwritten or dropped. After
decrypt/validation it initializes the exact schema locally, inserts snapshot
owner IDs into an Auth **stub** (no provider accounts/tokens), restores into v2
with feature off and verifies rows/epochs/false marks/microseconds. Nothing is
uploaded or logged; a nonempty second run is refused. A failure also leaves
this local cluster for private inspection rather than deleting evidence. The
reconstructed local database contains personal data: operator must protect and
dispose of that dedicated local cluster afterward; keep encrypted source and
private key secure. This is recovery proof, not hosted Auth/provider recovery.

Recovery dry-run: use `restore` with the same snapshot/identity, `--profile UUID`
(repeatable) OR `--all-profiles`, and `--read-only`; local
`RESTORE_DATABASE_URL` is required. No write is the default. After a separate
recovery approval, `--write --confirm-project REF --source-revision SHA --go-file
LOCAL_JSON` replaces `--read-only`. The JSON requires operation
`restore-selected-profile-state`, exact production `projectRef`, checked-out
`sourceRevision`, exact ciphertext `snapshotSha256`, explicit UUID `profiles`,
UTC `expiresAt` within 24 hours, and confirmation
`GO restore selected profiles; preserve CZN fences`. Do not store a filled GO file
in either repository. All checks run again in the locked write transaction.
Existing Auth identities/ownership must match; no Auth creation/remapping.
v1 into live v2 retains fences, new-policy true/false rows and frozen legacy CZN;
v2 rejects a conflicting live epoch and LWW-merges marks without resurrecting an
older true over false. Release enabled state is never restored from a snapshot.
Timestamp equivalence uses PostgreSQL's microsecond conversion, not JS Date.

## Exact release order after a separately recorded operator GO

1. Record reviewed immutable public tooling/client SHA, private draft workflow
   head SHA, both contracts and candidate SQL hash. Recheck current main and
   public/private CI; resolve drift before proceeding. Explicitly accept that
   hosted Auth/PostgREST and phone tests were unavailable without staging.
2. Wait for any private backup job to finish. Use the same `personal-data-backup`
   concurrency group; do not cancel an encrypt/commit job or race Git pushes.
   Verify latest scheduled v1 pair. Download its ciphertext+manifest locally;
   operator validates with their private age identity and records pair SHA256,
   source revision, createdAt and successful local recovery drill. Preserve a
   verified **pre-migration** pair in an operator archive outside retention and
   record its identity. Do not publish plaintext, counts, user IDs or keys.
3. **GO: backup transition only** — *done 2026-10-23 (private `ffdd342`, run
   39987601875, pair `8dfb3183…`).* Set the reviewed private variable
   `CZN_BACKUP_GO_REVISION` to the exact public pin, then merge the reviewed
   private workflow PR. Run it on the still-v1 schema. It must produce a valid
   v1 encrypted pair with the new public revision, and the old schedule remains
   01:23 UTC. Revalidate/decrypt this exact pair locally. No migration until this
   succeeds. This dual reader covers both sides of the atomic schema change;
   installing schema first would leave the old exporter unable to back up.
4. **GO: disabled additive migration only.** Immediately rerun read-only
   preflight against known v1. On Windows, a `core.autocrlf=true` checkout turns
   the candidate into CRLF bytes (SHA256 `d77a597c…`); take the bytes from Git
   (`git -c core.autocrlf=false show HEAD:<candidate path>`) and verify SHA256
   `a5fdb230…` before use. Apply the exact candidate SQL in ONE transaction
   through a reviewed administrator connection (BEGIN, local lock_timeout 10s,
   statement_timeout 120s, candidate bytes, COMMIT), or one atomic Supabase
   migration application after confirming its transactional semantics. Never
   manually execute fragments, add synthetic production accounts, rewrite legacy
   rows, or enable policy. On error ROLLBACK and stop. SQL is additive except
   replacing the old RPC with its owner-locked wrapper; all three v2 tables start
   disabled/empty. Review effective roles, not just table presence.
5. Run exact-v2 read-only contract/backup-role preflight. Verify PostgREST schema
   reload and API exposure using the normal public client: anon denied, actual
   owners only, helper inaccessible, direct writes denied, capability enabled
   false/no epoch. Verify existing owner login/profile read and unrelated-game
   Sync with operator-owned normal actions only; agree any live write smoke first.
   Stop on API drift/RLS/Auth failures. No production synthetic test data.
6. Run dual-schema private workflow again; require a v2 encrypted pair under
   `snapshots/v2`, successful local decrypt, and v2 recovery dry-run. Complete
   isolated local actual v1/v2 recovery from the operator's real pair without
   uploading data. Record acceptance privately. Preserve the pre-migration pair.
7. The compatible PWA remains compiled off during all prior steps. A later,
   separately reviewed release changes the compiled switch only after server,
   backup and hosted compatibility evidence is accepted. Publish compatible
   policy-aware client, then **separate enablement GO** for server capability.
   Do not enable server first while all clients are incompatible. Activation
   creates a profile epoch only on owner-confirmed negotiation; it never shifts
   historical labels. Record exact deploy SHA/time, switch action and first epoch
   verification privately. Stop for real-device smoke before calling reset live.

## GO / NO-GO checklist

All required items must have explicit evidence, not inferred success:

- [ ] Exact public/private pins and SQL/hash reviewed; four AGENTS commands and
  PR/main CI, including isolated PG17 concurrency/ACL/recovery job, green.
- [ ] Production ref/PG17/role/schema inventory matches; fresh preflight at known
  v1; ACLs/RLS/function identities unchanged. Empty migration ledger accounted for.
- [ ] No in-flight exporter; verified archived pre-migration encrypted pair
  identified; operator private key decrypt + actual isolated recovery drill accepted.
  (Key decrypt + drill passed 2026-10-23 on pre-cutover `d3001dae…` and on the
  first dual-pin pair `8dfb3183…`, both archived outside retention; immediately
  before GO 2 recheck no in-flight job and validate the then-latest pair.)
- [x] Private workflow transition and exact GO variable explicitly authorized;
  new dual pin exported/decrypted v1 successfully BEFORE disabled migration.
  (GO 1, 2026-10-23: private `ffdd342`, run 39987601875, pair `8dfb3183…`.)
- [ ] Disabled migration explicitly authorized; atomic SQL/hash verified. No
  deletion or full reset; rollback/stop owner available for this maintenance window.
- [ ] Immediately afterward: exact v2 preflight, hosted Auth/PostgREST/owner/anon/
  internal RPC checks and other-game smoke; encrypted v2 backup + recovery proof.
- [ ] No-staging residual risks explicitly accepted; client/server enablement
  remain separate approvals. Real-device smoke planned; outboxes preserved.

Any unchecked item is NO-GO for its dependent step. Missing key/drill, unexpected
schema, failed backup/CI/API, unknown credentials or lack of approval is a stop,
not permission to weaken the expected fingerprint or grant service-role access.

## Rollback and residual risk

Before DDL: keep active workflow and client unchanged; a draft private PR has no
runtime effect. If the new dual exporter fails on v1, stop before DDL; return to
reviewed old workflow only while preflight still proves v1. If additive DDL fails
atomically, rollback transaction; verify v1 and backup. Once DDL commits, retain
v2-compatible backup/policy-aware reader even while disabled; do not downgrade to
the old pin. If hosted checks fail, leave server/client disabled, diagnose, and
keep backups. Any emergency server disable after enablement requires separate operator
authorization for this exact action (never execute it from this readiness Work):

```sql
begin;
set local lock_timeout='10s';
set local statement_timeout='30s';
update public.czn_daily_release set enabled=false where singleton=true;
commit;
```

Keep the current compatible PWA/policy-aware reader deployed. This change blocks v2 writes/new cutovers but
never removes epochs or reopens old CZN. Never drop v2 tables/fences, delete
profiles, rekey labels, clear localStorage/outboxes or restore with an old tool.
Recovery is a separately approved selected-profile transaction, not a rollback
shortcut; snapshot release state never controls enablement.

Without staging, local PG17 validates real locks/SQL/ACL/RLS and a JWT-sub claim
function, **not** Supabase Auth JWT issuance/expiry, PostgREST cache/exposure,
hosted pooler/DDL permissions or device service-worker lifecycle. Those require
immediate disabled-production verification after the first GO and operator smoke
before activation acceptance. Blast radius includes shared profile RPC/backup
availability, so keep both features off on any unrelated Sync regression. No
user-row deletion is necessary. Historical continuity is deliberately relinquished
for the new namespace; raw history/outbox remains recoverable.

## Synthetic UI harness

`test/czn-browser-dom.test.tsx` drives actual React DOM click/reload/export/update
handlers in Happy DOM with synthetic localStorage and an offline transport,
including two retained true/false mutations and read-only state. A standalone
browser entry is `test/helpers/czn-cutover-entry.tsx` (bundle with Bun into a
disposable local page containing `<div id="root"></div>`). Neither harness mounts
in the shipped app or uses Supabase. This is not a real-browser/service-worker or
hosted Auth smoke.

## Exact real-device smoke (future, after separate activation GO)

Use operator phone with cached old PWA and PC with updated PWA, same account/profile:

1. Export recovery first; record pending count privately. On old phone offline,
   toggle standing CZN and another-game daily; keep original pending/outbox bytes.
2. On PC negotiate the epoch and mark today's UTC opening date true then false.
   Reload: false persists and 18:00 UTC countdown is strictly next boundary.
3. Reconnect old phone: CZN server row/frozen legacy history cannot change;
   old generic Sync error may retain the whole batch. Other-game server write
   succeeds idempotently. Never clear site storage to remove the error.
4. Use normal app update/reload on phone; verify raw held CZN outbox in recovery
   export, same account epoch, PC false retained, and other games sync normally.
5. Updated phone offline: queue CZN true then false, reload, export/import recovery;
   reconnect and verify both devices resolve false without dropping pending IDs.
   Profile switch/logout/login must not transfer authority or lose source recovery.
6. At 17:59:59.999Z / 18:00:00Z / 18:00:00.001Z (controlled local harness, then
   observe actual boundary on device), label opens once; UTC opening date is
   independent of Region/DST. Guest/login import preserves legacy as unresolved,
   never fabricates a streak. Export all and import preserve tombstones/history.

Record device/browser/build IDs and outcomes privately. Local/SSR tests do not
constitute this smoke. Stop before unrelated milestones.
