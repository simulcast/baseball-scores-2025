const { getTodaysGames } = require('./utils/mlbStatsApi');

// Cache to store game data with expiration
let gamesCache = {
  data: null,
  timestamp: null
};

// Cache expiration time in milliseconds
// Use a much shorter cache for faster updates
const CACHE_EXPIRATION = 5 * 1000; // 5 seconds instead of 30

exports.handler = async (event) => {
  try {
    // Check if we have valid cached data
    const now = Date.now();
    if (
      gamesCache.data &&
      gamesCache.timestamp &&
      now - gamesCache.timestamp < CACHE_EXPIRATION
    ) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=5'
        },
        body: JSON.stringify({
          games: gamesCache.data,
          fromCache: true,
          cacheAge: now - gamesCache.timestamp
        })
      };
    }

    // Get parameters
    const params = event.queryStringParameters || {};
    const date = params.date;
    const timezoneOffset = params.timezoneOffset ? parseInt(params.timezoneOffset, 10) : 0;

    // Fetch fresh data with timezone offset
    const games = await getTodaysGames({ date, timezoneOffset });

    // Update cache
    gamesCache = {
      data: games,
      timestamp: now
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=5'
      },
      body: JSON.stringify({
        games,
        fromCache: false
      })
    };
  } catch (error) {
    console.error('Error in getGames function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch games' })
    };
  }
};