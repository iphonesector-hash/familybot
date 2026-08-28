create extension if not exists pgcrypto;

create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  bale_chat_id bigint unique not null,
  name text not null default 'خانواده بزرگ جهانی',
  slug text unique,
  level integer not null default 1,
  xp bigint not null default 0,
  coins bigint not null default 0,
  house_level integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  bale_user_id bigint not null,
  first_name text,
  last_name text,
  username text,
  display_name text,
  relation_label text,
  bio text,
  birthday date,
  avatar_url text,
  xp bigint not null default 0,
  coins bigint not null default 0,
  level integer not null default 1,
  streak integer not null default 0,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  unique(family_id, bale_user_id)
);

create table if not exists relationships (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  from_member_id uuid not null references members(id) on delete cascade,
  to_member_id uuid not null references members(id) on delete cascade,
  relation_type text not null,
  created_at timestamptz not null default now(),
  unique(from_member_id, to_member_id, relation_type)
);

create table if not exists family_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  creator_member_id uuid references members(id) on delete set null,
  title text not null,
  description text,
  event_type text not null default 'event',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location_text text,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  assignee_member_id uuid references members(id) on delete set null,
  creator_member_id uuid references members(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','doing','done','cancelled')),
  due_at timestamptz,
  reward_coins integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  creator_member_id uuid references members(id) on delete set null,
  title text,
  caption text,
  media_url text,
  memory_date date,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  creator_member_id uuid references members(id) on delete set null,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  anonymous boolean not null default false,
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  option_index integer not null,
  created_at timestamptz not null default now(),
  unique(poll_id, member_id)
);

create table if not exists achievements (
  id text primary key,
  title text not null,
  description text,
  icon text,
  reward_coins integer not null default 0
);

create table if not exists member_achievements (
  member_id uuid not null references members(id) on delete cascade,
  achievement_id text not null references achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key(member_id, achievement_id)
);

create table if not exists coin_ledger (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  amount bigint not null,
  reason text not null,
  reference_type text,
  reference_id text,
  created_at timestamptz not null default now()
);

create table if not exists daily_claims (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  claim_date date not null,
  reward_coins integer not null default 25,
  created_at timestamptz not null default now(),
  unique(member_id, claim_date)
);

create table if not exists member_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  item_id text not null,
  item_name text not null,
  item_kind text not null,
  price_paid integer not null default 0,
  created_at timestamptz not null default now(),
  unique(member_id,item_id)
);

create table if not exists mission_claims (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  mission_id text not null,
  period_key text not null,
  reward_coins integer not null default 0,
  claimed_at timestamptz not null default now(),
  unique(member_id,mission_id,period_key)
);

create table if not exists warnings (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  actor_bale_user_id bigint,
  target_bale_user_id bigint not null,
  reason text,
  cleared_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  activity_type text not null,
  xp_delta integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists moderation_actions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  actor_bale_user_id bigint,
  target_bale_user_id bigint,
  action text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists group_settings (
  family_id uuid primary key references families(id) on delete cascade,
  anti_flood boolean not null default true,
  anti_link boolean not null default false,
  lock_photo boolean not null default false,
  lock_video boolean not null default false,
  lock_document boolean not null default false,
  lock_forward boolean not null default false,
  lock_sticker boolean not null default false,
  lock_gif boolean not null default false,
  lock_voice boolean not null default false,
  lock_audio boolean not null default false,
  lock_text boolean not null default false,
  flood_limit integer not null default 5,
  flood_window_seconds integer not null default 5,
  flood_mute_minutes integer not null default 10,
  warn_limit integer not null default 3,
  welcome_enabled boolean not null default true,
  welcome_message text not null default '💜 {name} خوش اومدی!\nاینجا خونه دیجیتال خانواده‌ست؛ بازی، خاطره، برنامه و Family AI همه کنار هم هستن.',
  timezone text not null default 'Asia/Tehran',
  task_reminders_enabled boolean not null default true,
  event_reminders_enabled boolean not null default true,
  birthday_reminders_enabled boolean not null default true,
  task_reminder_minutes integer not null default 60 check (task_reminder_minutes in (15,60,1440)),
  event_reminder_minutes integer not null default 60 check (event_reminder_minutes in (15,60,1440)),
  birthday_hour integer not null default 9 check (birthday_hour between 0 and 23),
  updated_at timestamptz not null default now()
);

create table if not exists moderation_whitelist (
  family_id uuid not null references families(id) on delete cascade,
  bale_user_id bigint not null,
  label text,
  created_at timestamptz not null default now(),
  primary key(family_id,bale_user_id)
);

create table if not exists flood_events (
  id bigserial primary key,
  family_id uuid not null references families(id) on delete cascade,
  bale_user_id bigint not null,
  created_at timestamptz not null default now()
);

create table if not exists game_sessions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  chat_id bigint not null,
  game_type text not null,
  prompt text not null,
  answer text not null,
  options jsonb not null default '[]'::jsonb,
  reward_coins integer not null default 10,
  status text not null default 'open' check (status in ('open','closed')),
  expires_at timestamptz,
  winner_bale_user_id bigint,
  created_at timestamptz not null default now()
);

create table if not exists notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  kind text not null check (kind in ('task','event','birthday')),
  reference_id text not null,
  delivery_slot text not null,
  delivered_at timestamptz not null default now(),
  unique(family_id,kind,reference_id,delivery_slot)
);

create table if not exists bale_updates (
  update_id bigint primary key,
  chat_id bigint,
  payload_kind text,
  received_at timestamptz not null default now()
);

