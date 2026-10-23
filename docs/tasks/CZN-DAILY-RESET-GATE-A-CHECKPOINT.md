# CZN safe cutover — Gate A checkpoint (2026-10-23)

**Outcome: design-only blocked. Gate A is NOT passed; Gate B was not started.**
No application, migration, canonical backup contract, event data or production
clock was changed. The experiment below is local, synthetic, disposable SQL,
not a deployment migration and not an implementation of the proposed protocol.

## Baseline and exact stop condition

- CURRENT main checked: `ce5bffa2ba67d2703b14e03012d351a4a2d9eff3`.
  PR #63 merged there; post-merge [CI 39868203557](https://github.com/maxvfk/game-calendar/actions/runs/39868203557)
  completed successfully. No open public-repository PRs at the initial check.
- Read AGENTS, IMPLEMENTATION-STATUS, the approved implementation task, predecessor
  investigation, existing clock evidence, actual helpers/UI consumers, guest/profile
  storage, import/export, local journal, remote adapter/engine, update/SW flow,
  all three SQL migrations, PGlite integration and S6a tooling/contract.
  No repeated clock-source research and no production identities/data accessed.
- The accepted product choices remain **18:00 UTC, UTC opening-date**, plus
  server-enforced rejection/holding of incompatible old CZN writers. They are
  not pending decisions and do not require renewed operator approval.
- The controlling task's **Gate A item 4** says: if the protocol requires an
  **unsupported privileged hosted database migration**, stop at a **docs-only
  design/checkpoint PR**. This environment exposes no Supabase administration
  connector, isolated authenticated test identity or administrative DB connection.
  The public browser key in remote.ts is not a migration credential. No login
  probing, credential extraction or production SQL/RPC experiment was attempted.
- A server change is unavoidable: the current SECURITY DEFINER RPC is executable
  by authenticated clients and knows neither policy nor cutover. Adding only
  a frontend flag, wire property or preference cannot protect its write path.
  Local SQL can demonstrate an isolation primitive, but cannot prove hosted
  grants, migration ordering, live backup compatibility or two-device rollout.

## Candidate minimal protocol (specified, NOT implemented)

Use an additive CZN standing-daily extension; do not rewrite the six-kind Sync
model for unrelated data. The following names are proposed API/schema names,
not existing endpoints. A shipped migration must be independently reviewed and
must satisfy every unproven row in the matrix below.

### Identity, scope and authority

- Immutable policy `czn-daily-utc18-opening-v1`; legacy policy `legacy`.
  Only the standing subject `dailies:czn` adopts this policy. Existing event daily
  checklists retain their existing event clock and subject identities. This is
  not authority to reinterpret banner/event daily windows or arbitrary CZN timers.
- Keep existing `daily_marks` and all raw guest legacy logs unchanged. Add a
  dedicated policy control table keyed by `profile_id`, with policy ID,
  server-generated immutable epoch UUID, server cutover instant and minimum
  wire protocol. Add a separate policy-daily table with key
  `(profile_id, policy_id, subject_id, day_key)` and unchanged LWW fields,
  including `completed:false`, UUID, changed_at and received_at. Do not put
  new-policy rows into the table selected by old clients.
- The epoch is a server agreement token, not a client timestamp or a date guessed
  from old changedAt. One irreversible epoch per profile/policy; retries return
  the same tuple. Independent profiles do not share it. Recreating/restoring a
  profile must not erase the fence and reopen old writes.
- A new capability/read RPC advertises an installed, enabled protocol. An
  owner-checked cutover RPC serializes with all CZN writers by locking the same
  profile row. The old RPC must acquire that same lock before checking the fence;
  both the check and write remain in that transaction. This prevents a request
  checked before cutover from committing after it under the old interpretation.
