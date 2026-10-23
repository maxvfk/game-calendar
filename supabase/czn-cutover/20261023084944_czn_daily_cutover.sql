-- RELEASE CANDIDATE ONLY. Server capability defaults OFF. Not installed in production.
-- Apply after reviewed backup-v2 tooling/pin coordination; never through old migration replay.
create schema calendar_sync_internal;
revoke all on schema calendar_sync_internal from public, anon, authenticated, calendar_backup;
alter function public.apply_profile_mutations(uuid,jsonb) set schema calendar_sync_internal;
revoke all on function calendar_sync_internal.apply_profile_mutations(uuid,jsonb)
  from public,anon,authenticated,calendar_backup;

create table public.czn_daily_release (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false
);
insert into public.czn_daily_release values(true,false);
create table public.czn_daily_policy (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  policy_id text not null default 'czn-daily-utc18-opening-v1'
    check(policy_id='czn-daily-utc18-opening-v1'),
  epoch uuid not null default gen_random_uuid(),
  cutover_at timestamptz not null default clock_timestamp()
    check(cutover_at not in ('infinity','-infinity')),
  unique(profile_id,policy_id,epoch)
);
create table public.czn_daily_marks (
  profile_id uuid not null,
  policy_id text not null check(policy_id='czn-daily-utc18-opening-v1'),
  epoch uuid not null,
  subject_id text not null check(subject_id='dailies:czn'),
  day_key text not null check(day_key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    and day_key::date::text=day_key),
  completed boolean not null,
  changed_at timestamptz not null check(changed_at not in ('infinity','-infinity')),
  mutation_id uuid not null,
  received_at timestamptz not null default now(),
  primary key(profile_id,policy_id,subject_id,day_key),
  foreign key(profile_id,policy_id,epoch) references public.czn_daily_policy(profile_id,policy_id,epoch)
);
create trigger sync_guard_mutation_id before update on public.czn_daily_marks
  for each row execute function public.sync_guard_mutation_id();
alter table public.czn_daily_release enable row level security;
alter table public.czn_daily_policy enable row level security;
alter table public.czn_daily_marks enable row level security;
revoke all on public.czn_daily_release,public.czn_daily_policy,public.czn_daily_marks
  from public,anon,authenticated;
grant select on public.czn_daily_policy,public.czn_daily_marks to authenticated;
create policy czn_policy_read on public.czn_daily_policy for select to authenticated
  using(exists(select 1 from public.profiles p where p.id=profile_id and p.owner_id=(select auth.uid())));
create policy czn_marks_read on public.czn_daily_marks for select to authenticated
  using(exists(select 1 from public.profiles p where p.id=profile_id and p.owner_id=(select auth.uid())));
grant select on public.czn_daily_release,public.czn_daily_policy,public.czn_daily_marks to calendar_backup;
create policy calendar_backup_read on public.czn_daily_release for select to calendar_backup using(true);
create policy calendar_backup_read on public.czn_daily_policy for select to calendar_backup using(true);
create policy calendar_backup_read on public.czn_daily_marks for select to calendar_backup using(true);

