create table if not exists familybot.sagool_pets(
 id uuid primary key default gen_random_uuid(), family_id uuid not null references familybot.families(id) on delete cascade, member_id uuid not null references familybot.members(id) on delete cascade,
 xp integer not null default 0 check(xp>=0), hunger integer not null default 70 check(hunger between 0 and 100), thirst integer not null default 70 check(thirst between 0 and 100), energy integer not null default 80 check(energy between 0 and 100), cleanliness integer not null default 80 check(cleanliness between 0 and 100), happiness integer not null default 75 check(happiness between 0 and 100), bond integer not null default 50 check(bond between 0 and 100), last_care_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(family_id,member_id)
);
create index if not exists sagool_pets_family_idx on familybot.sagool_pets(family_id);
alter table familybot.sagool_pets enable row level security;
revoke all on familybot.sagool_pets from anon,authenticated;
grant select,insert,update,delete on familybot.sagool_pets to service_role;
