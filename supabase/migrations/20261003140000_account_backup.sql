-- S6a: SQL-only read credential. No membership in authenticator, no JWT,
-- no BYPASSRLS, and no Auth/provider read access. Operator enables login with
-- a locally chosen password AFTER applying this migration.
create role calendar_backup nologin noinherit nosuperuser nocreatedb
  nocreaterole noreplication nobypassrls;
alter role calendar_backup set default_transaction_read_only = on;
alter role calendar_backup set statement_timeout = '120s';
alter role calendar_backup set idle_in_transaction_session_timeout = '120s';
grant connect on database postgres to calendar_backup;
grant usage on schema public to calendar_backup;
grant select on public.profiles, public.progress, public.daily_marks,
  public.ignored, public.preferences, public.custom_games, public.custom_events
  to calendar_backup;
do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','progress','daily_marks','ignored',
    'preferences','custom_games','custom_events'] loop
    execute format('create policy calendar_backup_read on public.%I
      for select to calendar_backup using (true)', table_name);
  end loop;
end;
$$;

-- Not exposed through the Data API. Binds logical snapshots to THIS existing
-- project even if a connection string is accidentally changed. Empty until
-- the operator verifies the project in Dashboard and sets its public ref.
create schema calendar_backup_control;
revoke all on schema calendar_backup_control from public, anon, authenticated;
create table calendar_backup_control.project_identity (
  singleton boolean primary key default true check (singleton),
  project_ref text not null check (project_ref ~ '^[a-z]{20}$')
);
revoke all on calendar_backup_control.project_identity from public, anon, authenticated;
grant usage on schema calendar_backup_control to calendar_backup;
grant select on calendar_backup_control.project_identity to calendar_backup;
