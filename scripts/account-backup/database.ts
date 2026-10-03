import { TABLES, KEYS, canonical, sha256, sortRows, validateRows, type Rows, type Row, type Snapshot } from './model.ts';

export type Query = (sql: string, params?: unknown[]) => Promise<Row[]>;
// Generated contract comes from the public migrations. The private repository
// never maintains a second database schema. pg_catalog is visible to the SQL role.
export const contractSql = `select jsonb_build_object(
  'columns', (select jsonb_agg(jsonb_build_object('table',c.relname,'column',a.attname,
    'type',pg_catalog.format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,
    'default',pg_catalog.pg_get_expr(d.adbin,d.adrelid)) order by c.relname,a.attnum)
    from pg_catalog.pg_class c join pg_catalog.pg_attribute a on a.attrelid=c.oid
    left join pg_catalog.pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum
    where c.relnamespace='public'::regnamespace and c.relname=any($1::text[])
      and a.attnum>0 and not a.attisdropped),
  'constraints', (select jsonb_agg(jsonb_build_object('table',c.relname,'name',n.conname,
    'definition',pg_catalog.pg_get_constraintdef(n.oid)) order by c.relname,n.conname)
    from pg_catalog.pg_constraint n join pg_catalog.pg_class c on c.oid=n.conrelid
    where c.relnamespace='public'::regnamespace and c.relname=any($1::text[])),
  'indexes', (select jsonb_agg(jsonb_build_object('table',tablename,'name',indexname,
    'definition',indexdef) order by tablename,indexname) from pg_catalog.pg_indexes
    where schemaname='public' and tablename=any($1::text[])),
  'triggers', (select coalesce(jsonb_agg(pg_catalog.pg_get_triggerdef(t.oid) order by c.relname,t.tgname),'[]'::jsonb)
    from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid
    where not t.tgisinternal and c.relnamespace='public'::regnamespace and c.relname=any($1::text[])),
  'functions', (select jsonb_agg(pg_catalog.pg_get_functiondef(p.oid) order by p.proname,p.oid::regprocedure::text)
    from pg_catalog.pg_proc p where p.pronamespace='public'::regnamespace
    and p.proname in ('sync_text_array','sync_valid_preference','ensure_default_profile','apply_profile_mutations'))
) as contract`;
export async function schemaContract(query: Query): Promise<unknown> {
  return (await query(contractSql,[[...TABLES]]))[0]!.contract;
}
export async function assertTarget(query: Query, project: string, schemaHash: string) {
  const identity = await query('select project_ref from calendar_backup_control.project_identity');
  if (identity.length !== 1 || identity[0]!.project_ref !== project) throw new Error('Database project identity mismatch or unset');
  if (sha256(canonical(await schemaContract(query))) !== schemaHash) throw new Error('Live database schema mismatch');
  const rls = await query(`select relname,relrowsecurity,relforcerowsecurity from pg_catalog.pg_class
    where relnamespace='public'::regnamespace and relname=any($1::text[])`,[[...TABLES]]);
  if (rls.length !== 7 || rls.some(r=>!r.relrowsecurity || r.relforcerowsecurity)) throw new Error('Unexpected RLS configuration');
  const extraChildren = await query(`select 1 from pg_catalog.pg_constraint n
    join pg_catalog.pg_class child on child.oid=n.conrelid
    join pg_catalog.pg_class parent on parent.oid=n.confrelid
    where n.contype='f' and parent.relnamespace='public'::regnamespace
      and parent.relname=any($1::text[]) and not
      (child.relnamespace='public'::regnamespace and child.relname=any($1::text[]))`,[[...TABLES]]);
  if (extraChildren.length) throw new Error('Uncovered child table references personal data');
}
export async function assertBackupRole(query: Query) {
  const role = (await query(`select current_user as username,rolsuper,rolcreaterole,rolcreatedb,
    rolreplication,rolbypassrls from pg_catalog.pg_roles where rolname=current_user`))[0]!;
  if (role.username !== 'calendar_backup' || [role.rolsuper,role.rolcreaterole,role.rolcreatedb,
    role.rolreplication,role.rolbypassrls].some(Boolean)) throw new Error('Backup requires the restricted calendar_backup role');
  const members = await query(`select 1 from pg_catalog.pg_auth_members m join pg_catalog.pg_roles r on r.oid=m.member
    where r.rolname=current_user`);
  if (members.length) throw new Error('Backup role must have no memberships');
  if ((await query("select has_schema_privilege(current_user,'public','CREATE') as can_create"))[0]!.can_create)
    throw new Error('Backup role must not have CREATE on public schema');
  const privileges = await query(`select c.relname,
    has_table_privilege(current_user,c.oid,'SELECT') as can_read,
    has_table_privilege(current_user,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as can_write
    from pg_catalog.pg_class c where c.relnamespace='public'::regnamespace and c.relname=any($1::text[])`,[[...TABLES]]);
  if (privileges.length !== 7 || privileges.some(p=>!p.can_read || p.can_write)) throw new Error('Unexpected backup table privileges');
  const elevated = await query(`select p.proname from pg_catalog.pg_proc p
    where p.pronamespace='public'::regnamespace and p.prosecdef and has_function_privilege(current_user,p.oid,'EXECUTE')`);
  if (elevated.length) throw new Error('Backup role can execute a public SECURITY DEFINER function');
  const policies = await query(`select tablename from pg_catalog.pg_policies where schemaname='public'
    and tablename=any($1::text[]) and policyname='calendar_backup_read' and cmd='SELECT'
    and roles=array['calendar_backup']::name[] and qual='true'`,[[...TABLES]]);
  if (policies.length !== 7) throw new Error('Missing unrestricted SELECT policy for backup role');
}
export async function readRows(query: Query, profiles?: string[]): Promise<Rows> {
  const data = {} as Rows;
  for (const table of TABLES) {
    const key = table === 'profiles' ? 'id' : 'profile_id';
    const where = profiles ? `where ${key}=any($1::uuid[])` : '';
    data[table] = sortRows(table,(await query(`select to_jsonb(t) as row from public.${table} t ${where}
      order by ${KEYS[table].join(',')}`,profiles ? [profiles] : [])).map(r=>r.row as Row));
  }
  validateRows(data);
  return data;
}
export type RestorePlan = { profiles: number; mode: 'replace-selected-profile-state';
  tables: Record<string,{existing:number;restore:number}> };
