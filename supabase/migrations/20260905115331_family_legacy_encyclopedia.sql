-- Additive Family Legacy / Encyclopedia schema.
-- Does not drop, rename, or rewrite existing tables or columns.

create table if not exists familybot.family_legacy_articles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references familybot.families(id) on delete cascade,
  author_member_id uuid references familybot.members(id) on delete set null,
  title text not null,
  cover_url text,
  body text not null default '',
  category text not null default 'تاریخچه خانواده',
  tags text[] not null default '{}',
  visibility text not null default 'family' check (visibility in ('family','close_family','private','admins')),
  moderation_status text not null default 'draft' check (moderation_status in ('draft','pending','approved','rejected','archived')),
  featured boolean not null default false,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references familybot.members(id) on delete set null,
  updated_by uuid references familybot.members(id) on delete set null
);

create table if not exists familybot.family_legacy_article_revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references familybot.family_legacy_articles(id) on delete cascade,
  editor_member_id uuid references familybot.members(id) on delete set null,
  title text not null,
  body text not null default '',
  category text,
  created_at timestamptz not null default now()
);

create table if not exists familybot.family_legacy_article_members (
  article_id uuid not null references familybot.family_legacy_articles(id) on delete cascade,
  member_id uuid not null references familybot.members(id) on delete cascade,
  primary key (article_id, member_id)
);

create table if not exists familybot.family_legacy_article_links (
  article_id uuid not null references familybot.family_legacy_articles(id) on delete cascade,
  related_article_id uuid not null references familybot.family_legacy_articles(id) on delete cascade,
  primary key (article_id, related_article_id),
  check (article_id <> related_article_id)
);

create table if not exists familybot.family_people_profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references familybot.families(id) on delete cascade,
  member_id uuid not null references familybot.members(id) on delete cascade,
  first_name text,
  last_name text,
  photo_url text,
  relationship_label text,
  short_bio text,
  occupation text,
  city text,
  interests text,
  hobbies text,
  personal_story text,
  family_branch text,
  birthday date,
  birthday_precision text not null default 'unknown' check (birthday_precision in ('full','year','month','unknown')),
  marriage_date date,
  marriage_precision text not null default 'unknown' check (marriage_precision in ('full','year','month','unknown')),
  visibility text not null default 'family' check (visibility in ('family','close_family','private','admins')),
  field_privacy jsonb not null default '{}'::jsonb,
  moderation_status text not null default 'approved' check (moderation_status in ('draft','pending','approved','rejected','archived')),
  created_by uuid references familybot.members(id) on delete set null,
  updated_by uuid references familybot.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, member_id)
);

create table if not exists familybot.family_people_relations (
  profile_id uuid not null references familybot.family_people_profiles(id) on delete cascade,
  related_member_id uuid not null references familybot.members(id) on delete cascade,
  primary key (profile_id, related_member_id)
);

