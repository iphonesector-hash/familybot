alter table memories add column if not exists visibility text not null default 'family';
alter table memories drop constraint if exists memories_visibility_check;
alter table memories add constraint memories_visibility_check check (visibility in ('family','private'));

create table if not exists family_challenges (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  creator_member_id uuid references members(id) on delete set null,
  title text not null,
  description text,
  challenge_type text not null default 'custom',
  target_value integer not null default 1 check (target_value > 0),
  reward_coins integer not null default 0 check (reward_coins between 0 and 10000),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);

create table if not exists challenge_participants (
  challenge_id uuid not null references family_challenges(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  progress integer not null default 0,
  completed_at timestamptz,
  reward_claimed_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key(challenge_id,member_id)
);

create table if not exists favorite_places (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  creator_member_id uuid references members(id) on delete set null,
  name text not null,
  category text not null default 'other',
  address text,
  latitude double precision,
  longitude double precision,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists multiplayer_duels (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  creator_member_id uuid not null references members(id) on delete cascade,
  opponent_member_id uuid references members(id) on delete cascade,
  creator_choice smallint check (creator_choice between 0 and 2),
  opponent_choice smallint check (opponent_choice between 0 and 2),
  winner_member_id uuid references members(id) on delete set null,
  status text not null default 'waiting' check (status in ('waiting','active','finished','cancelled')),
  reward_coins integer not null default 10 check (reward_coins between 0 and 1000),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists challenge_family_status_idx on family_challenges(family_id,status,created_at desc);
create index if not exists challenge_participant_member_idx on challenge_participants(member_id,joined_at desc);
create index if not exists favorite_places_family_idx on favorite_places(family_id,created_at desc);
create index if not exists multiplayer_duels_family_status_idx on multiplayer_duels(family_id,status,created_at desc);
create index if not exists memories_family_visibility_idx on memories(family_id,visibility,created_at desc);
