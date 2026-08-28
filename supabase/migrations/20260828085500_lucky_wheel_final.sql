-- Final Lucky Wheel implementation used by /api/family/spin.
-- Idempotent and safe after older daily_spin_claims migrations.

create table if not exists lucky_wheel_spins (
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  last_spun_at timestamptz not null default now(),
  last_reward_kind text not null check (last_reward_kind in ('coins','xp')),
  last_reward_amount integer not null check (last_reward_amount > 0),
  primary key(family_id,member_id)
);
create index if not exists lucky_wheel_last_spin_idx on lucky_wheel_spins(member_id,last_spun_at desc);

create or replace function family_spin_lucky_wheel(p_family_id uuid,p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_member uuid;
  v_last timestamptz;
  v_roll double precision;
  v_kind text;
  v_amount integer;
  v_coins bigint;
  v_xp bigint;
  v_level integer;
begin
  -- Serializes all concurrent spin attempts, including a member's first spin.
  select id into v_member from members
  where id=p_member_id and family_id=p_family_id
  for update;
  if v_member is null then raise exception 'member_not_found'; end if;

  select last_spun_at into v_last from lucky_wheel_spins
  where family_id=p_family_id and member_id=p_member_id;

  if v_last is not null and v_last + interval '24 hours' > now() then
    return jsonb_build_object(
      'spun',false,
      'reason','cooldown',
      'nextSpinAt',v_last + interval '24 hours'
    );
  end if;

  -- Weighted prize table. Rare prizes are intentionally much less frequent.
  v_roll := random();
  if v_roll < 0.02 then v_kind:='coins'; v_amount:=250;
  elsif v_roll < 0.07 then v_kind:='xp'; v_amount:=120;
  elsif v_roll < 0.19 then v_kind:='coins'; v_amount:=100;
  elsif v_roll < 0.37 then v_kind:='xp'; v_amount:=60;
  elsif v_roll < 0.65 then v_kind:='coins'; v_amount:=50;
  else v_kind:='xp'; v_amount:=30;
  end if;

  if v_kind='coins' then
    update members set coins=coins+v_amount where id=p_member_id returning coins into v_coins;
    insert into coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id)
    values(p_family_id,p_member_id,v_amount,'lucky_wheel','lucky_wheel',p_member_id::text);
  else
    update members m
    set xp=m.xp+v_amount,
        level=greatest(1,floor(sqrt((m.xp+v_amount)::numeric/50))::integer+1),
        last_active_at=now()
    where m.id=p_member_id
    returning m.xp,m.level into v_xp,v_level;
    insert into activity_log(family_id,member_id,activity_type,xp_delta,metadata)
    values(p_family_id,p_member_id,'lucky_wheel',v_amount,jsonb_build_object('source','daily_wheel'));
  end if;

  insert into lucky_wheel_spins(family_id,member_id,last_spun_at,last_reward_kind,last_reward_amount)
  values(p_family_id,p_member_id,now(),v_kind,v_amount)
  on conflict(family_id,member_id) do update set
    last_spun_at=excluded.last_spun_at,
    last_reward_kind=excluded.last_reward_kind,
    last_reward_amount=excluded.last_reward_amount;

  return jsonb_build_object(
    'spun',true,
    'rewardKind',v_kind,
    'rewardAmount',v_amount,
    'coins',v_coins,
    'xp',v_xp,
    'level',v_level,
    'nextSpinAt',now()+interval '24 hours'
  );
end;
$$;