create table if not exists familybot.family_legends (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references familybot.families(id) on delete cascade,
  member_id uuid references familybot.members(id) on delete set null,
  full_name text not null,
  photo_url text,
  birth_info text,
  biography text,
  occupation text,
  achievements text,
  why_important text,
  timeline jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  featured boolean not null default false,
  visibility text not null default 'family' check (visibility in ('family','close_family','private','admins')),
  moderation_status text not null default 'pending' check (moderation_status in ('draft','pending','approved','rejected','archived')),
  created_by uuid references familybot.members(id) on delete set null,
  updated_by uuid references familybot.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists familybot.family_memorials (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references familybot.families(id) on delete cascade,
  member_id uuid references familybot.members(id) on delete set null,
  name text not null,
  portrait_url text,
  birth_date date,
  birth_precision text not null default 'unknown' check (birth_precision in ('full','year','month','unknown')),
  death_date date,
  death_precision text not null default 'unknown' check (death_precision in ('full','year','month','unknown')),
  biography text,
  personal_history text,
  quotes text,
  cemetery_info text,
  visibility text not null default 'family' check (visibility in ('family','close_family','private','admins')),
  moderation_status text not null default 'pending' check (moderation_status in ('draft','pending','approved','rejected','archived')),
  created_by uuid references familybot.members(id) on delete set null,
  updated_by uuid references familybot.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists familybot.family_memorial_messages (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references familybot.family_memorials(id) on delete cascade,
  author_member_id uuid references familybot.members(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists familybot.family_memorial_candles (
  memorial_id uuid not null references familybot.family_memorials(id) on delete cascade,
  member_id uuid not null references familybot.members(id) on delete cascade,
  lit_on date not null,
  created_at timestamptz not null default now(),
  primary key (memorial_id, member_id, lit_on)
);

create table if not exists familybot.family_albums (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references familybot.families(id) on delete cascade,
  creator_member_id uuid references familybot.members(id) on delete set null,
  title text not null,
  description text,
  cover_url text,
  album_key text,
  visibility text not null default 'family' check (visibility in ('family','close_family','private','admins')),
  moderation_status text not null default 'approved' check (moderation_status in ('draft','pending','approved','rejected','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists familybot.family_legacy_media (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references familybot.families(id) on delete cascade,
  album_id uuid references familybot.family_albums(id) on delete set null,
  uploader_member_id uuid references familybot.members(id) on delete set null,
  media_url text not null,
  media_kind text not null default 'image' check (media_kind in ('image','video','document')),
  title text,
  description text,
  taken_on date,
  taken_precision text not null default 'unknown' check (taken_precision in ('full','year','month','unknown')),
  related_article_id uuid references familybot.family_legacy_articles(id) on delete set null,
  visibility text not null default 'family' check (visibility in ('family','close_family','private','admins')),
  moderation_status text not null default 'approved' check (moderation_status in ('draft','pending','approved','rejected','archived')),
  created_at timestamptz not null default now()
);

create table if not exists familybot.family_legacy_media_tags (
  media_id uuid not null references familybot.family_legacy_media(id) on delete cascade,
  member_id uuid not null references familybot.members(id) on delete cascade,
  primary key (media_id, member_id)
);

create table if not exists familybot.family_journal_posts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references familybot.families(id) on delete cascade,
  author_member_id uuid references familybot.members(id) on delete set null,
  title text not null,
  body text not null,
  cover_url text,
  kind text not null default 'خاطره',
  tags text[] not null default '{}',
  related_member_id uuid references familybot.members(id) on delete set null,
  related_media_id uuid references familybot.family_legacy_media(id) on delete set null,
  happened_on date,
  happened_precision text not null default 'unknown' check (happened_precision in ('full','year','month','unknown')),
  visibility text not null default 'family' check (visibility in ('family','close_family','private','admins')),
  moderation_status text not null default 'pending' check (moderation_status in ('draft','pending','approved','rejected','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists familybot.family_legacy_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references familybot.families(id) on delete cascade,
  creator_member_id uuid references familybot.members(id) on delete set null,
  title text not null,
  description text,
  event_kind text not null default 'historical',
  event_date date,
  date_precision text not null default 'unknown' check (date_precision in ('full','year','month','unknown')),
  related_member_ids uuid[] not null default '{}',
  visibility text not null default 'family' check (visibility in ('family','close_family','private','admins')),
  moderation_status text not null default 'approved' check (moderation_status in ('draft','pending','approved','rejected','archived')),
  created_at timestamptz not null default now()
);

create table if not exists familybot.family_legacy_comments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references familybot.families(id) on delete cascade,
  author_member_id uuid references familybot.members(id) on delete set null,
  target_type text not null check (target_type in ('article','legend','memorial','profile','journal','media','album')),
  target_id uuid not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists familybot.family_legacy_reactions (
  family_id uuid not null references familybot.families(id) on delete cascade,
  member_id uuid not null references familybot.members(id) on delete cascade,
  target_type text not null check (target_type in ('article','legend','memorial','profile','journal','media','album')),
  target_id uuid not null,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (member_id, target_type, target_id, emoji)
);

create table if not exists familybot.family_close_circle (
  family_id uuid not null references familybot.families(id) on delete cascade,
  member_id uuid not null references familybot.members(id) on delete cascade,
  close_member_id uuid not null references familybot.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (family_id, member_id, close_member_id),
  check (member_id <> close_member_id)
);

create index if not exists family_legacy_articles_family_idx
  on familybot.family_legacy_articles(family_id, moderation_status, created_at desc);
create index if not exists family_legacy_articles_category_idx
  on familybot.family_legacy_articles(family_id, category);
create index if not exists family_people_profiles_family_idx
  on familybot.family_people_profiles(family_id, member_id);
create index if not exists family_legends_family_idx
  on familybot.family_legends(family_id, moderation_status, featured desc, created_at desc);
create index if not exists family_memorials_family_idx
  on familybot.family_memorials(family_id, moderation_status, created_at desc);
create index if not exists family_albums_family_idx
  on familybot.family_albums(family_id, created_at desc);
create index if not exists family_legacy_media_family_idx
  on familybot.family_legacy_media(family_id, album_id, created_at desc);
create index if not exists family_journal_posts_family_idx
  on familybot.family_journal_posts(family_id, moderation_status, created_at desc);
create index if not exists family_legacy_events_family_idx
  on familybot.family_legacy_events(family_id, event_date);
create index if not exists family_legacy_comments_target_idx
  on familybot.family_legacy_comments(family_id, target_type, target_id, created_at);
create index if not exists family_legacy_reactions_target_idx
  on familybot.family_legacy_reactions(family_id, target_type, target_id);

-- Match existing Family Bot server-only ACL. Schema usage is already revoked
-- from anon/authenticated; lock each new table the same way later migrations do.
do $$
declare r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'familybot'
      and tablename in (
        'family_legacy_articles',
        'family_legacy_article_revisions',
        'family_legacy_article_members',
        'family_legacy_article_links',
        'family_people_profiles',
        'family_people_relations',
        'family_legends',
        'family_memorials',
        'family_memorial_messages',
        'family_memorial_candles',
        'family_albums',
        'family_legacy_media',
        'family_legacy_media_tags',
        'family_journal_posts',
        'family_legacy_events',
        'family_legacy_comments',
        'family_legacy_reactions',
        'family_close_circle'
      )
  loop
    execute format('alter table familybot.%I enable row level security', r.tablename);
    execute format('revoke all on table familybot.%I from public, anon, authenticated', r.tablename);
    execute format('grant all on table familybot.%I to service_role', r.tablename);
  end loop;
end $$;
