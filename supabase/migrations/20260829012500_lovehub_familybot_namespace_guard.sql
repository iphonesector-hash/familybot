-- Shared LoveHub project guard for Family Bot.
-- Additive/idempotent only: never drops, renames, or overwrites LoveHub public objects.

create schema if not exists familybot;
grant usage on schema familybot to service_role;
revoke all on schema familybot from anon, authenticated;

-- Existing Family Bot objects are server-only. This loop is intentionally scoped
-- to the isolated schema and does not touch public/LoveHub tables.
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname='familybot' loop
    execute format('alter table familybot.%I enable row level security', r.tablename);
    execute format('revoke all on table familybot.%I from anon, authenticated', r.tablename);
    execute format('grant all on table familybot.%I to service_role', r.tablename);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in select sequence_name from information_schema.sequences where sequence_schema='familybot' loop
    execute format('revoke all on sequence familybot.%I from anon, authenticated', r.sequence_name);
    execute format('grant all on sequence familybot.%I to service_role', r.sequence_name);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='familybot'
  loop
    execute 'revoke all on function '||r.signature||' from public, anon, authenticated';
    execute 'grant execute on function '||r.signature||' to service_role';
  end loop;
end $$;

-- Keep LoveHub public API exposed and add Family Bot as a separate PostgREST profile.
alter role authenticator set pgrst.db_schemas='public,graphql_public,familybot';
notify pgrst,'reload config';

-- Private, namespaced storage. No shared storage.objects policies are modified.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
  ('familybot-avatars','familybot-avatars',false,5242880,array['image/jpeg','image/png','image/webp','image/heic']),
  ('familybot-memories','familybot-memories',false,52428800,array['image/jpeg','image/png','image/webp','image/heic','video/mp4','video/quicktime','audio/mpeg','audio/mp4','application/pdf'])
on conflict(id) do update set
  name=excluded.name,
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;
