# Architecture

Baseball Scores transforms live MLB games into generative ambient music. It polls the MLB StatsAPI for real-time game state, normalizes the data into a Zustand store, renders game cards in a React UI, and feeds the same state into an Elementary Audio engine that maps baseball events to synthesized sound.

## System Overview

```
┌─────────────┐     ┌────────────────────────────┐     ┌──────────────────┐
│ MLB StatsAPI │────▶│ Netlify Functions (1s cache)│────▶│ src/services/api │
└─────────────┘     │  getGames                  │     └────────┬─────────┘
                    │  getGameDetails             │              │
                    │  getMultipleGameDetails      │              ▼
                    └────────────────────────────┘     ┌──────────────────┐
                                                       │ useGamePolling   │
                                                       │ (5s interval)    │
                                                       └────────┬─────────┘
                                                                │
                                                                ▼
                                                       ┌──────────────────┐
                                                       │  Zustand Store   │
                                                       │  (gameStore.js)  │
                                                       └───────┬──┬───────┘
                                                               │  │
                                              ┌────────────────┘  └────────────────┐
                                              ▼                                    ▼
                                     ┌────────────────┐                   ┌────────────────┐
                                     │   React UI     │                   │  Audio Engine   │
                                     │   MainLayout   │                   │  interpreter →  │
                                     │   GameList     │                   │  layers →       │
                                     │   GameCard     │                   │  WebRenderer    │
                                     └────────────────┘                   └────────────────┘
```

**Tech stack:** React 18, Zustand, Material UI, Elementary Audio (`@elemaudio/core` + `@elemaudio/web-renderer`), Netlify Functions, axios.

---

## 1. MLB API Proxy Layer

**Directory:** `netlify/functions/`

Three serverless endpoints proxy the MLB StatsAPI to avoid CORS and add caching.

### Endpoints

| Endpoint | Query Params | Returns |
|---|---|---|
| `getGames` | `date?` (YYYY-MM-DD), `timezoneOffset?` (minutes) | `{ games: Array, fromCache: boolean }` |
| `getGameDetails` | `gamePk` (required) | `{ gameState: Object, fromCache: boolean }` |
| `getMultipleGameDetails` | `gamePks` (comma-separated) | `{ gameStates: { [gamePk]: Object } }` |

### Caching

All three endpoints use in-memory caches with **1-second TTL**. `getGames` uses a single `gamesCache` object. `getGameDetails` and `getMultipleGameDetails` share a `Map<gamePk, { data, timestamp }>`. HTTP responses set `Cache-Control: public, max-age=1` (or `max-age=5` for cache hits).

### mlbStatsApi.js

**File:** `netlify/functions/utils/mlbStatsApi.js`

Raw API wrappers:

| Function | MLB API Endpoint | Notes |
|---|---|---|
| `getTodaysGames(options)` | `GET /api/v1/schedule` | Hydrates: team, linescore, game content, probablePitcher, flags, weather, broadcasts |
| `getGameDetails(gamePk)` | `GET /api/v1.1/game/{gamePk}/feed/live` | Full live feed |
| `getGameLinescore(gamePk)` | `GET /api/v1.1/game/{gamePk}/linescore` | Not currently used by endpoints |
| `getGameBoxscore(gamePk)` | `GET /api/v1.1/game/{gamePk}/boxscore` | Not currently used by endpoints |

### transformGameState Output Shape

`transformGameState(gameData)` converts raw MLB live feed data into:

```js
{
  gameId: number,                // data.game.pk
  status: string,               // 'Preview' | 'Live' | 'Final'
  detailedState: string,        // e.g. 'In Progress', 'Game Over'
  homeTeam: { id, name, abbreviation },
  awayTeam: { id, name, abbreviation },
  venue: string,
  inning: number,               // 0 if not started
  isTopInning: boolean,
  inningState: string,          // 'Top' | 'Mid' | 'Middle' | 'Bottom' | 'End'
  isBetweenInnings: boolean,    // true during Mid/Middle/End states
  balls: number,                // 0 when between innings
  strikes: number,              // 0 when between innings
  outs: number,                 // 0 when between innings
  runners: [boolean, boolean, boolean],  // [first, second, third] — cleared between innings
  homeScore: number,
  awayScore: number,
  currentPitcher: { id, fullName, stats: { pitching } } | null,
  currentBatter: { id, fullName, stats: { batting } } | null,
  lastUpdate: string,           // ISO timestamp
}
```

