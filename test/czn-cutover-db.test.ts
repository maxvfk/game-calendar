import {beforeAll,afterAll,test,expect} from 'bun:test';
import type {PGlite} from '@electric-sql/pglite';
import {candidateDatabase,generatedCznContract,assertCznTarget,assertCznBackupRole} from '../scripts/czn-cutover/contract.ts';
import {readCznSnapshot,validateCznSnapshot,restoreCznSnapshot} from '../scripts/czn-cutover/backup.ts';
import {assertTarget,readRows,type Query} from '../scripts/account-backup/database.ts';
import {makeSnapshot,canonical} from '../scripts/account-backup/model.ts';
import oldContract from '../supabase/backup-contract.v1.json';
import newContract from '../supabase/backup-contract.czn-v2.json';
import {CZN_POLICY,cznDayKey} from '../src/shared/cznDaily.ts';
let db:PGlite,profile:string,epoch:string,baseBefore:ReturnType<typeof makeSnapshot>;
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const id=(n:number)=>`aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12,'0')}`;
const project='vzzudezdigjwbwfejlsg';
const q:Query=async(s,p=[]) => (await db.query(s,p)).rows as Record<string,unknown>[];
async function as(uid:string|null,fn:()=>Promise<void>,role='authenticated'){
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid??'']);await db.exec(`set role ${role}`);
  try{await fn();}finally{await db.exec('reset role');}
}
const daily=(n:number,subjectId='dailies:czn',dayKey='2026-10-22',completed=true)=>({kind:'daily',key:{subjectId,dayKey},
  completed,changedAt:`2026-10-23T${String(10+n).padStart(2,'0')}:00:00Z`,mutationId:id(n)});
const apply=(rows:unknown[])=>q('select public.apply_profile_mutations($1,$2::jsonb) as reply',[profile,JSON.stringify(rows)]);
const newRow=(n:number,completed=true)=>({policyId:CZN_POLICY,subjectId:'dailies:czn',dayKey:cznDayKey(Date.now()),
  completed,changedAt:new Date(Date.now()+n*1000).toISOString(),mutationId:id(100+n)});
