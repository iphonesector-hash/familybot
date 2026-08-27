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

create index if not exists members_family_xp_idx on members(family_id, xp desc);
create index if not exists events_family_time_idx on family_events(family_id, starts_at);
create index if not exists tasks_family_status_idx on tasks(family_id, status);
create index if not exists moderation_family_time_idx on moderation_actions(family_id, created_at desc);
