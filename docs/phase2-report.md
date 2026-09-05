# Phase 2 — content hotfix report

Branch: `fix/bale-content-navigation-live-search-20260905` (existing; no additional branch).
Starting HEAD: `b097e25e68c12fd00ccab752aa488bdfe0ab1973`.
Main: `8ede6dce42a1aed96ebde904b2e1408be50fcd40`, untouched.
PR: https://github.com/iphonesector-hash/familybot/pull/15 (existing draft, not merged).
Final commit SHA is recorded in the PR/final delivery rather than a self-referential commit in this file.

## Outcome and limits

Content implementation and local regression checks completed. **Not a completed real-Bale acceptance sign-off.** Real Bale credentials/session were unavailable. The 20-item Dezfuli poem target was not reached. Production credentials were not extracted; local fact generation cannot succeed without the existing model key. Do not interpret fixture results, HTTP 200, or preview build success as real Bale QA.

| Area | Actual result |
|---|---|
| Ganjoor | Real API JSON received and parsed; 51 verified classical excerpts cached as imports. No AI/classical local-bank fallback. |
| Poets | Hafez, Saadi, Rumi, Ferdowsi, Khayyam, Nezami, Attar, Sanai. Original random API's unsupported-poet behavior detected; ID/URL checks added. |
| Literature 30 requests | 30 unique / 30 successful using real imported Ganjoor data with network disabled. Not 30 live successes. |
| Persian proverbs | 111 selected traditional sayings; Wikiquote revision 192659, CC BY-SA 4.0 attribution and license. MasalBench not imported: no explicit license found. |
| Proverbs 30 requests | 30 unique, no failures; verified-import. |
| NASA | Real APOD API returned HTTP 200 with three parseable items using DEMO_KEY. Source material retrieval verified, Persian generation not verified live. |
| Smithsonian | HTTP 403 without key; `SMITHSONIAN_API_KEY` absent locally. |
| OpenAlex | Real works API returned HTTP 200 and structured abstract data. General-audience summary acceptance not verified live. |
| Facts 30 requests | 0 displayed, 30 unavailable, because local `GROQ_API_KEY` / `AI_API_KEY` is absent. No values or facts invented. |
| Facts distribution | NASA 0, Smithsonian 0, OpenAlex 0, Wikipedia 0 displayed. Wikipedia fallback count 0; this is **not** a successful distribution test. |
| Jokes | 150 distinct editorial items, structural validation 150/150. Review by the coding assistant, not externally certified human review. |
| AI joke accepted/rejected | Actual AI calls 0 / 0 in the 30-item pool run. No configured local model key. Fixture-based validator/rejection checks passed. |
| Jokes 30 requests | 30 distinct displayed editorial jokes, 30/30 pass actual validator. Quality remains subjective; no claimed live joke API. |
| Dezfuli words | 80 total: 45 inherited attributed entries + 35 newly sourced lexical facts. |
| Dezfuli proverbs | 26 total: 3 inherited + 23 new source-checked traditional sayings. |
| Dezfuli poems/beyts | 11 total: 3 inherited excerpts + 8 distinct couplets from one traditional wedding-song collection. **Not 11 independent poems; below target 20.** |
| Dezfuli proverb 15 requests | 15 unique / 15, no immediate repeats. |
| Dezfuli poem 15 requests | 11 unique / 15, repeats only after all 11 have been used. |
| Quiz | Exactly 3 unique shuffled choices; correctIndex/meaning omitted before submission; distractors from other sourced meanings, known synonyms excluded. |
| Server authority | Family/user binding, encrypted persistent question, expiry, first-answer CAS, cross-user and concurrent requests tested with DB fixtures. |
| Reward/idempotency | Existing atomic claim RPC and `challengeReward("dezfuli")` unchanged. Wrong then changed answer rejected; same-answer retry grants at most once in fixture test. Live DB reward QA not performed. |

Source-mode counts (active static pools; legacy provenance retained, not newly recertified):

| Kind | Before: cached-remote | Before: verified-import | Before: curated-local | After: cached-remote | After: verified-import | After: curated-local |
|---|---:|---:|---:|---:|---:|---:|
| dezfuli-word | 0 observed locally | 45 | 0 | 0 observed locally | 80 | 0 |
| dezfuli-proverb | 0 | 3 | 0 | 0 | 26 | 0 |
| dezfuli-poem | 0 | 3 | 0 | 0 | 11 | 0 |

Remote cache is per server process; production-instance cache counts cannot be inferred from this workspace. Inherited Telegram post-level provenance was not independently reverified. Exact new sources and license details: `lib/contentData/README.md`.

## Automated checks

- `npm run typecheck`: PASS.
- `npm run build`: PASS (Next.js production build).
- Existing `content-live`, `content-dedupe`, `content-quality`, `hotfix-live-qa`, `store-integrity`, `progression-sim`, `tree-wheel`: PASS.
- Phase 1 navigation/search/bootstrap regression test: PASS, unchanged.
- New phase-2 behavioral tests: PASS. They execute actual modules and quiz endpoint with explicitly mocked external services.
- Offline 30/15-request probe executes the actual resolver and imported/editorial data. An additional network-enabled Node probe did not complete in the restricted execution environment; no live success count is claimed from it.
- Legacy `content-dedupe` tests legacy data declarations, so its printed pool counts do not describe the new active adapters. Phase-2 probe is authoritative for these changes.

Real Bale: literature 10+, proverbs/facts/jokes/Dezfuli 15 each, and three-choice quiz flow: **NOT VERIFIED**. No authenticated Bale runtime was available.

## Scoped diff audit

Phase-1 HEAD → Phase-2 changes are confined to these 21 files:

- `app/api/family/culture/quiz/route.ts`
- `app/api/family/fun/route.ts`
- `app/section/fun/page.tsx`
- `lib/contentHash.ts`
- `lib/contentRemote.ts`
- `lib/contentValidation.ts`
- `lib/curatedJokes.ts`
- `lib/dezfuliCulture.ts`
- `lib/dezfuliIngest.ts`
- `lib/contentFacts.ts`
- `lib/contentGanjoor.ts`
- `lib/dezfuliQuiz.ts`
- `lib/contentData/ganjoor.json`
- `lib/contentData/proverbs.json`
- `lib/contentData/dezfuli.json`
- `lib/contentData/README.md`
- `scripts/content-live.test.mjs`
- `scripts/content-quality.test.mjs`
- `scripts/phase2-content.test.mjs`
- `scripts/phase2-content-probe.mjs`
- `docs/phase2-report.md`

Every changed file is needed for content sourcing, content provenance, content validation, the requested quiz UI/API, tests or this report. Generated Next/TypeScript files are excluded. No unrelated file changes are retained.

| Regression guard | Result |
|---|---|
| Phase 1 startup/auth, AI keyboard, Profile/Fund navigation | Files unchanged; Phase 1 test passes |
| Store | Unchanged; catalog 81, classified 81, missing 0, duplicates 0 |
| Sagool | Unchanged; progression tests pass |
| House | Unchanged; progression tests pass |
| Wheel | Unchanged; tests pass |
| Tree | Unchanged; tests pass |
| Rewards, coins, XP/CP | Values and RPCs unchanged; no SQL/migration changes |
| Other games and game_sessions rules | Unchanged; quiz uses already-closed encrypted storage records, never an open game |
| Main | Untouched |
| Merge | NOT MERGED |
| Phase 3 | NOT STARTED |
