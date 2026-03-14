# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` - Start Next.js dev server on :3000
- `npm run build` - Build production app
- `npm start` - Start production server
- `npm test` - Run tests (Jest)
- `npx jest --testPathPattern=path/to/test` - Run a specific test

## Architecture Overview

Baseball Scores displays live MLB games and (eventually) maps them to generative ambient music. Built with Next.js App Router, deployed on Vercel.

### Data Flow

```
MLB StatsAPI → Next.js API Route (1s cache) → useGamePolling → Zustand Store → React Components
                                                                      ↓
                                                              store.subscribe()
                                                                      ↓
                                                        diffGameEvents(prev, next)
                                                                      ↓
                                                          SoundBank → Tone.Gain → speakers
```

### Key Directories

- `app/` - Next.js App Router (layout, pages, API routes)
- `src/components/` - React UI (MainLayout, GameCard, GameList, Header)
- `src/store/` - Zustand store for game state management
- `src/utils/` - `normalizeGame.js` — converts MLB API responses to internal format
- `src/hooks/` - `useGamePolling` for data fetching
- `src/audio/` - Tone.js audio engine (event-driven sounds on game state changes)
- `src/services/` - API client (`fetchGames`)

### Routing (Next.js App Router)

- `app/page.js` — Home page, renders MainLayout
- `app/[gameId]/page.js` — Game page, renders MainLayout with gameId param
- `app/api/getGames/route.js` — API route proxying MLB StatsAPI
- `app/layout.js` — Root layout with MUI ThemeProvider

All pages use `'use client'` — the app is fully client-rendered.

### State Management (Zustand)

**Store shape (`src/store/gameStore.js`):**
- `games: Record<string, NormalizedGame>` - Plain object of normalized game data
- `activeGameId: string | null` - Currently selected game

**Key actions:**
- `ingestGames(rawGames)` - Normalize and store, with referential stability via shallow compare
- `setActiveGame(id)` - Select a game
- `getGame(id)` - Selector
- `getActiveGame()` - Selector

**Normalization (`src/utils/normalizeGame.js`):**
- Single function `normalizeGame(raw)` extracting from schedule+linescore hydration
- No separate validation or change detection — change detection is built into `ingestGames`

### Audio Architecture (Tone.js)

Generative ambient music engine that transforms live baseball games into unique compositions. Each game produces a distinct soundtrack driven by game state: harmonic key shifts by inning, musical mode reflects game tension, and per-team timbral identity means every matchup sounds different.

**Public API (`src/audio/index.js`):**
- `connect(store)` - Initialize Tone.js, create Composer, subscribe to store
- `disconnect()` - Cleanup all layers, effects, and subscriptions
- `pause()` / `resume()` - Suspend/resume all layers (CPU-safe, stops scheduling)
- `setMasterVolume(0-1)` - Gain control
- `isConnected()` - Check status

**Audio connects on first game click** in MainLayout (satisfies browser AudioContext user-gesture requirement).

**Signal flow:**
```
Zustand Store → engine.js (subscribe, diff) → Composer.update(game, events)
                                                    │
                    ┌───────────┬───────────┬───────┴────────┐
                    ▼           ▼           ▼                ▼
               PadLayer    PulseManager  EventVoice     BreathLayer
            (chord tones)  (scale tones) (chord+scale)  (brightness)
                    │           │           │                │
                    └─────┬─────┴─────┬─────┘                │
                          ▼           ▼                      ▼
                     effectsBus (Reverb + Compressor + PingPongDelay)
                               │
                          masterGain → destination
```

**Data flow (game state → music):**
```
game state → tension.js → tension float (0-1)
game state → teamPalette.js → palette { rootOffset, modeBias, padColor, pulseColor }
game + tension + palette → harmonyEngine.js → HarmonyState { root, mode, chordTones, scaleTones }
```

**Four musical layers:**

1. **PadLayer** — Continuous harmonic bed (Eno-style). PolySynth(Synth) with Chorus, 3 voices voice-leading between chords. Idle drift shifts voicing when no game events arrive for ~17s.

2. **PulsePool/PulseManager** — Each occupied base spawns a Tone.Loop melodic pattern on FMSynth bell voice. Loop lengths are prime (1st=5, 2nd=7, 3rd=11 steps) creating Reich-style phasing. Pools fade in/out as runners advance/score.

3. **EventVoice** — Harmony-aware one-shots: runScored (AMSynth arpeggio), outRecorded (descending FMSynth fifth), inningChange (sustained fifth on new root), strike (high bell), ball (low passing tone). Pans toward scoring/batting team.

4. **BreathLayer** — Filtered pink noise with slow LFO. Breathes more during silence, recedes during action. ~3% volume.

**Harmonic system (all pure functions in `src/audio/music/`):**
- Root moves by cycle of fourths each half-inning (C→F→Bb→Eb...), offset by team palette
- Mode from tension: Lydian (calm) → Mixolydian → Dorian → Aeolian (urgent)
- Tension composite: runners (30%) + score closeness (30%) + count (20%) + outs (20%)
- Team palette: deterministic hash of team IDs → root offset, mode bias, synth timbre parameters
- Voice leading minimizes pitch movement when chords change

**Event types** (from `diffGameEvents`): gameSelected, statusChange, runScored, inningChange, outRecorded, strike, ball, runnerAdvance

**Structure:**
```
src/audio/
├── index.js                      # Public API (unchanged surface)
├── engine.js                     # AudioEngine singleton, store subscription
├── diffGameEvents.js             # Pure: (prev, next) → GameEvent[]
├── music/                        # Pure functions (zero Tone.js dependency)
│   ├── scales.js                 # Scale/chord defs, MIDI utilities
│   ├── tension.js                # Game state → tension/brightness floats
│   ├── harmonyEngine.js          # Game + palette → HarmonyState
│   ├── voiceLeading.js           # Smooth voice transitions
│   └── teamPalette.js            # Team ID → musical fingerprint
├── composer/
│   ├── index.js                  # Composer: orchestrates all layers
│   ├── effects.js                # Shared Reverb, Compressor, Delay
│   └── layers/
│       ├── PadLayer.js           # Continuous harmonic bed + idle drift
│       ├── PulsePool.js          # Single Tone.Loop melodic pattern
│       ├── PulseManager.js       # Manages 3 PulsePool instances
│       ├── EventVoice.js         # Harmony-aware one-shot gestures
│       └── BreathLayer.js        # Filtered noise atmosphere
└── testHelpers.js                # Shared test utilities
```

## Code Style

- Functional React components with hooks
- Import order: React, libraries, relative imports
- Material UI (MUI) for all UI components
- ES6+ features (destructuring, arrow functions, optional chaining)
