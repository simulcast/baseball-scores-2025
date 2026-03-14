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
                                     │ React UI     │         │ Audio Engine  │
                                     │ GameCard     │         │ (generative)  │
                                     │ GameList     │         └───────────────┘
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

Generative ambient music engine (Tone.js) that transforms each live baseball game into a unique ambient composition. The engine is split into pure music theory functions (testable without audio) and Tone.js-dependent audio layers.

### Signal Flow

```
engine.js                              music/ (pure functions)
    │                                       │
    ├─ diffGameEvents(prev, next)           ├─ tension.js: game → tension (0-1)
    │      → GameEvent[]                    ├─ teamPalette.js: team IDs → palette
    │                                       ├─ harmonyEngine.js: game+palette → HarmonyState
    ├─ Composer.update(game, events)        ├─ voiceLeading.js: smooth chord transitions
    │      │                                └─ scales.js: scale/chord/MIDI utilities
    │      ├──► PadLayer (harmonic bed)
    │      ├──► PulseManager (runner patterns)
    │      ├──► EventVoice (one-shot gestures)
    │      └──► BreathLayer (noise atmosphere)
    │              │
    │              ▼
    │         EffectsChain (Reverb → Compressor → masterGain)
    │
    └─ pause/resume → Composer.suspend()/resume()
```

### Harmonic System

Each game's music is derived from its state through pure functions:

- **Root note**: Cycle of fourths by half-inning (C→F→Bb→Eb...), offset by a deterministic team palette hash. This gives each matchup a different starting key.
- **Mode**: Tension-driven. Low tension (blowout, early inning) → Lydian (bright). High tension (close game, bases loaded, 2 outs in the 9th) → Aeolian (minor/urgent).
- **Tension**: Weighted composite of runner situation (30%), score closeness (30%), count (20%), outs (20%).
- **Team identity**: Deterministic hash of `(homeTeam.id, awayTeam.id)` produces unique root offset, mode bias, and FM synthesis timbre parameters.

### Four Musical Layers

| Layer | Synth | Trigger | Role |
|---|---|---|---|
| **PadLayer** | PolySynth(Synth) + Chorus | Continuous; updates on harmony change | Warm harmonic bed. Voice-leads between chords. Idle drift shifts voicing during quiet stretches (~17s). |
| **PulseManager** | 3× FMSynth via Tone.Loop | Runner on base → start; runner off → fade out | Prime-length melodic loops (5/7/11 steps) that phase against each other (Steve Reich technique). |
| **EventVoice** | FMSynth + AMSynth | Game events (strikes, balls, runs, outs) | Harmony-aware one-shots. Arpeggios for runs, bell tones for strikes, low tones for balls. Pans toward batting/scoring team. |
| **BreathLayer** | Noise('pink') + AutoFilter | Always on | Subtle filtered noise with slow LFO. Breathes more during silence, recedes during action. |

### Audio Lifecycle

1. User clicks a game → `connect(store)` starts Tone.js AudioContext and creates Composer
2. Store subscription fires on every state change → `diffGameEvents` produces events → `Composer.update(game, events)` routes to layers
3. Pause → `Composer.suspend()` stops all scheduling loops (CPU-safe, not just muted)
4. Game switch → Composer detects team ID change, crossfades PadLayer to new harmony over 3s, recreates PulseManager with new team's timbre
5. Disconnect → all layers dispose, Tone.js context closed

### Key Design Decisions

- **Pure/audio split**: All music theory in `src/audio/music/` (93 tests, no Tone.js). All synthesis in `src/audio/composer/`.
- **No Tone.Transport for BPM**: Transport is started only as a clock source for `Tone.Loop`. Each PulsePool runs at its own interval with no BPM coupling.
- **PolySynth(Synth) for pad, FMSynth for bells**: Saves CPU (~13 oscillators peak vs ~20 with all FM). Safe for mobile Safari.
- **Self-contained layers**: Each layer implements `update()`, `suspend()`, `resume()`, `dispose()`. Composer orchestrates without layer-to-layer coupling.
