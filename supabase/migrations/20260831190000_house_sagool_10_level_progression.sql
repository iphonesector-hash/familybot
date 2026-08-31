-- JAHANI progression: scoped to FamilyBot schema only.
create table if not exists familybot.house_material_inventory(
  family_id uuid not null references familybot.families(id) on delete cascade,
  material_id text not null,
  quantity bigint not null default 0 check(quantity>=0),
  updated_at timestamptz not null default now(),
  primary key(family_id,material_id)
);

create table if not exists familybot.sagool_progression(
  family_id uuid not null references familybot.families(id) on delete cascade,
  member_id uuid not null references familybot.members(id) on delete cascade,
  level integer not null default 1 check(level between 1 and 10),
  level_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(family_id,member_id)
);

create table if not exists familybot.sagool_supply_inventory(
  family_id uuid not null references familybot.families(id) on delete cascade,
  member_id uuid not null references familybot.members(id) on delete cascade,
  supply_id text not null,
  quantity bigint not null default 0 check(quantity>=0),
  updated_at timestamptz not null default now(),
  primary key(family_id,member_id,supply_id)
);

create index if not exists house_material_inventory_family_idx on familybot.house_material_inventory(family_id);
create index if not exists sagool_progression_member_idx on familybot.sagool_progression(member_id);
create index if not exists sagool_supply_inventory_member_idx on familybot.sagool_supply_inventory(member_id);

alter table familybot.house_material_inventory enable row level security;
alter table familybot.sagool_progression enable row level security;
alter table familybot.sagool_supply_inventory enable row level security;
revoke all on familybot.house_material_inventory,familybot.sagool_progression,familybot.sagool_supply_inventory from public,anon,authenticated;
grant select,insert,update,delete on familybot.house_material_inventory,familybot.sagool_progression,familybot.sagool_supply_inventory to service_role;

create or replace function familybot.house_buy_material_atomic(
  p_family_id uuid,p_member_id uuid,p_material_id text,p_quantity bigint,p_unit_price bigint
) returns jsonb language plpgsql security definer set search_path='familybot','pg_temp' as $$
declare m familybot.members%rowtype; total_cost bigint; next_coins bigint; next_qty bigint; founder boolean;
begin
  if p_quantity<1 or p_quantity>100000 then raise exception 'invalid_quantity'; end if;
  if p_unit_price<0 or p_unit_price>1000000 then raise exception 'invalid_price'; end if;
  if length(coalesce(p_material_id,''))<1 or length(p_material_id)>64 then raise exception 'invalid_material'; end if;
  select * into m from familybot.members where id=p_member_id and family_id=p_family_id for update;
  if not found then raise exception 'member_not_found'; end if;
  founder:=coalesce(m.is_founder,false) or m.role='founder'; total_cost:=p_quantity*p_unit_price;
  if not founder and m.coins<total_cost then raise exception 'insufficient_coins'; end if;
  if not founder then
    update familybot.members set coins=coins-total_cost,last_active_at=now() where id=p_member_id returning coins into next_coins;
    insert into familybot.coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id)
    values(p_family_id,p_member_id,-total_cost,'house_material_purchase','house_material',p_material_id);
  else next_coins:=m.coins; end if;
  insert into familybot.house_material_inventory(family_id,material_id,quantity)
    values(p_family_id,p_material_id,p_quantity)
    on conflict(family_id,material_id) do update set quantity=familybot.house_material_inventory.quantity+excluded.quantity,updated_at=now()
    returning quantity into next_qty;
  return jsonb_build_object('purchased',true,'materialId',p_material_id,'quantity',next_qty,'coins',next_coins,'cost',case when founder then 0 else total_cost end,'founder',founder);
end $$;

