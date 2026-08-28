create table if not exists multiplayer_votes (
  game_id uuid not null references multiplayer_games(id) on delete cascade,
  round integer not null,
  voter_member_id uuid not null references members(id) on delete cascade,
  target_member_id uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(game_id,round,voter_member_id)
);

create index if not exists multiplayer_votes_round_idx on multiplayer_votes(game_id,round,target_member_id);
