// src/audio/layers/air.js

import { el } from '@elemaudio/core';
import { bandpass } from '../effects/filter.js';

/**
 * Render air/texture layer
 * Filtered pink noise → band-pass sweep
 */
export function renderAir(params, key = 'air') {
  const { amount, filterCenter, amplitude } = params;

  // Pink noise source
  const noise = el.pinknoise({ key: `${key}-noise` });

  // Band-pass filter with wide Q for texture
  const filtered = bandpass(filterCenter, 0.5, noise, `${key}-bp`);

  // Scale by amount and amplitude
  return el.mul(
    el.const({ key: `${key}-amp`, value: amplitude * amount }),
    filtered
  );
}

/**
 * Render stereo air (full width)
 */
export function renderStereoAir(params, key = 'air') {
  // Two independent noise sources for true stereo
  const left = renderAir(params, `${key}-L`);
  const right = renderAir(
    { ...params, filterCenter: params.filterCenter * 1.05 }, // Slight variation
    `${key}-R`
  );

  return { left, right };
}
