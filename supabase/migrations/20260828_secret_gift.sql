create table if not exists secret_gift_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  creator_member_id uuid references members(id) on delete set null,
  title text not null,
  event_date date,
  budget_note text,
  status text not null default 'drawn' check (status in ('drawn','closed')),
  created_at timestamptz not null default now()
);

create table if not exists secret_gift_assignments (
  event_id uuid not null references secret_gift_events(id) on delete cascade,
  giver_member_id uuid not null references members(id) on delete cascade,
  target_member_id uuid not null references members(id) on delete cascade,
  revealed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key(event_id,giver_member_id),
  check (giver_member_id <> target_member_id)
);

create index if not exists secret_gift_family_idx on secret_gift_events(family_id,created_at desc);
create index if not exists secret_gift_giver_idx on secret_gift_assignments(giver_member_id,created_at desc);
