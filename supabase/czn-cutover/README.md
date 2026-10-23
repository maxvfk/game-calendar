# CZN server/backup release candidate — NOT INSTALLED

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
