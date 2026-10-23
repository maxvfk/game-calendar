/** Disposable PG17 only; no Supabase credentials, real accounts, or hosted URL accepted. */
import {SQL} from 'bun';
import {strict as assert} from 'node:assert';
import {migrationHashes} from '../account-backup/generate-contract.ts';
import {safeQuery} from '../account-backup/cli.ts';
import {candidateMigration,assertCznTarget,assertCznBackupRole} from './contract.ts';
import {detectContract,assertAccess,PRODUCTION_PROJECT as project} from './production.ts';
import {readCznSnapshot,restoreCznSnapshot} from './backup.ts';
import {CZN_POLICY,cznDayKey} from '../../src/shared/cznDaily.ts';
import contract from '../../supabase/backup-contract.czn-v2.json';
const raw=process.env.CZN_LOCAL_PG17_URL??'',url=new URL(raw);
if(!['127.0.0.1','localhost'].includes(url.hostname)||url.pathname!=='/postgres'||url.username!=='postgres'||url.search||url.protocol!=='postgres:')
  throw new Error('Only disposable loopback postgres database accepted');
const config={url:raw,max:1,prepare:false,connectionTimeout:10};
const admin=new SQL(config),a=new SQL(config),b=new SQL(config),q=safeQuery(admin),qa=safeQuery(a),qb=safeQuery(b);
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const mid=(n:number)=>`aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12,'0')}`;
const daily=(n:number,subject='dailies:czn',done=true)=>({kind:'daily',key:{subjectId:subject,dayKey:cznDayKey(Date.now())},completed:done,
  changedAt:new Date(Date.now()+n*1000).toISOString(),mutationId:mid(n)});
