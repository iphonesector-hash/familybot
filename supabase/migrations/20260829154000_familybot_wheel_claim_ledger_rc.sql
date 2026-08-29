-- RC correction: keep the legacy coins/xp claim table intact and add a generic wheel ledger.
-- Scope: familybot schema only. No public-schema objects are changed.

create table if not exists familybot.wheel_claims(
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references familybot.families(id) on delete cascade,
  member_id uuid not null references familybot.members(id) on delete cascade,
  reward_kind text not null check (reward_kind in ('coins','xp','item')),
  reward_amount integer not null check (reward_amount>0),
  item_id text,
  item_name text,
  item_kind text,
  claimed_at timestamptz not null default now(),
  constraint wheel_claims_item_shape check (
    (reward_kind='item' and item_id is not null and item_name is not null and item_kind in ('sagool','house','profile'))
    or (reward_kind in ('coins','xp'))
  )
);
create index if not exists wheel_claims_member_time_idx on familybot.wheel_claims(family_id,member_id,claimed_at desc);
alter table familybot.wheel_claims enable row level security;
revoke all on table familybot.wheel_claims from public,anon,authenticated;
grant select,insert,update,delete on table familybot.wheel_claims to service_role;

create or replace function familybot.family_claim_daily_spin_reward_atomic(
  p_family_id uuid,
  p_member_id uuid,
  p_reward_kind text,
  p_reward_amount integer default 0,
  p_item_id text default null,
  p_item_name text default null,
  p_item_kind text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  vl timestamptz;
  vn timestamptz;
  vc bigint;
  vx bigint;
  vlevel integer;
  vf boolean;
begin
  if p_reward_kind not in ('coins','xp','item') then raise exception 'invalid_reward'; end if;
  if p_reward_kind in ('coins','xp') and (p_reward_amount<=0 or p_reward_amount>10000) then raise exception 'invalid_reward_amount'; end if;
  if p_reward_kind='item' and (coalesce(trim(p_item_id),'')='' or coalesce(trim(p_item_name),'')='' or p_item_kind not in ('sagool','house','profile')) then raise exception 'invalid_item_reward'; end if;

  select (coalesce(is_founder,false) or role='founder'),coins,xp,level
    into vf,vc,vx,vlevel
  from familybot.members
  where id=p_member_id and family_id=p_family_id
  for update;
  if vf is null then raise exception 'member_not_found'; end if;

  select max(x.claimed_at) into vl
  from (
    select claimed_at from familybot.daily_spin_claims where family_id=p_family_id and member_id=p_member_id
    union all
    select claimed_at from familybot.wheel_claims where family_id=p_family_id and member_id=p_member_id
  ) x;
  if vl is not null and vl+interval '24 hours'>now() then
    vn:=vl+interval '24 hours';
    return jsonb_build_object('claimed',false,'nextAt',vn,'founder',vf);
  end if;

  if p_reward_kind='coins' then
    if not vf then
      update familybot.members set coins=coins+p_reward_amount,last_active_at=now() where id=p_member_id returning coins into vc;
      insert into familybot.coin_ledger(family_id,member_id,amount,reason,reference_type)
      values(p_family_id,p_member_id,p_reward_amount,'daily_spin','wheel');
    else
      update familybot.members set last_active_at=now() where id=p_member_id;
    end if;
  elsif p_reward_kind='xp' then
    if not vf then
      update familybot.members m
      set xp=m.xp+p_reward_amount,
          level=greatest(1,floor(sqrt((m.xp+p_reward_amount)::numeric/50))::integer+1),
          last_active_at=now()
      where id=p_member_id
      returning xp,level into vx,vlevel;
      insert into familybot.activity_log(family_id,member_id,activity_type,xp_delta,metadata)
      values(p_family_id,p_member_id,'daily_spin',p_reward_amount,jsonb_build_object('source','wheel'));
    else
      update familybot.members set last_active_at=now() where id=p_member_id;
    end if;
  else
    insert into familybot.member_items(family_id,member_id,item_id,item_name,item_kind,price_paid)
    values(p_family_id,p_member_id,p_item_id,p_item_name,p_item_kind,0);
    update familybot.members set last_active_at=now() where id=p_member_id;
  end if;

  insert into familybot.wheel_claims(family_id,member_id,reward_kind,reward_amount,item_id,item_name,item_kind)
  values(
    p_family_id,p_member_id,p_reward_kind,
    case when p_reward_kind='item' then 1 else p_reward_amount end,
    case when p_reward_kind='item' then p_item_id else null end,
    case when p_reward_kind='item' then p_item_name else null end,
    case when p_reward_kind='item' then p_item_kind else null end
  );

  return jsonb_build_object(
    'claimed',true,
    'kind',p_reward_kind,
    'amount',case when p_reward_kind='item' then 1 else p_reward_amount end,
    'coins',vc,'xp',vx,'level',vlevel,
    'itemId',p_item_id,'itemName',p_item_name,'itemKind',p_item_kind,
    'founder',vf,'nextAt',now()+interval '24 hours'
  );
end
$$;

revoke all on function familybot.family_claim_daily_spin_reward_atomic(uuid,uuid,text,integer,text,text,text) from public,anon,authenticated;
grant execute on function familybot.family_claim_daily_spin_reward_atomic(uuid,uuid,text,integer,text,text,text) to service_role;
