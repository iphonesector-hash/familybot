alter table group_settings add column if not exists filtered_words text[] not null default '{}';
alter table group_settings add column if not exists new_member_restrict_minutes integer not null default 0;
alter table group_settings drop constraint if exists group_settings_new_member_restrict_minutes_check;
alter table group_settings add constraint group_settings_new_member_restrict_minutes_check check (new_member_restrict_minutes between 0 and 10080);
