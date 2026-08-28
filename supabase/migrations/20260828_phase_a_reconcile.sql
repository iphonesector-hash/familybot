create table if not exists daily_spin_claims (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  reward_kind text not null check (reward_kind in ('coins','xp')),
  reward_amount integer not null check (reward_amount > 0),
  claimed_at timestamptz not null default now()
);
create index if not exists daily_spin_member_time_idx on daily_spin_claims(member_id,claimed_at desc);

create table if not exists family_fund_memberships (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_member_id uuid references members(id) on delete set null,
  unique(family_id,member_id)
);
create index if not exists family_fund_family_status_idx on family_fund_memberships(family_id,status,created_at desc);

create table if not exists owner_gift_log (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  owner_member_id uuid not null references members(id) on delete cascade,
  target_member_id uuid not null references members(id) on delete cascade,
  gift_kind text not null check (gift_kind in ('coins','xp')),
  amount integer not null check (amount > 0 and amount <= 1000000),
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists owner_gift_family_time_idx on owner_gift_log(family_id,created_at desc);
