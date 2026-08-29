# Family Bot — Production Release Gate

> Do not deploy until every pre-release item below is complete. Release-candidate work stays on `vnext-familybot-release-candidate`; `main`, production, and the live Bale webhook remain untouched until the final release window.

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

- Back up the production database before any final migration work.
- Family Bot objects must remain isolated in the `familybot` schema; do not modify unrelated LoveHub `public` objects during this release.
- Confirm all Family Bot base tables have RLS enabled and direct `anon` / `authenticated` grants remain blocked under the server-only architecture.
- Confirm sensitive Family Bot RPCs are executable only by `service_role`.
- Confirm the private buckets `familybot-avatars` and `familybot-memories` remain private and signed URLs work.
- Confirm these critical structures exist:
  - atomic Family Coin / XP RPCs
  - Founder-aware purchase and transfer RPCs
  - `daily_spin_claims` and `family_claim_daily_spin_atomic`
  - `bale_updates`
  - `notification_deliveries`
  - `briefing_deliveries`
  - reminder preferences
  - moderation/filter/new-member settings
  - Community / Finance / Secret Gift / Multiplayer tables
  - Family Fund enrollment tables
  - memory privacy/viewer tables
  - Sagool pet, action log, solo missions, inventory/equipment and passive tick support
  - AI memory/chat tables

## 3. Build gate

The release commit must pass all CI stages:

1. install
2. production dependency audit
3. TypeScript typecheck
4. Next.js production build

Do not merge or deploy a commit with a failed or pending gate. A Vercel build-rate-limit response is a hosting quota condition, not a successful runtime verification; the latest RC still needs a fresh Preview when quota permits.

## 4. Bale Mini App

- Set the final Main Mini App URL in Bale to the production HTTPS domain only during the final release window.
- Test `initData` server validation with a real Bale session.
- Verify `ready()` and `expand()` behavior.
- Test Main Mini App direct launch and family selection.
- The **Management & Group Settings** button is intentionally visible to all members.
- A normal member who opens management must be denied with: «فقط مدیران گروه اجازه‌ی ورود دارن» (minor typography variation is acceptable).
- Admin controls require live Bale admin verification, except the designated Family Founder/Creator who is intentionally allowed Creator Mode access.
- Founder access must be verified server-side; it must not depend only on a client flag.
- Copied Admin links/tokens must not be usable by another Bale account.
- User-facing personal areas should render the member avatar when available; AI/brand mascots may remain mascots where they represent the assistant/brand rather than the member.

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
- Confirm Sector AI responds to «درود سکتور» / direct Sector invocation and replies to the bot, without leaking private family data.
- Confirm `/rules` and the Rules menu use the editable family rules.

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

Test with at least one Founder/Creator, one regular admin, and one normal member:

- Home/navigation and Bale Back behavior
- profiles, avatars, birthdays, tasks, planner, polls
- private/selected-family memories and private media
- Family Tree: add/edit/remove relationship, private photo upload, signed image rendering
- 24-hour Lucky Wheel: labeled wheel, animation, star halo, cooldown, double-tap/race protection, Coin/XP award
- Founder Mode: `∞` presentation, no coin depletion on Founder purchases/transfers, management access
- Owner/Founder gift controls: member selection, Coin/XP, reason, audit trail
- Family Fund enrollment and visible future-update notice
- Hafez with short interpretation, jokes, riddles, facts, Dezfuli words/proverbs/short poetry excerpts and rewarded word quiz
- weather, translator, BMI, calculator, unit conversion and age calculator
- Sector AI text/voice, persistent memory and controlled public-web context; unauthenticated AI/STT/TTS requests must be rejected
- Finance Lite, Community, favorite places/map, challenges, duel
- Secret Gift privacy
- Family Trivia, quiz, visual Dice/Coin/RPS results, Spy, Name-Family, Twenty Questions, Mafia Lite and speed quiz
- moderation, filtered words, newcomer guard, whitelist, warnings, mute/ban/unban
- daily reward, missions, achievements, graphical store and Family House
- Sagool: passive needs decay/health, feed/water/play/sleep/clean/pet/walk/train, cooldown, five growth stages, all daily missions solo, graphical inventory and up to three equipped items

## 8. iPhone / Bale UX

- Test on an actual iPhone inside Bale, not only desktop browser emulation.
- Verify safe areas at top/bottom, keyboard opening, 16px form controls, and no accidental Safari zoom.
- Verify AI quick actions remain above the composer and the composer is not hidden by the keyboard/bottom inset.
- Verify Tools, Planner and Memories forms have no overlapping buttons/inputs.
- Verify no horizontal page overflow; Family Tree may use intentional contained horizontal scrolling only.
- Verify minimum touch targets and bottom navigation spacing.
- Verify Reduce Motion disables/reduces wheel and reward effects appropriately.
- Verify microphone/geolocation permission flows.

## 9. Final release

Only after all checks pass and explicit deployment approval is given:

1. rotate/confirm production secrets as required
2. apply only any genuinely pending Family Bot migrations
3. perform the single intended production deployment
4. verify production health and headers
5. configure Main Mini App URL if needed
6. bind/verify the Bale webhook
7. enable schedulers
8. run real Bale/iPhone smoke tests
9. keep `main` unchanged until the verified release commit is known-good
10. merge/promote only after production verification
