-- RC hardening: keep Founder semantics consistent and lock SECURITY DEFINER search paths.
-- Scope: familybot schema only. No public-schema objects are changed.

create or replace function familybot.family_transfer_coins_atomic(
  p_family_id uuid,
  p_sender_id uuid,
  p_target_id uuid,
  p_amount bigint
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  vs bigint;
  vt bigint;
  vf boolean;
begin
  if p_sender_id=p_target_id then raise exception 'cannot_transfer_to_self'; end if;
  if p_amount<=0 or p_amount>1000000 then raise exception 'invalid_amount'; end if;

  select coins,(coalesce(is_founder,false) or role='founder')
    into vs,vf
  from familybot.members
  where id=p_sender_id and family_id=p_family_id
  for update;
  if vs is null then raise exception 'sender_not_found'; end if;

  select coins into vt
  from familybot.members
  where id=p_target_id and family_id=p_family_id
  for update;
  if vt is null then raise exception 'target_not_found'; end if;

  if not coalesce(vf,false) and vs<p_amount then raise exception 'insufficient_coins'; end if;
  if not coalesce(vf,false) then
    update familybot.members set coins=coins-p_amount where id=p_sender_id returning coins into vs;
    insert into familybot.coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id)
    values(p_family_id,p_sender_id,-p_amount,'coin_transfer_out','member',p_target_id::text);
  end if;

  update familybot.members set coins=coins+p_amount where id=p_target_id returning coins into vt;
  insert into familybot.coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id)
  values(p_family_id,p_target_id,p_amount,'coin_transfer_in','member',p_sender_id::text);

  return jsonb_build_object('senderCoins',vs,'targetCoins',vt,'amount',p_amount,'founder',coalesce(vf,false));
end
$$;

create or replace function familybot.family_claim_dezfuli_quiz_atomic(
  p_family_id uuid,
  p_member_id uuid,
  p_word_id text,
  p_xp integer default 10,
  p_coins integer default 3
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  vi uuid;
  vf boolean;
  vc bigint;
  vx bigint;
begin
  if p_xp<0 or p_xp>50 or p_coins<0 or p_coins>20 then raise exception 'invalid_reward'; end if;

  select (coalesce(is_founder,false) or role='founder')
    into vf
  from familybot.members
  where id=p_member_id and family_id=p_family_id
  for update;
  if vf is null then raise exception 'member_not_found'; end if;

  insert into familybot.dezfuli_quiz_claims(family_id,member_id,word_id,xp_reward,coin_reward)
  values(p_family_id,p_member_id,p_word_id,p_xp,p_coins)
  on conflict(member_id,word_id,claim_date) do nothing
  returning id into vi;

  if vi is null then
    return jsonb_build_object('claimed',false,'alreadyClaimed',true,'founder',vf);
  end if;

  if not vf then
    update familybot.members
      set xp=xp+p_xp,coins=coins+p_coins
    where id=p_member_id
    returning xp,coins into vx,vc;
  else
    select xp,coins into vx,vc from familybot.members where id=p_member_id;
  end if;

  insert into familybot.activity_log(family_id,member_id,activity_type,xp_delta,metadata)
  values(p_family_id,p_member_id,'dezfuli_quiz',case when vf then 0 else p_xp end,jsonb_build_object('wordId',p_word_id,'coins',case when vf then 0 else p_coins end));

  if not vf then
    insert into familybot.coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id)
    values(p_family_id,p_member_id,p_coins,'dezfuli_quiz','word',p_word_id);
  end if;

  return jsonb_build_object('claimed',true,'xp',vx,'coins',vc,'xpReward',p_xp,'coinReward',p_coins,'founder',vf);
end
$$;

create or replace function familybot.family_founder_grant_coins_atomic(
  p_family_id uuid,
  p_founder_id uuid,
  p_target_id uuid,
  p_amount bigint
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  vf boolean;
  vt bigint;
begin
  if p_amount<=0 or p_amount>1000000 then raise exception 'invalid_amount'; end if;

  select (coalesce(is_founder,false) or role='founder')
    into vf
  from familybot.members
  where id=p_founder_id and family_id=p_family_id
  for update;
  if coalesce(vf,false)=false then raise exception 'founder_required'; end if;

  if p_target_id=p_founder_id then
    return jsonb_build_object('senderCoins',0,'targetCoins',0,'amount',p_amount,'founder',true);
  end if;

  update familybot.members
    set coins=coins+p_amount
  where id=p_target_id and family_id=p_family_id
  returning coins into vt;
  if vt is null then raise exception 'target_not_found'; end if;

  insert into familybot.coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id)
  values(p_family_id,p_target_id,p_amount,'founder_grant','member',p_founder_id::text);

  return jsonb_build_object('senderCoins',0,'targetCoins',vt,'amount',p_amount,'founder',true);
end
$$;

-- SECURITY DEFINER routines are backend-only and resolve only explicitly-qualified objects.
alter function familybot.family_purchase_item_atomic(uuid,uuid,text,text,text,integer) set search_path = '';
alter function familybot.sagool_interact_atomic(uuid,uuid,text,integer,integer) set search_path = '';
alter function familybot.sagool_claim_daily_mission_atomic(uuid,uuid,text) set search_path = '';
alter function familybot.sagool_tick_atomic(uuid,uuid) set search_path = '';

revoke all on function familybot.family_transfer_coins_atomic(uuid,uuid,uuid,bigint) from public, anon, authenticated;
revoke all on function familybot.family_claim_dezfuli_quiz_atomic(uuid,uuid,text,integer,integer) from public, anon, authenticated;
revoke all on function familybot.family_founder_grant_coins_atomic(uuid,uuid,uuid,bigint) from public, anon, authenticated;
grant execute on function familybot.family_transfer_coins_atomic(uuid,uuid,uuid,bigint) to service_role;
grant execute on function familybot.family_claim_dezfuli_quiz_atomic(uuid,uuid,text,integer,integer) to service_role;
grant execute on function familybot.family_founder_grant_coins_atomic(uuid,uuid,uuid,bigint) to service_role;
