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

create index if not exists member_items_family_idx on member_items(family_id,created_at desc);
create index if not exists relationships_family_idx on relationships(family_id,created_at desc);