- At server-confirmed cutover, freeze old-wire CZN standing writes immediately.
  New writes use explicit policy+epoch from that confirmation. The first new
  interval may already be open: mark it as a partial first day; clip catch-up,
  missed-day and streak UI at cutover rather than inventing pre-cutover play.
  Strict next reset remains the next 18:00Z. No historical labels are shifted.
- New policy writes go through a separate strict v2 RPC, not overloaded v1 JSON.
  Check owner, exact policy, exact epoch, scope, valid opening-date and finite
  version, limits and replay/conflict rules. Read both namespaces separately.
  Direct writes, anonymous access, an unguarded helper RPC and backup-role
  execution must all be denied. Do not expose a bypass while renaming old SQL.

### Old clients, pending journals and update

- The guarded v1 RPC holds each CZN standing row after cutover with an explicit
  `update_required` outcome, **never accepted/superseded**, and applies unrelated
  valid rows with existing ordering. Same-label and different-label legacy
  mutations cannot touch the new table, regardless of later changedAt. A frozen
  legacy row must not be changed through v1 either.
- Existing remote.ts rejects an unfamiliar ACK. Existing syncProfile then keeps
  its original durable outbox and does not advance lastSuccessfulSyncAt. A mixed
  batch can still commit unrelated server rows; retries are idempotent. However,
  an old installed UI shows a generic Sync error and retains the whole batch.
  It cannot display a new CZN-specific notice or finalize only the unrelated
  acknowledgements. **Server isolation is not proof of old-client UX completion.**
- Updated clients must partition held legacy CZN entries from unrelated outbox
  traffic and show CZN read-only/update or unresolved-history status without
  blocking other games. Keep original serialized journal entries, false rows,
  mutation IDs and versions in a durable recovery envelope before any projection
  or schema upgrade. Never compact across policies or treat a held ACK as a win.
- Recovery choices: leave unresolved entries held indefinitely, export the complete
  recovery envelope, or explicitly archive them to the **legacy namespace only**
  through a compatible owner-checked legacy-import operation. This must be
  reversible locally and must not manufacture a new-policy completion or UUID.
  A new claim is a separate explicit user action, never automatic conversion.
- New CZN storage/journal keys must be separate from old scoped keys. Old cached
  tabs may continue writing legacy local keys; the upgraded reader must preserve
  and detect those later legacy edits rather than mark migration complete once
  and ignore them. Cross-tab writes and storage/quota/crash interleavings need
  tests before implementation approval.
- Use the existing waiting-worker/controllerchange reload mechanism; provide
  an immediate update check in the affected new UI and persist recovery state
  before reload. Never clear site storage, sign out to drop a queue, force-reload
  an editing form or require the operator to visit every user's device.
  Existing old builds can only offer their already-installed generic Reload
  notice. A server response cannot retrofit a new UI into a cached JS bundle.

### Guest/account, imports and history

- Fresh/existing guests use a separate local policy journal only after the
  compatible release is enabled; offline pre-release guests stay legacy. Local
  guest epoch is explicitly non-authoritative. Existing raw logs are preserved
  verbatim, including incomplete entries; their Region/instants are unknown.
- On login, negotiate the account's authoritative epoch before any new CZN
  upload. Keep a guest-source recovery copy. Guest-to-account import validates
  the explicit policy and date labels, retains source versions/tombstones and
  provenance, and binds to the target epoch without reinterpreting legacy labels.
  Other-device/cloud-only accounts read the same server tuple. An offline account
  with no confirmed tuple holds CZN writes; logout/login/profile switching must
  not silently reclassify them as guest or clear a fence.
- New format discriminator: `game-calendar-policy-export`, formatVersion 1.
  Include namespace-labelled registers, original raw legacy logs, tombstones,
  unresolved journals and policy/source-epoch metadata. Validate format and
  version strictly. Existing `gacha-tracker-export` v1 stays importable into
  **legacy only**; it cannot acquire a new policy from an extra field/version.
