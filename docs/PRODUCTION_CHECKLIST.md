# Family Bot — Production Gate

Do not deploy or switch the live Bale webhook until every item below is complete.

## 1. Secrets and environment

Set these only in the server environment. Never commit their real values.

- `BALE_BOT_TOKEN`
- `BALE_WEBHOOK_SECRET`
- `FAMILY_ADMIN_SESSION_SECRET`
- `FAMILY_MEMBER_SESSION_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_BALE_BOT_USERNAME`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `AI_BASE_URL=https://api.groq.com/openai/v1`
- `AI_MODEL=llama-3.3-70b-versatile`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `ELEVENLABS_MODEL_ID=eleven_multilingual_v2`
- `CRON_SECRET`

Before production, rotate every secret that has ever been pasted into a chat, screenshot, log, terminal history, or temporary environment.

## 2. Database

1. Back up the target Supabase database.
2. Apply the approved release migrations in filename order.
3. Run `20260828_final_schema_reconciliation.sql`, then the later uniquely timestamped release reconciliation files.
4. Verify the atomic RPC functions for XP, coins, daily claim, task completion, purchases, transfers, Owner gifts and Lucky Wheel exist.
5. Verify `daily_spin_claims` exists and `family_claim_daily_spin_atomic` enforces the 24-hour cooldown while locking the member row before enabling the feature.
6. Verify `bale_updates` exists before enabling the live webhook so update retries cannot duplicate rewards or moderation actions.
7. Verify `family_fund_memberships`, `owner_gift_log` and `briefing_deliveries` exist.
8. Verify the `family-avatars` Storage bucket is PRIVATE. New family photos must be returned through short-lived signed URLs only.
9. Treat `20260828235500_release_rewards_fund_briefing.sql` as the canonical reconciliation for Wheel/Fund/Owner-Gift/Briefing dependencies.

## 3. Bale Mini App

Bot username: `My_familybot`

Main Mini App URL must be the final production HTTPS origin, not a preview deployment.

Expected behavior:
- opening the Main Mini App stays inside Bale WebView;
- official `miniapp.js?3` is loaded;
- `Bale.WebApp.ready()` and `expand()` run;
- server validates `initData` before issuing a Family Member Session;
- family selection works for users who belong to multiple families;
- admin controls are hidden for members;
- admin panel can bootstrap from the clicking user's own Member Session;
- admin API calls require both a matching Admin Session and the current signed Member Session, then re-check live Bale admin status;
- copying an old/admin URL to a different Bale account does not grant access.

## 4. Bot buttons

Verify every visible button on a real Bale account:
- Mini App
- Family
- professional Family Tree
- Planner
- Lucky Wheel
- Family Fund
- Memories
- Finance Lite
- Community / Places
- Secret Gift
- Store
- Achievements
- Games
- Entertainment
- Utilities
- Family AI
- Profile
- Leaderboard
- Daily reward
- Rules / Help

Verify `Management` is visible only to a current group admin. Verify Owner-only gifting is visible and executable only by the real group creator/owner, not a regular admin.

## 5. Moderation QA

Test with separate owner, regular-admin and normal-member accounts:
- anti-link
- anti-flood
- filtered words
- newcomer guard
- photo/video/document/forward/sticker/GIF/voice/audio/text locks
- whitelist bypass
- warn / unwarn
- timed mute
- ban / unban
- pin
- moderation logs and stats

## 6. Family features QA

Verify with real rows, not demo data:
- profile edit and birthday
- visual family tree with photo upload, relationship creation/removal and relationship editing
- private avatar URLs cannot be fetched after signed URL expiry or from another family
- tasks and rewards
- events/calendar
- polls and live results
- memories: family/private/selected viewers
- Family House/store ownership
- 24-hour Lucky Wheel cooldown, double-tap/race protection, weighted reward display, Coin/XP ledger behavior and star-halo reward reveal
- Owner-only Coin/XP gift and audit log
- Family Fund join + owner approve/reject; financial fund actions remain disabled with the future-update notice
- challenges
- favorite places + GPS/OpenStreetMap preview
- expense split and shopping list
- Secret Gift private assignment
- missions/achievements
- Entertainment hub: Hafez, jokes, riddles, facts, truth/dare, question and motivation
- Utilities hub: weather, translator, BMI, calculator, unit conversion and age

## 7. Games QA

Test reward idempotency and multi-user state for:
- Family Trivia
- quiz
- dice
- coin
- RPS
- speed quiz in Bale group
- two-player duel
- Spy
- Name-Family
- Twenty Questions
- Mafia Lite

No game should pay the same terminal reward twice after refresh, retry, double tap, or duplicate webhook delivery.

## 8. AI and voice QA

On a real iPhone inside Bale:
- typed AI response
- speech recognition flow
- auto-submit after speech recognition
- Groq response
- ElevenLabs Persian TTS
- browser TTS fallback when provider fails
- task/event/poll/coin actions only with a valid Member Session
- private family context never returned across families

## 9. Scheduled jobs QA

### Reminders
- family timezone
- task reminder
- event reminder
- birthday reminder
- delivery deduplication
- `CRON_SECRET` protection

### 09:00 / 21:00 family briefing
- gold and USD parsing returns plausible values and units
- failed market source produces a graceful fallback rather than wrong numbers
- RSS headlines are deduplicated and source-labeled
- optional Groq ranking never fabricates a headline; it may only select from fetched titles
- morning/evening endpoint is protected by `CRON_SECRET`
- `briefing_deliveries` prevents duplicate morning/evening posts per Tehran date and releases a claim after a failed Bale send so a legitimate retry can proceed
- Supabase Vault contains the final app URL and cron secret before enabling `supabase/daily-briefing.sql`
- scheduler is NOT enabled before the final deployment

Vercel Hobby cron frequency is limited. Do not rely on high-frequency Vercel Cron for exact reminders; use the approved Supabase scheduler.

## 10. Dependency/security QA

- Next.js must resolve to a currently patched Maintenance-LTS release (minimum `15.5.24` for the August 2026 advisories).
- inspect `npm audit` output; do not use `npm audit fix --force` blindly.
- no real API token exists in repository history, `.env.example`, client bundle, logs or screenshots committed to the repo.
- sensitive API responses use `Cache-Control: no-store` where applicable.

## 11. Final release sequence

1. GitHub CI: typecheck + production build must be green on the exact release SHA.
2. Run database backup and the approved release/reconciliation migrations.
3. Verify private Storage bucket and signed avatar behavior.
4. Configure final production environment variables.
5. Rotate temporary Bale/Groq/ElevenLabs secrets.
6. Perform one final production deployment.
7. Set BotFather Main Mini App URL to the final production origin.
8. Run read-only webhook doctor.
9. Enable webhook setup gate only for the setup operation.
10. Set the Bale webhook once to `/api/bale/webhook`.
11. Disable the webhook setup gate again.
12. Enable Supabase scheduler jobs only after the new production version is verified healthy.
13. Test `/start`, every button menu, Mini App, Admin/Owner isolation, Wheel, Tree uploads, AI/voice and one moderation action from real Bale accounts.

If any security, database, Bale WebView, role, scheduler, market-data or privacy test fails, stop the release and keep the PR in Draft.
