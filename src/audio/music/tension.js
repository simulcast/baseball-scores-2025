/**
 * Tension and brightness calculations from game state.
 * Pure functions — zero Tone.js dependency.
 *
 * Tension (0-1) = composite of game situation urgency.
 * Brightness (0-1) = recent event density (controls filter cutoff).
 */

/**
 * Calculate tension from game state.
 * Composite of: runners (30%), score closeness (30%), count (20%), outs (20%).
 *
 * @param {Object} game - Normalized game object
 * @returns {number} Tension float 0-1
 */
export function calculateTension(game) {
  if (!game || game.status !== 'Live') return 0;

  const runnerTension = calcRunnerTension(game.runners);
  const scoreTension = calcScoreTension(game.homeScore, game.awayScore, game.inning);
  const countTension = calcCountTension(game.balls, game.strikes);
  const outTension = calcOutTension(game.outs);

  return clamp(
    runnerTension * 0.3 +
    scoreTension * 0.3 +
    countTension * 0.2 +
    outTension * 0.2
  );
}

/**
 * Runner situation tension.
 * Empty = 0, 1st only = 0.2, RISP (2nd or 3rd) = 0.6, loaded = 1.0.
 */
function calcRunnerTension(runners) {
  if (!runners) return 0;
  const [first, second, third] = runners;
  if (second && third && first) return 1.0;   // bases loaded
  if (third) return 0.8;                       // runner on 3rd
  if (second && first) return 0.7;             // 1st and 2nd
  if (second) return 0.6;                      // RISP
  if (first) return 0.2;                       // runner on 1st
  return 0;
}

/**
 * Score closeness tension. Tighter = more tense.
 * Also factors in late innings (close game in 9th > close game in 1st).
 */
function calcScoreTension(homeScore, awayScore, inning) {
  const diff = Math.abs((homeScore ?? 0) - (awayScore ?? 0));
  const inningFactor = Math.min((inning ?? 1) / 9, 1); // 0-1, peaks at 9th

  let baseTension;
  if (diff === 0) baseTension = 0.8;
  else if (diff === 1) baseTension = 0.6;
  else if (diff <= 3) baseTension = 0.3;
  else baseTension = 0.1;

  // Late innings amplify close-game tension
  return baseTension * (0.6 + 0.4 * inningFactor);
}

/**
 * Count tension. Full count = max, 0-0 = min.
 */
function calcCountTension(balls, strikes) {
  const b = balls ?? 0;
  const s = strikes ?? 0;

  // Full count (3-2) is most tense
  if (b === 3 && s === 2) return 1.0;
  // Two strikes (hitter in danger)
  if (s === 2) return 0.7;
  // Three balls (pitcher in trouble)
  if (b === 3) return 0.5;
  // Partial counts
  return (b + s) / 5 * 0.4;
}

/**
 * Out tension. 2 outs = high pressure.
 */
function calcOutTension(outs) {
  if (outs === 2) return 0.8;
  if (outs === 1) return 0.3;
  return 0;
}

/**
 * Calculate brightness from recent event density.
 * Exponential decay: recent events count more than older ones.
 *
 * @param {number[]} timestamps - Array of event timestamps (ms since epoch)
 * @param {number} now - Current time (ms since epoch)
 * @param {number} windowMs - Time window in ms (default 30s)
 * @returns {number} Brightness float 0-1
 */
export function calculateBrightness(timestamps, now, windowMs = 30000) {
  if (!timestamps || timestamps.length === 0) return 0;

  let weightedSum = 0;
  let count = 0;

  for (const ts of timestamps) {
    const age = now - ts;
    if (age < 0 || age > windowMs) continue;
    // Exponential decay: recent events weight more
    const weight = Math.exp(-3 * age / windowMs);
    weightedSum += weight;
    count++;
  }

  if (count === 0) return 0;

  // Normalize: ~10 events in 30s = brightness 1.0
  return clamp(weightedSum / 5);
}

function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}
