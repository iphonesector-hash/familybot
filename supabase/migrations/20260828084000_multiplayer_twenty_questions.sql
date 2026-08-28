create table if not exists multiplayer_questions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references multiplayer_games(id) on delete cascade,
  asker_member_id uuid not null references members(id) on delete cascade,
  question text not null,
  answer text check (answer in ('yes','no','maybe')),
  asked_at timestamptz not null default now(),
  answered_at timestamptz
);

create index if not exists multiplayer_questions_game_idx on multiplayer_questions(game_id,asked_at);
