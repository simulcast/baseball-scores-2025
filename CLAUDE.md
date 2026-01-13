# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` - Start React development server on :3000
- `npm run build` - Build production app
- `npm run test` - Run tests
- `npm run test -- --testPathPattern=path/to/test` - Run a specific test
- `npm run dev` - Run Netlify dev environment (:8888 frontend, functions at /.netlify/functions/)

## Architecture Overview

Baseball Scores transforms live MLB games into generative ambient music. The app polls MLB StatsAPI for game state and maps it to musical parameters.

### Data Flow

```
MLB StatsAPI → Netlify Functions (1s cache) → useGamePolling → Zustand Store → React Components
                                                                    ↓
                                                              Audio Engine (stub)
```

### Key Directories

- `src/components/` - React UI (MainLayout orchestrates everything, GameCard displays individual games)
- `src/store/` - Zustand store for game state management
- `src/utils/` - Normalization utilities for MLB API data
- `src/hooks/` - `useGamePolling` for data fetching
- `src/pages/` - Page components including Playground
- `src/audio/` - Audio engine (currently a stub, Elementary Audio integration planned)
- `netlify/functions/` - Serverless MLB API proxy with caching

### State Management (Zustand)

The app uses Zustand for centralized state management:

**Store shape (`src/store/gameStore.js`):**
- `games: Map<gameId, normalizedGameState>` - Normalized game data
- `rawGames: Array` - Raw API response for components needing original shape
- `activeGameId: string | null` - Currently selected game
- `lastChange: Object | null` - Detected state changes for audio engine

**Key actions:**
- `ingestApiResponse(games, gameStates)` - Normalize and store API data
- `setActiveGame(gameId)` - Select a game
- `updateGameState(gameId, partialState)` - Direct state updates (playground)
- `simulateEvent(gameId, eventType)` - Simulate game events (playground)
- `createPlaygroundGame(gameId)` - Create test game for playground

**Normalization (`src/utils/normalizeGame.js`):**
- Converts MLB API responses to consistent internal format
- Validates and clamps game state values
- Detects changes between states for audio triggering

### Playground

The playground (`/playground`) provides a testing environment for game state and audio:

**Components:**
- `StateControls` - Adjust inning, count, outs, runners, score
- `EventSimulator` - Trigger events (strikeout, walk, hit, home run, etc.)
- `Presets` - Quick-load common game scenarios

**Usage:**
- Visit `/playground` to access
- Manipulate game state without needing live API data
- Debug panel shows state changes and raw game state

### Audio Architecture (In Progress)

**Current state:** Audio engine is stubbed out (`src/audio/index.js`)

**Planned integration:**
- Audio engine subscribes to Zustand store changes
- `lastChange` field provides diff for triggering sounds
- Elementary Audio will replace previous Tone.js implementation

## Code Style

- Functional React components with hooks
- Import order: React, libraries, relative imports
- Material UI (MUI) for all UI components
- JSDoc comments for component props
- ES6+ features (destructuring, arrow functions, optional chaining)

## Active Development

Branch `elementary-rewrite` has completed the state management refactor:
- Migrated from custom hooks to Zustand store
- Added playground for testing
- Removed old Tone.js audio code (bundle reduced by ~100KB)
- Next: Implement Elementary Audio engine integration
