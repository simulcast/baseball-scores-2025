const axios = require('axios');

// MLB StatsAPI wrapper based on the provided library
const MLB_STATS_API_BASE_URL = 'https://statsapi.mlb.com/api/v1';
const MLB_STATS_API_V1_1_BASE_URL = 'https://statsapi.mlb.com/api/v1.1';

/**
 * Get today's MLB games
 * @param {Object} options Optional parameters
 * @param {string} options.date Optional date in YYYY-MM-DD format
 * @param {number} options.timezoneOffset Timezone offset in minutes (negative for timezones ahead of UTC)
 * @returns {Promise<Array>} List of games
 */
const getTodaysGames = async (options = {}) => {
  try {
    // Get current date in UTC
    const now = new Date();
    
    // If timezoneOffset is provided, adjust the date to the client's timezone
    let finalDate = options.date;
    if (!finalDate && options.timezoneOffset !== undefined) {
      // Convert the timezone offset to milliseconds and adjust the date
      const offsetMs = options.timezoneOffset * 60 * 1000;
      const adjustedTime = new Date(now.getTime() + offsetMs);
      finalDate = adjustedTime.toISOString().split('T')[0];
    } else if (!finalDate) {
      finalDate = now.toISOString().split('T')[0];
    }

    const response = await axios.get(`${MLB_STATS_API_BASE_URL}/schedule`, {
      params: {
        sportId: 1,
        date: finalDate,
        hydrate: 'team,linescore,game(content(media(epg))),probablePitcher,flags,weather,broadcasts(all)',
      }
    });

    // Transform the response to a simpler format
    if (response.data.dates && response.data.dates.length > 0) {
      return response.data.dates[0].games;
    }
    return [];
  } catch (error) {
    console.error('Error fetching today\'s games:', error);
    throw error;
  }
};

/**
 * Get detailed game data
 * @param {number} gamePk Game ID
 * @returns {Promise<Object>} Game data
 */
const getGameDetails = async (gamePk) => {
  try {
    // Convert gamePk to number if it's a string
    const numericGamePk = typeof gamePk === 'string' ? parseInt(gamePk, 10) : gamePk;
    
    console.log(`Making MLB API request for game ${numericGamePk}`);
    const response = await axios.get(`${MLB_STATS_API_V1_1_BASE_URL}/game/${numericGamePk}/feed/live`);
    
    if (!response.data) {
      throw new Error('No data in MLB API response');
    }
    
    return response.data;
  } catch (error) {
    console.error('MLB API Error:', {
      gamePk,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

/**
 * Get linescore data
 * @param {number} gamePk Game ID
 * @returns {Promise<Object>} Linescore data
 */
const getGameLinescore = async (gamePk) => {
  try {
    const response = await axios.get(`${MLB_STATS_API_V1_1_BASE_URL}/game/${gamePk}/linescore`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching linescore for game ${gamePk}:`, error);
    throw error;
  }
};

/**
 * Get boxscore data
 * @param {number} gamePk Game ID
 * @returns {Promise<Object>} Boxscore data
 */
const getGameBoxscore = async (gamePk) => {
  try {
    const response = await axios.get(`${MLB_STATS_API_V1_1_BASE_URL}/game/${gamePk}/boxscore`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching boxscore for game ${gamePk}:`, error);
    throw error;
  }
};

/**
 * Transforms raw game data into a simplified format for our app
 * @param {Object} gameData Raw game data
 * @returns {Object} Simplified game state
 */
const transformGameState = (gameData) => {
  try {
    if (!gameData || !gameData.gameData || !gameData.liveData) {
      console.error('Invalid game data structure:', gameData);
      throw new Error('Invalid game data structure');
    }

    const { gameData: data, liveData: live } = gameData;
    
    // Extract bases information
    const bases = {
      first: false,
      second: false, 
      third: false
    };
    
    if (live.plays?.currentPlay?.runners) {
      for (const runner of live.plays.currentPlay.runners) {
        if (runner.movement) {
          const { start, end } = runner.movement;
          if (end === '1B') bases.first = true;
          if (end === '2B') bases.second = true;
          if (end === '3B') bases.third = true;
        }
      }
    }
    
    // Extract current batter and pitcher
    let currentBatter = null;
    let currentPitcher = null;
    
    if (live.plays?.currentPlay?.matchup) {
      const batterId = live.plays.currentPlay.matchup.batter?.id;
      const pitcherId = live.plays.currentPlay.matchup.pitcher?.id;
      
      if (batterId && data.players?.[`ID${batterId}`]) {
        currentBatter = {
          id: batterId,
          fullName: data.players[`ID${batterId}`].fullName,
          stats: {
            batting: data.players[`ID${batterId}`].stats?.batting || {}
          }
        };
      }
      
      if (pitcherId && data.players?.[`ID${pitcherId}`]) {
        currentPitcher = {
          id: pitcherId,
          fullName: data.players[`ID${pitcherId}`].fullName,
          stats: {
            pitching: data.players[`ID${pitcherId}`].stats?.pitching || {}
          }
        };
      }
    }
    
    // Get the counts with safe defaults
    const linescore = live.linescore || {};
    const { balls = 0, strikes = 0 } = linescore;
    const outs = linescore.outs || 0;
    
    // Create the transformed state
    const transformedState = {
      gameId: data.game?.pk,
      status: data.status?.abstractGameState || 'Unknown',
      detailedState: data.status?.detailedState || 'Unknown',
      homeTeam: {
        id: data.teams?.home?.id,
        name: data.teams?.home?.name || 'Unknown',
        abbreviation: data.teams?.home?.abbreviation || 'UNK'
      },
      awayTeam: {
        id: data.teams?.away?.id,
        name: data.teams?.away?.name || 'Unknown',
        abbreviation: data.teams?.away?.abbreviation || 'UNK'
      },
      venue: data.venue?.name || 'Unknown',
      inning: linescore.currentInning || 0,
      isTopInning: linescore.isTopInning ?? true,
      balls,
      strikes,
      outs,
      runners: [bases.first, bases.second, bases.third],
      homeScore: linescore.teams?.home?.runs || 0,
      awayScore: linescore.teams?.away?.runs || 0,
      currentPitcher,
      currentBatter,
      lastUpdate: new Date().toISOString()
    };

    console.log('Successfully transformed game state:', transformedState);
    return transformedState;
  } catch (error) {
    console.error('Error transforming game state:', {
      error: error.message,
      stack: error.stack,
      gameData: JSON.stringify(gameData, null, 2)
    });
    throw new Error(`Failed to transform game state: ${error.message}`);
  }
};

module.exports = {
  getTodaysGames,
  getGameDetails,
  getGameLinescore,
  getGameBoxscore,
  transformGameState
};