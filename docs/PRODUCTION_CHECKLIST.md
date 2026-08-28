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
2. Apply all pending migrations in `supabase/migrations/`.
3. Run `20260828_final_schema_reconciliation.sql` last. It is intentionally idempotent and reconciles privacy, moderation, community, finance, Secret Gift and multiplayer structures.
4. Verify the atomic RPC functions for XP, coins, daily claim, task completion, purchases and transfers exist.
5. Verify `bale_updates` exists before enabling the live webhook so update retries cannot duplicate rewards or moderation actions.

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
- admin API calls require both a matching Admin Session and the current signed Member Session, then re-check live Bale admin status.

## 4. Bot buttons

Verify every visible button on a real Bale account:
- Mini App
- Family
- Planner
- Memories
- Finance Lite
- Community / Places
- Secret Gift
- Store
- Achievements
- Games
- Family AI
- Profile
- Leaderboard
- Daily reward
- Rules / Help

Verify `Management` is visible only to a current group admin and that copying an admin link to a non-admin account still returns `403`.

## 5. Moderation QA

Test with separate admin and normal-member accounts:
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
- family tree
- tasks and rewards
- events/calendar
- polls and live results
- memories: family/private/selected viewers
- Family House/store ownership
- challenges
- favorite places + GPS/OpenStreetMap preview
- expense split and shopping list
- Secret Gift private assignment
- missions/achievements

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

## 9. Reminder QA

- family timezone
- task reminder
- event reminder
- birthday reminder
- delivery deduplication
- `CRON_SECRET` protection

Vercel Hobby cron frequency is limited. Do not rely on high-frequency Vercel Cron for exact 15-minute reminders; use an approved external/Supabase scheduler if exact timing is required.

## 10. Final release sequence

1. GitHub CI: typecheck + production build must be green on the exact release SHA.
2. Run database backup and migrations.
3. Configure final production environment variables.
4. Rotate temporary Bale/Groq/ElevenLabs secrets.
5. Perform one final production deployment.
6. Set BotFather Main Mini App URL to the final production origin.
7. Run read-only webhook doctor.
8. Enable webhook setup gate only for the setup operation.
9. Set the Bale webhook once to `/api/bale/webhook`.
10. Disable the webhook setup gate again.
11. Test `/start`, button menu, Mini App, admin isolation, AI/voice and one moderation action from real Bale accounts.

If any security, database, Bale WebView, or role test fails, stop the release and keep the PR in Draft.
