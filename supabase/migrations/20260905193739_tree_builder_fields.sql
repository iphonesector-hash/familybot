-- Additive tree-builder fields. Existing members and relationships stay intact.
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
