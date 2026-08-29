# Family Bot — Production Checklist

The canonical release gate is now [`docs/PRODUCTION_RELEASE_CHECKLIST.md`](./PRODUCTION_RELEASE_CHECKLIST.md).

Do **not** use older assumptions from this file. In particular, the final Release Candidate intentionally has these policies:

- Development/release work stays on `vnext-familybot-release-candidate` until explicit production approval.
- `main`, the production Vercel deployment, and the live Bale webhook are not changed before that approval.
- The **Management & Group Settings** entry is visible to every member; a normal member is denied on entry with the manager-only message.
- Live Bale admins are allowed into Admin Center, and the designated Family Founder/Creator is also intentionally allowed through server-verified Creator Mode.
- Founder Coin/XP is presented as `∞`; Founder purchases/transfers must not deplete a numeric balance.
- Family Bot data stays isolated in Supabase schema `familybot`.
- The private Storage buckets are `familybot-avatars` and `familybot-memories`.
- Sagool includes passive need decay, five growth stages, solo missions, inventory/equipment, and the full care loop including walking.
- Sector AI supports text, Persian STT/TTS, memory, controlled public-web context, and group invocation by «درود سکتور» or replying to the bot.
- Daily briefing schedules are 09:00 and 21:00 Asia/Tehran and must not be enabled before the new production version is verified healthy.
- A Vercel `build-rate-limit` result is a hosting quota condition; it does not substitute for runtime verification of the latest RC.

For security, database, Bale, iPhone, game, AI, scheduler, and final-release steps, follow only the canonical release checklist linked above.
