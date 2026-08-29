alter table familybot.group_settings add column if not exists rules_message text not null default '📜 قوانین خانواده\n۱) احترام به همه اعضا\n۲) اسپم و تبلیغ بدون اجازه ممنوع\n۳) محتوای خصوصی خانواده بیرون گروه منتشر نشود\n۴) مدیرها می‌توانند تنظیمات امنیتی را شخصی‌سازی کنند.';
create table if not exists familybot.ai_memory_items(
 id uuid primary key default gen_random_uuid(), family_id uuid not null references familybot.families(id) on delete cascade, member_id uuid references familybot.members(id) on delete cascade,
 role text not null check(role in ('user','assistant','summary')), content text not null check(char_length(content)<=6000), created_at timestamptz not null default now()
);
create index if not exists ai_memory_family_member_created_idx on familybot.ai_memory_items(family_id,member_id,created_at desc);
alter table familybot.ai_memory_items enable row level security;
revoke all on familybot.ai_memory_items from anon,authenticated;
grant select,insert,delete on familybot.ai_memory_items to service_role;
