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