-- Additive: allow family-tree members who are not Bale users.
-- Existing rows stay intact:
--   positive bale_user_id = real Bale accounts
--   negative bale_user_id = legacy preview sentinels (kept readable/deletable)
--   new tree-only members use NULL after this migration.
-- No DROP TABLE / TRUNCATE / data rewrite.

alter table familybot.members alter column bale_user_id drop not null;

drop index if exists familybot.members_family_id_bale_user_id_key;
alter table familybot.members drop constraint if exists members_family_id_bale_user_id_key;

create unique index if not exists members_family_bale_user_unique
  on familybot.members(family_id, bale_user_id)
  where bale_user_id is not null;
