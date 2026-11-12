-- PASS-1A RELEASE CANDIDATE ONLY. Not installed in production.
-- Apply only in the operator window of docs/tasks/DAILY-PASSES.md (v2 backup taken,
-- v3 backup tooling and private pin ready), on top of the three migrations and the
-- installed CZN candidate. Never through migration replay. Additive: one table,
-- one RPC, two validators and one guard trigger. No existing object changes.
do $$
begin
  if to_regclass('public.czn_daily_policy') is null
     or to_regprocedure('calendar_sync_internal.apply_profile_mutations(uuid,jsonb)') is null then
    raise exception 'daily pass candidate requires the installed CZN schema';
  end if;
end;
$$;

-- A real YYYY-MM-DD day, year 0001-9999. make_date is independent of DateStyle;
-- an impossible date such as 2026-02-30 returns false instead of raising.
create function public.daily_pass_valid_day(day text)
returns boolean language plpgsql immutable set search_path = '' as $$
begin
  return coalesce(day ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    and make_date(substr(day, 1, 4)::int, substr(day, 6, 2)::int, substr(day, 9, 2)::int) is not null, false);
exception when others then
  return false;
end;
$$;

-- Built-in game IDs by format (a future game needs no migration), never one of the
-- reserved first segments, or a custom lane ID exactly as custom_games stores it.
create function public.daily_pass_valid_game(game text)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce((game ~ '^[a-z][a-z0-9]{0,31}$' and game not in ('dailies', 'mygame', 'myevent'))
    or game ~ '^mygame:[a-z0-9-]{1,60}$', false);
$$;

create table public.daily_pass_ops (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  op_id uuid not null,
  game text not null check (public.daily_pass_valid_game(game)),
  region text not null check (region in ('america', 'europe', 'asia')),
  kind text not null check (kind in ('extend', 'set', 'undo', 'resolve')),
  action_day text not null check (public.daily_pass_valid_day(action_day)),
  -- 0001-01-02T00:00:00Z .. 9999-12-30T23:59:59.999999Z: one day of margin inside years
  -- 0001-9999, so the value renders with a four-digit year in every session time zone
  -- (offsets up to +/-15:59); a year-10000 or BC rendering would stop every backup.
  -- Epoch bounds keep the catalog text, and the backup contract hash, zone-independent.
  created_at timestamptz not null check (extract(epoch from created_at)
    between -62135510400 and 253402214399.999999),
  days integer check (days between 1 and 180),
  last_day text check (last_day is null or public.daily_pass_valid_day(last_day)),
  target_op uuid,
  based_on uuid[] check (based_on is null or (cardinality(based_on) <= 500
    and (cardinality(based_on) = 0 or array_ndims(based_on) = 1)
    and array_position(based_on, null) is null)),
  resolution text check (resolution in ('include', 'exclude')),
  received_at timestamptz not null default now(),
  primary key (profile_id, op_id),
  constraint daily_pass_op_shape check (case kind
    when 'extend' then days is not null and last_day is null and target_op is null
      and based_on is null and resolution is null
    when 'set' then days is null and target_op is null and based_on is not null and resolution is null
    when 'undo' then days is null and last_day is null and target_op is not null
      and target_op <> op_id and based_on is null and resolution is null
    when 'resolve' then days is null and last_day is null and target_op is not null
      and target_op <> op_id and based_on is null and resolution is not null
    else false end)
);

-- Insert-only. Profile deletion still cascades (DELETE is not guarded), but no
-- grant allows a direct DELETE, and an UPDATE can never rewrite an op.
create function public.daily_pass_ops_immutable()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'daily pass ops are immutable' using errcode = '55000';
end;
$$;
create trigger daily_pass_ops_immutable before update on public.daily_pass_ops
  for each row execute function public.daily_pass_ops_immutable();

alter table public.daily_pass_ops enable row level security;
revoke all on public.daily_pass_ops from public, anon, authenticated, calendar_backup;
grant select on public.daily_pass_ops to authenticated, calendar_backup;
create policy daily_pass_ops_read on public.daily_pass_ops for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.owner_id = (select auth.uid())));
create policy calendar_backup_read on public.daily_pass_ops for select to calendar_backup using (true);

