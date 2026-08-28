-- Canonical release reconciliation for Family Bot rewards/fund/briefing.
-- Idempotent: safe after earlier development migrations.

create table if not exists public.daily_spin_claims (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  reward_kind text not null check (reward_kind in ('coins','xp')),
  reward_amount integer not null check (reward_amount > 0),
  claimed_at timestamptz not null default now()
);
create index if not exists daily_spin_member_time_idx on public.daily_spin_claims(member_id,claimed_at desc);

create table if not exists public.family_fund_memberships (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_member_id uuid references public.members(id) on delete set null,
  unique(family_id,member_id)
);
create index if not exists family_fund_family_status_idx on public.family_fund_memberships(family_id,status,created_at desc);

create table if not exists public.owner_gift_log (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  owner_member_id uuid not null references public.members(id) on delete cascade,
  target_member_id uuid not null references public.members(id) on delete cascade,
  gift_kind text not null check (gift_kind in ('coins','xp')),
  amount integer not null check (amount > 0 and amount <= 1000000),
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists owner_gift_family_time_idx on public.owner_gift_log(family_id,created_at desc);

create table if not exists public.briefing_deliveries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  delivery_date date not null,
  slot text not null check (slot in ('morning','evening')),
  delivered_at timestamptz not null default now(),
  unique(family_id,delivery_date,slot)
);
create index if not exists briefing_delivery_date_idx on public.briefing_deliveries(delivery_date,slot);

create or replace function public.family_claim_daily_spin_atomic(
  p_family_id uuid,
  p_member_id uuid,
  p_reward_kind text,
  p_reward_amount integer
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_member uuid;
  v_last timestamptz;
  v_next timestamptz;
  v_coins bigint;
  v_xp bigint;
  v_level integer;
begin
  if p_reward_kind not in ('coins','xp') or p_reward_amount <= 0 then
    raise exception 'invalid_reward';
  end if;

  select id into v_member from public.members
  where id=p_member_id and family_id=p_family_id
  for update;
  if v_member is null then raise exception 'member_not_found'; end if;

  select claimed_at into v_last
  from public.daily_spin_claims
  where family_id=p_family_id and member_id=p_member_id
  order by claimed_at desc limit 1;

  if v_last is not null and v_last + interval '24 hours' > now() then
    v_next:=v_last+interval '24 hours';
    return jsonb_build_object('claimed',false,'nextAt',v_next);
  end if;

  if p_reward_kind='coins' then
    update public.members set coins=coins+p_reward_amount,last_active_at=now()
      where id=p_member_id returning coins into v_coins;
    insert into public.coin_ledger(family_id,member_id,amount,reason,reference_type)
      values(p_family_id,p_member_id,p_reward_amount,'daily_spin','wheel');
  else
    update public.members m set xp=m.xp+p_reward_amount,
      level=greatest(1,floor(sqrt((m.xp+p_reward_amount)::numeric/50))::integer+1),
      last_active_at=now()
      where id=p_member_id returning xp,level into v_xp,v_level;
    insert into public.activity_log(family_id,member_id,activity_type,xp_delta,metadata)
      values(p_family_id,p_member_id,'daily_spin',p_reward_amount,jsonb_build_object('source','wheel'));
  end if;

  insert into public.daily_spin_claims(family_id,member_id,reward_kind,reward_amount)
    values(p_family_id,p_member_id,p_reward_kind,p_reward_amount);

  return jsonb_build_object('claimed',true,'kind',p_reward_kind,'amount',p_reward_amount,'coins',v_coins,'xp',v_xp,'level',v_level,'nextAt',now()+interval '24 hours');
end;
$$;

create or replace function public.family_owner_gift_atomic(
  p_family_id uuid,
  p_owner_member_id uuid,
  p_target_member_id uuid,
  p_kind text,
  p_amount integer,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_target uuid;
  v_coins bigint;
  v_xp bigint;
  v_level integer;
begin
  if p_kind not in ('coins','xp') or p_amount < 1 or p_amount > 100000 then raise exception 'invalid_gift'; end if;
  if not exists(select 1 from public.members where id=p_owner_member_id and family_id=p_family_id) then raise exception 'owner_member_not_found'; end if;
  select id into v_target from public.members where id=p_target_member_id and family_id=p_family_id for update;
  if v_target is null then raise exception 'target_member_not_found'; end if;

  if p_kind='coins' then
    update public.members set coins=coins+p_amount,last_active_at=now() where id=p_target_member_id returning coins into v_coins;
    insert into public.coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id)
      values(p_family_id,p_target_member_id,p_amount,'owner_gift','member',p_owner_member_id);
  else
    update public.members m set xp=m.xp+p_amount,
      level=greatest(1,floor(sqrt((m.xp+p_amount)::numeric/50))::integer+1),last_active_at=now()
      where id=p_target_member_id returning xp,level into v_xp,v_level;
    insert into public.activity_log(family_id,member_id,activity_type,xp_delta,metadata)
      values(p_family_id,p_target_member_id,'owner_gift',p_amount,jsonb_build_object('ownerMemberId',p_owner_member_id));
  end if;

  insert into public.owner_gift_log(family_id,owner_member_id,target_member_id,gift_kind,amount,reason)
    values(p_family_id,p_owner_member_id,p_target_member_id,p_kind,p_amount,left(nullif(trim(p_reason),''),500));

  return jsonb_build_object('ok',true,'kind',p_kind,'amount',p_amount,'coins',v_coins,'xp',v_xp,'level',v_level);
end;
$$;
