-- Non-destructive hardening for house/sagool progression.
-- Does not drop tables, inventory, pets, or family levels.

create table if not exists familybot.sagool_daily_claims (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references familybot.families(id) on delete cascade,
  member_id uuid not null references familybot.members(id) on delete cascade,
  mission_key text not null,
  claim_date date not null,
  reward_coins integer not null default 0,
  reward_xp integer not null default 0,
  created_at timestamptz not null default now(),
  unique(member_id, mission_key, claim_date)
);
alter table familybot.sagool_daily_claims enable row level security;
revoke all on familybot.sagool_daily_claims from anon, authenticated;
grant select, insert on familybot.sagool_daily_claims to service_role;

create or replace function familybot.house_collect_daily_atomic(p_family_id uuid,p_member_id uuid)
returns jsonb language plpgsql security definer set search_path to 'familybot','public' as $$
declare inserted uuid; today date;
begin
  today:=(now() at time zone 'Asia/Tehran')::date;
  insert into familybot.sagool_daily_claims(family_id,member_id,mission_key,claim_date,reward_coins,reward_xp)
  values(p_family_id,p_member_id,'house_daily_mats',today,0,4)
  on conflict(member_id,mission_key,claim_date) do nothing
  returning id into inserted;
  if inserted is null then
    return jsonb_build_object('ok',true,'alreadyClaimed',true);
  end if;
  insert into familybot.family_materials(family_id,member_id,material,quantity) values
    (p_family_id,p_member_id,'brick',3),(p_family_id,p_member_id,'cement',2),(p_family_id,p_member_id,'wood',2),(p_family_id,p_member_id,'water',3)
  on conflict(member_id,material) do update set quantity=familybot.family_materials.quantity+excluded.quantity, updated_at=now();
  return jsonb_build_object('ok',true,'alreadyClaimed',false,'granted',jsonb_build_object('brick',3,'cement',2,'wood',2,'water',3));
end $$;

create or replace function familybot.house_upgrade_atomic(p_family_id uuid,p_member_id uuid,p_from_level integer)
returns jsonb language plpgsql security definer set search_path to 'familybot','public' as $$
declare f familybot.families%rowtype; m familybot.members%rowtype; founder boolean; nxt int;
  nb int:=0; nc int:=0; nw int:=0; nwa int:=0; nt int:=0; np int:=0; coins_need int:=0;
  hb int; hc int; hw int; hwa int; ht int; hp int;
begin
  select * into f from familybot.families where id=p_family_id for update;
  if not found then raise exception 'family_not_found'; end if;
  if coalesce(f.house_level,1)<>p_from_level then raise exception 'house_level_changed'; end if;
  if coalesce(f.house_level,1)>=10 then raise exception 'house_max_level'; end if;
  select * into m from familybot.members where id=p_member_id and family_id=p_family_id for update;
  if not found then raise exception 'member_not_found'; end if;
  founder:=coalesce(m.is_founder,false) or m.role='founder';
  nxt:=coalesce(f.house_level,1)+1;
  if nxt=2 then nb:=8; nc:=4; nw:=4; nwa:=6; coins_need:=80;
  elsif nxt=3 then nb:=12; nc:=8; nw:=6; nwa:=8; coins_need:=160;
  elsif nxt=4 then nb:=20; nc:=10; nw:=8; nwa:=10; nt:=4; coins_need:=500;
  elsif nxt=5 then nb:=28; nc:=16; nw:=12; nwa:=12; nt:=8; np:=4; coins_need:=900;
  elsif nxt=6 then nb:=36; nc:=22; nw:=16; nt:=12; np:=8; coins_need:=1400;
  elsif nxt=7 then nb:=44; nc:=28; nw:=20; nt:=16; np:=12; coins_need:=2200;
  elsif nxt=8 then nb:=52; nc:=34; nw:=26; nt:=20; np:=16; coins_need:=3400;
  elsif nxt=9 then nb:=64; nc:=42; nw:=32; nt:=26; np:=20; coins_need:=5200;
  elsif nxt=10 then nb:=80; nc:=54; nw:=40; nt:=34; np:=28; coins_need:=8000;
  else raise exception 'invalid_level'; end if;

  perform 1 from familybot.family_materials where member_id=p_member_id for update;
  hb:=coalesce((select quantity from familybot.family_materials where member_id=p_member_id and material='brick'),0);
  hc:=coalesce((select quantity from familybot.family_materials where member_id=p_member_id and material='cement'),0);
  hw:=coalesce((select quantity from familybot.family_materials where member_id=p_member_id and material='wood'),0);
  hwa:=coalesce((select quantity from familybot.family_materials where member_id=p_member_id and material='water'),0);
  ht:=coalesce((select quantity from familybot.family_materials where member_id=p_member_id and material='tile'),0);
  hp:=coalesce((select quantity from familybot.family_materials where member_id=p_member_id and material='paint'),0);
  if hb<nb or hc<nc or hw<nw or hwa<nwa or ht<nt or hp<np then raise exception 'missing_materials'; end if;
  if not founder and m.coins<coins_need then raise exception 'insufficient_coins'; end if;

  if nb>0 then update familybot.family_materials set quantity=quantity-nb,updated_at=now() where member_id=p_member_id and material='brick' and quantity>=nb; if not found then raise exception 'missing_materials'; end if; end if;
  if nc>0 then update familybot.family_materials set quantity=quantity-nc,updated_at=now() where member_id=p_member_id and material='cement' and quantity>=nc; if not found then raise exception 'missing_materials'; end if; end if;
  if nw>0 then update familybot.family_materials set quantity=quantity-nw,updated_at=now() where member_id=p_member_id and material='wood' and quantity>=nw; if not found then raise exception 'missing_materials'; end if; end if;
  if nwa>0 then update familybot.family_materials set quantity=quantity-nwa,updated_at=now() where member_id=p_member_id and material='water' and quantity>=nwa; if not found then raise exception 'missing_materials'; end if; end if;
  if nt>0 then update familybot.family_materials set quantity=quantity-nt,updated_at=now() where member_id=p_member_id and material='tile' and quantity>=nt; if not found then raise exception 'missing_materials'; end if; end if;
  if np>0 then update familybot.family_materials set quantity=quantity-np,updated_at=now() where member_id=p_member_id and material='paint' and quantity>=np; if not found then raise exception 'missing_materials'; end if; end if;

  if not founder then
    update familybot.members set coins=coins-coins_need where id=p_member_id and coins>=coins_need returning coins into m.coins;
    if not found then raise exception 'insufficient_coins'; end if;
    insert into familybot.coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id) values(p_family_id,p_member_id,-coins_need,'house_upgrade','house',nxt::text);
  end if;

  update familybot.families set house_level=nxt where id=p_family_id and house_level=p_from_level returning * into f;
  if not found then raise exception 'house_level_changed'; end if;
  insert into familybot.house_upgrade_log(family_id,member_id,from_level,to_level) values(p_family_id,p_member_id,p_from_level,nxt)
  on conflict(family_id,to_level) do nothing;
  return jsonb_build_object('ok',true,'houseLevel',f.house_level,'coins',m.coins,'founder',founder);
end $$;

revoke all on function familybot.house_collect_daily_atomic(uuid,uuid) from public,anon,authenticated;
grant execute on function familybot.house_collect_daily_atomic(uuid,uuid) to service_role;
revoke all on function familybot.house_upgrade_atomic(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function familybot.house_upgrade_atomic(uuid,uuid,integer) to service_role;
