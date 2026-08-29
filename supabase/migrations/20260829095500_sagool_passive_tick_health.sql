create or replace function familybot.sagool_tick_atomic(p_family_id uuid, p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = familybot, public
as $$
declare
  p familybot.sagool_pets%rowtype;
  hours_elapsed int;
  nh int; nt int; ne int; ny int; njoy int; nhealth int;
  lowest_need int;
begin
  insert into familybot.sagool_pets(family_id, member_id)
  values (p_family_id, p_member_id)
  on conflict(member_id) do nothing;

  select * into p
  from familybot.sagool_pets
  where family_id = p_family_id and member_id = p_member_id
  for update;

  if not found then raise exception 'pet_not_found'; end if;

  hours_elapsed := greatest(0, least(48, floor(extract(epoch from (now() - coalesce(p.last_tick_at, now()))) / 3600)::int));
  if hours_elapsed < 1 then
    return jsonb_build_object('pet', to_jsonb(p), 'hoursElapsed', 0);
  end if;

  nh := greatest(0, p.hunger - least(35, hours_elapsed * 2));
  nt := greatest(0, p.thirst - least(45, hours_elapsed * 3));
  ne := greatest(0, p.energy - least(30, hours_elapsed * 2));
  ny := greatest(0, p.hygiene - least(25, hours_elapsed));
  njoy := greatest(0, p.happiness - least(25, hours_elapsed));
  lowest_need := least(nh, nt, ne, ny);

  nhealth := p.health;
  if lowest_need < 10 then
    nhealth := greatest(0, nhealth - greatest(1, hours_elapsed * 2));
  elsif lowest_need < 20 then
    nhealth := greatest(0, nhealth - greatest(1, hours_elapsed));
  elsif lowest_need >= 70 and nhealth < 100 then
    nhealth := least(100, nhealth + greatest(1, floor(hours_elapsed / 6.0)::int));
  end if;

  update familybot.sagool_pets
  set hunger = nh,
      thirst = nt,
      energy = ne,
      hygiene = ny,
      happiness = njoy,
      health = nhealth,
      last_tick_at = now(),
      updated_at = now()
  where id = p.id
  returning * into p;

  return jsonb_build_object('pet', to_jsonb(p), 'hoursElapsed', hours_elapsed);
end
$$;

revoke all on function familybot.sagool_tick_atomic(uuid, uuid) from public, anon, authenticated;
grant execute on function familybot.sagool_tick_atomic(uuid, uuid) to service_role;
