import { SQL } from 'bun';
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { checkServerIdentity } from 'node:tls';
import { TABLES, canonical, makeSnapshot, validateSnapshot, type Snapshot } from './model.ts';
import { assertTarget, assertBackupRole, readRows, restorePlan, selectProfiles, writeRestore, type Query } from './database.ts';
import { ageDecrypt, ageEncrypt, storeEncrypted, verifyPair } from './storage.ts';

export function safeQuery(sql: SQL): Query {
  return async (statement,params=[]) => {
    try {
      // Bun.SQL unsafe parameters do not infer a JS array as a PG array.
      // Use its explicit array encoder; SQL casts handle UUID[] destinations.
      return await sql.unsafe(statement,params.map(p=>Array.isArray(p)?sql.array(p,'TEXT'):p));
    }
    catch (e) {
      const code=e instanceof SQL.PostgresError ? e.errno ?? e.code : 'transport';
      // DB errors can contain row values or credentials. Never print raw errors.
      throw new Error(`Database request failed (${code}); inspect locally without sharing personal data`);
    }
  };
}
export function connectionConfig(url: string,project: string,backup: boolean) {
  const u=new URL(url);
  const role=backup?'calendar_backup':'postgres';
  if (!['postgres:','postgresql:'].includes(u.protocol) || u.pathname!=='/postgres' ||
      (u.port!=='' && u.port!=='5432') || !u.password || u.search) throw new Error('Expected a port 5432 Postgres/session-pooler URL without query parameters');
  const direct=u.hostname===`db.${project}.supabase.co` && decodeURIComponent(u.username)===role;
  const pooled=/^aws-[a-z0-9-]+\.pooler\.supabase\.com$/.test(u.hostname) && decodeURIComponent(u.username)===`${role}.${project}`;
  if (!direct && !pooled) throw new Error('Connection project/role/host mismatch');
  // Set the driver's documented sslmode, independently of supplied credentials.
  u.searchParams.set('sslmode','verify-full');
  return {adapter:'postgres' as const,url:u.toString(),
    tls:{rejectUnauthorized:true,serverName:u.hostname,
      checkServerIdentity:(_hostname:string,cert:Parameters<typeof checkServerIdentity>[1])=>checkServerIdentity(u.hostname,cert)},
    max:1,prepare:false,connectionTimeout:20};
}
async function main() {
  const {values,positionals}=parseArgs({args:process.argv.slice(2),allowPositionals:true,
    options:{'project-ref':{type:'string'},'source-revision':{type:'string'},'output':{type:'string'},
      'snapshot':{type:'string'},'identity':{type:'string'},'profile':{type:'string',multiple:true},
      'all-profiles':{type:'boolean'},'write':{type:'boolean'},'dry-run':{type:'boolean'}}});
  const command=positionals[0],project=values['project-ref'];
  if (positionals.length!==1 || !['backup','validate','restore'].includes(command??'') || !project || !/^[a-z]{20}$/.test(project))
    throw new Error('Usage: cli.ts backup|validate|restore --project-ref REF (see docs/ACCOUNT-BACKUP.md)');
  const contract=JSON.parse(await readFile(new URL('../../supabase/backup-contract.v1.json',import.meta.url),'utf8')) as
    {schemaSha256:string;migrationSha256:Record<string,string>};
  if (command==='backup') {
    if (values.snapshot || values.identity || values.profile || values['all-profiles'] || values.write || values['dry-run']) throw new Error('Restore flags not allowed for backup');
    const revision=values['source-revision'],recipient=process.env.AGE_RECIPIENT?.trim(),url=process.env.BACKUP_DATABASE_URL;
    if (!revision || !/^[a-f0-9]{40}$/.test(revision) || !recipient || !url || !values.output) throw new Error('Missing backup revision, recipient, database credential or output');
    const db=new SQL(connectionConfig(url,project,true));
    let s: Snapshot;
    try {
      s=await db.begin('isolation level repeatable read read only',async tx=>{
        const query=safeQuery(tx);
        await query("set local timezone='UTC'"); await query("set local statement_timeout='120s'");
        await assertTarget(query,project,contract.schemaSha256); await assertBackupRole(query);
        const createdAt=String((await query("select to_char(transaction_timestamp() at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') as at"))[0]!.at);
        return makeSnapshot(await readRows(query),{createdAt,projectRef:project,sourceRevision:revision,
          schemaSha256:contract.schemaSha256,migrationSha256:contract.migrationSha256});
      });
    } finally { await db.close(); }
    validateSnapshot(s,project,contract.schemaSha256);
    const bytes=await ageEncrypt(canonical(s)+'\n',recipient);
    const path=await storeEncrypted(values.output,s,bytes,recipient);
    await verifyPair(path); console.log('Encrypted snapshot and manifest validated; retention applied.');
    return;
  }
  if (values.output || values['source-revision'] || !values.snapshot || !values.identity) throw new Error('Specify --snapshot and --identity');
  if (values.write && values['dry-run']) throw new Error('Choose dry-run OR write');
  const m=await verifyPair(values.snapshot);
  const s=validateSnapshot(JSON.parse(await ageDecrypt(values.snapshot,values.identity)),project,contract.schemaSha256);
  if (m.projectRef!==s.projectRef || m.createdAt!==s.createdAt || m.schemaSha256!==s.schemaSha256 || m.sourceRevision!==s.sourceRevision)
    throw new Error('Manifest/snapshot metadata mismatch');
  if (command==='validate') {
    if (values.profile || values['all-profiles'] || values.write || values['dry-run']) throw new Error('Restore flags not allowed for validation');
    console.log(canonical({validated:true,createdAt:s.createdAt,counts:s.counts})); return;
  }
  if (Boolean(values.profile?.length)===Boolean(values['all-profiles'])) throw new Error('Choose --profile UUID (repeatable) OR --all-profiles');
  const data=selectProfiles(s,values['all-profiles']?'all':values.profile!);
  const url=process.env.RESTORE_DATABASE_URL;
  if (!url) throw new Error('RESTORE_DATABASE_URL must be set locally; never put restore credentials in GitHub');
  const db=new SQL(connectionConfig(url,project,false));
  try {
    await db.begin(values.write?'read write':'isolation level repeatable read read only',async tx=>{
      const query=safeQuery(tx);
      await query("set local timezone='UTC'"); await query("set local statement_timeout='120s'"); await query("set local lock_timeout='10s'");
      if (values.write) await query(`lock table ${TABLES.map(t=>`public.${t}`).join(',')} in share row exclusive mode`);
      await assertTarget(query,project,contract.schemaSha256);
      console.log(canonical({dryRun:!values.write,plan:await restorePlan(query,data)}));
      if (values.write) await writeRestore(query,data);
    });
    console.log(values.write?'Restore committed and database rows verified.':'Dry run passed; database unchanged.');
  } finally { await db.close(); }
}
if (import.meta.main) main().catch(e=>{
  // Zod includes values in some errors; built-in and library errors are opaque.
  const message=e instanceof Error && e.constructor===Error ? e.message : 'Validation, filesystem, encryption or connection failure; see runbook';
  console.error(message); process.exitCode=1;
});
