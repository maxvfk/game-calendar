/** PASS-1A v3 schema contract: v2 (base + CZN) plus the additive daily pass candidate. */
import { readdir } from 'node:fs/promises';
import { contractSql, type Query } from '../account-backup/database.ts';
import { migrationHashes } from '../account-backup/generate-contract.ts';
import { normalizeContract } from '../account-backup/contract.ts';
import { canonical, sha256 } from '../account-backup/model.ts';
import { ALL_TABLES as V2_TABLES, candidateDatabase as cznCandidateDatabase, candidateMigration as cznCandidateMigration,
  assertCznBackupRole } from '../czn-cutover/contract.ts';

export const PASS_TABLES = ['daily_pass_ops'] as const;
export const V3_TABLES = [...V2_TABLES, ...PASS_TABLES];
export const PASS_FUNCTIONS = ['daily_pass_valid_day', 'daily_pass_valid_game', 'daily_pass_ops_immutable', 'daily_pass_apply'] as const;
const V3_FUNCTIONS = ['apply_profile_mutations', 'czn_daily_negotiate', 'czn_daily_apply', ...PASS_FUNCTIONS];

export async function passesMigration() {
  const dir = new URL('../../supabase/daily-passes/', import.meta.url);
  const files = (await readdir(dir)).filter(f => f.endsWith('.sql'));
  if (files.length !== 1) throw new Error('Expected one reviewed daily pass candidate migration');
  return { name: files[0]!, sql: await Bun.file(new URL(files[0]!, dir)).text() };
}

/** PGlite with the three migrations, the installed CZN candidate and this candidate. */
export async function passesCandidateDatabase() {
  const db = await cznCandidateDatabase();
  await db.exec((await passesMigration()).sql);
  return db;
}

/**
 * The documented write rollback (`revoke execute on function
 * public.daily_pass_apply(uuid,jsonb) from authenticated`) must leave backups and
 * recovery working. Exactly these two ACLs of that one function hash identically;
 * any other ACL, on it or on any other function, stays in the hash verbatim, so a
 * widened grant is still schema drift.
 */
export const APPLY_ACL_ENABLED = '{postgres=X/postgres,authenticated=X/postgres}';
export const APPLY_ACL_WRITES_REVOKED = '{postgres=X/postgres}';
function normalizeRollbackAcl(row: Record<string, unknown>) {
  return row.nspname === 'public' && row.proname === 'daily_pass_apply' && row.owner === 'postgres'
    && (row.proacl === APPLY_ACL_ENABLED || row.proacl === APPLY_ACL_WRITES_REVOKED)
    ? { ...row, proacl: `${APPLY_ACL_ENABLED} | writes revoked: ${APPLY_ACL_WRITES_REVOKED}` } : row;
}

function replaceOnce(text: string, from: string, to: string) {
  if (text.split(from).length !== 2) throw new Error('Contract SQL shape changed; refusing a silently narrower contract');
  return text.replace(from, to);
}

export async function passesContract(query: Query) {
  let sql = replaceOnce(contractSql, "p.pronamespace='public'::regnamespace",
    "p.pronamespace in ('public'::regnamespace,'calendar_sync_internal'::regnamespace)");
  sql = replaceOnce(sql, "'apply_profile_mutations'))", `${V3_FUNCTIONS.map(f => `'${f}'`).join(',')}))`);
  const base = normalizeContract((await query(sql, [V3_TABLES]))[0]!.contract);
  const policies = await query(`select schemaname,tablename,policyname,permissive,roles::text,cmd,qual,with_check
    from pg_policies where schemaname='public' and tablename=any($1::text[]) order by tablename,policyname`, [V3_TABLES]);
  const acls = (await query(`select n.nspname,p.proname,p.proacl::text,pg_get_userbyid(p.proowner) as owner
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='calendar_sync_internal' or (n.nspname='public' and p.proname=any($1::text[]))
    order by n.nspname,p.proname`, [V3_FUNCTIONS])).map(normalizeRollbackAcl);
  // Table ACLs stay out of the hash, as in v2: hosted default privileges (for example
  // service_role) differ from a local cluster. Effective client/backup privileges are
  // checked separately by assertAccess and assertPassesBackupRole.
  return { base, policies, acls };
}

export async function generatedPassesContract() {
  const db = await passesCandidateDatabase();
  try {
    const query: Query = async (s, p = []) => (await db.query(s, p)).rows as Record<string, unknown>[];
    const contract = await passesContract(query), czn = await cznCandidateMigration(), passes = await passesMigration();
    return { schemaVersion: 3, schemaSha256: sha256(canonical(contract)),
      migrationSha256: { ...await migrationHashes(), [czn.name]: sha256(czn.sql), [passes.name]: sha256(passes.sql) }, contract };
  } finally { await db.close(); }
}

export async function assertPassesTarget(query: Query, project: string, hash: string) {
  const marker = await query('select project_ref from calendar_backup_control.project_identity');
  if (marker.length !== 1 || marker[0]!.project_ref !== project) throw new Error('Project mismatch');
  if (sha256(canonical(await passesContract(query))) !== hash) throw new Error('Daily pass schema mismatch');
  const uncovered = await query(`select 1 from pg_constraint k join pg_class p on p.oid=k.confrelid
    join pg_class c on c.oid=k.conrelid where k.contype='f' and p.relnamespace='public'::regnamespace
    and p.relname=any($1::text[]) and not(c.relnamespace='public'::regnamespace and c.relname=any($1::text[]))`, [V3_TABLES]);
  if (uncovered.length) throw new Error('Uncovered child table');
}

/** Read-only backup role: v2 checks plus SELECT-only, RLS-bound access to the op table, no RPC. */
export async function assertPassesBackupRole(query: Query) {
  await assertCznBackupRole(query);
  const rows = await query(`select relrowsecurity,relforcerowsecurity,
    has_table_privilege(current_user,oid,'SELECT') as readable,
    has_table_privilege(current_user,oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as writable
    from pg_class where relnamespace='public'::regnamespace and relname=any($1::text[])`, [[...PASS_TABLES]]);
  if (rows.length !== 1 || rows.some(r => !r.relrowsecurity || r.relforcerowsecurity || !r.readable || r.writable))
    throw new Error('Daily pass backup grants/RLS');
  const executable = await query(`select 1 from pg_proc where pronamespace='public'::regnamespace
    and proname=any($1::text[]) and has_function_privilege(current_user,oid,'EXECUTE')`, [[...PASS_FUNCTIONS]]);
  if (executable.length) throw new Error('Backup can execute a daily pass function');
  const policies = await query(`select 1 from pg_policies where schemaname='public' and tablename=any($1::text[])
    and policyname='calendar_backup_read' and cmd='SELECT' and roles=array['calendar_backup']::name[] and qual='true'`, [[...PASS_TABLES]]);
  if (policies.length !== 1) throw new Error('Missing daily pass backup read policy');
}

if (import.meta.main) {
  await Bun.write(new URL('../../supabase/backup-contract.passes-v3.json', import.meta.url), canonical(await generatedPassesContract()) + '\n');
  console.log('Generated v3 backup contract from migrations + CZN + daily pass candidates (review before committing).');
}
