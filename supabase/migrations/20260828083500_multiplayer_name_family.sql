create table if not exists multiplayer_answers (
  game_id uuid not null references multiplayer_games(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score integer not null default 0,
  submitted_at timestamptz not null default now(),
  primary key(game_id,member_id)
);

create index if not exists multiplayer_answers_game_idx on multiplayer_answers(game_id,score desc);
