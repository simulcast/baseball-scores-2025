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

Event-driven audio engine that plays sounds in response to game state changes. Subscribes to the Zustand store and diffs the active game object on each update.

**Public API (`src/audio/index.js`):**
- `connect(store)` - Initialize Tone.js, create SoundBank, subscribe to store
- `disconnect()` - Cleanup all synths and subscriptions
- `pause()` / `resume()` - Mute/unmute master gain (scoped, not global)
- `setMasterVolume(0-1)` - Gain control
- `isConnected()` - Check status

**Event flow:** Store update → `diffGameEvents(prev, next)` → `GameEvent[]` → `SoundBank.play*()`

**Sound events:** runScored (arpeggio), outRecorded (percussive hit), inningChange (chime), runnerAdvance (pitched blip), statusChange (swell/resolution), strike (high tick), ball (low tick)

**Audio connects on first game click** in MainLayout (satisfies browser AudioContext user-gesture requirement).

**Structure:**
```
src/audio/
├── index.js           # Public API (unchanged surface)
├── engine.js          # AudioEngine class (singleton, Tone.js)
├── diffGameEvents.js  # Pure function: (prev, next) → GameEvent[]
└── sounds.js          # SoundBank class: synth lifecycle + trigger methods
```

## Code Style

- Functional React components with hooks
- Import order: React, libraries, relative imports
- Material UI (MUI) for all UI components
- ES6+ features (destructuring, arrow functions, optional chaining)
