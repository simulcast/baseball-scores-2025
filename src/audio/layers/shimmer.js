// src/audio/layers/shimmer.js

import { el } from '@elemaudio/core';
import { highpass } from '../effects/filter.js';

/**
 * Render shimmer layer
 * Octave-up pitch shift simulation → long diffuse reverb → high-pass
 *
 * Note: True pitch shifting is complex in Elementary.
 * This approximates shimmer using ring modulation and filtering.
 */
export function renderShimmer(params, padSignal, key = 'shimmer') {
  const { intensity, amplitude } = params;

  // Ring modulation to create upper harmonics
  // Modulating with a high frequency adds octave-like content
  const modFreq = 880; // A5 - creates shimmery overtones
  const modulator = el.cycle({
    key: `${key}-mod`,
    freq: el.const({ key: `${key}-mod-freq`, value: modFreq })
  });

  // Ring mod the pad signal
  const ringMod = el.mul(padSignal, modulator);

  // High-pass to remove low frequencies, keep only shimmer
  const filtered = highpass(800, 0.707, ringMod, `${key}-hp`);

  // Scale by intensity and amplitude
  return el.mul(
    el.const({ key: `${key}-amp`, value: amplitude * intensity }),
    filtered
  );
}

/**
 * Render stereo shimmer with auto-pan
 */
export function renderStereoShimmer(params, padSignalL, padSignalR, time, key = 'shimmer') {
  // Process each channel
  const shimmerL = renderShimmer(params, padSignalL, `${key}-L`);
  const shimmerR = renderShimmer(
    { ...params, intensity: params.intensity * 0.95 }, // Slight variation
    padSignalR,
    `${key}-R`
  );

  // Auto-pan using slow LFO (simulated via time-based modulation)
  // In a real implementation, we'd use el.cycle for LFO
  // For now, return as-is (auto-pan can be added later)

  return { left: shimmerL, right: shimmerR };
}
