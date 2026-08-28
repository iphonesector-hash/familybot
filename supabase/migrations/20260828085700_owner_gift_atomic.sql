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
  v_coins bigint;
  v_xp bigint;
  v_level integer;
begin
  if p_kind not in ('coins','xp') then raise exception 'invalid_gift_kind'; end if;
  if p_amount < 1 or p_amount > 100000 then raise exception 'invalid_gift_amount'; end if;
  if not exists(select 1 from public.members where id=p_owner_member_id and family_id=p_family_id) then raise exception 'owner_member_not_found'; end if;
  if not exists(select 1 from public.members where id=p_target_member_id and family_id=p_family_id) then raise exception 'target_member_not_found'; end if;

  if p_kind='coins' then
    update public.members
      set coins=coins+p_amount,last_active_at=now()
      where id=p_target_member_id and family_id=p_family_id
      returning coins,xp,level into v_coins,v_xp,v_level;
    insert into public.coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id)
      values(p_family_id,p_target_member_id,p_amount,'owner_gift','member',p_owner_member_id::text);
  else
    update public.members m
      set xp=m.xp+p_amount,
          level=greatest(1,floor(sqrt((m.xp+p_amount)::numeric/50))::integer+1),
          last_active_at=now()
      where m.id=p_target_member_id and m.family_id=p_family_id
      returning m.coins,m.xp,m.level into v_coins,v_xp,v_level;
    insert into public.activity_log(family_id,member_id,activity_type,xp_delta,metadata)
      values(p_family_id,p_target_member_id,'owner_gift',p_amount,jsonb_build_object('ownerMemberId',p_owner_member_id));
  end if;

  insert into public.owner_gift_log(family_id,owner_member_id,target_member_id,gift_kind,amount,reason)
    values(p_family_id,p_owner_member_id,p_target_member_id,p_kind,p_amount,nullif(left(coalesce(p_reason,''),500),''));

  return jsonb_build_object('gifted',true,'kind',p_kind,'amount',p_amount,'coins',v_coins,'xp',v_xp,'level',v_level);
end;
$$;
