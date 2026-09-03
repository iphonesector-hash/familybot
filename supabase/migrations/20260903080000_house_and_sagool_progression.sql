-- House materials + upgrade path, Sagool 10-level XP curve and care cooldown.
create table if not exists familybot.family_materials (
  family_id uuid not null references familybot.families(id) on delete cascade,
  member_id uuid not null references familybot.members(id) on delete cascade,
  material text not null,
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (member_id, material)
);
create index if not exists family_materials_family_idx on familybot.family_materials(family_id);
alter table familybot.family_materials enable row level security;
revoke all on familybot.family_materials from anon, authenticated;
grant select, insert, update, delete on familybot.family_materials to service_role;

create table if not exists familybot.house_upgrade_log (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references familybot.families(id) on delete cascade,
  member_id uuid not null references familybot.members(id) on delete cascade,
  from_level integer not null,
  to_level integer not null,
  created_at timestamptz not null default now(),
  unique (family_id, to_level)
);
alter table familybot.house_upgrade_log enable row level security;
revoke all on familybot.house_upgrade_log from anon, authenticated;
grant select, insert on familybot.house_upgrade_log to service_role;

create or replace function familybot.sagool_level_from_xp(p_xp bigint)
returns integer language sql immutable as $$
  select case
    when p_xp < 80 then 1
    when p_xp < 200 then 2
    when p_xp < 360 then 3
    when p_xp < 560 then 4
    when p_xp < 820 then 5
    when p_xp < 1140 then 6
    when p_xp < 1540 then 7
    when p_xp < 2040 then 8
    when p_xp < 2680 then 9
    else 10
  end
$$;

create or replace function familybot.sagool_interact_atomic(p_family_id uuid,p_member_id uuid,p_action text,p_cost integer default 0,p_xp integer default 8)
returns jsonb language plpgsql security definer set search_path to 'familybot','public' as $$
declare m familybot.members%rowtype; p familybot.sagool_pets%rowtype; founder boolean; a text; nh int; nt int; ne int; ny int; njoy int; na int; newxp bigint; newlevel int; oldlevel int; newstage text; hours_elapsed int; last_same timestamptz;
begin
  select * into m from familybot.members where id=p_member_id and family_id=p_family_id for update;
  if not found then raise exception 'member_not_found'; end if;
  founder:=coalesce(m.is_founder,false) or m.role='founder';
  if p_cost<0 then raise exception 'invalid_cost'; end if;
  if p_cost>0 and not founder and m.coins<p_cost then raise exception 'insufficient_coins'; end if;
  insert into familybot.sagool_pets(family_id,member_id) values(p_family_id,p_member_id) on conflict(member_id) do nothing;
  select * into p from familybot.sagool_pets where member_id=p_member_id and family_id=p_family_id for update;
  select created_at into last_same from familybot.sagool_action_log where family_id=p_family_id and member_id=p_member_id and action=p_action order by created_at desc limit 1;
  if last_same is not null and last_same + interval '20 seconds' > now() then raise exception 'sagool_cooldown'; end if;
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
  oldlevel:=greatest(1,least(10,coalesce(p.level,1)));
  newxp:=p.xp+greatest(0,p_xp);
  newlevel:=familybot.sagool_level_from_xp(newxp);
  newstage:=case when newlevel>=9 then 'legendary' when newlevel>=7 then 'guardian' when newlevel>=5 then 'clever' when newlevel>=3 then 'playful' else 'puppy' end;
  update familybot.sagool_pets set hunger=nh,thirst=nt,energy=ne,hygiene=ny,happiness=njoy,affection=na,xp=newxp,level=newlevel,stage=newstage,last_tick_at=now(),updated_at=now() where id=p.id returning * into p;
  if p_cost>0 and not founder then update familybot.members set coins=coins-p_cost where id=p_member_id; insert into familybot.coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id) values(p_family_id,p_member_id,-p_cost,'sagool_action','sagool',a); end if;
  insert into familybot.sagool_action_log(family_id,member_id,action,xp_delta,coins_delta) values(p_family_id,p_member_id,a,greatest(0,p_xp),case when founder then 0 else -p_cost end);
  return jsonb_build_object('pet',to_jsonb(p),'founder',founder,'leveledUp',newlevel>oldlevel,'oldLevel',oldlevel,'newLevel',newlevel);
end $$;