-- The only write path. Union is commutative, so there is no pass state, no CAS and
-- no profile lock. An exact replay is accepted again; the same op ID with different
-- content raises and rolls back the whole batch.
create function public.daily_pass_apply(p_profile_id uuid, p_ops jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uuid_re constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  instant_re constant text :=
    '^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{1,3})?(Z|[+-](0[0-9]|1[0-4]):[0-5][0-9])$';
  r jsonb;
  v_kind text;
  v_keys integer;
  v_id uuid;
  v_created timestamptz;
  v_days integer;
  v_last text;
  v_target uuid;
  v_based uuid[];
  v_resolution text;
  inserted integer;
  existing public.daily_pass_ops;
  replies jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p where p.id = p_profile_id and p.owner_id = auth.uid()
  ) then
    raise exception 'profile unavailable' using errcode = '42501';
  end if;
  if p_ops is null or jsonb_typeof(p_ops) <> 'array'
     or jsonb_array_length(p_ops) > 100 or pg_column_size(p_ops) > 262144 then
    raise exception 'invalid daily pass batch' using errcode = '22023';
  end if;

  for r in select value from jsonb_array_elements(p_ops) loop
    if jsonb_typeof(r) is distinct from 'object' then
      raise exception 'invalid daily pass op' using errcode = '22023';
    end if;
    v_kind := r->>'kind';
    v_keys := case v_kind when 'extend' then 7 when 'set' then 8 when 'undo' then 7 when 'resolve' then 8 else -1 end;
    if v_keys < 0 or (select count(*) from jsonb_object_keys(r)) <> v_keys
       or not (r ?& array['opId', 'game', 'region', 'kind', 'actionDay', 'createdAt'])
       or jsonb_typeof(r->'opId') is distinct from 'string' or (r->>'opId') !~ uuid_re
       or jsonb_typeof(r->'game') is distinct from 'string' or not public.daily_pass_valid_game(r->>'game')
       or jsonb_typeof(r->'region') is distinct from 'string' or (r->>'region') not in ('america', 'europe', 'asia')
       or jsonb_typeof(r->'actionDay') is distinct from 'string' or not public.daily_pass_valid_day(r->>'actionDay')
       or jsonb_typeof(r->'createdAt') is distinct from 'string' or (r->>'createdAt') !~ instant_re
       or not public.daily_pass_valid_day(left(r->>'createdAt', 10)) then
      raise exception 'invalid daily pass op' using errcode = '22023';
    end if;
    v_id := (r->>'opId')::uuid;
    v_created := (r->>'createdAt')::timestamptz;
    -- The written date is checked above; the UTC-normalized instant must also stay
    -- inside the table's margin (9999-12-31T23:59:59-14:00 is year 10000 in UTC).
    if extract(epoch from v_created) not between -62135510400 and 253402214399.999999 then
      raise exception 'invalid daily pass op' using errcode = '22023';
    end if;
    -- A device clock days in the future must not inflate an expiry.
    if (r->>'actionDay')::date > (clock_timestamp() at time zone 'UTC')::date + 1 then
      raise exception 'daily pass action day is in the future' using errcode = '22023';
    end if;
    v_days := null; v_last := null; v_target := null; v_based := null; v_resolution := null;
    case v_kind
      when 'extend' then
        if jsonb_typeof(r->'days') is distinct from 'number' or (r->>'days') !~ '^[0-9]{1,3}$'
           or (r->>'days')::int not between 1 and 180 then
          raise exception 'invalid daily pass extend' using errcode = '22023';
        end if;
        v_days := (r->>'days')::int;
      when 'set' then
        if not (r ? 'lastDay' and r ? 'basedOn')
           or (jsonb_typeof(r->'lastDay') <> 'null' and (jsonb_typeof(r->'lastDay') <> 'string'
             or not public.daily_pass_valid_day(r->>'lastDay')))
           or jsonb_typeof(r->'basedOn') is distinct from 'array' or jsonb_array_length(r->'basedOn') > 500
           or exists (select 1 from jsonb_array_elements(r->'basedOn') e
             where jsonb_typeof(e) <> 'string' or (e #>> '{}') !~ uuid_re)
           or (select count(distinct e #>> '{}') from jsonb_array_elements(r->'basedOn') e)
             <> jsonb_array_length(r->'basedOn') then
          raise exception 'invalid daily pass set' using errcode = '22023';
        end if;
        v_last := r->>'lastDay';
        v_based := array(select (e #>> '{}')::uuid from jsonb_array_elements(r->'basedOn') e order by 1);
      when 'undo', 'resolve' then
        if jsonb_typeof(r->'targetOp') is distinct from 'string' or (r->>'targetOp') !~ uuid_re
           or (r->>'targetOp') = (r->>'opId')
           or (v_kind = 'resolve' and (jsonb_typeof(r->'resolution') is distinct from 'string'
             or (r->>'resolution') not in ('include', 'exclude'))) then
          raise exception 'invalid daily pass target' using errcode = '22023';
        end if;
        v_target := (r->>'targetOp')::uuid;
        v_resolution := case when v_kind = 'resolve' then r->>'resolution' end;
    end case;

    insert into public.daily_pass_ops (profile_id, op_id, game, region, kind, action_day,
      created_at, days, last_day, target_op, based_on, resolution)
      values (p_profile_id, v_id, r->>'game', r->>'region', v_kind, r->>'actionDay',
        v_created, v_days, v_last, v_target, v_based, v_resolution)
      on conflict (profile_id, op_id) do nothing;
    get diagnostics inserted = row_count;
    if inserted = 0 then
      select * into existing from public.daily_pass_ops where profile_id = p_profile_id and op_id = v_id;
      if not found then
        raise exception 'concurrent daily pass op not visible; retry' using errcode = '40001';
      end if;
      if (existing.game, existing.region, existing.kind, existing.action_day, existing.created_at, existing.days,
          existing.last_day, existing.target_op, existing.based_on, existing.resolution) is distinct from
         (r->>'game', r->>'region', v_kind, r->>'actionDay', v_created, v_days,
          v_last, v_target, v_based, v_resolution) then
        raise exception 'daily pass op ID reused with different content' using errcode = '22023';
      end if;
    end if;
    replies := replies || jsonb_build_array(jsonb_build_object('opId', v_id, 'outcome', 'accepted'));
  end loop;
  return replies;
end;
$$;

revoke all on function public.daily_pass_valid_day(text), public.daily_pass_valid_game(text),
  public.daily_pass_ops_immutable(), public.daily_pass_apply(uuid, jsonb)
  from public, anon, authenticated, calendar_backup;
grant execute on function public.daily_pass_apply(uuid, jsonb) to authenticated;
