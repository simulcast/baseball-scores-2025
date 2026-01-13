/**
 * Normalize MLB API game data into a consistent shape
 * Handles all MLB API quirks in one place
 */

/**
 * Create the default normalized game state
 * @returns {Object} Default game state
 */
export function createDefaultGameState() {
  return {
    gameId: null,
    status: 'Preview', // Preview, Live, Final
    inning: 1,
    isTopInning: true,
    inningState: 'Top', // Top, Mid, Bottom, End
    balls: 0,
    strikes: 0,
    outs: 0,
    homeScore: 0,
    awayScore: 0,
    homeTeam: { id: null, name: '', abbreviation: '' },
    awayTeam: { id: null, name: '', abbreviation: '' },
    runners: [false, false, false], // [first, second, third]
    gameDate: null,
    gameTime: null,
  };
}

/**
 * Normalize a single game from the MLB API response
 * @param {Object} game Raw game data from MLB API (from /getGames endpoint)
 * @param {Object} gameState Optional detailed game state (from /getGameDetails endpoint)
 * @returns {Object} Normalized game state
 */
export function normalizeGame(game, gameState = null) {
  const normalized = createDefaultGameState();

  if (!game) return normalized;

  // Basic game info
  normalized.gameId = String(game.gamePk);
  normalized.status = game.status?.abstractGameState || 'Preview';
  normalized.gameDate = game.gameDate;

  // Team info
  if (game.teams) {
    normalized.homeTeam = {
      id: game.teams.home?.team?.id,
      name: game.teams.home?.team?.name || '',
      abbreviation: game.teams.home?.team?.abbreviation || '',
    };
    normalized.awayTeam = {
      id: game.teams.away?.team?.id,
      name: game.teams.away?.team?.name || '',
      abbreviation: game.teams.away?.team?.abbreviation || '',
    };

    // Scores from basic game data (fallback)
    normalized.homeScore = game.teams.home?.score ?? 0;
    normalized.awayScore = game.teams.away?.score ?? 0;
  }

  // Linescore data from basic game (fallback for live games)
  if (game.linescore) {
    normalized.inning = game.linescore.currentInning || 1;
    normalized.inningState = game.linescore.inningState || 'Top';
    normalized.isTopInning = game.linescore.isTopInning ?? true;
    normalized.balls = game.linescore.balls ?? 0;
    normalized.strikes = game.linescore.strikes ?? 0;
    normalized.outs = game.linescore.outs ?? 0;

    // Runners from linescore offense
    if (game.linescore.offense) {
      normalized.runners = [
        game.linescore.offense.first?.id !== undefined,
        game.linescore.offense.second?.id !== undefined,
        game.linescore.offense.third?.id !== undefined,
      ];
    }
  }

  // Override with detailed game state if provided
  if (gameState) {
    normalized.inning = gameState.inning ?? normalized.inning;
    normalized.isTopInning = gameState.isTopInning ?? normalized.isTopInning;
    normalized.inningState = gameState.inningState ?? normalized.inningState;
    normalized.balls = gameState.balls ?? normalized.balls;
    normalized.strikes = gameState.strikes ?? normalized.strikes;
    normalized.outs = gameState.outs ?? normalized.outs;
    normalized.homeScore = gameState.homeScore ?? normalized.homeScore;
    normalized.awayScore = gameState.awayScore ?? normalized.awayScore;

    if (Array.isArray(gameState.runners)) {
      normalized.runners = gameState.runners;
    }
  }

  return normalized;
}

/**
 * Normalize an array of games from the MLB API response
 * @param {Array} games Array of raw game data from MLB API
 * @param {Object} gameStates Optional map of gameId -> detailed game state
 * @returns {Map} Map of gameId -> normalized game state
 */
export function normalizeGames(games, gameStates = {}) {
  const gamesMap = new Map();

  if (!Array.isArray(games)) return gamesMap;

  games.forEach(game => {
    const gameId = String(game.gamePk);
    const gameState = gameStates[gameId] || gameStates[game.gamePk] || null;
    gamesMap.set(gameId, normalizeGame(game, gameState));
  });

  return gamesMap;
}

/**
 * Validate a game state object
 * @param {Object} state Game state to validate
 * @returns {Object} Validated and clamped game state
 */
export function validateGameState(state) {
  return {
    ...state,
    balls: Math.max(0, Math.min(3, state.balls ?? 0)),
    strikes: Math.max(0, Math.min(2, state.strikes ?? 0)),
    outs: Math.max(0, Math.min(2, state.outs ?? 0)),
    inning: Math.max(1, Math.min(99, state.inning ?? 1)),
    homeScore: Math.max(0, state.homeScore ?? 0),
    awayScore: Math.max(0, state.awayScore ?? 0),
    runners: Array.isArray(state.runners)
      ? state.runners.slice(0, 3).map(r => Boolean(r))
      : [false, false, false],
  };
}

/**
 * Detect changes between two game states
 * @param {Object} prevState Previous game state
 * @param {Object} nextState Next game state
 * @returns {Object|null} Change object or null if no changes
 */
export function detectChanges(prevState, nextState) {
  if (!prevState || !nextState) return null;

  const fields = [];
  const prev = {};
  const next = {};

  const fieldsToCompare = [
    'inning', 'isTopInning', 'inningState',
    'balls', 'strikes', 'outs',
    'homeScore', 'awayScore',
  ];

  fieldsToCompare.forEach(field => {
    if (prevState[field] !== nextState[field]) {
      fields.push(field);
      prev[field] = prevState[field];
      next[field] = nextState[field];
    }
  });

  // Compare runners array
  const prevRunners = prevState.runners || [false, false, false];
  const nextRunners = nextState.runners || [false, false, false];
  if (prevRunners.some((r, i) => r !== nextRunners[i])) {
    fields.push('runners');
    prev.runners = prevRunners;
    next.runners = nextRunners;
  }

  if (fields.length === 0) return null;

  return {
    gameId: nextState.gameId,
    fields,
    prev,
    next,
    timestamp: Date.now(),
  };
}
