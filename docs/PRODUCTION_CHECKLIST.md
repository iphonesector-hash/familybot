# Family Bot — Production Gate

Do not deploy or switch the live Bale webhook until every item below is complete.

## 1. Secrets and environment

Set these only in the server environment. Never commit their real values.

- `BALE_BOT_TOKEN`
- `BALE_WEBHOOK_SETUP_SECRET` — only for `/api/bale/setup` and `/api/bale/doctor`; never put it in a URL
- `BALE_WEBHOOK_PATH_TOKEN` — dedicated inbound webhook URL token
- `ALLOW_BALE_WEBHOOK_SETUP=false` by default; enable only during the one-time setup operation
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

`BALE_WEBHOOK_SECRET` is a temporary backward-compatibility fallback only. Do not use it for a new production setup once `BALE_WEBHOOK_PATH_TOKEN` is configured.

Before production, rotate every secret that has ever been pasted into a chat, screenshot, log, terminal history, or temporary environment.

## 2. Database

1. Back up the target Supabase database.
2. Apply the approved release migrations in filename order.
3. Run `20260828_final_schema_reconciliation.sql`, then the later uniquely timestamped release reconciliation files.
4. Verify the atomic RPC functions for XP, coins, daily claim, task completion, purchases, transfers, Owner gifts, mission claims, achievement claims and Lucky Wheel exist.
5. Verify `daily_spin_claims` exists and `family_claim_daily_spin_atomic` enforces the 24-hour cooldown while locking the member row before enabling the feature.
6. Verify `bale_updates` exists before enabling the live webhook so update retries cannot duplicate rewards or moderation actions.
7. Verify `family_fund_memberships`, `owner_gift_log` and `briefing_deliveries` exist.
8. Verify the `family-avatars` Storage bucket is PRIVATE. New family photos must be returned through short-lived signed URLs only.
9. Treat `20260828235500_release_rewards_fund_briefing.sql` as the canonical reconciliation for Wheel/Fund/Owner-Gift/Briefing dependencies.
10. Apply `20260828235930_achievement_reward_atomic.sql` and `20260829000200_mission_atomic_and_rpc_acl.sql` before enabling rewards.
11. Verify economic `SECURITY DEFINER` RPCs reject `public`, `anon` and `authenticated` execution and are executable only by `service_role`.

## 3. Bale Mini App

Bot username: `My_familybot`

Main Mini App URL must be the final production HTTPS origin, not a preview deployment.

Expected behavior:
- opening the Main Mini App stays inside Bale WebView;
- official `miniapp.js?3` is loaded;
- `Bale.WebApp.ready()` and `expand()` run;
- server validates `initData` before issuing a Family Member Session;
- family selection works for users who belong to multiple families;
- bootstrap/family chooser uses the premium safe-area overlay rather than exposing raw page content;
- admin controls are hidden for members;
- bot `web_app` buttons use clean URLs and never contain `session=` bearer tokens;
- `/admin` bootstraps from the clicking user's current Member Session, then `/api/family/admin-link` performs a live Bale admin check before issuing an Admin Session;
- admin API calls require both a matching Admin Session and the current signed Member Session, then re-check live Bale admin status;
- Bale SettingsButton stores any short-lived admin token in `sessionStorage` and opens `/admin` without placing the token in the URL;
- copying an admin URL to a different Bale account does not grant access.

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

Verify `Management` is visible only to a current group admin. Verify Owner-only gifting is visible and executable only by the real group creator/owner, not a regular admin. Verify the Owner gift card is visible inside Admin Center only for the owner.

## 5. Moderation QA

Test with separate owner, regular-admin and normal-member accounts:
- anti-link including links in captions
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
- no legacy/public relationship mutation endpoint remains usable; relationship writes go through the admin-checked Tree API
- private avatar URLs cannot be fetched after signed URL expiry or from another family
- tasks and rewards; non-admins cannot create rewarded tasks
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
- missions/achievements; refresh/double-submit cannot create a badge/claim without its matching ledger reward
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
- direct unauthenticated POST to `/api/ai/chat` returns 401 and never calls Groq
- direct unauthenticated POST to `/api/voice/tts` returns 401 and never calls ElevenLabs
- AI page disables server-backed chat/TTS/quick actions outside a valid Family Session
- “انتقال سکه” is presented as a member-to-member transfer, not confused with Owner Gift

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
- `postcss` is pinned through `overrides` to `8.5.24` or later patched 8.5.x; `npm audit --omit=dev --audit-level=moderate` must report zero vulnerabilities on the exact release SHA.
- CI must fail on any new Moderate/High/Critical production dependency advisory; do not use `npm audit fix --force` blindly.
- no real API token exists in repository history, `.env.example`, client bundle, logs or screenshots committed to the repo.
- no signed Family/Admin session is placed in bot web_app URLs or normal navigation URLs.
- `/api/bale/setup` and `/api/bale/doctor` use `BALE_WEBHOOK_SETUP_SECRET`, separate from the inbound webhook token.
- inbound webhook authentication uses `BALE_WEBHOOK_PATH_TOKEN`; remove the legacy `BALE_WEBHOOK_SECRET` fallback after the production environment is migrated.
- CSP allows Bale framing and official Mini App SDK while blocking plugins/object embedding; do not add `X-Frame-Options` because Bale Web may use an iframe.
- sensitive API responses use `Cache-Control: no-store` where applicable.
- browser anon credentials cannot invoke server-only economy/reward RPCs directly.

## 11. Final release sequence

1. GitHub CI: production dependency audit + typecheck + production build must be green on the exact release SHA.
2. Run database backup and the approved release/reconciliation migrations.
3. Verify private Storage bucket and signed avatar behavior.
4. Configure final production environment variables, including separate `BALE_WEBHOOK_SETUP_SECRET` and `BALE_WEBHOOK_PATH_TOKEN`.
5. Rotate temporary Bale/Groq/ElevenLabs and all webhook/session secrets.
6. Perform one final production deployment.
7. Set BotFather Main Mini App URL to the final production origin.
8. Run read-only webhook doctor with `BALE_WEBHOOK_SETUP_SECRET`.
9. Enable webhook setup gate only for the setup operation.
10. Set the Bale webhook once to `/api/bale/webhook` using the dedicated `BALE_WEBHOOK_PATH_TOKEN`.
11. Disable the webhook setup gate again.
12. Remove the legacy `BALE_WEBHOOK_SECRET` fallback from production configuration after the dedicated path token is verified.
13. Enable Supabase scheduler jobs only after the new production version is verified healthy.
14. Test `/start`, every button menu, Mini App, Admin/Owner isolation, Wheel, Tree uploads, AI/voice and one moderation action from real Bale accounts.

If any security, database, Bale WebView, role, scheduler, market-data or privacy test fails, stop the release and keep the PR in Draft.
