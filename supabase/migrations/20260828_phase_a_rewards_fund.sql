create table if not exists daily_spin_claims (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  reward_kind text not null check (reward_kind in ('coins','xp')),
  reward_amount integer not null check (reward_amount > 0),
  claimed_at timestamptz not null default now()
);
create index if not exists daily_spin_member_time_idx on daily_spin_claims(member_id,claimed_at desc);

create table if not exists family_fund_memberships (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_member_id uuid references members(id) on delete set null,
  unique(family_id,member_id)
);
create index if not exists family_fund_family_status_idx on family_fund_memberships(family_id,status,created_at desc);

create table if not exists owner_gift_log (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  owner_member_id uuid not null references members(id) on delete cascade,
  target_member_id uuid not null references members(id) on delete cascade,
  gift_kind text not null check (gift_kind in ('coins','xp')),
  amount integer not null check (amount > 0 and amount <= 1000000),
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists owner_gift_family_time_idx on owner_gift_log(family_id,created_at desc);

create or replace function family_claim_daily_spin_atomic(
  p_family_id uuid,
  p_member_id uuid,
  p_reward_kind text,
  p_reward_amount integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last timestamptz;
  v_next timestamptz;
  v_coins bigint;
  v_xp bigint;
  v_level integer;
begin
  select claimed_at into v_last
  from daily_spin_claims
  where member_id=p_member_id and family_id=p_family_id
  order by claimed_at desc limit 1 for update;

  if v_last is not null and v_last + interval '24 hours' > now() then
    v_next := v_last + interval '24 hours';
    return jsonb_build_object('claimed',false,'nextAt',v_next);
  end if;

  if p_reward_kind='coins' then
    update members set coins=coins+p_reward_amount
      where id=p_member_id and family_id=p_family_id returning coins into v_coins;
    if v_coins is null then raise exception 'member_not_found'; end if;
    insert into coin_ledger(family_id,member_id,amount,reason)
      values(p_family_id,p_member_id,p_reward_amount,'daily_spin');
  elsif p_reward_kind='xp' then
    update members m set xp=m.xp+p_reward_amount,
      level=greatest(1,floor(sqrt((m.xp+p_reward_amount)::numeric/50))::integer+1),
      last_active_at=now()
      where m.id=p_member_id and m.family_id=p_family_id returning m.xp,m.level into v_xp,v_level;
    if v_xp is null then raise exception 'member_not_found'; end if;
    insert into activity_log(family_id,member_id,activity_type,xp_delta,metadata)
      values(p_family_id,p_member_id,'daily_spin',p_reward_amount,jsonb_build_object('source','wheel'));
  else
    raise exception 'invalid_reward_kind';
  end if;

  insert into daily_spin_claims(family_id,member_id,reward_kind,reward_amount)
    values(p_family_id,p_member_id,p_reward_kind,p_reward_amount);

  return jsonb_build_object('claimed',true,'kind',p_reward_kind,'amount',p_reward_amount,'coins',v_coins,'xp',v_xp,'level',v_level,'nextAt',now()+interval '24 hours');
end;
$$;