-- A fence survives feature disabling. All writers lock profile BEFORE reading policy.
create function public.czn_daily_negotiate(p_profile_id uuid,p_cutover boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; available boolean;
begin
  perform 1 from public.profiles where id=p_profile_id and owner_id=auth.uid() for update;
  if not found then raise exception 'profile unavailable' using errcode='42501'; end if;
  select enabled into available from public.czn_daily_release where singleton;
  if p_cutover and available then
    insert into public.czn_daily_policy(profile_id) values(p_profile_id) on conflict do nothing;
  end if;
  select jsonb_build_object('policyId',policy_id,'epoch',epoch,'cutoverAt',cutover_at)
    into result from public.czn_daily_policy where profile_id=p_profile_id;
  return jsonb_build_object('protocol',2,'enabled',available,'policy',result);
end;
$$;
create function public.apply_profile_mutations(p_profile_id uuid,p_mutations jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb; replies jsonb:='[]'::jsonb; fenced boolean;
begin
  perform 1 from public.profiles where id=p_profile_id and owner_id=auth.uid() for update;
  if not found then raise exception 'profile unavailable' using errcode='42501'; end if;
  if p_mutations is null or jsonb_typeof(p_mutations)<>'array'
    or jsonb_array_length(p_mutations)>100 or pg_column_size(p_mutations)>262144 then
    raise exception 'invalid mutation batch' using errcode='22023'; end if;
  select exists(select 1 from public.czn_daily_policy where profile_id=p_profile_id) into fenced;
  for r in select value from jsonb_array_elements(p_mutations) loop
    if fenced and r->>'kind'='daily' and r->'key'->>'subjectId'='dailies:czn' then
      -- No acknowledgement of success: cached old clients preserve their outbox.
      if r->>'mutationId' is null then raise exception 'invalid held mutation' using errcode='22023'; end if;
      replies:=replies||jsonb_build_array(jsonb_build_object('mutationId',r->>'mutationId','outcome','update_required'));
    else
      replies:=replies||calendar_sync_internal.apply_profile_mutations(p_profile_id,jsonb_build_array(r));
    end if;
  end loop;
  return replies;
end;
$$;
create function public.czn_daily_apply(p_profile_id uuid,p_epoch uuid,p_mutations jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare policy public.czn_daily_policy; r jsonb; old public.czn_daily_marks;
  d text; t timestamptz; mid uuid; done boolean; replies jsonb:='[]'::jsonb; outcome text;
begin
  perform 1 from public.profiles where id=p_profile_id and owner_id=auth.uid() for update;
  if not found then raise exception 'profile unavailable' using errcode='42501'; end if;
  select * into policy from public.czn_daily_policy where profile_id=p_profile_id;
  if policy.epoch is null or policy.epoch is distinct from p_epoch then
    raise exception 'CZN epoch mismatch' using errcode='22023'; end if;
  if not (select enabled from public.czn_daily_release where singleton) then
    raise exception 'CZN policy read-only' using errcode='55000'; end if;
  if p_mutations is null or jsonb_typeof(p_mutations)<>'array'
    or jsonb_array_length(p_mutations)>100 or pg_column_size(p_mutations)>262144 then
    raise exception 'invalid mutation batch' using errcode='22023'; end if;
  for r in select value from jsonb_array_elements(p_mutations) loop
    if jsonb_typeof(r)<>'object' or
      not(r ?& array['policyId','subjectId','dayKey','completed','changedAt','mutationId']) or
      (select count(*) from jsonb_object_keys(r))<>6 or
      r->>'policyId' is distinct from policy.policy_id or r->>'subjectId' is distinct from 'dailies:czn' or
      jsonb_typeof(r->'completed') is distinct from 'boolean' or
      coalesce(r->>'changedAt','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,3})?(Z|[+-][0-9]{2}:[0-9]{2})$' or
      coalesce(r->>'dayKey','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or r->>'mutationId' is null then
      raise exception 'invalid CZN mutation' using errcode='22023'; end if;
    d:=r->>'dayKey'; t:=(r->>'changedAt')::timestamptz; mid:=(r->>'mutationId')::uuid; done:=(r->>'completed')::boolean;
    if d::date::text<>d or t in ('infinity','-infinity') or
      d < ((policy.cutover_at at time zone 'UTC')-interval '18 hours')::date::text or
      d > ((clock_timestamp() at time zone 'UTC')-interval '18 hours')::date::text then
      raise exception 'CZN date outside policy window' using errcode='22023'; end if;
    select * into old from public.czn_daily_marks where profile_id=p_profile_id
      and policy_id=policy.policy_id and subject_id='dailies:czn' and day_key=d;
    if old.mutation_id=mid and (old.changed_at<>t or old.completed<>done) then
      raise exception 'conflicting CZN mutation ID' using errcode='22023'; end if;
    if old.mutation_id is null or (t,mid)>(old.changed_at,old.mutation_id) then
      insert into public.czn_daily_marks values(p_profile_id,policy.policy_id,p_epoch,'dailies:czn',d,done,t,mid,now())
        on conflict(profile_id,policy_id,subject_id,day_key) do update set
          completed=excluded.completed,changed_at=excluded.changed_at,mutation_id=excluded.mutation_id,received_at=excluded.received_at;
      outcome:='accepted';
    else outcome:=case when (t,mid)=(old.changed_at,old.mutation_id) then 'accepted' else 'superseded' end;
    end if;
    replies:=replies||jsonb_build_array(jsonb_build_object('mutationId',mid,'outcome',outcome));
  end loop;
  return replies;
end;
$$;
revoke all on function public.apply_profile_mutations(uuid,jsonb),
  public.czn_daily_negotiate(uuid,boolean),public.czn_daily_apply(uuid,uuid,jsonb)
  from public,anon,authenticated,calendar_backup;
grant execute on function public.apply_profile_mutations(uuid,jsonb),
  public.czn_daily_negotiate(uuid,boolean),public.czn_daily_apply(uuid,uuid,jsonb) to authenticated;
