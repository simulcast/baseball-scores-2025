# Implementation Plan: State Management Refactor + Playground

**Design:** `2026-01-12-state-management-refactor-design.md`
**Branch:** Create from `elementary-rewrite`

## Phase 1: Setup & Dependencies

### 1.1 Install Zustand
```bash
npm install zustand
```

### 1.2 Create directory structure
```
src/store/           # New
src/components/playground/  # New
src/pages/Playground.js     # New
src/utils/normalizeGame.js  # New
src/audio/index.js          # Stub
```

## Phase 2: Build the Store (before removing anything)

### 2.1 Create `src/utils/normalizeGame.js`
- Function `normalizeGame(rawApiResponse)` → normalized shape
- Handle all MLB API quirks in one place
- Export `normalizeGames(rawApiResponse)` for batch

### 2.2 Create `src/store/gameStore.js`
- Zustand store with state:
  - `games`: Map of gameId → normalized state
  - `activeGameId`: string | null
  - `lastChange`: { gameId, fields, prev, next } | null
- Actions:
  - `ingestApiResponse(rawData)` - normalize, diff, validate, update
  - `setActiveGame(gameId)`
  - `updateGameState(gameId, partialState)` - for playground
  - `simulateEvent(gameId, eventType)` - for playground
  - `getGame(gameId)` - selector helper
  - `getActiveGame()` - selector helper
- Validation logic inline (balls 0-3, strikes 0-2, outs 0-2, etc.)
- Diff detection: compare previous vs incoming, populate `lastChange`

### 2.3 Create polling hook `src/hooks/useGamePolling.js`
- Single hook that fetches from API on interval
- Calls `store.ingestApiResponse(data)`
- Configurable interval (default 5000ms)
- Cleanup on unmount

### 2.4 Test store in isolation
- Verify normalization works with sample API responses
- Verify diff detection fires correctly
- Verify validation rejects bad state

## Phase 3: Build Playground (parallel track)

### 3.1 Create `src/pages/Playground.js`
- Layout: controls on left, preview on right
- Import store, use for state
- Create a "playground" game entry in store on mount

### 3.2 Create `src/components/playground/StateControls.js`
- Inning slider (1-12)
- Inning state buttons (Top/Mid/Bottom/End)
- Balls/Strikes/Outs as clickable indicators
- Runners as clickable diamond
- Score inputs (home/away)
- Calls `store.updateGameState()` on change

### 3.3 Create `src/components/playground/EventSimulator.js`
- Buttons: Strikeout, Walk, Hit, Home Run, Out, Run Scored
- Each calls `store.simulateEvent(gameId, eventType)`
- Implement event logic in store:
  - Strikeout: strikes=0, outs++, new count
  - Walk: balls=0, advance runners appropriately
  - Hit: reset count, runner logic (simple: batter to first, advance others)
  - Home Run: clear bases, add runs (1 + runners on base)
  - Out: outs++, reset count if outs < 3
  - Run Scored: increment score, clear runner from third

### 3.4 Create `src/components/playground/Presets.js`
- Buttons that load full state snapshots
- Presets:
  - "Bases Loaded Drama": inning 9, bottom, 2 outs, full count, bases loaded, tie game
  - "Perfect Game 9th": inning 9, top, 2 outs, 0-0, no runners, no hits implied
  - "Tie Game Extras": inning 11, bottom, 1 out, runner on second, tie
  - "Blowout": inning 7, top, 10-2, bases empty

### 3.5 Add route
- In `App.js` or router config: `/playground` → `Playground.js`

### 3.6 Add debug panel to Playground
- Show raw `JSON.stringify(gameState, null, 2)`
- Show `lastChange` object
- Show "Audio Engine: Not connected" placeholder

## Phase 4: Migrate Components to New Store

### 4.1 Update `src/components/MainLayout.js`
- Remove: `useBaseballAudio`, audio context imports, audio-related state
- Add: `useGamePolling()` hook to start polling
- Add: `useGameStore` for active game state
- Keep: Layout structure, game selection logic

### 4.2 Update `src/components/GameCard.js`
- Remove: Any audio-related props or callbacks
- Change: Get game state from store via props (parent passes) or selector
- Keep: All visual rendering

### 4.3 Update `src/pages/GameList.js`
- Remove: Test mode toggle and TestGameCard import
- Keep: Grid layout, game cards

### 4.4 Update `src/components/Header.js`
- Remove: Audio controls or replace with placeholder text
- Keep: Title, navigation

### 4.5 Update `src/App.js`
- Remove: AudioContext provider wrapper
- Add: Playground route
- Keep: Router setup

## Phase 5: Remove Old Code

### 5.1 Delete audio directory
```bash
rm -rf src/audio/
```

### 5.2 Delete old context
```bash
rm src/contexts/AudioContextExtended.js
```

### 5.3 Delete old hooks
```bash
rm src/hooks/useBaseballAudio.js
rm src/hooks/useGameData.js  # Replaced by useGamePolling + store
```

### 5.4 Delete TestGameCard
```bash
rm src/components/TestGameCard.js
```

### 5.5 Clean up imports
- Search for any remaining imports from deleted files
- Fix or remove

## Phase 6: Create Audio Stub

### 6.1 Create `src/audio/index.js`
```javascript
/**
 * Audio Engine Stub
 *
 * This will be implemented in a separate ticket.
 * The audio engine should subscribe to the game store:
 *
 * import { useGameStore } from '../store/gameStore';
 *
 * const unsubscribe = useGameStore.subscribe(
 *   state => state.games.get(activeGameId),
 *   (gameState, prevGameState) => {
 *     // React to game state changes
 *   }
 * );
 */

export function connectAudioEngine(store) {
  console.log('[Audio] Engine not yet implemented');
  return () => {}; // cleanup
}

export function disconnectAudioEngine() {
  console.log('[Audio] Engine not yet implemented');
}
```

## Phase 7: Verify & Clean Up

### 7.1 Manual testing
- App loads without errors
- Games display correctly
- Clicking game selects it
- Playground loads and controls work
- Event simulation updates state correctly
- Presets load correct states

### 7.2 Check for console errors
- No missing imports
- No undefined references
- No audio-related errors

### 7.3 Run build
```bash
npm run build
```
- Verify no build errors

### 7.4 Update CLAUDE.md
- Remove references to old audio architecture
- Add Zustand store documentation
- Add playground documentation

## Checklist

- [ ] Zustand installed
- [ ] `normalizeGame.js` created and tested
- [ ] `gameStore.js` created with all actions
- [ ] `useGamePolling.js` hook created
- [ ] Playground page created
- [ ] StateControls component working
- [ ] EventSimulator component working
- [ ] Presets component working
- [ ] Playground route added
- [ ] MainLayout migrated to new store
- [ ] GameCard cleaned of audio code
- [ ] GameList cleaned of test mode
- [ ] Header cleaned of audio controls
- [ ] App.js cleaned of audio context
- [ ] `src/audio/` deleted (except stub)
- [ ] `AudioContextExtended.js` deleted
- [ ] `useBaseballAudio.js` deleted
- [ ] `useGameData.js` deleted
- [ ] `TestGameCard.js` deleted
- [ ] Audio stub created
- [ ] Build passes
- [ ] Manual testing complete
- [ ] CLAUDE.md updated