create or replace function familybot.house_upgrade_atomic(
  p_family_id uuid,p_member_id uuid,p_expected_level integer,p_required_xp bigint,p_upgrade_coins bigint,p_requirements jsonb
) returns jsonb language plpgsql security definer set search_path='familybot','pg_temp' as $$
declare m familybot.members%rowtype; f familybot.families%rowtype; founder boolean; effective_xp bigint; req jsonb; have bigint; next_coins bigint;
begin
  if p_expected_level<1 or p_expected_level>=10 then raise exception 'invalid_level'; end if;
  select * into m from familybot.members where id=p_member_id and family_id=p_family_id for update; if not found then raise exception 'member_not_found'; end if;
  select * into f from familybot.families where id=p_family_id for update; if not found then raise exception 'family_not_found'; end if;
  if f.house_level<>p_expected_level then raise exception 'level_changed'; end if;
  select greatest(coalesce(f.xp,0),coalesce(sum(xp),0)) into effective_xp from familybot.members where family_id=p_family_id;
  if effective_xp<p_required_xp then raise exception 'insufficient_xp'; end if;
  founder:=coalesce(m.is_founder,false) or m.role='founder';
  if not founder and m.coins<p_upgrade_coins then raise exception 'insufficient_coins'; end if;
  for req in select value from jsonb_array_elements(coalesce(p_requirements,'[]'::jsonb)) loop
    select quantity into have from familybot.house_material_inventory where family_id=p_family_id and material_id=req->>'id' for update;
    if coalesce(have,0)<coalesce((req->>'qty')::bigint,0) then raise exception 'insufficient_material:%',req->>'id'; end if;
  end loop;
  for req in select value from jsonb_array_elements(coalesce(p_requirements,'[]'::jsonb)) loop
    update familybot.house_material_inventory set quantity=quantity-(req->>'qty')::bigint,updated_at=now() where family_id=p_family_id and material_id=req->>'id';
  end loop;
  if not founder and p_upgrade_coins>0 then
    update familybot.members set coins=coins-p_upgrade_coins,last_active_at=now() where id=p_member_id returning coins into next_coins;
    insert into familybot.coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id)
      values(p_family_id,p_member_id,-p_upgrade_coins,'house_level_upgrade','house_level',(p_expected_level+1)::text);
  else next_coins:=m.coins; end if;
  update familybot.families set house_level=p_expected_level+1 where id=p_family_id;
  insert into familybot.activity_log(family_id,member_id,activity_type,xp_delta,metadata)
    values(p_family_id,p_member_id,'house_level_up',0,jsonb_build_object('from',p_expected_level,'to',p_expected_level+1));
  return jsonb_build_object('upgraded',true,'level',p_expected_level+1,'coins',next_coins,'xp',effective_xp,'founder',founder);
end $$;

create or replace function familybot.sagool_buy_supply_atomic(
  p_family_id uuid,p_member_id uuid,p_supply_id text,p_quantity bigint,p_unit_price bigint
) returns jsonb language plpgsql security definer set search_path='familybot','pg_temp' as $$
declare m familybot.members%rowtype; total_cost bigint; next_coins bigint; next_qty bigint; founder boolean;
begin
  if p_quantity<1 or p_quantity>1000 then raise exception 'invalid_quantity'; end if;
  if p_unit_price<0 or p_unit_price>1000000 then raise exception 'invalid_price'; end if;
  select * into m from familybot.members where id=p_member_id and family_id=p_family_id for update; if not found then raise exception 'member_not_found'; end if;
  founder:=coalesce(m.is_founder,false) or m.role='founder'; total_cost:=p_quantity*p_unit_price;
  if not founder and m.coins<total_cost then raise exception 'insufficient_coins'; end if;
  if not founder then
    update familybot.members set coins=coins-total_cost,last_active_at=now() where id=p_member_id returning coins into next_coins;
    insert into familybot.coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id)
      values(p_family_id,p_member_id,-total_cost,'sagool_supply_purchase','sagool_supply',p_supply_id);
  else next_coins:=m.coins; end if;
  insert into familybot.sagool_supply_inventory(family_id,member_id,supply_id,quantity)
    values(p_family_id,p_member_id,p_supply_id,p_quantity)
    on conflict(family_id,member_id,supply_id) do update set quantity=familybot.sagool_supply_inventory.quantity+excluded.quantity,updated_at=now()
    returning quantity into next_qty;
  return jsonb_build_object('purchased',true,'supplyId',p_supply_id,'quantity',next_qty,'coins',next_coins,'cost',case when founder then 0 else total_cost end,'founder',founder);
end $$;

