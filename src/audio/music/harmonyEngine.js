/**
 * Derives harmonic state from game state + team palette.
 * Pure function — zero Tone.js dependency.
 *
 * HarmonyState = { root, mode, chordTones, scaleTones, tension, brightness }
 */

import { CYCLE_OF_FOURTHS, nameToIndex, indexToName, getScaleTones, getChordTones } from './scales';
import { calculateTension } from './tension';

const MODE_THRESHOLDS = [
  { max: 0.3, mode: 'lydian' },
  { max: 0.6, mode: 'mixolydian' },
  { max: 0.8, mode: 'dorian' },
  { max: Infinity, mode: 'aeolian' },
];

/**
 * Derive the current harmonic state from game data and team palette.
 *
 * @param {Object} game - Normalized game object
 * @param {Object} palette - From teamPalette()
 * @param {number} brightness - Pre-calculated brightness (0-1)
 * @returns {Object} HarmonyState
 */
export function deriveHarmony(game, palette, brightness = 0) {
  if (!game) return defaultHarmony(brightness);

  const tension = calculateTension(game);
  const root = deriveRoot(game, palette);
  const mode = deriveMode(tension, palette);
  const chordTones = getChordTones(root, mode, 3, 5);
  const scaleTones = getScaleTones(root, mode, 3, 5);

  // Safety: always include at least the root
  if (chordTones.length === 0) {
    const rootMidi = (4 + 1) * 12 + nameToIndex(root); // root in octave 4
    chordTones.push(rootMidi);
  }

  return { root, mode, chordTones, scaleTones, tension, brightness };
}

/**
 * Root note from inning position in cycle of fourths, offset by team palette.
 */
function deriveRoot(game, palette) {
  const inning = game.inning || 1;
  const halfInningIndex = (inning - 1) * 2 + (game.isTopInning ? 0 : 1);

  // Offset by team palette
  const offset = palette?.rootOffset ?? 0;
  const cycleIndex = (halfInningIndex + offset) % CYCLE_OF_FOURTHS.length;

  return CYCLE_OF_FOURTHS[cycleIndex];
}

/**
 * Mode from tension value, adjusted by team's mode bias.
 */
function deriveMode(tension, palette) {
  const biasedTension = tension + (palette?.modeBias ?? 0);

  for (const { max, mode } of MODE_THRESHOLDS) {
    if (biasedTension < max) return mode;
  }
  return 'aeolian'; // fallback
}

/**
 * Default harmony when no game is active.
 */
function defaultHarmony(brightness = 0) {
  const root = 'C';
  const mode = 'lydian';
  return {
    root,
    mode,
    chordTones: getChordTones(root, mode, 3, 5),
    scaleTones: getScaleTones(root, mode, 3, 5),
    tension: 0,
    brightness,
  };
}
