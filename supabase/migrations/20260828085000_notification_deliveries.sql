create table if not exists notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  kind text not null check (kind in ('task','event','birthday')),
  reference_id text not null,
  delivery_slot text not null,
  delivered_at timestamptz not null default now(),
  unique(family_id,kind,reference_id,delivery_slot)
);

create index if not exists notification_deliveries_family_time_idx
  on notification_deliveries(family_id,delivered_at desc);
