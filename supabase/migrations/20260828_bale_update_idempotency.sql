create table if not exists public.bale_updates (
  update_id bigint primary key,
  chat_id bigint,
  payload_kind text not null default 'unknown',
  status text not null default 'processing' check (status in ('processing','processed')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text
);

create index if not exists bale_updates_received_at_idx on public.bale_updates(received_at desc);
