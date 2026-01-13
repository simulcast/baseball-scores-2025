// src/audio/effects/eq.js

import { el } from '@elemaudio/core';
import { bandlimit } from './filter.js';

/**
 * Simple parametric EQ band (peaking filter approximation)
 * Uses parallel low-shelf and high-shelf for mid adjustment
 */
export function peakEQ(freqHz, gainDb, q, signal, key) {
  if (Math.abs(gainDb) < 0.5) return signal; // Skip if negligible

  // Convert dB to linear gain
  const gain = Math.pow(10, gainDb / 20);

  // Create a bandpass-filtered version and mix it
  const bandSignal = el.bandpass(
    el.const({ key: `${key}-freq`, value: freqHz }),
    el.const({ key: `${key}-q`, value: q }),
    signal
  );

  // Mix original with boosted/cut band
  const mixAmount = gain - 1; // How much to add/subtract
  return el.add(
    signal,
    el.mul(el.const({ key: `${key}-mix`, value: mixAmount }), bandSignal)
  );
}

/**
 * Apply per-layer EQ based on constants
 */
export function applyLayerEQ(signal, layerName, eqSettings, key) {
  const settings = eqSettings[layerName];
  if (!settings) return signal;

  // Apply bandlimiting
  let processed = bandlimit(settings.lowCut, settings.highCut, signal, `${key}-band`);

  // Apply mid EQ if present
  if (settings.midFreq && settings.midGain) {
    processed = peakEQ(settings.midFreq, settings.midGain, 1.5, processed, `${key}-mid`);
  }

  return processed;
}
