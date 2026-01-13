import { create } from 'zustand';
import {
  normalizeGames,
  validateGameState,
  detectChanges,
  createDefaultGameState
} from '../utils/normalizeGame';

/**
 * Zustand store for game state management
 *
 * State shape:
 * - games: Map<gameId, normalizedGameState>
 * - activeGameId: string | null
 * - lastChange: { gameId, fields, prev, next, timestamp } | null
 * - rawGames: Array of raw game data from API (for GameCard rendering)
 */
export const useGameStore = create((set, get) => ({
  // State
  games: new Map(),
  rawGames: [],
  activeGameId: null,
  lastChange: null,

  // Actions

  /**
   * Ingest raw API response, normalize, diff, and update store
   * @param {Array} games Raw games array from /getGames endpoint
   * @param {Object} gameStates Map of gameId -> detailed state from /getGameDetails
   */
  ingestApiResponse: (games, gameStates = {}) => {
    const state = get();
    const previousGames = state.games;

    // Store raw games for components that need original shape
    const rawGames = games || [];

    // Normalize all games
    const normalizedGames = normalizeGames(rawGames, gameStates);

    // Detect changes for the active game (if any)
    let lastChange = null;
    if (state.activeGameId) {
      const prevGame = previousGames.get(state.activeGameId);
      const nextGame = normalizedGames.get(state.activeGameId);
      if (prevGame && nextGame) {
        lastChange = detectChanges(prevGame, nextGame);
      }
    }

    set({
      games: normalizedGames,
      rawGames,
      lastChange,
    });
  },

  /**
   * Set the active game by ID
   * @param {string|null} gameId Game ID to set as active
   */
  setActiveGame: (gameId) => {
    set({ activeGameId: gameId ? String(gameId) : null });
  },

  /**
   * Update a specific game's state (used by playground)
   * @param {string} gameId Game ID to update
   * @param {Object} partialState Partial state to merge
   */
  updateGameState: (gameId, partialState) => {
    const state = get();
    const games = new Map(state.games);
    const currentGame = games.get(gameId);

    if (!currentGame) return;

    // Merge and validate
    const updatedGame = validateGameState({
      ...currentGame,
      ...partialState,
    });

    // Detect changes
    const lastChange = detectChanges(currentGame, updatedGame);

    games.set(gameId, updatedGame);

    set({
      games,
      lastChange,
    });
  },

  /**
   * Simulate a game event (used by playground)
   * @param {string} gameId Game ID
   * @param {string} eventType Event type: 'strikeout', 'walk', 'hit', 'homeRun', 'out', 'runScored'
   */
  simulateEvent: (gameId, eventType) => {
    const state = get();
    const games = new Map(state.games);
    const currentGame = games.get(gameId);

    if (!currentGame) return;

    let updatedGame = { ...currentGame };

    switch (eventType) {
      case 'strikeout':
        updatedGame = handleStrikeout(updatedGame);
        break;
      case 'walk':
        updatedGame = handleWalk(updatedGame);
        break;
      case 'hit':
        updatedGame = handleHit(updatedGame);
        break;
      case 'homeRun':
        updatedGame = handleHomeRun(updatedGame);
        break;
      case 'out':
        updatedGame = handleOut(updatedGame);
        break;
      case 'runScored':
        updatedGame = handleRunScored(updatedGame);
        break;
      default:
        return;
    }

    // Validate and detect changes
    updatedGame = validateGameState(updatedGame);
    const lastChange = detectChanges(currentGame, updatedGame);

    games.set(gameId, updatedGame);

    set({
      games,
      lastChange,
    });
  },

  /**
   * Create a playground game entry
   * @param {string} gameId Game ID for the playground game
   * @returns {Object} The created game state
   */
  createPlaygroundGame: (gameId = 'playground') => {
    const state = get();
    const games = new Map(state.games);

    const playgroundGame = {
      ...createDefaultGameState(),
      gameId,
      status: 'Live',
      homeTeam: { id: 'home', name: 'Home Team', abbreviation: 'HOM' },
      awayTeam: { id: 'away', name: 'Away Team', abbreviation: 'AWY' },
    };

    games.set(gameId, playgroundGame);

    set({
      games,
      activeGameId: gameId,
    });

    return playgroundGame;
  },

  // Selectors

  /**
   * Get a specific game by ID
   * @param {string} gameId Game ID
   * @returns {Object|null} Game state or null
   */
  getGame: (gameId) => {
    return get().games.get(String(gameId)) || null;
  },

  /**
   * Get the active game
   * @returns {Object|null} Active game state or null
   */
  getActiveGame: () => {
    const state = get();
    if (!state.activeGameId) return null;
    return state.games.get(state.activeGameId) || null;
  },

  /**
   * Get all games as an array
   * @returns {Array} Array of game states
   */
  getAllGames: () => {
    return Array.from(get().games.values());
  },

  /**
   * Get raw games array (for components that need original API shape)
   * @returns {Array} Raw games from API
   */
  getRawGames: () => {
    return get().rawGames;
  },
}));

