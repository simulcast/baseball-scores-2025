// src/audio/interpreter.js

import {
  getModeFromScore,
  getTonalCenter,
  buildScale,
  getPadVoicing,
  noteToFrequency,
  getLeadChangeRoot
} from './harmony.js';
import { detectEvents, getEventResponse } from './events.js';

/**
 * Calculate tension level (0-1) from game state
 */
export function calculateTension(gameState) {
  let tension = 0;

  // Outs contribution: 0=0, 1=0.3, 2=0.7
  const outsWeights = [0, 0.3, 0.7];
  tension += outsWeights[gameState.outs] || 0;

  // Runners in scoring position (2nd or 3rd base)
  if (gameState.runners[1]) tension += 0.2; // runner on 2nd
  if (gameState.runners[2]) tension += 0.2; // runner on 3rd

  // Count pressure (strikes weighted more than balls)
  tension += gameState.strikes * 0.1;
  tension += gameState.balls * 0.05;

  // Late innings (7+)
  if (gameState.inning >= 7) tension += 0.15;

  // Close game (within 2 runs)
  const scoreDiff = Math.abs(gameState.homeScore - gameState.awayScore);
  if (scoreDiff <= 2) tension += 0.2;

  // Clamp to 0-1
  return Math.min(Math.max(tension, 0), 1);
}

/**
 * Interpret game state into musical parameters
 */
export function interpret(gameState, prevState, currentParams) {
  if (!gameState) return currentParams || getDefaultParams();

  // Detect events
  const events = detectEvents(prevState, gameState);
  const eventResponses = events.map(getEventResponse);

  // Calculate core parameters
  const tension = calculateTension(gameState);
  const mode = getModeFromScore(gameState.homeScore, gameState.awayScore);

  // Handle lead change modulation
  let tonalCenter = currentParams?.tonalCenter || getTonalCenter(gameState.inning);
  const leadChangeEvent = events.find(e => e.type === 'LEAD_CHANGE');
  if (leadChangeEvent) {
    tonalCenter = getLeadChangeRoot(tonalCenter, leadChangeEvent.newLeader);
  }

  // Build scale and chord
  const scale = buildScale(tonalCenter, mode, 3, 5);
  const padVoicing = getPadVoicing(tonalCenter, mode, tension);

  // Breathing state
  const isBreathing = gameState.inningState === 'Mid' || gameState.inningState === 'End';

  // Time since last change (for ambient activity)
  const timeSinceLastChange = gameState.timeSinceLastChange || 0;
  const ambientActivity = Math.min(timeSinceLastChange / 30, 1);

  // Calculate layer-specific parameters
  const droneFreq = noteToFrequency(tonalCenter + '2');
  const filterCutoff = 400 + (tension * 2000); // 400-2400 Hz based on tension

  return {
    // Global
    tonalCenter,
    mode,
    scale,
    tension,
    isBreathing,
    ambientActivity,
    timeSinceLastChange,

    // Events
    events,
    eventResponses,

    // Drone layer
    drone: {
      frequency: droneFreq,
      amplitude: isBreathing ? 0.6 : 0.8,
      filterCutoff: 200 + (tension * 300),
    },

    // Pad layer
    pad: {
      voicing: padVoicing,
      frequencies: padVoicing.map(noteToFrequency),
      filterCutoff,
      amplitude: isBreathing ? 0.4 : 0.7,
    },

    // Bells layer
    bells: {
      scale,
      densityProbability: 0.1 + (tension * 0.3),
      register: tension > 0.6 ? 'high' : 'mid',
      amplitude: 0.5,
    },

    // Air layer
    air: {
      amount: isBreathing ? 0.6 : 0.3,
      filterCenter: 4000 + (tension * 4000),
      amplitude: 0.3,
    },

    // Shimmer layer
    shimmer: {
      intensity: tension > 0.5 ? 0.5 + (tension * 0.3) : 0.3,
      amplitude: isBreathing ? 0.3 : 0.5,
    },

    // Ghost melody layer
    ghostMelody: {
      scale,
      noteProbability: 0.05 + (ambientActivity * 0.15),
      scalePosition: gameState.inning % 7,
      amplitude: 0.4,
    },

    // Master effects
    master: {
      reverbDecay: isBreathing ? 6.0 : 4.5 - (tension * 1.5),
      stereoWidth: tension > 0.7 ? 0.8 : 1.0,
      saturation: 0.1 + (tension * 0.1),
    },
  };
}

/**
 * Get default parameters when no game state
 */
function getDefaultParams() {
  return {
    tonalCenter: 'C',
    mode: 'mixolydian',
    scale: buildScale('C', 'mixolydian', 3, 5),
    tension: 0.3,
    isBreathing: true,
    ambientActivity: 0.5,
    timeSinceLastChange: 15,
    events: [],
    eventResponses: [],
    drone: { frequency: 130.81, amplitude: 0.6, filterCutoff: 300 },
    pad: { voicing: ['C3', 'E3', 'G3', 'B3'], frequencies: [130.81, 164.81, 196, 246.94], filterCutoff: 800, amplitude: 0.5 },
    bells: { scale: [], densityProbability: 0.2, register: 'mid', amplitude: 0.5 },
    air: { amount: 0.4, filterCenter: 5000, amplitude: 0.3 },
    shimmer: { intensity: 0.3, amplitude: 0.4 },
    ghostMelody: { scale: [], noteProbability: 0.1, scalePosition: 0, amplitude: 0.4 },
    master: { reverbDecay: 4.5, stereoWidth: 1.0, saturation: 0.1 },
  };
}
