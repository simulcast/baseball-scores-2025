import { normalizeGame } from './normalizeGame';

const MLB_API = 'https://statsapi.mlb.com/api/v1';

/**
 * Fetch game metadata from MLB StatsAPI for use in generateMetadata and OG images.
 * Returns a normalized game object or null on any failure.
 */
export async function fetchGameMeta(gameId) {
  try {
    const url = `${MLB_API}/schedule?sportId=1&gamePk=${gameId}&hydrate=team,linescore`;
    const response = await fetch(url, { next: { revalidate: 30 } });

    if (!response.ok) {
      console.error(`fetchGameMeta: MLB API returned ${response.status} for gamePk=${gameId}`);
      return null;
    }

    const data = await response.json();
    const raw = data.dates?.[0]?.games?.[0];

    if (!raw) {
      return null;
    }

    return normalizeGame(raw);
  } catch (error) {
    console.error(`fetchGameMeta: failed for gamePk=${gameId}:`, error.message);
    return null;
  }
}
