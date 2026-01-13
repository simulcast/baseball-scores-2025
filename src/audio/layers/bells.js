// src/audio/layers/bells.js

import { el } from '@elemaudio/core';
import { LAYERS } from '../constants.js';

/**
 * FM bell voice
 * 2-operator FM with 1:2.4 ratio (bell-like timbre)
 */
function fmBell(frequency, amplitude, key) {
  const carrierFreq = frequency;
  const modulatorFreq = frequency * 2.4; // Bell-like ratio
  const modulationIndex = 3; // Controls brightness

  // Modulator
  const modulator = el.mul(
    el.const({ key: `${key}-mod-depth`, value: modulationIndex * modulatorFreq }),
    el.cycle({
      key: `${key}-mod`,
      freq: el.const({ key: `${key}-mod-freq`, value: modulatorFreq })
    })
  );

  // Carrier with FM
  const carrier = el.cycle({
    key: `${key}-car`,
    freq: el.add(
      el.const({ key: `${key}-car-freq`, value: carrierFreq }),
      modulator
    )
  });

  // Amplitude envelope (fast attack, long decay)
  // Using a simple decay for now
  const env = el.const({ key: `${key}-env`, value: amplitude });

  return el.mul(env, carrier);
}

/**
 * Render bells layer
 * Returns mono signal (panning handled in master)
 */
export function renderBells(params, activeNotes = [], key = 'bells') {
  const { amplitude } = params;
  const config = LAYERS.bells;

  if (activeNotes.length === 0) {
    return el.const({ key: `${key}-silence`, value: 0 });
  }

  // Render each active bell voice
  const voices = activeNotes.slice(0, config.voices).map((note, i) => {
    return fmBell(note.frequency, note.amplitude || 0.5, `${key}-v${i}`);
  });

  // Sum voices
  let summed = voices[0];
  for (let i = 1; i < voices.length; i++) {
    summed = el.add(summed, voices[i]);
  }

  // Scale and output
  return el.mul(
    el.const({ key: `${key}-amp`, value: amplitude / Math.max(voices.length, 1) }),
    summed
  );
}

/**
 * Render stereo bells with panning
 */
export function renderStereoBells(params, activeNotes = [], key = 'bells') {
  const config = LAYERS.bells;

  if (activeNotes.length === 0) {
    return {
      left: el.const({ key: `${key}-L-silence`, value: 0 }),
      right: el.const({ key: `${key}-R-silence`, value: 0 })
    };
  }

  // Render each voice with its pan position
  let leftSum = el.const({ key: `${key}-L-init`, value: 0 });
  let rightSum = el.const({ key: `${key}-R-init`, value: 0 });

  activeNotes.slice(0, config.voices).forEach((note, i) => {
    const voice = fmBell(note.frequency, note.amplitude || 0.5, `${key}-v${i}`);
    const pan = config.panPositions[i % config.panPositions.length];

    // Equal power panning
    const leftGain = Math.cos((pan + 1) * Math.PI / 4);
    const rightGain = Math.sin((pan + 1) * Math.PI / 4);

    leftSum = el.add(leftSum, el.mul(el.const({ key: `${key}-v${i}-L`, value: leftGain }), voice));
    rightSum = el.add(rightSum, el.mul(el.const({ key: `${key}-v${i}-R`, value: rightGain }), voice));
  });

  const scale = params.amplitude / Math.max(activeNotes.length, 1);
  return {
    left: el.mul(el.const({ key: `${key}-L-amp`, value: scale }), leftSum),
    right: el.mul(el.const({ key: `${key}-R-amp`, value: scale }), rightSum)
  };
}