- Portable exports are not server authority: an imported epoch cannot cut over
  or roll back a profile. Repeated imports preserve source IDs and are idempotent.
  Existing v1 exports lack tombstones/outbox; preserve what they contain without
  claiming recovery of absent data. A legacy import cannot resurrect a known
  newer false register by union: use an existing newer tombstone or hold the
  ambiguous claim for explicit resolution. Never derive historical mutation
  versions from exportedAt merely to override a cloud deletion.
- Render old logs separately, honestly labelled legacy. Compute post-cutover
  today/streak/summary only from the new namespace. Neither edit times nor
  implicit union reconstructs a continuous streak across policies.
- CZN-only policy arithmetic: label ISODate(now−18h), opening(label) = UTC
  midnight(label)+18h, strict next boundary floor((now−18h)/24h)*24h+42h.
  Region/DST do not enter this calculation. Keep dayStartMs, clockFor,
  latestBoundaryMs, server offsets and all other games unchanged. Add explicit
  subject/policy selection at standing-daily callers, not a game-wide override.

## Proof actually executed

Bun **1.3.14**, PGlite **0.5.8**, real current migrations/shared Sync/remote adapter/
syncProfile/import parser/S6a preflight; synthetic owners only. The appendix
contains the reproducible local experiment. It changes only the in-memory DB.

| Case | Observed result | Limits |
| --- | --- | --- |
| Same-key later legacy false | Current SQL and applyMutation replace true with false | Confirms existing blocker, not a fix |
| Different legacy label | Separate old daily row remains | No relabelling/conversion is justified |
| Extra policy on v1 | TS strips it; current SQL ignores it | Wire field alone provides no protection |
| Version 999 with old format | Actual old importer accepts it | Merely bumping version is unsafe |
| Distinct format discriminator | Actual old importer returns null | New importer itself is not implemented |
| Profile-child extension | Actual assertTarget rejects uncovered child tables | Regenerating the old hash is insufficient |
| Local experimental v1 guard | CZN held, ZZZ accepted; old CZN rows byte-for-byte unchanged; separate new row intact | No production v2 writer or full validation/rollout proof |
| Bypass and ownership | Authenticated direct writes/helper invocation and other-owner guarded call denied | Prototype roles only, not hosted Supabase |
| Real applyCloudMutations + syncProfile | Mixed held ACK throws; exact outbox bytes/UUID/false remain; no success timestamp; ZZZ server write commits | Old UI remains generic error; new partition/UI not implemented |

The prototype is deliberately **not** committed as a runnable migration or test:
it lacks a v2 writer, production batch validation, enabled-state/epoch negotiation,
crash-safe upgrades, policy export, integrated recovery, hosted concurrency tests
and complete UI. Its fenced SQL must never be pasted into Supabase SQL Editor.
It proves only the listed primitives and exposes the remaining work.

## S6a compatibility and current hosted evidence

