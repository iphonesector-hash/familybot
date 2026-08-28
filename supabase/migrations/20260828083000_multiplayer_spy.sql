create table if not exists multiplayer_games (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  host_member_id uuid not null references members(id) on delete cascade,
  game_type text not null,
  status text not null default 'lobby' check (status in ('lobby','active','finished','cancelled')),
  public_state jsonb not null default '{}'::jsonb,
  secret_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists multiplayer_players (
  game_id uuid not null references multiplayer_games(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  role text,
  private_state jsonb not null default '{}'::jsonb,
  joined_at timestamptz not null default now(),
  primary key(game_id,member_id)
);

create index if not exists multiplayer_family_status_idx on multiplayer_games(family_id,status,created_at desc);
create index if not exists multiplayer_player_member_idx on multiplayer_players(member_id,game_id);