Runner detection priority: linescore offense data first, then `currentPlay.runners` movement as fallback.

### Client API Layer

**File:** `src/services/api.js`

Axios client with base URL `/api` and 10s timeout. Three functions mirror the serverless endpoints:

- `getTodaysGames(date?)` → calls `/getGames`, returns `games` array. Automatically sends client timezone offset.
- `getGameState(gamePk)` → calls `/getGameDetails`, returns `gameState` object.
- `getMultipleGameStates(gamePkArray)` → calls `/getMultipleGameDetails`, returns `{ [gamePk]: gameState }`. Swallows errors and returns `{}` on failure.

---

## 2. Data Polling

**File:** `src/hooks/useGamePolling.js`

React hook that drives the fetch → normalize → store cycle.

### Polling Flow

```
1. fetchAndUpdate()
   ├─ getTodaysGames(date)           → raw games array
   ├─ Filter for Live games          → liveGameIds
   ├─ getMultipleGameStates(liveGameIds) → detailed states
   └─ ingestApiResponse(games, gameStates) → updates store
2. setInterval(fetchAndUpdate, interval)
```

### Configuration

```js
useGamePolling({
  date: string,      // YYYY-MM-DD, defaults to today
  interval: number,  // ms, default 5000
  enabled: boolean,  // default true
})
```

**Returns:** `{ refresh, startPolling, stopPolling, isPolling }`

### Safety

- **Overlap prevention:** `isPollingRef` flag prevents concurrent fetches.
- **Unmount safety:** `isMountedRef` checked before every store update. Interval cleared on unmount.
- **Interval changes:** Automatically restarts polling when `interval` prop changes.

---

## 3. State Management

**File:** `src/store/gameStore.js`

### Store Shape

```js
{
  games: Map<string, NormalizedGameState>,  // gameId → normalized state
  rawGames: Array,                          // raw API response for UI components
  activeGameId: string | null,              // currently selected game
  lastChange: {                             // most recent state diff (active game only)
    gameId: string,
    fields: string[],                       // changed field names
    prev: Object,                           // previous values
    next: Object,                           // new values
    timestamp: number,                      // Date.now()
  } | null,
}
```

### Actions

| Action | Signature | Purpose |
|---|---|---|
| `ingestApiResponse` | `(games: Array, gameStates?: Object)` | Normalize API data, detect changes for active game, update store |
| `setActiveGame` | `(gameId: string \| null)` | Set active game (coerces to string) |
| `updateGameState` | `(gameId: string, partialState: Object)` | Merge partial state, validate, detect changes. Used by playground. |
| `simulateEvent` | `(gameId: string, eventType: string)` | Run event handler, validate, detect changes. Used by playground. |
| `createPlaygroundGame` | `(gameId?: string)` | Create a test game with default state, Home/Away teams, and 'Live' status. Sets it as active. |

### Event Simulation Handlers

Six event types, each returning a new game state object:

| Event | Behavior |
|---|---|
| `strikeout` | Reset count, increment outs. If 3 outs → advance inning. |
| `walk` | Reset count, advance runners with force logic. Bases loaded → run scores. |
| `hit` | Reset count, batter to first, all runners advance one base. Runners scoring from third add to score. |
| `homeRun` | Reset count, clear bases, score = 1 + runners on base. |
| `out` | Reset count, increment outs. If 3 outs → advance inning. |
| `runScored` | Clear runner from third, increment batting team's score. |

`advanceInning`: Top → Bottom (same inning), Bottom → Top of next inning. Clears runners.

