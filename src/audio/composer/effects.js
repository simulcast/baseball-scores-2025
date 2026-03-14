/**
 * Shared effects chain for the audio engine.
 * All layers route through this bus before reaching the master gain.
 *
 * Signal flow:
 *   voices → bus (Gain) → Reverb → Compressor → output
 *   voices → delaySend (Gain) → PingPongDelay → bus
 */
import * as Tone from 'tone';

export class EffectsChain {
  constructor(output) {
    // Main bus — all layers connect here
    this.bus = new Tone.Gain(1);

    // Reverb: long tail for ambient space
    this.reverb = new Tone.Reverb({
      decay: 5,
      wet: 0.4,
      preDelay: 0.05,
    });

    // Compressor: keep levels consistent across layers
    this.compressor = new Tone.Compressor({
      threshold: -20,
      ratio: 3,
      attack: 0.1,
      release: 0.3,
    });

    // Delay send: parallel delay for shimmer effects
    this.delaySend = new Tone.Gain(0);
    this.delay = new Tone.PingPongDelay({
      delayTime: '8n',
      feedback: 0.3,
      wet: 1, // fully wet — send amount controlled by delaySend gain
    });

    // Wire: bus → reverb → compressor → output
    this.bus.connect(this.reverb);
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
    this.bus?.dispose();
    this.delay = null;
    this.delaySend = null;
    this.compressor = null;
    this.reverb = null;
    this.bus = null;
  }
}
