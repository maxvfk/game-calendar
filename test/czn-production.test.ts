import {test,expect} from 'bun:test';
import {mkdtemp,rm,writeFile,readFile,symlink,mkdir,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {candidateDatabase} from '../scripts/czn-cutover/contract.ts';
import {localDrill,localDrillConfig} from '../scripts/czn-cutover/local-drill.ts';
import {detectContract,assertAccess,requireBackupGo,requireRecoveryGo,productionMain,PRODUCTION_PROJECT as project} from '../scripts/czn-cutover/production.ts';
import {readCznSnapshot,planCznRecovery,selectCznProfiles} from '../scripts/czn-cutover/backup.ts';
import {storeCzn,retainCzn} from '../scripts/czn-cutover/production-storage.ts';
import {decryptCzn,verifyCznPair,cznManifest} from '../scripts/czn-cutover/encryption.ts';
import {canonical} from '../scripts/account-backup/model.ts';
import {migrationHashes} from '../scripts/account-backup/generate-contract.ts';
import {PGlite} from '@electric-sql/pglite';
import type {Query} from '../scripts/account-backup/database.ts';
import v1 from '../supabase/backup-contract.v1.json';
import v2 from '../supabase/backup-contract.czn-v2.json';
const revision='a'.repeat(40),id='11111111-1111-4111-8111-111111111111';
test('GO guards and default plan fail before network or decryption',async()=>{
  await productionMain([]);await expect(localDrill([])).rejects.toThrow();
  for(const url of ['postgres://postgres:test@localhost/postgres','postgres://postgres:test@db.'+project+'.supabase.co/czn_recovery_drill','postgres://postgres:test@localhost/czn_recovery_drill?sslmode=disable'])expect(()=>localDrillConfig(url)).toThrow();
  for(const args of [['migrate'],['preflight','--project-ref',project],['backup','--project-ref',project],['plan','--execute'],['restore','--project-ref',project]])
    await expect(productionMain(args)).rejects.toThrow();
  expect(()=>requireBackupGo(project,revision,undefined,project)).toThrow();
  expect(()=>requireBackupGo(project,revision,revision,'different')).toThrow();
  requireBackupGo(project,revision,revision,project);
  const go={operation:'restore-selected-profile-state',projectRef:project,sourceRevision:revision,snapshotSha256:'b'.repeat(64),profiles:[id],expiresAt:new Date(Date.now()+60000).toISOString(),confirmation:'GO restore selected profiles; preserve CZN fences'};
  requireRecoveryGo(go,revision,'b'.repeat(64),[id]);
  for(const patch of [{snapshotSha256:'c'.repeat(64)},{sourceRevision:'c'.repeat(40)},{profiles:[]},{expiresAt:'2000-01-01T00:00:00Z'},{expiresAt:new Date(Date.now()+172800000).toISOString()}])
    expect(()=>requireRecoveryGo({...go,...patch},revision,'b'.repeat(64),[id])).toThrow();
});
test('dual-schema strict preflight accepts v1/v2; rejects drift, partial migration and exposed control/helper',async()=>{
  const db=new PGlite();const q:Query=async(s,p=[]) => (await db.query(s,p)).rows as Record<string,unknown>[];
  try{
    await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
    for(const f of Object.keys(await migrationHashes()))await db.exec(await Bun.file(new URL('../supabase/migrations/'+f,import.meta.url)).text());
    await db.query('insert into calendar_backup_control.project_identity(project_ref) values($1)',[project]);
    expect(await detectContract(q,project)).toBe(1);await assertAccess(q,1);
    await db.exec(await Bun.file(new URL('../supabase/preflight/czn-production-readonly.sql',import.meta.url)).text());
    await db.exec('grant update on public.daily_marks to authenticated');await expect(assertAccess(q,1)).rejects.toThrow('legacy');
    await db.exec('revoke update on public.daily_marks from authenticated');
    await db.exec('create policy widened on public.daily_marks for select to anon using(true)');await expect(assertAccess(q,1)).rejects.toThrow('policy drift');
    await db.exec('drop policy widened on public.daily_marks');
    await db.exec('grant usage on schema calendar_backup_control to anon');await expect(assertAccess(q,1)).rejects.toThrow('identity');
    await db.exec('revoke usage on schema calendar_backup_control from anon;create table public.czn_daily_release(x int)');
    await expect(detectContract(q,project)).rejects.toThrow('Partial');
    await db.exec('drop table public.czn_daily_release;alter table public.daily_marks add column drift int');
    await expect(detectContract(q,project)).rejects.toThrow('schema');
  }finally{await db.close();}
  const candidate=await candidateDatabase();const cq:Query=async(s,p=[]) => (await candidate.query(s,p)).rows as Record<string,unknown>[];
  try{await candidate.query('insert into calendar_backup_control.project_identity(project_ref) values($1)',[project]);
    expect(await detectContract(cq,project)).toBe(2);await assertAccess(cq,2);
    await candidate.exec(await Bun.file(new URL('../supabase/preflight/czn-production-readonly.sql',import.meta.url)).text());
    await candidate.exec('grant usage on schema calendar_sync_internal to authenticated');await expect(assertAccess(cq,2)).rejects.toThrow('privileges');
  }finally{await candidate.close();}
},30000);
test.skipIf(!Bun.which('age')||!Bun.which('age-keygen'))('production retention 30/12, same-day rerun, protected v1/archive, fail-closed corruption and v1/v2 dry-run recovery',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'czn-production-')),db=await candidateDatabase();
  const q:Query=async(s,p=[]) => (await db.query(s,p)).rows as Record<string,unknown>[];
  try{
    await db.query('insert into calendar_backup_control.project_identity(project_ref) values($1)',[project]);
    await db.query('insert into auth.users values($1)',[id]);
    await db.query('insert into profiles(id,owner_id,name,is_default) values($1,$1,\'Synthetic\',true)',[id]);
    const key=join(dir,'identity'),gen=Bun.spawn(['age-keygen','-o',key],{stderr:'pipe'});await new Response(gen.stderr).text();expect(await gen.exited).toBe(0);
    const pub=Bun.spawn(['age-keygen','-y',key],{stdout:'pipe',stderr:'pipe'}),recipient=(await new Response(pub.stdout).text()).trim();expect(await pub.exited).toBe(0);
    const meta={createdAt:'2026-10-23T12:00:00.000Z',projectRef:project,sourceRevision:revision,schemaSha256:v2.schemaSha256,migrationSha256:v2.migrationSha256};
    const snapshot=await readCznSnapshot(q,meta,v2.schemaSha256),root=join(dir,'snapshots');
    await mkdir(join(root,'daily'),{recursive:true});await writeFile(join(root,'daily','legacy-preserved'),'inert');
    await mkdir(join(root,'pre-cutover'),{recursive:true});await writeFile(join(root,'pre-cutover','operator-archive'),'inert');
    const path=await storeCzn(root,snapshot,recipient);await storeCzn(root,snapshot,recipient);
    expect(await decryptCzn(path,key,project,v2.schemaSha256)).toEqual(snapshot);
    const monthly=join(root,'v2/monthly/2026-10.czn-v2.snapshot.age'),first=await readFile(monthly);
    await storeCzn(root,{...snapshot,base:{...snapshot.base,createdAt:'2026-10-23T13:00:00.000Z'}},recipient);
    expect(await readFile(monthly)).toEqual(first);
    // Expand valid encrypted pairs cheaply: retention only inspects public integrity, never decrypts.
    const bytes=await Bun.file(path).bytes();
    for(const kind of ['daily','monthly'] as const)for(let n=1;n<=(kind==='daily'?32:14);n++){
      const date=kind==='daily'?new Date(Date.UTC(2026,7,n)).toISOString().slice(0,10):new Date(Date.UTC(2024,n,1)).toISOString().slice(0,7);
      const name=date+'.czn-v2.snapshot.age',p=join(root,'v2',kind,name),s={...snapshot,base:{...snapshot.base,createdAt:date+(kind==='daily'?'':'-01')+'T00:00:00.000Z'}};
      await writeFile(p,bytes);await writeFile(p+'.manifest.json',canonical(cznManifest(s,bytes,recipient,name)));
    }
    await retainCzn(root,project,v2.schemaSha256);
    expect((await readdir(join(root,'v2/daily'))).length).toBe(60);expect((await readdir(join(root,'v2/monthly'))).length).toBe(24);
    expect(await Bun.file(join(root,'daily','legacy-preserved')).text()).toBe('inert');
    expect(await Bun.file(join(root,'pre-cutover','operator-archive')).text()).toBe('inert');
    const selected=selectCznProfiles(snapshot,[id]);await q('begin read only');await planCznRecovery(q,selected,project,v2.schemaSha256);await q('rollback');
    await q('begin read only');await planCznRecovery(q,snapshot.base,project,v2.schemaSha256);await q('rollback');
    expect(()=>selectCznProfiles(snapshot,[])).toThrow();expect(snapshot.base.schemaSha256).toBe(v1.schemaSha256);
    const before=await readdir(join(root,'v2/daily'));await writeFile(monthly,'corrupt');
    await expect(retainCzn(root,project,v2.schemaSha256)).rejects.toThrow('integrity');expect(await readdir(join(root,'v2/daily'))).toEqual(before);
    await expect(verifyCznPair(monthly)).rejects.toThrow();
    await rm(monthly);await symlink(path,monthly);await expect(storeCzn(root,snapshot,recipient)).rejects.toThrow();
  }finally{await db.close();await rm(dir,{recursive:true,force:true});}
},30000);
