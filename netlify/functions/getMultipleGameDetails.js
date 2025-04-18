const { getGameDetails, transformGameState } = require('./utils/mlbStatsApi');

// Cache to store game details with expiration
const gameDetailsCache = new Map();
const CACHE_EXPIRATION = 5 * 1000;

exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const gamePksParam = params.gamePks;

    if (!gamePksParam) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Game IDs (gamePks) are required' })
      };
    }

    const gamePks = gamePksParam.split(',');
    const now = Date.now();
    const gameStates = {};
    const fetchPromises = [];

    // Process each game
    for (const gamePk of gamePks) {
      // Check cache first
      const cachedData = gameDetailsCache.get(gamePk);
      if (cachedData && now - cachedData.timestamp < CACHE_EXPIRATION) {
        gameStates[gamePk] = cachedData.data;
        continue;
      }

      // Fetch fresh data if needed
      fetchPromises.push(
        getGameDetails(gamePk).then(gameData => {
          if (gameData) {
            const gameState = transformGameState(gameData);
            gameDetailsCache.set(gamePk, {
              data: gameState,
              timestamp: now
            });
            gameStates[gamePk] = gameState;
          }
        }).catch(err => {
          console.error(`Error fetching game ${gamePk}:`, err);
        })
      );
    }

    // Wait for all fetches to complete
    await Promise.all(fetchPromises);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=5'
      },
      body: JSON.stringify({
        gameStates,
        fromCache: Object.keys(gameStates).length === gamePks.length
      })
    };
  } catch (error) {
    console.error('Error in getMultipleGameDetails function:', {
      error: error.message,
      stack: error.stack,
      gamePks: event.queryStringParameters?.gamePks
    });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to fetch multiple game details',
        details: error.message
      })
    };
  }
};