const applyNew=(rows:unknown[],e=epoch)=>q('select public.czn_daily_apply($1,$2,$3::jsonb) as reply',[profile,e,JSON.stringify(rows)]);
beforeAll(async()=>{
  db=await candidateDatabase();await db.query('insert into auth.users values ($1),($2)',[owner,other]);
  await db.query('insert into calendar_backup_control.project_identity(project_ref) values($1)',[project]);
  await as(owner,async()=>{profile=String((await q('select public.ensure_default_profile() as id'))[0]!.id);await apply([daily(1)]);});
  baseBefore=makeSnapshot(await readRows(q),{createdAt:new Date().toISOString(),projectRef:project,sourceRevision:'a'.repeat(40),
    schemaSha256:oldContract.schemaSha256,migrationSha256:oldContract.migrationSha256});
},15000);
afterAll(async()=>{await db.close();});
test('disabled capability never creates a policy; unauthenticated/other owner denied',async()=>{
  await as(owner,async()=>{const r=await q('select public.czn_daily_negotiate($1,true) as result',[profile]);
    expect(r[0]!.result).toMatchObject({protocol:2,enabled:false,policy:null});});
  await as(other,async()=>{await expect(q('select public.czn_daily_negotiate($1,true)',[profile])).rejects.toThrow();});
  await as(null,async()=>{await expect(q('select public.czn_daily_negotiate($1,true)',[profile])).rejects.toThrow();},'anon');
});
test('cutover returns immutable server epoch and does not rewrite legacy rows',async()=>{
  const before=canonical(await q('select * from public.daily_marks'));
  await db.exec('update public.czn_daily_release set enabled=true');
  await as(owner,async()=>{const f=await q('select public.czn_daily_negotiate($1,true) as result',[profile]);
    epoch=(f[0]!.result as any).policy.epoch;
    expect((await q('select public.czn_daily_negotiate($1,true) as result',[profile]))[0]!.result).toEqual(f[0]!.result);
  });expect(canonical(await q('select * from public.daily_marks'))).toBe(before);
});
test('old later same-key and distinct-key false held; other game commits; helper/direct writes denied',async()=>{
  const before=canonical(await q('select * from public.daily_marks'));
  await as(owner,async()=>{expect((await apply([daily(2,'dailies:czn','2026-10-22',false),daily(3,'dailies:czn','2026-10-21',false),daily(4,'dailies:zzz')]))[0]!.reply)
    .toEqual([{mutationId:id(2),outcome:'update_required'},{mutationId:id(3),outcome:'update_required'},{mutationId:id(4),outcome:'accepted'}]);
    await expect(q('select calendar_sync_internal.apply_profile_mutations($1,$2::jsonb)',[profile,JSON.stringify([daily(5)])])).rejects.toThrow();
    await expect(q('update public.czn_daily_policy set epoch=$1',[id(90)])).rejects.toThrow();
    await expect(q('insert into public.czn_daily_marks default values')).rejects.toThrow();
  });expect(canonical(await q("select * from public.daily_marks where subject_id='dailies:czn'"))).toBe(before);
});
test('strict v2 epoch/scope/date/window; idempotent true then false; replay never resurrects',async()=>{
  const yes=newRow(1),no=newRow(2,false);
  await as(owner,async()=>{
    await expect(applyNew([yes],id(999))).rejects.toThrow('epoch mismatch');
    await expect(applyNew([{...yes,extra:'strip-me'}])).rejects.toThrow();
    await expect(applyNew([{...yes,subjectId:'dailies:zzz'}])).rejects.toThrow();
    await expect(applyNew([{...yes,dayKey:'2026-02-30'}])).rejects.toThrow();
    await expect(applyNew([{...yes,dayKey:'2020-01-01'}])).rejects.toThrow();
    await expect(applyNew([{...yes,changedAt:'infinity'}])).rejects.toThrow();
    await applyNew([yes]);await applyNew([yes]);await applyNew([no]);
    expect(((await applyNew([yes]))[0]!.reply as any[])[0].outcome).toBe('superseded');
    await expect(applyNew([{...no,completed:true}])).rejects.toThrow();
    expect((await q('select completed from public.czn_daily_marks'))[0]!.completed).toBe(false);
  });
  await as(other,async()=>{expect(await q('select * from public.czn_daily_marks')).toHaveLength(0);await expect(applyNew([yes])).rejects.toThrow();});
});
test('disabling prevents v2 writes but never reopens v1 CZN',async()=>{
  await db.exec('update public.czn_daily_release set enabled=false');
  await as(owner,async()=>{await expect(applyNew([newRow(3)])).rejects.toThrow('read-only');
    expect(((await apply([daily(6)]))[0]!.reply as any[])[0].outcome).toBe('update_required');});
});
test('v1 preflight fails closed; v2 fingerprint and restricted backup role pass',async()=>{
  await expect(assertTarget(q,project,oldContract.schemaSha256)).rejects.toThrow();
  await assertCznTarget(q,project,newContract.schemaSha256);
  await as(null,async()=>{await assertCznBackupRole(q);
    expect(await q('select * from public.czn_daily_marks')).toHaveLength(1);
    await expect(q('select public.czn_daily_negotiate($1,true)',[profile])).rejects.toThrow();},'calendar_backup');
});
test('v2 snapshot validates all columns/false; v1 restore retains live fence, frozen history and new tombstone',async()=>{
  const meta={createdAt:new Date().toISOString(),projectRef:project,sourceRevision:'a'.repeat(40),schemaSha256:newContract.schemaSha256,migrationSha256:newContract.migrationSha256};
  const snapshot=await readCznSnapshot(q,meta,newContract.schemaSha256);
  expect(validateCznSnapshot(snapshot,project,newContract.schemaSha256)).toEqual(snapshot);
  const bad=structuredClone(snapshot);bad.extension.czn_daily_marks[0]!.completed=true;
  expect(()=>validateCznSnapshot(bad,project,newContract.schemaSha256)).toThrow();
  const before=canonical(await q('select * from public.czn_daily_policy'));
  await restoreCznSnapshot(q,baseBefore,project,newContract.schemaSha256);
  expect(canonical(await q('select * from public.czn_daily_policy'))).toBe(before);
  expect((await q('select completed from public.czn_daily_marks'))[0]!.completed).toBe(false);
  await restoreCznSnapshot(q,snapshot,project,newContract.schemaSha256);
  expect((await q('select completed from public.czn_daily_marks'))[0]!.completed).toBe(false);
  const clash=structuredClone(snapshot);clash.extension.czn_daily_policy[0]!.epoch=id(999);
  // Correctly digesting a conflicting fence still must refuse at recovery planning.
  clash.extension.czn_daily_marks=[];
  const {makeCznSnapshot}=await import('../scripts/czn-cutover/backup.ts');
  await expect(restoreCznSnapshot(q,makeCznSnapshot(clash.base,clash.extension,newContract.schemaSha256),project,newContract.schemaSha256)).rejects.toThrow('fence differs');
});
test('v2 contract regenerates exactly; v1 contract stays unchanged',async()=>{
  expect(await generatedCznContract()).toEqual(newContract);
},15000);
test.skipIf(!Bun.which('age')||!Bun.which('age-keygen'))('real age v2 and old v1 decrypt validate then guarded recovery (synthetic only)',async()=>{
  const {mkdtemp,rm,readFile}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const {encryptCzn,decryptCzn}=await import('../scripts/czn-cutover/encryption.ts');
  const {ageEncrypt,storeEncrypted}=await import('../scripts/account-backup/storage.ts');
  const dir=await mkdtemp(join(tmpdir(),'czn-age-'));try{
    const identity=join(dir,'identity');
    const gen=Bun.spawn(['age-keygen','-o',identity],{stdout:'pipe',stderr:'pipe'});
    await new Response(gen.stderr).text();expect(await gen.exited).toBe(0);
    const pub=Bun.spawn(['age-keygen','-y',identity],{stdout:'pipe',stderr:'pipe'});
    const recipient=(await new Response(pub.stdout).text()).trim();expect(await pub.exited).toBe(0);
    const meta={createdAt:new Date().toISOString(),projectRef:project,sourceRevision:'a'.repeat(40),schemaSha256:newContract.schemaSha256,migrationSha256:newContract.migrationSha256};
    const s=await readCznSnapshot(q,meta,newContract.schemaSha256);
    const path=await encryptCzn(join(dir,'v2'),s,recipient);
    const restored=await decryptCzn(path,identity,project,newContract.schemaSha256);
    expect(restored).toEqual(s);await restoreCznSnapshot(q,restored,project,newContract.schemaSha256);
    expect((await q('select completed from public.czn_daily_marks'))[0]!.completed).toBe(false);
    const manifest=await readFile(path+'.manifest.json','utf8');expect(manifest).not.toContain(profile);expect(manifest).not.toContain('counts');
    const bytes=await ageEncrypt(canonical(baseBefore),recipient);
    expect(bytes).toBeInstanceOf(Uint8Array);
    const oldPath=await storeEncrypted(join(dir,'v1'),baseBefore,bytes,recipient);
    const v1=await decryptCzn(oldPath,identity,project,newContract.schemaSha256);
    expect(v1).toEqual(baseBefore);await restoreCznSnapshot(q,v1,project,newContract.schemaSha256);
    expect((await q('select epoch from public.czn_daily_policy'))[0]!.epoch).toBe(epoch);
    const raw=await Bun.file(path).bytes();raw[raw.length-1]=raw[raw.length-1]!^1;await Bun.write(path,raw);
    await expect(decryptCzn(path,identity,project,newContract.schemaSha256)).rejects.toThrow('integrity');
  }finally{await rm(dir,{recursive:true,force:true});}
},15000);
test('two actual new clients sync through real SQL; imported legacy and stale old RPC cannot mutate policy false',async()=>{
  const {readCzn,bindCznPolicy,queueCzn,syncCzn,importLegacyCzn}=await import('../src/client/account/cznProtocol.ts');
  const {CznPolicy,CznMutation}=await import('../src/shared/cznDaily.ts');
  await db.exec('update public.czn_daily_release set enabled=true');
  let negotiated:any;
  await as(owner,async()=>{negotiated=(await q('select public.czn_daily_negotiate($1,false) as result',[profile]))[0]!.result;});
  negotiated.policy=CznPolicy.parse(negotiated.policy);
  class Store {v=new Map<string,string>();getItem(k:string){return this.v.get(k)??null;}setItem(k:string,v:string){this.v.set(k,v);}}
  const a=new Store(),b=new Store();
  const state=bindCznPolicy(a,readCzn(a,profile),negotiated.policy);
  bindCznPolicy(b,readCzn(b,profile),negotiated.policy);
  queueCzn(a,state,cznDayKey(Date.now()),false,Date.now()+10000);
  const transport={negotiate:async()=>negotiated,pull:async()=>{
    let rows:Record<string,unknown>[]=[];await as(owner,async()=>{rows=await q('select to_jsonb(t) as row from public.czn_daily_marks t');});
    return rows.map(({row}:any)=>CznMutation.parse({policyId:row.policy_id,subjectId:row.subject_id,dayKey:row.day_key,
      completed:row.completed,changedAt:row.changed_at,mutationId:row.mutation_id}));
  },push:async(_profile:string,e:string,rows:unknown[])=>{await as(owner,async()=>{await applyNew(rows,e);});}};
  const synced=await syncCzn(a,profile,()=>true,transport,true);expect(synced.state.pending).toHaveLength(0);
  const second=await syncCzn(b,profile,()=>true,transport,true);expect(second.state.rows[0]!.completed).toBe(false);
  importLegacyCzn(b,second.state,{format:'gacha-tracker-export',version:1,daily:{'dailies:czn':{days:[cznDayKey(Date.now())]}}});
  await as(owner,async()=>{await apply([daily(7,'dailies:czn',cznDayKey(Date.now()),true)]);});
  expect((await syncCzn(b,profile,()=>true,transport,true)).state.rows[0]!.completed).toBe(false);
});
