create table if not exists familybot.sagool_actions(
 id uuid primary key default gen_random_uuid(), family_id uuid not null references familybot.families(id) on delete cascade, member_id uuid not null references familybot.members(id) on delete cascade, action text not null, xp_delta integer not null default 0, created_at timestamptz not null default now()
);
create index if not exists sagool_actions_member_created_idx on familybot.sagool_actions(member_id,created_at desc);
alter table familybot.sagool_actions enable row level security;
revoke all on familybot.sagool_actions from anon,authenticated;
grant select,insert on familybot.sagool_actions to service_role;

create or replace function familybot.family_transfer_coins_atomic(p_family_id uuid,p_sender_id uuid,p_target_id uuid,p_amount bigint)
returns jsonb language plpgsql security definer set search_path='familybot','pg_temp' as $$
declare vs bigint; vt bigint; vf boolean;
begin
 if p_sender_id=p_target_id then raise exception 'cannot_transfer_to_self'; end if;
 if p_amount<=0 or p_amount>1000000 then raise exception 'invalid_amount'; end if;
 select coins,is_founder into vs,vf from familybot.members where id=p_sender_id and family_id=p_family_id for update;
 if vs is null then raise exception 'sender_not_found'; end if;
 select coins into vt from familybot.members where id=p_target_id and family_id=p_family_id for update;
 if vt is null then raise exception 'target_not_found'; end if;
 if not coalesce(vf,false) and vs<p_amount then raise exception 'insufficient_coins'; end if;
 if not coalesce(vf,false) then update familybot.members set coins=coins-p_amount where id=p_sender_id returning coins into vs; end if;
 update familybot.members set coins=coins+p_amount where id=p_target_id returning coins into vt;
 if not coalesce(vf,false) then insert into familybot.coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id) values(p_family_id,p_sender_id,-p_amount,'coin_transfer_out','member',p_target_id::text); end if;
 insert into familybot.coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id) values(p_family_id,p_target_id,p_amount,'coin_transfer_in','member',p_sender_id::text);
 return jsonb_build_object('senderCoins',vs,'targetCoins',vt,'amount',p_amount,'founder',coalesce(vf,false));
end $$;
revoke all on function familybot.family_transfer_coins_atomic(uuid,uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function familybot.family_transfer_coins_atomic(uuid,uuid,uuid,bigint) to service_role;

create or replace function familybot.family_sagool_care_atomic(p_family_id uuid,p_member_id uuid,p_action text)
returns jsonb language plpgsql security definer set search_path='familybot','pg_temp' as $$
declare p familybot.sagool_pets%rowtype; last_action timestamptz; dx int:=10; dh int:=0; dt int:=0; de int:=0; dc int:=0; djoy int:=0; dbond int:=0;
begin
 if p_action not in ('feed','water','play','sleep','clean','train') then raise exception 'unknown_action'; end if;
 select created_at into last_action from familybot.sagool_actions where family_id=p_family_id and member_id=p_member_id and action=p_action order by created_at desc limit 1;
 if last_action is not null and last_action+interval '12 seconds'>now() then return jsonb_build_object('ok',false,'cooldown',true,'nextAt',last_action+interval '12 seconds'); end if;
 insert into familybot.sagool_pets(family_id,member_id) values(p_family_id,p_member_id) on conflict(family_id,member_id) do nothing;
 select * into p from familybot.sagool_pets where family_id=p_family_id and member_id=p_member_id for update;
 if p_action='feed' then dh:=24; djoy:=3; elsif p_action='water' then dt:=28; elsif p_action='play' then djoy:=22; de:=-10; dbond:=6; elsif p_action='sleep' then de:=30; elsif p_action='clean' then dc:=30; djoy:=4; elsif p_action='train' then djoy:=7; dbond:=9; dx:=18; end if;
 update familybot.sagool_pets set xp=xp+dx,hunger=greatest(0,least(100,hunger+dh)),thirst=greatest(0,least(100,thirst+dt)),energy=greatest(0,least(100,energy+de)),cleanliness=greatest(0,least(100,cleanliness+dc)),happiness=greatest(0,least(100,happiness+djoy)),bond=greatest(0,least(100,bond+dbond)),last_care_at=now(),updated_at=now() where id=p.id returning * into p;
 insert into familybot.sagool_actions(family_id,member_id,action,xp_delta) values(p_family_id,p_member_id,p_action,dx);
 return jsonb_build_object('ok',true,'xp',p.xp,'hunger',p.hunger,'thirst',p.thirst,'energy',p.energy,'cleanliness',p.cleanliness,'happiness',p.happiness,'bond',p.bond);
end $$;
revoke all on function familybot.family_sagool_care_atomic(uuid,uuid,text) from public,anon,authenticated;
grant execute on function familybot.family_sagool_care_atomic(uuid,uuid,text) to service_role;
