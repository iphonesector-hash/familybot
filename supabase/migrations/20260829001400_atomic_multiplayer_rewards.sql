create or replace function family_win_twenty_questions_atomic(
  p_family_id uuid,
  p_member_id uuid,
  p_game_id uuid,
  p_guess text,
  p_reward integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_host uuid;
  v_secret text;
  v_coins bigint;
begin
  select status,host_member_id,secret_state->>'secret'
    into v_status,v_host,v_secret
  from multiplayer_games
  where id=p_game_id and family_id=p_family_id and game_type='twenty_questions'
  for update;
  if not found then raise exception 'twenty_game_not_found'; end if;
  if v_status <> 'active' then raise exception 'twenty_not_active'; end if;
  if v_host=p_member_id then raise exception 'twenty_host_cannot_guess'; end if;
  if not exists(select 1 from multiplayer_players where game_id=p_game_id and member_id=p_member_id) then raise exception 'twenty_join_required'; end if;
  if coalesce(p_guess,'') <> coalesce(v_secret,'') then return jsonb_build_object('correct',false); end if;

  update multiplayer_games
  set status='finished',finished_at=now(),public_state=coalesce(public_state,'{}'::jsonb)||jsonb_build_object('winnerMemberId',p_member_id)
  where id=p_game_id and status='active';

  update members set coins=coins+p_reward
  where id=p_member_id and family_id=p_family_id
  returning coins into v_coins;
  if v_coins is null then raise exception 'member_not_found'; end if;

  insert into coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id)
  values(p_family_id,p_member_id,p_reward,'twenty_questions_win','multiplayer_game',p_game_id::text);

  return jsonb_build_object('correct',true,'reward',p_reward,'coins',v_coins);
end;
$$;

create or replace function family_finish_mafia_atomic(
  p_family_id uuid,
  p_game_id uuid,
  p_round integer,
  p_eliminated uuid[],
  p_winner text,
  p_reward integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_player record;
  v_rewarded integer := 0;
begin
  if p_winner not in ('mafia','citizen') then raise exception 'invalid_mafia_winner'; end if;
  select status into v_status
  from multiplayer_games
  where id=p_game_id and family_id=p_family_id and game_type='mafia_lite'
  for update;
  if not found then raise exception 'mafia_game_not_found'; end if;
  if v_status <> 'active' then raise exception 'mafia_finished'; end if;

  update multiplayer_games
  set status='finished',
      public_state=jsonb_build_object('round',p_round,'eliminated',to_jsonb(p_eliminated),'winnerRole',p_winner),
      finished_at=now()
  where id=p_game_id and status='active';

  for v_player in
    select member_id from multiplayer_players where game_id=p_game_id and role=p_winner
  loop
    update members set coins=coins+p_reward where id=v_player.member_id and family_id=p_family_id;
    if found then
      insert into coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id)
      values(p_family_id,v_player.member_id,p_reward,'mafia_lite_win','multiplayer_game',p_game_id::text);
      v_rewarded := v_rewarded + 1;
    end if;
  end loop;

  return jsonb_build_object('finished',true,'winner',p_winner,'rewardedMembers',v_rewarded,'rewardEach',p_reward);
end;
$$;

revoke all privileges on function public.family_win_twenty_questions_atomic(uuid,uuid,uuid,text,integer) from public, anon, authenticated;
grant execute on function public.family_win_twenty_questions_atomic(uuid,uuid,uuid,text,integer) to service_role;
revoke all privileges on function public.family_finish_mafia_atomic(uuid,uuid,integer,uuid[],text,integer) from public, anon, authenticated;
grant execute on function public.family_finish_mafia_atomic(uuid,uuid,integer,uuid[],text,integer) to service_role;