export function selectProfiles(s: Snapshot, selection: string[] | 'all'): Rows {
  const ids = selection === 'all' ? s.data.profiles.map(r=>String(r.id)) : selection;
  if (!ids.length || new Set(ids).size !== ids.length || ids.some(id=>!s.data.profiles.some(p=>p.id===id)))
    throw new Error('Select existing snapshot profiles explicitly; empty/duplicate/unknown selection refused');
  return Object.fromEntries(TABLES.map(t=>[t,s.data[t].filter(r=>ids.includes(String(t==='profiles'?r.id:r.profile_id)))])) as Rows;
}
export async function restorePlan(query: Query, data: Rows): Promise<RestorePlan> {
  validateRows(data);
  const owners = [...new Set(data.profiles.map(p=>String(p.owner_id)))];
  const auth = await query('select id::text as id from auth.users where id=any($1::uuid[])',[owners]);
  if (auth.length !== owners.length) throw new Error('Missing Auth identity; no identity creation/remapping allowed');
  const ids = data.profiles.map(p=>String(p.id));
  const current = await query('select id::text as id,owner_id::text as owner_id,is_default from public.profiles where id=any($1::uuid[])',[ids]);
  for (const p of data.profiles) {
    const existing = current.find(r=>r.id===p.id);
    if (existing && existing.owner_id !== p.owner_id) throw new Error('Profile ownership mismatch');
  }
  const defaults = await query('select id::text as id,owner_id::text as owner_id from public.profiles where is_default and owner_id=any($1::uuid[])',[owners]);
  for (const p of data.profiles.filter(p=>p.is_default)) {
    if (defaults.some(r=>r.owner_id===p.owner_id && r.id!==p.id && !ids.includes(String(r.id))))
      throw new Error('Conflicting default profile outside restore selection');
  }
  const tables: RestorePlan['tables'] = {};
  for (const t of TABLES) {
    const result = await query(`select count(*)::int as n from public.${t} where ${t==='profiles'?'id':'profile_id'}=any($1::uuid[])`,[ids]);
    tables[t] = {existing:Number(result[0]!.n),restore:data[t].length};
  }
  return {profiles:ids.length,mode:'replace-selected-profile-state',tables};
}
export async function writeRestore(query: Query, data: Rows) {
  const ids = data.profiles.map(p=>String(p.id));
  // Clear selected defaults first: a selected owner's different default may be
  // restored in the same transaction without transient unique-index conflicts.
  await query('update public.profiles set is_default=false where id=any($1::uuid[])',[ids]);
  await query(`insert into public.profiles select * from jsonb_populate_recordset(null::public.profiles,$1::jsonb)
    on conflict(id) do update set name=excluded.name,is_default=excluded.is_default,
      created_at=excluded.created_at,updated_at=excluded.updated_at`,[canonical(data.profiles)]);
  for (const t of TABLES.filter(t=>t!=='profiles')) {
    await query(`delete from public.${t} where profile_id=any($1::uuid[])`,[ids]);
    if (data[t].length) {
      // jsonb_populate_record turns JSON null into SQL NULL. A preference's
      // meaningful JSON null must stay JSON null in its NOT NULL jsonb column.
      const select = t === 'preferences' ? `select p.profile_id,p.key,item->'value',p.unset,
        p.changed_at,p.mutation_id,p.received_at from jsonb_array_elements($1::jsonb) item
        cross join lateral jsonb_populate_record(null::public.preferences,item) p` :
        `select * from jsonb_populate_recordset(null::public.${t},$1::jsonb)`;
      await query(`insert into public.${t} ${select}`,[canonical(data[t])]);
    }
  }
  const restored = await readRows(query,ids);
  // PG re-serialization makes UTC timestamps stable. Check all original rows,
  // including LWW versions, tombstones and server receipt timestamps.
  if (canonical(restored) !== canonical(data)) throw new Error('Post-restore verification failed');
}