async function auth(db:SQL,uid:string,role='authenticated'){
  await db.unsafe('reset role');await db.unsafe("select set_config('request.jwt.claim.sub',$1,false)",[uid]);
  if(!['authenticated','anon','calendar_backup'].includes(role))throw new Error('Test role');await db.unsafe('set role '+role);
}
async function waiting(pid:number){
  const end=Date.now()+6000;
  while(Date.now()<end){if((await q("select wait_event_type from pg_stat_activity where pid=$1",[pid]))[0]?.wait_event_type==='Lock')return;
    await new Promise(r=>setTimeout(r,25));}throw new Error('Expected independent PostgreSQL lock wait');
}
try{
  assert.match(String((await q('show server_version'))[0]!.server_version),/^17\./);
  // This harness intentionally initializes an empty, disposable CI database only.
  assert.equal((await q("select to_regclass('public.profiles') is null as empty"))[0]!.empty,true);
  await admin.unsafe(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated,anon;`);
  for(const f of Object.keys(await migrationHashes()))await admin.unsafe(await Bun.file(new URL('../../supabase/migrations/'+f,import.meta.url)).text());
  await q('insert into calendar_backup_control.project_identity(project_ref) values($1)',[project]);
  assert.equal(await detectContract(q,project),1);await assertAccess(q,1);
  await admin.begin(async tx=>{await tx.unsafe((await candidateMigration()).sql);});
  await assertCznTarget(q,project,contract.schemaSha256);await assertAccess(q,2);
  await q('insert into auth.users values($1),($2)',[owner,other]);
  await auth(a,owner);await auth(b,owner);
  let profile=String((await qa('select public.ensure_default_profile() as id'))[0]!.id);
  const old=(query:typeof q,rows:unknown[])=>query('select public.apply_profile_mutations($1,$2::jsonb) as result',[profile,JSON.stringify(rows)]);
  const negotiate=(query:typeof q)=>query('select public.czn_daily_negotiate($1,true) as result',[profile]);
  assert.equal(((await negotiate(qa))[0]!.result as any).enabled,false);
  await q('update public.czn_daily_release set enabled=true');
  // Old writer first: cutover waits until that legacy transaction commits.
  await qa('begin');assert.equal(((await old(qa,[daily(1)]))[0]!.result as any[])[0].outcome,'accepted');
  const bpid=Number((await qb('select pg_backend_pid() as pid'))[0]!.pid);
  const pendingFence=negotiate(qb);await waiting(bpid);await qa('commit');
  await pendingFence;
  assert.equal((await q('select count(*)::int as n from public.czn_daily_marks'))[0]!.n,0);
  const frozen=JSON.stringify(await q('select to_jsonb(t) as row from public.daily_marks t'));
  // A fresh profile proves visibility of the FIRST uncommitted fence after the lock wait.
  // Re-negotiating an already fenced profile would not exercise that MVCC boundary.
  profile=mid(900);
  await q("insert into public.profiles(id,owner_id,name,is_default) values($1,$2,'Fresh cutover race',false)",[profile,owner]);
  await qb('begin');const policy=((await negotiate(qb))[0]!.result as any).policy;
  const apid=Number((await qa('select pg_backend_pid() as pid'))[0]!.pid);
  const pendingOld=old(qa,[daily(2,'dailies:czn',false),daily(3,'dailies:zzz')]);await waiting(apid);await qb('commit');
  assert.deepEqual(((await pendingOld)[0]!.result as any[]).map(r=>r.outcome),['update_required','accepted']);
  assert.equal(JSON.stringify(await q("select to_jsonb(t) as row from public.daily_marks t where subject_id='dailies:czn'")),frozen);
  const v2row=(n:number,done:boolean)=>({policyId:CZN_POLICY,subjectId:'dailies:czn',dayKey:cznDayKey(Date.now()),completed:done,
    changedAt:new Date(Date.now()+n*1000).toISOString(),mutationId:mid(n)});
  const apply=(query:typeof q,row:unknown,epoch=policy.epoch)=>query('select public.czn_daily_apply($1,$2,$3::jsonb) as result',[profile,epoch,JSON.stringify([row])]);
  // Two independent v2 writers serialize; false survives stale true retry.
  const yes=v2row(4,true),no=v2row(5,false);
  await qa('begin');await apply(qa,yes);const pendingFalse=apply(qb,no);await waiting(bpid);await qa('commit');await pendingFalse;
  await apply(qa,yes);assert.equal((await q('select completed from public.czn_daily_marks'))[0]!.completed,false);
  await assert.rejects(apply(qa,no,mid(999)));await assert.rejects(qa('update public.czn_daily_policy set epoch=$1',[mid(999)]));
  await assert.rejects(qa('select calendar_sync_internal.apply_profile_mutations($1,$2::jsonb)',[profile,JSON.stringify([daily(6)])]));
  await auth(b,other);assert.equal((await qb('select * from public.czn_daily_marks')).length,0);await assert.rejects(negotiate(qb));
  await auth(b,'','anon');await assert.rejects(negotiate(qb));await assert.rejects(qb('select * from public.czn_daily_marks'));
  await auth(b,'','calendar_backup');await assertCznBackupRole(qb);await assert.rejects(negotiate(qb));
  // Actual PG17 precision-preserving v1/v2 recovery; fence/false and disabled state survive.
  await q("set timezone='UTC'");
  const snapshot=await readCznSnapshot(q,{createdAt:new Date().toISOString(),projectRef:project,sourceRevision:'a'.repeat(40),schemaSha256:contract.schemaSha256,migrationSha256:contract.migrationSha256},contract.schemaSha256);
  await q('update public.czn_daily_release set enabled=false');
  await restoreCznSnapshot(q,snapshot.base,project,contract.schemaSha256);await restoreCznSnapshot(q,snapshot,project,contract.schemaSha256);
  assert.equal((await q('select epoch::text as epoch from public.czn_daily_policy where profile_id=$1',[profile]))[0]!.epoch,policy.epoch);
  assert.equal((await q('select completed from public.czn_daily_marks'))[0]!.completed,false);
  assert.equal((await q('select enabled from public.czn_daily_release'))[0]!.enabled,false);
  await assert.rejects(apply(qa,v2row(7,true)));
  assert.equal(((await old(qa,[daily(8,'dailies:czn',false)]))[0]!.result as any[])[0].outcome,'update_required');
  console.log('PG17 passed: exact v1/v2 contracts, transactional DDL, owner/JWT-claim/RLS/ACL boundaries, observed two-connection lock waits in both cutover orders, mixed batch, true/false race, guarded v1/v2 recovery and permanent fence. Hosted Auth/PostgREST not simulated.');
}finally{await Promise.allSettled([a.close(),b.close(),admin.close()]);}
