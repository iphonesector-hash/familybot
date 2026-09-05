# Phase 1 — scoped implementation, live QA pending

Branch: `fix/bale-content-navigation-live-search-20260905`.
Base main: `8ede6dce42a1aed96ebde904b2e1408be50fcd40`.
The exact published HEAD and draft PR are reported in the handoff; use `git rev-parse HEAD` on this branch. No merge or Phase 2 work is authorized by this report.

## Startup

Old card: `app/MiniAppBootstrap.tsx`. Its render guard explicitly included `booting` and `busy`, with the “در حال ورود امن...” branch. Normal network/avatar waits therefore rendered the card. The unsupported check was unreachable after the early no-initData return; any stored session was accepted without checking its expiry. The splash could time out before bootstrap finished.

New behavior: normal bootstrap renders no auth dialog. The existing JAHANI splash listens for completion instead of an arbitrary 4.6-second cutoff. The server validates an existing session; a 401 clears it and silently creates a new session using signed Bale initData. Network/server availability failures alone do not invalidate an existing session. Fresh creation reloads once to let existing pages read the new token. Error UI is reserved for failed identity/session creation, unavailable storage, unsupported/missing identity, or required family setup. Multi-family selection remains a separate actionable chooser, never the old secure-login progress card. No avatar pipeline or authentication signature verification was changed.

Mocked lifecycle tests: fresh pending, fresh success, existing session, expired session, reload, close/reopen, unavailable server, invalid initData, unsupported SDK, family selection. These execute the actual component with isolated hooks/fetch/storage; they are not iPhone or Bale runtime tests.

Real Bale: NOT VERIFIED. The connected browser has no logged-in Bale session. It also rejected localhost with `ERR_BLOCKED_BY_CLIENT`; no successful browser navigation test is claimed.

## AI

Existing search found: YES, an HTML DuckDuckGo scraper in `app/api/ai/chat/route.ts`, plus similar old Sector group code in `lib/groupSectorAi.ts`. No Tavily/Brave/Serper/Google search adapter or structured market-price provider was found in repo/env examples. The scraper extracted only snippets, discarded source URLs/times, and duplicated failure text by both prompting the model and appending another warning. A live provider outage in production was not reproduced. The group bot is outside this Mini App scope and remains unchanged.

New server-side adapters:

- Tavily for current web/news queries; daily search range, bounded fetch, source URLs and retrieval time; news requires a recent publication timestamp. Empty, malformed, stale and failed results fail closed.
- Navasan for Tehran USD cash buy/sell and 18-karat gold per gram. Price timestamp must be today in Tehran; no USDT substitution. Explicit account-unit configuration prevents a guessed rial/toman conversion. Unsupported market/instrument requests fail closed.
- CoinGecko for explicitly named Bitcoin, Ethereum or Tether quotes in USD, with a source timestamp no older than ten minutes. Toman quotes are not inferred.

Required missing configuration in this local runtime:

```text
TAVILY_API_KEY
NAVASAN_API_KEY
NAVASAN_PRICE_UNIT
```

`NAVASAN_PRICE_UNIT` must be the provider account's verified `IRR` or `IRT` unit. Optional `COINGECKO_API_KEY` uses the Demo API header. Existing LLM configuration remains `GROQ_API_KEY` / `AI_API_KEY`.

Local keys configured: NO. Deployment keys configured: UNKNOWN; the connected project metadata tool did not expose environment-variable names, and no CLI credentials were available. No environment keys were created, changed, printed, or copied.

Dollar live result: NOT OBTAINED. Tech-news live result: NOT OBTAINED. No current price or headline is claimed. Mock fixtures are used only in tests and never in application responses.

The current-query classifier runs before search. Structured prices render server-validated Persian text directly so an LLM cannot alter a quote/unit. General fresh search results feed grounded Persian model responses. Sources and Tehran timestamps are rendered as separate clickable metadata. Search failure returns exactly `جست‌وجوی زنده الان پاسخ نداد.` once and skips the LLM entirely. Family actions and birthdays retain their existing handling; no reward logic was changed.

Documentation consulted: [Tavily Search](https://docs.tavily.com/documentation/api-reference/endpoint/search), [Navasan API](https://www.navasan.tech/api/webserviceguide/), [CoinGecko Simple Price](https://docs.coingecko.com/reference/simple-price).

## Navigation

Full table: [phase1-route-inventory.md](phase1-route-inventory.md).

Trophy root cause: the current Profile page rendered a decorative `IconOrb`, with no `href` or `onClick`. It now has a labeled anchor to `/section/achievements`; the existing achievements Back link already returns to Profile (`/section/leaderboard`). No duplicate achievements page was created.

Family Fund entry: Home → خانواده و ابزارها → Family tools → صندوق خانوادگی. Fund Back now returns to Family. Only that link changed in the Fund page; membership and owner review code remain byte-identical.

Intended orphaned sections restored: Family, Achievements, Fund, Tasks, Secret Gift, Tools. Existing game routes remain grouped in Games. Profile also links Community. Culture and Wallet are retained aliases, not missing standalone features.

## Validation and regression guard

Passed locally:

- `npm run typecheck`
- `npm run build`
- `node scripts/ai-provider.test.mjs`
- `node scripts/hotfix-live-qa.test.mjs`
- `node scripts/tree-wheel.test.mjs`
- `node scripts/progression-sim.test.mjs`
- `node scripts/store-integrity.test.mjs` — catalog 81, classified 81, missing 0, duplicates 0
- `node scripts/phase1-navigation-search.test.mjs` — actual module/handler/component execution with mocks, classifier, failed search suppresses LLM, source freshness, unit handling, session lifecycle, and source-derived reachability for all 24 concrete routes with two explicit alias exceptions

Build uses installed Next.js 15.5.25, within the existing package range. No dependency manifest or lockfile change.

Changed files are limited to startup/splash, AI search and source display, Home/Profile/Family navigation, Fund Back, and phase-specific tests/reports. The only edit to shared LiveSection is the FamilyTools import and render inside `slug === "family"`; other branches and logic are unchanged. No shared CSS/assets or DB schema changed.

Store 81/81 unchanged. Sagool unchanged. House unchanged. Wheel unchanged. Tree model/relations/migrations unchanged. Coins/XP/CP/reward values/RPCs/game_sessions unchanged. Memories, Community, Occasions, Mafia and Multiplayer logic unchanged. Main is not modified by this work. NOT merged.

## Remaining release gate — real Bale only

All remain pending on the exact new branch build, without changing Production/main:

1. Fresh startup, existing/expired session, reload, close/reopen: no normal secure-login card.
2. Profile trophy → Achievements → Back → Profile.
3. Home/Family → صندوق خانوادگی → Fund → Back → Family.
4. AI: سلام.
5. AI: قیمت امروز دلار رو بگو — actual quote plus source/time after provider configuration.
6. AI: آخرین خبر مهم تکنولوژی چیه؟ — actual current news plus source/time after provider configuration.
7. Open with `?debug=1` and compare the existing BuildMarker to the branch HEAD.

Phase 1 is implemented but not live-accepted. Phase 2 has not started.
