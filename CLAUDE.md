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
                                                              Audio Engine
                                                                    ↓
                                                          Interpreter → Layers → WebRenderer
```

### Key Directories

- `src/components/` - React UI (MainLayout orchestrates everything, GameCard displays individual games)
- `src/store/` - Zustand store for game state management
- `src/utils/` - Normalization utilities for MLB API data
- `src/hooks/` - `useGamePolling` for data fetching
- `src/pages/` - Page components including Playground
- `src/audio/` - Elementary Audio engine with synthesis layers and effects
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

### Audio Architecture (Elementary Audio)

The audio engine uses Elementary Audio for declarative DSP synthesis. It transforms game state into generative ambient music.

**Public API (`src/audio/index.js`):**
- `connect(store)` - Initialize engine and subscribe to Zustand store
- `disconnect()` - Cleanup engine and subscriptions
- `pause()` / `resume()` - Playback control
- `setMasterVolume(0-1)` - Volume control
- `isConnected()` - Check playback status

**Directory structure:**
```
src/audio/
├── index.js         # Public API
├── engine.js        # AudioEngine class (singleton)
├── interpreter.js   # Game state → musical parameters
├── harmony.js       # Scales, chords, tonality logic
├── euclidean.js     # Bjorklund's algorithm for density curves
├── events.js        # Game event detection
├── voices.js        # Voice allocation/stealing
├── constants.js     # All configuration values
├── layers/          # Synthesis layers
│   ├── drone.js     # Layered sine waves (fundamental + sub + fifth)
│   ├── pad.js       # Detuned saw waves
│   ├── bells.js     # FM synthesis bells
│   ├── air.js       # Filtered noise
│   ├── shimmer.js   # Ring modulation shimmer
│   └── ghostMelody.js # Sine + vibrato melody
└── effects/         # Audio effects
    ├── filter.js    # Lowpass, highpass, bandpass
    ├── eq.js        # Parametric EQ
    ├── dynamics.js  # Soft clip, limiter, compression
    └── reverb.js    # Schroeder-style reverb
```

**Game state to music mapping:**
- Score differential → Mode (major if home leading, minor if away, mixolydian if tied)
- Inning → Tonal center (cycles through I, IV, V, vi progression)
- Tension (outs, runners, count, inning, score diff) → Layer amplitudes and effects
- Euclidean density curves → Probability-based bell and melody triggers

**Synthesis layers (6 total):**
1. **Drone** - Sub-bass foundation, always present
2. **Pad** - Harmonic bed, responds to chord changes
3. **Bells** - FM bells, triggered by Euclidean probability
4. **Air** - Filtered noise texture
5. **Shimmer** - Octave-up ring modulation of pad
6. **Ghost Melody** - Sparse melodic fragments

## Code Style

- Functional React components with hooks
- Import order: React, libraries, relative imports
- Material UI (MUI) for all UI components
- JSDoc comments for component props
- ES6+ features (destructuring, arrow functions, optional chaining)

## Active Development

Branch `elementary-rewrite` has completed major refactoring:
- Migrated from custom hooks to Zustand store
- Added playground for testing
- Removed old Tone.js audio code (bundle reduced by ~100KB)
- Implemented Elementary Audio engine with 6 synthesis layers
- Next: Wire up audio engine to UI and test with live games
