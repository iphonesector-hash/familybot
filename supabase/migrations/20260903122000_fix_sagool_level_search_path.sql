-- Harden the immutable Sagool XP→level helper without changing behavior.
alter function familybot.sagool_level_from_xp(bigint)
  set search_path = '';
