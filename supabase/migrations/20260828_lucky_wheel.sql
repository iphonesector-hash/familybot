create table if not exists public.lucky_wheel_spins (
  member_id uuid primary key references public.members(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  last_spun_at timestamptz not null default now(),
  last_reward_kind text not null check (last_reward_kind in ('coins','xp')),
  last_reward_amount integer not null check (last_reward_amount > 0),
  spin_count integer not null default 1,
  updated_at timestamptz not null default now()
);
create index if not exists lucky_wheel_family_idx on public.lucky_wheel_spins(family_id,last_spun_at desc);

create or replace function public.family_spin_lucky_wheel(p_family_id uuid,p_member_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_member public.members%rowtype;
  v_spin public.lucky_wheel_spins%rowtype;
  v_roll double precision;
  v_kind text;
  v_amount integer;
  v_now timestamptz:=now();
  v_next timestamptz;
begin
  select * into v_member from public.members where id=p_member_id and family_id=p_family_id for update;
  if not found then raise exception 'member_not_found'; end if;
  select * into v_spin from public.lucky_wheel_spins where member_id=p_member_id for update;
  if found and v_spin.last_spun_at > v_now - interval '24 hours' then
    v_next:=v_spin.last_spun_at + interval '24 hours';
    return jsonb_build_object('spun',false,'reason','cooldown','nextSpinAt',v_next,'coins',v_member.coins,'xp',v_member.xp);
  end if;
  v_roll:=random();
  if v_roll < .08 then v_kind:='coins'; v_amount:=250;
  elsif v_roll < .20 then v_kind:='xp'; v_amount:=120;
  elsif v_roll < .38 then v_kind:='coins'; v_amount:=100;
  elsif v_roll < .58 then v_kind:='xp'; v_amount:=60;
  elsif v_roll < .78 then v_kind:='coins'; v_amount:=50;
  else v_kind:='xp'; v_amount:=30;
  end if;
  if v_kind='coins' then update public.members set coins=coins+v_amount where id=p_member_id returning * into v_member;
  else update public.members set xp=xp+v_amount,level=greatest(level,1+((xp+v_amount)/500)) where id=p_member_id returning * into v_member;
  end if;
  insert into public.lucky_wheel_spins(member_id,family_id,last_spun_at,last_reward_kind,last_reward_amount,spin_count,updated_at)
  values(p_member_id,p_family_id,v_now,v_kind,v_amount,1,v_now)
  on conflict(member_id) do update set family_id=excluded.family_id,last_spun_at=excluded.last_spun_at,last_reward_kind=excluded.last_reward_kind,last_reward_amount=excluded.last_reward_amount,spin_count=public.lucky_wheel_spins.spin_count+1,updated_at=excluded.updated_at;
  if v_kind='coins' then insert into public.coin_ledger(family_id,member_id,amount,reason,reference_type) values(p_family_id,p_member_id,v_amount,'lucky_wheel','lucky_wheel'); end if;
  insert into public.activity_log(family_id,member_id,activity_type,xp_delta,metadata) values(p_family_id,p_member_id,'lucky_wheel',case when v_kind='xp' then v_amount else 0 end,jsonb_build_object('rewardKind',v_kind,'rewardAmount',v_amount));
  return jsonb_build_object('spun',true,'rewardKind',v_kind,'rewardAmount',v_amount,'nextSpinAt',v_now+interval '24 hours','coins',v_member.coins,'xp',v_member.xp);
end $$;
