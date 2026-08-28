-- Family Bot is a server-mediated application: browsers talk to same-origin API routes,
-- and only the backend service_role talks to PostgreSQL. Lock the public schema down
-- so a leaked/visible anon key cannot bypass Family Session/Admin checks.

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('alter table %I.%I enable row level security', r.schemaname, r.tablename);
    execute format('revoke all privileges on table %I.%I from public, anon, authenticated', r.schemaname, r.tablename);
    execute format('grant all privileges on table %I.%I to service_role', r.schemaname, r.tablename);
  end loop;
end $$;

do $$
declare
  r record;
begin
  for r in
    select sequence_schema, sequence_name
    from information_schema.sequences
    where sequence_schema = 'public'
  loop
    execute format('revoke all privileges on sequence %I.%I from public, anon, authenticated', r.sequence_schema, r.sequence_name);
    execute format('grant all privileges on sequence %I.%I to service_role', r.sequence_schema, r.sequence_name);
  end loop;
end $$;

-- Keep future app tables/sequences server-only as well when migrations are run by the same owner.
alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges in schema public grant all on sequences to service_role;
