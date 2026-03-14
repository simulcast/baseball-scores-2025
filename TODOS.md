# TODOs

## Detect suspicious API responses

**What:** Log a warning when the game count drops dramatically between polls (e.g., 15 → 0) without an error.

**Why:** If the MLB API changes its response shape or a CDN serves stale/empty data, `fetchGames` returns `[]` with no error. The active game preservation protects audio continuity, but all other games silently disappear. This would look identical to "no games scheduled today."

**Pros:** Catches silent API breakage early; gives operators a signal to investigate.

**Cons:** Requires a heuristic for "suspicious" (what threshold?). Could false-positive during genuine schedule gaps (e.g., All-Star break).

**Context:** The `ingestGames` function already has `prev` and `next` game counts available. A simple `if (prevKeys.length > 5 && nextKeys.length === 0) console.warn(...)` would cover the most obvious case. The staleness/pollError infrastructure from the realtime-state-reliability PR provides the foundation.

**Depends on:** Realtime state reliability PR (seq ordering, staleness state).

**Priority:** Low — active game preservation covers the critical audio case.
