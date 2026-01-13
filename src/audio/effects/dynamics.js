// src/audio/effects/dynamics.js

import { el } from '@elemaudio/core';

/**
 * Soft clipper for gentle saturation
 */
export function softClip(amount, signal, key) {
  // Tanh-based soft clipping
  const drive = 1 + (amount * 3); // 1-4x drive
  return el.tanh(
    el.mul(
      el.const({ key: `${key}-drive`, value: drive }),
      signal
    )
  );
}

/**
 * Simple limiter using tanh at threshold
 */
export function limiter(thresholdDb, signal, key) {
  const threshold = Math.pow(10, thresholdDb / 20);
  // Normalize to threshold, clip, restore
  return el.mul(
    el.const({ key: `${key}-thresh`, value: threshold }),
    el.tanh(
      el.mul(
        el.const({ key: `${key}-inv-thresh`, value: 1 / threshold }),
        signal
      )
    )
  );
}

/**
 * Simple compression approximation using smooth envelope following
 * Not a true compressor but provides gentle dynamic control
 */
export function compress(ratio, signal, key) {
  // For true compression we'd need envelope detection
  // This is a simplified version using soft clipping
  const softness = 1 / ratio;
  return softClip(softness, signal, key);
}
