// src/audio/effects/reverb.js

import { el } from '@elemaudio/core';

/**
 * Schroeder-style reverb using allpass and comb filters
 * Simplified for Elementary Audio
 */
export function reverb(decay, mix, damping, signal, key) {
  // Pre-delay
  const preDelayed = el.delay(
    { size: 4410 }, // 100ms max at 44.1k
    el.ms2samps(30), // 30ms pre-delay
    0,
    signal
  );

  // Parallel comb filters at different prime-number delays
  const combDelays = [1557, 1617, 1491, 1422, 1277, 1356]; // samples (~35-40ms at 44.1k)
  const combOutputs = combDelays.map((delaySamples, i) => {
    const feedback = decay * (1 - damping * 0.3);
    return el.delay(
      { size: delaySamples + 100 },
      el.const({ key: `${key}-comb-${i}-time`, value: delaySamples }),
      el.const({ key: `${key}-comb-${i}-fb`, value: feedback * 0.7 }),
      preDelayed
    );
  });

  // Sum comb outputs
  let reverbSignal = combOutputs[0];
  for (let i = 1; i < combOutputs.length; i++) {
    reverbSignal = el.add(reverbSignal, combOutputs[i]);
  }

  // Scale down
  reverbSignal = el.mul(
    el.const({ key: `${key}-scale`, value: 0.15 }),
    reverbSignal
  );

  // Series allpass filters for diffusion
  const allpassDelays = [225, 556, 441, 341];
  for (let i = 0; i < allpassDelays.length; i++) {
    const g = 0.5; // allpass coefficient
    reverbSignal = el.delay(
      { size: allpassDelays[i] + 100 },
      el.const({ key: `${key}-ap-${i}-time`, value: allpassDelays[i] }),
      el.const({ key: `${key}-ap-${i}-fb`, value: g }),
      reverbSignal
    );
  }

  // Damping (lowpass on wet signal)
  const dampFreq = 2000 + (1 - damping) * 8000; // 2k-10k Hz
  reverbSignal = el.lowpass(
    el.const({ key: `${key}-damp-freq`, value: dampFreq }),
    0.707,
    reverbSignal
  );

  // Wet/dry mix
  return el.add(
    el.mul(el.const({ key: `${key}-dry`, value: 1 - mix }), signal),
    el.mul(el.const({ key: `${key}-wet`, value: mix }), reverbSignal)
  );
}

/**
 * Simple stereo reverb (different delays for L/R)
 */
export function stereoReverb(decay, mix, damping, signalL, signalR, key) {
  return {
    left: reverb(decay, mix, damping, signalL, `${key}-L`),
    right: reverb(decay * 1.02, mix, damping * 0.95, signalR, `${key}-R`), // Slight variation
  };
}
