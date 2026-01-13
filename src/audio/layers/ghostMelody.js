// src/audio/layers/ghostMelody.js

import { el } from '@elemaudio/core';
import { lowpass } from '../effects/filter.js';
import { LAYERS } from '../constants.js';

/**
 * Ghost melody voice
 * Sine + slight FM → subtle vibrato
 */
function ghostVoice(frequency, amplitude, key) {
  // Vibrato LFO
  const vibratoRate = 4; // Hz
  const vibratoDepth = 3; // Hz deviation

  const vibrato = el.mul(
    el.const({ key: `${key}-vib-depth`, value: vibratoDepth }),
    el.cycle({
      key: `${key}-vib-lfo`,
      freq: el.const({ key: `${key}-vib-rate`, value: vibratoRate })
    })
  );

  // Main oscillator with vibrato
  const carrier = el.cycle({
    key: `${key}-osc`,
    freq: el.add(
      el.const({ key: `${key}-freq`, value: frequency }),
      vibrato
    )
  });

  // Slight FM for warmth
  const fmMod = el.mul(
    el.const({ key: `${key}-fm-depth`, value: frequency * 0.5 }),
    el.cycle({
      key: `${key}-fm-osc`,
      freq: el.const({ key: `${key}-fm-freq`, value: frequency * 2 })
    })
  );

  const withFM = el.cycle({
    key: `${key}-main`,
    freq: el.add(
      el.const({ key: `${key}-base-freq`, value: frequency }),
      vibrato,
      el.mul(el.const({ key: `${key}-fm-amt`, value: 0.1 }), fmMod)
    )
  });

  // Mix pure sine with FM version
  const mixed = el.add(
    el.mul(el.const({ key: `${key}-pure-amt`, value: 0.7 }), carrier),
    el.mul(el.const({ key: `${key}-fm-mix`, value: 0.3 }), withFM)
  );

  return el.mul(
    el.const({ key: `${key}-amp`, value: amplitude }),
    mixed
  );
}

/**
 * Render ghost melody layer
 */
export function renderGhostMelody(params, activeNote = null, key = 'ghost') {
  const { amplitude } = params;

  if (!activeNote) {
    return el.const({ key: `${key}-silence`, value: 0 });
  }

  const voice = ghostVoice(activeNote.frequency, amplitude, key);

  // Gentle low-pass for warmth
  return lowpass(4000, 0.707, voice, `${key}-lp`);
}

/**
 * Render stereo ghost melody (slightly off-center)
 */
export function renderStereoGhostMelody(params, activeNote = null, key = 'ghost') {
  const config = LAYERS.ghostMelody;
  const mono = renderGhostMelody(params, activeNote, key);

  // Pan slightly off-center (config.pan = 0.2)
  const pan = config.pan;
  const leftGain = Math.cos((pan + 1) * Math.PI / 4);
  const rightGain = Math.sin((pan + 1) * Math.PI / 4);

  return {
    left: el.mul(el.const({ key: `${key}-L-pan`, value: leftGain }), mono),
    right: el.mul(el.const({ key: `${key}-R-pan`, value: rightGain }), mono)
  };
}
