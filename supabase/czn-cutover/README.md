# CZN server/backup release candidate — NOT INSTALLED

> **2026-10-23 operator-directed alternative:** The operator chose to plan a
> direct production release **without provisioning staging**, accepting a narrower
> historical-CZN preservation goal but **not** authorizing a database wipe or
> production DDL yet. See
> [the new direct-production readiness task](../../docs/tasks/CZN-DAILY-RESET-DIRECT-PRODUCTION-CUTOVER.md).
> The stricter staging-first steps below remain the original safe-release
> baseline; any deviation needs documented equivalent local tests, an explicit
> residual-risk assessment and a separate operator GO before production
> migration, backup workflow switch, deletion, or policy enablement.

This directory is deliberately outside `supabase/migrations`. Current production
and the private v1 backup pin must not discover/apply this candidate automatically.
The migration filename was created by Supabase CLI 2.121.0. Existing migrations
and `backup-contract.v1.json` remain unchanged.

Local verification:

```sh
bun scripts/czn-cutover/contract.ts
bun test test/czn-cutover-db.test.ts
bun install --frozen-lockfile
bun run typecheck
bun test
bun run build
```

`backup-contract.czn-v2.json` is reproducibly generated from the three deployed
migrations followed by this candidate. v2 logical snapshot/read/restore modules
are in `scripts/czn-cutover/`; they do not change the hosted age CLI/private pin.
Export must run in one REPEATABLE READ READ ONLY transaction; restore owns a
transaction and locks selected tables. It never restores the operational enabled
switch; v1 recovery preserves live fences/new-policy marks and frozen history.

## Remaining deployment gates

1. Use an explicitly isolated staging project with disposable Auth identities.
   Check real PG17 definitions, grants/RLS/backup role, PostgREST API exposure and
   two concurrent connections racing old writes against cutover. No synthetic
   identities/data may be inserted into production.
2. Finish age CLI/manifest/retention v2 integration and a reviewed private immutable
   pin PR. Preserve v1 snapshot reader; test encrypted v1/v2 restore locally with
   synthetic identities. The old pin intentionally refuses this schema.
3. Coordinate backup schedule/in-flight run, obtain validated pre-migration snapshot,
   then apply only this additive candidate transaction with enabled=false. Do not
   replay the original migrations or copy a live hash into a canonical contract.
4. Verify the exact hosted contract and encrypted backup/recovery before enabling
   any new-client cutover. Deploy compatible client with its release switch off;
   complete isolated cached-old-PWA and updated-client smoke. Production enablement
   needs a separate reviewed release PR and evidence recorded in implementation status.

Rollback keeps schema, policy-aware readers, all queues and irreversible fences.
Turn capability off to stop new writes/cutovers. Never reopen old CZN writers,
clear epoch/history, deploy an incompatible old reader as recovery, or use a
pre-cutover restore tool that does not understand the live fence.

Standing `dailies:czn` only. No event IDs, event clocks, other games or data sources.

## Disabled client and staging-only encrypted tooling

`CZN_CUTOVER_ENABLED=false` is a compiled constant, not a URL/localStorage flag.
The App/first-login/export and mixed Sync integration is dormant. No new RPC is
called and no new local keys are written by the default deployed release.
The candidate panel uses separate policy registers, clipped catch-up/history,
read-only/recovery/update actions. Old guest/foreign-epoch data remains an
unresolved source; it is never silently converted into current completions.

`bun scripts/czn-cutover/cli.ts backup|validate|restore` uses verified TLS and
explicit staging project/role checks. It hard-refuses the production ref.
Backup needs `--project-ref`, `--output`, `--source-revision` plus the existing
BACKUP_DATABASE_URL/AGE_RECIPIENT environment conventions. Validate needs
`--project-ref`, `--snapshot`, `--identity`. Restore additionally needs explicit
`--write --all-profiles` and local RESTORE_DATABASE_URL. It reads old encrypted
v1 pairs and distinct `.czn-v2.snapshot.age` pairs. v2 outputs are immutable and
separate from v1 retention directories; the staging tool intentionally never
prunes old recovery points. No plaintext snapshot is persisted.

Private workflow v2 scheduling/retention and immutable pin coordination still
need review before any hosted migration; this staging tool does not authorize
production access. The operator's existing scheduled v1 backup stays unchanged.

Local acceptance also includes actual age encrypt/decrypt, v1/v2 guarded restore,
ciphertext corruption, real new-client controller → SQL transport, mixed legacy
outbox preservation, import idempotence, account/profile isolation and disabled
zero-network/UI tests. The `age` round-trip test runs when age + age-keygen are
installed; ordinary CI retains its explicit optional skip if unavailable.
Browser/Auth/PostgREST/two-connection race and physical-device smoke require the
isolated hosted target; SSR markup tests are not substitutes for those gates.
