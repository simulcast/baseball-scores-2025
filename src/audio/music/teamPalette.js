/**
 * Team-seeded musical identity.
 * Pure function: deterministic hash of team IDs → musical fingerprint.
 * Zero Tone.js dependency.
 */

/**
 * Generate a musical palette for a matchup.
 *
 * @param {number|null} homeId - Home team MLB ID
 * @param {number|null} awayId - Away team MLB ID
 * @returns {{ rootOffset: number, modeBias: number, padColor: object, pulseColor: object }}
 */
export function teamPalette(homeId, awayId) {
  const homeSeed = hashTeamId(homeId);
  const awaySeed = hashTeamId(awayId);

  // Root offset: blend of both teams, 0-11 semitones
  const rootOffset = (homeSeed + awaySeed) % 12;

  // Mode bias: home team shifts tension thresholds slightly (-0.1 to +0.1)
  const modeBias = ((homeSeed % 21) - 10) / 100;

  // Pad timbre color: from home team
  const padColor = {
    harmonicity: 1.2 + (homeSeed % 7) * 0.1,       // 1.2 - 1.8
    modulationIndex: 0.5 + (homeSeed % 5) * 0.15,   // 0.5 - 1.1
  };

  // Pulse timbre color: from away team (softer range for glass/mallet sound)
  const pulseColor = {
    harmonicity: 2.8 + (awaySeed % 5) * 0.25,       // 2.8 - 3.8
    modulationIndex: 0.4 + (awaySeed % 6) * 0.1,    // 0.4 - 0.9
  };

  return { rootOffset, modeBias, padColor, pulseColor };
}

/**
 * Simple deterministic hash for a team ID.
 * Returns a positive integer. Null/undefined IDs return a default.
 */
function hashTeamId(id) {
  if (id == null) return 7; // default seed
  // Simple hash: multiply by a prime, take absolute value
  const n = Math.abs(Number(id));
  return ((n * 2654435761) >>> 0) % 1000;
}
