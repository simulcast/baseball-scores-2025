# TODOs

## Detect suspicious API responses

**What:** Log a warning when the game count drops dramatically between polls (e.g., 15 → 0) without an error.

**Why:** If the MLB API changes its response shape or a CDN serves stale/empty data, `fetchGames` returns `[]` with no error. The active game preservation protects audio continuity, but all other games silently disappear. This would look identical to "no games scheduled today."

**Pros:** Catches silent API breakage early; gives operators a signal to investigate.

**Cons:** Requires a heuristic for "suspicious" (what threshold?). Could false-positive during genuine schedule gaps (e.g., All-Star break).

**Context:** The `ingestGames` function already has `prev` and `next` game counts available. A simple `if (prevKeys.length > 5 && nextKeys.length === 0) console.warn(...)` would cover the most obvious case. The staleness/pollError infrastructure from the realtime-state-reliability PR provides the foundation.

**Depends on:** Realtime state reliability PR (seq ordering, staleness state).

**Priority:** Low — active game preservation covers the critical audio case.

## Event priority/stagger system

**What:** Add priority ranking to game events so that when 4+ fire simultaneously, lower-priority sounds are dropped or staggered.

**Why:** When a big play happens (e.g., grand slam), multiple events fire at once (runScored + runner clears + count reset). Currently all sounds overlap freely, which could be cacophonous.

**Pros:** Better audio UX during high-activity moments; cleaner soundscape.

**Cons:** Adds complexity to the `_handleEvents` loop in engine.js; needs tuning to find the right priority order and max concurrent sounds.

**Context:** The `_handleEvents` method in `src/audio/engine.js` is the natural place. Sort events by priority, cap at N, stagger with `Tone.now() + offset`. Suggested priority: runScored > inningChange > statusChange > outRecorded > runnerAdvance > strike > ball.

**Depends on:** Tone.js audio engine PR.

**Priority:** Medium — revisit once we can hear the overlapping sounds in practice.

## Audio control UI

**What:** Add a volume slider and mute toggle button to the Header component.

**Why:** Users currently have no in-app way to adjust audio volume or mute — only browser-level controls. The `setMasterVolume()` and `pause()`/`resume()` APIs already exist.

**Pros:** Complete audio UX; users can adjust without leaving the app.

**Cons:** UI design decisions needed (placement, styling); adds state to Header.

**Context:** `src/components/Header.js` is the natural home. Use MUI Slider + IconButton (VolumeUp/VolumeOff). Wire to `audio.setMasterVolume()` and `audio.pause()`/`audio.resume()` from `src/audio/index.js`.

**Depends on:** Tone.js audio engine PR.

**Priority:** Medium — nice-to-have before sharing with users.

## Per-game live feed for active game (reduce ~10s latency to ~1-2s)

**What:** Add a second polling tier that hits MLB's per-game live feed (`/api/v1.1/game/{gamePk}/feed/live`) for the active game, instead of relying solely on the batch schedule endpoint.

**Why:** The current `/api/v1/schedule` endpoint updates ~10s behind MLB's gameday UI. It's a batch endpoint for all games and is deprioritized by MLB's infrastructure. The per-game live feed updates much faster — it's what powers MLB's own gameday page.

**Pros:** Dramatically reduces latency for the active game's audio events. Sounds would feel nearly real-time instead of 10s behind the action.

**Cons:** Adds a second API route, a second polling path, and a second normalization path (live feed response shape differs from schedule). More moving parts.

**Context:** Two-tier approach — keep the schedule endpoint for the game list (slow poll, e.g., 10s), add per-game live feed for the active game only (fast poll, 500ms). New API route at `app/api/getGameLive/route.js` proxying `/api/v1.1/game/{gamePk}/feed/live`. The live feed response has `liveData.linescore` with all the fields `normalizeGame` needs (inning, balls, strikes, outs, runners, scores). Would need either a second normalizer or an adapter that reshapes the live feed response to match the schedule format before passing to `normalizeGame`. The `useGamePolling` hook would need to accept an optional `activeGameId` and switch to the live feed endpoint when one is set. The store's `ingestGames` could be extended with an `ingestGame(gameId, rawGame)` for single-game updates.

**Depends on:** Tone.js audio engine PR.

**Priority:** High — this is the biggest UX improvement available. The audio pipeline works, but 10s latency makes it feel disconnected from the action.
