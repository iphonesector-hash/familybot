alter table memories add column if not exists visibility text not null default 'family';
alter table memories drop constraint if exists memories_visibility_check;
alter table memories add constraint memories_visibility_check check (visibility in ('family','private','selected'));

create table if not exists memory_viewers (
  memory_id uuid not null references memories(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(memory_id,member_id)
);

create index if not exists memory_viewers_member_idx on memory_viewers(member_id,memory_id);
