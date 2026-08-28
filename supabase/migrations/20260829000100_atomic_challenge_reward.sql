create or replace function family_complete_challenge_atomic(
  p_family_id uuid,
  p_member_id uuid,
  p_challenge_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target integer;
  v_reward integer;
  v_status text;
  v_ends_at timestamptz;
  v_claimed_at timestamptz;
  v_coins bigint;
begin
  select target_value, reward_coins, status, ends_at
    into v_target, v_reward, v_status, v_ends_at
  from family_challenges
  where id = p_challenge_id and family_id = p_family_id
  for update;

  if not found then raise exception 'challenge_not_found'; end if;
  if v_status <> 'open' or (v_ends_at is not null and v_ends_at < now()) then
    raise exception 'challenge_closed';
  end if;

  select reward_claimed_at
    into v_claimed_at
  from challenge_participants
  where challenge_id = p_challenge_id and member_id = p_member_id
  for update;

  if not found then raise exception 'challenge_join_required'; end if;
  if v_claimed_at is not null then
    return jsonb_build_object('alreadyClaimed', true, 'reward', 0);
  end if;

  update challenge_participants
  set progress = v_target,
      completed_at = coalesce(completed_at, now()),
      reward_claimed_at = now()
  where challenge_id = p_challenge_id and member_id = p_member_id;

  if coalesce(v_reward, 0) > 0 then
    update members
    set coins = coins + v_reward
    where id = p_member_id and family_id = p_family_id
    returning coins into v_coins;

    if v_coins is null then raise exception 'member_not_found'; end if;

    insert into coin_ledger(family_id, member_id, amount, reason, reference_type, reference_id)
    values(p_family_id, p_member_id, v_reward, 'challenge_complete', 'challenge', p_challenge_id::text);
  end if;

  return jsonb_build_object(
    'alreadyClaimed', false,
    'reward', coalesce(v_reward, 0),
    'coins', v_coins
  );
end;
$$;
