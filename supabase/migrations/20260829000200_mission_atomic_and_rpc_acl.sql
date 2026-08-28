-- Atomic mission reward claim + explicit RPC ACL hardening.
create or replace function public.family_claim_mission_atomic(
  p_family_id uuid,
  p_member_id uuid,
  p_mission_id text,
  p_period_key text,
  p_reward integer
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_claim uuid;
  v_coins bigint;
begin
  if p_reward < 0 or p_reward > 1000 then raise exception 'invalid_mission_reward'; end if;
  if length(coalesce(p_mission_id,'')) < 1 or length(coalesce(p_period_key,'')) < 1 then raise exception 'invalid_mission_key'; end if;

  perform 1 from public.members where id=p_member_id and family_id=p_family_id for update;
  if not found then raise exception 'member_not_found'; end if;

  insert into public.mission_claims(family_id,member_id,mission_id,period_key,reward_coins)
  values(p_family_id,p_member_id,p_mission_id,p_period_key,p_reward)
  on conflict(member_id,mission_id,period_key) do nothing
  returning id into v_claim;

  if v_claim is null then
    select coins into v_coins from public.members where id=p_member_id and family_id=p_family_id;
    return jsonb_build_object('claimed',false,'alreadyClaimed',true,'reward',0,'coins',v_coins);
  end if;

  update public.members set coins=coins+p_reward
  where id=p_member_id and family_id=p_family_id
  returning coins into v_coins;

  if p_reward>0 then
    insert into public.coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id)
    values(p_family_id,p_member_id,p_reward,'mission_claim','mission',p_mission_id || ':' || p_period_key);
  end if;

  return jsonb_build_object('claimed',true,'alreadyClaimed',false,'reward',p_reward,'coins',v_coins);
end;
$$;

-- These RPCs are server-only. The browser receives an anon key, so never leave EXECUTE to PUBLIC/anon/authenticated.
revoke all on function public.family_add_member_coins(uuid,bigint) from public, anon, authenticated;
revoke all on function public.family_add_member_xp(uuid,integer) from public, anon, authenticated;
revoke all on function public.family_claim_daily_atomic(uuid,uuid,date,integer) from public, anon, authenticated;
revoke all on function public.family_complete_task_atomic(uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.family_purchase_item_atomic(uuid,uuid,text,text,text,integer) from public, anon, authenticated;
revoke all on function public.family_transfer_coins_atomic(uuid,uuid,uuid,bigint) from public, anon, authenticated;
revoke all on function public.family_claim_daily_spin_atomic(uuid,uuid,text,integer) from public, anon, authenticated;
revoke all on function public.family_owner_gift_atomic(uuid,uuid,uuid,text,integer,text) from public, anon, authenticated;
revoke all on function public.family_claim_achievement_atomic(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.family_claim_mission_atomic(uuid,uuid,text,text,integer) from public, anon, authenticated;

grant execute on function public.family_add_member_coins(uuid,bigint) to service_role;
grant execute on function public.family_add_member_xp(uuid,integer) to service_role;
grant execute on function public.family_claim_daily_atomic(uuid,uuid,date,integer) to service_role;
grant execute on function public.family_complete_task_atomic(uuid,uuid,uuid) to service_role;
grant execute on function public.family_purchase_item_atomic(uuid,uuid,text,text,text,integer) to service_role;
grant execute on function public.family_transfer_coins_atomic(uuid,uuid,uuid,bigint) to service_role;
grant execute on function public.family_claim_daily_spin_atomic(uuid,uuid,text,integer) to service_role;
grant execute on function public.family_owner_gift_atomic(uuid,uuid,uuid,text,integer,text) to service_role;
grant execute on function public.family_claim_achievement_atomic(uuid,uuid,text) to service_role;
grant execute on function public.family_claim_mission_atomic(uuid,uuid,text,text,integer) to service_role;
