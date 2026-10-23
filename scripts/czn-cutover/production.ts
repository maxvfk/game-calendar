/** GO boundary: no network by default; no migration or enablement command exists here. */
import {SQL} from 'bun';
import {parseArgs} from 'node:util';
import {readFile} from 'node:fs/promises';
import {z} from 'zod';
import {connectionConfig,safeQuery} from '../account-backup/cli.ts';
import {assertTarget,assertBackupRole,readRows,restorePlan,writeRestore,type Query} from '../account-backup/database.ts';
import {makeSnapshot,canonical,sha256,TABLES,type Snapshot} from '../account-backup/model.ts';
import {ageEncrypt,storeEncrypted} from '../account-backup/storage.ts';
import {assertCznTarget,assertCznBackupRole,candidateMigration} from './contract.ts';
import {readCznSnapshot,selectCznProfiles,planCznRecovery,restoreCznSnapshot} from './backup.ts';
import {decryptCzn,verifyCznPair} from './encryption.ts';
import {verifyPair} from '../account-backup/storage.ts';
import {storeCzn} from './production-storage.ts';
import v1 from '../../supabase/backup-contract.v1.json';
import v2 from '../../supabase/backup-contract.czn-v2.json';
export const PRODUCTION_PROJECT='vzzudezdigjwbwfejlsg';
export async function detectContract(query:Query,project:string){
  const present=await query("select relname from pg_class where relnamespace='public'::regnamespace and relname=any($1::text[])",[['czn_daily_release','czn_daily_policy','czn_daily_marks']]);
  if(present.length===0){await assertTarget(query,project,v1.schemaSha256);return 1 as const;}
  if(present.length!==3)throw new Error('Partial CZN migration; backup refused');
  await assertCznTarget(query,project,v2.schemaSha256);return 2 as const;
}
export async function assertAccess(query:Query,version:1|2){
  // Control schema intentionally has no RLS: effective schema/table privileges must deny clients.
  const policies=await query(`select schemaname,tablename,policyname,permissive,roles::text,cmd,qual,with_check
    from pg_policies where schemaname='public' and tablename=any($1::text[]) order by tablename,policyname`,[[...TABLES]]);
  const expected=v2.contract.policies.filter(p=>(TABLES as readonly string[]).includes(p.tablename));
  if(canonical(policies)!==canonical(expected))throw new Error('Legacy owner/backup policy drift');
  for(const role of ['anon','authenticated']){
    const legacy=await query(`select relname,relrowsecurity,relforcerowsecurity,
      has_table_privilege($1,oid,'SELECT') as readable,
      has_table_privilege($1,oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as writable
      from pg_class where relnamespace='public'::regnamespace and relname=any($2::text[])`,[role,[...TABLES]]);
    if(legacy.length!==7||legacy.some(r=>!r.relrowsecurity||r.relforcerowsecurity||r.writable||r.readable!==(role==='authenticated')))
      throw new Error('Unsafe legacy client privileges/RLS');
    const p=(await query(`select has_schema_privilege($1,'calendar_backup_control','USAGE,CREATE') as control,
      has_table_privilege($1,'calendar_backup_control.project_identity','INSERT,UPDATE,DELETE,TRUNCATE') as marker_write`,[role]))[0]!;
    if(p.control||p.marker_write)throw new Error('Exposed backup identity');
    if(version===2){
      const rows=await query(`select has_schema_privilege($1,'calendar_sync_internal','USAGE,CREATE') as internal,
        exists(select 1 from pg_proc where pronamespace='calendar_sync_internal'::regnamespace and has_function_privilege($1,oid,'EXECUTE')) as helper,
        exists(select 1 from pg_class where relnamespace='public'::regnamespace and relname=any($2::text[]) and
          (not relrowsecurity or relforcerowsecurity or has_table_privilege($1,oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))) as unsafe`,
        [role,['czn_daily_release','czn_daily_policy','czn_daily_marks']]);
      if(Object.values(rows[0]!).some(Boolean))throw new Error('Unsafe CZN client privileges/RLS');
    }
  }
}
export function requireBackupGo(project:string,revision:string,go:string|undefined,confirm:string|undefined){
  if(!/^[a-f0-9]{40}$/.test(revision)||project!==confirm||go!==revision)throw new Error('Backup requires exact project and independently approved immutable GO revision');
}
const recoveryGo=z.object({operation:z.literal('restore-selected-profile-state'),projectRef:z.literal(PRODUCTION_PROJECT),
  sourceRevision:z.string().regex(/^[a-f0-9]{40}$/),snapshotSha256:z.string().regex(/^[a-f0-9]{64}$/),
  profiles:z.array(z.string().uuid()).nonempty(),expiresAt:z.string().datetime(),confirmation:z.literal('GO restore selected profiles; preserve CZN fences')}).strict();
