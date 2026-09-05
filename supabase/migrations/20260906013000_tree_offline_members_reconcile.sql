-- Reconcile tree-only member support with a fresh migration timestamp.
-- The historical migration attempted to drop the backing index before its
-- unique constraint. PostgreSQL rejects dropping a constraint-owned index,
-- which can leave bale_user_id NOT NULL and make manual tree inserts fail.
-- This migration is additive/idempotent and does not rewrite member data.

alter table familybot.members
  alter column bale_user_id drop not null;

-- Drop the constraint first; PostgreSQL will remove its backing index safely.
alter table familybot.members
  drop constraint if exists members_family_id_bale_user_id_key;

-- If an older standalone index with that legacy name exists, remove it now.
drop index if exists familybot.members_family_id_bale_user_id_key;

create unique index if not exists members_family_bale_user_unique
  on familybot.members(family_id, bale_user_id)
  where bale_user_id is not null;

alter table familybot.members add column if not exists gender text;
alter table familybot.members add column if not exists death_date date;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'members_gender_check'
      and conrelid = 'familybot.members'::regclass
  ) then
    alter table familybot.members
      add constraint members_gender_check
      check (gender is null or gender in ('male','female'));
  end if;
end $$;