create index if not exists members_family_xp_idx on members(family_id, xp desc);
create index if not exists events_family_time_idx on family_events(family_id, starts_at);
create index if not exists tasks_family_status_idx on tasks(family_id, status);
create index if not exists moderation_family_time_idx on moderation_actions(family_id, created_at desc);
create index if not exists warnings_family_target_idx on warnings(family_id, target_bale_user_id, created_at desc);
create index if not exists activity_family_time_idx on activity_log(family_id, created_at desc);
create index if not exists flood_family_user_time_idx on flood_events(family_id, bale_user_id, created_at desc);
create index if not exists game_sessions_family_status_idx on game_sessions(family_id, status, created_at desc);
create index if not exists whitelist_family_idx on moderation_whitelist(family_id,created_at desc);
create index if not exists member_items_family_idx on member_items(family_id,created_at desc);
create index if not exists mission_claims_family_member_idx on mission_claims(family_id,member_id,claimed_at desc);
create index if not exists notification_deliveries_family_time_idx on notification_deliveries(family_id,delivered_at desc);
create index if not exists bale_updates_received_idx on bale_updates(received_at desc);

create or replace function family_add_member_coins(p_member_id uuid, p_delta bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_coins bigint;
begin
  update members set coins=coins+p_delta where id=p_member_id and coins+p_delta>=0 returning coins into v_coins;
  if not found then raise exception 'insufficient_coins'; end if;
  return v_coins;
end; $$;

create or replace function family_add_member_xp(p_member_id uuid, p_delta integer)
returns table(xp bigint, level integer) language plpgsql security definer set search_path = public as $$
declare v_xp bigint; v_level integer;
begin
  if p_delta<=0 then select m.xp,m.level into v_xp,v_level from members m where m.id=p_member_id;
  else update members m set xp=m.xp+p_delta,level=greatest(1,floor(sqrt((m.xp+p_delta)::numeric/50))::integer+1),last_active_at=now() where m.id=p_member_id returning m.xp,m.level into v_xp,v_level; end if;
  if v_xp is null then raise exception 'member_not_found'; end if;
  return query select v_xp,v_level;
end; $$;

create or replace function family_claim_daily_atomic(p_family_id uuid,p_member_id uuid,p_claim_date date,p_reward integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_inserted uuid; v_coins bigint;
begin
  insert into daily_claims(family_id,member_id,claim_date,reward_coins) values(p_family_id,p_member_id,p_claim_date,p_reward) on conflict(member_id,claim_date) do nothing returning id into v_inserted;
  if v_inserted is null then return jsonb_build_object('claimed',false); end if;
  update members set coins=coins+p_reward where id=p_member_id and family_id=p_family_id returning coins into v_coins;
  insert into coin_ledger(family_id,member_id,amount,reason) values(p_family_id,p_member_id,p_reward,'daily_reward');
  return jsonb_build_object('claimed',true,'coins',v_coins,'reward',p_reward);
end; $$;

create or replace function family_complete_task_atomic(p_family_id uuid,p_member_id uuid,p_task_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_reward integer; v_status text; v_coins bigint;
begin
  select status,reward_coins into v_status,v_reward from tasks where id=p_task_id and family_id=p_family_id for update;
  if not found then raise exception 'task_not_found'; end if;
  if v_status='done' then return jsonb_build_object('completed',false,'alreadyDone',true,'reward',v_reward); end if;
  update tasks set status='done',completed_at=now(),assignee_member_id=p_member_id where id=p_task_id and family_id=p_family_id;
  if coalesce(v_reward,0)>0 then update members set coins=coins+v_reward where id=p_member_id and family_id=p_family_id returning coins into v_coins; insert into coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id) values(p_family_id,p_member_id,v_reward,'task_complete','task',p_task_id::text);
  else select coins into v_coins from members where id=p_member_id and family_id=p_family_id; end if;
  return jsonb_build_object('completed',true,'alreadyDone',false,'reward',coalesce(v_reward,0),'coins',v_coins);
end; $$;

create or replace function family_purchase_item_atomic(p_family_id uuid,p_member_id uuid,p_item_id text,p_item_name text,p_item_kind text,p_price integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_coins bigint; v_owned uuid;
begin
  select id into v_owned from member_items where member_id=p_member_id and item_id=p_item_id;
  if v_owned is not null then select coins into v_coins from members where id=p_member_id and family_id=p_family_id; return jsonb_build_object('purchased',false,'alreadyOwned',true,'coins',v_coins); end if;
  select coins into v_coins from members where id=p_member_id and family_id=p_family_id for update;
  if v_coins is null then raise exception 'member_not_found'; end if;
  if v_coins<p_price then raise exception 'insufficient_coins'; end if;
  insert into member_items(family_id,member_id,item_id,item_name,item_kind,price_paid) values(p_family_id,p_member_id,p_item_id,p_item_name,p_item_kind,p_price) on conflict(member_id,item_id) do nothing returning id into v_owned;
  if v_owned is null then return jsonb_build_object('purchased',false,'alreadyOwned',true,'coins',v_coins); end if;
  update members set coins=coins-p_price where id=p_member_id returning coins into v_coins;
  insert into coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id) values(p_family_id,p_member_id,-p_price,'store_purchase','store_item',p_item_id);
  return jsonb_build_object('purchased',true,'alreadyOwned',false,'coins',v_coins);
end; $$;

create or replace function family_transfer_coins_atomic(p_family_id uuid,p_sender_id uuid,p_target_id uuid,p_amount bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
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
  insert into coin_ledger(family_id,member_id,amount,reason,reference_type,reference_id) values (p_family_id,p_sender_id,-p_amount,'coin_transfer_out','member',p_target_id::text),(p_family_id,p_target_id,p_amount,'coin_transfer_in','member',p_sender_id::text);
  return jsonb_build_object('senderCoins',v_sender,'targetCoins',v_target,'amount',p_amount);
end; $$;
