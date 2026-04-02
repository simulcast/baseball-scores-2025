const MLB_API = 'https://statsapi.mlb.com/api/v1';

let cache = { data: null, timestamp: 0 };
const CACHE_TTL = 1000;

export async function GET(request) {
  try {
    const now = Date.now();
    if (cache.data && now - cache.timestamp < CACHE_TTL) {
      return Response.json({ games: cache.data });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const timezoneOffset = searchParams.get('timezoneOffset');

    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 });
    }

    const offset = timezoneOffset !== null ? Number(timezoneOffset) : 0;
    if (isNaN(offset)) {
      return Response.json({ error: 'timezoneOffset must be a number.' }, { status: 400 });
    }

    let finalDate = date;
    if (!finalDate) {
      const offsetMs = offset * 60 * 1000;
      const adjusted = new Date(Date.now() + offsetMs);
      finalDate = adjusted.toISOString().split('T')[0];
    }

    const url = `${MLB_API}/schedule?sportId=1&date=${finalDate}&hydrate=team,linescore`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`MLB API returned ${response.status}`);
    }

    const data = await response.json();
    const games = data.dates?.[0]?.games ?? [];

    cache = { data: games, timestamp: now };

    return Response.json({ games }, {
      headers: { 'Cache-Control': 's-maxage=5, stale-while-revalidate=30' },
    });
  } catch (error) {
    console.error('getGames error:', error.message);
    return Response.json({ error: error.message }, {
      status: 500,
      headers: { 'Cache-Control': 's-maxage=5' },
    });
  }
}
