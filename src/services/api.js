import axios from 'axios';

// Create API client with base URL
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Get today's games
 * @param {string} date Optional date in YYYY-MM-DD format
 * @returns {Promise<Array>} List of today's games
 */
export const getTodaysGames = async (date) => {
  try {
    // Get client's timezone offset in minutes (negative for timezones ahead of UTC)
    const timezoneOffset = -new Date().getTimezoneOffset();
    const params = date ? { date, timezoneOffset } : { timezoneOffset };
    const response = await apiClient.get('/getGames', { params });
    return response.data.games;
  } catch (error) {
    console.error('Error fetching today\'s games:', error);
    throw error;
  }
};

/**
 * Get detailed game state
 * @param {number} gamePk Game ID
 * @returns {Promise<Object>} Game state
 */
export const getGameState = async (gamePk) => {
  try {
    // Convert gamePk to number if it's a string
    const numericGamePk = typeof gamePk === 'string' ? parseInt(gamePk, 10) : gamePk;
    
    const response = await apiClient.get('/getGameDetails', { 
      params: { gamePk: numericGamePk } 
    });
    return response.data.gameState;
  } catch (error) {
    console.error(`Error fetching game state for game ${gamePk}:`, error);
    throw error;
  }
};

/**
 * Detect changes between two game states
 * @param {Object} previousState Previous game state
 * @param {Object} currentState Current game state
 * @returns {Object} Detected events and changes
 */
export const detectGameStateChanges = (previousState, currentState) => {
  if (!previousState || !currentState) {
    return { hasChanges: false, events: [] };
  }

  const events = [];
  let hasChanges = false;

  // Check score changes (runs scored)
  if (previousState.homeScore !== currentState.homeScore) {
    hasChanges = true;
    const runsDiff = currentState.homeScore - previousState.homeScore;
    events.push({
      type: 'RUN_SCORED',
      team: 'home',
      count: runsDiff,
      details: `Home team scored ${runsDiff} run${runsDiff > 1 ? 's' : ''}`
    });
  }

  if (previousState.awayScore !== currentState.awayScore) {
    hasChanges = true;
    const runsDiff = currentState.awayScore - previousState.awayScore;
    events.push({
      type: 'RUN_SCORED',
      team: 'away',
      count: runsDiff,
      details: `Away team scored ${runsDiff} run${runsDiff > 1 ? 's' : ''}`
    });
  }

  // Check for outs recorded
  if (previousState.outs !== currentState.outs && currentState.outs > previousState.outs) {
    hasChanges = true;
    events.push({
      type: 'OUT_RECORDED',
      details: 'Out recorded'
    });
  }

  // Check for inning changes
  if (previousState.inning !== currentState.inning || 
      previousState.isTopInning !== currentState.isTopInning) {
    hasChanges = true;
    events.push({
      type: 'INNING_CHANGE',
      details: `Now ${currentState.isTopInning ? 'top' : 'bottom'} of inning ${currentState.inning}`
    });
  }

  // Check for batter changes
  if (
    previousState.currentBatter?.id !== currentState.currentBatter?.id &&
    currentState.currentBatter?.id
  ) {
    hasChanges = true;
    events.push({
      type: 'BATTER_CHANGE',
      details: `New batter: ${currentState.currentBatter.fullName}`
    });
  }

  // Compare basic game state elements
  const basicStateElements = ['balls', 'strikes'];
  for (const element of basicStateElements) {
    if (previousState[element] !== currentState[element]) {
      hasChanges = true;
      break;
    }
  }

  // Compare runners
  if (JSON.stringify(previousState.runners) !== JSON.stringify(currentState.runners)) {
    hasChanges = true;
  }

  return { hasChanges, events };
};