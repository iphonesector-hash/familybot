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
  v_member uuid;
  v_coins bigint;
  v_xp bigint;
  v_level integer;
begin
  -- Serialize every spin attempt for the member, including the very first one.
  select id into v_member
  from members
  where id=p_member_id and family_id=p_family_id
  for update;
  if v_member is null then raise exception 'member_not_found'; end if;

  select claimed_at into v_last
  from daily_spin_claims
  where member_id=p_member_id and family_id=p_family_id
  order by claimed_at desc limit 1;

  if v_last is not null and v_last + interval '24 hours' > now() then
    v_next := v_last + interval '24 hours';
    return jsonb_build_object('claimed',false,'nextAt',v_next);
  end if;

  if p_reward_kind='coins' then
    update members set coins=coins+p_reward_amount where id=p_member_id returning coins into v_coins;
    insert into coin_ledger(family_id,member_id,amount,reason)
      values(p_family_id,p_member_id,p_reward_amount,'daily_spin');
  elsif p_reward_kind='xp' then
    update members m set xp=m.xp+p_reward_amount,
      level=greatest(1,floor(sqrt((m.xp+p_reward_amount)::numeric/50))::integer+1),
      last_active_at=now()
      where m.id=p_member_id returning m.xp,m.level into v_xp,v_level;
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