The current backup job is healthy: read-only Actions metadata shows
[39909326284](https://github.com/maxvfk/game-calendar-backups/actions/runs/39909326284)
completed **success** on 2026-10-23 at the run created 06:04:34Z (09:04:34 Moscow).
The preceding Oct 21/22 runs also succeeded. The inspected workflow at private
revision `a869d3788de10310a567cc42dc9f6beb04337e11` pins public implementation
`5b2a2b048bae53f32e464b0a91a8f5d9f354b669`. No snapshot contents, keys, identities
or credential values were retrieved. Workflow success does not establish a local
decrypt/recovery drill or compatibility with this unimplemented extension.

The actual S6a code enumerates seven tables, strict row schemas and schemaVersion
1; fingerprints four Sync functions; denies uncovered child FKs; checks exactly
seven role grants/RLS policies. New cutover/marks tables need coverage, strict
schemas, snapshot counts/digests, grants/RLS and exact function coverage. Changing
apply_profile_mutations changes its existing fingerprint even without a new table.
Do not hide state in an untracked schema or JSON preference to evade preflight.

A safe extension requires an additive versioned snapshot/contract and explicit
old-v1 reader/restore planning, not overwriting the v1 contract or accepting any
live hash. New policy tables and every security-critical v2/cutover/import RPC
must be covered. Existing encrypted v1 snapshots stay readable as legacy data.
A pre-cutover restore must **not** delete/recreate a profile and cascade away its
live fence, nor reopen v1 writers or erase newer policy claims. The restore plan
must preserve the monotonic live fence and explicitly account for both namespaces;
blindly using current replace-selected-profile-state is not compatible. Old
restore tools must fail closed on the new schema. None of that tooling exists yet.

## Remaining compatibility gates

| Gate | Status / required evidence |
| --- | --- |
| Fixed clock and immutable policy contract | Specified; complete arithmetic/UX regressions still required |
| Isolation and old ACK preservation primitive | Locally demonstrated above |
| Complete server protocol, limits, races, retries, fresh/upgrade paths | NOT implemented/proven |
| Guest/account/raw incomplete history + old/new exports + remote deletion | Specified; end-to-end proof missing |
| New client per-CZN read-only/update UI, held queue export/archive, mixed Sync | NOT implemented/proven |
| S6a both namespaces, strict contract, v1 reading, non-rewinding recovery | NOT implemented/proven |
| Isolated hosted migration, grants/RLS, server-first sequencing and old/new devices | BLOCKED: no safe administrative target/test identity available |
| Production enablement | FORBIDDEN until all preceding gates pass |

## Exact release and rollback order (future; not executed)

1. **Provision the safe target first.** Operator supplies/opens an isolated
   Supabase staging project through a supported administration channel, matching
   the hosted Postgres major/platform behavior, plus a disposable test account.
   Use a locally managed administrative connection with verified TLS; do not
   paste secrets into chat, reuse a service-role key in the app, or test with
   the operator's real Auth UUID. Record who can apply reviewed production SQL.
   There is currently **no deployable SQL from this checkpoint to apply**.
2. Complete Gate A proofs there and prepare small server/backup then client PRs.
   Fresh and upgrade PGlite tests must use the real planned migrations and backup
   tools; test two concurrent connections on hosted staging for lock ordering,
   forged epochs, old-client replay, mixed batches and owner isolation. Test
   retained v1 snapshot readability and guarded restore across cutover.
3. Review explicit old/new backup contracts and immutable private workflow pin.
   Coordinate the existing backup job so no scheduled job runs between schema
   and its compatible pin; serialize with an in-progress backup, never disable
   its guards. Preserve a verified encrypted pre-migration snapshot and perform
   the accepted local decrypt/validation/recovery drill. Apply only the reviewed
   **additive** migration in one transaction with extension enablement off.
   Never replay the old create-table/create-role migrations against production.
4. Update/verify the private pin for the new exact contract; run actual backup
   and recovery checks for the disabled extension. Inspect hosted migration
   ledger/catalog, every function definition/ACL/RLS, restricted backup role and
   capability reply. Any mismatch leaves new policy disabled; do not copy a live
   fingerprint or loosen checks. A green Pages CI is insufficient.
5. Deploy a policy-aware client with CZN new-policy creation **disabled**. Verify
   main CI/Pages plus desktop/phone-sized staging flows, v1 imports and held queue
   export/reload. Retain an actual old cached bundle on another test device.
6. Only after all gates pass, enable the server capability. A new client makes an
   idempotent owner-confirmed profile cutover; the old v1 guard is already active
   in the same transaction/locking scheme. No new row is created before the
   authoritative tuple. Verify a later offline old same-key false and distinct-key
   false cannot change either frozen history or new-policy marks, while another
   game's row reaches the server. Record safe isolated production verification.
7. Verify functional 18:00Z rollover/all Regions, installed PWA update, outbox
   recovery/export and non-CZN invariants; record main CI/Pages, live schema and
   isolated test-account results. Physical phone/PC smoke remains with operator.

**Rollback:** before any epoch/new row exists, disable capability and leave
additive schema/guards in place. After cutover, stop new cutovers and, if needed,
make CZN new writes read-only; retain a policy-aware reader and complete local
queues/export. Do not serve an incompatible bundle as the recovery strategy,
clear epoch, reopen v1 CZN acceptance, relabel/delete rows or run destructive
historical/down migrations. Restore must retain the monotonic fence; use only
an explicitly reviewed compatible restore plan. Other games continue unchanged.

## Checks and operator smoke

Local four AGENTS commands passed: frozen install, typecheck, default **bun test:
1126 pass / 1 existing optional age skip / 0 fail** (1127 tests, 59 files), full
build: **178 events / 7 games / 1 pre-existing NTE conflict**. No test timeout,
skip, lockfile or canonical contract changed; no refresh ran. The prototype ran
separately and passed the five result groups above. PR and post-merge CI/Pages
are recorded in the delivery PR (they are not hosted Supabase verification).

**Now:** no new device smoke is required for docs-only changes and no reset
correction is claimed. Production still uses the old incorrect CZN reset.

**After a future enabled release**, use a disposable isolated account on phone
and PC, not real profile data:

1. Keep an old PWA offline with a pending CZN false and another game's edit.
   Cut over on updated PC, mark new CZN day true. Reconnect old phone: CZN server
   rows stay unchanged, unrelated row commits, old journal remains pending and
   there is no false synced indication. Record its generic old UI honestly.
2. Update phone via Reload without clearing storage. Confirm CZN-specific
   held/read-only message, same UUID/version/false in recovery export, other
   games synced, no phantom new completion. Leave held or archive explicitly to
   legacy; repeated reload/import/archive must not duplicate/reclassify it.
3. At 17:59:59Z/18:00:00Z check actual rollover and next reset; switch all three
   Regions. Date label is the UTC opening date, same on both devices. Keep legacy
   history visibly separate; test new-policy untick on PC appears on phone.
4. Logout/login and switch test profiles, test guest/v1/new imports, then offline
   edit/reload/reconnect. Old labels/false rows persist; target epoch remains
   authoritative; no unrelated event IDs, dates or marks change.

**One Next concrete step:** arrange an isolated Supabase administrative test
target and disposable Auth identity, then finish Gate A's versioned server/S6a
compatibility proof there before authorizing any production migration/cutover.

## Appendix — reproducible disposable experiment

From repository root, extract the following block to `.czn-gate-a-probe.ts`, run
`bun .czn-gate-a-probe.ts`, then delete that temporary file before normal checks.
It uses only in-memory PGlite and intercepts the SDK RPC before Sync calls;
no Supabase network request is made. Do not execute its SQL on a hosted project.

```ts gate-a-probe
import assert from 'node:assert/strict';
import { PGlite } from './node_modules/@electric-sql/pglite/dist/index.js';
import { applyMutation, emptySyncState, SyncMutation } from './src/shared/sync.ts';
import { supabase, applyCloudMutations } from './src/client/account/remote.ts';
import { syncProfile } from './src/client/account/syncEngine.ts';
import { writeAccountCache } from './src/client/account/firstLogin.ts';
import { initializeAccountProfile } from './src/client/account/localSync.ts';
import { profileKeys } from './src/client/state/storage.ts';
import { defaults } from './src/client/state/usePrefs.ts';
import { buildExportData, parseImportData } from './src/client/state/export.ts';
import { assertTarget, schemaContract } from './scripts/account-backup/database.ts';
import { canonical, sha256 } from './scripts/account-backup/model.ts';
const db = new PGlite();
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const id = (n:number) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12,'0')}`;
const daily = (n:number,day:string,completed:boolean,time:string) => SyncMutation.parse({
  kind:'daily',key:{subjectId:'dailies:czn',dayKey:day},completed,changedAt:time,mutationId:id(n)});
const first=daily(1,'2026-10-22',true,'2026-10-23T10:00:00Z');
const late=daily(2,'2026-10-22',false,'2026-10-23T11:00:00Z');
const different=daily(3,'2026-10-21',false,'2026-10-23T12:00:00Z');
const q=async(s:string,p:unknown[]=[]) => (await db.query(s,p)).rows as Record<string,unknown>[];
async function as(uid:string, fn:()=>Promise<unknown>) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);
  await db.exec('set role authenticated');
  try{return await fn();}finally{await db.exec('reset role');}
}
let profile:string;
async function rpc(rows:unknown[]) {
  return (await q('select public.apply_profile_mutations($1::uuid,$2::jsonb) as ack',
    [profile,JSON.stringify(rows)]))[0]!.ack as any[];
}
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon;
    insert into auth.users values ('${owner}'),('${other}');`);
  for(const f of ['20260925150000_account_sync_schema.sql','20260925150100_account_sync_rpc.sql','20261003140000_account_backup.sql'])
    await db.exec(await Bun.file(new URL('./supabase/migrations/'+f,import.meta.url)).text());
  profile=String((await as(owner,()=>q('select public.ensure_default_profile() as id')) as any[])[0].id);
  await as(owner,async()=>{
    await rpc([{...first,clockPolicy:'czn-daily-utc18-opening-v1',epoch:id(90)}]);
    await rpc([late,different]);
  });
  const baseline=await q('select * from public.daily_marks order by day_key');
  assert.equal(baseline.length,2); assert.equal(baseline[1]!.completed,false);
  assert.equal(Object.values(applyMutation(applyMutation(emptySyncState(),first).state,late).state.daily)[0]!.completed,false);
  assert.equal('clockPolicy' in SyncMutation.parse({...first,clockPolicy:'x'}),false);
  console.log('PASS current SQL and TS: later legacy tombstone wins same key; distinct key survives; policy stripped/ignored');
  const exported=buildExportData({}, {'dailies:czn':{days:['2026-10-22'],at:first.changedAt}}, {}, {games:{},events:{}});
  assert.ok(parseImportData({...exported,version:999,clockPolicy:'x'}));
  assert.equal(parseImportData({...exported,format:'game-calendar-policy-export'}),null);
  console.log('PASS actual old importer: ignored version; distinct discriminator rejected');
  await db.exec("insert into calendar_backup_control.project_identity(project_ref) values ('vzzudezdigjwbwfejlsg')");
  const hash=sha256(canonical(await schemaContract(q)));
  await assertTarget(q,'vzzudezdigjwbwfejlsg',hash);
  // LOCAL EXPERIMENT ONLY: candidate isolation primitive, NOT a deployable migration.
  await db.exec(`create schema cutover_proof;
    revoke all on schema cutover_proof from public,anon,authenticated;
    create table public.czn_policy_proof(profile_id uuid primary key references public.profiles(id),epoch uuid not null);
    create table public.czn_marks_proof(profile_id uuid references public.profiles(id),policy_id text,
      subject_id text,day_key text,completed boolean,primary key(profile_id,policy_id,subject_id,day_key));
    alter table public.czn_policy_proof enable row level security;
    alter table public.czn_marks_proof enable row level security;
    revoke all on public.czn_policy_proof,public.czn_marks_proof from public,anon,authenticated;`);
  await assert.rejects(()=>assertTarget(q,'vzzudezdigjwbwfejlsg',hash),/Uncovered child table/);
  console.log('PASS S6a actual preflight refuses uncovered profile-child tables (before RPC alteration)');
  await db.query('insert into public.czn_policy_proof values ($1,$2)',[profile,id(90)]);
  await db.query("insert into public.czn_marks_proof values ($1,'czn-daily-utc18-opening-v1','dailies:czn','2026-10-22',true)",[profile]);
  await db.exec(`alter function public.apply_profile_mutations(uuid,jsonb) set schema cutover_proof;
    revoke all on function cutover_proof.apply_profile_mutations(uuid,jsonb) from public,anon,authenticated;
    create function public.apply_profile_mutations(p_profile_id uuid,p_mutations jsonb)
    returns jsonb language plpgsql security definer set search_path='' as $$
    declare r jsonb; answer jsonb:='[]'::jsonb; begin
      perform 1 from public.profiles where id=p_profile_id and owner_id=auth.uid() for update;
      if not found then raise exception 'profile unavailable' using errcode='42501'; end if;
      for r in select value from jsonb_array_elements(p_mutations) loop
        if r->>'kind'='daily' and r->'key'->>'subjectId'='dailies:czn'
          and exists(select 1 from public.czn_policy_proof where profile_id=p_profile_id) then
          answer:=answer||jsonb_build_array(jsonb_build_object('mutationId',r->>'mutationId','outcome','update_required'));
        else answer:=answer||cutover_proof.apply_profile_mutations(p_profile_id,jsonb_build_array(r)); end if;
      end loop; return answer; end $$;
    revoke all on function public.apply_profile_mutations(uuid,jsonb) from public,anon,authenticated;
    grant execute on function public.apply_profile_mutations(uuid,jsonb) to authenticated;`);
  const zzz={...late,mutationId:id(4),key:{subjectId:'dailies:zzz',dayKey:'2026-10-22'}};
  await as(owner,async()=>{
    assert.deepEqual((await rpc([late,zzz])).map(x=>x.outcome),['update_required','accepted']);
    await assert.rejects(()=>q('select cutover_proof.apply_profile_mutations($1::uuid,$2::jsonb)',[profile,JSON.stringify([late])]));
    await assert.rejects(()=>q('update public.czn_marks_proof set completed=false'));
  });
  await as(other,()=>assert.rejects(()=>rpc([late])));
  assert.deepEqual(await q("select * from public.daily_marks where subject_id='dailies:czn' order by day_key"),baseline);
  assert.equal((await q('select completed from public.czn_marks_proof'))[0]!.completed,true);
  console.log('PASS local candidate guard: CZN held; other game accepted; legacy bytes and new row unchanged; bypass/other owner denied');
  class Store {v=new Map<string,string>();getItem(k:string){return this.v.get(k)??null;}setItem(k:string,v:string){this.v.set(k,v);}}
  const store=new Store(),keys=profileKeys(profile);
  writeAccountCache(store,profile,owner,{progress:{},daily:{},ignored:{},prefs:defaults(),customGames:{},customEvents:{}});
  initializeAccountProfile(store,profile,owner);
  store.setItem(keys.outbox,JSON.stringify([late,zzz]));
  const original=store.getItem(keys.outbox);
  // Route actual browser RPC adapter to the local candidate, never to hosted Supabase.
  const saved=supabase.rpc;
  (supabase as any).rpc=async(_name:string,args:any)=>({data:await as(owner,()=>rpc(args.p_mutations)),error:null});
  try {
    await assert.rejects(()=>syncProfile(store,profile,owner,()=>true,{
      authenticate:async()=>owner,pull:async()=>emptySyncState(),push:applyCloudMutations}),/Unrecognized mutation acknowledgement/);
  } finally {supabase.rpc=saved;}
  assert.equal(store.getItem(keys.outbox),original);
  const meta=JSON.parse(store.getItem(keys.syncMeta)!);
  assert.equal(meta.lastSuccessfulSyncAt,undefined);
  assert.equal((await q("select completed from public.daily_marks where subject_id='dailies:zzz'"))[0]!.completed,false);
  console.log('PASS actual remote+syncProfile: mixed held ACK preserves exact outbox/UUID/false; no success timestamp; unrelated server row commits');
  console.log('LIMIT: primitive only, no v2 RPC/client/export/recovery implementation, no hosted verification. Gate A NOT passed.');
} finally {await db.close();}
```
