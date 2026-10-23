/** CI-only synthetic encrypted input for the exact operator drill CLI. */
import {strict as assert} from 'node:assert';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {cznDayKey} from '../../src/shared/cznDaily.ts';
import {candidateDatabase} from './contract.ts';
import {readCznSnapshot} from './backup.ts';
import {encryptCzn} from './encryption.ts';
import {localDrill,localDrillConfig} from './local-drill.ts';
import {PRODUCTION_PROJECT as project} from './production.ts';
import type {Query} from '../account-backup/database.ts';
import contract from '../../supabase/backup-contract.czn-v2.json';
for(const url of ['postgres://postgres:test@db.'+project+'.supabase.co/czn_recovery_drill','postgres://postgres:test@localhost/postgres','postgres://postgres:test@localhost/czn_recovery_drill?sslmode=disable'])assert.throws(()=>localDrillConfig(url));
const dir=await mkdtemp(join(tmpdir(),'czn-local-drill-')),db=await candidateDatabase(),q:Query=async(s,p=[]) => (await db.query(s,p)).rows as Record<string,unknown>[];
try{
  const id='11111111-1111-4111-8111-111111111111';
  await q('insert into calendar_backup_control.project_identity(project_ref) values($1)',[project]);
  await q('insert into auth.users values($1)',[id]);await q("insert into public.profiles(id,owner_id,name,is_default) values($1,$1,'Synthetic drill',true)",[id]);
  await q('insert into public.czn_daily_policy(profile_id,epoch) values($1,$1)',[id]);
  await q(`insert into public.czn_daily_marks values($1,'czn-daily-utc18-opening-v1',$1,'dailies:czn',$2,false,'2026-10-23T12:00:00.123456Z',$1,'2026-10-23T12:00:01.654321Z')`,[id,cznDayKey(Date.now())]);
  const snapshot=await readCznSnapshot(q,{createdAt:new Date().toISOString(),projectRef:project,sourceRevision:'a'.repeat(40),schemaSha256:contract.schemaSha256,migrationSha256:contract.migrationSha256},contract.schemaSha256);
  const key=join(dir,'identity'),gen=Bun.spawn(['age-keygen','-o',key],{stderr:'pipe'});await new Response(gen.stderr).text();assert.equal(await gen.exited,0);
  const pub=Bun.spawn(['age-keygen','-y',key],{stdout:'pipe',stderr:'pipe'}),recipient=(await new Response(pub.stdout).text()).trim();assert.equal(await pub.exited,0);
  const path=await encryptCzn(dir,snapshot,recipient),args=['--execute-local','--project-ref',project,'--snapshot',path,'--identity',key];
  await localDrill(args);await assert.rejects(localDrill(args),/empty isolated cluster/);
  console.log('Synthetic operator drill passed: real age decrypt, empty PG17 recovery, false/epoch/microseconds verified; second run refused without writes.');
}finally{await db.close();await rm(dir,{recursive:true,force:true});}
