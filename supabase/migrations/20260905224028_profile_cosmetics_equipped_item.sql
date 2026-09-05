-- Persist the currently equipped profile cosmetic for each FamilyBot member.
alter table familybot.members
  add column if not exists equipped_profile_item text;
