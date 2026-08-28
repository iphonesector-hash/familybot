create or replace function family_add_member_coins(p_member_id uuid, p_delta bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare v_coins bigint;
begin
  update members
  set coins = coins + p_delta
  where id = p_member_id and coins + p_delta >= 0
  returning coins into v_coins;
  if not found then raise exception 'insufficient_coins'; end if;
  return v_coins;
end;
$$;

create or replace function family_add_member_xp(p_member_id uuid, p_delta integer)
returns table(xp bigint, level integer)
language plpgsql
security definer
set search_path = public
as $$
declare v_xp bigint; v_level integer;
begin
  if p_delta <= 0 then
    select m.xp,m.level into v_xp,v_level from members m where m.id=p_member_id;
  else
    update members m
    set xp = m.xp + p_delta,
        level = greatest(1, floor(sqrt((m.xp + p_delta)::numeric / 50))::integer + 1),
        last_active_at = now()
    where m.id = p_member_id
    returning m.xp,m.level into v_xp,v_level;
  end if;
  if v_xp is null then raise exception 'member_not_found'; end if;
  return query select v_xp,v_level;
end;
$$;

create or replace function family_claim_daily_atomic(p_family_id uuid, p_member_id uuid, p_claim_date date, p_reward integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_inserted uuid; v_coins bigint;
begin
  insert into daily_claims(family_id,member_id,claim_date,reward_coins)
  values(p_family_id,p_member_id,p_claim_date,p_reward)
  on conflict(member_id,claim_date) do nothing
  returning id into v_inserted;
  if v_inserted is null then return jsonb_build_object('claimed',false); end if;
  update members set coins=coins+p_reward where id=p_member_id and family_id=p_family_id returning coins into v_coins;
  insert into coin_ledger(family_id,member_id,amount,reason) values(p_family_id,p_member_id,p_reward,'daily_reward');
  return jsonb_build_object('claimed',true,'coins',v_coins,'reward',p_reward);
end;
$$;

create or replace function family_complete_task_atomic(p_family_id uuid, p_member_id uuid, p_task_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_reward integer; v_status text; v_coins bigint;
begin
  select status,reward_coins into v_status,v_reward from tasks where id=p_task_id and family_id=p_family_id for update;
  if not found then raise exception 'task_not_found'; end if;
  if v_status='done' then return jsonb_build_object('completed',false,'alreadyDone',true,'reward',v_reward); end if;
  update tasks set status='done',completed_at=now(),assignee_member_id=p_member_id where id=p_task_id and family_id=p_family_id;
  if coalesce(v_reward,0)>0 then
    update members set coins=coins+v_reward where id=p_member_id and family_id=p_family_id returning coins into v_coins;
    insert into coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id)
    values(p_family_id,p_member_id,v_reward,'task_complete','task',p_task_id::text);
  else
    select coins into v_coins from members where id=p_member_id and family_id=p_family_id;
  end if;
  return jsonb_build_object('completed',true,'alreadyDone',false,'reward',coalesce(v_reward,0),'coins',v_coins);
end;
$$;

create or replace function family_purchase_item_atomic(p_family_id uuid,p_member_id uuid,p_item_id text,p_item_name text,p_item_kind text,p_price integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_coins bigint; v_owned uuid;
begin
  select id into v_owned from member_items where member_id=p_member_id and item_id=p_item_id;
  if v_owned is not null then
    select coins into v_coins from members where id=p_member_id and family_id=p_family_id;
    return jsonb_build_object('purchased',false,'alreadyOwned',true,'coins',v_coins);
  end if;
  select coins into v_coins from members where id=p_member_id and family_id=p_family_id for update;
  if v_coins is null then raise exception 'member_not_found'; end if;
  if v_coins < p_price then raise exception 'insufficient_coins'; end if;
  insert into member_items(family_id,member_id,item_id,item_name,item_kind,price_paid)
  values(p_family_id,p_member_id,p_item_id,p_item_name,p_item_kind,p_price)
  on conflict(member_id,item_id) do nothing
  returning id into v_owned;
  if v_owned is null then return jsonb_build_object('purchased',false,'alreadyOwned',true,'coins',v_coins); end if;
  update members set coins=coins-p_price where id=p_member_id returning coins into v_coins;
  insert into coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id)
  values(p_family_id,p_member_id,-p_price,'store_purchase','store_item',p_item_id);
  return jsonb_build_object('purchased',true,'alreadyOwned',false,'coins',v_coins);
end;
$$;

create or replace function family_transfer_coins_atomic(p_family_id uuid,p_sender_id uuid,p_target_id uuid,p_amount bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_sender bigint; v_target bigint;
begin
  if p_sender_id=p_target_id then raise exception 'cannot_transfer_to_self'; end if;
  if p_amount<=0 then raise exception 'invalid_amount'; end if;
  select coins into v_sender from members where id=p_sender_id and family_id=p_family_id for update;
  if v_sender is null then raise exception 'sender_not_found'; end if;
  select coins into v_target from members where id=p_target_id and family_id=p_family_id for update;
  if v_target is null then raise exception 'target_not_found'; end if;
  if v_sender<p_amount then raise exception 'insufficient_coins'; end if;
  update members set coins=coins-p_amount where id=p_sender_id returning coins into v_sender;
  update members set coins=coins+p_amount where id=p_target_id returning coins into v_target;
  insert into coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id) values
    (p_family_id,p_sender_id,-p_amount,'coin_transfer_out','member',p_target_id::text),
    (p_family_id,p_target_id,p_amount,'coin_transfer_in','member',p_sender_id::text);
  return jsonb_build_object('senderCoins',v_sender,'targetCoins',v_target,'amount',p_amount);
end;
$$;
