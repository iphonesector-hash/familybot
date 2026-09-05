-- Live reconcile for manual family-tree members.
-- Tree-only members have no Bale account, so bale_user_id must allow NULL.
-- The existing UNIQUE (family_id, bale_user_id) constraint is intentionally
-- preserved; PostgreSQL permits multiple NULL values while keeping real Bale
-- user IDs unique within each family.

alter table familybot.members
  alter column bale_user_id drop not null;
