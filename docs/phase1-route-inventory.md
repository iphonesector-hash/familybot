# Phase 1 route inventory

Base main: `8ede6dce42a1aed96ebde904b2e1408be50fcd40`.
All 24 concrete `app/section/*/page.tsx` routes plus the dynamic fallback are listed below.
“Yes” means a visible direct entry after this patch. “Via” is an indirect path. The old `.bottomNav` is hidden by the current global styling and is not counted as discoverability. Matching an active-path predicate also does not count as a link.

| Route | Page exists | Intended user-facing | Home entry | Profile entry | Family / other menu entry | Direct URL only before → after | Duplicate / deprecated |
| --- | --- | --- | --- | --- | --- | --- | --- |
| /section/achievements | Yes | Yes | Via Profile | Yes: trophy + label | Profile | Yes → No | Canonical |
| /section/community | Yes | Yes | Via Games / Profile | Yes | Games: duel | No → No | Unique |
| /section/culture | Yes | Alias | Via fun | No | No separate entry needed | Yes → Yes (alias only) | Re-exports fun; retained |
| /section/family | Yes | Yes | Yes: خانواده و ابزارها | Yes | Family area | Effectively hidden → No | Canonical; old hidden nav excluded |
| /section/finance | Yes | Yes | Yes | Via Home | Home | No → No | Canonical expense split / shopping page |
| /section/fun | Yes | Yes | Yes | No | Home | No → No | Canonical culture / fun page |
| /section/fund | Yes | Yes (membership only) | Via Family | Via Family | Family tools: صندوق خانوادگی | Yes → No | Unique; functionality preserved |
| /section/game-guide | Yes | Yes | Via Games | No | Games | No → No | Unique |
| /section/games | Yes | Yes | Yes | Global nav | Global nav | No → No | Unique |
| /section/house | Yes | Yes | Yes | No | Home | No → No | Unique |
| /section/leaderboard | Yes | Yes, also Profile | Yes | This is Profile | Global nav / Games | No → No | Canonical Profile + ranking |
| /section/mafia | Yes | Yes | Via Games | No | Games | No → No | Unique |
| /section/memories | Yes | Yes | Yes | Via Family | Family tools | No → No | Unique |
| /section/multiplayer | Yes | Yes | Via Games | No | Games | No → No | Unique |
| /section/occasions | Yes | Yes | Yes | Via Family | Family tools | No → No | Unique |
| /section/planner | Yes | Yes | Yes | Via Family | Family tools / Occasions | No → No | Unique |
| /section/sagool | Yes | Yes | Yes | Global nav | Global nav / House | No → No | Unique |
| /section/secret-gift | Yes | Yes | Via Family | Via Family | Family tools | Yes → No | Unique |
| /section/store | Yes | Yes | Yes | No | House / Sagool | No → No | Unique |
| /section/tasks | Yes | Yes | Via Family | Via Family | Family tools | Yes → No | LiveSection tasks; distinct from planner |
| /section/tools | Yes | Yes | Via Family | Via Family | Family tools | Yes → No | Unique |
| /section/tree | Yes | Yes | Yes | Via Family | Family | No → No | Unique |
| /section/wallet | Yes | Alias | Via finance | No | No separate entry needed | Yes → Yes (alias only) | Re-exports finance; no separate wallet logic |
| /section/wheel | Yes | Yes | Yes | No | Home | No → No | Unique |
| /section/[slug] | Yes | No independent feature | N/A | N/A | N/A | N/A | Fallback has family/games/occasions/memories/tasks/leaderboard/house/store; every key has a concrete page that takes precedence; unknown slugs 404 |

Restored intended features: Family, Achievements, Fund, Tasks, Secret Gift, Tools.
Community already had an entry from Games; Profile now provides a logical additional entry.
Aliases are retained without adding redundant destinations. No intended independent user section is orphaned according to the source-derived link graph test. This is not proof of touch behavior in Bale.

Return paths: Achievements → `/section/leaderboard` (existing); Fund → `/section/family` (changed link only). Family → Home (existing).
