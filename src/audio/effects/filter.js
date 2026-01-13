// src/audio/effects/filter.js

import { el } from '@elemaudio/core';

/**
 * Low-pass filter with resonance
 */
export function lowpass(cutoffHz, q, signal, key) {
  return el.lowpass(
    el.const({ key: `${key}-cutoff`, value: cutoffHz }),
    el.const({ key: `${key}-q`, value: q }),
    signal
  );
}

/**
 * High-pass filter
 */
export function highpass(cutoffHz, q, signal, key) {
  return el.highpass(
    el.const({ key: `${key}-cutoff`, value: cutoffHz }),
    el.const({ key: `${key}-q`, value: q }),
    signal
  );
}

/**
 * Band-pass filter
 */
export function bandpass(centerHz, q, signal, key) {
  return el.bandpass(
    el.const({ key: `${key}-center`, value: centerHz }),
    el.const({ key: `${key}-q`, value: q }),
    signal
  );
}

/**
 * Combined low-cut and high-cut filter
 */
export function bandlimit(lowCutHz, highCutHz, signal, key) {
  let filtered = signal;
  if (lowCutHz > 0) {
    filtered = highpass(lowCutHz, 0.707, filtered, `${key}-lc`);
  }
  if (highCutHz < 20000) {
    filtered = lowpass(highCutHz, 0.707, filtered, `${key}-hc`);
  }
  return filtered;
}
