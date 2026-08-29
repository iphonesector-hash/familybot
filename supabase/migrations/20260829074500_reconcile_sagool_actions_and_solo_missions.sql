-- Reconcile Sagool care actions with the canonical pet columns and table-driven solo missions.
create or replace function familybot.sagool_interact_atomic(p_family_id uuid,p_member_id uuid,p_action text,p_cost integer default 0,p_xp integer default 8)
returns jsonb language plpgsql security definer set search_path to 'familybot','public' as $$
declare m familybot.members%rowtype; p familybot.sagool_pets%rowtype; founder boolean; a text; nh int; nt int; ne int; ny int; njoy int; na int; newxp bigint; newlevel int; newstage text; hours_elapsed int;
begin
  select * into m from familybot.members where id=p_member_id and family_id=p_family_id for update;
  if not found then raise exception 'member_not_found'; end if;
  founder:=coalesce(m.is_founder,false) or m.role='founder';
  if p_cost<0 then raise exception 'invalid_cost'; end if;
  if p_cost>0 and not founder and m.coins<p_cost then raise exception 'insufficient_coins'; end if;
  insert into familybot.sagool_pets(family_id,member_id) values(p_family_id,p_member_id) on conflict(member_id) do nothing;
  select * into p from familybot.sagool_pets where member_id=p_member_id and family_id=p_family_id for update;
  hours_elapsed:=greatest(0,least(48,floor(extract(epoch from (now()-coalesce(p.last_tick_at,now())))/3600)::int));
  nh:=greatest(0,p.hunger-least(35,hours_elapsed*2)); nt:=greatest(0,p.thirst-least(45,hours_elapsed*3)); ne:=greatest(0,p.energy-least(30,hours_elapsed*2)); ny:=greatest(0,p.hygiene-least(25,hours_elapsed)); njoy:=greatest(0,p.happiness-least(25,hours_elapsed)); na:=p.affection;
  a:=case when p_action='bath' then 'clean' else p_action end;
  if a='feed' then nh:=least(100,nh+32); njoy:=least(100,njoy+4);
  elsif a='water' then nt:=least(100,nt+38); njoy:=least(100,njoy+3);
  elsif a='sleep' then ne:=least(100,ne+45);
  elsif a='clean' then ny:=least(100,ny+50); njoy:=greatest(0,njoy-2); na:=least(100,na+2);
  elsif a='play' then njoy:=least(100,njoy+30); ne:=greatest(0,ne-12); na:=least(100,na+5);
  elsif a='pet' then njoy:=least(100,njoy+12); na:=least(100,na+8);
  elsif a='walk' then njoy:=least(100,njoy+22); ne:=greatest(0,ne-16); nh:=greatest(0,nh-5); nt:=greatest(0,nt-8); na:=least(100,na+4);
  elsif a='train' then njoy:=least(100,njoy+10); ne:=greatest(0,ne-10); na:=least(100,na+7);
  else raise exception 'unknown_action'; end if;
  newxp:=p.xp+greatest(0,p_xp); newlevel:=greatest(1,floor(newxp/120)::int+1); newstage:=case when newlevel>=30 then 'legendary' when newlevel>=20 then 'guardian' when newlevel>=12 then 'clever' when newlevel>=5 then 'playful' else 'puppy' end;
  update familybot.sagool_pets set hunger=nh,thirst=nt,energy=ne,hygiene=ny,happiness=njoy,affection=na,xp=newxp,level=newlevel,stage=newstage,last_tick_at=now(),updated_at=now() where id=p.id returning * into p;
  if p_cost>0 and not founder then update familybot.members set coins=coins-p_cost where id=p_member_id; insert into familybot.coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id) values(p_family_id,p_member_id,-p_cost,'sagool_action','sagool',a); end if;
  insert into familybot.sagool_action_log(family_id,member_id,action,xp_delta,coins_delta) values(p_family_id,p_member_id,a,greatest(0,p_xp),case when founder then 0 else -p_cost end);
  return jsonb_build_object('pet',to_jsonb(p),'founder',founder);
end $$;

create or replace function familybot.sagool_claim_daily_mission_atomic(p_family_id uuid,p_member_id uuid,p_mission_key text)
returns jsonb language plpgsql security definer set search_path to 'familybot','public' as $$
declare m familybot.members%rowtype; mission familybot.sagool_solo_missions%rowtype; done_count integer; claim_day date; inserted uuid; founder boolean; start_ts timestamptz;
begin
  select * into m from familybot.members where id=p_member_id and family_id=p_family_id for update; if not found then raise exception 'member_not_found'; end if;
  select * into mission from familybot.sagool_solo_missions where code=p_mission_key and active=true; if not found then raise exception 'unknown_mission'; end if;
  founder:=coalesce(m.is_founder,false) or m.role='founder';
  if mission.cadence='weekly' then claim_day:=(date_trunc('week',now() at time zone 'Asia/Tehran'))::date; start_ts=(date_trunc('week',now() at time zone 'Asia/Tehran') at time zone 'Asia/Tehran'); else claim_day:=(now() at time zone 'Asia/Tehran')::date; start_ts=((now() at time zone 'Asia/Tehran')::date::timestamp at time zone 'Asia/Tehran'); end if;
  if mission.action_type='care_any' then select count(*) into done_count from familybot.sagool_action_log where family_id=p_family_id and member_id=p_member_id and created_at>=start_ts; else select count(*) into done_count from familybot.sagool_action_log where family_id=p_family_id and member_id=p_member_id and action=mission.action_type and created_at>=start_ts; end if;
  if done_count<mission.target then return jsonb_build_object('claimed',false,'complete',false,'progress',done_count,'target',mission.target); end if;
  insert into familybot.sagool_daily_claims(family_id,member_id,mission_key,claim_date,reward_coins,reward_xp) values(p_family_id,p_member_id,p_mission_key,claim_day,mission.reward_coins,mission.reward_xp) on conflict(member_id,mission_key,claim_date) do nothing returning id into inserted;
  if inserted is null then return jsonb_build_object('claimed',false,'complete',true,'alreadyClaimed',true,'progress',done_count,'target',mission.target); end if;
  update familybot.members set xp=xp+mission.reward_xp,level=greatest(level,floor(sqrt((xp+mission.reward_xp)::numeric/50))::integer+1),coins=case when founder then coins else coins+mission.reward_coins end where id=p_member_id;
  insert into familybot.coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id) values(p_family_id,p_member_id,case when founder then 0 else mission.reward_coins end,'sagool_mission','sagool_mission',p_mission_key);
  return jsonb_build_object('claimed',true,'complete',true,'coins',case when founder then 0 else mission.reward_coins end,'xp',mission.reward_xp,'progress',done_count,'target',mission.target,'founder',founder);
end $$;
revoke all on function familybot.sagool_interact_atomic(uuid,uuid,text,integer,integer) from public,anon,authenticated; grant execute on function familybot.sagool_interact_atomic(uuid,uuid,text,integer,integer) to service_role;
revoke all on function familybot.sagool_claim_daily_mission_atomic(uuid,uuid,text) from public,anon,authenticated; grant execute on function familybot.sagool_claim_daily_mission_atomic(uuid,uuid,text) to service_role;
