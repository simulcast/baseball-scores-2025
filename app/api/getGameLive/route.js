const MLB_API = 'https://statsapi.mlb.com/api/v1.1';

let cache = { gamePk: null, data: null, timestamp: 0 };
const CACHE_TTL = 500;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gamePk = searchParams.get('gamePk');

    if (!gamePk || !/^\d+$/.test(gamePk)) {
      return Response.json(
        { error: 'gamePk is required and must be numeric.' },
        { status: 400 },
      );
    }

    const now = Date.now();
    if (cache.data && cache.gamePk === gamePk && now - cache.timestamp < CACHE_TTL) {
      return Response.json({ game: cache.data });
    }

    const url = `${MLB_API}/game/${gamePk}/feed/live`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`MLB API returned ${response.status}`);
    }

    const full = await response.json();

    // Trim to only the fields the client needs (~2KB vs ~500KB full response)
    const trimmed = {
      gameData: full.gameData,
      liveData: {
        linescore: full.liveData?.linescore,
      },
    };

    cache = { gamePk, data: trimmed, timestamp: now };

    return Response.json({ game: trimmed });
  } catch (error) {
    console.error('getGameLive error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
