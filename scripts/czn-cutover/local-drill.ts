/** Operator-only isolated recovery. No hosted URL, existing data, Auth provider or production SQL. */
import {SQL} from 'bun';
import {parseArgs} from 'node:util';
import {safeQuery} from '../account-backup/cli.ts';
import {migrationHashes} from '../account-backup/generate-contract.ts';
import {canonical} from '../account-backup/model.ts';
import {candidateMigration} from './contract.ts';
import {decryptCzn} from './encryption.ts';
import {readCznSnapshot,restoreCznSnapshot} from './backup.ts';
import contract from '../../supabase/backup-contract.czn-v2.json';
export function localDrillConfig(raw:string){
  const u=new URL(raw);
  if(u.protocol!=='postgres:'||!['127.0.0.1','localhost'].includes(u.hostname)||u.pathname!=='/czn_recovery_drill'||u.username!=='postgres'||!u.password||u.search||u.hash)
    throw new Error('Only dedicated loopback czn_recovery_drill database accepted');
  return {url:raw,max:1,prepare:false,tls:false,connectionTimeout:10};
}
export async function localDrill(args:string[]){
  const {positionals,values:v}=parseArgs({args,allowPositionals:true,options:{'execute-local':{type:'boolean'},snapshot:{type:'string'},identity:{type:'string'},'project-ref':{type:'string'}}});
  if(positionals.length||!v['execute-local']||!v.snapshot||!v.identity||!v['project-ref'])throw new Error('Explicit --execute-local --snapshot --identity --project-ref required');
  const config=localDrillConfig(process.env.CZN_LOCAL_DRILL_URL??'');
  const snapshot=await decryptCzn(v.snapshot,v.identity,v['project-ref'],contract.schemaSha256),base='base' in snapshot?snapshot.base:snapshot;
  const sql=new SQL(config),q=safeQuery(sql);
  try{
    const version=String((await q('show server_version'))[0]!.server_version);
    if(!/^17\./.test(version))throw new Error('Isolated PostgreSQL 17 required');
    // A new dedicated cluster is required, not just an empty public schema in a real DB.
    const existing=await q(`select 1 from pg_namespace where nspname not in ('public','information_schema') and nspname not like 'pg_%'
      union all select 1 from pg_class where relnamespace='public'::regnamespace
      union all select 1 from pg_roles where rolname in ('anon','authenticated','calendar_backup')`);
    if(existing.length)throw new Error('Drill requires empty isolated cluster; never overwrites an existing schema/role');
    await sql.begin(async tx=>{
      await tx.unsafe(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
        create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
        grant usage on schema auth to authenticated,anon;`);
      for(const f of Object.keys(await migrationHashes()))await tx.unsafe(await Bun.file(new URL('../../supabase/migrations/'+f,import.meta.url)).text());
      await tx.unsafe((await candidateMigration()).sql);
      await tx.unsafe('insert into calendar_backup_control.project_identity(project_ref) values($1)',[v['project-ref']!]);
      for(const owner of new Set(base.data.profiles.map(p=>String(p.owner_id))))await tx.unsafe('insert into auth.users values($1)',[owner]);
    });
    await q("set timezone='UTC'");await restoreCznSnapshot(q,snapshot,v['project-ref'],contract.schemaSha256);
    const result=await readCznSnapshot(q,{...base,schemaSha256:contract.schemaSha256},contract.schemaSha256);
    if('base' in snapshot){
      // Normalize expected timestamps with PostgreSQL to retain full microseconds.
      for(const table of ['czn_daily_policy','czn_daily_marks'] as const){
        const expected=(await q(`select to_jsonb(r) as row from jsonb_populate_recordset(null::public.${table},$1::jsonb) r`,[canonical(snapshot.extension[table])])).map(r=>canonical(r.row)).sort();
        if(canonical(result.extension[table].map(r=>canonical(r)).sort())!==canonical(expected))throw new Error('Recovered extension mismatch');
      }
    }
    if(result.extension.czn_daily_release[0]!.enabled)throw new Error('Drill must remain disabled');
    console.log('Isolated PG17 encrypted recovery verified; local database contains personal data. Dispose of that local cluster privately. No hosted access or Auth provider restore.');
  }finally{await sql.close();}
}
if(import.meta.main)localDrill(process.argv.slice(2)).catch(()=>{console.error('Local recovery drill refused or failed; inspect privately without sharing snapshot data or keys');process.exitCode=1;});
