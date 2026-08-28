-- Additive performance reconciliation for the isolated Family Bot schema only.
-- Creates covering indexes for foreign keys that do not already have one.
do $$
declare
  r record;
  idx_name text;
  cols text;
begin
  for r in
    select c.conrelid,c.conname,n.nspname as schema_name,t.relname as table_name,c.conkey
    from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    join pg_namespace n on n.oid=t.relnamespace
    where c.contype='f' and n.nspname='familybot'
      and not exists (
        select 1 from pg_index i
        where i.indrelid=c.conrelid and i.indisvalid
          and (i.indkey::smallint[])[0:cardinality(c.conkey)-1]=c.conkey
      )
  loop
    select string_agg(format('%I',a.attname),', ' order by u.ord)
      into cols
    from unnest(r.conkey) with ordinality u(attnum,ord)
    join pg_attribute a on a.attrelid=r.conrelid and a.attnum=u.attnum;
    idx_name:=left(r.table_name||'__'||replace(r.conname,r.table_name||'_','')||'__idx',63);
    execute format('create index if not exists %I on %I.%I (%s)',idx_name,r.schema_name,r.table_name,cols);
  end loop;
end $$;
