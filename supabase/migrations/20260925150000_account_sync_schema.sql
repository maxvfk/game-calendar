-- Account Sync S3: private user data only. The public event feed stays on Pages.
-- auth.users and auth.uid() are supplied by Supabase Auth.

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Default' check (length(name) between 1 and 80),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_owner_idx on public.profiles (owner_id);
create unique index profiles_one_default_per_owner on public.profiles (owner_id)
  where is_default;

-- JSON null is a meaningful focusGame value. An optional array reset uses
-- unset=true with JSON null, matching src/shared/sync.ts.
create function public.sync_text_array(value jsonb, allowed text[] default null)
returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(value) = 'array' and not exists (
    select 1 from jsonb_array_elements(
      case when jsonb_typeof(value) = 'array' then value else '[]'::jsonb end
    ) as item(element)
    where jsonb_typeof(item.element) <> 'string'
       or (allowed is not null and not ((item.element #>> '{}') = any(allowed)))
  );
$$;

create function public.sync_valid_preference(pref_key text, pref_value jsonb, pref_unset boolean)
returns boolean language sql immutable set search_path = '' as $$
  select case
    when pref_unset then pref_key in ('knownGames', 'gameOrder')
      and pref_value = 'null'::jsonb
    when pref_key in ('hiddenGames', 'knownGames', 'gameOrder') then
      public.sync_text_array(pref_value)
    when pref_key = 'visibleCategories' then public.sync_text_array(pref_value,
      array['banner','event','challenge','login','shop','maintenance'])
    when pref_key = 'focusGame' then jsonb_typeof(pref_value) in ('string', 'null')
    when pref_key = 'region' then pref_value::text in ('"america"','"europe"','"asia"')
    when pref_key = 'sort' then pref_value::text in ('"ending"','"doing"')
    when pref_key = 'view' then pref_value::text in ('"soon"','"timeline"')
    when pref_key = 'timelineGroup' then pref_value::text in ('"game"','"ending"')
    when pref_key = 'theme' then pref_value::text in ('"dark"','"light"','"system"')
    when pref_key = 'timelineDayWidth' then jsonb_typeof(pref_value) = 'number'
    when pref_key in ('showUpcoming','timelineSplitUpcoming','detectDaily',
      'showChores','showCompleted','showIgnored','regionConfirmed','onboarded')
      then jsonb_typeof(pref_value) = 'boolean'
    else false
  end;
$$;

create table public.progress (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_id text not null check (length(event_id) between 1 and 512),
  status text check (status in ('doing', 'done')),
  effort text check (effort in ('quick', 'short', 'long', 'grind')),
  daily_override boolean,
  note text check (length(note) <= 10000),
  deleted boolean not null,
  changed_at timestamptz not null check (changed_at not in ('infinity', '-infinity')),
  mutation_id uuid not null,
  received_at timestamptz not null default now(),
  primary key (profile_id, event_id),
  constraint progress_tombstone_empty check
    (not deleted or (status is null and effort is null and daily_override is null and note is null))
);

create table public.daily_marks (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  subject_id text not null check (length(subject_id) between 1 and 512),
  day_key text not null check (day_key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  completed boolean not null,
  changed_at timestamptz not null check (changed_at not in ('infinity', '-infinity')),
  mutation_id uuid not null,
  received_at timestamptz not null default now(),
  primary key (profile_id, subject_id, day_key)
);

create table public.ignored (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_id text not null check (length(event_id) between 1 and 512),
  ignored boolean not null,
  changed_at timestamptz not null check (changed_at not in ('infinity', '-infinity')),
  mutation_id uuid not null,
  received_at timestamptz not null default now(),
  primary key (profile_id, event_id)
);

create table public.preferences (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  key text not null,
  value jsonb not null,
  unset boolean not null default false,
  changed_at timestamptz not null check (changed_at not in ('infinity', '-infinity')),
  mutation_id uuid not null,
  received_at timestamptz not null default now(),
  primary key (profile_id, key),
  constraint preference_keyed_value check (public.sync_valid_preference(key, value, unset))
);

create table public.custom_games (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  local_id text not null check (local_id ~ '^mygame:[a-z0-9-]{1,60}$'),
  payload jsonb,
  deleted boolean not null,
  changed_at timestamptz not null check (changed_at not in ('infinity', '-infinity')),
  mutation_id uuid not null,
  received_at timestamptz not null default now(),
  primary key (profile_id, local_id),
  constraint custom_game_payload check
    (deleted = (payload is null) and
      (deleted or (jsonb_typeof(payload) = 'object' and payload->>'id' = local_id)))
);

create table public.custom_events (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  local_id text not null check (local_id ~ '^myevent:[a-z0-9]{6,32}$'),
  payload jsonb,
  deleted boolean not null,
  changed_at timestamptz not null check (changed_at not in ('infinity', '-infinity')),
  mutation_id uuid not null,
  received_at timestamptz not null default now(),
  primary key (profile_id, local_id),
  constraint custom_event_payload check
    (deleted = (payload is null) and
      (deleted or (jsonb_typeof(payload) = 'object' and payload->>'id' = local_id)))
);

-- Defense in depth: every personal table has owner-scoped RLS. Direct user
-- writes are intentionally not granted; the conditional RPC is the only write
-- entry point, so an ordinary upsert cannot bypass version ordering.
alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select to authenticated
  using (owner_id = (select auth.uid()));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

do $$
declare table_name text;
begin
  foreach table_name in array array['progress','daily_marks','ignored',
    'preferences','custom_games','custom_events'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I on public.%I for select to authenticated using
      (exists (select 1 from public.profiles p where p.id = profile_id and p.owner_id = (select auth.uid())))',
      table_name || '_read', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check
      (exists (select 1 from public.profiles p where p.id = profile_id and p.owner_id = (select auth.uid())))',
      table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using
      (exists (select 1 from public.profiles p where p.id = profile_id and p.owner_id = (select auth.uid())))
      with check (exists (select 1 from public.profiles p where p.id = profile_id and p.owner_id = (select auth.uid())))',
      table_name || '_update', table_name);
  end loop;
end;
$$;

revoke all on public.profiles, public.progress, public.daily_marks, public.ignored,
  public.preferences, public.custom_games, public.custom_events from public, anon, authenticated;
grant select on public.profiles, public.progress, public.daily_marks, public.ignored,
  public.preferences, public.custom_games, public.custom_events to authenticated;
revoke all on function public.sync_text_array(jsonb, text[]),
  public.sync_valid_preference(text, jsonb, boolean) from public, anon, authenticated;
