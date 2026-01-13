// src/audio/layers/drone.js

import { el } from '@elemaudio/core';
import { lowpass } from '../effects/filter.js';
import { softClip } from '../effects/dynamics.js';

/**
 * Render drone layer
 * Layered sines (fundamental + sub-octave) + gentle saturation
 */
export function renderDrone(params, key = 'drone') {
  const { frequency, amplitude, filterCutoff } = params;

  // Fundamental sine
  const fundamental = el.cycle({
    key: `${key}-fund`,
    freq: el.const({ key: `${key}-fund-freq`, value: frequency })
  });

  // Sub-octave (one octave below)
  const subOctave = el.cycle({
    key: `${key}-sub`,
    freq: el.const({ key: `${key}-sub-freq`, value: frequency / 2 })
  });

  // Fifth above (subtle)
  const fifth = el.cycle({
    key: `${key}-fifth`,
    freq: el.const({ key: `${key}-fifth-freq`, value: frequency * 1.5 })
  });

  // Mix layers
  const mixed = el.add(
    el.mul(el.const({ key: `${key}-fund-amp`, value: 0.5 }), fundamental),
    el.mul(el.const({ key: `${key}-sub-amp`, value: 0.35 }), subOctave),
    el.mul(el.const({ key: `${key}-fifth-amp`, value: 0.15 }), fifth)
  );

  // Filter
  const filtered = lowpass(filterCutoff, 1.0, mixed, `${key}-filt`);

  // Gentle saturation
  const saturated = softClip(0.2, filtered, `${key}-sat`);

  // Output amplitude
  return el.mul(
    el.const({ key: `${key}-amp`, value: amplitude }),
    saturated
  );
}
