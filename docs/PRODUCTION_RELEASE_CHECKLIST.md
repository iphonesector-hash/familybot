# Family Bot — Production Release Gate

> Do not deploy until every pre-release item below is complete. Development stays on `revive-premium-ui`; `main`, production, and the live Bale webhook remain untouched until the final release window.

## 1. Security and secrets

- Rotate every credential that has ever been pasted into chat or test logs before production.
- Configure production-only values in the hosting environment; never commit real secrets.
- Required Bale values:
  - `BALE_BOT_TOKEN`
  - `BALE_WEBHOOK_SETUP_SECRET` — protects `/api/bale/setup` only.
  - `BALE_WEBHOOK_PATH_TOKEN` — dedicated opaque token used in the webhook URL; must be different from setup/admin/session secrets.
  - `ALLOW_BALE_WEBHOOK_SETUP=false` by default.
  - `FAMILY_ADMIN_SESSION_SECRET`
  - `FAMILY_MEMBER_SESSION_SECRET`
  - `NEXT_PUBLIC_BALE_BOT_USERNAME=My_familybot`
  - `NEXT_PUBLIC_APP_URL=https://<production-domain>`
- Configure `CRON_SECRET`; schedulers must send it only as `Authorization: Bearer ...` or `x-cron-secret`, never in a URL.
- Configure Supabase, Groq/AI, and ElevenLabs production credentials.
- Confirm `npm audit --omit=dev --audit-level=moderate` reports zero production vulnerabilities.

## 2. Database

- Back up the production database before migrations.
- Review all pending Supabase migrations.
- Apply the final idempotent reconciliation migration after the earlier schema migrations.
- Confirm these critical structures exist:
  - atomic Family Coin / XP RPCs
  - `daily_spin_claims` and `family_claim_daily_spin_atomic`
  - `bale_updates`
  - `notification_deliveries`
  - `briefing_deliveries`
  - reminder preferences
  - moderation/filter/new-member settings
  - Community / Finance / Secret Gift / Multiplayer tables
  - Family Fund enrollment tables
  - memory privacy/viewer tables
- Confirm the family-tree avatar Storage bucket is private and signed URLs work.

## 3. Build gate

The release commit must pass all CI stages on Node 24:

1. install
2. production dependency audit
3. TypeScript typecheck
4. Next.js production build

Do not merge or deploy a commit with a failed or pending gate.

## 4. Bale Mini App

- Set the final Main Mini App URL in Bale BotFather to the production HTTPS domain.
- Verify the official Bale Mini App SDK loads before application code.
- Test `initData` server validation with a real Bale session.
- Verify `ready()` and `expand()` behavior.
- Test Main Mini App direct launch and family selection.
- Confirm normal users never see management controls.
- Confirm Admin controls require live Bale admin verification.
- Confirm Owner Gift is visible and executable only for the real group owner/creator.
- Confirm copied Admin links/tokens cannot be used by another Bale account.

## 5. Webhook

- Keep `ALLOW_BALE_WEBHOOK_SETUP=false` until the final production deployment is healthy.
- Use `/api/bale/doctor` first for read-only diagnosis.
- During the release window only:
  1. set `ALLOW_BALE_WEBHOOK_SETUP=true`
  2. call the protected setup endpoint with the setup-secret header and explicit confirmation payload
  3. verify `getWebhookInfo`
  4. set `ALLOW_BALE_WEBHOOK_SETUP=false` again immediately
- Confirm incoming webhook requests require the dedicated `BALE_WEBHOOK_PATH_TOKEN`.
- Confirm duplicate Bale `update_id` values are ignored.
- Smoke-test `/start`, menus, callback buttons, moderation, games, and Mini App launch in a real Bale group.

## 6. Schedulers

### Reminders
- Scheduler must call `/api/cron/reminders` with `CRON_SECRET` in a header.
- Never place the cron secret in query parameters.
- Confirm task/event/birthday delivery deduplication.

### Daily Iran briefing
- Activate only after production is healthy.
- Schedule for **09:00** and **21:00 Asia/Tehran**.
- Scheduler calls `/api/cron/daily-briefing` with the protected header and slot (`morning` / `evening`).
- Confirm one successful delivery per family/date/slot through `briefing_deliveries`.
- Confirm a failed send releases the delivery claim so a legitimate retry can succeed.
- Check gold/USD sources and Iran-news providers immediately before activation.

## 7. Functional smoke test

Test with at least one owner, one regular admin, and one normal member:

- Home/navigation and Bale Back behavior
- profiles, birthdays, tasks, planner, polls
- private/selected-family memories
- professional Family Tree: add/edit/remove relationship, private photo upload, signed image rendering
- 24-hour Lucky Wheel: animation, star halo, cooldown, double-tap/race protection, Coin/XP award
- Owner Gift: member selection, Coin/XP, reason, audit trail
- Family Fund enrollment and the visible notice: «این بخش در آپدیت‌های بعد فعال می‌شود»
- Hafez, jokes, riddles, facts and other Family Fun actions
- weather, translator, BMI, calculator, unit conversion and age calculator
- Family AI text/voice; unauthenticated requests to AI/TTS must be rejected
- Finance Lite, Community, favorite places/map, challenges, duel
- Secret Gift privacy
- Family Trivia, quiz, RPS, Spy, Name-Family, Twenty Questions, Mafia Lite and speed quiz
- moderation, filtered words, newcomer guard, whitelist, warnings, mute/ban/unban
- daily reward, missions, achievements, store and Family House

## 8. iPhone / Bale UX

- Test on an actual iPhone inside Bale, not only desktop browser emulation.
- Verify safe areas at top/bottom, keyboard opening, 16px form controls, and no accidental Safari zoom.
- Verify no horizontal page overflow; Family Tree may use intentional contained horizontal scrolling only.
- Verify minimum touch targets and bottom navigation spacing.
- Verify Reduce Motion disables/reduces wheel and reward effects appropriately.
- Verify microphone/geolocation permission flows.

## 9. Final release

Only after all checks pass:

1. rotate production secrets
2. apply migrations
3. perform the single intended production deployment
4. verify production health and iframe headers
5. configure Main Mini App URL
6. bind the Bale webhook
7. enable schedulers
8. run real Bale/iPhone smoke tests
9. keep the PR Draft until the production verification is complete
10. merge only after the verified production commit is known-good
