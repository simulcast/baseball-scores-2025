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
                                                                Audio Engine
                                                             (hello-world sine tone)
```

### Key Directories

- `app/` - Next.js App Router (layout, pages, API routes)
- `src/components/` - React UI (MainLayout, GameCard, GameList, Header)
- `src/store/` - Zustand store for game state management
- `src/utils/` - `normalizeGame.js` — converts MLB API responses to internal format
- `src/hooks/` - `useGamePolling` for data fetching
- `src/audio/` - Elementary Audio engine (hello-world: sine tone when game selected)
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

### Audio Architecture (Elementary Audio)

Hello-world audio engine proving Elementary Audio works end-to-end with the store.

**Public API (`src/audio/index.js`):**
- `connect(store)` - Initialize AudioContext + WebRenderer, subscribe to store
- `disconnect()` - Cleanup
- `pause()` / `resume()` - Suspend/resume AudioContext
- `setMasterVolume(0-1)` - Gain control
- `isConnected()` - Check status

**Behavior:** Game selected → 440Hz sine tone. No game → silence. No interpreter, layers, or effects yet.

**Structure:**
```
src/audio/
├── index.js    # Public API
└── engine.js   # AudioEngine class (singleton)
```

## Code Style

- Functional React components with hooks
- Import order: React, libraries, relative imports
- Material UI (MUI) for all UI components
- ES6+ features (destructuring, arrow functions, optional chaining)