// Event handlers for simulation

function handleStrikeout(game) {
  // Strikeout: strikes reset, outs++
  const newOuts = game.outs + 1;

  if (newOuts >= 3) {
    return advanceInning({
      ...game,
      balls: 0,
      strikes: 0,
      outs: 0,
    });
  }

  return {
    ...game,
    balls: 0,
    strikes: 0,
    outs: newOuts,
  };
}

function handleWalk(game) {
  // Walk: balls reset, advance runners appropriately
  const runners = [...game.runners];

  // Push runners if forced
  if (runners[0]) {
    if (runners[1]) {
      if (runners[2]) {
        // Bases loaded walk - run scores
        return handleRunScored({
          ...game,
          balls: 0,
          strikes: 0,
          runners: [true, true, true],
        });
      }
      runners[2] = true;
    }
    runners[1] = true;
  }
  runners[0] = true;

  return {
    ...game,
    balls: 0,
    strikes: 0,
    runners,
  };
}

function handleHit(game) {
  // Simple hit: batter to first, advance all runners one base
  const runners = [...game.runners];
  let runsScored = 0;

  // Runner on third scores
  if (runners[2]) {
    runsScored++;
    runners[2] = false;
  }

  // Runner on second to third
  if (runners[1]) {
    runners[2] = true;
    runners[1] = false;
  }

  // Runner on first to second
  if (runners[0]) {
    runners[1] = true;
  }

  // Batter to first
  runners[0] = true;

  const updatedGame = {
    ...game,
    balls: 0,
    strikes: 0,
    runners,
  };

  // Add runs
  if (runsScored > 0) {
    if (game.isTopInning) {
      updatedGame.awayScore = game.awayScore + runsScored;
    } else {
      updatedGame.homeScore = game.homeScore + runsScored;
    }
  }

  return updatedGame;
}

function handleHomeRun(game) {
  // Home run: clear bases, add runs (1 + runners on base)
  const runnersOnBase = game.runners.filter(Boolean).length;
  const runsScored = 1 + runnersOnBase;

  const updatedGame = {
    ...game,
    balls: 0,
    strikes: 0,
    runners: [false, false, false],
  };

  if (game.isTopInning) {
    updatedGame.awayScore = game.awayScore + runsScored;
  } else {
    updatedGame.homeScore = game.homeScore + runsScored;
  }

  return updatedGame;
}

function handleOut(game) {
  // Generic out: outs++, reset count
  const newOuts = game.outs + 1;

  if (newOuts >= 3) {
    return advanceInning({
      ...game,
      balls: 0,
      strikes: 0,
      outs: 0,
    });
  }

  return {
    ...game,
    balls: 0,
    strikes: 0,
    outs: newOuts,
  };
}

function handleRunScored(game) {
  // Run scored: increment score, clear runner from third
  const runners = [...game.runners];
  runners[2] = false;

  const updatedGame = {
    ...game,
    runners,
  };

  if (game.isTopInning) {
    updatedGame.awayScore = game.awayScore + 1;
  } else {
    updatedGame.homeScore = game.homeScore + 1;
  }

  return updatedGame;
}

function advanceInning(game) {
  // Clear runners and advance to next half-inning
  if (game.isTopInning) {
    // Top to Bottom
    return {
      ...game,
      isTopInning: false,
      inningState: 'Bottom',
      runners: [false, false, false],
    };
  } else {
    // Bottom to next inning Top
    return {
      ...game,
      inning: game.inning + 1,
      isTopInning: true,
      inningState: 'Top',
      runners: [false, false, false],
    };
  }
}

export default useGameStore;
