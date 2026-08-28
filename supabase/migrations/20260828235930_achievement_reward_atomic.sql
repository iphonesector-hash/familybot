-- Atomically unlock an achievement and pay its configured reward exactly once.
create or replace function family_claim_achievement_atomic(
  p_family_id uuid,
  p_member_id uuid,
  p_achievement_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unlock text;
  v_reward integer;
  v_coins bigint;
begin
  perform 1 from members where id=p_member_id and family_id=p_family_id for update;
  if not found then raise exception 'member_not_found'; end if;

  select reward_coins into v_reward from achievements where id=p_achievement_id;
  if v_reward is null then raise exception 'achievement_not_found'; end if;

  insert into member_achievements(member_id,achievement_id)
  values(p_member_id,p_achievement_id)
  on conflict(member_id,achievement_id) do nothing
  returning achievement_id into v_unlock;

  if v_unlock is null then
    select coins into v_coins from members where id=p_member_id;
    return jsonb_build_object('claimed',false,'coins',v_coins,'reward',0);
  end if;

  update members set coins=coins+greatest(0,v_reward)
  where id=p_member_id and family_id=p_family_id
  returning coins into v_coins;

  if v_reward>0 then
    insert into coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id)
    values(p_family_id,p_member_id,v_reward,'achievement_unlock','achievement',p_achievement_id);
  end if;

  return jsonb_build_object('claimed',true,'coins',v_coins,'reward',greatest(0,v_reward));
end;
$$;
