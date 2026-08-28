alter table group_settings add column if not exists timezone text not null default 'Asia/Tehran';
alter table group_settings add column if not exists task_reminders_enabled boolean not null default true;
alter table group_settings add column if not exists event_reminders_enabled boolean not null default true;
alter table group_settings add column if not exists birthday_reminders_enabled boolean not null default true;
alter table group_settings add column if not exists task_reminder_minutes integer not null default 60;
alter table group_settings add column if not exists event_reminder_minutes integer not null default 60;
alter table group_settings add column if not exists birthday_hour integer not null default 9;

alter table group_settings drop constraint if exists group_settings_task_reminder_minutes_check;
alter table group_settings add constraint group_settings_task_reminder_minutes_check check (task_reminder_minutes in (15,60,1440));
alter table group_settings drop constraint if exists group_settings_event_reminder_minutes_check;
alter table group_settings add constraint group_settings_event_reminder_minutes_check check (event_reminder_minutes in (15,60,1440));
alter table group_settings drop constraint if exists group_settings_birthday_hour_check;
alter table group_settings add constraint group_settings_birthday_hour_check check (birthday_hour between 0 and 23);
