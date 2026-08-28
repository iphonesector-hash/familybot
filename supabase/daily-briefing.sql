-- Run only after the final production deployment.
-- Store these two values in Supabase Vault first:
--   familybot_app_url     = https://YOUR_FINAL_DOMAIN
--   familybot_cron_secret = the same CRON_SECRET used by the app

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname in ('familybot-briefing-morning','familybot-briefing-evening');

select cron.schedule(
  'familybot-briefing-morning',
  '30 5 * * *', -- 09:00 Asia/Tehran (UTC+03:30)
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='familybot_app_url' limit 1) || '/api/cron/daily-briefing',
    headers := jsonb_build_object(
      'content-type','application/json',
      'authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='familybot_cron_secret' limit 1)
    ),
    body := '{"slot":"morning"}'::jsonb
  );
  $$
);

select cron.schedule(
  'familybot-briefing-evening',
  '30 17 * * *', -- 21:00 Asia/Tehran (UTC+03:30)
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='familybot_app_url' limit 1) || '/api/cron/daily-briefing',
    headers := jsonb_build_object(
      'content-type','application/json',
      'authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='familybot_cron_secret' limit 1)
    ),
    body := '{"slot":"evening"}'::jsonb
  );
  $$
);
