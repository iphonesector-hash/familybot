create table if not exists family_expenses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  creator_member_id uuid references members(id) on delete set null,
  payer_member_id uuid references members(id) on delete set null,
  title text not null,
  amount bigint not null check (amount > 0),
  category text,
  notes text,
  spent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists expense_splits (
  expense_id uuid not null references family_expenses(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  share_amount bigint not null check (share_amount >= 0),
  settled boolean not null default false,
  settled_at timestamptz,
  primary key(expense_id,member_id)
);

create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  creator_member_id uuid references members(id) on delete set null,
  assigned_member_id uuid references members(id) on delete set null,
  title text not null,
  quantity text,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists family_expenses_family_time_idx on family_expenses(family_id,spent_at desc);
create index if not exists expense_splits_member_idx on expense_splits(member_id,settled);
create index if not exists shopping_items_family_done_idx on shopping_items(family_id,done,created_at desc);
