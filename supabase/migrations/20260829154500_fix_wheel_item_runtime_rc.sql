-- RC compatibility hardening for Lucky Wheel.
-- Scope: familybot schema only. No public objects or legacy constraints are modified.
-- The generic item-capable ledger and atomic reward RPC were introduced by
-- 20260829154000_familybot_wheel_claim_ledger_rc.sql.

-- Cover the standalone member foreign key as well as the family/member/time
-- query index created by the previous migration.
create index if not exists wheel_claims_member_idx
  on familybot.wheel_claims(member_id);

-- Reassert backend-only access without changing any existing data.
alter table familybot.wheel_claims enable row level security;
revoke all on table familybot.wheel_claims from public, anon, authenticated;
grant select, insert, update, delete on table familybot.wheel_claims to service_role;

alter function familybot.family_claim_daily_spin_reward_atomic(uuid,uuid,text,integer,text,text,text)
  set search_path = '';
revoke all on function familybot.family_claim_daily_spin_reward_atomic(uuid,uuid,text,integer,text,text,text)
  from public, anon, authenticated;
grant execute on function familybot.family_claim_daily_spin_reward_atomic(uuid,uuid,text,integer,text,text,text)
  to service_role;