create or replace function familybot.sagool_upgrade_atomic(
  p_family_id uuid,p_member_id uuid,p_expected_level integer,p_required_xp bigint,p_upgrade_coins bigint,p_supplies jsonb,p_care jsonb
) returns jsonb language plpgsql security definer set search_path='familybot','pg_temp' as $$
declare m familybot.members%rowtype; p familybot.sagool_pets%rowtype; prog familybot.sagool_progression%rowtype; founder boolean; req jsonb; have bigint; done_count bigint; action_name text; required_count bigint; next_coins bigint;
begin
  if p_expected_level<1 or p_expected_level>=10 then raise exception 'invalid_level'; end if;
  select * into m from familybot.members where id=p_member_id and family_id=p_family_id for update; if not found then raise exception 'member_not_found'; end if;
  insert into familybot.sagool_pets(family_id,member_id) values(p_family_id,p_member_id) on conflict(family_id,member_id) do nothing;
  insert into familybot.sagool_progression(family_id,member_id) values(p_family_id,p_member_id) on conflict(family_id,member_id) do nothing;
  select * into p from familybot.sagool_pets where family_id=p_family_id and member_id=p_member_id for update;
  select * into prog from familybot.sagool_progression where family_id=p_family_id and member_id=p_member_id for update;
  if prog.level<>p_expected_level then raise exception 'level_changed'; end if;
  if p.xp<p_required_xp then raise exception 'insufficient_xp'; end if;
  founder:=coalesce(m.is_founder,false) or m.role='founder'; if not founder and m.coins<p_upgrade_coins then raise exception 'insufficient_coins'; end if;
  for req in select value from jsonb_array_elements(coalesce(p_supplies,'[]'::jsonb)) loop
    select quantity into have from familybot.sagool_supply_inventory where family_id=p_family_id and member_id=p_member_id and supply_id=req->>'id' for update;
    if coalesce(have,0)<coalesce((req->>'qty')::bigint,0) then raise exception 'insufficient_supply:%',req->>'id'; end if;
  end loop;
  for action_name,required_count in select key,(value::text)::bigint from jsonb_each(coalesce(p_care,'{}'::jsonb)) loop
    if required_count>0 then
      select count(*) into done_count from familybot.sagool_action_log where family_id=p_family_id and member_id=p_member_id and action=action_name and created_at>=prog.level_started_at;
      if done_count<required_count then raise exception 'insufficient_care:%',action_name; end if;
    end if;
  end loop;
  for req in select value from jsonb_array_elements(coalesce(p_supplies,'[]'::jsonb)) loop
    update familybot.sagool_supply_inventory set quantity=quantity-(req->>'qty')::bigint,updated_at=now() where family_id=p_family_id and member_id=p_member_id and supply_id=req->>'id';
  end loop;
  if not founder and p_upgrade_coins>0 then
    update familybot.members set coins=coins-p_upgrade_coins,last_active_at=now() where id=p_member_id returning coins into next_coins;
    insert into familybot.coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id)
      values(p_family_id,p_member_id,-p_upgrade_coins,'sagool_level_upgrade','sagool_level',(p_expected_level+1)::text);
  else next_coins:=m.coins; end if;
  update familybot.sagool_progression set level=p_expected_level+1,level_started_at=now(),updated_at=now() where family_id=p_family_id and member_id=p_member_id;
  insert into familybot.activity_log(family_id,member_id,activity_type,xp_delta,metadata)
    values(p_family_id,p_member_id,'sagool_level_up',0,jsonb_build_object('from',p_expected_level,'to',p_expected_level+1));
  return jsonb_build_object('upgraded',true,'level',p_expected_level+1,'coins',next_coins,'xp',p.xp,'founder',founder);
end $$;

revoke all on function familybot.house_buy_material_atomic(uuid,uuid,text,bigint,bigint) from public,anon,authenticated;
revoke all on function familybot.house_upgrade_atomic(uuid,uuid,integer,bigint,bigint,jsonb) from public,anon,authenticated;
revoke all on function familybot.sagool_buy_supply_atomic(uuid,uuid,text,bigint,bigint) from public,anon,authenticated;
revoke all on function familybot.sagool_upgrade_atomic(uuid,uuid,integer,bigint,bigint,jsonb,jsonb) from public,anon,authenticated;
grant execute on function familybot.house_buy_material_atomic(uuid,uuid,text,bigint,bigint) to service_role;
grant execute on function familybot.house_upgrade_atomic(uuid,uuid,integer,bigint,bigint,jsonb) to service_role;
grant execute on function familybot.sagool_buy_supply_atomic(uuid,uuid,text,bigint,bigint) to service_role;
grant execute on function familybot.sagool_upgrade_atomic(uuid,uuid,integer,bigint,bigint,jsonb,jsonb) to service_role;
