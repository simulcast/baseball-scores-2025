# Architecture

Baseball Scores displays live MLB games and maps game state to generative ambient music. Built with Next.js App Router, deployed on Vercel. It polls the MLB StatsAPI via a Next.js API route, normalizes game data into a Zustand store, and renders game cards with MUI.

## System Overview

```
┌─────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│ MLB StatsAPI │────▶│ Next.js API Route    │────▶│ src/services/api │
└─────────────┘     │ app/api/getGames/    │     └────────┬─────────┘
                    │ (1s in-memory cache)  │              │
                    └─────────────────────┘              ▼
                                                  ┌──────────────────┐
                                                  │ useGamePolling   │
                                                  │ (5s interval)    │
                                                  └────────┬─────────┘
                                                           │
                                                           ▼
                                                  ┌──────────────────┐
                                                  │  Zustand Store   │
                                                  │  games: {}       │
                                                  │  activeGameId    │
                                                  └───────┬──┬───────┘
                                                          │  │
                                              ┌───────────┘  └──────────┐
                                              ▼                         ▼
                                     ┌──────────────┐         ┌──────────────┐
                                     │ React UI     │         │ Audio Engine │
                                     │ GameCard     │         │ (sine tone)  │
                                     │ GameList     │         └──────────────┘
                                     └──────────────┘
```

## API Layer

### Next.js API Route — `app/api/getGames/route.js`

Single endpoint that proxies MLB StatsAPI's schedule endpoint.

- **Route:** `GET /api/getGames?date=YYYY-MM-DD&timezoneOffset=N`
- **Hydration:** `team,linescore` — returns team info and live game state in one call
- **Cache:** 1-second in-memory cache to avoid redundant upstream calls
- **Validation:** Date format (YYYY-MM-DD), timezoneOffset is a number

### Client — `src/services/api.js`

Single function `fetchGames(date?)` using native `fetch`. Sends client timezone offset automatically.

## Data Flow

### Polling — `src/hooks/useGamePolling.js`

- `useEffect` with `setInterval` at 5s
- Overlap prevention via ref
- Stale-while-error: logs errors, keeps last good data

### Normalization — `src/utils/normalizeGame.js`

Single function `normalizeGame(raw)` that extracts from the schedule response (which includes hydrated linescore data):

```js
{
  gameId, status, gameDate,
  homeTeam: { id, name, abbreviation },
  awayTeam: { id, name, abbreviation },
  homeScore, awayScore,
  inning, isTopInning, inningState,
  balls, strikes, outs,
  runners: [bool, bool, bool]  // first, second, third
}
```

### Store — `src/store/gameStore.js`

Zustand store with plain object (not Map):

- `games: Record<string, NormalizedGame>` — referentially stable per-game objects
- `activeGameId: string | null`
- `ingestGames(rawGames)` — normalize, shallow-compare each game, keep old reference if unchanged
- `setActiveGame(id)`, `getGame(id)`, `getActiveGame()`

Change detection is implicit: Zustand subscribers using `===` on individual game objects get free change detection from referential stability.

## UI Layer

### MainLayout (`src/components/MainLayout.js`)

Orchestrates polling, URL sync, game selection. Subscribes to `games` (plain object) and `activeGameId`.

### GameCard (`src/components/GameCard.js`)

Receives a single `game` prop (the normalized object). Displays status, teams, scores, inning info, count indicators, and a baseball diamond for runners.

### GameList (`src/components/GameList.js`)

Groups games into Live, Final, and Preview sections with dividers.

## Audio Layer

Hello-world engine proving Elementary Audio works end-to-end:

- `src/audio/index.js` — Public API: `connect`, `disconnect`, `pause`, `resume`, `setMasterVolume`, `isConnected`
- `src/audio/engine.js` — Singleton `AudioEngine` class using `AudioContext` + Elementary `WebRenderer`
- **Behavior:** When a game is selected, plays a 440Hz sine tone. When no game is selected, silence.
- **Future:** Interpreter, layers, effects, and game-to-music mapping will be added incrementally.