create or replace function familybot.house_buy_material_atomic(p_family_id uuid,p_member_id uuid,p_material text,p_qty integer,p_price integer)
returns jsonb language plpgsql security definer set search_path to 'familybot','public' as $$
declare m familybot.members%rowtype; founder boolean; total int; q int;
begin
  if p_material not in ('brick','cement','wood','water','tile','paint') then raise exception 'unknown_material'; end if;
  if p_qty<=0 or p_qty>200 then raise exception 'invalid_qty'; end if;
  if p_price<0 then raise exception 'invalid_price'; end if;
  select * into m from familybot.members where id=p_member_id and family_id=p_family_id for update;
  if not found then raise exception 'member_not_found'; end if;
  founder:=coalesce(m.is_founder,false) or m.role='founder';
  total:=p_price;
  if not founder and m.coins<total then raise exception 'insufficient_coins'; end if;
  if not founder then
    update familybot.members set coins=coins-total where id=p_member_id returning coins into m.coins;
    insert into familybot.coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id) values(p_family_id,p_member_id,-total,'house_material','material',p_material);
  end if;
  insert into familybot.family_materials(family_id,member_id,material,quantity) values(p_family_id,p_member_id,p_material,p_qty)
  on conflict(member_id,material) do update set quantity=familybot.family_materials.quantity+excluded.quantity, updated_at=now();
  select quantity into q from familybot.family_materials where member_id=p_member_id and material=p_material;
  return jsonb_build_object('ok',true,'material',p_material,'quantity',q,'coins',m.coins,'founder',founder);
end $$;

create or replace function familybot.house_collect_daily_atomic(p_family_id uuid,p_member_id uuid)
returns jsonb language plpgsql security definer set search_path to 'familybot','public' as $$
declare claimed date; today date;
begin
  today:=(now() at time zone 'Asia/Tehran')::date;
  insert into familybot.sagool_daily_claims(family_id,member_id,mission_key,claim_date,reward_coins,reward_xp)
  values(p_family_id,p_member_id,'house_daily_mats',today,0,4)
  on conflict(member_id,mission_key,claim_date) do nothing;
  if not found then
    select claim_date into claimed from familybot.sagool_daily_claims where member_id=p_member_id and mission_key='house_daily_mats' and claim_date=today;
    if claimed is not null then return jsonb_build_object('ok',true,'alreadyClaimed',true); end if;
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
  nxt:=f.house_level+1;
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
  hb:=coalesce((select quantity from familybot.family_materials where member_id=p_member_id and material='brick'),0);
  hc:=coalesce((select quantity from familybot.family_materials where member_id=p_member_id and material='cement'),0);
  hw:=coalesce((select quantity from familybot.family_materials where member_id=p_member_id and material='wood'),0);
  hwa:=coalesce((select quantity from familybot.family_materials where member_id=p_member_id and material='water'),0);
  ht:=coalesce((select quantity from familybot.family_materials where member_id=p_member_id and material='tile'),0);
  hp:=coalesce((select quantity from familybot.family_materials where member_id=p_member_id and material='paint'),0);
  if hb<nb or hc<nc or hw<nw or hwa<nwa or ht<nt or hp<np then raise exception 'missing_materials'; end if;
  if not founder and m.coins<coins_need then raise exception 'insufficient_coins'; end if;
  if nb>0 then update familybot.family_materials set quantity=quantity-nb,updated_at=now() where member_id=p_member_id and material='brick'; end if;
  if nc>0 then update familybot.family_materials set quantity=quantity-nc,updated_at=now() where member_id=p_member_id and material='cement'; end if;
  if nw>0 then update familybot.family_materials set quantity=quantity-nw,updated_at=now() where member_id=p_member_id and material='wood'; end if;
  if nwa>0 then update familybot.family_materials set quantity=quantity-nwa,updated_at=now() where member_id=p_member_id and material='water'; end if;
  if nt>0 then update familybot.family_materials set quantity=quantity-nt,updated_at=now() where member_id=p_member_id and material='tile'; end if;
  if np>0 then update familybot.family_materials set quantity=quantity-np,updated_at=now() where member_id=p_member_id and material='paint'; end if;
  if not founder then
    update familybot.members set coins=coins-coins_need where id=p_member_id returning coins into m.coins;
    insert into familybot.coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id) values(p_family_id,p_member_id,-coins_need,'house_upgrade','house',nxt::text);
  end if;
  update familybot.families set house_level=nxt where id=p_family_id returning * into f;
  insert into familybot.house_upgrade_log(family_id,member_id,from_level,to_level) values(p_family_id,p_member_id,p_from_level,nxt)
  on conflict(family_id,to_level) do nothing;
  return jsonb_build_object('ok',true,'houseLevel',f.house_level,'coins',m.coins,'founder',founder);
end $$;

revoke all on function familybot.house_buy_material_atomic(uuid,uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function familybot.house_buy_material_atomic(uuid,uuid,text,integer,integer) to service_role;
revoke all on function familybot.house_collect_daily_atomic(uuid,uuid) from public,anon,authenticated;
grant execute on function familybot.house_collect_daily_atomic(uuid,uuid) to service_role;
revoke all on function familybot.house_upgrade_atomic(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function familybot.house_upgrade_atomic(uuid,uuid,integer) to service_role;
revoke all on function familybot.sagool_interact_atomic(uuid,uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function familybot.sagool_interact_atomic(uuid,uuid,text,integer,integer) to service_role;
