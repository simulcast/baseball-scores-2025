/**
 * Shared effects chain for the audio engine.
 * All layers route through this bus before reaching the master gain.
 *
 * Signal flow:
 *   voices → bus → saturation → tapeFilter (LP 4.8kHz) → Reverb → Compressor → output
 *   voices → delaySend → PingPongDelay → bus
 *
 * Saturation adds even harmonics (tape warmth).
 * Lowpass filter simulates analog high-frequency rolloff.
 */
import * as Tone from 'tone';

export class EffectsChain {
  constructor(output) {
    // Main bus — all layers connect here
    this.bus = new Tone.Gain(1);

    // Tape saturation: subtle even-harmonic distortion (rounds transients)
    this.saturation = new Tone.Chebyshev({
      order: 2,
      wet: 0.15,
    });

    // Tape warmth: lowpass rolls off harsh digital highs
    this.tapeFilter = new Tone.Filter({
      frequency: 4800,
      type: 'lowpass',
      rolloff: -12,
    });

    // Reverb: long decay, drenched for ambient space
    this.reverb = new Tone.Reverb({
      decay: 6,
      wet: 0.65,
      preDelay: 0.12,
    });

    // Compressor: gentle glue, not squash
    this.compressor = new Tone.Compressor({
      threshold: -15,
      ratio: 2,
      attack: 0.2,
      release: 0.4,
    });

    // Delay send: parallel delay for shimmer
    this.delaySend = new Tone.Gain(0);
    this.delay = new Tone.PingPongDelay({
      delayTime: '8n',
      feedback: 0.4,
      wet: 1,
    });

    // Wire: bus → saturation → tapeFilter → reverb → compressor → output
    this.bus.connect(this.saturation);
    this.saturation.connect(this.tapeFilter);
    this.tapeFilter.connect(this.reverb);
    this.reverb.connect(this.compressor);
    this.compressor.connect(output);

    // Wire: delaySend → delay → bus (parallel send)
    this.delaySend.connect(this.delay);
    this.delay.connect(this.bus);
  }

  /** Set the delay send amount (0-1). */
  setDelaySend(amount) {
    this.delaySend.gain.value = Math.max(0, Math.min(1, amount));
  }

  dispose() {
    this.delay?.dispose();
    this.delaySend?.dispose();
    this.compressor?.dispose();
    this.reverb?.dispose();
    this.tapeFilter?.dispose();
    this.saturation?.dispose();
    this.bus?.dispose();
    this.delay = null;
    this.delaySend = null;
    this.compressor = null;
    this.reverb = null;
    this.tapeFilter = null;
    this.saturation = null;
    this.bus = null;
  }
}
