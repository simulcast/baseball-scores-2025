const { getGameDetails, transformGameState } = require('./utils/mlbStatsApi');

// Cache to store game details with expiration
const gameDetailsCache = new Map();

// Cache expiration time in milliseconds (15 seconds for live game data)
const CACHE_EXPIRATION = 15 * 1000;

exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const gamePk = params.gamePk;

    if (!gamePk) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Game ID (gamePk) is required' })
      };
    }

    // Check if we have valid cached data for this game
    const now = Date.now();
    const cachedData = gameDetailsCache.get(gamePk);
    
    if (
      cachedData &&
      cachedData.timestamp &&
      now - cachedData.timestamp < CACHE_EXPIRATION
    ) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=15'
        },
        body: JSON.stringify({
          gameState: cachedData.data,
          fromCache: true,
          cacheAge: now - cachedData.timestamp
        })
      };
    }

    // Fetch fresh game data
    console.log(`Fetching game details for gamePk: ${gamePk}`);
    const gameData = await getGameDetails(gamePk);
    
    if (!gameData) {
      throw new Error('No game data returned from MLB API');
    }
    
    // Transform the data to our app-specific format
    const gameState = transformGameState(gameData);

    // Update cache
    gameDetailsCache.set(gamePk, {
      data: gameState,
      timestamp: now
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=15'
      },
      body: JSON.stringify({
        gameState,
        fromCache: false
      })
    };
  } catch (error) {
    console.error('Error in getGameDetails function:', {
      error: error.message,
      stack: error.stack,
      gamePk: event.queryStringParameters?.gamePk
    });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to fetch game details',
        details: error.message
      })
    };
  }
};