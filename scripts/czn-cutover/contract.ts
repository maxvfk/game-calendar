import { PGlite } from '@electric-sql/pglite';
import { readdir } from 'node:fs/promises';
import { contractSql, assertBackupRole, type Query } from '../account-backup/database.ts';
import { migrationHashes } from '../account-backup/generate-contract.ts';
import { normalizeContract } from '../account-backup/contract.ts';
import { TABLES, canonical, sha256 } from '../account-backup/model.ts';
export const CZN_TABLES=['czn_daily_release','czn_daily_policy','czn_daily_marks'] as const;
export const ALL_TABLES=[...TABLES,...CZN_TABLES];
export async function candidateMigration(){
  const dir=new URL('../../supabase/czn-cutover/',import.meta.url);
  const files=(await readdir(dir)).filter(f=>f.endsWith('.sql'));
  if(files.length!==1)throw new Error('Expected one reviewed CZN candidate migration');
  return {name:files[0]!,sql:await Bun.file(new URL(files[0]!,dir)).text()};
}
export async function candidateDatabase(){
  const db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated,anon;`);
  const hashes=await migrationHashes();
  for(const f of Object.keys(hashes))await db.exec(await Bun.file(new URL('../../supabase/migrations/'+f,import.meta.url)).text());
  await db.exec((await candidateMigration()).sql);
  return db;
}
export async function cznContract(query:Query){
  const sql=contractSql.replace("p.pronamespace='public'::regnamespace","p.pronamespace in ('public'::regnamespace,'calendar_sync_internal'::regnamespace)")
    .replace("'apply_profile_mutations'))","'apply_profile_mutations','czn_daily_negotiate','czn_daily_apply'))");
  const base=normalizeContract((await query(sql,[ALL_TABLES]))[0]!.contract);
  const policies=await query(`select schemaname,tablename,policyname,permissive,roles::text,cmd,qual,with_check
    from pg_policies where schemaname='public' and tablename=any($1::text[]) order by tablename,policyname`,[ALL_TABLES]);
  const acls=await query(`select n.nspname,p.proname,p.proacl::text,pg_get_userbyid(p.proowner) as owner
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='calendar_sync_internal' or (n.nspname='public' and p.proname in
    ('apply_profile_mutations','czn_daily_negotiate','czn_daily_apply')) order by n.nspname,p.proname`);
  return {base,policies,acls};
}
export async function generatedCznContract(){
  const db=await candidateDatabase();try{
    const query:Query=async(s,p=[]) => (await db.query(s,p)).rows as Record<string,unknown>[];
    const contract=await cznContract(query),candidate=await candidateMigration();
    return {schemaVersion:2,schemaSha256:sha256(canonical(contract)),
      migrationSha256:{...await migrationHashes(),[candidate.name]:sha256(candidate.sql)},contract};
  }finally{await db.close();}
}
export async function assertCznTarget(query:Query,project:string,hash:string){
  const marker=await query('select project_ref from calendar_backup_control.project_identity');
  if(marker.length!==1||marker[0]!.project_ref!==project)throw new Error('Project mismatch');
  if(sha256(canonical(await cznContract(query)))!==hash)throw new Error('CZN schema mismatch');
  const uncovered=await query(`select 1 from pg_constraint k join pg_class p on p.oid=k.confrelid
    join pg_class c on c.oid=k.conrelid where k.contype='f' and p.relnamespace='public'::regnamespace
    and p.relname=any($1::text[]) and not(c.relnamespace='public'::regnamespace and c.relname=any($1::text[]))`,[ALL_TABLES]);
  if(uncovered.length)throw new Error('Uncovered child table');
}
export async function assertCznBackupRole(query:Query){
  await assertBackupRole(query);
  const rows=await query(`select relrowsecurity,relforcerowsecurity,
    has_table_privilege(current_user,oid,'SELECT') as readable,
    has_table_privilege(current_user,oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as writable
    from pg_class where relnamespace='public'::regnamespace and relname=any($1::text[])`,[CZN_TABLES]);
  if(rows.length!==3||rows.some(r=>!r.relrowsecurity||r.relforcerowsecurity||!r.readable||r.writable))throw new Error('CZN backup grants/RLS');
  const unsafe=await query(`select 1 from pg_proc where pronamespace='calendar_sync_internal'::regnamespace
    and has_function_privilege(current_user,oid,'EXECUTE')`);
  if(unsafe.length)throw new Error('Backup can execute internal RPC');
}
if(import.meta.main)await Bun.write(new URL('../../supabase/backup-contract.czn-v2.json',import.meta.url),canonical(await generatedCznContract())+'\n');
