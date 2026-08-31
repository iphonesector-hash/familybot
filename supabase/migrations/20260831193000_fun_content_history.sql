create table if not exists familybot.fun_content_history(
 id uuid primary key default gen_random_uuid(),
 family_id uuid not null references familybot.families(id) on delete cascade,
 member_id uuid not null references familybot.members(id) on delete cascade,
 content_type text not null,
 content_hash text not null,
 content_text text not null,
 source_label text,
 created_at timestamptz not null default now(),
 unique(member_id,content_type,content_hash)
);
create index if not exists fun_content_history_member_type_idx on familybot.fun_content_history(member_id,content_type,created_at desc);
alter table familybot.fun_content_history enable row level security;
revoke all on familybot.fun_content_history from public,anon,authenticated;
grant select,insert,delete on familybot.fun_content_history to service_role;
