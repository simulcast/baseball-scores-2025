// src/audio/layers/pad.js

import { el } from '@elemaudio/core';
import { lowpass } from '../effects/filter.js';
import { LAYERS } from '../constants.js';

/**
 * Render pad layer
 * Filtered saw → low-pass filter → stereo spread
 */
export function renderPad(params, key = 'pad') {
  const { frequencies, filterCutoff, amplitude } = params;
  const config = LAYERS.pad;

  // Generate voices for each frequency in voicing
  const voices = frequencies.slice(0, config.voices).map((freq, i) => {
    // Slightly detuned saw waves for richness
    const saw1 = el.blepsaw({
      key: `${key}-v${i}-saw1`,
      freq: el.const({ key: `${key}-v${i}-freq1`, value: freq })
    });

    const saw2 = el.blepsaw({
      key: `${key}-v${i}-saw2`,
      freq: el.const({ key: `${key}-v${i}-freq2`, value: freq * 1.003 }) // Slight detune
    });

    const saw3 = el.blepsaw({
      key: `${key}-v${i}-saw3`,
      freq: el.const({ key: `${key}-v${i}-freq3`, value: freq * 0.997 }) // Slight detune other direction
    });

    // Mix the detuned saws
    return el.mul(
      el.const({ key: `${key}-v${i}-mix`, value: 0.33 }),
      el.add(saw1, saw2, saw3)
    );
  });

  // Sum all voices
  let summed = voices[0] || el.const({ value: 0 });
  for (let i = 1; i < voices.length; i++) {
    summed = el.add(summed, voices[i]);
  }

  // Scale by number of voices
  summed = el.mul(
    el.const({ key: `${key}-voice-scale`, value: 1 / Math.max(voices.length, 1) }),
    summed
  );

  // Low-pass filter modulated by tension
  const filtered = lowpass(filterCutoff, 2.0, summed, `${key}-filt`);

  // Output amplitude
  return el.mul(
    el.const({ key: `${key}-amp`, value: amplitude }),
    filtered
  );
}

/**
 * Render stereo pad (returns L and R channels)
 */
export function renderStereoPad(params, key = 'pad') {
  const mono = renderPad(params, key);

  // Create stereo spread using slight delay and filtering differences
  const left = el.mul(
    el.const({ key: `${key}-L-amp`, value: 1.0 }),
    mono
  );

  const right = el.delay(
    { size: 441 }, // ~10ms max
    el.const({ key: `${key}-R-delay`, value: 88 }), // ~2ms delay
    0,
    mono
  );

  return { left, right };
}
