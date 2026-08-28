create table if not exists member_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  item_id text not null,
  item_name text not null,
  item_kind text not null,
  price_paid integer not null default 0,
  created_at timestamptz not null default now(),
  unique(member_id,item_id)
);

create table if not exists mission_claims (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  mission_id text not null,
  period_key text not null,
  reward_coins integer not null default 0,
  claimed_at timestamptz not null default now(),
  unique(member_id,mission_id,period_key)
);

create index if not exists member_items_family_idx on member_items(family_id,created_at desc);
create index if not exists mission_claims_family_member_idx on mission_claims(family_id,member_id,claimed_at desc);