### Selectors

- `getGame(gameId)` → single game or null
- `getActiveGame()` → active game or null
- `getAllGames()` → array of all games
- `getRawGames()` → raw API array

---

## 4. Normalization

**File:** `src/utils/normalizeGame.js`

### createDefaultGameState()

```js
{
  gameId: null,
  status: 'Preview',          // 'Preview' | 'Live' | 'Final'
  inning: 1,
  isTopInning: true,
  inningState: 'Top',         // 'Top' | 'Mid' | 'Bottom' | 'End'
  balls: 0,
  strikes: 0,
  outs: 0,
  homeScore: 0,
  awayScore: 0,
  homeTeam: { id: null, name: '', abbreviation: '' },
  awayTeam: { id: null, name: '', abbreviation: '' },
  runners: [false, false, false],   // [first, second, third]
  gameDate: null,
  gameTime: null,
}
```

### normalizeGame(game, gameState?)

Priority order for field values:

1. **gameState** (from `/getGameDetails` via `transformGameState`) — highest priority
2. **game.linescore** (hydrated schedule data) — fallback for live games
3. **game.teams** (basic schedule data) — team info and score fallback

### normalizeGames(games, gameStates?)

Takes the raw games array and optional `{ [gamePk]: gameState }` map. Returns `Map<string, NormalizedGameState>`.

### validateGameState(state)

Clamps values to valid ranges:

| Field | Range |
|---|---|
| `balls` | 0–3 |
| `strikes` | 0–2 |
| `outs` | 0–2 |
| `inning` | 1–99 |
| `homeScore` | 0+ |
| `awayScore` | 0+ |
| `runners` | Array of 3 booleans |

### detectChanges(prevState, nextState)

Compares these fields: `inning`, `isTopInning`, `inningState`, `balls`, `strikes`, `outs`, `homeScore`, `awayScore`, `runners`.

Returns `null` if no changes, otherwise:

```js
{
  gameId: string,
  fields: string[],     // names of changed fields
  prev: Object,         // { [field]: oldValue }
  next: Object,         // { [field]: newValue }
  timestamp: number,    // Date.now()
}
```

---

## 5. React UI Layer

### Component Tree

```
App (ThemeProvider, Router)
├── MainLayout (/:gameId?)
│   ├── Header
│   └── GameList
│       └── GameCard (per game)
│           ├── GameStatus
│           ├── TeamRow (×2)
│           ├── CountIndicator (balls, strikes, outs)
│           └── BaseballDiamond
└── Playground (/playground)
    ├── StateControls
    ├── EventSimulator
    ├── Presets
    ├── GameStatePreview
    └── Debug panel (JSON)
```

### Routing (src/App.js)

| Route | Component |
|---|---|
| `/:gameId?` | MainLayout |
| `/playground` | Playground |
| `/games` | Redirect to `/` |

