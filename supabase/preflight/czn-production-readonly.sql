-- REVIEW ONLY until production preflight GO. No DDL, no user rows, no side effects.
-- Supplemental ACL report; the strict version/hash check is production.ts preflight.
-- Do not run old migrations based on the empty hosted CLI migration ledger.
begin isolation level repeatable read read only;
set local statement_timeout='30s';
set local lock_timeout='5s';
select current_database() as database_name,current_user,version();
select project_ref from calendar_backup_control.project_identity;
select n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','calendar_backup_control') and c.relkind='r'
order by n.nspname,c.relname;
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where schemaname='public' order by tablename,policyname;
select rolname,rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls,rolcanlogin,rolinherit
from pg_roles where rolname in ('calendar_backup','anon','authenticated','postgres');
select parent.rolname as granted_role,member.rolname as member
from pg_auth_members m join pg_roles parent on parent.oid=m.roleid
join pg_roles member on member.oid=m.member where member.rolname='calendar_backup';
select r.rolname,n.nspname,has_schema_privilege(r.oid,n.oid,'USAGE') as can_use,
  has_schema_privilege(r.oid,n.oid,'CREATE') as can_create
from pg_roles r cross join pg_namespace n where r.rolname in ('anon','authenticated','calendar_backup')
and n.nspname in ('public','calendar_sync_internal','calendar_backup_control') order by r.rolname,n.nspname;
select r.rolname,n.nspname,c.relname,has_table_privilege(r.oid,c.oid,'SELECT') as readable,
  has_table_privilege(r.oid,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as writable
from pg_roles r cross join pg_class c join pg_namespace n on n.oid=c.relnamespace
where r.rolname in ('anon','authenticated','calendar_backup') and c.relkind='r'
and n.nspname in ('public','calendar_backup_control') order by r.rolname,n.nspname,c.relname;
select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as args,
  pg_get_userbyid(p.proowner) as owner,p.prosecdef,p.proacl,p.proconfig,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
  has_function_privilege('calendar_backup',p.oid,'EXECUTE') as backup_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='calendar_sync_internal' or (n.nspname='public' and p.proname in
  ('ensure_default_profile','apply_profile_mutations','czn_daily_negotiate','czn_daily_apply'))
order by n.nspname,p.proname,args;
rollback;
