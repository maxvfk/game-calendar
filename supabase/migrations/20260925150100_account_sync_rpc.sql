-- The default profile is created on first authenticated use. The partial
-- unique index makes concurrent first logins converge to one row.
create function public.ensure_default_profile()
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  account_id uuid := auth.uid();
  result_id uuid;
begin
  if account_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  insert into public.profiles (owner_id, name, is_default)
    values (account_id, 'Default', true)
    on conflict (owner_id) where is_default do nothing
    returning id into result_id;
  if result_id is null then
    select id into result_id from public.profiles
      where owner_id = account_id and is_default;
  end if;
  if result_id is null then
    raise exception 'default profile unavailable';
  end if;
  return result_id;
end;
$$;

-- Even a future change to grants must not let a mutation ID acquire a new
-- timestamp for the same logical row. The RPC separately detects equal-version
-- conflicting content; this trigger covers the newer-version path.
create function public.sync_guard_mutation_id()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.mutation_id = old.mutation_id and new.changed_at <> old.changed_at then
    raise exception 'mutation ID reused with a different version' using errcode = '22023';
  end if;
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['progress','daily_marks','ignored',
    'preferences','custom_games','custom_events'] loop
    execute format('create trigger sync_guard_mutation_id before update on public.%I
      for each row execute function public.sync_guard_mutation_id()', table_name);
  end loop;
end;
$$;

-- A SECURITY DEFINER function is used because direct INSERT/UPDATE grants
-- would let a caller bypass conditional versioning with a plain upsert.
-- Ownership is checked explicitly before any write. Table names below are
-- fixed SQL, never derived from an input string.
create function public.apply_profile_mutations(p_profile_id uuid, p_mutations jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  row_data jsonb;
  row_kind text;
  row_key text;
  row_day text;
  row_payload jsonb;
  row_deleted boolean;
  row_unset boolean;
  row_time timestamptz;
  row_id uuid;
  old_row jsonb;
  old_time timestamptz;
  old_id uuid;
  expected_body jsonb;
  applied integer;
  answer text;
  replies jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p
    where p.id = p_profile_id and p.owner_id = auth.uid()
  ) then
    raise exception 'profile unavailable' using errcode = '42501';
  end if;
  if p_mutations is null or jsonb_typeof(p_mutations) <> 'array'
     or jsonb_array_length(p_mutations) > 100
     or pg_column_size(p_mutations) > 262144 then
    raise exception 'invalid mutation batch' using errcode = '22023';
  end if;

  for row_data in select value from jsonb_array_elements(p_mutations) loop
    if jsonb_typeof(row_data) <> 'object'
       or row_data->>'changedAt' !~
         '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,3})?(Z|[+-][0-9]{2}:[0-9]{2})$'
       or row_data->>'mutationId' is null then
      raise exception 'invalid mutation envelope' using errcode = '22023';
    end if;
    row_kind := row_data->>'kind';
    row_time := (row_data->>'changedAt')::timestamptz;
    row_id := (row_data->>'mutationId')::uuid;
    applied := null;
    old_row := null;

    case row_kind
      when 'progress' then
        row_key := row_data->>'key';
        if coalesce(length(row_key), 0) not between 1 and 512
           or jsonb_typeof(row_data->'deleted') <> 'boolean' then
          raise exception 'invalid progress key or deletion state' using errcode = '22023';
        end if;
        row_deleted := (row_data->>'deleted')::boolean;
        row_payload := row_data->'payload';
        if row_payload is null or row_deleted <> (row_payload = 'null'::jsonb) or
           (not row_deleted and (jsonb_typeof(row_payload) <> 'object'
             or not (row_payload ?& array['status','effort','daily','note'])
             or jsonb_typeof(row_payload->'daily') not in ('boolean','null')
             or jsonb_typeof(row_payload->'note') not in ('string','null'))) then
          raise exception 'invalid progress payload' using errcode = '22023';
        end if;
        insert into public.progress as current
          (profile_id,event_id,status,effort,daily_override,note,deleted,changed_at,mutation_id)
          values (p_profile_id,row_key,
            case when row_deleted then null else row_payload->>'status' end,
            case when row_deleted then null else row_payload->>'effort' end,
            case when row_deleted or row_payload->'daily' = 'null'::jsonb then null
              else (row_payload->>'daily')::boolean end,
            case when row_deleted then null else row_payload->>'note' end,
            row_deleted,row_time,row_id)
          on conflict (profile_id,event_id) do update set
            status=excluded.status, effort=excluded.effort,
            daily_override=excluded.daily_override, note=excluded.note,
            deleted=excluded.deleted, changed_at=excluded.changed_at,
            mutation_id=excluded.mutation_id, received_at=now()
          where (excluded.changed_at,excluded.mutation_id) >
            (current.changed_at,current.mutation_id)
          returning 1 into applied;
        if applied is null then
          select to_jsonb(t), t.changed_at, t.mutation_id into old_row, old_time, old_id
            from public.progress t where t.profile_id=p_profile_id and t.event_id=row_key;
          expected_body := jsonb_build_object('event_id',row_key,
            'status',case when row_deleted then null else row_payload->>'status' end,
            'effort',case when row_deleted then null else row_payload->>'effort' end,
            'daily_override',case when row_deleted or row_payload->'daily'='null'::jsonb
              then null else (row_payload->>'daily')::boolean end,
            'note',case when row_deleted then null else row_payload->>'note' end,
            'deleted',row_deleted);
        end if;

      when 'daily' then
        row_key := row_data->'key'->>'subjectId';
        row_day := row_data->'key'->>'dayKey';
        if coalesce(length(row_key),0) not between 1 and 512
           or row_day !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
           or jsonb_typeof(row_data->'completed') <> 'boolean' then
          raise exception 'invalid daily mutation' using errcode = '22023';
        end if;
        insert into public.daily_marks as current
          (profile_id,subject_id,day_key,completed,changed_at,mutation_id)
          values (p_profile_id,row_key,row_day,(row_data->>'completed')::boolean,row_time,row_id)
          on conflict (profile_id,subject_id,day_key) do update set
            completed=excluded.completed, changed_at=excluded.changed_at,
            mutation_id=excluded.mutation_id, received_at=now()
          where (excluded.changed_at,excluded.mutation_id) >
            (current.changed_at,current.mutation_id)
          returning 1 into applied;
        if applied is null then
          select to_jsonb(t), t.changed_at, t.mutation_id into old_row, old_time, old_id
            from public.daily_marks t where t.profile_id=p_profile_id
              and t.subject_id=row_key and t.day_key=row_day;
          expected_body := jsonb_build_object('subject_id',row_key,
            'day_key',row_day,'completed',(row_data->>'completed')::boolean);
        end if;

      when 'ignored' then
        row_key := row_data->>'key';
        if coalesce(length(row_key),0) not between 1 and 512
           or jsonb_typeof(row_data->'ignored') <> 'boolean' then
          raise exception 'invalid ignored mutation' using errcode = '22023';
        end if;
        insert into public.ignored as current
          (profile_id,event_id,ignored,changed_at,mutation_id)
          values (p_profile_id,row_key,(row_data->>'ignored')::boolean,row_time,row_id)
          on conflict (profile_id,event_id) do update set
            ignored=excluded.ignored,changed_at=excluded.changed_at,
            mutation_id=excluded.mutation_id,received_at=now()
          where (excluded.changed_at,excluded.mutation_id) >
            (current.changed_at,current.mutation_id)
          returning 1 into applied;
        if applied is null then
          select to_jsonb(t), t.changed_at, t.mutation_id into old_row, old_time, old_id
            from public.ignored t where t.profile_id=p_profile_id and t.event_id=row_key;
          expected_body := jsonb_build_object('event_id',row_key,
            'ignored',(row_data->>'ignored')::boolean);
        end if;

      when 'preference' then
        row_key := row_data->>'key';
        row_payload := row_data->'value';
        if jsonb_typeof(row_data->'unset') <> 'boolean' or row_payload is null
           or not public.sync_valid_preference(row_key,row_payload,
             (row_data->>'unset')::boolean) then
          raise exception 'invalid preference mutation' using errcode = '22023';
        end if;
        row_unset := (row_data->>'unset')::boolean;
        insert into public.preferences as current
          (profile_id,key,value,unset,changed_at,mutation_id)
          values (p_profile_id,row_key,row_payload,row_unset,row_time,row_id)
          on conflict (profile_id,key) do update set
            value=excluded.value,unset=excluded.unset,changed_at=excluded.changed_at,
            mutation_id=excluded.mutation_id,received_at=now()
          where (excluded.changed_at,excluded.mutation_id) >
            (current.changed_at,current.mutation_id)
          returning 1 into applied;
        if applied is null then
          select to_jsonb(t), t.changed_at, t.mutation_id into old_row, old_time, old_id
            from public.preferences t where t.profile_id=p_profile_id and t.key=row_key;
          expected_body := jsonb_build_object('key',row_key,'value',row_payload,'unset',row_unset);
        end if;

      when 'customGame', 'customEvent' then
        row_key := row_data->>'key';
        row_payload := row_data->'payload';
        if jsonb_typeof(row_data->'deleted') <> 'boolean' then
          raise exception 'invalid custom deletion state' using errcode = '22023';
        end if;
        row_deleted := (row_data->>'deleted')::boolean;
        if row_payload is null or row_deleted <> (row_payload = 'null'::jsonb) or
           (not row_deleted and (jsonb_typeof(row_payload) <> 'object'
             or row_payload->>'id' is distinct from row_key)) then
          raise exception 'invalid custom payload' using errcode = '22023';
        end if;
        if row_kind = 'customGame' then
          if not row_deleted and (not (row_payload ?& array['id','name','hue','at'])
             or jsonb_typeof(row_payload->'name') <> 'string'
             or jsonb_typeof(row_payload->'hue') <> 'string'
             or jsonb_typeof(row_payload->'at') <> 'string') then
            raise exception 'invalid custom game envelope' using errcode = '22023';
          end if;
          insert into public.custom_games as current
            (profile_id,local_id,payload,deleted,changed_at,mutation_id)
            values (p_profile_id,row_key,
              case when row_deleted then null else row_payload end,row_deleted,row_time,row_id)
            on conflict (profile_id,local_id) do update set
              payload=excluded.payload,deleted=excluded.deleted,
              changed_at=excluded.changed_at,mutation_id=excluded.mutation_id,received_at=now()
            where (excluded.changed_at,excluded.mutation_id) >
              (current.changed_at,current.mutation_id)
            returning 1 into applied;
          if applied is null then
            select to_jsonb(t), t.changed_at, t.mutation_id into old_row, old_time, old_id
              from public.custom_games t where t.profile_id=p_profile_id and t.local_id=row_key;
          end if;
        else
          if not row_deleted and (not (row_payload ?& array[
              'id','game','title','type','startsAt','startPrecision','endsAt',
              'endPrecision','repeat','at','updatedAt'])
             or jsonb_typeof(row_payload->'game') <> 'string'
             or jsonb_typeof(row_payload->'title') <> 'string'
             or jsonb_typeof(row_payload->'type') <> 'string') then
            raise exception 'invalid custom event envelope' using errcode = '22023';
          end if;
          insert into public.custom_events as current
            (profile_id,local_id,payload,deleted,changed_at,mutation_id)
            values (p_profile_id,row_key,
              case when row_deleted then null else row_payload end,row_deleted,row_time,row_id)
            on conflict (profile_id,local_id) do update set
              payload=excluded.payload,deleted=excluded.deleted,
              changed_at=excluded.changed_at,mutation_id=excluded.mutation_id,received_at=now()
            where (excluded.changed_at,excluded.mutation_id) >
              (current.changed_at,current.mutation_id)
            returning 1 into applied;
          if applied is null then
            select to_jsonb(t), t.changed_at, t.mutation_id into old_row, old_time, old_id
              from public.custom_events t where t.profile_id=p_profile_id and t.local_id=row_key;
          end if;
        end if;
        if applied is null then
          expected_body := jsonb_build_object('local_id',row_key,
            'payload',case when row_deleted then null else row_payload end,
            'deleted',row_deleted);
        end if;

      else
        raise exception 'unknown mutation kind' using errcode = '22023';
    end case;

    if applied is not null then
      answer := 'accepted';
    elsif old_id = row_id and old_time <> row_time then
      raise exception 'mutation ID reused with a different version' using errcode = '22023';
    elsif old_time = row_time and old_id = row_id then
      if (old_row - 'profile_id' - 'changed_at' - 'mutation_id' - 'received_at')
         is distinct from expected_body then
        raise exception 'conflicting payload for logical version' using errcode = '22023';
      end if;
      answer := 'accepted';
    else
      answer := 'superseded';
    end if;
    replies := replies || jsonb_build_array(
      jsonb_build_object('mutationId',row_id,'outcome',answer));
  end loop;
  return replies;
end;
$$;

revoke all on function public.ensure_default_profile(),
  public.apply_profile_mutations(uuid,jsonb) from public, anon, authenticated;
revoke all on function public.sync_guard_mutation_id() from public, anon, authenticated;
grant execute on function public.ensure_default_profile(),
  public.apply_profile_mutations(uuid,jsonb) to authenticated;