**Theme:** MUI dark theme with baseball field colors — primary: grass green (#2d5a27), secondary: dirt brown (#8b4513), background: dark green (#1a2f16). Fonts: Space Mono (headings), Inter (body).

### MainLayout

**File:** `src/components/MainLayout.js`

- Reads `gameId` from URL params, syncs with `setActiveGame` in store.
- Runs `useGamePolling({ interval: 5000 })`.
- Only allows selecting Live games.
- Auto-deselects games that finish or become non-Live.

### GameList

**File:** `src/pages/GameList.js`

Filters `rawGames` into three sections with visual dividers:
1. **Live** — clickable, triggers game selection
2. **Final** — display only
3. **Preview** — display only

Shows loading spinner during initial fetch, error alerts on failure, "No games scheduled" when empty.

### GameCard

**File:** `src/components/GameCard.js`

Sub-components:
- **GameStatus** — Pre-game: shows game time. Live: shows inning with colored MUI Chip. Final: "Final" label.
- **TeamRow** — Team name + score.
- **CountIndicator** — Visual dots: 4 for balls, 3 for strikes, 3 for outs. Filled dots for current count.
- **BaseballDiamond** — Rotated square diamond showing runner positions on first/second/third.

Live games have hover effects and are clickable. Pre-game and Final games are display-only.

---

## 6. Playground

**File:** `src/pages/Playground.js`

Two-column testing environment for game state and audio without live API data.

### Left Column

- **StateControls** — Sliders/inputs for inning, balls, strikes, outs, runners, homeScore, awayScore. Calls `updateGameState(gameId, partialState)`.
- **EventSimulator** — Buttons for each event type (strikeout, walk, hit, homeRun, out, runScored). Calls `simulateEvent(gameId, eventType)`.
- **Presets** — Quick-load common scenarios (bases loaded, late-and-close, blowout, etc.).

### Right Column

- **GameStatePreview** — Visual display with inning, scores, count indicators, and diamond.
- **Debug panel** — Shows `lastChange` object and raw game state as JSON.

On mount, calls `createPlaygroundGame('playground')` to initialize a test game and sets it as active.

---

## 7. Audio Engine Overview

**File:** `src/audio/engine.js`

### Public API (src/audio/index.js)

| Function | Purpose |
|---|---|
| `connect(store)` | Initialize engine, subscribe to Zustand store, start playback |
| `disconnect()` | Stop playback, unsubscribe, close AudioContext |
| `pause()` | Suspend AudioContext |
| `resume()` | Resume AudioContext |
| `setMasterVolume(0-1)` | Set output volume |
| `getMasterVolume()` | Get current volume |
| `isConnected()` | Check if engine is playing |

Also re-exports `getEngine()`, `interpret()`, and harmony utilities.

### AudioEngine Lifecycle

```
initialize()
  ├─ Create AudioContext (stereo)
  ├─ Create WebRenderer
  ├─ Connect renderer → destination
  └─ Reset voice manager

subscribeToStore(store)
  └─ Subscribe to: state.games.get(state.activeGameId)
     └─ onGameStateChange → interpret() → update voice manager

start()
  ├─ initialize() (if needed)
  ├─ Resume AudioContext (if suspended)
  └─ Start render loop

Render loop (50ms interval):
  ├─ checkAmbientEvents()
  │   ├─ Evaluate Euclidean density at current time
  │   ├─ Maybe trigger bell (probability-based)
  │   ├─ Maybe trigger ghost melody note
  │   └─ Cleanup decayed voices
  └─ render()
      ├─ Render 6 layers → sum L/R channels
      ├─ Apply stereo reverb
      ├─ Apply soft clip saturation
      ├─ Apply limiter
      ├─ Apply master volume
      └─ renderer.render(outL, outR)
```

### Render Pipeline

```
Layer renders:
  drone (mono)──────────────┐
  pad (stereo)──────────────┤
  bells (stereo)────────────┤
  air (stereo)──────────────┼──▶ el.add(all L) ──▶ stereoReverb ──▶ softClip ──▶ limiter ──▶ masterVol ──▶ out L
  shimmer (stereo, fed pad)─┤    el.add(all R) ──▶ stereoReverb ──▶ softClip ──▶ limiter ──▶ masterVol ──▶ out R
  ghostMelody (stereo)──────┘
```

The engine is a **singleton** via `getEngine()`.

---

## 8. Interpreter

**File:** `src/audio/interpreter.js`

### Tension Calculation

`calculateTension(gameState)` returns a value in **0–1**:

| Factor | Contribution |
|---|---|
| 0 outs | +0.0 |
| 1 out | +0.3 |
| 2 outs | +0.7 |
| Runner on 2nd | +0.2 |
| Runner on 3rd | +0.2 |
| Per strike | +0.1 |
| Per ball | +0.05 |
| Inning ≥ 7 | +0.15 |
| Score diff ≤ 2 | +0.2 |

Result clamped to [0, 1]. Maximum theoretical tension: ~1.0 (2 outs, runners on 2nd and 3rd, full count, late inning, close game).

### interpret() Output Shape

```js
{
  // Global
  tonalCenter: string,          // e.g. 'C', 'G', 'D'
  mode: string,                 // 'major' | 'minor' | 'mixolydian'
  scale: string[],              // note names across octaves 3-5
  tension: number,              // 0-1
  isBreathing: boolean,         // true during Mid/End inning states
  ambientActivity: number,      // 0-1, rises over 30s of inactivity
  timeSinceLastChange: number,  // seconds

  // Events
  events: Array,                // detected game events
  eventResponses: Array,        // musical responses to events

  // Per-layer parameters
  drone: {
    frequency: number,          // Hz, based on tonalCenter + octave 2
    amplitude: number,          // 0.6 (breathing) or 0.8 (active)
    filterCutoff: number,       // 200 + (tension × 300) → 200-500 Hz
  },
  pad: {
    voicing: string[],          // note names (e.g. ['C3', 'E3', 'G3', 'B3'])
    frequencies: number[],      // Hz values for each voice
    filterCutoff: number,       // 400 + (tension × 2000) → 400-2400 Hz
    amplitude: number,          // 0.4 (breathing) or 0.7 (active)
  },
  bells: {
    scale: string[],            // available notes
    densityProbability: number, // 0.1 + (tension × 0.3) → 0.1-0.4
    register: string,           // 'mid' or 'high' (when tension > 0.6)
    amplitude: number,          // 0.5
  },
  air: {
    amount: number,             // 0.6 (breathing) or 0.3 (active)
    filterCenter: number,       // 4000 + (tension × 4000) → 4000-8000 Hz
    amplitude: number,          // 0.3
  },
  shimmer: {
    intensity: number,          // 0.3 (low tension) or 0.5 + (tension × 0.3) (high)
    amplitude: number,          // 0.3 (breathing) or 0.5 (active)
  },
  ghostMelody: {
    scale: string[],            // available notes
    noteProbability: number,    // 0.05 + (ambientActivity × 0.15) → 0.05-0.2
    scalePosition: number,      // inning % 7
    amplitude: number,          // 0.4
  },

  // Master effects
  master: {
    reverbDecay: number,        // 6.0 (breathing) or 4.5 - (tension × 1.5) → 3.0-4.5
    stereoWidth: number,        // 0.8 (high tension) or 1.0 (normal)
    saturation: number,         // 0.1 + (tension × 0.1) → 0.1-0.2
  },
}
```

### Mode Selection (harmony.js)

| Score Differential | Mode |
|---|---|
| Home leading | major |
| Away leading | minor |
| Tied | mixolydian |

### Tonal Center Rotation (harmony.js)

Cycles through a 9-note sequence based on inning number:

```
Inning:  1   2   3   4   5   6   7   8   9   10  11  ...
Root:    C   G   D   A   E   F   Bb  Eb  Ab  C   G   ...
```

Progression follows circle-of-fifths ascending (C→G→D→A→E) then resets through flat keys (F→Bb→Eb→Ab).

### Lead Change Modulation

On lead change events, the tonal center shifts by ±5 semitones (a fourth/tritone) based on which team took the lead, creating a harmonic surprise.

---

## 9. Music Theory Modules

### harmony.js

**File:** `src/audio/harmony.js`

| Function | Purpose |
|---|---|
| `noteToFrequency(note)` | Convert note name (e.g. 'C4') to Hz using constants lookup |
| `semitoneToNote(root, semitones, octave)` | Calculate note name from semitone offset |
| `buildScale(root, mode, lowOctave, highOctave)` | Generate all scale notes across octave range |
| `buildChord(root, chordType, octave)` | Build chord voicing from CHORDS intervals |
| `getModeFromScore(homeScore, awayScore)` | Map score differential → major/minor/mixolydian |
| `getTonalCenter(inning)` | Rotate through 9 roots based on inning |
| `getPadVoicing(root, mode, tension)` | Generate chord voicing — triads at low tension, 7ths/add9 at high |
| `getMelodyNote(scale, position, octaveOffset)` | Select note from scale with octave shift |
| `getLeadChangeRoot(currentRoot, newLeader)` | Shift root ±5 semitones for harmonic modulation |

### events.js

**File:** `src/audio/events.js`

**Event Detection** — `detectEvents(prevState, currentState)` compares two game states and returns an array of event objects:

| Event Type | Detection Logic |
|---|---|
| `STRIKE` | strikes increased |
| `BALL` | balls increased |
| `OUT` | outs increased |
| `STRIKEOUT` | outs increased AND strikes were at 2 |
| `WALK` | balls reset to 0 AND runners changed (walked) |
| `HIT` | runners changed without walk conditions |
| `RUN_SCORED` | homeScore or awayScore increased |
| `HOME_RUN` | score increased AND bases cleared |
| `LEAD_CHANGE` | leading team changed between states |
| `INNING_END` | inningState changed to Mid or End |
| `INNING_START` | inning number increased OR inningState changed to Top/Bottom from Mid/End |

**Event Responses** — `getEventResponse(event)` maps each event type to musical parameter adjustments (filter sweeps, harmony changes, shimmer boosts, reverb decay shifts).

### euclidean.js

**File:** `src/audio/euclidean.js`

Generates probability curves for ambient event timing using Bjorklund's algorithm.

| Function | Purpose |
|---|---|
| `bjorklund(pulses, steps)` | Euclidean rhythm algorithm → boolean array of length `steps` with `pulses` evenly distributed |
| `patternToDensityCurve(pattern, cycleDuration)` | Convert boolean pattern to smooth 0–1 density function using cosine interpolation |
| `combineDensityCurves()` | Average multiple Euclidean patterns (from `EUCLIDEAN_PATTERNS` config) into a single density function |
| `shouldFireAmbientEvent(probability, density, timeSinceChange, inningState)` | Determine if an ambient event fires based on: base probability × Euclidean density × silence factor × breathing multiplier |

**Configured patterns** (from constants.js):

| Pulses | Steps | Cycle Duration (s) |
|---|---|---|
| 3 | 8 | 45 |
| 5 | 13 | 73 |
| 2 | 5 | 31 |

The overlapping irrational-ratio cycles create non-repeating probability variations.

### voices.js

**File:** `src/audio/voices.js`

| Class/Function | Purpose |
|---|---|
| `LayerVoices` | Per-layer voice tracking: stores active notes with timestamps, handles max voice limits |
| `VoiceManager` | Global voice pool across all 6 layers. Singleton. |
| `resetVoiceManager()` | Create fresh VoiceManager instance |

**VoiceManager methods:**

| Method | Behavior |
|---|---|
| `triggerBell(note, velocity)` | Allocate bell voice, oldest-first stealing when at max (3) |
| `triggerGhostMelody(note, velocity)` | Set ghost melody note (1 voice max) |
| `releaseGhostMelody()` | Clear ghost melody voice |
| `setPadVoicing(frequencies)` | Update all pad voice frequencies |
| `setDroneFrequency(freq)` | Update drone pitch |
| `getVoiceState()` | Return `{ bells: [...], ghostMelody: [...], pad: [...], drone: {...} }` |
| `cleanupDecayedVoices()` | Remove bell notes older than 5 seconds |

**Voice counts per layer** (from constants.js):

| Layer | Max Voices |
|---|---|
| drone | 2 |
| pad | 4 |
| bells | 3 |
| air | 1 |
| shimmer | 2 |
| ghostMelody | 1 |

**Voice stealing priority** (lower = steal first): air (1), shimmer (2), bells (3), ghostMelody (4), pad (5), drone (6, never steal).

---

## 10. Synthesis Layers

All layers use Elementary Audio (`@elemaudio/core`) for declarative DSP. Each render function returns either a mono signal or `{ left, right }` for stereo.

### Drone (src/audio/layers/drone.js)

Foundation bass layer, always present.

```
Signal chain:
  sine(fundamental) × 0.50
+ sine(sub-octave)  × 0.35  ──▶ mix ──▶ lowpass(cutoff) ──▶ softClip(0.2 drive)
+ sine(fifth above) × 0.15
```

- **Frequency range:** 80–200 Hz
- **Attack/Release:** 4.0s / 6.0s
- **Pan:** mono center
- **Filter cutoff:** controlled by interpreter (200–500 Hz)

### Pad (src/audio/layers/pad.js)

Harmonic bed that responds to chord changes.

```
Signal chain (per voice):
  saw(freq × 0.997)
+ saw(freq × 1.000)  ──▶ mix ──▶ lowpass(cutoff, Q=2.0)
+ saw(freq × 1.003)

Stereo: ~2ms delay between L/R channels
```

- **Voices:** 4 (one per chord tone)
- **Detuning:** ±0.3% for chorus effect
- **Frequency range:** 150–800 Hz
- **Attack/Release:** 2.0s / 4.0s
- **Pan width:** 0.9

### Bells (src/audio/layers/bells.js)

FM synthesis bells, triggered probabilistically by Euclidean density.

```
Signal chain:
  FM synthesis: carrier × (1 + modIndex × sin(carrier × 2.4))
  modulation index: 3
  ──▶ amplitude envelope ──▶ stereo pan
```

- **Voices:** 3 max (oldest-first stealing)
- **Carrier:modulator ratio:** 1:2.4 (bell-like timbre)
- **Frequency range:** 400–4000 Hz
- **Attack/Release:** 0.01s / 3.0s
- **Pan positions:** [-0.7, -0.25, 0.25, 0.7]

### Air (src/audio/layers/air.js)

Filtered noise texture.

```
Signal chain:
  pink noise ──▶ bandpass(filterCenter, Q=0.5)

Stereo: independent channels, R frequency +5% offset
```

- **Voices:** 1
- **Filter range:** 2000–12000 Hz
- **Attack/Release:** 1.0s / 2.0s
- **Pan width:** 1.0 (full stereo)

### Shimmer (src/audio/layers/shimmer.js)

Octave-up ring modulation of the pad signal.

```
Signal chain:
  padSignal × sin(880 Hz) ──▶ highpass(800 Hz)
```

- **Voices:** 2
- **Ring mod frequency:** 880 Hz (A5)
- **Frequency range:** 1000–8000 Hz
- **Attack/Release:** 3.0s / 8.0s
- **Pan width:** 0.95
- **Intensity** responds to tension and exciting events

### Ghost Melody (src/audio/layers/ghostMelody.js)

Sparse melodic fragments, probability-driven.

```
Signal chain:
  sine(freq) with vibrato (4 Hz rate, 3 Hz depth)  × 0.70
+ FM component (freq × 2, modIndex 0.1)            × 0.30
  ──▶ lowpass(4000 Hz) ──▶ pan(0.2 off-center)
```

- **Voices:** 1
- **Frequency range:** 300–1200 Hz
- **Attack/Release:** 0.5s / 2.0s
- **Pan:** 0.2 (slightly right of center)
- **Auto-release:** voice released after 2 seconds

---

## 11. Effects Chain

### Per-Layer Effects

**filter.js** (`src/audio/effects/filter.js`):
- `lowpass(cutoff, Q, signal)` — Low-pass filter with resonance
- `highpass(cutoff, signal)` — High-pass filter
- `bandpass(center, Q, signal)` — Band-pass filter
- `bandlimit(lowCut, highCut, signal)` — Combined low-cut and high-cut

**eq.js** (`src/audio/effects/eq.js`):
- `peakEQ(freq, gain, Q, signal)` — Parametric EQ band using bandpass mixing
- `applyLayerEQ(layerName, signal)` — Apply per-layer EQ from constants. Includes band-limiting (lowCut/highCut) and mid-frequency adjustment.

Per-layer EQ settings (from constants.js):

| Layer | Low Cut | High Cut | Mid Freq | Mid Gain |
|---|---|---|---|---|
| drone | 0 Hz | 800 Hz | 400 Hz | -2 dB |
| pad | 100 Hz | 10 kHz | 3 kHz | +2 dB |
| bells | 300 Hz | 12 kHz | 5 kHz | +3 dB |
| air | 1.5 kHz | 20 kHz | 8 kHz | +2 dB |
| shimmer | 800 Hz | 20 kHz | 400 Hz | -6 dB |
| ghostMelody | 200 Hz | 6 kHz | 800 Hz | +1 dB |

### Master Effects

**reverb.js** (`src/audio/effects/reverb.js`):

Schroeder-style algorithmic reverb:
- **Pre-delay:** 30ms
- **6 parallel comb filters** with prime-number delays: 1557, 1617, 1491, 1422, 1277, 1356 samples
- **4 series all-pass filters** for diffusion: 225, 556, 441, 341 samples
- **Damping low-pass:** 2k–10k Hz range, controlled by damping parameter
- **Stereo variant:** slight L/R variation in decay and damping values

Default reverb settings: decay 4.5, damping 0.4, diffusion 0.9, modulation 0.2, mix 0.35.

**dynamics.js** (`src/audio/effects/dynamics.js`):
- `softClip(drive, signal)` — Tanh-based saturation, drive range 1–4×
- `limiter(thresholdDb, signal)` — Threshold-based clipping (master uses -1 dB)
- `compress(threshold, ratio, signal)` — Simplified compression via soft clipping

### Master Signal Chain

```
Sum of all layers (L/R)
  ──▶ stereoReverb(decay, mix=0.35, damping=0.4)
  ──▶ softClip(saturation)          // 0.1-0.2 drive from interpreter
  ──▶ limiter(-1 dB)
  ──▶ masterVolume (0-1)
  ──▶ WebRenderer output (stereo)
```

---

## 12. Constants Reference

**File:** `src/audio/constants.js`

### NOTE_FREQUENCIES

Lookup table of note names to Hz values (A4 = 440 Hz). Covers C2–B5 including sharps/flats (notated as Db, Eb, Gb, Ab, Bb).

### SCALES (semitone intervals from root)

| Scale | Intervals |
|---|---|
| major | 0, 2, 4, 5, 7, 9, 11 |
| minor | 0, 2, 3, 5, 7, 8, 10 |
| dorian | 0, 2, 3, 5, 7, 9, 10 |
| mixolydian | 0, 2, 4, 5, 7, 9, 10 |
| lydian | 0, 2, 4, 6, 7, 9, 11 |

### CHORDS (semitone intervals from root)

| Chord | Intervals |
|---|---|
| major | 0, 4, 7 |
| minor | 0, 3, 7 |
| major7 | 0, 4, 7, 11 |
| minor7 | 0, 3, 7, 10 |
| dom7 | 0, 4, 7, 10 |
| sus4 | 0, 5, 7 |
| add9 | 0, 4, 7, 14 |

### EUCLIDEAN_PATTERNS

Three overlapping Euclidean patterns with irrational cycle ratios:
- `{ pulses: 3, steps: 8, cycleDuration: 45s }`
- `{ pulses: 5, steps: 13, cycleDuration: 73s }`
- `{ pulses: 2, steps: 5, cycleDuration: 31s }`

### LAYERS

Per-layer configuration (voices, frequency ranges, envelope times, pan settings). See [Synthesis Layers](#10-synthesis-layers) for full details.

### REVERB

`{ preDelay: 0.03, decay: 4.5, damping: 0.4, diffusion: 0.9, modulation: 0.2, mix: 0.35 }`

### TIMING

| Key | Value | Purpose |
|---|---|---|
| `renderInterval` | 50 ms | Interval between ambient event checks |
| `silenceMaxSeconds` | 30 s | Time for silence factor to reach 1.0 |
| `breathingFactor` | 0.3 | Activity multiplier during Mid/End inning states |

### VOICE_PRIORITY

Steal order (lower = steal first): air (1), shimmer (2), bells (3), ghostMelody (4), pad (5), drone (6, never steal).