export function requireRecoveryGo(input:unknown,revision:string,cipherHash:string,profiles:string[],now=Date.now()){
  const go=recoveryGo.parse(input),expiry=Date.parse(go.expiresAt);
  if(go.sourceRevision!==revision||go.snapshotSha256!==cipherHash||canonical([...go.profiles].sort())!==canonical([...profiles].sort())||expiry<=now||expiry>now+86400000)
    throw new Error('Recovery GO does not match exact snapshot, revision, profiles or 24-hour approval window');
}
async function assertSourceRevision(revision:string){
  const proc=Bun.spawn(['git','-C',new URL('../../',import.meta.url).pathname,'rev-parse','HEAD'],{stdout:'pipe',stderr:'pipe'});
  const [head,,code]=await Promise.all([new Response(proc.stdout).text(),new Response(proc.stderr).text(),proc.exited]);
  if(code!==0||head.trim()!==revision)throw new Error('GO revision must be the checked-out implementation commit');
}
export async function productionMain(args:string[]){
  const {positionals,values:v}=parseArgs({args,allowPositionals:true,options:{'project-ref':{type:'string'},'confirm-project':{type:'string'},
    'source-revision':{type:'string'},'go-revision':{type:'string'},'go-file':{type:'string'},output:{type:'string'},snapshot:{type:'string'},identity:{type:'string'},
    profile:{type:'string',multiple:true},'all-profiles':{type:'boolean'},execute:{type:'boolean'},write:{type:'boolean'},'read-only':{type:'boolean'}}});
  const command=positionals[0]??'plan';
  if(positionals.length>1||!['plan','preflight','backup','validate','restore'].includes(command))throw new Error('Expected plan|preflight|backup|validate|restore');
  if(command==='plan'){
    if(Object.keys(v).length)throw new Error('Plan accepts no flags');
    const migration=await candidateMigration();
    console.log(canonical({status:'awaiting-production-GO',projectRef:PRODUCTION_PROJECT,productionWrites:false,clientEnabled:false,
      v1:v1.schemaSha256,v2:v2.schemaSha256,migration:migration.name,migrationSha256:sha256(migration.sql),
      runbook:'docs/CZN-PRODUCTION-CUTOVER.md'}));return;
  }
  const project=v['project-ref'];if(!project||!/^[a-z]{20}$/.test(project))throw new Error('Exact --project-ref required');
  const allowed:Record<string,string[]>={preflight:['project-ref','read-only'],backup:['project-ref','confirm-project','source-revision','go-revision','execute','output'],
    validate:['project-ref','snapshot','identity'],restore:['project-ref','confirm-project','source-revision','snapshot','identity','profile','all-profiles','read-only','write','go-file']};
  if(Object.keys(v).some(k=>!allowed[command]!.includes(k)))throw new Error('Unexpected operation flag');
  if(command==='validate'||command==='restore'){
    if(!v.snapshot||!v.identity)throw new Error('Encrypted --snapshot and local --identity required');
    const snapshot=await decryptCzn(v.snapshot,v.identity,project,v2.schemaSha256);
    if(command==='validate'){console.log('Encrypted v1/v2 snapshot validated in memory');return;}
    if(Boolean(v.profile?.length)===Boolean(v['all-profiles']))throw new Error('Choose explicit profiles OR all-profiles');
    const selected=selectCznProfiles(snapshot,v['all-profiles']?'all':v.profile!);
    const base='base' in selected?selected.base:selected,ids=base.data.profiles.map(p=>String(p.id));
    if(v.write){
      if(v['read-only']||!v['go-file']||v['confirm-project']!==project||project!==PRODUCTION_PROJECT||!v['source-revision'])throw new Error('Write requires exact production project and independent GO file');
      const manifest=v.snapshot.includes('.czn-v2.')?await verifyCznPair(v.snapshot):await verifyPair(v.snapshot);
      requireRecoveryGo(JSON.parse(await readFile(v['go-file'],'utf8')),v['source-revision'],manifest.ciphertextSha256,ids);
      await assertSourceRevision(v['source-revision']);
    }else if(!v['read-only']||v['go-file']||v['confirm-project']||v['source-revision'])throw new Error('Default recovery is dry-run; explicitly use --read-only');
    const sql=new SQL(connectionConfig(process.env.RESTORE_DATABASE_URL??'',project,false));
    try{const q=safeQuery(sql);
      if(!v.write)await q('begin isolation level repeatable read read only');
      const version=await detectContract(q,project);await assertAccess(q,version);
      if(v.write){
        if(version===2)await restoreCznSnapshot(q,selected,project,v2.schemaSha256);
        else{
          if('base' in selected)throw new Error('v2 recovery requires v2 schema');
          await sql.begin('read write',async tx=>{const tq=safeQuery(tx);await tq("set local lock_timeout='10s'");await tq("set local statement_timeout='120s'");
            await tq('lock table public.profiles,public.progress,public.daily_marks,public.ignored,public.preferences,public.custom_games,public.custom_events in share row exclusive mode');
            await assertTarget(tq,project,v1.schemaSha256);await restorePlan(tq,selected.data);await writeRestore(tq,selected.data);});
        }
      }else{if(version===2)await planCznRecovery(q,selected,project,v2.schemaSha256);
        else{if('base' in selected)throw new Error('v2 recovery requires v2 schema');await restorePlan(q,selected.data);}await q('rollback');}
      console.log(v.write?'Selected recovery committed; fences retained':'Recovery dry-run passed; no writes');
    }finally{await sql.close();}return;
  }
  const revision=v['source-revision'];
  if(command==='backup'){
    if(!v.execute||!v.output||!revision)throw new Error('Backup requires --execute --output --source-revision and GO');
    requireBackupGo(project,revision,v['go-revision'],v['confirm-project']);await assertSourceRevision(revision);
  }else if(!v['read-only'])throw new Error('Preflight requires --read-only; no writes are available');
  const sql=new SQL(connectionConfig(process.env.BACKUP_DATABASE_URL??'',project,true));
  try{
    const snapshot=await sql.begin('isolation level repeatable read read only',async tx=>{
      const q=safeQuery(tx);await q("set local timezone='UTC'");await q("set local statement_timeout='120s'");
      const version=await detectContract(q,project);await assertAccess(q,version);
      if(version===1)await assertBackupRole(q);else await assertCznBackupRole(q);
      if(command==='preflight'){console.log(canonical({version,contract:version===1?v1.schemaSha256:v2.schemaSha256,verified:true,readOnly:true}));return null;}
      const createdAt=String((await q("select to_char(transaction_timestamp() at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') as at"))[0]!.at);
      const meta={createdAt,projectRef:project,sourceRevision:revision!,schemaSha256:v1.schemaSha256,migrationSha256:version===1?v1.migrationSha256:v2.migrationSha256};
      return version===1?makeSnapshot(await readRows(q),meta):readCznSnapshot(q,meta,v2.schemaSha256);
    });
    if(snapshot){const recipient=process.env.AGE_RECIPIENT??'';
      if('base' in snapshot)await storeCzn(v.output!,snapshot,recipient);
      else await storeEncrypted(v.output!,snapshot as Snapshot,await ageEncrypt(canonical(snapshot),recipient),recipient);
      console.log('Encrypted versioned backup verified; matching namespace retention applied');}
  }finally{await sql.close();}
}
if(import.meta.main)productionMain(process.argv.slice(2)).catch(()=>{console.error('CZN readiness operation refused or failed; inspect locally without sharing credentials or row data');process.exitCode=1;});
