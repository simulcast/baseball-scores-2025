# State Management Refactor + Playground

**Date:** 2026-01-12
**Status:** Approved
**Scope:** Remove audio engine, consolidate state management, build playground

## Goals

1. Remove all audio code (will rebuild from scratch in separate ticket)
2. Consolidate scattered state management into single Zustand store
3. Build playground for experimenting with game states without live MLB games

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | Zustand | Clean subscription model, works outside React (for future audio), lightweight |
| Update strategy | Diff-based | Store handles change detection, subscribers only notified on actual changes |
| Validation | Store validates game logic | Rejects impossible states (4 strikes, etc.) but no backward-transition blocking |
| Jitter handling | Audio engine's responsibility | Store passes validated state, audio smooths for musical coherence |
| Audio interface | Subscribe to raw game state | Audio engine owns all musical interpretation |
| Playground | Dedicated `/playground` route | Full control panel without cluttering main UI |

## Store Architecture

```
┌─────────────────────────────────────────────┐
│              GameStateStore                 │
├─────────────────────────────────────────────┤
│ State:                                      │
│   games: Map<gameId, NormalizedGameState>   │
│   activeGameId: string | null               │
│   lastChange: { gameId, fields, prev, next }│
├─────────────────────────────────────────────┤
│ Actions:                                    │
│   ingestApiResponse(rawData)                │
│   setActiveGame(gameId)                     │
│   updateGameState(gameId, changes)          │
│   simulateEvent(gameId, eventType)          │
├─────────────────────────────────────────────┤
│ Validation:                                 │
│   - Balls: 0-3, Strikes: 0-2, Outs: 0-2     │
│   - Valid inning states only                │
│   - Runners: boolean[3]                     │
└─────────────────────────────────────────────┘
```

## Normalized Game State Shape

```javascript
{
  // Identity
  gameId: string,

  // Teams
  homeTeam: { name, abbrev, logo },
  awayTeam: { name, abbrev, logo },

  // Score
  homeScore: number,
  awayScore: number,

  // Inning
  inning: number,           // 1-9+ (extras)
  inningState: 'Top' | 'Mid' | 'Bottom' | 'End',

  // Count
  balls: number,            // 0-3
  strikes: number,          // 0-2
  outs: number,             // 0-2

  // Runners
  runners: [boolean, boolean, boolean],  // [first, second, third]

  // Current players
  currentBatter: { name, position } | null,
  currentPitcher: { name, handedness } | null,

  // Game status
  status: 'Preview' | 'Live' | 'Final',

  // Metadata
  lastUpdated: timestamp
}
```

## Data Flow

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  MLB Stats   │────▶│  Netlify Func   │────▶│  normalizeGame() │
│     API      │     │  (1s cache)     │     │  (transform)     │
└──────────────┘     └─────────────────┘     └────────┬─────────┘
                                                      │
                                                      ▼
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Components  │◀────│  GameStateStore │◀────│ ingestApiResponse│
│  (subscribe) │     │    (Zustand)    │     │ (diff + validate)│
└──────────────┘     └─────────────────┘     └──────────────────┘
        │                    │
        │                    ▼
        │            ┌──────────────────┐
        │            │  Future Audio    │
        └───────────▶│  Engine          │
                     │  (subscribe)     │
                     └──────────────────┘
```

Polling loop lives in a single hook that fetches on interval and calls `store.ingestApiResponse(data)`. Store handles diff detection internally. Subscribers use Zustand selectors.

## Playground

**Route:** `/playground`

**Features:**
- State controls: inning, inning state, balls, strikes, outs, runners, scores
- Event simulation buttons: Strikeout, Walk, Hit, Home Run, Out, Run Scored
- Presets: Bases Loaded Drama, Perfect Game 9th, Tie Game Extras, Blowout
- Live preview: Renders actual GameCard component
- Debug panel: Shows raw store state and last change

**Event simulation** applies realistic state transitions (e.g., "Strikeout" sets strikes to 0, increments outs, loads new batter).

## Future Audio Engine Contract

```javascript
// Direct subscription for non-React audio engine
const unsubscribe = useGameStore.subscribe(
  state => state.games.get(activeGameId),
  (gameState, prevGameState) => {
    // Audio engine reacts to changes here
    // Owns all musical interpretation
    // Handles its own smoothing/debouncing
  }
);
```

Placeholder stub at `src/audio/index.js` provides the plug point.

## Scope

### Remove

| File | Reason |
|------|--------|
| `src/audio/*` | Entire directory - rebuilding from scratch |
| `src/contexts/AudioContextExtended.js` | Replaced by Zustand store |
| `src/hooks/useBaseballAudio.js` | No audio to hook into |
| `src/components/TestGameCard.js` | Replaced by playground |

### Modify

| File | Changes |
|------|---------|
| `src/components/MainLayout.js` | Remove audio integration, use new store |
| `src/components/Header.js` | Remove audio controls (or placeholder) |
| `src/components/GameCard.js` | Remove audio-related props/logic |
| `src/pages/GameList.js` | Remove test mode toggle |
| `src/hooks/useGameData.js` | Replace with store-based polling hook |

### Add

| File | Purpose |
|------|---------|
| `src/store/gameStore.js` | Zustand store |
| `src/utils/normalizeGame.js` | API response → normalized state |
| `src/pages/Playground.js` | Playground route |
| `src/components/playground/StateControls.js` | Sliders and toggles |
| `src/components/playground/EventSimulator.js` | Event buttons |
| `src/components/playground/Presets.js` | Preset scenarios |
| `src/audio/index.js` | Stub for future audio engine |

## Dependencies

Add to `package.json`:
```json
"zustand": "^4.x"
```

## Out of Scope

- Audio synthesis (separate ticket)
- Musical interpretation logic (separate ticket)
- Sound design / musicConfig (separate ticket)
