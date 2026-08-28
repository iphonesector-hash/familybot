-- Atomic, idempotent multiplayer settlement for winner rewards.
-- These functions are server-only and are never callable by anon/authenticated clients.

create table if not exists public.multiplayer_reward_claims (
  game_id uuid not null references public.multiplayer_games(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  reason text not null,
  reward_coins integer not null check (reward_coins >= 0),
  claimed_at timestamptz not null default now(),
  primary key (game_id, member_id, reason)
);

create index if not exists multiplayer_reward_claims_member_idx
  on public.multiplayer_reward_claims(member_id, claimed_at desc);

create or replace function public.family_finish_twenty_questions_atomic(
  p_family_id uuid,
  p_game_id uuid,
  p_winner_member_id uuid,
  p_reward integer default 30
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.multiplayer_games%rowtype;
  v_claimed uuid;
  v_coins bigint;
begin
  if p_reward < 0 or p_reward > 10000 then raise exception 'invalid_reward'; end if;

  select * into v_game
  from public.multiplayer_games
  where id=p_game_id and family_id=p_family_id and game_type='twenty_questions'
  for update;
  if not found then raise exception 'twenty_game_not_found'; end if;

  if not exists(
    select 1 from public.multiplayer_players
    where game_id=p_game_id and member_id=p_winner_member_id
  ) then raise exception 'twenty_join_required'; end if;
  if v_game.host_member_id=p_winner_member_id then raise exception 'twenty_host_cannot_guess'; end if;

  if v_game.status='active' then
    update public.multiplayer_games
    set status='finished',
        finished_at=coalesce(finished_at,now()),
        public_state=coalesce(public_state,'{}'::jsonb) || jsonb_build_object('winnerMemberId',p_winner_member_id)
    where id=p_game_id;
  elsif v_game.status='finished' then
    if coalesce(v_game.public_state->>'winnerMemberId','') <> p_winner_member_id::text then
      raise exception 'twenty_game_closed';
    end if;
  else
    raise exception 'twenty_game_closed';
  end if;

  insert into public.multiplayer_reward_claims(game_id,member_id,reason,reward_coins)
  values(p_game_id,p_winner_member_id,'twenty_questions_win',p_reward)
  on conflict(game_id,member_id,reason) do nothing
  returning member_id into v_claimed;

  if v_claimed is not null and p_reward>0 then
    update public.members
    set coins=coins+p_reward,last_active_at=now()
    where id=p_winner_member_id and family_id=p_family_id
    returning coins into v_coins;
    if v_coins is null then raise exception 'member_not_found'; end if;
    insert into public.coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id)
    values(p_family_id,p_winner_member_id,p_reward,'twenty_questions_win','multiplayer_game',p_game_id::text);
  else
    select coins into v_coins from public.members where id=p_winner_member_id and family_id=p_family_id;
  end if;

  return jsonb_build_object('finished',true,'reward',case when v_claimed is null then 0 else p_reward end,'coins',v_coins,'alreadyRewarded',v_claimed is null);
end;
$$;

create or replace function public.family_finish_mafia_lite_atomic(
  p_family_id uuid,
  p_game_id uuid,
  p_winner_role text,
  p_round integer,
  p_eliminated jsonb,
  p_reward integer default 20
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.multiplayer_games%rowtype;
  v_player record;
  v_claimed uuid;
  v_paid integer := 0;
begin
  if p_winner_role not in ('mafia','citizen') then raise exception 'mafia_invalid_winner'; end if;
  if p_reward < 0 or p_reward > 10000 then raise exception 'invalid_reward'; end if;
  if p_round < 1 then raise exception 'mafia_invalid_round'; end if;
  if jsonb_typeof(coalesce(p_eliminated,'[]'::jsonb)) <> 'array' then raise exception 'mafia_invalid_state'; end if;

  select * into v_game
  from public.multiplayer_games
  where id=p_game_id and family_id=p_family_id and game_type='mafia_lite'
  for update;
  if not found then raise exception 'mafia_game_not_found'; end if;

  if v_game.status='active' then
    update public.multiplayer_games
    set status='finished',
        finished_at=coalesce(finished_at,now()),
        public_state=jsonb_build_object('round',p_round,'eliminated',p_eliminated,'winnerRole',p_winner_role)
    where id=p_game_id;
  elsif v_game.status='finished' then
    if coalesce(v_game.public_state->>'winnerRole','') <> p_winner_role then raise exception 'mafia_finished'; end if;
  else
    raise exception 'mafia_not_active';
  end if;

  for v_player in
    select member_id from public.multiplayer_players where game_id=p_game_id and role=p_winner_role
  loop
    v_claimed := null;
    insert into public.multiplayer_reward_claims(game_id,member_id,reason,reward_coins)
    values(p_game_id,v_player.member_id,'mafia_lite_win',p_reward)
    on conflict(game_id,member_id,reason) do nothing
    returning member_id into v_claimed;

    if v_claimed is not null and p_reward>0 then
      update public.members set coins=coins+p_reward,last_active_at=now()
      where id=v_player.member_id and family_id=p_family_id;
      if not found then raise exception 'member_not_found'; end if;
      insert into public.coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id)
      values(p_family_id,v_player.member_id,p_reward,'mafia_lite_win','multiplayer_game',p_game_id::text);
      v_paid := v_paid + 1;
    end if;
  end loop;

  return jsonb_build_object('finished',true,'winner',p_winner_role,'newRewardsPaid',v_paid,'rewardEach',p_reward);
end;
$$;

revoke all on table public.multiplayer_reward_claims from public, anon, authenticated;
grant all on table public.multiplayer_reward_claims to service_role;

revoke all on function public.family_finish_twenty_questions_atomic(uuid,uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.family_finish_twenty_questions_atomic(uuid,uuid,uuid,integer) to service_role;
revoke all on function public.family_finish_mafia_lite_atomic(uuid,uuid,text,integer,jsonb,integer) from public, anon, authenticated;
grant execute on function public.family_finish_mafia_lite_atomic(uuid,uuid,text,integer,jsonb,integer) to service_role;
