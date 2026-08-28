-- Final idempotent reconciliation for Family Bot.
-- Safe to run after any subset of the 20260828 migrations.

alter table memories add column if not exists visibility text not null default 'family';
alter table memories drop constraint if exists memories_visibility_check;
alter table memories add constraint memories_visibility_check check (visibility in ('family','private','selected'));

alter table group_settings add column if not exists filtered_words text[] not null default '{}';
alter table group_settings add column if not exists new_member_restrict_minutes integer not null default 0;
alter table group_settings drop constraint if exists group_settings_new_member_restrict_minutes_check;
alter table group_settings add constraint group_settings_new_member_restrict_minutes_check check (new_member_restrict_minutes between 0 and 10080);

create table if not exists memory_viewers (
  memory_id uuid not null references memories(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(memory_id,member_id)
);

create table if not exists family_challenges (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references families(id) on delete cascade,
  creator_member_id uuid references members(id) on delete set null, title text not null, description text,
  challenge_type text not null default 'custom', target_value integer not null default 1 check (target_value > 0),
  reward_coins integer not null default 0 check (reward_coins between 0 and 10000), starts_at timestamptz not null default now(),
  ends_at timestamptz, status text not null default 'open' check (status in ('open','closed')), created_at timestamptz not null default now()
);
create table if not exists challenge_participants (
  challenge_id uuid not null references family_challenges(id) on delete cascade, member_id uuid not null references members(id) on delete cascade,
  progress integer not null default 0, completed_at timestamptz, reward_claimed_at timestamptz, joined_at timestamptz not null default now(),
  primary key(challenge_id,member_id)
);
create table if not exists favorite_places (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references families(id) on delete cascade,
  creator_member_id uuid references members(id) on delete set null, name text not null, category text not null default 'other',
  address text, latitude double precision, longitude double precision, notes text, created_at timestamptz not null default now()
);
create table if not exists multiplayer_duels (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references families(id) on delete cascade,
  creator_member_id uuid not null references members(id) on delete cascade, opponent_member_id uuid references members(id) on delete cascade,
  creator_choice smallint check (creator_choice between 0 and 2), opponent_choice smallint check (opponent_choice between 0 and 2),
  winner_member_id uuid references members(id) on delete set null, status text not null default 'waiting' check (status in ('waiting','active','finished','cancelled')),
  reward_coins integer not null default 10 check (reward_coins between 0 and 1000), expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(), finished_at timestamptz
);

create table if not exists family_expenses (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references families(id) on delete cascade,
  creator_member_id uuid references members(id) on delete set null, payer_member_id uuid references members(id) on delete set null,
  title text not null, amount bigint not null check (amount > 0), category text, notes text, spent_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table if not exists expense_splits (
  expense_id uuid not null references family_expenses(id) on delete cascade, member_id uuid not null references members(id) on delete cascade,
  share_amount bigint not null check (share_amount >= 0), settled boolean not null default false, settled_at timestamptz, primary key(expense_id,member_id)
);
create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references families(id) on delete cascade,
  creator_member_id uuid references members(id) on delete set null, assigned_member_id uuid references members(id) on delete set null,
  title text not null, quantity text, done boolean not null default false, created_at timestamptz not null default now(), completed_at timestamptz
);

create table if not exists secret_gift_events (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references families(id) on delete cascade,
  creator_member_id uuid references members(id) on delete set null, title text not null, event_date date, budget_note text,
  status text not null default 'drawn' check (status in ('drawn','closed')), created_at timestamptz not null default now()
);
create table if not exists secret_gift_assignments (
  event_id uuid not null references secret_gift_events(id) on delete cascade, giver_member_id uuid not null references members(id) on delete cascade,
  target_member_id uuid not null references members(id) on delete cascade, revealed_at timestamptz, created_at timestamptz not null default now(),
  primary key(event_id,giver_member_id), check (giver_member_id <> target_member_id)
);

create table if not exists multiplayer_games (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references families(id) on delete cascade,
  host_member_id uuid not null references members(id) on delete cascade, game_type text not null,
  status text not null default 'lobby' check (status in ('lobby','active','finished','cancelled')),
  public_state jsonb not null default '{}'::jsonb, secret_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), started_at timestamptz, finished_at timestamptz
);
create table if not exists multiplayer_players (
  game_id uuid not null references multiplayer_games(id) on delete cascade, member_id uuid not null references members(id) on delete cascade,
  role text, private_state jsonb not null default '{}'::jsonb, joined_at timestamptz not null default now(), primary key(game_id,member_id)
);
create table if not exists multiplayer_answers (
  game_id uuid not null references multiplayer_games(id) on delete cascade, member_id uuid not null references members(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb, score integer not null default 0, submitted_at timestamptz not null default now(), primary key(game_id,member_id)
);
create table if not exists multiplayer_questions (
  id uuid primary key default gen_random_uuid(), game_id uuid not null references multiplayer_games(id) on delete cascade,
  asker_member_id uuid not null references members(id) on delete cascade, question text not null,
  answer text check (answer in ('yes','no','maybe')), asked_at timestamptz not null default now(), answered_at timestamptz
);
create table if not exists multiplayer_votes (
  game_id uuid not null references multiplayer_games(id) on delete cascade, round integer not null,
  voter_member_id uuid not null references members(id) on delete cascade, target_member_id uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(game_id,round,voter_member_id)
);

create index if not exists memory_viewers_member_idx on memory_viewers(member_id,memory_id);
create index if not exists memories_family_visibility_idx on memories(family_id,visibility,created_at desc);
create index if not exists challenge_family_status_idx on family_challenges(family_id,status,created_at desc);
create index if not exists challenge_participant_member_idx on challenge_participants(member_id,joined_at desc);
create index if not exists favorite_places_family_idx on favorite_places(family_id,created_at desc);
create index if not exists multiplayer_duels_family_status_idx on multiplayer_duels(family_id,status,created_at desc);
create index if not exists family_expenses_family_time_idx on family_expenses(family_id,spent_at desc);
create index if not exists expense_splits_member_idx on expense_splits(member_id,settled);
create index if not exists shopping_items_family_done_idx on shopping_items(family_id,done,created_at desc);
create index if not exists secret_gift_family_idx on secret_gift_events(family_id,created_at desc);
create index if not exists secret_gift_giver_idx on secret_gift_assignments(giver_member_id,created_at desc);
create index if not exists multiplayer_family_status_idx on multiplayer_games(family_id,status,created_at desc);
create index if not exists multiplayer_player_member_idx on multiplayer_players(member_id,game_id);
create index if not exists multiplayer_answers_game_idx on multiplayer_answers(game_id,score desc);
create index if not exists multiplayer_questions_game_idx on multiplayer_questions(game_id,asked_at);
create index if not exists multiplayer_votes_round_idx on multiplayer_votes(game_id,round,target_member_id);
