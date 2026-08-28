create table if not exists public.briefing_deliveries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  briefing_date date not null,
  slot text not null check (slot in ('morning','evening')),
  delivered_at timestamptz not null default now(),
  unique(family_id,briefing_date,slot)
);
create index if not exists briefing_deliveries_family_time_idx on public.briefing_deliveries(family_id,delivered_at desc);
