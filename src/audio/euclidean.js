// src/audio/euclidean.js

import { EUCLIDEAN_PATTERNS } from './constants.js';

/**
 * Bjorklund's algorithm for Euclidean rhythm generation
 * Returns array of booleans: true = pulse, false = rest
 */
export function bjorklund(pulses, steps) {
  if (pulses >= steps) {
    return new Array(steps).fill(true);
  }
  if (pulses === 0) {
    return new Array(steps).fill(false);
  }

  let pattern = [];
  let counts = [];
  let remainders = [];
  let divisor = steps - pulses;
  let level = 0;

  remainders[0] = pulses;

  while (remainders[level] > 1) {
    counts[level] = Math.floor(divisor / remainders[level]);
    remainders[level + 1] = divisor % remainders[level];
    divisor = remainders[level];
    level++;
  }

  counts[level] = divisor;

  function build(level) {
    if (level === -1) {
      pattern.push(false);
    } else if (level === -2) {
      pattern.push(true);
    } else {
      for (let i = 0; i < counts[level]; i++) {
        build(level - 1);
      }
      if (remainders[level] !== 0) {
        build(level - 2);
      }
    }
  }

  build(level);
  return pattern;
}

/**
 * Convert Euclidean pattern to density curve
 * Returns function that gives density (0-1) at any point in cycle
 */
export function patternToDensityCurve(pulses, steps, cycleDuration) {
  const pattern = bjorklund(pulses, steps);
  const stepDuration = cycleDuration / steps;

  return function getDensity(timeInCycle) {
    // Normalize time to cycle
    const normalizedTime = timeInCycle % cycleDuration;
    const stepIndex = Math.floor(normalizedTime / stepDuration);
    const positionInStep = (normalizedTime % stepDuration) / stepDuration;

    // Current step has a pulse?
    const currentPulse = pattern[stepIndex] ? 1 : 0;
    const nextPulse = pattern[(stepIndex + 1) % steps] ? 1 : 0;

    // Smooth interpolation between steps (creates "hills" around pulses)
    // Use cosine interpolation for smooth curves
    const t = positionInStep;
    const smoothT = (1 - Math.cos(t * Math.PI)) / 2;

    return currentPulse * (1 - smoothT) + nextPulse * smoothT;
  };
}

/**
 * Combine multiple density curves into one
 * Returns average density across all patterns
 */
export function combineDensityCurves(patterns = EUCLIDEAN_PATTERNS) {
  const curves = patterns.map(p =>
    patternToDensityCurve(p.pulses, p.steps, p.cycleDuration)
  );

  return function getCombinedDensity(absoluteTime) {
    const densities = curves.map((curve, i) => {
      const cycleDuration = patterns[i].cycleDuration;
      const timeInCycle = absoluteTime % cycleDuration;
      return curve(timeInCycle);
    });

    // Average all densities
    return densities.reduce((a, b) => a + b, 0) / densities.length;
  };
}

/**
 * Check if an ambient event should fire based on probability
 */
export function shouldFireAmbientEvent(
  baseProbability,
  euclideanDensity,
  timeSinceLastChange,
  inningState,
  silenceMaxSeconds = 30,
  breathingFactor = 0.3
) {
  // Silence factor: longer since last game event = more ambient activity
  const silenceFactor = Math.min(timeSinceLastChange / silenceMaxSeconds, 1);

  // Breathing: Mid/End innings = lower probability (exhale)
  const breathing = (inningState === 'Mid' || inningState === 'End')
    ? breathingFactor
    : 1.0;

  // Final probability
  const probability = baseProbability * euclideanDensity * silenceFactor * breathing;

  return Math.random() < probability;
}
