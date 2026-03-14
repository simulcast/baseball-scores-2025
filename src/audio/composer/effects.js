/**
 * Shared effects chain for the audio engine.
 * All layers route through this bus before reaching the master gain.
 *
 * Signal flow:
 *   voices → bus (Gain) → tapeFilter (LP 6kHz) → Reverb → Compressor → output
 *   voices → delaySend (Gain) → PingPongDelay → bus
 *
 * The lowpass filter simulates tape/analog high-frequency rolloff,
 * removing digital harshness from Web Audio oscillators.
 */
import * as Tone from 'tone';

export class EffectsChain {
  constructor(output) {
    // Main bus — all layers connect here
    this.bus = new Tone.Gain(1);

    // Tape warmth: lowpass filter rolls off harsh digital highs
    this.tapeFilter = new Tone.Filter({
      frequency: 6000,
      type: 'lowpass',
      rolloff: -12,
    });

    // Reverb: long decay, drenched for ambient space (Eno-wet)
    this.reverb = new Tone.Reverb({
      decay: 6,
      wet: 0.65,
      preDelay: 0.08,
    });

    // Compressor: gentle glue, not squash
    this.compressor = new Tone.Compressor({
      threshold: -15,
      ratio: 2,
      attack: 0.2,
      release: 0.4,
    });

    // Delay send: parallel delay for shimmer effects
    this.delaySend = new Tone.Gain(0);
    this.delay = new Tone.PingPongDelay({
      delayTime: '8n',
      feedback: 0.35,
      wet: 1, // fully wet — send amount controlled by delaySend gain
    });

    // Wire: bus → tapeFilter → reverb → compressor → output
    this.bus.connect(this.tapeFilter);
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
    this.bus?.dispose();
    this.delay = null;
    this.delaySend = null;
    this.compressor = null;
    this.reverb = null;
    this.tapeFilter = null;
    this.bus = null;
  }
}
